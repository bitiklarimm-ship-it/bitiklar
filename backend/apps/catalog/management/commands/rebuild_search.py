from django.core.management.base import BaseCommand

from apps.catalog.models import Inscription


class Command(BaseCommand):
    help = "Barcha bitiklar uchun normallashtirilgan qidiruv matnini qayta yaratadi."

    def handle(self, *args, **opts):
        n = 0
        for ins in Inscription.objects.select_related("monument").iterator():
            text = ins.build_search_text()
            if text != ins.search_text:
                Inscription.objects.filter(pk=ins.pk).update(search_text=text)
                n += 1
        self.stdout.write(self.style.SUCCESS(f"Qidiruv matni yangilandi: {n} ta bitik"))
