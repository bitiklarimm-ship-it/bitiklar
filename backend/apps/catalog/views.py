import io
from functools import wraps

import qrcode
from django.conf import settings
from django.db.models import Count, F, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from . import export
from .filters import InscriptionFilter, MonumentFilter
from .models import Inscription, Monument, Person, Region, Route, Suggestion, Term
from .quran import BY_NUM, parse_refs
from .permissions import InscriptionPermission, IsEditor, IsEditorOrReadOnly
from .serializers import abs_url
from .serializers import (
    ImageSerializer,
    InscriptionDetailSerializer,
    InscriptionListSerializer,
    InscriptionWriteSerializer,
    MonumentDetailSerializer,
    MonumentListSerializer,
    RegionSerializer,
    PersonDetailSerializer,
    PersonSerializer,
    RouteDetailSerializer,
    RouteListSerializer,
    SuggestionSerializer,
    TermSerializer,
    VisitorPhotoSerializer,
)

PUBLISHED = Inscription.Status.PUBLISHED
LANGS = ("uz", "ru", "en")

# Ommaviy, tez-tez so'raladigan ma'lumotlar uchun qisqa kesh. Avtorizatsiyali so'rovlar alohida keshlanadi.
CACHE_SECONDS = 120


def cached(seconds=CACHE_SECONDS):
    """Faqat mehmonlar (tokensiz, sessiyasiz) so'rovlarini keshlaydi.
    Muharrir/admin har doim yangi ma'lumotni ko'radi va uning javobi boshqalarga berilmaydi."""
    def deco(fn):
        cached_fn = cache_page(seconds)(fn)

        @wraps(fn)
        def wrapper(request, *args, **kwargs):
            if "HTTP_AUTHORIZATION" in request.META or settings.SESSION_COOKIE_NAME in request.COOKIES:
                return fn(request, *args, **kwargs)
            return cached_fn(request, *args, **kwargs)
        return wrapper
    return deco


def qr_png(url):
    img = qrcode.make(url, box_size=10, border=2)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    resp = HttpResponse(buf.getvalue(), content_type="image/png")
    resp["Cache-Control"] = "public, max-age=86400"
    return resp


class RegionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RegionSerializer
    lookup_field = "slug"
    pagination_class = None
    queryset = Region.objects.annotate(monuments_count=Count("monuments", filter=Q(monuments__is_published=True)))


class MonumentViewSet(viewsets.ModelViewSet):
    lookup_field = "slug"
    permission_classes = [IsEditorOrReadOnly]
    filterset_class = MonumentFilter
    ordering_fields = ("name_uz", "century", "inscriptions_count")

    def get_queryset(self):
        qs = Monument.objects.select_related("region").annotate(
            inscriptions_count=Count("inscriptions", filter=Q(inscriptions__status=PUBLISHED))
        )
        u = self.request.user
        if not (u.is_authenticated and u.is_editor):
            qs = qs.filter(is_published=True)
        return qs

    def get_serializer_class(self):
        return MonumentDetailSerializer if self.action == "retrieve" else MonumentListSerializer

    @method_decorator(cached())
    @action(detail=False, pagination_class=None)
    def geojson(self, request):
        """Interaktiv xarita uchun barcha obidalar (GeoJSON)."""
        qs = self.filter_queryset(self.get_queryset())
        features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(m.longitude), float(m.latitude)]},
                "properties": {
                    "id": m.id, "slug": m.slug, "kind": m.kind, "city": m.city,
                    "name_uz": m.name_uz, "name_ru": m.name_ru, "name_en": m.name_en,
                    "inscriptions_count": m.inscriptions_count,
                },
            }
            for m in qs
        ]
        return Response({"type": "FeatureCollection", "features": features})

    @action(detail=True, url_path="qr", permission_classes=[permissions.AllowAny])
    def qr(self, request, slug=None):
        m = self.get_object()
        lang = request.query_params.get("lang", "uz")
        lang = lang if lang in LANGS else "uz"
        return qr_png(f"{settings.FRONTEND_URL}/{lang}/obidalar/{m.slug}")


