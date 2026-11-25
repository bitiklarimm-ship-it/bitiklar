"""BITIKLAR — Django sozlamalari.

Barcha maxfiy qiymatlar muhit o'zgaruvchilaridan (.env) olinadi.
"""
import os
from datetime import timedelta
from pathlib import Path
from urllib.parse import urlparse

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent


def env_bool(name, default=False):
    return os.environ.get(name, str(default)).lower() in ("1", "true", "yes", "on")


def env_list(name, default=""):
    return [x.strip() for x in os.environ.get(name, default).split(",") if x.strip()]


SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-change-me")
DEBUG = env_bool("DJANGO_DEBUG", False)

# Bitta serverli rejim: sayt ham, API ham bitta manzilda (masalan, https://bitiklar.uz).
# SITE_URL berilsa, FRONTEND_URL / BACKEND_PUBLIC_URL / ALLOWED_HOSTS / CSRF shundan olinadi.
SITE_URL = os.environ.get("SITE_URL", "").rstrip("/")
# Render o'zi beradi: bitiklar.onrender.com
RENDER_HOST = os.environ.get("RENDER_EXTERNAL_HOSTNAME", "")
if not SITE_URL and RENDER_HOST:
    SITE_URL = f"https://{RENDER_HOST}"

FRONTEND_URL = (os.environ.get("FRONTEND_URL") or SITE_URL or "http://localhost:3000").rstrip("/")
# Backendning tashqi (brauzer ko'radigan) manzili — media fayllar havolasi uchun
BACKEND_PUBLIC_URL = (os.environ.get("BACKEND_PUBLIC_URL") or SITE_URL).rstrip("/")


def _host(url):
    return urlparse(url).hostname if url else None


ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "")
# Next.js serveri Django'ga ichkaridan (127.0.0.1) murojaat qiladi
for h in ("localhost", "127.0.0.1", RENDER_HOST, _host(SITE_URL), _host(FRONTEND_URL), _host(BACKEND_PUBLIC_URL)):
    if h and h not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(h)

CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS", "")
for o in (SITE_URL, FRONTEND_URL, BACKEND_PUBLIC_URL, "http://localhost:3000", "http://localhost:8000"):
    if o and o not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(o)

INSTALLED_APPS = [
    # Zamonaviy admin panel (django.contrib.admin dan oldin turishi shart)
    "unfold",
    "unfold.contrib.filters",
    "unfold.contrib.forms",
    "unfold.contrib.simple_history",
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.postgres",
    # 3-tomon
    "rest_framework",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_filters",
    "simple_history",
    # BITIKLAR
    "apps.accounts",
    "apps.catalog",
    "apps.ai",
]

STORAGE_BACKEND = os.environ.get("STORAGE_BACKEND", "local")  # local | r2 | s3 | cloudinary
if STORAGE_BACKEND == "cloudinary":
    INSTALLED_APPS += ["cloudinary_storage", "cloudinary"]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    # O'zgarishlar tarixida kim o'zgartirganini yozib boradi
    "simple_history.middleware.HistoryRequestMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

DATABASES = {
    "default": dj_database_url.config(
        default="postgres://bitiklar:bitiklar@localhost:5432/bitiklar",
        conn_max_age=600,
    )
}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "uz"
LANGUAGES = [("uz", "O'zbekcha"), ("ru", "Русский"), ("en", "English")]
TIME_ZONE = "Asia/Tashkent"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
if STORAGE_BACKEND == "r2":
    # Cloudflare R2 (S3-mos API). Rasmlar ommaviy domen orqali beriladi:
    # R2_PUBLIC_DOMAIN = media.bitiklar.uz (bucketga ulangan custom domain) yoki pub-xxxx.r2.dev
    from botocore.config import Config as BotoConfig

    STORAGES["default"] = {"BACKEND": "storages.backends.s3.S3Storage"}
    AWS_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
    AWS_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
    AWS_STORAGE_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "bitiklar-media")
    AWS_S3_ENDPOINT_URL = f"https://{os.environ.get('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com"
    AWS_S3_REGION_NAME = "auto"
    AWS_S3_SIGNATURE_VERSION = "s3v4"
    AWS_S3_CUSTOM_DOMAIN = os.environ.get("R2_PUBLIC_DOMAIN") or None
    AWS_S3_URL_PROTOCOL = "https:"
    AWS_DEFAULT_ACL = None  # R2 ACL'ni qo'llab-quvvatlamaydi
    AWS_QUERYSTRING_AUTH = not AWS_S3_CUSTOM_DOMAIN  # ommaviy domen bo'lmasa — imzolangan havola
    AWS_QUERYSTRING_EXPIRE = 60 * 60 * 24 * 7
    AWS_S3_FILE_OVERWRITE = False
    AWS_S3_OBJECT_PARAMETERS = {"CacheControl": "public, max-age=31536000, immutable"}
    # boto3 >= 1.36 yangi checksum sarlavhalari R2 bilan muammo bermasligi uchun
    AWS_S3_CLIENT_CONFIG = BotoConfig(
        request_checksum_calculation="when_required",
        response_checksum_validation="when_required",
    )
