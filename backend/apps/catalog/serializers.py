from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from .models import Inscription, InscriptionImage, Monument, Person, Region, Route, RouteStop, Source, Suggestion, Term, VisitorPhoto
from .quran import parse_refs


def abs_url(request, f):
    """Rasm uchun brauzer ocha oladigan to'liq URL.

    Next.js serverdan ichki manzil (http://backend:8000) orqali so'raganda ham
    to'g'ri bo'lishi uchun BACKEND_PUBLIC_URL ishlatiladi."""
    if not f:
        return None
    url = f.url
    if not url.startswith("/"):
        return url  # S3 / Cloudinary to'liq URL qaytaradi
    if settings.BACKEND_PUBLIC_URL:
        return settings.BACKEND_PUBLIC_URL + url
    return request.build_absolute_uri(url) if request else url


class RegionSerializer(serializers.ModelSerializer):
    monuments_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Region
        fields = ("id", "slug", "name_uz", "name_ru", "name_en", "monuments_count")


def best(request, *files):
    """Birinchi mavjud fayl havolasi (masalan: WebP nusxa bo'lmasa — asl rasm)."""
    for f in files:
        if f:
            return abs_url(request, f)
    return None


class ImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()          # sahifada ko'rsatish uchun (2400 px WebP)
    thumb_url = serializers.SerializerMethodField()    # kartalar uchun (720 px)
    original_url = serializers.SerializerMethodField() # asl fayl — to'liq sifat, yuklab olish

    class Meta:
        model = InscriptionImage
        fields = ("id", "url", "thumb_url", "original_url", "width", "height", "image", "caption", "credit",
                  "is_primary", "order", "annotations")
        read_only_fields = ("width", "height")
        extra_kwargs = {"image": {"write_only": True}}

    def get_url(self, obj):
        return best(self.context.get("request"), obj.image_large, obj.image)

    def get_thumb_url(self, obj):
        return best(self.context.get("request"), obj.image_thumb, obj.image_large, obj.image)

    def get_original_url(self, obj):
        return best(self.context.get("request"), obj.image)

    def validate_annotations(self, value):
        """[{x, y, w, h, label}] — foizlarda (0..100)."""
        if not isinstance(value, list):
            raise serializers.ValidationError("Ro'yxat bo'lishi kerak.")
        clean = []
        for a in value[:50]:
            try:
                box = {k: max(0.0, min(100.0, float(a[k]))) for k in ("x", "y", "w", "h")}
            except (KeyError, TypeError, ValueError):
                raise serializers.ValidationError("Har bir belgi x, y, w, h sonlariga ega bo'lishi kerak.")
            box["label"] = str(a.get("label", ""))[:120]
            clean.append(box)
        return clean


class SourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Source
        fields = ("id", "kind", "citation", "url", "pages")


class MonumentBriefSerializer(serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)

    class Meta:
        model = Monument
        fields = ("id", "slug", "name_uz", "name_ru", "name_en", "kind", "city", "region", "latitude", "longitude")


class MonumentListSerializer(MonumentBriefSerializer):
    cover_url = serializers.SerializerMethodField()
    cover_thumb_url = serializers.SerializerMethodField()
    cover_original_url = serializers.SerializerMethodField()
    inscriptions_count = serializers.IntegerField(read_only=True)

    class Meta(MonumentBriefSerializer.Meta):
        fields = MonumentBriefSerializer.Meta.fields + (
            "period", "century", "cover_url", "cover_thumb_url", "cover_original_url", "inscriptions_count")

    def get_cover_url(self, obj):
        return best(self.context.get("request"), obj.cover_large, obj.cover_image)

    def get_cover_thumb_url(self, obj):
        return best(self.context.get("request"), obj.cover_thumb, obj.cover_large, obj.cover_image)

    def get_cover_original_url(self, obj):
        return best(self.context.get("request"), obj.cover_image)


class InscriptionListSerializer(serializers.ModelSerializer):
    monument = MonumentBriefSerializer(read_only=True)
    image_url = serializers.SerializerMethodField()
    lat = serializers.DecimalField(max_digits=9, decimal_places=6, read_only=True)
    lng = serializers.DecimalField(max_digits=9, decimal_places=6, read_only=True)

    class Meta:
        model = Inscription
        fields = (
            "id", "slug", "title_uz", "title_ru", "title_en", "language", "script", "technique",
            "period_text", "year_from", "year_to", "monument", "image_url", "lat", "lng",
            "original_text", "status", "dynasty",
        )

    def get_image_url(self, obj):
        imgs = list(obj.images.all())
        if not imgs:
            return None
        return best(self.context.get("request"), imgs[0].image_thumb, imgs[0].image_large, imgs[0].image)


