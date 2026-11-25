"""BITIKLAR katalogi: hududlar, obidalar, bitiklar, rasmlar, manbalar, takliflar.

Ko'p tilli maydonlar aniq ustunlar sifatida saqlanadi: *_uz, *_ru, *_en.
"""
from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from simple_history.models import HistoricalRecords

from .textnorm import normalize


def unique_slug(instance, value, field="slug", max_length=200):
    base = slugify(value.replace("'", "").replace("ʻ", "").replace("’", ""))[: max_length - 8] or "item"
    slug, n = base, 2
    model = instance.__class__
    while model.objects.filter(**{field: slug}).exclude(pk=instance.pk).exists():
        slug = f"{base}-{n}"
        n += 1
    return slug


class TimeStamped(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Region(models.Model):
    slug = models.SlugField(unique=True)
    name_uz = models.CharField("Nomi (UZ)", max_length=120)
    name_ru = models.CharField("Nomi (RU)", max_length=120, blank=True)
    name_en = models.CharField("Nomi (EN)", max_length=120, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("order", "name_uz")
        verbose_name = "Hudud"
        verbose_name_plural = "Hududlar"

    def __str__(self):
        return self.name_uz


class Monument(TimeStamped):
    class Kind(models.TextChoices):
        MOSQUE = "mosque", "Masjid"
        MADRASA = "madrasa", "Madrasa"
        MAUSOLEUM = "mausoleum", "Maqbara"
        MINARET = "minaret", "Minora"
        ENSEMBLE = "ensemble", "Majmua"
        KHANAQAH = "khanaqah", "Xonaqoh"
        PALACE = "palace", "Saroy"
        CARAVANSERAI = "caravanserai", "Karvonsaroy"
        OBSERVATORY = "observatory", "Rasadxona"
        STONE = "stone", "Tosh bitik / qoya"
        OTHER = "other", "Boshqa"

    slug = models.SlugField(max_length=200, unique=True, blank=True)
    name_uz = models.CharField("Nomi (UZ)", max_length=255)
    name_ru = models.CharField("Nomi (RU)", max_length=255, blank=True)
    name_en = models.CharField("Nomi (EN)", max_length=255, blank=True)
    kind = models.CharField("Turi", max_length=20, choices=Kind.choices, default=Kind.OTHER)
    region = models.ForeignKey(Region, on_delete=models.PROTECT, related_name="monuments", verbose_name="Hudud")
    city = models.CharField("Shahar / tuman", max_length=120, blank=True)
    address = models.CharField("Manzil", max_length=255, blank=True)
    description_uz = models.TextField("Tavsif (UZ)", blank=True)
    description_ru = models.TextField("Tavsif (RU)", blank=True)
    description_en = models.TextField("Tavsif (EN)", blank=True)
    period = models.CharField("Qurilgan davri", max_length=120, blank=True, help_text="Masalan: XV asr, 1417–1420")
    century = models.SmallIntegerField("Asr (raqamda)", null=True, blank=True)
    latitude = models.DecimalField("Kenglik", max_digits=9, decimal_places=6)
    longitude = models.DecimalField("Uzunlik", max_digits=9, decimal_places=6)
    cover_image = models.ImageField("Muqova rasmi", upload_to="monuments/", blank=True,
                                    help_text="Asl sifatda saqlanadi; saytda tez ochilishi uchun nusxalar avtomatik yaratiladi")
    cover_large = models.ImageField(upload_to="monuments/web/", blank=True, editable=False)
    cover_thumb = models.ImageField(upload_to="monuments/web/", blank=True, editable=False)
    is_published = models.BooleanField("Nashr qilingan", default=True)

    history = HistoricalRecords(verbose_name="O'zgarishlar tarixi")

    class Meta:
        ordering = ("name_uz",)
        verbose_name = "Obida"
        verbose_name_plural = "Obidalar"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name_en or self.name_uz)
        from .imaging import attach_variants

        attach_variants(self, "cover_image", "cover_large", "cover_thumb")
        if not self.cover_image:
            self.cover_large = self.cover_thumb = ""
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name_uz


class Person(TimeStamped):
    """Bitiklarga aloqador shaxslar: xattot, usta (me'mor, koshinkor), homiy, hukmdor, muallif (shoir)."""

    class Role(models.TextChoices):
        CALLIGRAPHER = "calligrapher", "Xattot"
        MASTER = "master", "Usta / me'mor"
        PATRON = "patron", "Homiy / bunyodkor"
        RULER = "ruler", "Hukmdor"
        AUTHOR = "author", "Muallif (shoir, olim)"
        OTHER = "other", "Boshqa"

    slug = models.SlugField(max_length=200, unique=True, blank=True)
    name_uz = models.CharField("Ismi (UZ)", max_length=255)
    name_ru = models.CharField("Ismi (RU)", max_length=255, blank=True)
    name_en = models.CharField("Ismi (EN)", max_length=255, blank=True)
    name_original = models.CharField("Asl yozuvda", max_length=255, blank=True, help_text="Arab grafikasida")
    role = models.CharField("Asosiy roli", max_length=20, choices=Role.choices, default=Role.CALLIGRAPHER)
    years = models.CharField("Yashagan yillari", max_length=80, blank=True, help_text="Masalan: 1394–1449")
    year_from = models.SmallIntegerField("Tug'ilgan yil", null=True, blank=True)
    year_to = models.SmallIntegerField("Vafot yili", null=True, blank=True)
    bio_uz = models.TextField("Tarjimai hol (UZ)", blank=True)
    bio_ru = models.TextField("Tarjimai hol (RU)", blank=True)
    bio_en = models.TextField("Tarjimai hol (EN)", blank=True)
    portrait = models.ImageField("Surat / miniatyura", upload_to="persons/", blank=True)

    class Meta:
        ordering = ("name_uz",)
        verbose_name = "Shaxs"
        verbose_name_plural = "Shaxslar"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.name_en or self.name_uz)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name_uz