elif STORAGE_BACKEND == "s3":
    STORAGES["default"] = {"BACKEND": "storages.backends.s3.S3Storage"}
    AWS_STORAGE_BUCKET_NAME = os.environ.get("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_REGION_NAME = os.environ.get("AWS_S3_REGION_NAME")
    AWS_S3_ENDPOINT_URL = os.environ.get("AWS_S3_ENDPOINT_URL") or None
    AWS_QUERYSTRING_AUTH = False
    AWS_DEFAULT_ACL = None
elif STORAGE_BACKEND == "cloudinary":
    STORAGES["default"] = {"BACKEND": "cloudinary_storage.storage.MediaCloudinaryStorage"}
    CLOUDINARY_STORAGE = {"CLOUDINARY_URL": os.environ.get("CLOUDINARY_URL", "")}

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticatedOrReadOnly"],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.catalog.pagination.StandardPagination",
    "PAGE_SIZE": 24,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {"anon": "120/min", "user": "600/min", "ai": "20/hour", "export": "30/hour",
                                "ai_public": "30/hour", "ai_identify": "15/hour",
                                "photos": "10/hour", "ai_translate": "40/hour"},
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=2),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=14),
}

# Bitta serverli rejimda CORS kerak emas (bir xil domen). Faqat ishlab chiqish yoki tashqi mijozlar uchun.
CORS_ALLOWED_ORIGINS = env_list("CORS_ALLOWED_ORIGINS", "http://localhost:3000")

# AI tahlil (Anthropic Claude). Kalit bo'lmasa, endpoint 503 qaytaradi.
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
AI_MODEL = os.environ.get("AI_MODEL", "claude-sonnet-5-5")

# OpenStreetMap xarita plitkalari Referer sarlavhasini talab qiladi (aks holda "Access blocked / 403").
# Django standarti "same-origin" uni boshqa saytlarga yubormaydi — shuning uchun faqat domen nomi yuboriladi.
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"

if not DEBUG:
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True


# ---------- Kesh ----------
# Bitta server uchun xotiradagi kesh yetarli (har bir gunicorn jarayonida alohida).
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "bitiklar",
        "TIMEOUT": 300,
        "OPTIONS": {"MAX_ENTRIES": 2000},
    }
}

# ---------- Email (tadqiqotchilarga xabarnomalar) ----------
# EMAIL_HOST bo'sh bo'lsa, xatlar faqat logga chiqadi.
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", True)
EMAIL_USE_SSL = env_bool("EMAIL_USE_SSL", False)
EMAIL_TIMEOUT = 10
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "BITIKLAR <noreply@bitiklar.uz>")
SERVER_EMAIL = DEFAULT_FROM_EMAIL
EMAIL_BACKEND = (
    "django.core.mail.backends.smtp.EmailBackend" if EMAIL_HOST
    else "django.core.mail.backends.console.EmailBackend"
)

# ---------- Loglar ----------
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
    "loggers": {"django.request": {"handlers": ["console"], "level": "WARNING", "propagate": False}},
}

