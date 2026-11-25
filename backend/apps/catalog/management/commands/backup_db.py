"""Ma'lumotlar bazasini zaxiralash.

    python manage.py backup_db            # zaxira yaratish
    python manage.py backup_db --list     # mavjud zaxiralar

Zaxira — Django `dumpdata` JSON (gzip). PostgreSQL versiyasiga bog'liq emas, tiklash:

    gunzip -c bitiklar-2026-11-25T0300.json.gz > backup.json
    python manage.py loaddata backup.json

Saqlash joyi:
  * BACKUP_BUCKET berilgan bo'lsa — Cloudflare R2'dagi **alohida, yopiq** bucket (R2_* kalitlari bilan).
    Ommaviy media bucketiga yozilmaydi, chunki u yerda foydalanuvchilar ma'lumoti bor.
  * aks holda — serverdagi BACKUP_DIR (standart: backend/backups/).
BACKUP_KEEP (standart 14) — nechta oxirgi zaxira saqlanadi.
"""
import gzip
import io
import os
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.utils import timezone

EXCLUDE = ["contenttypes", "auth.permission", "sessions", "admin.logentry"]
PREFIX = "bitiklar-"


def r2_client():
    import boto3
    from botocore.config import Config

    return boto3.client(
        "s3",
        endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
        aws_access_key_id=os.environ.get("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("R2_SECRET_ACCESS_KEY"),
        region_name="auto",
        config=Config(request_checksum_calculation="when_required", response_checksum_validation="when_required"),
    )


class Command(BaseCommand):
    help = "Ma'lumotlar bazasining zaxira nusxasini yaratadi (JSON.gz)."

    def add_arguments(self, parser):
        parser.add_argument("--list", action="store_true", help="Zaxiralar ro'yxati")

    def handle(self, *args, **opts):
        bucket = os.environ.get("BACKUP_BUCKET", "")
        keep = int(os.environ.get("BACKUP_KEEP", "14"))
        local_dir = Path(os.environ.get("BACKUP_DIR", settings.BASE_DIR / "backups"))

        if opts["list"]:
            for name in self._list(bucket, local_dir):
                self.stdout.write(name)
            return

        buf = io.StringIO()
        call_command("dumpdata", exclude=EXCLUDE, natural_foreign=True, natural_primary=True, indent=0, stdout=buf)
        data = gzip.compress(buf.getvalue().encode("utf-8"))
        name = f"{PREFIX}{timezone.localtime().strftime('%Y-%m-%dT%H%M')}.json.gz"

        if bucket:
            r2_client().put_object(Bucket=bucket, Key=f"backups/{name}", Body=data, ContentType="application/gzip")
            where = f"r2://{bucket}/backups/{name}"
        else:
            local_dir.mkdir(parents=True, exist_ok=True)
            (local_dir / name).write_bytes(data)
            where = str(local_dir / name)
        self.stdout.write(self.style.SUCCESS(f"Zaxira yaratildi: {where} ({len(data) // 1024} KB)"))

        # Eskilarini o'chirish
        names = self._list(bucket, local_dir)
        for old in names[:-keep] if keep > 0 else []:
            if bucket:
                r2_client().delete_object(Bucket=bucket, Key=f"backups/{old}")
            else:
                (local_dir / old).unlink(missing_ok=True)
            self.stdout.write(f"Eski zaxira o'chirildi: {old}")

    def _list(self, bucket, local_dir):
        if bucket:
            resp = r2_client().list_objects_v2(Bucket=bucket, Prefix=f"backups/{PREFIX}")
            names = [o["Key"].split("/", 1)[1] for o in resp.get("Contents", [])]
        else:
            names = [p.name for p in local_dir.glob(f"{PREFIX}*.json.gz")] if local_dir.exists() else []
        return sorted(names)
