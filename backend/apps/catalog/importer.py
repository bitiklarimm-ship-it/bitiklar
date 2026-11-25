"""Excel (.xlsx) yoki CSV fayldan bitiklarni ommaviy kiritish.

Har bir qator — bitta bitik. Obida slug yoki o'zbekcha nomi bilan topiladi; topilmasa va koordinatalari
berilgan bo'lsa, yangi obida yaratiladi. "Sinov rejimi"da hech narsa saqlanmaydi — faqat hisobot chiqadi.
"""
import csv
import io

from django.db import transaction

from .models import Inscription, Monument, Region, Source

COLUMNS = [
    ("monument", "Obida (slug yoki o'zbekcha nomi)", True),
    ("monument_city", "Obida shahri (yangi obida uchun)", False),
    ("monument_region", "Hudud slug'i (yangi obida uchun): samarqand, buxoro…", False),
    ("monument_kind", "Obida turi: mosque, madrasa, mausoleum, minaret…", False),
    ("monument_lat", "Obida kengligi (yangi obida uchun)", False),
    ("monument_lng", "Obida uzunligi (yangi obida uchun)", False),
    ("title_uz", "Sarlavha (UZ)", True),
    ("title_ru", "Sarlavha (RU)", False),
    ("title_en", "Sarlavha (EN)", False),
    ("placement_uz", "Joylashuvi (UZ): peshtoq, gumbaz bo'g'izi…", False),
    ("language", "Tili: arabic, persian, turkic, other", True),
    ("script", "Yozuv uslubi: kufic, square_kufic, naskh, thuluth, nastaliq…", False),
    ("technique", "Texnika: bannai, mosaic, majolica, terracotta, stone…", False),
    ("original_text", "Asl matn", True),
    ("transliteration", "Transliteratsiya", False),
    ("translation_uz", "Tarjima (UZ)", False),
    ("translation_ru", "Tarjima (RU)", False),
    ("translation_en", "Tarjima (EN)", False),
    ("commentary_uz", "Izoh (UZ)", False),
    ("period_text", "Davri (matn)", False),
    ("year_from", "Yildan", False),
    ("year_to", "Yilgacha", False),
    ("hijri_date", "Hijriy sana", False),
    ("dynasty", "Sulola: samanid, karakhanid, timurid, shaybanid…", False),
    ("calligrapher", "Xattot / usta", False),
    ("quran_refs", "Qur'on oyatlari: 2:255; 55:26-27", False),
    ("latitude", "Bitikning aniq kengligi", False),
    ("longitude", "Bitikning aniq uzunligi", False),
    ("sources", "Manbalar (bir nechta bo'lsa | bilan ajrating)", False),
    ("status", "Holati: draft, pending, published", False),
]
KEYS = [c[0] for c in COLUMNS]


def _choice(value, choices, default):
    """Qiymat kalit (thuluth) yoki nomi (Suls) bo'lishi mumkin."""
    v = (value or "").strip()
    if not v:
        return default
    low = v.lower()
    for key, label in choices:
        if low == str(key).lower() or low == str(label).lower():
            return key
    raise ValueError(f"noma'lum qiymat: «{v}»")


def _int(v):
    v = str(v or "").strip()
    return int(float(v)) if v else None


def _dec(v):
    v = str(v or "").strip().replace(",", ".")
    return round(float(v), 6) if v else None


