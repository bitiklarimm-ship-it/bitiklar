import django_filters
from django.db.models import Q

from .models import Inscription, Monument

INSCRIPTION_SEARCH_FIELDS = (
    "title_uz", "title_ru", "title_en", "original_text", "transliteration",
    "translation_uz", "translation_ru", "translation_en", "calligrapher",
    "monument__name_uz", "monument__name_ru", "monument__name_en", "monument__city",
)


def search_q(fields, value):
    q = Q()
    for term in value.split():
        part = Q()
        for f in fields:
            part |= Q(**{f"{f}__icontains": term})
        q &= part
    return q


class InscriptionFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_q", label="Qidiruv")
    monument = django_filters.CharFilter(field_name="monument__slug")
    region = django_filters.CharFilter(field_name="monument__region__slug")
    kind = django_filters.CharFilter(field_name="monument__kind")
    year_min = django_filters.NumberFilter(field_name="year_to", lookup_expr="gte")
    year_max = django_filters.NumberFilter(field_name="year_from", lookup_expr="lte")

    class Meta:
        model = Inscription
        fields = ("language", "script", "technique", "status", "is_featured")

    def filter_q(self, qs, name, value):
        return qs.filter(search_q(INSCRIPTION_SEARCH_FIELDS, value)).distinct()


class MonumentFilter(django_filters.FilterSet):
    q = django_filters.CharFilter(method="filter_q")
    region = django_filters.CharFilter(field_name="region__slug")

    class Meta:
        model = Monument
        fields = ("kind", "century")

    def filter_q(self, qs, name, value):
        return qs.filter(search_q(("name_uz", "name_ru", "name_en", "city", "description_uz"), value))
