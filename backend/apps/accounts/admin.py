from django.contrib import admin, messages
from django.contrib.auth.admin import GroupAdmin as BaseGroupAdmin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import Group
from unfold.admin import ModelAdmin
from unfold.decorators import display
from unfold.forms import AdminPasswordChangeForm, UserChangeForm, UserCreationForm

from .models import User

admin.site.unregister(Group)


@admin.register(Group)
class GroupAdmin(BaseGroupAdmin, ModelAdmin):
    pass


@admin.register(User)
class UserAdmin(BaseUserAdmin, ModelAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    change_password_form = AdminPasswordChangeForm

    list_display = ("user_col", "role_col", "verified_col", "affiliation", "date_joined", "is_staff")
    list_filter = ("role", "is_verified", "is_staff", "is_active")
    list_filter_submit = True
    search_fields = ("username", "first_name", "last_name", "email", "affiliation", "orcid")
    actions = ["verify_researchers", "make_editor"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("BITIKLAR", {"fields": (("role", "is_verified"), "affiliation", ("academic_degree", "orcid"), "bio")}),
    )

    @display(description="Foydalanuvchi", header=True, ordering="username")
    def user_col(self, obj):
        return [obj.get_full_name() or obj.username, obj.email or obj.username]

    @display(description="Rol", ordering="role", label={"O'quvchi": "info", "Tadqiqotchi": "primary", "Muharrir": "success"})
    def role_col(self, obj):
        return obj.get_role_display()

    @display(description="Tasdiqlangan", boolean=True, ordering="is_verified")
    def verified_col(self, obj):
        return obj.is_verified

    @admin.action(description="Tanlangan tadqiqotchilarni tasdiqlash")
    def verify_researchers(self, request, queryset):
        n = 0
        for u in queryset.filter(is_verified=False):
            u.is_verified, u.role = True, User.Role.RESEARCHER
            u.save(update_fields=["is_verified", "role"])  # signal orqali email yuboriladi
            n += 1
        self.message_user(request, f"{n} ta tadqiqotchi tasdiqlandi.", messages.SUCCESS)

    @admin.action(description="Muharrir qilish")
    def make_editor(self, request, queryset):
        n = queryset.update(role=User.Role.EDITOR, is_verified=True)
        self.message_user(request, f"{n} ta foydalanuvchi muharrir qilindi.", messages.SUCCESS)