class Inscription(TimeStamped):
    class Language(models.TextChoices):
        ARABIC = "arabic", "Arabiy"
        PERSIAN = "persian", "Forsiy"
        TURKIC = "turkic", "Eski turkiy (chig'atoy)"
        OTHER = "other", "Boshqa"

    class Script(models.TextChoices):
        KUFIC = "kufic", "Kufiy"
        SQUARE_KUFIC = "square_kufic", "Bannoiy (handasiy) kufiy"
        NASKH = "naskh", "Nasx"
        THULUTH = "thuluth", "Suls"
        MUHAQQAQ = "muhaqqaq", "Muhaqqaq"
        NASTALIQ = "nastaliq", "Nasta'liq"
        TAWQI = "tawqi", "Tavqe'"
        SHIKASTA = "shikasta", "Shikasta"
        SOGDIAN = "sogdian", "So'g'd"
        OLD_UYGHUR = "old_uyghur", "Qadimgi uyg'ur"
        RUNIC = "runic", "Turkiy run (O'rxun-Enasoy)"
        OTHER = "other", "Boshqa / aniqlanmagan"

    class Technique(models.TextChoices):
        BANNAI = "bannai", "Bannoiy g'isht terish"
        MOSAIC = "mosaic", "Koshin mozaika"
        MAJOLICA = "majolica", "Sirlangan koshin (majolika)"
        TERRACOTTA = "terracotta", "O'yma terrakota"
        STONE = "stone", "Toshga o'yma"
        MARBLE = "marble", "Marmar"
        WOOD = "wood", "Yog'och o'ymakorligi"
        PAINT = "paint", "Bo'yoqli naqsh"
        GANCH = "ganch", "Ganch"
        METAL = "metal", "Metall"
        OTHER = "other", "Boshqa"

    class Status(models.TextChoices):
        DRAFT = "draft", "Qoralama"
        PENDING = "pending", "Ko'rib chiqilmoqda"
        PUBLISHED = "published", "Nashr qilingan"
        REJECTED = "rejected", "Rad etilgan"

    class Dynasty(models.TextChoices):
        PRE_ISLAMIC = "pre_islamic", "Islomgacha davr"
        SAMANID = "samanid", "Somoniylar (819–999)"
        KARAKHANID = "karakhanid", "Qoraxoniylar (X–XIII)"
        KHWARAZMSHAH = "khwarazmshah", "Xorazmshohlar (XI–XIII)"
        MONGOL = "mongol", "Mo'g'ullar / Chig'atoy ulusi (XIII–XIV)"
        TIMURID = "timurid", "Temuriylar (1370–1507)"
        SHAYBANID = "shaybanid", "Shayboniylar (1500–1601)"
        ASHTARKHANID = "ashtarkhanid", "Ashtarxoniylar (1601–1756)"
        MANGHIT = "manghit", "Mang'itlar / Buxoro amirligi (1756–1920)"
        KHIVA = "khiva", "Xiva xonligi (1511–1920)"
        KOKAND = "kokand", "Qo'qon xonligi (1709–1876)"
        MODERN = "modern", "XX–XXI asrlar"
        UNKNOWN = "", "Aniqlanmagan"

    slug = models.SlugField(max_length=200, unique=True, blank=True)
    monument = models.ForeignKey(Monument, on_delete=models.CASCADE, related_name="inscriptions", verbose_name="Obida")

    title_uz = models.CharField("Sarlavha (UZ)", max_length=255)
    title_ru = models.CharField("Sarlavha (RU)", max_length=255, blank=True)
    title_en = models.CharField("Sarlavha (EN)", max_length=255, blank=True)
    placement_uz = models.CharField("Joylashuvi (UZ)", max_length=255, blank=True, help_text="Masalan: peshtoq ravog'i, gumbaz bo'g'izi")
    placement_ru = models.CharField("Joylashuvi (RU)", max_length=255, blank=True)
    placement_en = models.CharField("Joylashuvi (EN)", max_length=255, blank=True)

    language = models.CharField("Tili", max_length=20, choices=Language.choices)
    script = models.CharField("Yozuv uslubi", max_length=20, choices=Script.choices, default=Script.OTHER)
    technique = models.CharField("Ijro texnikasi", max_length=20, choices=Technique.choices, default=Technique.OTHER)

    original_text = models.TextField("Asl matn", help_text="Asl yozuvda (arab grafikasi va h.k.)")
    transliteration = models.TextField("Transliteratsiya", blank=True)
    translation_uz = models.TextField("Tarjima (UZ)", blank=True)
    translation_ru = models.TextField("Tarjima (RU)", blank=True)
    translation_en = models.TextField("Tarjima (EN)", blank=True)
    commentary_uz = models.TextField("Tarixiy-ilmiy izoh (UZ)", blank=True)
    commentary_ru = models.TextField("Tarixiy-ilmiy izoh (RU)", blank=True)
    commentary_en = models.TextField("Tarixiy-ilmiy izoh (EN)", blank=True)

    period_text = models.CharField("Davri (matn)", max_length=120, blank=True, help_text="Masalan: 1420-yillar, Temuriylar davri")
    year_from = models.SmallIntegerField("Yildan (milodiy)", null=True, blank=True)
    year_to = models.SmallIntegerField("Yilgacha (milodiy)", null=True, blank=True)
    hijri_date = models.CharField("Hijriy sana", max_length=60, blank=True)
    calligrapher = models.CharField("Xattot / usta", max_length=255, blank=True)
    dynasty = models.CharField("Davr / sulola", max_length=20, choices=Dynasty.choices, blank=True, default="", db_index=True)
    quran_refs = models.CharField("Qur'on oyatlari", max_length=255, blank=True,
                                  help_text="Sura:oyat, nuqta-vergul bilan. Masalan: 2:255; 55:26-27; 112")
    persons = models.ManyToManyField(Person, blank=True, related_name="inscriptions", verbose_name="Aloqador shaxslar")

    latitude = models.DecimalField("Kenglik (aniqroq)", max_digits=9, decimal_places=6, null=True, blank=True,
                                   help_text="Bo'sh bo'lsa, obida koordinatasi ishlatiladi")
    longitude = models.DecimalField("Uzunlik (aniqroq)", max_digits=9, decimal_places=6, null=True, blank=True)

    status = models.CharField("Holati", max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    submitted_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name="submitted_inscriptions", verbose_name="Kiritgan")
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name="reviewed_inscriptions", verbose_name="Ko'rib chiqqan")
    review_note = models.TextField("Muharrir izohi", blank=True)
    published_at = models.DateTimeField("Nashr sanasi", null=True, blank=True)
    views_count = models.PositiveIntegerField("Ko'rishlar", default=0)
    is_featured = models.BooleanField("Bosh sahifada", default=False)

    audio = models.FileField("Audio (qiroat yoki o'qib berish)", upload_to="audio/%Y/%m/", blank=True,
                             help_text="MP3 / M4A / OGG. Obida yonidagi tashrif buyuruvchi uchun")
    audio_caption = models.CharField("Audio izohi", max_length=255, blank=True, help_text="Masalan: qori, tarjimani o'qigan kishi")

    # Qidiruv uchun normallashtirilgan matn (avtomatik to'ldiriladi)
    search_text = models.TextField(editable=False, blank=True, default="")

    history = HistoricalRecords(verbose_name="O'zgarishlar tarixi", excluded_fields=["views_count", "search_text"])

    class Meta:
        ordering = ("-published_at", "-created_at")
        verbose_name = "Bitik"
        verbose_name_plural = "Bitiklar"
        indexes = [models.Index(fields=["language", "script"])]

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, f"{self.monument.name_en or self.monument.name_uz} {self.title_en or self.title_uz}")
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        self.search_text = self.build_search_text()
        super().save(*args, **kwargs)

    SEARCH_FIELDS = (
        "title_uz", "title_ru", "title_en", "placement_uz", "placement_ru", "placement_en",
        "original_text", "transliteration", "translation_uz", "translation_ru", "translation_en",
        "commentary_uz", "commentary_ru", "commentary_en", "period_text", "hijri_date", "calligrapher",
    )

    def build_search_text(self):
        parts = [getattr(self, f) or "" for f in self.SEARCH_FIELDS]
        m = self.monument
        parts += [m.name_uz, m.name_ru, m.name_en, m.city]
        return normalize(" \n".join(parts))

    @property
    def lat(self):
        return self.latitude if self.latitude is not None else self.monument.latitude

    @property
    def lng(self):
        return self.longitude if self.longitude is not None else self.monument.longitude

    def public_url(self, lang="uz"):
        return f"{settings.FRONTEND_URL}/{lang}/bitiklar/{self.slug}"

    def __str__(self):
        return f"{self.monument} — {self.title_uz}"


