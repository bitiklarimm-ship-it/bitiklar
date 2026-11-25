"""Rasmlarni qayta ishlash.

Asl rasm HECH QACHON o'zgartirilmaydi va siqilmaydi (ilmiy qiymati uchun to'liq sifatda saqlanadi).
Saytda tez ochilishi uchun undan ikkita yuqori sifatli WebP nusxa yasaladi:
  * large — 2400 px gacha (bitik sahifasi, kattalashtirib ko'rish)
  * thumb — 720 px gacha (kartalar, ro'yxatlar, xarita)
Telefon rasmlarining burilishi (EXIF) to'g'rilanadi, iPhone'ning HEIC formati ham qabul qilinadi.
"""
import logging
from io import BytesIO
from pathlib import PurePosixPath

from django.core.files.base import ContentFile
from PIL import Image, ImageOps

log = logging.getLogger(__name__)

try:  # iPhone HEIC/HEIF rasmlari
    from pillow_heif import register_heif_opener

    register_heif_opener()
except Exception:  # noqa: BLE001 — kutubxona bo'lmasa ham ishlayveradi
    pass

Image.MAX_IMAGE_PIXELS = 120_000_000  # 100+ MP kameralar uchun

VARIANTS = {
    "large": {"size": 2400, "quality": 90},
    "thumb": {"size": 720, "quality": 84},
}


def _open(fileobj):
    fileobj.seek(0)
    img = Image.open(fileobj)
    # Juda katta JPEG'larni xotirani tejab ochish (512 MB serverda muhim)
    img.draft("RGB", (VARIANTS["large"]["size"] * 2, VARIANTS["large"]["size"] * 2))
    img = ImageOps.exif_transpose(img)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA" if "A" in img.getbands() else "RGB")
    return img


def make_variants(fileobj, source_name):
    """{'large': ContentFile, 'thumb': ContentFile}, (eni, bo'yi) qaytaradi."""
    img = _open(fileobj)
    stem = PurePosixPath(source_name).stem[:80] or "rasm"
    out = {}
    for key, opt in VARIANTS.items():
        im = img.copy()
        im.thumbnail((opt["size"], opt["size"]), Image.Resampling.LANCZOS)
        buf = BytesIO()
        im.save(buf, "WEBP", quality=opt["quality"], method=5)
        out[key] = ContentFile(buf.getvalue(), name=f"{stem}-{key}.webp")
    size = img.size
    img.close()
    fileobj.seek(0)
    return out, size


def attach_variants(instance, src_field, large_field, thumb_field, size_fields=None):
    """Yangi yuklangan rasm uchun nusxalarni modelga biriktiradi (save() ichidan chaqiriladi)."""
    f = getattr(instance, src_field)
    if not f or getattr(f, "_committed", True):
        return  # yangi yuklash emas
    try:
        files, (w, h) = make_variants(f.file, f.name)
    except Exception:  # noqa: BLE001 — nusxa yasalmasa ham asl rasm saqlanadi
        log.exception("Rasm nusxalari yaratilmadi: %s", f.name)
        return
    getattr(instance, large_field).save(files["large"].name, files["large"], save=False)
    getattr(instance, thumb_field).save(files["thumb"].name, files["thumb"], save=False)
    if size_fields:
        setattr(instance, size_fields[0], w)
        setattr(instance, size_fields[1], h)
