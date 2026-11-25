"""Tadqiqotchilarga email orqali xabar berish.

EMAIL_HOST sozlanmagan bo'lsa, xatlar faqat server logiga chiqadi (console backend).
Xat yuborishdagi xato hech qachon asosiy amalni (saqlashni) to'xtatmaydi.
"""
import logging

from django.conf import settings
from django.core.mail import send_mail

log = logging.getLogger(__name__)

SIGNATURE = "\n\n—\nBITIKLAR — tarix toshlarga bitilgan\n{site}"


def notify(user, subject, body):
    if not user or not getattr(user, "email", ""):
        return
    try:
        send_mail(
            f"[BITIKLAR] {subject}",
            body + SIGNATURE.format(site=settings.FRONTEND_URL),
            settings.DEFAULT_FROM_EMAIL,
            [user.email],
            fail_silently=False,
        )
    except Exception:  # noqa: BLE001 — xat yuborilmasa ham ish davom etadi
        log.exception("Xabarnoma yuborilmadi: %s", user.email)


def greet(user):
    return f"Assalomu alaykum, {user.get_full_name() or user.username}!\n\n"


def inscription_status_changed(ins):
    u = ins.submitted_by
    if not u:
        return
    note = f"\n\nMuharrir izohi:\n{ins.review_note}" if ins.review_note else ""
    if ins.status == ins.Status.PUBLISHED:
        notify(u, f"Bitigingiz nashr qilindi: {ins.title_uz}",
               greet(u) + f"Siz yuborgan «{ins.title_uz}» bitigi muharrir tomonidan tasdiqlanib, saytda nashr qilindi.\n"
               f"{ins.public_url('uz')}{note}")
    elif ins.status == ins.Status.REJECTED:
        notify(u, f"Bitigingiz qaytarildi: {ins.title_uz}",
               greet(u) + f"Siz yuborgan «{ins.title_uz}» bitigi hozircha qabul qilinmadi. "
               f"Uni «Tadqiqotchilar» bo'limida tuzatib, qayta yuborishingiz mumkin.{note}\n\n"
               f"{settings.FRONTEND_URL}/uz/tadqiqotchilar")


def suggestion_status_changed(sug):
    u = sug.author
    title = sug.inscription.title_uz
    note = f"\n\nMuharrir javobi:\n{sug.reviewer_note}" if sug.reviewer_note else ""
    if sug.status == sug.Status.ACCEPTED:
        notify(u, f"Taklifingiz qabul qilindi: {title}",
               greet(u) + f"«{title}» bitigi uchun yuborgan tuzatish taklifingiz qabul qilindi. Rahmat!\n"
               f"{sug.inscription.public_url('uz')}{note}")
    elif sug.status == sug.Status.REJECTED:
        notify(u, f"Taklifingiz bo'yicha javob: {title}",
               greet(u) + f"«{title}» bitigi uchun yuborgan taklifingiz hozircha qabul qilinmadi.{note}")


def researcher_verified(user):
    notify(user, "Tadqiqotchi maqomingiz tasdiqlandi",
           greet(user) + "Hisobingiz tadqiqotchi sifatida tasdiqlandi. Endi yangi bitik kiritishingiz, "
           "tuzatish taklif qilishingiz va AI tahlildan foydalanishingiz mumkin.\n\n"
           f"{settings.FRONTEND_URL}/uz/tadqiqotchilar")


def notify_editors_new_submission(ins):
    """Yangi bitik ko'rib chiqishga yuborilganda muharrirlarga xabar."""
    from django.contrib.auth import get_user_model
    from django.db.models import Q

    User = get_user_model()
    emails = list(
        User.objects.filter(Q(is_staff=True) | Q(role="editor"), is_active=True)
        .exclude(email="").values_list("email", flat=True)[:20]
    )
    if not emails:
        return
    try:
        send_mail(
            f"[BITIKLAR] Ko'rib chiqish uchun yangi bitik: {ins.title_uz}",
            f"{ins.submitted_by} «{ins.title_uz}» ({ins.monument}) bitigini yubordi.\n\n"
            f"Admin panel: {settings.FRONTEND_URL}/admin/catalog/inscription/{ins.pk}/change/"
            + SIGNATURE.format(site=settings.FRONTEND_URL),
            settings.DEFAULT_FROM_EMAIL, emails, fail_silently=False,
        )
    except Exception:  # noqa: BLE001
        log.exception("Muharrirlarga xabar yuborilmadi")
