from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("username", "get_full_name", "email", "role", "is_verified", "affiliation", "is_staff")
    list_filter = ("role", "is_verified", "is_staff")
    search_fields = ("username", "first_name", "last_name", "email", "affiliation")
    actions = ["verify_researchers"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("BITIKLAR", {"fields": ("role", "is_verified", "affiliation", "academic_degree", "orcid", "bio")}),
    )

    @admin.action(description="Tanlangan tadqiqotchilarni tasdiqlash")
    def verify_researchers(self, request, queryset):
        n = queryset.update(is_verified=True, role=User.Role.RESEARCHER)
        self.message_user(request, f"{n} ta tadqiqotchi tasdiqlandi.")
