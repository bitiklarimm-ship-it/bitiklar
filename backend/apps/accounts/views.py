from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response

from .models import User
from .serializers import RegisterSerializer, UserSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class IsEditorUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_editor)


@api_view(["POST"])
@permission_classes([IsEditorUser])
def verify_researcher(request, pk):
    """Muharrir tadqiqotchini tasdiqlaydi (yoki ?action=decline bilan o'quvchi qilib qoldiradi)."""
    user = get_object_or_404(User, pk=pk)
    if request.data.get("action") == "decline":
        user.role = User.Role.READER
        user.is_verified = False
    else:
        user.role = User.Role.RESEARCHER
        user.is_verified = True
    user.save(update_fields=["role", "is_verified"])
    return Response({"id": user.id, "role": user.role, "is_verified": user.is_verified})
