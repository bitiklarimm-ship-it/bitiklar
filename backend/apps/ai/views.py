from rest_framework import permissions, status
from rest_framework.decorators import api_view, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle

from .service import AIUnavailable, analyze_image


class CanSubmit(permissions.BasePermission):
    message = "AI tahlil faqat tasdiqlangan tadqiqotchilar uchun."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.can_submit)


class AIThrottle(UserRateThrottle):
    """Har bir foydalanuvchiga soatiga cheklangan AI so'rov (settings: 'ai')."""

    scope = "ai"


@api_view(["POST"])
@permission_classes([CanSubmit])
@parser_classes([MultiPartParser, FormParser])
@throttle_classes([AIThrottle])
def analyze(request):
    f = request.FILES.get("image")
    if not f:
        return Response({"detail": "image maydoni talab qilinadi"}, status=status.HTTP_400_BAD_REQUEST)
    if f.size > 8 * 1024 * 1024:
        return Response({"detail": "Rasm 8 MB dan oshmasin"}, status=status.HTTP_400_BAD_REQUEST)
    try:
        result = analyze_image(f, f.content_type, request.data.get("hint", ""))
    except AIUnavailable as e:
        return Response({"detail": str(e)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    except ValueError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:  # API xatosi
        return Response({"detail": f"AI xizmati xatosi: {e}"}, status=status.HTTP_502_BAD_GATEWAY)
    return Response(result)