class InscriptionDetailSerializer(serializers.ModelSerializer):
    monument = MonumentListSerializer(read_only=True)
    images = ImageSerializer(many=True, read_only=True)
    sources = SourceSerializer(many=True, read_only=True)
    lat = serializers.DecimalField(max_digits=9, decimal_places=6, read_only=True)
    lng = serializers.DecimalField(max_digits=9, decimal_places=6, read_only=True)
    language_label = serializers.CharField(source="get_language_display", read_only=True)
    script_label = serializers.CharField(source="get_script_display", read_only=True)
    technique_label = serializers.CharField(source="get_technique_display", read_only=True)
    submitted_by_name = serializers.SerializerMethodField()
    related = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()
    persons = serializers.SerializerMethodField()
    quran = serializers.SerializerMethodField()
    dynasty_label = serializers.CharField(source="get_dynasty_display", read_only=True)
    terms = serializers.SerializerMethodField()

    class Meta:
        model = Inscription
        exclude = ("reviewed_by", "submitted_by", "search_text", "audio")

    def get_persons(self, obj):
        return [
            {"slug": p.slug, "name_uz": p.name_uz, "name_ru": p.name_ru, "name_en": p.name_en,
             "role": p.role, "years": p.years}
            for p in obj.persons.all()
        ]

    def get_quran(self, obj):
        return parse_refs(obj.quran_refs)

    def get_terms(self, obj):
        """Yozuv uslubi va texnika uchun lug'atdagi qisqa izohlar."""
        return {
            t.key: {"term_uz": t.term_uz, "term_ru": t.term_ru, "term_en": t.term_en,
                    "definition_uz": t.definition_uz, "definition_ru": t.definition_ru, "definition_en": t.definition_en}
            for t in Term.objects.filter(key__in=[obj.script, obj.technique])
        }

    def get_audio_url(self, obj):
        return abs_url(self.context.get("request"), obj.audio)

    def get_submitted_by_name(self, obj):
        return str(obj.submitted_by) if obj.submitted_by else None

    def get_related(self, obj):
        qs = (
            Inscription.objects.filter(monument=obj.monument, status=Inscription.Status.PUBLISHED)
            .exclude(pk=obj.pk)
            .prefetch_related("images")[:6]
        )
        return [
            {"slug": i.slug, "title_uz": i.title_uz, "title_ru": i.title_ru, "title_en": i.title_en,
             "language": i.language}
            for i in qs
        ]


class MonumentDetailSerializer(MonumentListSerializer):
    inscriptions = serializers.SerializerMethodField()

    class Meta(MonumentListSerializer.Meta):
        fields = MonumentListSerializer.Meta.fields + (
            "address", "description_uz", "description_ru", "description_en", "inscriptions",
        )

    def get_inscriptions(self, obj):
        qs = obj.inscriptions.filter(status=Inscription.Status.PUBLISHED).prefetch_related("images")
        return InscriptionListSerializer(qs, many=True, context=self.context).data


