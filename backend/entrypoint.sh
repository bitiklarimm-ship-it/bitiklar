#!/bin/sh
set -e

# Birinchi ishga tushirishda migratsiya fayllari yaratiladi.
# Ularni git'ga qo'shib qo'ying (backend/apps/*/migrations/).
python manage.py makemigrations accounts catalog --noinput
python manage.py migrate --noinput

if [ "$SEED_DEMO" = "1" ]; then
  python manage.py seed_demo
fi

if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py createsuperuser --noinput || true
fi

exec "$@"
