from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path
from django.views.static import serve

admin.site.site_header = "BITIKLAR — boshqaruv paneli"
admin.site.site_title = "BITIKLAR admin"
admin.site.index_title = "Tarix toshlarga bitilgan"

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/ai/", include("apps.ai.urls")),
    path("api/", include("apps.catalog.urls")),
]

# Mahalliy saqlashda media fayllarni Django o'zi beradi (kichik hajm uchun).
# Katta hajmda STORAGE_BACKEND=s3 yoki cloudinary ishlating.
if settings.STORAGE_BACKEND == "local":
    urlpatterns += [re_path(r"^media/(?P<path>.*)$", serve, {"document_root": settings.MEDIA_ROOT})]