class InscriptionWriteSerializer(serializers.ModelSerializer):
    """Tadqiqotchi va muharrirlar uchun yozish serializeri (manbalar ichma-ich)."""

    monument = serializers.SlugRelatedField(slug_field="slug", queryset=Monument.objects.all())
    sources = SourceSerializer(many=True, required=False)

    class Meta:
        model = Inscription
        fields = (
            "id", "slug", "monument", "title_uz", "title_ru", "title_en",
            "placement_uz", "placement_ru", "placement_en", "language", "script", "technique",
            "original_text", "transliteration", "translation_uz", "translation_ru", "translation_en",
            "commentary_uz", "commentary_ru", "commentary_en", "period_text", "year_from", "year_to",
            "hijri_date", "calligrapher", "latitude", "longitude", "status", "review_note", "sources",
            "dynasty", "quran_refs",
        )
        read_only_fields = ("slug", "review_note")

    def validate(self, attrs):
        yf, yt = attrs.get("year_from"), attrs.get("year_to")
        if yf and yt and yf > yt:
            raise serializers.ValidationError({"year_to": "Yilgacha qiymati yildan qiymatidan kichik bo'lmasin."})
        user = self.context["request"].user
        status = attrs.get("status")
        # Tadqiqotchi faqat qoralama yoki ko'rib chiqishga yuborishi mumkin
        if status and not user.is_editor and status not in (Inscription.Status.DRAFT, Inscription.Status.PENDING):
            attrs["status"] = Inscription.Status.PENDING
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        sources = validated_data.pop("sources", [])
        validated_data.setdefault("status", Inscription.Status.PENDING)
        inscription = Inscription.objects.create(submitted_by=self.context["request"].user, **validated_data)
        for s in sources:
            Source.objects.create(inscription=inscription, **s)
        return inscription

    @transaction.atomic
    def update(self, instance, validated_data):
        sources = validated_data.pop("sources", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()
        if sources is not None:
            instance.sources.all().delete()
            for s in sources:
                Source.objects.create(inscription=instance, **s)
        return instance


class SuggestionSerializer(serializers.ModelSerializer):
    inscription = serializers.SlugRelatedField(slug_field="slug", queryset=Inscription.objects.all())
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = Suggestion
        fields = ("id", "inscription", "field", "proposed_text", "justification", "status",
                  "reviewer_note", "author_name", "created_at")
        read_only_fields = ("status", "reviewer_note", "author_name", "created_at")

    def get_author_name(self, obj):
        return str(obj.author)


class RouteStopSerializer(serializers.ModelSerializer):
    monument = MonumentListSerializer(read_only=True)

    class Meta:
        model = RouteStop
        fields = ("id", "order", "note_uz", "note_ru", "note_en", "monument")


class RouteListSerializer(serializers.ModelSerializer):
    region = RegionSerializer(read_only=True)
    cover_url = serializers.SerializerMethodField()
    stops_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Route
        fields = ("id", "slug", "title_uz", "title_ru", "title_en", "description_uz", "description_ru",
                  "description_en", "region", "duration", "cover_url", "stops_count")

    def get_cover_url(self, obj):
        return best(self.context.get("request"), obj.cover_thumb, obj.cover_large, obj.cover_image)


class RouteDetailSerializer(RouteListSerializer):
    stops = serializers.SerializerMethodField()

    class Meta(RouteListSerializer.Meta):
        fields = RouteListSerializer.Meta.fields + ("stops",)

    def get_stops(self, obj):
        qs = obj.stops.select_related("monument", "monument__region").filter(monument__is_published=True)
        from django.db.models import Count, Q

        qs = qs.annotate(inscriptions_count=Count(
            "monument__inscriptions", filter=Q(monument__inscriptions__status=Inscription.Status.PUBLISHED)))
        out = []
        for st in qs:
            st.monument.inscriptions_count = st.inscriptions_count
            out.append(RouteStopSerializer(st, context=self.context).data)
        return out


class PersonSerializer(serializers.ModelSerializer):
    inscriptions_count = serializers.IntegerField(read_only=True)
    portrait_url = serializers.SerializerMethodField()
    role_label = serializers.CharField(source="get_role_display", read_only=True)

    class Meta:
        model = Person
        fields = ("id", "slug", "name_uz", "name_ru", "name_en", "name_original", "role", "role_label", "years",
                  "year_from", "year_to", "bio_uz", "bio_ru", "bio_en", "portrait_url", "inscriptions_count")

    def get_portrait_url(self, obj):
        return best(self.context.get("request"), obj.portrait)


class PersonDetailSerializer(PersonSerializer):
    inscriptions = serializers.SerializerMethodField()

    class Meta(PersonSerializer.Meta):
        fields = PersonSerializer.Meta.fields + ("inscriptions",)

    def get_inscriptions(self, obj):
        qs = (obj.inscriptions.filter(status=Inscription.Status.PUBLISHED)
              .select_related("monument", "monument__region").prefetch_related("images").order_by("year_from"))
        return InscriptionListSerializer(qs, many=True, context=self.context).data


class TermSerializer(serializers.ModelSerializer):
    group_label = serializers.CharField(source="get_group_display", read_only=True)

    class Meta:
        model = Term
        fields = ("key", "group", "group_label", "term_uz", "term_ru", "term_en", "term_original",
                  "definition_uz", "definition_ru", "definition_en")


class VisitorPhotoSerializer(serializers.ModelSerializer):
    inscription = serializers.SlugRelatedField(slug_field="slug", queryset=Inscription.objects.filter(
        status=Inscription.Status.PUBLISHED), required=False, allow_null=True)
    monument = serializers.SlugRelatedField(slug_field="slug", queryset=Monument.objects.filter(is_published=True),
                                            required=False, allow_null=True)

    class Meta:
        model = VisitorPhoto
        fields = ("id", "inscription", "monument", "image", "author_name", "author_email", "note", "consent", "lat", "lng")

    def validate_image(self, f):
        if f.size > 20 * 1024 * 1024:
            raise serializers.ValidationError("Rasm 20 MB dan oshmasin.")
        return f

    def validate(self, attrs):
        if not attrs.get("inscription") and not attrs.get("monument"):
            raise serializers.ValidationError("Bitik yoki obidani ko'rsating.")
        if not attrs.get("consent"):
            raise serializers.ValidationError({"consent": "Rasmni CC BY 4.0 litsenziyasi bilan e'lon qilishga rozilik kerak."})
        return attrs