class InscriptionViewSet(viewsets.ModelViewSet):
    lookup_field = "slug"
    permission_classes = [InscriptionPermission]
    filterset_class = InscriptionFilter
    ordering_fields = ("published_at", "year_from", "views_count", "title_uz")
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        qs = Inscription.objects.select_related("monument", "monument__region").prefetch_related("images", "sources", "persons")
        u = self.request.user
        if u.is_authenticated and u.is_editor:
            return qs
        if u.is_authenticated:
            return qs.filter(Q(status=PUBLISHED) | Q(submitted_by=u))
        return qs.filter(status=PUBLISHED)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return InscriptionWriteSerializer
        if self.action == "retrieve":
            return InscriptionDetailSerializer
        return InscriptionListSerializer

    def retrieve(self, request, *args, **kwargs):
        obj = self.get_object()
        if obj.status == PUBLISHED:
            Inscription.objects.filter(pk=obj.pk).update(views_count=F("views_count") + 1)
        return Response(self.get_serializer(obj).data)

    @method_decorator(cached())
    @action(detail=False, pagination_class=None, permission_classes=[permissions.AllowAny])
    def geojson(self, request):
        """Jonli xarita uchun nashr qilingan barcha bitiklar (aniq GPS, bo'lmasa obida koordinatasi)."""
        qs = self.filter_queryset(
            Inscription.objects.filter(status=PUBLISHED, monument__is_published=True)
            .select_related("monument").prefetch_related("images")
        )
        features = []
        for i in qs:
            lat, lng = i.lat, i.lng
            if lat is None or lng is None:
                continue
            imgs = list(i.images.all())
            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(lng), float(lat)]},
                "properties": {
                    "slug": i.slug, "language": i.language, "script": i.script, "period_text": i.period_text,
                    "title_uz": i.title_uz, "title_ru": i.title_ru, "title_en": i.title_en,
                    "monument_slug": i.monument.slug, "monument_uz": i.monument.name_uz,
                    "monument_ru": i.monument.name_ru, "monument_en": i.monument.name_en,
                    "city": i.monument.city, "precise": i.latitude is not None,
                    "image_url": abs_url(request, imgs[0].image_thumb or imgs[0].image) if imgs else None,
                    "original_text": i.original_text[:80],
                },
            })
        return Response({"type": "FeatureCollection", "features": features})

    @action(detail=True, permission_classes=[permissions.AllowAny])
    def tei(self, request, slug=None):
        """Bitta bitikni TEI-EpiDoc (XML) ko'rinishida yuklab olish."""
        obj = get_object_or_404(
            Inscription.objects.select_related("monument").prefetch_related("sources"), slug=slug, status=PUBLISHED)
        return export.tei_response(obj)

    def perform_update(self, serializer):
        inst = serializer.instance
        # Tadqiqotchi rad etilgan bitikni tuzatsa — qayta ko'rib chiqishga ketadi
        if not self.request.user.is_editor and inst.status == Inscription.Status.REJECTED:
            serializer.save(status=Inscription.Status.PENDING)
        else:
            serializer.save()

    @action(detail=False, permission_classes=[permissions.IsAuthenticated])
    def mine(self, request):
        qs = Inscription.objects.filter(submitted_by=request.user).select_related("monument").prefetch_related("images")
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(InscriptionListSerializer(page, many=True, context={"request": request}).data)

    @action(detail=False, permission_classes=[IsEditor])
    def pending(self, request):
        qs = self.get_queryset().filter(status=Inscription.Status.PENDING)
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(InscriptionListSerializer(page, many=True, context={"request": request}).data)

    @action(detail=True, methods=["post"], permission_classes=[IsEditor])
    def approve(self, request, slug=None):
        obj = self.get_object()
        obj.status = PUBLISHED
        obj.reviewed_by = request.user
        obj.review_note = request.data.get("note", "")
        obj.published_at = obj.published_at or timezone.now()
        obj.save()
        return Response({"status": obj.status})

    @action(detail=True, methods=["post"], permission_classes=[IsEditor])
    def reject(self, request, slug=None):
        obj = self.get_object()
        obj.status = Inscription.Status.REJECTED
        obj.reviewed_by = request.user
        obj.review_note = request.data.get("note", "")
        obj.save()
        return Response({"status": obj.status})

    @action(detail=True, methods=["post"], url_path="images", parser_classes=[MultiPartParser, FormParser])
    def upload_image(self, request, slug=None):
        obj = self.get_object()  # obyekt ruxsati tekshiriladi
        ser = ImageSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        if ser.validated_data.get("is_primary"):
            obj.images.update(is_primary=False)
        ser.save(inscription=obj)
        return Response(ser.data, status=status.HTTP_201_CREATED)

    @action(detail=True, url_path="qr", permission_classes=[permissions.AllowAny])
    def qr(self, request, slug=None):
        obj = get_object_or_404(Inscription, slug=slug, status=PUBLISHED)
        lang = request.query_params.get("lang", "uz")
        return qr_png(obj.public_url(lang if lang in LANGS else "uz"))


class SuggestionViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = SuggestionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Suggestion.objects.select_related("inscription", "author")
        if self.request.user.is_editor:
            st = self.request.query_params.get("status")
            return qs.filter(status=st) if st else qs
        return qs.filter(author=self.request.user)

    def perform_create(self, serializer):
        if not self.request.user.can_submit:
            from rest_framework.exceptions import PermissionDenied

            raise PermissionDenied("Taklif yuborish uchun tadqiqotchi sifatida tasdiqlangan bo'lishingiz kerak.")
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsEditor])
    def accept(self, request, pk=None):
        s = self.get_object()
        if s.field != "other":
            setattr(s.inscription, s.field, s.proposed_text)
            s.inscription.save()
        s.status = Suggestion.Status.ACCEPTED
        s.reviewer_note = request.data.get("note", "")
        s.save()
        return Response({"status": s.status})

    @action(detail=True, methods=["post"], permission_classes=[IsEditor])
    def decline(self, request, pk=None):
        s = self.get_object()
        s.status = Suggestion.Status.REJECTED
        s.reviewer_note = request.data.get("note", "")
        s.save()
        return Response({"status": s.status})


@cached()
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def stats(request):
    pub = Inscription.objects.filter(status=PUBLISHED)
    by_lang = {row["language"]: row["n"] for row in pub.values("language").annotate(n=Count("id"))}
    return Response({
        "inscriptions": pub.count(),
        "monuments": Monument.objects.filter(is_published=True).count(),
        "regions": Region.objects.filter(monuments__is_published=True).distinct().count(),
        "by_language": {k: by_lang.get(k, 0) for k, _ in Inscription.Language.choices},
    })


@cached(3600)
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def choices(request):
    """Frontend filtrlari uchun tanlov ro'yxatlari."""
    def ch(c):
        return [{"value": v, "label": l} for v, l in c.choices]

    return Response({
        "language": ch(Inscription.Language),
        "script": ch(Inscription.Script),
        "technique": ch(Inscription.Technique),
        "monument_kind": ch(Monument.Kind),
    })


class RouteViewSet(viewsets.ReadOnlyModelViewSet):
    """Sayohat / o'rganish yo'nalishlari."""

    lookup_field = "slug"
    pagination_class = None

    def get_queryset(self):
        return Route.objects.filter(is_published=True).select_related("region").annotate(
            stops_count=Count("stops", filter=Q(stops__monument__is_published=True)))

    def get_serializer_class(self):
        return RouteDetailSerializer if self.action == "retrieve" else RouteListSerializer


# ---------- Eksport (ilmiy foydalanish uchun) ----------

def _export_qs(request):
    qs = (Inscription.objects.filter(status=PUBLISHED)
          .select_related("monument", "monument__region").prefetch_related("sources")
          .order_by("monument__name_uz", "title_uz"))
    return InscriptionFilter(request.GET, queryset=qs).qs


class ExportThrottle(UserRateThrottle):
    scope = "export"


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@throttle_classes([ExportThrottle])
def export_csv(request):
    """CSV (Excel). Katalog filtrlari ishlaydi: ?language=arabic&region=buxoro"""
    return export.export_csv(_export_qs(request))


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@throttle_classes([ExportThrottle])
def export_json(request):
    return export.export_json(_export_qs(request))


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
@throttle_classes([ExportThrottle])
def export_tei(request):
    """Barcha bitiklar bitta teiCorpus (TEI-EpiDoc) faylida."""
    return export.export_tei(_export_qs(request))


# ---------- Muharrir paneli ----------

