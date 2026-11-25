from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """BITIKLAR foydalanuvchisi.

    - reader: o'quvchi (faqat o'qiydi, ro'yxatdan o'tishi shart emas)
    - researcher: tadqiqotchi — admin tasdiqlagach yangi bitik/tuzatish taklif qila oladi
    - editor: muharrir — takliflarni ko'rib chiqadi va nashr qiladi
    """

    class Role(models.TextChoices):
        READER = "reader", "O'quvchi"
        RESEARCHER = "researcher", "Tadqiqotchi"
        EDITOR = "editor", "Muharrir"

    role = models.CharField("Rol", max_length=20, choices=Role.choices, default=Role.READER)
    is_verified = models.BooleanField(
        "Tasdiqlangan tadqiqotchi",
        default=False,
        help_text="Admin tadqiqotchini tasdiqlagach, u bitik taklif qila oladi.",
    )
    affiliation = models.CharField("Ilmiy muassasa", max_length=255, blank=True)
    academic_degree = models.CharField("Ilmiy daraja", max_length=100, blank=True)
    orcid = models.CharField("ORCID", max_length=32, blank=True)
    bio = models.TextField("Qisqacha ma'lumot", blank=True)

    class Meta:
        verbose_name = "Foydalanuvchi"
        verbose_name_plural = "Foydalanuvchilar"

    @property
    def is_editor(self):
        return self.is_staff or self.role == self.Role.EDITOR

    @property
    def can_submit(self):
        return self.is_editor or (self.role == self.Role.RESEARCHER and self.is_verified)

    def __str__(self):
        full = self.get_full_name()
        return full or self.username
