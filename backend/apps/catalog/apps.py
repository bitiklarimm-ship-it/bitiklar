from django.apps import AppConfig


class CatalogConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.catalog"
    label = "catalog"
    verbose_name = "Katalog"

    def ready(self):
        from . import imaging, signals  # noqa: F401  (imaging: HEIC formatini ro'yxatdan o'tkazadi)
