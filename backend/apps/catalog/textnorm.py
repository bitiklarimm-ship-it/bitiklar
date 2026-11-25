"""Qidiruv uchun matnni normallashtirish (arab, fors, eski turkiy va lotin/kirill yozuvlari).

Maqsad: foydalanuvchi qanday yozishidan qat'i nazar (harakatli/harakatsiz, أ yoki ا, ي yoki ی,
"o'" yoki "oʻ") bir xil natija topilsin.

    >>> normalize("بِسْمِ اللَّهِ الرَّحْمَٰنِ")
    'بسم الله الرحمن'
    >>> normalize("Ulug‘bek MADRASASI")
    'ulugbek madrasasi'
"""
import re
import unicodedata

# Arabcha harakatlar (fatha, kasra, damma, tanvin, sukun, shadda), Qur'on belgilari, xanjar alif
_DIACRITICS = re.compile(
    "["
    "ؐ-ؚ"   # Qur'on belgilari
    "ً-ٟ"   # harakatlar
    "ٰ"          # xanjar alif
    "ۖ-ۭ"   # Qur'on to'xtash belgilari
    "࣓-ࣿ"   # kengaytirilgan belgilar
    "ـ"          # tatvil (kashida)
    "‌‍‎‏"  # ZWNJ/ZWJ va yo'nalish belgilari
    "]"
)

# Harf shakllarini yagona ko'rinishga keltirish
_LETTER_MAP = str.maketrans({
    "أ": "ا", "إ": "ا", "آ": "ا", "ٱ": "ا", "ٲ": "ا", "ٳ": "ا",
    "ى": "ي", "ی": "ي", "ې": "ي", "ۍ": "ي", "ئ": "ي",
    "ؤ": "و", "ۇ": "و", "ۆ": "و", "ۈ": "و",
    "ة": "ه", "ۀ": "ه", "ە": "ه", "ہ": "ه", "ھ": "ه",
    "ك": "ك", "ک": "ك", "ڪ": "ك",
    "گ": "گ",
    "ء": "",
    # Fors/arab raqamlari -> lotin raqamlari
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    # O'zbek lotin yozuvidagi tutuq belgilarining barcha ko'rinishlari olib tashlanadi
    "'": "", "ʻ": "", "ʼ": "", "‘": "", "’": "", "`": "", "´": "",
    "ё": "е", "Ё": "е",
})

_SPACES = re.compile(r"\s+")


def normalize(text):
    if not text:
        return ""
    s = unicodedata.normalize("NFKC", str(text))
    s = _DIACRITICS.sub("", s)
    s = s.translate(_LETTER_MAP)
    # Lotin harflaridagi diakritikani olib tashlash (ā -> a, ş -> s), arab harflari tegilmaydi
    s = "".join(
        ch for ch in unicodedata.normalize("NFD", s)
        if not (unicodedata.category(ch) == "Mn" and ord(ch) < 0x0600)
    )
    s = unicodedata.normalize("NFC", s).lower()
    return _SPACES.sub(" ", s).strip()
