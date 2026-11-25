"""Avval yuklangan rasmlar uchun yetishmayotgan WebP nusxalarni yaratadi (asl rasmga tegmaydi).

    python manage.py build_thumbs
"""
from django.core.management.base import BaseCommand
from django.db.models import Q

from apps.catalog.imaging import make_variants
from apps.catalog.models import InscriptionImage, Monument


class Command(BaseCommand):
    help = "Rasmlarning sayt uchun nusxalarini (large/thumb) yaratadi"

    def handle(self, *args, **opts):
        n = 0
        for im in InscriptionImage.objects.exclude(image="").filter(Q(image_large="") | Q(image_thumb="")):
            if self._do(im, "image", "image_large", "image_thumb", ("width", "height")):
                n += 1
        for m in Monument.objects.exclude(cover_image="").filter(Q(cover_large="") | Q(cover_thumb="")):
            if self._do(m, "cover_image", "cover_large", "cover_thumb"):
                n += 1
        self.stdout.write(self.style.SUCCESS(f"Rasm nusxalari yaratildi: {n} ta"))

    def _do(self, obj, src, large, thumb, sizes=None):
        f = getattr(obj, src)
        try:
            with f.open("rb") as fh:
                files, (w, h) = make_variants(fh, f.name)
        except Exception as e:  # noqa: BLE001
            self.stderr.write(f"O'tkazib yuborildi ({f.name}): {e}")
            return False
        getattr(obj, large).save(files["large"].name, files["large"], save=False)
        getattr(obj, thumb).save(files["thumb"].name, files["thumb"], save=False)
        fields = [large, thumb]
        if sizes:
            setattr(obj, sizes[0], w)
            setattr(obj, sizes[1], h)
            fields += list(sizes)
        type(obj).objects.filter(pk=obj.pk).update(**{k: getattr(obj, k) for k in fields})
        return True
