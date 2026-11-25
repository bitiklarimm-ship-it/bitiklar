"""Bitik rasmini AI (Claude vision) yordamida dastlabki tahlil qilish.

Natija faqat QORALAMA hisoblanadi: uni mutaxassis tekshirmasdan nashr qilinmaydi.
"""
import base64
import json
import re

from django.conf import settings

PROMPT = """You are assisting epigraphers who catalogue inscriptions on historic monuments in Uzbekistan
(mosques, madrasas, mausoleums, minarets). Look at the photo and return ONLY a JSON object:
{
  "language": "arabic" | "persian" | "turkic" | "other",
  "script": "kufic" | "square_kufic" | "naskh" | "thuluth" | "muhaqqaq" | "nastaliq" | "tawqi" | "shikasta" | "sogdian" | "old_uyghur" | "runic" | "other",
  "technique": "bannai" | "mosaic" | "majolica" | "terracotta" | "stone" | "marble" | "wood" | "paint" | "ganch" | "metal" | "other",
  "original_text": "the legible text in its original script; mark illegible parts with [...]",
  "transliteration": "scholarly Latin transliteration",
  "translation_uz": "Uzbek (Latin) translation",
  "translation_ru": "Russian translation",
  "translation_en": "English translation",
  "identified_source": "e.g. Quran surah:ayah, hadith, poem author — or null",
  "confidence": 0.0-1.0,
  "notes": "what is uncertain, damaged or needs expert checking"
}
Be conservative: if you cannot read part of the text, say so rather than guessing."""

ALLOWED_MEDIA = {"image/jpeg", "image/png", "image/webp", "image/gif"}


class AIUnavailable(Exception):
    pass


def analyze_image(file_obj, content_type, hint=""):
    if not settings.ANTHROPIC_API_KEY:
        raise AIUnavailable("ANTHROPIC_API_KEY sozlanmagan")
    if content_type not in ALLOWED_MEDIA:
        raise ValueError("Faqat JPEG, PNG, WEBP yoki GIF rasm qabul qilinadi")

    import anthropic

    data = base64.standard_b64encode(file_obj.read()).decode()
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    text = PROMPT + (f"\n\nContext from the researcher: {hint}" if hint else "")
    msg = client.messages.create(
        model=settings.AI_MODEL,
        max_tokens=2000,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image", "source": {"type": "base64", "media_type": content_type, "data": data}},
                {"type": "text", "text": text},
            ],
        }],
    )
    raw = "".join(b.text for b in msg.content if getattr(b, "type", "") == "text")
    m = re.search(r"\{.*\}", raw, re.S)
    if not m:
        return {"notes": raw, "confidence": 0}
    try:
        result = json.loads(m.group(0))
    except json.JSONDecodeError:
        return {"notes": raw, "confidence": 0}
    result["is_draft"] = True
    return result