class InscriptionImage(models.Model):
    inscription = models.ForeignKey(Inscription, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField("Rasm (asl sifatda)", upload_to="inscriptions/%Y/%m/",
                              help_text="JPEG, PNG, WEBP yoki iPhone HEIC. Asl fayl siqilmasdan saqlanadi")
    image_large = models.ImageField(upload_to="inscriptions/web/%Y/%m/", blank=True, editable=False)
    image_thumb = models.ImageField(upload_to="inscriptions/web/%Y/%m/", blank=True, editable=False)
    width = models.PositiveIntegerField(null=True, blank=True, editable=False)
    height = models.PositiveIntegerField(null=True, blank=True, editable=False)
    caption = models.CharField("Izoh", max_length=255, blank=True)
    credit = models.CharField("Muallif / manba", max_length=255, blank=True)
    is_primary = models.BooleanField("Asosiy rasm", default=False)
    order = models.PositiveSmallIntegerField(default=0)
    # Rasm ustidagi belgilar: [{"x": 10.5, "y": 20, "w": 30, "h": 8, "label": "1-qator"}] — foizlarda
    annotations = models.JSONField("Rasm ustidagi belgilar", default=list, blank=True)

    class Meta:
        ordering = ("-is_primary", "order", "id")
        verbose_name = "Rasm"
        verbose_name_plural = "Rasmlar"

    def save(self, *args, **kwargs):
        from .imaging import attach_variants

        attach_variants(self, "image", "image_large", "image_thumb", ("width", "height"))
        super().save(*args, **kwargs)


class Source(models.Model):
    class Kind(models.TextChoices):
        BOOK = "book", "Kitob"
        ARTICLE = "article", "Maqola"
        ARCHIVE = "archive", "Arxiv hujjati"
        MANUSCRIPT = "manuscript", "Qo'lyozma"
        WEB = "web", "Veb-manba"
        FIELD = "field", "Dala tadqiqoti"

    inscription = models.ForeignKey(Inscription, on_delete=models.CASCADE, related_name="sources")
    kind = models.CharField("Turi", max_length=20, choices=Kind.choices, default=Kind.BOOK)
    citation = models.TextField("Bibliografik ma'lumot")
    url = models.URLField("Havola", blank=True)
    pages = models.CharField("Sahifalar", max_length=60, blank=True)

    class Meta:
        verbose_name = "Manba"
        verbose_name_plural = "Manbalar"

    def __str__(self):
        return self.citation[:80]


class Suggestion(TimeStamped):
    """Tadqiqotchining mavjud bitikka tuzatish yoki qo'shimcha taklifi."""

    class Status(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        ACCEPTED = "accepted", "Qabul qilindi"
        REJECTED = "rejected", "Rad etildi"

    FIELD_CHOICES = [
        ("original_text", "Asl matn"),
        ("transliteration", "Transliteratsiya"),
        ("translation_uz", "Tarjima (UZ)"),
        ("translation_ru", "Tarjima (RU)"),
        ("translation_en", "Tarjima (EN)"),
        ("commentary_uz", "Izoh (UZ)"),
        ("commentary_ru", "Izoh (RU)"),
        ("commentary_en", "Izoh (EN)"),
        ("period_text", "Davri"),
        ("calligrapher", "Xattot"),
        ("other", "Boshqa"),
    ]

    inscription = models.ForeignKey(Inscription, on_delete=models.CASCADE, related_name="suggestions")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="suggestions")
    field = models.CharField("Maydon", max_length=40, choices=FIELD_CHOICES)
    proposed_text = models.TextField("Taklif etilgan matn")
    justification = models.TextField("Asoslash / manba", blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    reviewer_note = models.TextField("Muharrir javobi", blank=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = "Taklif"
        verbose_name_plural = "Takliflar"


class Route(TimeStamped):
    """Sayohat / o'rganish yo'nalishi: obidalar ketma-ketligi (masalan, "Buxorodagi kufiy bitiklar")."""

    slug = models.SlugField(max_length=200, unique=True, blank=True)
    title_uz = models.CharField("Nomi (UZ)", max_length=255)
    title_ru = models.CharField("Nomi (RU)", max_length=255, blank=True)
    title_en = models.CharField("Nomi (EN)", max_length=255, blank=True)
    description_uz = models.TextField("Tavsif (UZ)", blank=True)
    description_ru = models.TextField("Tavsif (RU)", blank=True)
    description_en = models.TextField("Tavsif (EN)", blank=True)
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True, blank=True, related_name="routes", verbose_name="Hudud")
    duration = models.CharField("Davomiyligi", max_length=60, blank=True, help_text="Masalan: 3 soat, 1 kun")
    cover_image = models.ImageField("Muqova rasmi", upload_to="routes/", blank=True)
    is_published = models.BooleanField("Nashr qilingan", default=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ("order", "title_uz")
        verbose_name = "Yo'nalish"
        verbose_name_plural = "Yo'nalishlar"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slug(self, self.title_en or self.title_uz)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.title_uz


class RouteStop(models.Model):
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name="stops")
    monument = models.ForeignKey(Monument, on_delete=models.CASCADE, related_name="route_stops", verbose_name="Obida")
    order = models.PositiveSmallIntegerField("Tartib", default=0)
    note_uz = models.CharField("Izoh (UZ)", max_length=255, blank=True, help_text="Nimaga e'tibor berish kerak")
    note_ru = models.CharField("Izoh (RU)", max_length=255, blank=True)
    note_en = models.CharField("Izoh (EN)", max_length=255, blank=True)

    class Meta:
        ordering = ("order", "id")
        verbose_name = "Bekat"
        verbose_name_plural = "Bekatlar"


class Term(models.Model):
    """Atamalar lug'ati: yozuv uslublari, texnikalar, me'moriy qismlar.
    `key` yozuv uslubi yoki texnika qiymatiga teng bo'lsa (masalan "thuluth", "bannai"),
    bitik sahifasida avtomatik izoh sifatida ko'rsatiladi."""

    class Group(models.TextChoices):
        SCRIPT = "script", "Yozuv uslubi"
        TECHNIQUE = "technique", "Ijro texnikasi"
        ARCHITECTURE = "architecture", "Me'moriy qism"
        TEXT = "text", "Matn turi / formula"
        OTHER = "other", "Boshqa"

    key = models.SlugField("Kalit", max_length=60, unique=True)
    group = models.CharField("Guruh", max_length=20, choices=Group.choices, default=Group.OTHER)
    term_uz = models.CharField("Atama (UZ)", max_length=120)
    term_ru = models.CharField("Atama (RU)", max_length=120, blank=True)
    term_en = models.CharField("Atama (EN)", max_length=120, blank=True)
    term_original = models.CharField("Asl shakli", max_length=120, blank=True)
    definition_uz = models.TextField("Izoh (UZ)")
    definition_ru = models.TextField("Izoh (RU)", blank=True)
    definition_en = models.TextField("Izoh (EN)", blank=True)

    class Meta:
        ordering = ("group", "term_uz")
        verbose_name = "Atama"
        verbose_name_plural = "Atamalar lug'ati"

    def __str__(self):
        return self.term_uz


class VisitorPhoto(TimeStamped):
    """Tashrif buyuruvchilar yuborgan rasmlar — muharrir tasdiqlagach bitik galereyasiga qo'shiladi."""

    class Status(models.TextChoices):
        PENDING = "pending", "Kutilmoqda"
        APPROVED = "approved", "Qabul qilindi"
        REJECTED = "rejected", "Rad etildi"

    inscription = models.ForeignKey(Inscription, on_delete=models.CASCADE, null=True, blank=True,
                                    related_name="visitor_photos", verbose_name="Bitik")
    monument = models.ForeignKey(Monument, on_delete=models.CASCADE, null=True, blank=True,
                                 related_name="visitor_photos", verbose_name="Obida")
    image = models.ImageField("Rasm", upload_to="visitor/%Y/%m/")
    author_name = models.CharField("Muallif", max_length=120)
    author_email = models.EmailField("Email", blank=True)
    note = models.TextField("Izoh", blank=True)
    consent = models.BooleanField("CC BY 4.0 litsenziyasiga rozilik", default=False)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        verbose_name = "Tashrifchi rasmi"
        verbose_name_plural = "Tashrifchilar rasmlari"

    def __str__(self):
        return f"{self.author_name} — {self.inscription or self.monument}"