# ---------- Xatolarni kuzatish (Sentry, ixtiyoriy) ----------
SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        environment=os.environ.get("SENTRY_ENVIRONMENT", "production"),
        traces_sample_rate=float(os.environ.get("SENTRY_TRACES_SAMPLE_RATE", "0.05")),
        send_default_pii=False,
    )


# ---------- Admin panel ko'rinishi (Unfold) ----------
from django.templatetags.static import static as _static  # noqa: E402
from django.urls import reverse_lazy  # noqa: E402


def _nav(title, icon, url_name, badge=None, **extra):
    item = {"title": title, "icon": icon, "link": reverse_lazy(url_name)}
    if badge:
        item["badge"] = badge
        item["badge_variant"] = "warning"
    item.update(extra)
    return item


# Lojuvard (lapis) rang shkalasi
LAPIS = {
    "50": "oklch(97.5% .012 265)", "100": "oklch(94.5% .026 265)", "200": "oklch(89% .05 265)",
    "300": "oklch(80% .09 265)", "400": "oklch(68% .14 265)", "500": "oklch(56% .17 265)",
    "600": "oklch(47% .16 265)", "700": "oklch(40% .14 265)", "800": "oklch(34% .12 265)",
    "900": "oklch(28% .095 265)", "950": "oklch(21% .07 265)",
}

UNFOLD = {
    "SITE_TITLE": "BITIKLAR admin",
    "SITE_HEADER": "BITIKLAR",
    "SITE_SUBHEADER": "Tarix toshlarga bitilgan",
    "SITE_SYMBOL": "mosque",
    "SITE_URL": "/",
    "SITE_FAVICONS": [{"rel": "icon", "type": "image/svg+xml", "href": lambda request: "/favicon.svg"}],
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "SHOW_BACK_BUTTON": True,
    "BORDER_RADIUS": "10px",
    "ENVIRONMENT": "apps.catalog.dashboard.environment",
    "DASHBOARD_CALLBACK": "apps.catalog.dashboard.dashboard_callback",
    "COLORS": {"primary": LAPIS},
    "STYLES": [lambda request: _static("admin/bitiklar.css")],
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": True,
        "navigation": [
            {
                "title": "Asosiy",
                "items": [
                    _nav("Bosh sahifa", "dashboard", "admin:index"),
                    _nav("Bitiklar", "auto_stories", "admin:catalog_inscription_changelist",
                         badge="apps.catalog.dashboard.badge_pending"),
                    _nav("Obidalar", "mosque", "admin:catalog_monument_changelist"),
                    _nav("Yo'nalishlar", "route", "admin:catalog_route_changelist"),
                    _nav("Shaxslar", "person_book", "admin:catalog_person_changelist"),
                    _nav("Atamalar lug'ati", "menu_book", "admin:catalog_term_changelist"),
                    _nav("Hududlar", "map", "admin:catalog_region_changelist"),
                    _nav("Excel'dan import", "upload_file", "admin:catalog_inscription_import"),
                ],
            },
            {
                "title": "Ko'rib chiqish",
                "separator": True,
                "items": [
                    _nav("Tuzatish takliflari", "rate_review", "admin:catalog_suggestion_changelist",
                         badge="apps.catalog.dashboard.badge_suggestions"),
                    _nav("Tashrifchilar rasmlari", "add_a_photo", "admin:catalog_visitorphoto_changelist",
                         badge="apps.catalog.dashboard.badge_photos"),
                    _nav("Foydalanuvchilar", "group", "admin:accounts_user_changelist",
                         badge="apps.catalog.dashboard.badge_researchers"),
                    _nav("Guruhlar va ruxsatlar", "admin_panel_settings", "admin:auth_group_changelist",
                         permission=lambda request: request.user.is_superuser),
                ],
            },
        ],
    },
    "TABS": [
        {
            "models": ["catalog.inscription", "catalog.suggestion"],
            "items": [
                {"title": "Barcha bitiklar", "link": reverse_lazy("admin:catalog_inscription_changelist")},
                {"title": "Ko'rib chiqishda",
                 "link": lambda request: str(reverse_lazy("admin:catalog_inscription_changelist")) + "?status__exact=pending"},
                {"title": "Takliflar", "link": reverse_lazy("admin:catalog_suggestion_changelist")},
            ],
        },
    ],
}
