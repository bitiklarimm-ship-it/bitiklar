from django.contrib import admin
from django.utils import timezone
from django.utils.html import format_html

from .models import Inscription, InscriptionImage, Monument, Region, Source, Suggestion


@admin.register(Region)
class RegionAdmin(admin.ModelAdmin):
    list_display = ("name_uz", "name_ru", "name_en", "slug", "order")
    list_editable = ("order",)
    prepopulated_fields = {"slug": ("name_en",)}


@admin.register(Monument)
class MonumentAdmin(admin.ModelAdmin):
    list_display = ("name_uz", "kind", "region", "city", "period", "is_published", "map_link")
    list_filter = ("kind", "region", "is_published", "century")
    search_fields = ("name_uz", "name_ru", "name_en", "city")
    readonly_fields = ("slug", "cover_preview", "qr_preview")
    fieldsets = (
        (None, {"fields": ("name_uz", "name_ru", "name_en", "slug", "kind", "region", "city", "address", "is_published")}),
        ("Davri", {"fields": ("period", "century")}),
        ("Joylashuv (GPS)", {"fields": ("latitude", "longitude")}),
        ("Tavsif", {"fields": ("description_uz", "description_ru", "description_en")}),
        ("Rasm va QR", {"fields": ("cover_image", "cover_preview", "qr_preview")}),
    )

    @admin.display(description="Xarita")
    def map_link(self, obj):
        return format_html('<a href="https://www.openstreetmap.org/?mlat={}&mlon={}#map=18/{}/{}" target="_blank">OSM</a>',
                           obj.latitude, obj.longitude, obj.latitude, obj.longitude)

    @admin.display(description="Ko'rinishi")
    def cover_preview(self, obj):
        return format_html('<img src="{}" style="max-height:160px">', obj.cover_image.url) if obj.cover_image else "—"

    @admin.display(description="QR-kod")
    def qr_preview(self, obj):
        if not obj.pk:
            return "Saqlangandan keyin paydo bo'ladi"
        return format_html('<img src="/api/monuments/{}/qr/" style="height:140px">', obj.slug)


class ImageInline(admin.TabularInline):
    model = InscriptionImage
    extra = 1
    fields = ("image", "preview", "caption", "credit", "is_primary", "order")
    readonly_fields = ("preview",)

    @admin.display(description="")
    def preview(self, obj):
        return format_html('<img src="{}" style="height:70px">', obj.image.url) if obj.image else ""


class SourceInline(admin.StackedInline):
    model = Source
    extra = 1


@admin.register(Inscription)
class InscriptionAdmin(admin.ModelAdmin):
    list_display = ("title_uz", "monument", "language", "script", "period_text", "status_badge", "submitted_by", "views_count", "is_featured")
    list_filter = ("status", "language", "script", "technique", "monument__region", "is_featured")
    search_fields = ("title_uz", "title_ru", "title_en", "original_text", "translation_uz", "monument__name_uz")
    autocomplete_fields = ("monument",)
    readonly_fields = ("slug", "submitted_by", "reviewed_by", "published_at", "views_count", "qr_preview")
    inlines = [ImageInline, SourceInline]
    actions = ["approve", "reject", "feature"]
    save_on_top = True
    fieldsets = (
        (None, {"fields": ("monument", "slug", "status", "is_featured")}),
        ("Sarlavha va joylashuv", {"fields": (("title_uz", "title_ru", "title_en"), ("placement_uz", "placement_ru", "placement_en"))}),
        ("Yozuv", {"fields": (("language", "script", "technique"), "original_text", "transliteration")}),
        ("Tarjimalar", {"fields": ("translation_uz", "translation_ru", "translation_en")}),
        ("Tarixiy-ilmiy izoh", {"fields": ("commentary_uz", "commentary_ru", "commentary_en")}),
        ("Sana va muallif", {"fields": (("period_text", "year_from", "year_to", "hijri_date"), "calligrapher")}),
        ("Aniq GPS (ixtiyoriy)", {"fields": (("latitude", "longitude"),), "classes": ("collapse",)}),
        ("Ko'rib chiqish", {"fields": ("submitted_by", "reviewed_by", "review_note", "published_at", "views_count", "qr_preview")}),
    )

    class Media:
        css = {"all": ("admin/bitiklar.css",)}

    @admin.display(description="Holati")
    def status_badge(self, obj):
        colors = {"draft": "#888", "pending": "#c98a12", "published": "#2e7d4f", "rejected": "#b23b3b"}
        return format_html('<b style="color:{}">{}</b>', colors.get(obj.status, "#000"), obj.get_status_display())

    @admin.display(description="QR-kod")
    def qr_preview(self, obj):
        if not obj.pk or obj.status != Inscription.Status.PUBLISHED:
            return "Nashr qilingandan keyin paydo bo'ladi"
        return format_html('<a href="/api/inscriptions/{0}/qr/" target="_blank"><img src="/api/inscriptions/{0}/qr/" style="height:140px"></a>', obj.slug)

    def save_model(self, request, obj, form, change):
        if not obj.submitted_by_id:
            obj.submitted_by = request.user
        if "status" in form.changed_data and obj.status in (Inscription.Status.PUBLISHED, Inscription.Status.REJECTED):
            obj.reviewed_by = request.user
        super().save_model(request, obj, form, change)

    @admin.action(description="Nashr qilish")
    def approve(self, request, queryset):
        n = queryset.update(status=Inscription.Status.PUBLISHED, reviewed_by=request.user)
        queryset.filter(published_at__isnull=True).update(published_at=timezone.now())
        self.message_user(request, f"{n} ta bitik nashr qilindi.")

    @admin.action(description="Rad etish")
    def reject(self, request, queryset):
        n = queryset.update(status=Inscription.Status.REJECTED, reviewed_by=request.user)
        self.message_user(request, f"{n} ta bitik rad etildi.")

    @admin.action(description="Bosh sahifaga chiqarish")
    def feature(self, request, queryset):
        queryset.update(is_featured=True)


@admin.register(Suggestion)
class SuggestionAdmin(admin.ModelAdmin):
    list_display = ("inscription", "field", "author", "status", "created_at")
    list_filter = ("status", "field")
    search_fields = ("proposed_text", "inscription__title_uz", "author__username")
    actions = ["accept"]

    @admin.action(description="Qabul qilish va bitikka qo'llash")
    def accept(self, request, queryset):
        for s in queryset.filter(status=Suggestion.Status.PENDING):
            if s.field != "other":
                setattr(s.inscription, s.field, s.proposed_text)
                s.inscription.save()
            s.status = Suggestion.Status.ACCEPTED
            s.save()
