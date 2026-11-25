"""Tashrif buyuruvchilar uchun AI rejimlari.

1. explain  — bitikni tanlangan uslubda tushuntirish (oddiy tilda / bolalar uchun / ilmiy / savol-javob).
   Javob faqat bazadagi ma'lumotga (asl matn, tarjima, izoh, manbalar) tayanadi.
2. identify — tashrif buyuruvchi obidadagi yozuvni suratga oladi, AI uni o'qiydi va katalogdan
   mos bitiklarni (yaqin atrofdagilarni ustun qo'yib) topadi.
"""
import base64
import json
import math
import re
from io import BytesIO

from django.conf import settings
from django.core.cache import cache

from apps.catalog.models import Inscription
from apps.catalog.textnorm import normalize

from .service import AIUnavailable

LANG_NAMES = {"uz": "Uzbek (Latin script)", "ru": "Russian", "en": "English"}

MODES = {
    "simple": (
        "Explain this inscription to an ordinary visitor standing in front of the monument, in plain everyday language. "
        "Say what it says, why it was placed here and what it meant to people then. 120-180 words. No jargon."
    ),
    "kids": (
        "Explain this inscription to a 9-12 year old child: friendly, vivid, with one simple comparison from everyday life "
        "and one fun question at the end. 90-130 words. Short sentences."
    ),
    "scholar": (
        "Give a concise scholarly analysis: language and script, formula or literary genre, dating evidence, "
        "calligraphic and architectural context, and points that remain uncertain or need verification. "
        "Refer to the listed sources where relevant. 200-280 words. Use short headed paragraphs."
    ),
    "qa": (
        "Answer the visitor's question directly and briefly (under 150 words)."
    ),
}

SYSTEM = """You are the AI guide of BITIKLAR, a scholarly catalogue of inscriptions on historic monuments of Uzbekistan.
Rules:
- Base your answer on the CATALOGUE DATA below. You may add widely accepted general historical context, but clearly
  separate it ("Umumiy ma'lumot:" / "В целом:" / "In general:") and never invent specific facts (dates, names,
  readings, donors) that the data does not contain.
- If the data does not answer the question, say so honestly and suggest what an expert or the sources could clarify.
- Quranic and religious text: quote respectfully and accurately as given in the data; do not re-translate it differently.
- Write ONLY in {lang}. No markdown tables. Plain paragraphs; you may use short bold-free headings ending with a colon."""


def _client():
    if not settings.ANTHROPIC_API_KEY:
        raise AIUnavailable("AI hozircha yoqilmagan (ANTHROPIC_API_KEY sozlanmagan)")
    import anthropic

    return anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def _text(msg):
    return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()


def catalogue_data(ins):
    m = ins.monument
    src = "\n".join(f"- {s.citation}{', ' + s.pages if s.pages else ''}" for s in ins.sources.all()) or "- (none listed)"
    return f"""CATALOGUE DATA
Title: {ins.title_uz} / {ins.title_ru} / {ins.title_en}
Monument: {m.name_uz} ({m.get_kind_display()}), {m.city}; built: {m.period}
Placement on the building: {ins.placement_uz or ins.placement_en or '-'}
Language: {ins.get_language_display()}; script: {ins.get_script_display()}; technique: {ins.get_technique_display()}
Date: {ins.period_text or '-'} {f'({ins.year_from}–{ins.year_to})' if ins.year_from else ''} {f'Hijri {ins.hijri_date}' if ins.hijri_date else ''}
Calligrapher / master: {ins.calligrapher or 'unknown'}
Original text: {ins.original_text}
Transliteration: {ins.transliteration or '-'}
Translation (uz): {ins.translation_uz or '-'}
Translation (ru): {ins.translation_ru or '-'}
Translation (en): {ins.translation_en or '-'}
Commentary (uz): {ins.commentary_uz or '-'}
Commentary (en): {ins.commentary_en or '-'}
Sources:
{src}"""


