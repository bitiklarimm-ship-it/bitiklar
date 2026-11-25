"""Holat o'zgarishlarini kuzatish: email xabarnoma va qidiruv keshini yangilash."""
from django.core.cache import cache
from django.db.models.signals import post_delete, post_save, pre_save
from django.dispatch import receiver

from . import notifications
from .models import Inscription, InscriptionImage, Monument, Route, Suggestion


def _remember_old(sender, instance, fields):
    if not instance.pk:
        instance._old = {}
        return
    old = sender.objects.filter(pk=instance.pk).values(*fields).first() or {}
    instance._old = old


@receiver(pre_save, sender=Inscription)
def ins_pre(sender, instance, **kw):
    _remember_old(sender, instance, ["status"])


@receiver(post_save, sender=Inscription)
def ins_post(sender, instance, created, **kw):
    old = getattr(instance, "_old", {}).get("status")
    if instance.status != old:
        if instance.status in (Inscription.Status.PUBLISHED, Inscription.Status.REJECTED) and not created:
            notifications.inscription_status_changed(instance)
        if instance.status == Inscription.Status.PENDING:
            notifications.notify_editors_new_submission(instance)


@receiver(pre_save, sender=Suggestion)
def sug_pre(sender, instance, **kw):
    _remember_old(sender, instance, ["status"])


@receiver(post_save, sender=Suggestion)
def sug_post(sender, instance, created, **kw):
    old = getattr(instance, "_old", {}).get("status")
    if not created and instance.status != old:
        notifications.suggestion_status_changed(instance)


@receiver(pre_save, sender="accounts.User")
def user_pre(sender, instance, **kw):
    _remember_old(sender, instance, ["is_verified"])


@receiver(post_save, sender="accounts.User")
def user_post(sender, instance, created, **kw):
    if instance.is_verified and not getattr(instance, "_old", {}).get("is_verified", False) and not created:
        notifications.researcher_verified(instance)


@receiver(post_save, sender=Monument)
def monument_post(sender, instance, **kw):
    # Obida nomi o'zgarsa, uning bitiklarining qidiruv matni ham yangilanadi
    for ins in instance.inscriptions.all():
        text = ins.build_search_text()
        if text != ins.search_text:
            Inscription.objects.filter(pk=ins.pk).update(search_text=text)


# Ma'lumot o'zgarganda ommaviy kesh (statistika, xarita) tozalanadi
@receiver([post_save, post_delete], sender=Inscription)
@receiver([post_save, post_delete], sender=Monument)
@receiver([post_save, post_delete], sender=InscriptionImage)
@receiver([post_save, post_delete], sender=Route)
def clear_cache(sender, **kw):
    try:
        cache.clear()
    except Exception:  # noqa: BLE001
        pass
