from rest_framework import permissions

from .models import Inscription


class IsEditor(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_editor)


class IsEditorOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_editor)


class InscriptionPermission(permissions.BasePermission):
    """O'qish — hamma uchun; yaratish — tasdiqlangan tadqiqotchi/muharrir;
    tahrirlash — muharrir yoki o'z bitigi (nashr qilinmagan holda) muallifi."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        u = request.user
        return bool(u and u.is_authenticated and u.can_submit)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        u = request.user
        if u.is_editor:
            return True
        if request.method == "DELETE":
            return obj.submitted_by_id == u.id and obj.status == Inscription.Status.DRAFT
        return obj.submitted_by_id == u.id and obj.status != Inscription.Status.PUBLISHED