@api_view(["GET"])
@permission_classes([IsEditor])
def editor_overview(request):
    from django.contrib.auth import get_user_model

    User = get_user_model()
    pending = (Inscription.objects.filter(status=Inscription.Status.PENDING)
               .select_related("monument", "submitted_by").order_by("created_at")[:50])
    suggestions = (Suggestion.objects.filter(status=Suggestion.Status.PENDING)
                   .select_related("inscription", "author").order_by("created_at")[:50])
    researchers = User.objects.filter(role=User.Role.RESEARCHER, is_verified=False).order_by("date_joined")[:50]
    top = Inscription.objects.filter(status=PUBLISHED).order_by("-views_count")[:10]

    history = []
    for h in Inscription.history.select_related("history_user").order_by("-history_date")[:30]:
        history.append({
            "date": h.history_date, "type": h.history_type, "slug": h.slug, "title": h.title_uz,
            "status": h.status, "user": str(h.history_user) if h.history_user else None,
        })

    def ins_row(i):
        return {"slug": i.slug, "title_uz": i.title_uz, "title_ru": i.title_ru, "title_en": i.title_en,
                "monument": i.monument.name_uz, "language": i.language, "created_at": i.created_at,
                "submitted_by": str(i.submitted_by) if i.submitted_by else None}

    return Response({
        "counts": {
            "pending": Inscription.objects.filter(status=Inscription.Status.PENDING).count(),
            "suggestions": Suggestion.objects.filter(status=Suggestion.Status.PENDING).count(),
            "researchers": User.objects.filter(role=User.Role.RESEARCHER, is_verified=False).count(),
            "published": Inscription.objects.filter(status=PUBLISHED).count(),
            "drafts": Inscription.objects.filter(status=Inscription.Status.DRAFT).count(),
            "monuments": Monument.objects.count(),
            "without_image": Inscription.objects.filter(status=PUBLISHED, images__isnull=True).count(),
            "without_gps": Inscription.objects.filter(status=PUBLISHED, latitude__isnull=True).count(),
        },
        "pending": [ins_row(i) for i in pending],
        "suggestions": [
            {"id": s.id, "inscription": s.inscription.slug, "inscription_title": s.inscription.title_uz,
             "field": s.field, "current_text": getattr(s.inscription, s.field, "") if s.field != "other" else "",
             "proposed_text": s.proposed_text, "justification": s.justification,
             "author": str(s.author), "created_at": s.created_at}
            for s in suggestions
        ],
        "researchers": [
            {"id": u.id, "username": u.username, "name": u.get_full_name(), "email": u.email,
             "affiliation": u.affiliation, "academic_degree": u.academic_degree, "orcid": u.orcid,
             "date_joined": u.date_joined}
            for u in researchers
        ],
        "top": [{"slug": i.slug, "title_uz": i.title_uz, "title_ru": i.title_ru, "title_en": i.title_en,
                 "views_count": i.views_count} for i in top],
        "history": history,
    })


# ---------- Shaxslar, lug'at ----------

class PersonViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"
    pagination_class = None

    def get_queryset(self):
        qs = Person.objects.annotate(inscriptions_count=Count(
            "inscriptions", filter=Q(inscriptions__status=PUBLISHED), distinct=True))
        role = self.request.query_params.get("role")
        return qs.filter(role=role) if role else qs

    def get_serializer_class(self):
        return PersonDetailSerializer if self.action == "retrieve" else PersonSerializer


class TermViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TermSerializer
    lookup_field = "key"
    pagination_class = None
    queryset = Term.objects.all()


def _brief(i):
    return {
        "slug": i.slug, "title_uz": i.title_uz, "title_ru": i.title_ru, "title_en": i.title_en,
        "monument_uz": i.monument.name_uz, "monument_ru": i.monument.name_ru, "monument_en": i.monument.name_en,
        "monument_slug": i.monument.slug, "city": i.monument.city, "language": i.language, "script": i.script,
        "year_from": i.year_from, "year_to": i.year_to, "period_text": i.period_text, "dynasty": i.dynasty,
        "original_text": i.original_text[:90],
    }


# ---------- Qur'on oyatlari ko'rsatkichi ----------

