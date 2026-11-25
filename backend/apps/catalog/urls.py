from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("regions", views.RegionViewSet, basename="region")
router.register("monuments", views.MonumentViewSet, basename="monument")
router.register("inscriptions", views.InscriptionViewSet, basename="inscription")
router.register("suggestions", views.SuggestionViewSet, basename="suggestion")
router.register("routes", views.RouteViewSet, basename="route")

urlpatterns = [
    path("stats/", views.stats, name="stats"),
    path("choices/", views.choices, name="choices"),
    path("export/csv/", views.export_csv, name="export-csv"),
    path("export/json/", views.export_json, name="export-json"),
    path("export/tei/", views.export_tei, name="export-tei"),
    path("editor/overview/", views.editor_overview, name="editor-overview"),
    path("", include(router.urls)),
]
