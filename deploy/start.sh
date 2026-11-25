#!/bin/bash
# Bitta konteynerda 3 jarayon: Django (gunicorn), Next.js, Nginx.
# Ulardan biri to'xtasa konteyner ham to'xtaydi — hosting (Render/Docker) uni qayta ishga tushiradi.
set -e
export PORT="${PORT:-10000}"

cd /app/backend
# Migratsiyalar: fayllar bazada saqlanadi, eski sxema ma'lumot o'chirilmasdan yangilanadi
python manage.py smart_migrate
if [ "$SEED_DEMO" = "1" ]; then python manage.py seed_demo; fi
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py createsuperuser --noinput 2>/dev/null || true
fi
python manage.py rebuild_search || true
python manage.py seed_glossary || true
# Eski rasmlar uchun sayt nusxalarini fonda yaratish (asl rasmlarga tegmaydi)
(python manage.py build_thumbs || echo "Rasm nusxalari yaratilmadi" >&2) &

# Kunlik zaxira (BACKUP_INTERVAL_HOURS=0 bo'lsa o'chiriladi). Xato bo'lsa sayt to'xtamaydi.
if [ "${BACKUP_INTERVAL_HOURS:-24}" != "0" ]; then
  (
    sleep 600
    while true; do
      python manage.py backup_db || echo "Zaxira yaratilmadi" >&2
      sleep $(( ${BACKUP_INTERVAL_HOURS:-24} * 3600 ))
    done
  ) &
  BACKUP_PID=$!
fi

# --- Self-ping: Render'ning bepul tarifida 15 daqiqa so'rov bo'lmasa servis uxlaydi. ---
# Har KEEP_ALIVE_MINUTES (standart 10) daqiqada saytning tashqi manziliga so'rov yuboriladi.
# O'chirish: KEEP_ALIVE=0. Manzil: SELF_PING_URL yoki Render bergan RENDER_EXTERNAL_URL.
PING_URL="${SELF_PING_URL:-$RENDER_EXTERNAL_URL}"
if [ "${KEEP_ALIVE:-1}" != "0" ] && [ -n "$PING_URL" ]; then
  (
    sleep 120
    while true; do
      python - "$PING_URL" <<'PY' || true
import sys, urllib.request
url = sys.argv[1].rstrip("/") + "/healthz"
try:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "bitiklar-keepalive"}), timeout=30) as r:
        print(f"[keep-alive] {url} -> {r.status}", flush=True)
except Exception as e:
    print(f"[keep-alive] xato: {e}", flush=True)
PY
      sleep $(( ${KEEP_ALIVE_MINUTES:-10} * 60 ))
    done
  ) &
  echo "Keep-alive yoqildi: $PING_URL har ${KEEP_ALIVE_MINUTES:-10} daqiqada"
fi

gunicorn config.wsgi:application \
  --bind 127.0.0.1:8000 \
  --workers "${WEB_CONCURRENCY:-2}" --timeout 180 \
  --access-logfile - &
GUNICORN_PID=$!

cd /app/frontend
API_URL=http://127.0.0.1:8000 PORT=3000 HOSTNAME=127.0.0.1 node server.js &
NODE_PID=$!

envsubst '${PORT}' < /etc/nginx/templates/bitiklar.conf.template > /etc/nginx/conf.d/bitiklar.conf
nginx -g 'daemon off;' &
NGINX_PID=$!

echo "BITIKLAR ishga tushdi: port $PORT"
# Asosiy jarayonlardan biri (gunicorn, node, nginx) to'xtasa — konteyner qayta ishga tushadi.
# Zaxira sikli bu ro'yxatga kirmaydi.
wait -n "$GUNICORN_PID" "$NODE_PID" "$NGINX_PID"
echo "Jarayonlardan biri to'xtadi — konteyner yopilmoqda" >&2
exit 1