@cached(600)
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def quran_index(request):
    """Qaysi oyat qaysi obidalarda bitilgan — suralar tartibida."""
    by_surah = {}
    qs = Inscription.objects.filter(status=PUBLISHED).exclude(quran_refs="").select_related("monument")
    for i in qs:
        for ref in parse_refs(i.quran_refs):
            entry = by_surah.setdefault(ref["surah"], {
                "surah": ref["surah"], "name": ref["name"], "name_ar": ref["name_ar"],
                "ayahs": BY_NUM[ref["surah"]][2], "items": [],
            })
            entry["items"].append({**_brief(i), "ref": ref["label"], "from": ref["from"]})
    out = sorted(by_surah.values(), key=lambda e: e["surah"])
    for e in out:
        e["items"].sort(key=lambda x: (x["from"] or 0, x["monument_uz"]))
    return Response({"surahs": out, "total": sum(len(e["items"]) for e in out)})


# ---------- Vaqt chizig'i ----------

DYNASTY_ORDER = [v for v, _ in Inscription.Dynasty.choices]


@cached(600)
@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def timeline(request):
    """Bitiklar sulolalar va yillar bo'yicha."""
    qs = (Inscription.objects.filter(status=PUBLISHED).select_related("monument")
          .order_by("year_from", "monument__name_uz"))
    groups = {}
    for i in qs:
        key = i.dynasty or ""
        groups.setdefault(key, []).append(_brief(i))
    labels = dict(Inscription.Dynasty.choices)
    out = [{"dynasty": k, "label": labels.get(k, k), "items": groups[k]}
           for k in DYNASTY_ORDER if k in groups and k != ""]
    if "" in groups:
        out.append({"dynasty": "", "label": labels[""], "items": groups[""]})
    return Response({"groups": out})


# ---------- Viktorina (AI'siz, katalog ma'lumotidan) ----------

@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def quiz(request):
    """Tasodifiy 8 ta savol: bitik qaysi obidada, qaysi tilda, qaysi shaharda, qaysi yozuv uslubida."""
    import random

    pub = list(Inscription.objects.filter(status=PUBLISHED).select_related("monument").prefetch_related("images"))
    if len(pub) < 2:
        return Response({"questions": []})
    all_mon = list(Monument.objects.filter(is_published=True))
    cities = sorted({m.city for m in all_mon if m.city})
    langs = [v for v, _ in Inscription.Language.choices]
    scripts = [v for v, _ in Inscription.Script.choices if v != "other"]
    rng = random.Random()
    rng.shuffle(pub)

    def img(i):
        imgs = list(i.images.all())
        if not imgs:
            return None
        return abs_url(request, imgs[0].image_thumb or imgs[0].image)

    def mon_opt(m):
        return {"uz": m.name_uz, "ru": m.name_ru or m.name_uz, "en": m.name_en or m.name_uz}

    questions = []
    kinds = ["monument", "language", "city", "script"]
    for n, i in enumerate(pub * 3):
        if len(questions) >= 8:
            break
        kind = kinds[n % len(kinds)]
        q = {"kind": kind, "slug": i.slug, "text": i.original_text[:160], "image": img(i),
             "title": {"uz": i.title_uz, "ru": i.title_ru or i.title_uz, "en": i.title_en or i.title_uz}}
        if kind == "monument" and len(all_mon) >= 3:
            wrong = rng.sample([m for m in all_mon if m.id != i.monument_id], min(3, len(all_mon) - 1))
            opts = [mon_opt(i.monument)] + [mon_opt(m) for m in wrong]
        elif kind == "language":
            opts = [{"key": i.language}] + [{"key": x} for x in rng.sample([x for x in langs if x != i.language], 3)]
        elif kind == "city" and len(cities) >= 3 and i.monument.city:
            wrong = rng.sample([c for c in cities if c != i.monument.city], min(3, len(cities) - 1))
            opts = [{"uz": i.monument.city, "ru": i.monument.city, "en": i.monument.city}] + [
                {"uz": c, "ru": c, "en": c} for c in wrong]
        elif kind == "script" and i.script != "other":
            opts = [{"key": i.script}] + [{"key": x} for x in rng.sample([x for x in scripts if x != i.script], 3)]
        else:
            continue
        correct = opts[0]
        rng.shuffle(opts)
        q["options"] = opts
        q["answer"] = opts.index(correct)
        questions.append(q)
    return Response({"questions": questions})


# ---------- Tashrifchilar rasmi ----------

class PhotoThrottle(UserRateThrottle):
    scope = "photos"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@throttle_classes([PhotoThrottle])
def submit_photo(request):
    ser = VisitorPhotoSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    ser.save()
    return Response({"ok": True}, status=status.HTTP_201_CREATED)
