"""Hududlar va bir nechta obidani bazaga kiritadi; DEMO bitiklar qo'shadi.

    python manage.py seed_demo            # hudud + obida + demo bitiklar
    python manage.py seed_demo --no-demo  # faqat hudud va obidalar

DIQQAT: demo bitiklar sinov uchun. Ulardagi joylashuv va izohlar mutaxassis
tomonidan tekshirilishi va haqiqiy ma'lumot bilan almashtirilishi kerak.
Koordinatalar taxminiy (obida markazi).
"""
from django.core.management.base import BaseCommand

from apps.catalog.models import Inscription, Monument, Region, Route, RouteStop

REGIONS = [
    ("toshkent-shahri", "Toshkent shahri", "г. Ташкент", "Tashkent city"),
    ("toshkent", "Toshkent viloyati", "Ташкентская область", "Tashkent Region"),
    ("samarqand", "Samarqand viloyati", "Самаркандская область", "Samarkand Region"),
    ("buxoro", "Buxoro viloyati", "Бухарская область", "Bukhara Region"),
    ("xorazm", "Xorazm viloyati", "Хорезмская область", "Khorezm Region"),
    ("qashqadaryo", "Qashqadaryo viloyati", "Кашкадарьинская область", "Kashkadarya Region"),
    ("surxondaryo", "Surxondaryo viloyati", "Сурхандарьинская область", "Surkhandarya Region"),
    ("navoiy", "Navoiy viloyati", "Навоийская область", "Navoi Region"),
    ("jizzax", "Jizzax viloyati", "Джизакская область", "Jizzakh Region"),
    ("sirdaryo", "Sirdaryo viloyati", "Сырдарьинская область", "Syrdarya Region"),
    ("fargona", "Farg'ona viloyati", "Ферганская область", "Fergana Region"),
    ("andijon", "Andijon viloyati", "Андижанская область", "Andijan Region"),
    ("namangan", "Namangan viloyati", "Наманганская область", "Namangan Region"),
    ("qoraqalpogiston", "Qoraqalpog'iston Respublikasi", "Республика Каракалпакстан", "Republic of Karakalpakstan"),
]

MONUMENTS = [
    # slug, region, kind, uz, ru, en, city, period, century, lat, lng
    ("registan", "samarqand", "ensemble", "Registon majmuasi", "Ансамбль Регистан", "Registan Ensemble", "Samarqand", "XV–XVII asrlar", 15, 39.654722, 66.975833),
    ("gur-e-amir", "samarqand", "mausoleum", "Go'ri Amir maqbarasi", "Мавзолей Гур-Эмир", "Gur-e-Amir Mausoleum", "Samarqand", "XV asr boshi", 15, 39.648472, 66.969000),
    ("bibi-khanym", "samarqand", "mosque", "Bibixonim jome masjidi", "Мечеть Биби-Ханым", "Bibi-Khanym Mosque", "Samarqand", "1399–1404", 14, 39.660833, 66.979333),
    ("shah-i-zinda", "samarqand", "ensemble", "Shohi Zinda majmuasi", "Ансамбль Шахи-Зинда", "Shah-i-Zinda Necropolis", "Samarqand", "XI–XIX asrlar", 14, 39.663056, 66.987778),
    ("kalyan-minaret", "buxoro", "minaret", "Minorai Kalon", "Минарет Калян", "Kalyan Minaret", "Buxoro", "XII asr", 12, 39.775833, 64.414722),
    ("samanid-mausoleum", "buxoro", "mausoleum", "Somoniylar maqbarasi", "Мавзолей Саманидов", "Samanid Mausoleum", "Buxoro", "IX–X asrlar", 10, 39.776667, 64.399444),
    ("kalta-minor", "xorazm", "minaret", "Kalta minor", "Минарет Кальта-Минар", "Kalta Minor Minaret", "Xiva", "XIX asr", 19, 41.378611, 60.359000),
    ("ak-saray", "qashqadaryo", "palace", "Oqsaroy", "Дворец Ак-Сарай", "Ak-Saray Palace", "Shahrisabz", "XIV–XV asrlar", 14, 39.059000, 66.830900),
    ("hazrati-imam", "toshkent-shahri", "ensemble", "Hazrati Imom majmuasi", "Комплекс Хазрати Имам", "Hazrati Imam Complex", "Toshkent", "XVI asr va keyin", 16, 41.338300, 69.240500),
]

DEMO_NOTE = {
    "uz": "Bu namunaviy (DEMO) yozuv: saytni sinash uchun qo'shilgan. Bitikning aniq joyi, matni, tarjimasi va ilmiy izohini mutaxassis admin panel orqali tekshirib kiritadi.",
    "ru": "Это демонстрационная запись для проверки сайта. Точное место, текст, перевод и научный комментарий вносит специалист через админ-панель.",
    "en": "This is a DEMO record for testing the site. A specialist enters the verified location, text, translation and commentary via the admin panel.",
}