def explain(ins, mode, lang, question="", history=None):
    lang = lang if lang in LANG_NAMES else "uz"
    mode = mode if mode in MODES else "simple"
    cache_key = None
    if mode != "qa":
        cache_key = f"ai:explain:{ins.pk}:{ins.updated_at.timestamp():.0f}:{mode}:{lang}"
        hit = cache.get(cache_key)
        if hit:
            return hit

    # Oldingi savol-javoblar (qisqa xotira). Rollar navbatma-navbat bo'lishi va "user" bilan boshlanib,
    # "assistant" bilan tugashi kerak — yangi savol oxiriga qo'shiladi.
    messages = []
    for turn in (history or [])[-6:] if mode == "qa" else []:
        role, content = turn.get("role"), str(turn.get("content") or "")[:2000]
        if role not in ("user", "assistant") or not content:
            continue
        if not messages and role != "user":
            continue
        if messages and messages[-1]["role"] == role:
            messages[-1]["content"] += "\n" + content
        else:
            messages.append({"role": role, "content": content})
    if messages and messages[-1]["role"] == "user":
        messages.pop()
    task = MODES[mode] + (f"\n\nVisitor's question: {question[:600]}" if mode == "qa" and question else "")
    data = catalogue_data(ins)
    if messages:  # ma'lumotni birinchi xabarga qo'yamiz, oxirgisida faqat yangi savol
        messages[0]["content"] = f"{data}\n\n{messages[0]['content']}"
        messages.append({"role": "user", "content": f"TASK: {task}"})
    else:
        messages.append({"role": "user", "content": f"{data}\n\nTASK: {task}"})

    msg = _client().messages.create(
        model=settings.AI_MODEL,
        max_tokens=900,
        system=SYSTEM.format(lang=LANG_NAMES[lang]),
        messages=messages,
    )
    answer = _text(msg)
    if cache_key:
        cache.set(cache_key, answer, 60 * 60 * 24 * 7)
    return answer


# ---------------------------------------------------------------- rasmdan aniqlash

IDENTIFY_PROMPT = """A visitor photographed an inscription (or part of a building) at a historic monument in Uzbekistan.
Read what is visible and return ONLY JSON:
{
  "is_inscription": true/false,
  "text": "legible text in the original script (Arabic/Persian/Chagatai...), [...] for illegible parts",
  "language": "arabic" | "persian" | "turkic" | "other",
  "script": "kufic" | "square_kufic" | "naskh" | "thuluth" | "muhaqqaq" | "nastaliq" | "other",
  "keywords": ["3-8 distinctive words or names from the text, in original script"],
  "known_formula": "e.g. Basmala, Shahada, Ayat al-Kursi, Quran 55:26 — or null",
  "monument_guess": "monument name if recognisable from architecture/tiles, else null",
  "summary_{lang}": "1-2 sentences in {lang_name}: what this is and what it says",
  "confidence": 0.0-1.0
}
Be honest about uncertainty. Do not guess text you cannot see."""


def to_jpeg_b64(fileobj, max_side=1600):
    """Har qanday rasmni (HEIC ham) AI uchun JPEG'ga aylantiradi va kichraytiradi."""
    from PIL import Image

    from apps.catalog.imaging import _open

    img = _open(fileobj)
    img.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    if img.mode != "RGB":
        img = img.convert("RGB")
    buf = BytesIO()
    img.save(buf, "JPEG", quality=88)
    return base64.standard_b64encode(buf.getvalue()).decode()


