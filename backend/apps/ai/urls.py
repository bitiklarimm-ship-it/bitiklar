from django.urls import path

from .views import analyze, explain, identify, languages, translate

urlpatterns = [
    path("analyze/", analyze, name="ai-analyze"),
    path("explain/", explain, name="ai-explain"),
    path("identify/", identify, name="ai-identify"),
    path("translate/", translate, name="ai-translate"),
    path("languages/", languages, name="ai-languages"),
]
