"""API uchun autentifikatsiya.

Sayt va API bitta domenda bo'lgani uchun, admin panelga kirgan foydalanuvchining sessiya cookie'si
saytdagi barcha so'rovlarga ham qo'shilib ketadi. DRF'ning SessionAuthentication'i bunday POST
so'rovlardan CSRF token talab qiladi ("CSRF Failed: CSRF token missing"), sayt esa JWT ishlatadi.

Yechim: sessiya faqat o'qish (GET/HEAD/OPTIONS) so'rovlarida hisobga olinadi — masalan, admin
paneldagi xarita nashr qilinmagan obidalarni ham ko'ra olishi uchun. Yozish so'rovlari faqat JWT bilan.
"""
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import SAFE_METHODS


class ReadOnlySessionAuthentication(SessionAuthentication):
    def authenticate(self, request):
        if request.method not in SAFE_METHODS:
            return None
        return super().authenticate(request)
