from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import views

router = DefaultRouter()
router.register("regions", views.RegionViewSet, basename="region")
router.register("monuments", views.MonumentViewSet, basename="monument")
router.register("inscriptions", views.InscriptionViewSet, basename="inscription")
router.register("suggestions", views.SuggestionViewSet, basename="suggestion")

urlpatterns = [
    path("stats/", views.stats, name="stats"),
    path("choices/", views.choices, name="choices"),
    path("", include(router.urls)),
]
