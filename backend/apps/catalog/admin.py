"""BITIKLAR admin paneli (Unfold mavzusi).

Bitik va obida formalari bo'limlarga (tab) ajratilgan, joylashuv xaritadan belgilanadi,
rasmlarda qatorlar ramka bilan belgilanadi, har bir yozuvning o'zgarishlar tarixi saqlanadi.
"""
from django.contrib import admin, messages
from django.http import HttpResponseRedirect
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html
from simple_history.admin import SimpleHistoryAdmin
from unfold.admin import ModelAdmin, StackedInline, TabularInline
from unfold.decorators import action, display

from .models import (
    Inscription, InscriptionImage, Monument, Person, Region, Route, RouteStop, Source, Suggestion, Term, VisitorPhoto,
)

MAP_MEDIA_JS = ("admin/bitiklar/map_picker.js",)
S = Inscription.Status

STATUS_COLORS = {
    S.DRAFT.label: "info",
    S.PENDING.label: "warning",
    S.PUBLISHED.label: "success",
    S.REJECTED.label: "danger",
}


def thumb(url, size=44):
    if not url:
        return format_html('<span class="bk-thumb bk-thumb-empty" style="width:{0}px;height:{0}px">ب</span>', size)
    return format_html('<img class="bk-thumb" src="{}" style="width:{}px;height:{}px" loading="lazy">', url, size, size)


# ---------------------------------------------------------------- Hududlar

@admin.register(Region)
class RegionAdmin(ModelAdmin):
    list_display = ("name_uz", "name_ru", "name_en", "slug", "monuments_n", "order")
    list_editable = ("order",)
    search_fields = ("name_uz", "name_ru", "name_en")
    prepopulated_fields = {"slug": ("name_en",)}

    @display(description="Obidalar")
    def monuments_n(self, obj):
        return obj.monuments.count()


# ---------------------------------------------------------------- Obidalar

@admin.register(Monument)
class MonumentAdmin(SimpleHistoryAdmin, ModelAdmin):
    list_display = ("cover", "name_col", "kind_col", "region", "period", "inscriptions_n", "is_published", "map_link")
    list_display_links = ("cover", "name_col")
    list_filter = ("kind", "region", "is_published", "century")
    list_filter_submit = True
    search_fields = ("name_uz", "name_ru", "name_en", "city", "address")
    readonly_fields = ("slug", "cover_preview", "qr_preview")
    warn_unsaved_form = True
    compressed_fields = True
    fieldsets = (
        ("Asosiy", {"classes": ["tab"], "fields": (
            ("name_uz", "name_ru", "name_en"), "slug", ("kind", "region"), ("city", "address"),
            ("period", "century"), "is_published",
        )}),
        ("Joylashuv", {"classes": ["tab"], "fields": (("latitude", "longitude"),),
                       "description": "Xaritaga bosing yoki belgini suring — koordinatalar avtomatik yoziladi."}),
        ("Tavsif", {"classes": ["tab"], "fields": ("description_uz", "description_ru", "description_en")}),
        ("Rasm va QR", {"classes": ["tab"], "fields": ("cover_image", "cover_preview", "qr_preview")}),
    )

    class Media:
        js = MAP_MEDIA_JS

    def get_queryset(self, request):
        from django.db.models import Count

        return super().get_queryset(request).select_related("region").annotate(_ins=Count("inscriptions"))

    @display(description="")
    def cover(self, obj):
        return thumb((obj.cover_thumb or obj.cover_image).url if obj.cover_image else None)

    @display(description="Obida", header=True, ordering="name_uz")
    def name_col(self, obj):
        return [obj.name_uz, obj.city or "—"]

    @display(description="Turi", ordering="kind", label=True)
    def kind_col(self, obj):
        return obj.get_kind_display()

    @display(description="Bitiklar", ordering="_ins")
    def inscriptions_n(self, obj):
        return obj._ins

    @display(description="Xarita")
    def map_link(self, obj):
        return format_html('<a href="https://www.openstreetmap.org/?mlat={}&mlon={}#map=18/{}/{}" target="_blank" '
                           'class="bk-link">OSM ↗</a>', obj.latitude, obj.longitude, obj.latitude, obj.longitude)

    @display(description="Ko'rinishi")
    def cover_preview(self, obj):
        return format_html('<img src="{}" style="max-height:200px;border-radius:10px">', obj.cover_image.url) if obj.cover_image else "—"

    @display(description="QR-kod")
    def qr_preview(self, obj):
        if not obj.pk:
            return "Saqlangandan keyin paydo bo'ladi"
        return format_html('<a href="/api/monuments/{0}/qr/" target="_blank"><img src="/api/monuments/{0}/qr/" '
                           'style="height:150px;background:#fff;border-radius:10px;padding:6px"></a>', obj.slug)


