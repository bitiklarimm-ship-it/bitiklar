"""Admin panel (Unfold): bosh sahifa ma'lumotlari va yon menyudagi raqamli belgilar."""
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.db.models import Count, Q
from django.urls import reverse
from django.utils import timezone

from .models import Inscription, Monument, Region, Route, Suggestion

S = Inscription.Status


# ---------- Yon menyudagi belgilar (badge) ----------

def badge_pending(request):
    n = Inscription.objects.filter(status=S.PENDING).count()
    return n or None


def badge_suggestions(request):
    n = Suggestion.objects.filter(status=Suggestion.Status.PENDING).count()
    return n or None


def badge_researchers(request):
    User = get_user_model()
    n = User.objects.filter(role=User.Role.RESEARCHER, is_verified=False).count()
    return n or None


def environment(request):
    from django.conf import settings

    return ["Ishlab chiqish", "warning"] if settings.DEBUG else ["Ishchi sayt", "success"]


# ---------- Bosh sahifa ----------

def dashboard_callback(request, context):
    User = get_user_model()
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    pub = Inscription.objects.filter(status=S.PUBLISHED)
    published = pub.count()

    by_lang = {r["language"]: r["n"] for r in pub.values("language").annotate(n=Count("id"))}
    languages = []
    for value, label in Inscription.Language.choices:
        n = by_lang.get(value, 0)
        languages.append({"value": value, "label": label, "n": n, "pct": round(100 * n / published) if published else 0})

    regions = (Region.objects.annotate(n=Count("monuments__inscriptions", filter=Q(monuments__inscriptions__status=S.PUBLISHED)))
               .filter(n__gt=0).order_by("-n")[:8])
    max_region = max([r.n for r in regions] or [1])

    pending = (Inscription.objects.filter(status=S.PENDING).select_related("monument", "submitted_by")
               .order_by("created_at")[:8])
    suggestions = (Suggestion.objects.filter(status=Suggestion.Status.PENDING)
                   .select_related("inscription", "author").order_by("created_at")[:6])
    history = Inscription.history.select_related("history_user").order_by("-history_date")[:10]

    def url(name, *args):
        return reverse(f"admin:{name}", args=args)

    context.update({
        "kpi": [
            {"label": "Nashr qilingan bitiklar", "value": published, "icon": "auto_stories",
             "sub": f"+{pub.filter(published_at__gte=week_ago).count()} shu hafta", "link": url("catalog_inscription_changelist") + "?status__exact=published"},
            {"label": "Ko'rib chiqish kutilmoqda", "value": Inscription.objects.filter(status=S.PENDING).count(), "icon": "pending_actions",
             "tone": "warn", "link": url("catalog_inscription_changelist") + "?status__exact=pending"},
            {"label": "Tuzatish takliflari", "value": Suggestion.objects.filter(status=Suggestion.Status.PENDING).count(), "icon": "rate_review",
             "tone": "warn", "link": url("catalog_suggestion_changelist") + "?status__exact=pending"},
            {"label": "Tasdiq kutayotgan tadqiqotchilar", "value": User.objects.filter(role=User.Role.RESEARCHER, is_verified=False).count(),
             "icon": "person_add", "tone": "warn", "link": url("accounts_user_changelist") + "?role__exact=researcher&is_verified__exact=0"},
            {"label": "Obidalar", "value": Monument.objects.count(), "icon": "mosque", "link": url("catalog_monument_changelist")},
            {"label": "Yo'nalishlar", "value": Route.objects.count(), "icon": "route", "link": url("catalog_route_changelist")},
        ],
        "quality": [
            {"label": "Rasmsiz bitiklar", "value": pub.filter(images__isnull=True).count(),
             "link": url("catalog_inscription_changelist") + "?status__exact=published&images__isnull=True"},
            {"label": "Aniq joyi belgilanmagan", "value": pub.filter(latitude__isnull=True).count(),
             "link": url("catalog_inscription_changelist") + "?status__exact=published&latitude__isnull=True"},
            {"label": "Tarjimasi yo'q (RU)", "value": pub.filter(translation_ru="").count(),
             "link": url("catalog_inscription_changelist") + "?status__exact=published&translation_ru__exact="},
            {"label": "Tarjimasi yo'q (EN)", "value": pub.filter(translation_en="").count(),
             "link": url("catalog_inscription_changelist") + "?status__exact=published&translation_en__exact="},
            {"label": "Manbasiz bitiklar", "value": pub.filter(sources__isnull=True).count(),
             "link": url("catalog_inscription_changelist") + "?status__exact=published&sources__isnull=True"},
        ],
        "languages": languages,
        "regions": [{"name": r.name_uz, "n": r.n, "pct": round(100 * r.n / max_region)} for r in regions],
        "pending_list": [
            {"title": i.title_uz, "monument": i.monument.name_uz, "by": str(i.submitted_by) if i.submitted_by else "—",
             "date": i.created_at, "link": url("catalog_inscription_change", i.pk)}
            for i in pending
        ],
        "suggestion_list": [
            {"title": s.inscription.title_uz, "field": s.get_field_display(), "by": str(s.author), "date": s.created_at,
             "link": url("catalog_suggestion_change", s.pk)}
            for s in suggestions
        ],
        "history_list": [
            {"type": h.history_type, "title": h.title_uz, "user": str(h.history_user) if h.history_user else "—",
             "date": h.history_date, "status": h.get_status_display() if hasattr(h, "get_status_display") else h.status}
            for h in history
        ],
        "top_list": list(pub.order_by("-views_count").values("title_uz", "views_count", "pk")[:6]),
        "quick": [
            {"label": "Yangi bitik", "icon": "add_circle", "link": url("catalog_inscription_add")},
            {"label": "Yangi obida", "icon": "add_location_alt", "link": url("catalog_monument_add")},
            {"label": "Muharrir paneli", "icon": "fact_check", "link": "/uz/tadqiqotchilar?tab=editor"},
            {"label": "Jonli xarita", "icon": "map", "link": "/uz/xarita", "blank": True},
            {"label": "QR-kodlarni chop etish", "icon": "qr_code_2", "link": "/uz/qr-chop", "blank": True},
            {"label": "Eksport (CSV)", "icon": "download", "link": "/api/export/csv/"},
            {"label": "Eksport (TEI-XML)", "icon": "data_object", "link": "/api/export/tei/"},
        ],
    })
    return context
