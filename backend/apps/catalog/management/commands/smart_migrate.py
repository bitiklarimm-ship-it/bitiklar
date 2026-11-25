"""Migratsiyalarni xavfsiz bajarish (migratsiya fayllari git'da bo'lmasa ham).

Muammo: Render'da disk vaqtinchalik. Migratsiya fayllari har deploy'da `makemigrations` bilan
qaytadan yaratilsa, bazadagi eski "0001_initial" yangi "0001_initial" bilan bir xil nomda bo'ladi va
Django yangi ustunlarni qo'shmaydi ("column ... does not exist").

Yechim:
  1. Yaratilgan migratsiya fayllari bazadagi `bitiklar_migration_files` jadvalida saqlanadi va har
     ishga tushishda qayta tiklanadi — shuning uchun keyingi o'zgarishlar 0002, 0003... bo'lib to'g'ri qo'shiladi.
  2. Eski tizimdan o'tishda (fayllar saqlanmagan, lekin baza eski sxemada) yetishmayotgan jadval va
     ustunlar modeldan qarab qo'shiladi, mavjud ma'lumot o'chirilmaydi, so'ng migratsiya tarixi yangilanadi.

    python manage.py smart_migrate
"""
from pathlib import Path

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import connection, transaction

APPS = ("accounts", "catalog")
STORE = "bitiklar_migration_files"


def mig_dir(app):
    return Path(apps.get_app_config(app).path) / "migrations"


def mig_files(app):
    return sorted(p for p in mig_dir(app).glob("[0-9]*.py"))


class Command(BaseCommand):
    help = "Migratsiya fayllarini bazada saqlab, migratsiyalarni xavfsiz bajaradi."

    def log(self, msg):
        self.stdout.write(self.style.MIGRATE_HEADING(f"[smart_migrate] {msg}"))

    # ---------- migratsiya fayllari ombori ----------
    def ensure_store(self):
        with connection.cursor() as c:
            c.execute(
                f"CREATE TABLE IF NOT EXISTS {STORE} ("
                " app varchar(100) NOT NULL, name varchar(255) NOT NULL, content text NOT NULL,"
                " saved_at timestamp with time zone NOT NULL DEFAULT now(), PRIMARY KEY (app, name))"
            )

    def load(self):
        with connection.cursor() as c:
            c.execute(f"SELECT app, name, content FROM {STORE}")
            rows = c.fetchall()
        n = 0
        for app, name, content in rows:
            if app not in APPS:
                continue
            path = mig_dir(app) / f"{name}.py"
            if not path.exists():  # git'dagi fayl bo'lsa, o'sha ustun
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8")
                n += 1
        self.log(f"Saqlangan migratsiyalar tiklandi: {n} ta")
        return len(rows)

    def save(self):
        n = 0
        with connection.cursor() as c:
            for app in APPS:
                for p in mig_files(app):
                    c.execute(
                        f"INSERT INTO {STORE} (app, name, content) VALUES (%s, %s, %s) "
                        "ON CONFLICT (app, name) DO UPDATE SET content = EXCLUDED.content",
                        [app, p.stem, p.read_text(encoding="utf-8")],
                    )
                    n += 1
        self.log(f"Migratsiya fayllari bazada saqlandi: {n} ta")

    # ---------- eski sxemadan o'tish ----------
    def applied(self, app):
        if "django_migrations" not in connection.introspection.table_names():
            return []
        with connection.cursor() as c:
            c.execute("SELECT name FROM django_migrations WHERE app = %s", [app])
            return [r[0] for r in c.fetchall()]

    def repair_schema(self, app):
        """Modelda bor, bazada yo'q jadval va ustunlarni qo'shadi. Hech narsani o'chirmaydi."""
        created, added = [], []
        with transaction.atomic(), connection.schema_editor() as se:
            tables = set(connection.introspection.table_names())
            for model in apps.get_app_config(app).get_models(include_auto_created=True):
                meta = model._meta
                if meta.proxy or not meta.managed:
                    continue
                if meta.db_table not in tables:
                    se.create_model(model)
                    tables.add(meta.db_table)
                    created.append(meta.db_table)
                    continue
                with connection.cursor() as c:
                    cols = {col.name for col in connection.introspection.get_table_description(c, meta.db_table)}
                for f in meta.local_fields:
                    if f.column and f.column not in cols:
                        se.add_field(model, f)
                        added.append(f"{meta.db_table}.{f.column}")
        self.log(f"{app}: yangi jadvallar {created or '—'}; yangi ustunlar {added or '—'}")

    def handle(self, *args, **opts):
        self.ensure_store()
        stored = self.load()

        legacy = [app for app in APPS if not stored and self.applied(app) and not mig_files(app)]
        if legacy:
            # Eski tizim: baza bor, lekin uning migratsiya fayllari yo'qolgan
            self.log(f"Eski sxema aniqlandi ({', '.join(legacy)}) — ma'lumot saqlangan holda yangilanadi")
            for app in legacy:
                self.repair_schema(app)
            with connection.cursor() as c:
                # accounts'ga boshqa ilovalar (admin, auth) bog'liq — uning tarixiga tegmaymiz,
                # modeli o'zgarmagan, qayta yaratilgan 0001 avvalgisi bilan bir xil bo'ladi
                for app in legacy:
                    if app != "accounts":
                        c.execute("DELETE FROM django_migrations WHERE app = %s", [app])
            call_command("makemigrations", *APPS, interactive=False, verbosity=1)
            for app in legacy:
                if app != "accounts":
                    call_command("migrate", app, fake=True, interactive=False, verbosity=1)
        else:
            call_command("makemigrations", *APPS, interactive=False, verbosity=1)

        call_command("migrate", interactive=False, verbosity=1)
        self.save()