BASMALA = {
    "original_text": "بسم الله الرحمن الرحيم",
    "transliteration": "Bismi-llāhi-r-raḥmāni-r-raḥīm",
    "translation_uz": "Mehribon va rahmli Alloh nomi bilan",
    "translation_ru": "Во имя Аллаха, Милостивого, Милосердного",
    "translation_en": "In the name of God, the Most Gracious, the Most Merciful",
    "language": "arabic",
}
SHAHADA = {
    "original_text": "لا إله إلا الله محمد رسول الله",
    "transliteration": "Lā ilāha illā-llāh, Muḥammadun rasūlu-llāh",
    "translation_uz": "Allohdan o'zga iloh yo'q, Muhammad Allohning elchisidir",
    "translation_ru": "Нет божества, кроме Аллаха, Мухаммад — посланник Аллаха",
    "translation_en": "There is no god but God; Muhammad is the Messenger of God",
    "language": "arabic",
}
SURAH_55_26 = {
    "original_text": "كُلُّ مَنْ عَلَيْهَا فَانٍ",
    "transliteration": "Kullu man ʿalayhā fān",
    "translation_uz": "Uning (yer) ustidagi barcha narsa foniydir (Rahmon surasi, 26-oyat)",
    "translation_ru": "Всё, что на ней (на земле), — тленно (сура «Милостивый», 55:26)",
    "translation_en": "Everyone upon it (the earth) will perish (Surah ar-Rahman 55:26)",
    "language": "arabic",
}

DEMO_INSCRIPTIONS = [
    ("registan", "Peshtoq bitigi (namuna)", "Надпись на портале (демо)", "Portal inscription (demo)", BASMALA, "thuluth", "mosaic", True),
    ("gur-e-amir", "Gumbaz bo'g'izidagi bitik (namuna)", "Надпись на барабане купола (демо)", "Drum inscription (demo)", SHAHADA, "square_kufic", "bannai", True),
    ("bibi-khanym", "Bannoiy bitik (namuna)", "Надпись в технике баннаи (демо)", "Banna'i inscription (demo)", SHAHADA, "square_kufic", "bannai", False),
    ("shah-i-zinda", "Maqbara kirish bitigi (namuna)", "Надпись у входа в мавзолей (демо)", "Mausoleum entrance inscription (demo)", SURAH_55_26, "thuluth", "majolica", True),
    ("kalyan-minaret", "Minora tanasidagi kufiy bitik (namuna)", "Куфическая надпись на стволе (демо)", "Kufic band on the shaft (demo)", BASMALA, "kufic", "terracotta", False),
    ("kalta-minor", "Koshin bitik (namuna)", "Надпись на изразцах (демо)", "Tile inscription (demo)", BASMALA, "naskh", "majolica", False),
]


class Command(BaseCommand):
    help = "Hududlar, obidalar va demo bitiklarni kiritadi"

    def add_arguments(self, parser):
        parser.add_argument("--no-demo", action="store_true", help="Demo bitiklarsiz")

    def handle(self, *args, **opts):
        regions = {}
        for i, (slug, uz, ru, en) in enumerate(REGIONS):
            regions[slug], _ = Region.objects.update_or_create(
                slug=slug, defaults={"name_uz": uz, "name_ru": ru, "name_en": en, "order": i}
            )
        monuments = {}
        for slug, reg, kind, uz, ru, en, city, period, cent, lat, lng in MONUMENTS:
            monuments[slug], _ = Monument.objects.update_or_create(
                slug=slug,
                defaults=dict(region=regions[reg], kind=kind, name_uz=uz, name_ru=ru, name_en=en,
                              city=city, period=period, century=cent, latitude=lat, longitude=lng),
            )
        self.stdout.write(self.style.SUCCESS(f"{len(regions)} hudud, {len(monuments)} obida tayyor."))

        if opts["no_demo"]:
            return
        n = 0
        for m_slug, t_uz, t_ru, t_en, text, script, tech, featured in DEMO_INSCRIPTIONS:
            if Inscription.objects.filter(monument=monuments[m_slug], title_uz=t_uz).exists():
                continue
            Inscription.objects.create(
                monument=monuments[m_slug], title_uz=t_uz, title_ru=t_ru, title_en=t_en,
                script=script, technique=tech, status=Inscription.Status.PUBLISHED, is_featured=featured,
                commentary_uz=DEMO_NOTE["uz"], commentary_ru=DEMO_NOTE["ru"], commentary_en=DEMO_NOTE["en"],
                period_text=monuments[m_slug].period, **text,
            )
            n += 1
        self.stdout.write(self.style.SUCCESS(f"{n} ta demo bitik qo'shildi (DEMO — tekshirib almashtiring)."))

        # Namuna yo'nalishlar
        routes = [
            ("samarqand-temuriylar", "samarqand", "Samarqand: Temuriylar davri bitiklari",
             "Самарканд: надписи эпохи Тимуридов", "Samarkand: Timurid-era inscriptions", "4–5 soat",
             ["gur-e-amir", "registan", "bibi-khanym", "shah-i-zinda"]),
            ("buxoro-kufiy", "buxoro", "Buxoro: kufiy va bannoiy bitiklar",
             "Бухара: куфические надписи", "Bukhara: Kufic inscriptions", "3 soat",
             ["samanid-mausoleum", "kalyan-minaret"]),
        ]
        for slug, reg, uz, ru, en, dur, stops in routes:
            route, created = Route.objects.get_or_create(
                slug=slug, defaults=dict(title_uz=uz, title_ru=ru, title_en=en, region=regions[reg], duration=dur,
                                         description_uz="Namuna yo'nalish (DEMO). Admin panelda tahrirlang."))
            if created:
                for k, m_slug in enumerate(stops):
                    RouteStop.objects.create(route=route, monument=monuments[m_slug], order=k)
        self.stdout.write(self.style.SUCCESS("Namuna yo'nalishlar tayyor."))
