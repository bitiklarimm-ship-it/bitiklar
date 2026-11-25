# BITIKLAR — bitta konteyner: Nginx (tashqi port) + Next.js (3000) + Django/Gunicorn (8000)
#
#   brauzer ──► Nginx :$PORT ──┬─ /api /admin /static /media ──► Django  127.0.0.1:8000
#                              └─ qolgan hammasi              ──► Next.js 127.0.0.1:3000

# ---------- 1. Frontend build ----------
FROM node:22-bookworm-slim AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY frontend/ .
# Brauzer API'ga shu domenning o'zidan (nisbiy /api/...) murojaat qiladi
ARG NEXT_PUBLIC_API_URL=""
ARG NEXT_PUBLIC_SITE_URL=https://bitiklar.uz
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- 2. Yakuniy obraz ----------
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=10000

RUN apt-get update \
 && apt-get install -y --no-install-recommends nginx gettext-base libjpeg62-turbo zlib1g \
 && rm -rf /var/lib/apt/lists/* /etc/nginx/sites-enabled/default

# Node.js (faqat ishga tushirish uchun, build qilingan standalone server)
COPY --from=web /usr/local/bin/node /usr/local/bin/node

# Backend
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
RUN DJANGO_SECRET_KEY=build python manage.py collectstatic --noinput

# Frontend (standalone)
COPY --from=web /web/.next/standalone /app/frontend
COPY --from=web /web/.next/static /app/frontend/.next/static
COPY --from=web /web/public /app/frontend/public

COPY deploy/nginx.conf.template /etc/nginx/templates/bitiklar.conf.template
COPY deploy/start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 10000
CMD ["/app/start.sh"]
