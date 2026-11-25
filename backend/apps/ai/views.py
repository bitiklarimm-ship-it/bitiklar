from django.shortcuts import get_object_or_404
from rest_framework import permissions, status
from rest_framework.decorators import api_view, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle

from apps.catalog.models import Inscription

from . import guide
from .service import AIUnavailable, analyze_image


class CanSubmit(permissions.BasePermission):
    message = "AI tahlil faqat tasdiqlangan tadqiqotchilar uchun."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.can_submit)


class AIThrottle(UserRateThrottle):
    """Har bir foydalanuvchiga soatiga cheklangan AI so'rov (settings: 'ai')."""

    scope = "ai"


class PublicAIThrottle(AnonRateThrottle):
    """Mehmonlar uchun (IP bo'yicha) — AI xarajatini cheklash."""

    scope = "ai_public"

    def get_cache_key(self, request, view):  # ro'yxatdan o'tganlar ham shu limitda
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class IdentifyThrottle(PublicAIThrottle):
    scope = "ai_identify"


class TranslateThrottle(PublicAIThrottle):
    scope = "ai_translate"


def _ai_error(e):
    if isinstance(e, AIUnavailable):
        return Response({"detail": str(e), "code": "ai_off"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    if isinstance(e, ValueError):
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    return Response({"detail": f"AI xizmati xatosi: {e}"}, status=status.HTTP_502_BAD_GATEWAY)


@api_view(["POST"])
@permission_classes([CanSubmit])
@parser_classes([MultiPartParser, FormParser])
@throttle_classes([AIThrottle])
def analyze(request):
    f = request.FILES.get("image")
    if not f:
        return Response({"detail": "image maydoni talab qilinadi"}, status=status.HTTP_400_BAD_REQUEST)
    if f.size > 20 * 1024 * 1024:
        return Response({"detail": "Rasm 20 MB dan oshmasin"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        result = analyze_image(f, f.content_type, request.data.get("hint", ""))
    except Exception as e:  # noqa: BLE001
        return _ai_error(e)
    return Response(result)


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@parser_classes([JSONParser])
@throttle_classes([PublicAIThrottle])
def explain(request):
    """{slug, mode: simple|kids|scholar|qa, lang, question?, history?} → {answer}"""
    d = request.data
    ins = get_object_or_404(
        Inscription.objects.select_related("monument").prefetch_related("sources"),
        slug=d.get("slug", ""), status=Inscription.Status.PUBLISHED,
    )
    mode = d.get("mode", "simple")
    question = (d.get("question") or "").strip()
    if mode == "qa" and not question:
        return Response({"detail": "Savol yozing"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        answer = guide.explain(ins, mode, d.get("lang", "uz"), question, d.get("history") or [])
    except Exception as e:  # noqa: BLE001
        return _ai_error(e)
    return Response({"answer": answer, "mode": mode})


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@parser_classes([MultiPartParser, FormParser])
@throttle_classes([IdentifyThrottle])
def identify(request):
    """multipart: image, lang, lat?, lng? → {reading, candidates[]}"""
    f = request.FILES.get("image")
    if not f:
        return Response({"detail": "Rasm yuklang"}, status=status.HTTP_400_BAD_REQUEST)
    if f.size > 20 * 1024 * 1024:
        return Response({"detail": "Rasm 20 MB dan oshmasin"}, status=status.HTTP_400_BAD_REQUEST)

    def num(k):
        try:
            return float(request.data.get(k))
        except (TypeError, ValueError):
            return None

    try:
        reading, found = guide.identify(f, request.data.get("lang", "uz"), num("lat"), num("lng"))
    except Exception as e:  # noqa: BLE001
        return _ai_error(e)

    from apps.catalog.serializers import best

    candidates = []
    for score, dist, ins in found:
        imgs = list(ins.images.all())
        candidates.append({
            "slug": ins.slug, "title_uz": ins.title_uz, "title_ru": ins.title_ru, "title_en": ins.title_en,
            "monument_uz": ins.monument.name_uz, "monument_ru": ins.monument.name_ru, "monument_en": ins.monument.name_en,
            "city": ins.monument.city, "language": ins.language, "original_text": ins.original_text[:120],
            "image_url": best(request, imgs[0].image_thumb, imgs[0].image) if imgs else None,
            "score": round(min(score, 1.0), 2), "distance_m": round(dist) if dist is not None else None,
        })
    return Response({"reading": reading, "candidates": candidates})


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def languages(request):
    return Response([{"code": k, "name": v} for k, v in guide.EXTRA_LANGS.items()])


@api_view(["POST"])
@permission_classes([permissions.AllowAny])
@parser_classes([JSONParser])
@throttle_classes([TranslateThrottle])
def translate(request):
    """{slug, target} → {title, translation, lang} — tashrif buyuruvchilar uchun qo'shimcha tillar (AI)."""
    ins = get_object_or_404(Inscription, slug=request.data.get("slug", ""), status=Inscription.Status.PUBLISHED)
    try:
        return Response(guide.translate_for_visitor(ins, request.data.get("target", "")))
    except Exception as e:  # noqa: BLE001
        return _ai_error(e)