def read_rows(uploaded):
    name = uploaded.name.lower()
    if name.endswith(".csv"):
        text = uploaded.read().decode("utf-8-sig")
        sample = text[:2000]
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t") if sample else csv.excel
        return list(csv.DictReader(io.StringIO(text), dialect=dialect))
    from openpyxl import load_workbook

    wb = load_workbook(uploaded, read_only=True, data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    if not rows:
        return []
    header = [str(h or "").strip() for h in rows[0]]
    out = []
    for r in rows[1:]:
        if not any(c not in (None, "") for c in r):
            continue
        out.append({header[i]: ("" if c is None else str(c)) for i, c in enumerate(r) if i < len(header) and header[i]})
    return out


def find_monument(row):
    ref = (row.get("monument") or "").strip()
    m = Monument.objects.filter(slug=ref).first() or Monument.objects.filter(name_uz__iexact=ref).first()
    if m:
        return m, False
    lat, lng = _dec(row.get("monument_lat")), _dec(row.get("monument_lng"))
    region = Region.objects.filter(slug=(row.get("monument_region") or "").strip()).first()
    if lat is None or lng is None or not region:
        raise ValueError(f"obida «{ref}» topilmadi (yangi obida uchun monument_region, monument_lat, monument_lng kerak)")
    m = Monument.objects.create(
        name_uz=ref, region=region, city=(row.get("monument_city") or "").strip(),
        kind=_choice(row.get("monument_kind"), Monument.Kind.choices, Monument.Kind.OTHER),
        latitude=lat, longitude=lng,
    )
    return m, True


def import_rows(rows, user, dry_run=True, update_existing=False):
    """Hisobot: [{"row": 2, "result": "created|updated|skipped|error", "message": "..."}]"""
    report = []
    with transaction.atomic():
        for n, raw in enumerate(rows, start=2):  # 1-qator — sarlavhalar
            row = {k: (raw.get(k) or "").strip() if isinstance(raw.get(k), str) else raw.get(k) for k in KEYS}
            try:
                with transaction.atomic():
                    for key, _, required in COLUMNS:
                        if required and not row.get(key):
                            raise ValueError(f"«{key}» ustuni bo'sh")
                    monument, new_mon = find_monument(row)
                    data = dict(
                        title_ru=row["title_ru"] or "", title_en=row["title_en"] or "",
                        placement_uz=row["placement_uz"] or "",
                        language=_choice(row["language"], Inscription.Language.choices, Inscription.Language.OTHER),
                        script=_choice(row["script"], Inscription.Script.choices, Inscription.Script.OTHER),
                        technique=_choice(row["technique"], Inscription.Technique.choices, Inscription.Technique.OTHER),
                        original_text=row["original_text"], transliteration=row["transliteration"] or "",
                        translation_uz=row["translation_uz"] or "", translation_ru=row["translation_ru"] or "",
                        translation_en=row["translation_en"] or "", commentary_uz=row["commentary_uz"] or "",
                        period_text=row["period_text"] or "", year_from=_int(row["year_from"]), year_to=_int(row["year_to"]),
                        hijri_date=row["hijri_date"] or "",
                        dynasty=_choice(row["dynasty"], Inscription.Dynasty.choices, ""),
                        calligrapher=row["calligrapher"] or "", quran_refs=row["quran_refs"] or "",
                        latitude=_dec(row["latitude"]), longitude=_dec(row["longitude"]),
                        status=_choice(row["status"], Inscription.Status.choices, Inscription.Status.DRAFT),
                    )
                    existing = Inscription.objects.filter(monument=monument, title_uz__iexact=row["title_uz"]).first()
                    if existing and not update_existing:
                        report.append({"row": n, "result": "skipped", "message": f"allaqachon bor: {existing}"})
                        continue
                    if existing:
                        for k, v in data.items():
                            if v not in ("", None):
                                setattr(existing, k, v)
                        existing.save()
                        ins, result = existing, "updated"
                    else:
                        ins = Inscription.objects.create(monument=monument, title_uz=row["title_uz"], submitted_by=user, **data)
                        result = "created"
                    if row["sources"]:
                        if existing:
                            ins.sources.all().delete()
                        for c in str(row["sources"]).split("|"):
                            if c.strip():
                                Source.objects.create(inscription=ins, citation=c.strip())
                    msg = f"{ins.title_uz} — {monument.name_uz}" + (" (yangi obida)" if new_mon else "")
                    report.append({"row": n, "result": result, "message": msg})
            except Exception as e:  # noqa: BLE001
                report.append({"row": n, "result": "error", "message": str(e)})
        if dry_run:
            transaction.set_rollback(True)
    return report


def template_xlsx():
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill

    wb = Workbook()
    ws = wb.active
    ws.title = "Bitiklar"
    ws.append(KEYS)
    ws.append([
        "registan", "", "", "", "", "", "Peshtoq bitigi", "Надпись на портале", "Portal inscription", "peshtoq ravog'i",
        "arabic", "thuluth", "mosaic", "بسم الله الرحمن الرحيم", "bismillāh al-raḥmān al-raḥīm",
        "Mehribon va rahmli Alloh nomi bilan", "Во имя Аллаха, Милостивого, Милосердного",
        "In the name of God, the Most Gracious, the Most Merciful", "", "XV asr", "1417", "1420", "", "timurid", "",
        "1:1", "", "", "Masson M.E. Registan. 1958, 45-b.", "draft",
    ])
    head = PatternFill("solid", fgColor="1E3A7B")
    for i, (key, _, req) in enumerate(COLUMNS, start=1):
        c = ws.cell(row=1, column=i)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = head if req else PatternFill("solid", fgColor="0F8B8D")
        ws.column_dimensions[c.column_letter].width = 22
    ws.freeze_panes = "A2"

    help_ws = wb.create_sheet("Yo'riqnoma")
    help_ws.append(["Ustun", "Tavsif", "Majburiy"])
    for key, desc, req in COLUMNS:
        help_ws.append([key, desc, "ha" if req else ""])
    help_ws.append([])
    help_ws.append(["Tillar", ", ".join(k for k, _ in Inscription.Language.choices)])
    help_ws.append(["Yozuv uslublari", ", ".join(k for k, _ in Inscription.Script.choices)])
    help_ws.append(["Texnikalar", ", ".join(k for k, _ in Inscription.Technique.choices)])
    help_ws.append(["Sulolalar", ", ".join(k for k, _ in Inscription.Dynasty.choices if k)])
    help_ws.append(["Obida turlari", ", ".join(k for k, _ in Monument.Kind.choices)])
    help_ws.append(["Hududlar", ", ".join(Region.objects.values_list("slug", flat=True))])
    help_ws.append(["Mavjud obidalar", ", ".join(Monument.objects.values_list("slug", flat=True)[:300])])
    for col, w in (("A", 22), ("B", 90), ("C", 10)):
        help_ws.column_dimensions[col].width = w
    for row in help_ws.iter_rows():
        for c in row:
            c.alignment = Alignment(wrap_text=True, vertical="top")
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()