# ---------------------------------------------------------------- Bitiklar

class ImageInline(TabularInline):
    model = InscriptionImage
    extra = 0
    tab = True
    verbose_name_plural = "Rasmlar"
    fields = ("image", "preview", "caption", "credit", "is_primary", "order", "annotations")
    readonly_fields = ("preview",)

    @display(description="")
    def preview(self, obj):
        if not obj.image:
            return ""
        small = (obj.image_thumb or obj.image).url
        big = (obj.image_large or obj.image).url
        return format_html('<img class="bk-preview" src="{}" data-full="{}" style="height:70px;border-radius:8px">', small, big)


class SourceInline(StackedInline):
    model = Source
    extra = 0
    tab = True
    verbose_name_plural = "Manbalar"


@admin.register(Inscription)
class InscriptionAdmin(SimpleHistoryAdmin, ModelAdmin):
    list_display = ("image_col", "title_col", "status_col", "language_col", "script", "period_text",
                    "submitted_by", "views_count", "is_featured")
    list_display_links = ("image_col", "title_col")
    list_filter = ("status", "language", "script", "technique", "dynasty", "monument__region", "is_featured")
    list_filter_submit = True
    search_fields = ("title_uz", "title_ru", "title_en", "original_text", "translation_uz", "monument__name_uz", "calligrapher")
    autocomplete_fields = ("monument", "persons")
    readonly_fields = ("slug", "submitted_by", "reviewed_by", "published_at", "views_count", "qr_preview", "audio_preview")
    inlines = [ImageInline, SourceInline]
    actions = ["approve", "reject", "feature", "unfeature", "ai_translate"]
    actions_row = ["row_approve", "row_reject"]
    actions_detail = ["detail_approve", "detail_reject", "detail_ai_translate", "detail_view_site"]
    actions_list = ["import_link"]
    list_per_page = 30
    save_on_top = True
    warn_unsaved_form = True
    compressed_fields = True
    fieldsets = (
        (None, {"fields": (("monument", "status"), ("is_featured", "slug"))}),
        ("Sarlavha", {"classes": ["tab"], "fields": (
            ("title_uz", "title_ru", "title_en"), ("placement_uz", "placement_ru", "placement_en"),
        )}),
        ("Yozuv", {"classes": ["tab"], "fields": (("language", "script", "technique"), "original_text", "transliteration")}),
        ("Tarjima va izoh", {"classes": ["tab"], "fields": (
            "translation_uz", "translation_ru", "translation_en", "commentary_uz", "commentary_ru", "commentary_en",
        )}),
        ("Sana va muallif", {"classes": ["tab"], "fields": (
            ("period_text", "hijri_date"), ("year_from", "year_to"), "dynasty", "calligrapher", "persons", "quran_refs",
        )}),
        ("Joylashuv", {"classes": ["tab"], "fields": (("latitude", "longitude"),),
                       "description": "Bitikning aniq joyi (ixtiyoriy). Bo'sh qolsa, obida koordinatasi ishlatiladi."}),
        ("Audio", {"classes": ["tab"], "fields": ("audio", "audio_caption", "audio_preview")}),
        ("Ko'rib chiqish", {"classes": ["tab"], "fields": (
            ("submitted_by", "reviewed_by"), "review_note", ("published_at", "views_count"), "qr_preview",
        )}),
    )

    class Media:
        js = MAP_MEDIA_JS + ("admin/bitiklar/annotate.js",)

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("monument", "submitted_by").prefetch_related("images")

    # --- ustunlar ---
    @display(description="")
    def image_col(self, obj):
        imgs = list(obj.images.all())
        if not imgs or not imgs[0].image:
            return thumb(None)
        return thumb((imgs[0].image_thumb or imgs[0].image).url)

    @display(description="Bitik", header=True, ordering="title_uz")
    def title_col(self, obj):
        return [obj.title_uz, f"{obj.monument.name_uz}{' · ' + obj.monument.city if obj.monument.city else ''}"]

    @display(description="Holati", ordering="status", label=STATUS_COLORS)
    def status_col(self, obj):
        return obj.get_status_display()

    @display(description="Tili", ordering="language", label=True)
    def language_col(self, obj):
        return obj.get_language_display()

    @display(description="Tinglash")
    def audio_preview(self, obj):
        if not obj.audio:
            return "—"
        return format_html('<audio controls preload="none" src="{}"></audio>', obj.audio.url)

    @display(description="QR-kod")
    def qr_preview(self, obj):
        if not obj.pk or obj.status != S.PUBLISHED:
            return "Nashr qilingandan keyin paydo bo'ladi"
        return format_html('<a href="/api/inscriptions/{0}/qr/" target="_blank"><img src="/api/inscriptions/{0}/qr/" '
                           'style="height:150px;background:#fff;border-radius:10px;padding:6px"></a>', obj.slug)

    def save_model(self, request, obj, form, change):
        if not obj.submitted_by_id:
            obj.submitted_by = request.user
        if "status" in form.changed_data and obj.status in (S.PUBLISHED, S.REJECTED):
            obj.reviewed_by = request.user
        super().save_model(request, obj, form, change)

    # --- holatni o'zgartirish (har biri alohida saqlanadi: tarix yoziladi va muallifga email boradi) ---
    def _set_status(self, request, obj, status):
        obj.status = status
        obj.reviewed_by = request.user
        if status == S.PUBLISHED:
            obj.published_at = obj.published_at or timezone.now()
        obj.save()

    @admin.action(description="Nashr qilish")
    def approve(self, request, queryset):
        n = 0
        for obj in queryset.exclude(status=S.PUBLISHED):
            self._set_status(request, obj, S.PUBLISHED)
            n += 1
        self.message_user(request, f"{n} ta bitik nashr qilindi.", messages.SUCCESS)

    @admin.action(description="Rad etish")
    def reject(self, request, queryset):
        n = 0
        for obj in queryset.exclude(status=S.REJECTED):
            self._set_status(request, obj, S.REJECTED)
            n += 1
        self.message_user(request, f"{n} ta bitik rad etildi.", messages.WARNING)

    @admin.action(description="Bosh sahifaga chiqarish")
    def feature(self, request, queryset):
        queryset.update(is_featured=True)

    @admin.action(description="Bosh sahifadan olish")
    def unfeature(self, request, queryset):
        queryset.update(is_featured=False)

    def _back(self, request, object_id=None):
        if object_id:
            return HttpResponseRedirect(reverse("admin:catalog_inscription_change", args=[object_id]))
        return HttpResponseRedirect(request.META.get("HTTP_REFERER") or reverse("admin:catalog_inscription_changelist"))

    @action(description="✓ Nashr", url_path="row-approve", permissions=["change"])
    def row_approve(self, request, object_id):
        obj = Inscription.objects.get(pk=object_id)
        self._set_status(request, obj, S.PUBLISHED)
        self.message_user(request, f"«{obj.title_uz}» nashr qilindi.", messages.SUCCESS)
        return self._back(request)

    @action(description="✕ Rad", url_path="row-reject", permissions=["change"])
    def row_reject(self, request, object_id):
        obj = Inscription.objects.get(pk=object_id)
        self._set_status(request, obj, S.REJECTED)
        self.message_user(request, f"«{obj.title_uz}» rad etildi.", messages.WARNING)
        return self._back(request)

    @action(description="Nashr qilish", url_path="detail-approve", permissions=["change"])
    def detail_approve(self, request, object_id):
        obj = Inscription.objects.get(pk=object_id)
        self._set_status(request, obj, S.PUBLISHED)
        self.message_user(request, "Bitik nashr qilindi. Muallifga xabar yuborildi.", messages.SUCCESS)
        return self._back(request, object_id)

    @action(description="Rad etish", url_path="detail-reject", permissions=["change"])
    def detail_reject(self, request, object_id):
        obj = Inscription.objects.get(pk=object_id)
        self._set_status(request, obj, S.REJECTED)
        self.message_user(request, "Bitik rad etildi. Muallifga xabar yuborildi.", messages.WARNING)
        return self._back(request, object_id)

    # --- AI tarjima qoralamasi ---
    def _ai_fill(self, request, obj):
        from apps.ai.guide import fill_translations
        from apps.ai.service import AIUnavailable

        try:
            filled = fill_translations(obj)
        except AIUnavailable as e:
            self.message_user(request, str(e), messages.ERROR)
            return None
        except Exception as e:  # noqa: BLE001
            self.message_user(request, f"«{obj.title_uz}»: AI xatosi — {e}", messages.ERROR)
            return None
        if filled:
            stamp = timezone.localtime().strftime("%d.%m.%Y")
            note = f"[AI tarjima qoralamasi {stamp}: {', '.join(filled)} — mutaxassis tekshirsin]"
            obj.review_note = f"{obj.review_note}\n{note}".strip()
            obj.save()
        return filled

    @admin.action(description="AI: bo'sh tarjimalarni qoralama bilan to'ldirish")
    def ai_translate(self, request, queryset):
        total = 0
        for obj in queryset[:20]:  # bir martada 20 tadan (vaqt va xarajat chegarasi)
            filled = self._ai_fill(request, obj)
            if filled is None:
                break
            total += len(filled)
        self.message_user(request, f"AI {total} ta maydonni to'ldirdi. «Ko'rib chiqish» bo'limidagi izohga qarang.",
                          messages.SUCCESS)

    @action(description="AI: tarjimalarni to'ldirish", url_path="detail-ai-translate", permissions=["change"])
    def detail_ai_translate(self, request, object_id):
        obj = Inscription.objects.get(pk=object_id)
        filled = self._ai_fill(request, obj)
        if filled:
            self.message_user(request, f"To'ldirildi: {', '.join(filled)}. Iltimos, tekshirib chiqing.", messages.SUCCESS)
        elif filled == []:
            self.message_user(request, "Bo'sh tarjima maydoni yo'q.", messages.INFO)
        return self._back(request, object_id)

    # --- Excel import ---
    @action(description="⬆ Excel'dan import", url_path="import-link")
    def import_link(self, request):
        return HttpResponseRedirect(reverse("admin:catalog_inscription_import"))

    def get_urls(self):
        from django.urls import path

        extra = [
            path("import/", self.admin_site.admin_view(self.import_view), name="catalog_inscription_import"),
            path("import/template/", self.admin_site.admin_view(self.import_template), name="catalog_inscription_import_template"),
        ]
        return extra + super().get_urls()

    def import_template(self, request):
        from django.http import HttpResponse

        from .importer import template_xlsx

        resp = HttpResponse(template_xlsx(),
                            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        resp["Content-Disposition"] = 'attachment; filename="bitiklar-import-namuna.xlsx"'
        return resp

    def import_view(self, request):
        from django.core.exceptions import PermissionDenied
        from django.template.response import TemplateResponse

        from .importer import import_rows, read_rows

        if not self.has_add_permission(request):
            raise PermissionDenied
        report, error, dry = None, "", True
        if request.method == "POST":
            f = request.FILES.get("file")
            dry = request.POST.get("dry_run") == "on"
            if not f:
                error = "Faylni tanlang."
            elif not f.name.lower().endswith((".xlsx", ".csv")):
                error = "Faqat .xlsx yoki .csv fayl qabul qilinadi."
            else:
                try:
                    rows = read_rows(f)
                    report = import_rows(rows, request.user, dry_run=dry,
                                         update_existing=request.POST.get("update") == "on")
                except Exception as e:  # noqa: BLE001
                    error = f"Faylni o'qib bo'lmadi: {e}"
        summary = {}
        for r in report or []:
            summary[r["result"]] = summary.get(r["result"], 0) + 1
        ctx = {
            **self.admin_site.each_context(request),
            "title": "Excel'dan bitiklarni import qilish",
            "opts": self.model._meta,
            "report": report, "summary": summary, "error": error, "dry": dry,
        }
        return TemplateResponse(request, "admin/catalog/import.html", ctx)

    @action(description="Saytda ko'rish ↗", url_path="detail-view-site")
    def detail_view_site(self, request, object_id):
        obj = Inscription.objects.get(pk=object_id)
        return HttpResponseRedirect(f"/uz/bitiklar/{obj.slug}" if obj.status == S.PUBLISHED else "/uz/tadqiqotchilar")


# ---------------------------------------------------------------- Takliflar

@admin.register(Suggestion)
class SuggestionAdmin(ModelAdmin):
    list_display = ("inscription", "field", "author", "status_col", "created_at")
    list_filter = ("status", "field")
    list_filter_submit = True
    search_fields = ("proposed_text", "inscription__title_uz", "author__username")
    readonly_fields = ("diff",)
    autocomplete_fields = ("inscription",)
    fields = ("inscription", "author", "field", "diff", "proposed_text", "justification", "status", "reviewer_note")
    actions = ["accept", "decline"]

    @display(description="Holati", ordering="status", label={"Kutilmoqda": "warning", "Qabul qilindi": "success", "Rad etildi": "danger"})
    def status_col(self, obj):
        return obj.get_status_display()

    @display(description="Hozirgi va taklif etilgan matn")
    def diff(self, obj):
        if not obj.pk:
            return "—"
        current = getattr(obj.inscription, obj.field, "") if obj.field != "other" else ""
        return format_html(
            '<div class="bk-diff"><div><small>Hozirgi</small><p>{}</p></div><div class="new"><small>Taklif</small><p>{}</p></div></div>',
            current or "—", obj.proposed_text,
        )

    @admin.action(description="Qabul qilish va bitikka qo'llash")
    def accept(self, request, queryset):
        n = 0
        for s in queryset.filter(status=Suggestion.Status.PENDING):
            if s.field != "other":
                setattr(s.inscription, s.field, s.proposed_text)
                s.inscription.save()
            s.status = Suggestion.Status.ACCEPTED
            s.save()
            n += 1
        self.message_user(request, f"{n} ta taklif qabul qilindi.", messages.SUCCESS)

    @admin.action(description="Rad etish")
    def decline(self, request, queryset):
        n = 0
        for s in queryset.filter(status=Suggestion.Status.PENDING):
            s.status = Suggestion.Status.REJECTED
            s.save()
            n += 1
        self.message_user(request, f"{n} ta taklif rad etildi.", messages.WARNING)


# ---------------------------------------------------------------- Yo'nalishlar

class RouteStopInline(TabularInline):
    model = RouteStop
    extra = 1
    autocomplete_fields = ("monument",)
    fields = ("order", "monument", "note_uz", "note_ru", "note_en")


@admin.register(Route)
class RouteAdmin(ModelAdmin):
    list_display = ("title_uz", "region", "duration", "stops_n", "is_published", "order")
    list_editable = ("is_published", "order")
    list_filter = ("region", "is_published")
    search_fields = ("title_uz", "title_ru", "title_en")
    readonly_fields = ("slug",)
    inlines = [RouteStopInline]
    fieldsets = (
        (None, {"fields": (("title_uz", "title_ru", "title_en"), "slug", ("region", "duration"), "cover_image", ("is_published", "order"))}),
        ("Tavsif", {"fields": ("description_uz", "description_ru", "description_en")}),
    )

    @display(description="Bekatlar")
    def stops_n(self, obj):
        return obj.stops.count()



# ---------------------------------------------------------------- Shaxslar, lug'at

@admin.register(Person)
class PersonAdmin(ModelAdmin):
    list_display = ("name_col", "role_col", "years", "inscriptions_n")
    list_filter = ("role",)
    search_fields = ("name_uz", "name_ru", "name_en", "name_original")
    readonly_fields = ("slug",)
    fieldsets = (
        (None, {"fields": (("name_uz", "name_ru", "name_en"), ("name_original", "slug"), ("role", "years"),
                           ("year_from", "year_to"), "portrait")}),
        ("Tarjimai hol", {"fields": ("bio_uz", "bio_ru", "bio_en")}),
    )

    @display(description="Shaxs", header=True, ordering="name_uz")
    def name_col(self, obj):
        return [obj.name_uz, obj.name_original or obj.name_en or ""]

    @display(description="Roli", ordering="role", label=True)
    def role_col(self, obj):
        return obj.get_role_display()

    @display(description="Bitiklar")
    def inscriptions_n(self, obj):
        return obj.inscriptions.count()


@admin.register(Term)
class TermAdmin(ModelAdmin):
    list_display = ("term_uz", "term_original", "group", "key")
    list_filter = ("group",)
    search_fields = ("term_uz", "term_ru", "term_en", "key")
    fieldsets = (
        (None, {"fields": (("key", "group"), ("term_uz", "term_ru", "term_en"), "term_original")}),
        ("Izoh", {"fields": ("definition_uz", "definition_ru", "definition_en"),
                  "description": "Kalit yozuv uslubi yoki texnika qiymatiga teng bo'lsa (masalan thuluth, bannai), "
                                 "izoh bitik sahifasida avtomatik ko'rsatiladi."}),
    )


# ---------------------------------------------------------------- Tashrifchilar rasmlari

@admin.register(VisitorPhoto)
class VisitorPhotoAdmin(ModelAdmin):
    list_display = ("preview", "target", "author_name", "status_col", "created_at")
    list_filter = ("status",)
    search_fields = ("author_name", "author_email", "note", "inscription__title_uz", "monument__name_uz")
    readonly_fields = ("preview_big", "created_at")
    autocomplete_fields = ("inscription", "monument")
    actions = ["approve", "reject"]
    fields = ("preview_big", "inscription", "monument", "author_name", "author_email", "note", "consent", "status",
              "lat", "lng", "created_at")

    @display(description="")
    def preview(self, obj):
        return thumb(obj.image.url if obj.image else None, 56)

    @display(description="Rasm")
    def preview_big(self, obj):
        return format_html('<a href="{0}" target="_blank"><img src="{0}" style="max-height:360px;border-radius:10px"></a>',
                           obj.image.url) if obj.image else "—"

    @display(description="Qayerga")
    def target(self, obj):
        return obj.inscription or obj.monument

    @display(description="Holati", ordering="status", label={"Kutilmoqda": "warning", "Qabul qilindi": "success", "Rad etildi": "danger"})
    def status_col(self, obj):
        return obj.get_status_display()

    @admin.action(description="Qabul qilish va galereyaga qo'shish")
    def approve(self, request, queryset):
        from pathlib import PurePosixPath

        from django.core.files.base import ContentFile

        n = 0
        for p in queryset.filter(status=VisitorPhoto.Status.PENDING):
            with p.image.open("rb") as fh:
                data = fh.read()
            name = PurePosixPath(p.image.name).name
            if p.inscription:
                img = InscriptionImage(inscription=p.inscription, caption=p.note[:255], credit=p.author_name,
                                       order=p.inscription.images.count() + 1)
                img.image = ContentFile(data, name=name)
                img.save()
            elif p.monument and not p.monument.cover_image:
                p.monument.cover_image = ContentFile(data, name=name)
                p.monument.save()
            p.status = VisitorPhoto.Status.APPROVED
            p.save(update_fields=["status"])
            n += 1
        self.message_user(request, f"{n} ta rasm qabul qilindi va galereyaga qo'shildi.", messages.SUCCESS)

    @admin.action(description="Rad etish")
    def reject(self, request, queryset):
        n = queryset.filter(status=VisitorPhoto.Status.PENDING).update(status=VisitorPhoto.Status.REJECTED)
        self.message_user(request, f"{n} ta rasm rad etildi.", messages.WARNING)
