"""AI provayderlari uchun yagona kirish nuqtasi: Anthropic (Claude) yoki OpenAI.

Sozlamalar (Render → Environment):
    AI_PROVIDER = anthropic | openai        (bo'sh bo'lsa: qaysi kalit berilgan bo'lsa, o'sha)
    ANTHROPIC_API_KEY, AI_MODEL             — Anthropic uchun
    OPENAI_API_KEY, OPENAI_MODEL            — OpenAI uchun (model rasm o'qiy olishi kerak)
"""
from django.conf import settings


class AIUnavailable(Exception):
    pass


def provider():
    p = (settings.AI_PROVIDER or "").lower()
    if p in ("anthropic", "openai"):
        return p
    if settings.ANTHROPIC_API_KEY:
        return "anthropic"
    if settings.OPENAI_API_KEY:
        return "openai"
    return ""


def chat(messages, system=None, max_tokens=1000, image_b64=None):
    """messages: [{"role": "user"|"assistant", "content": str}, ...] — oxirgisi "user".
    image_b64: JPEG (base64) — oxirgi foydalanuvchi xabariga biriktiriladi. Javob matnini qaytaradi."""
    p = provider()
    if p == "anthropic":
        return _anthropic(messages, system, max_tokens, image_b64)
    if p == "openai":
        return _openai(messages, system, max_tokens, image_b64)
    raise AIUnavailable("AI hozircha yoqilmagan (OPENAI_API_KEY yoki ANTHROPIC_API_KEY sozlanmagan)")


def _anthropic(messages, system, max_tokens, image_b64):
    if not settings.ANTHROPIC_API_KEY:
        raise AIUnavailable("ANTHROPIC_API_KEY sozlanmagan")
    import anthropic

    msgs = [dict(m) for m in messages]
    if image_b64:
        last = msgs[-1]
        last["content"] = [
            {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": image_b64}},
            {"type": "text", "text": last["content"]},
        ]
    kwargs = {"model": settings.AI_MODEL, "max_tokens": max_tokens, "messages": msgs}
    if system:
        kwargs["system"] = system
    msg = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY).messages.create(**kwargs)
    return "".join(b.text for b in msg.content if getattr(b, "type", "") == "text").strip()


def _openai(messages, system, max_tokens, image_b64):
    if not settings.OPENAI_API_KEY:
        raise AIUnavailable("OPENAI_API_KEY sozlanmagan")
    from openai import OpenAI

    msgs = []
    if system:
        msgs.append({"role": "system", "content": system})
    msgs += [dict(m) for m in messages]
    if image_b64:
        last = msgs[-1]
        last["content"] = [
            {"type": "text", "text": last["content"]},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}", "detail": "high"}},
        ]
    client = OpenAI(api_key=settings.OPENAI_API_KEY, base_url=settings.OPENAI_BASE_URL or None)
    res = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=msgs,
        max_completion_tokens=max_tokens,
    )
    return (res.choices[0].message.content or "").strip()
