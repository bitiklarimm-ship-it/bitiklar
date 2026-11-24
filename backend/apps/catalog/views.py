import io

import qrcode
from django.conf import settings
from django.db.models import Count, F, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from .filters import InscriptionFilter, MonumentFilter
from .models import Inscription, InscriptionImage, Monument, Region, Suggestion
from .permissions import InscriptionPermission, IsEditor, IsEditorOrReadOnly
from .serializers import (
    ImageSerializer,
    InscriptionDetailSerializer,
    InscriptionListSerializer,
    InscriptionWriteSerializer,
    MonumentDetailSerializer,
    MonumentListSerializer,
    RegionSerializer,
    SuggestionSerializer,
)

PUBLISHED = Inscription.Status.PUBLISHED
LANGS = ("uz", "ru", "en")


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

    @action(detail=False, pagination_class=None)
    def geojson(self, request):
        """Interaktiv xarita uchun barcha obidalar (GeoJSON)."""
        qs = self.filter_queryset(self.get_queryset())
        features = [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [float(m.longitude), float(m.latitude)]},
                "properties": {
                    "slug": m.slug, "kind": m.kind, "city": m.city,
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
        qs = Inscription.objects.select_related("monument", "monument__region").prefetch_related("images", "sources")
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
