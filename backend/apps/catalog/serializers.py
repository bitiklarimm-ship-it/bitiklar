from django.conf import settings
from django.db import transaction
from rest_framework import serializers

from .models import Inscription, InscriptionImage, Monument, Region, Source, Suggestion


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


class ImageSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = InscriptionImage
        fields = ("id", "url", "image", "caption", "credit", "is_primary", "order")
        extra_kwargs = {"image": {"write_only": True}}

    def get_url(self, obj):
        return abs_url(self.context.get("request"), obj.image)


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
    inscriptions_count = serializers.IntegerField(read_only=True)

    class Meta(MonumentBriefSerializer.Meta):
        fields = MonumentBriefSerializer.Meta.fields + ("period", "century", "cover_url", "inscriptions_count")

    def get_cover_url(self, obj):
        return abs_url(self.context.get("request"), obj.cover_image)


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
            "original_text", "status",
        )

    def get_image_url(self, obj):
        imgs = list(obj.images.all())
        return abs_url(self.context.get("request"), imgs[0].image) if imgs else None


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

    class Meta:
        model = Inscription
        exclude = ("reviewed_by", "submitted_by")

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