def _distance(lat1, lng1, lat2, lng2):
    r = 6371000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = math.sin((p2 - p1) / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(math.radians(lng2 - lng1) / 2) ** 2
    return 2 * r * math.asin(min(1, math.sqrt(a)))


def identify(fileobj, lang="uz", lat=None, lng=None):
    lang = lang if lang in LANG_NAMES else "uz"
    data = to_jpeg_b64(fileobj)
    msg = _client().messages.create(
        model=settings.AI_MODEL,
        max_tokens=1200,
        messages=[{"role": "user", "content": [
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": data}},
            {"type": "text", "text": IDENTIFY_PROMPT.replace("{lang}", lang).replace("{lang_name}", LANG_NAMES[lang])},
        ]}],
    )
    raw = _text(msg)
    m = re.search(r"\{.*\}", raw, re.S)
    try:
        reading = json.loads(m.group(0)) if m else {}
    except json.JSONDecodeError:
        reading = {}
    reading["summary"] = reading.pop(f"summary_{lang}", "") or reading.get("summary", "")

    # Katalogdan mos bitiklarni izlash: o'qilgan matn so'zlari + kalit so'zlar + joylashuv
    words = set()
    for chunk in [reading.get("text") or ""] + list(reading.get("keywords") or []) + [reading.get("known_formula") or ""]:
        for w in normalize(chunk).split():
            if len(w) >= 3 and "[" not in w:
                words.add(w)
    mon_guess = normalize(reading.get("monument_guess") or "")

    qs = (Inscription.objects.filter(status=Inscription.Status.PUBLISHED)
          .select_related("monument").prefetch_related("images"))
    scored = []
    for ins in qs:
        text = ins.search_text or ""
        overlap = sum(1 for w in words if w in text)
        score = overlap / max(len(words), 1)
        if reading.get("language") and reading.get("language") == ins.language:
            score += 0.1
        if mon_guess and any(part in normalize(ins.monument.name_uz + " " + ins.monument.name_en) for part in mon_guess.split() if len(part) > 3):
            score += 0.3
        dist = None
        if lat is not None and lng is not None and ins.lat is not None:
            dist = _distance(lat, lng, float(ins.lat), float(ins.lng))
            score += max(0.0, 0.5 - dist / 4000)  # 2 km ichidagilar ustun
        if score > 0.15:
            scored.append((score, dist, ins))
    scored.sort(key=lambda x: -x[0])
    return reading, scored[:6]


# ---------------------------------------------------------------- tarjima

FILL_FIELDS = (
    "title_uz", "title_ru", "title_en", "placement_uz", "placement_ru", "placement_en",
    "translation_uz", "translation_ru", "translation_en", "commentary_uz", "commentary_ru", "commentary_en",
)

FILL_PROMPT = """You help editors of BITIKLAR, a scholarly catalogue of inscriptions on monuments of Uzbekistan.
Below are the fields of one record; some are empty. Translate the EXISTING content into the EMPTY fields only.
- Suffix _uz = Uzbek in Latin script (modern orthography: o', g', sh, ch), _ru = Russian, _en = English.
- Translate faithfully from the filled fields of the same kind (translation_* from translation_*, etc.).
  For translation_* you may also consult the original text and transliteration, but do not add interpretation.
- Keep names of people, places, surahs and technical terms (thuluth, banna'i, pishtaq) in standard scholarly form.
- If there is nothing to translate from for a field, omit it.
Return ONLY a JSON object with the empty fields you filled, e.g. {"translation_ru": "...", "title_en": "..."}.

ORIGINAL TEXT: {original}
TRANSLITERATION: {translit}

FIELDS:
{fields}"""


def fill_translations(ins):
    """Bo'sh tarjima maydonlarini AI qoralamasi bilan to'ldiradi. To'ldirilgan maydonlar ro'yxatini qaytaradi."""
    empty = [f for f in FILL_FIELDS if not (getattr(ins, f) or "").strip()]
    if not empty:
        return []
    fields = "\n".join(f"{f}: {getattr(ins, f) or '(EMPTY)'}" for f in FILL_FIELDS)
    prompt = FILL_PROMPT.replace("{original}", ins.original_text).replace(
        "{translit}", ins.transliteration or "-").replace("{fields}", fields)
    msg = _client().messages.create(model=settings.AI_MODEL, max_tokens=4000,
                                    messages=[{"role": "user", "content": prompt}])
    m = re.search(r"\{.*\}", _text(msg), re.S)
    try:
        data = json.loads(m.group(0)) if m else {}
    except json.JSONDecodeError:
        data = {}
    filled = []
    for f in empty:
        v = data.get(f)
        if isinstance(v, str) and v.strip():
            setattr(ins, f, v.strip())
            filled.append(f)
    return filled


EXTRA_LANGS = {
    "tr": "Turkish", "az": "Azerbaijani", "kk": "Kazakh", "ky": "Kyrgyz", "tk": "Turkmen", "tg": "Tajik",
    "fa": "Persian", "ar": "Arabic", "de": "German", "fr": "French", "es": "Spanish", "it": "Italian",
    "zh": "Chinese (Simplified)", "ja": "Japanese", "ko": "Korean", "hi": "Hindi",
}


def translate_for_visitor(ins, target):
    """Tashrif buyuruvchi uchun sarlavha va tarjimani boshqa tilga (AI, keshlanadi)."""
    if target not in EXTRA_LANGS:
        raise ValueError("Bu til qo'llab-quvvatlanmaydi")
    key = f"ai:tr:{ins.pk}:{ins.updated_at.timestamp():.0f}:{target}"
    hit = cache.get(key)
    if hit:
        return hit
    src_title = ins.title_en or ins.title_uz
    src = ins.translation_en or ins.translation_uz or ins.translation_ru
    if not src:
        raise ValueError("Bu bitikning tarjimasi hali kiritilmagan")
    prompt = (f"Translate into {EXTRA_LANGS[target]} for museum visitors. Keep proper names in their usual form in that "
              f"language; Qur'anic text should follow a standard, respectful rendering. Return ONLY JSON "
              f'{{"title": "...", "translation": "..."}}.\n\nTITLE: {src_title}\n\nTEXT:\n{src}')
    msg = _client().messages.create(model=settings.AI_MODEL, max_tokens=1500,
                                    messages=[{"role": "user", "content": prompt}])
    m = re.search(r"\{.*\}", _text(msg), re.S)
    try:
        data = json.loads(m.group(0)) if m else {}
    except json.JSONDecodeError:
        data = {}
    out = {"title": str(data.get("title") or ""), "translation": str(data.get("translation") or ""), "lang": target}
    if out["translation"]:
        cache.set(key, out, 60 * 60 * 24 * 30)
    return out
