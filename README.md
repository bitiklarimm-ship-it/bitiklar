# BITIKLAR — tarix toshlarga bitilgan

O'zbekiston tarixiy obidalaridagi (masjid, madrasa, maqbara, minora va boshqalar) bitiklar katalogi:
asl surat, asl matn, transliteratsiya, **o'zbek / rus / ingliz** tarjimalari, tarixiy-ilmiy izoh,
davri, xattoti, GPS koordinatalari, manbalar, interaktiv xarita va QR-kodlar.

| Qism | Texnologiya |
|---|---|
| Frontend | Next.js 15 (App Router, TypeScript), 3 til: `/uz`, `/ru`, `/en` |
| Backend | Python Django 5 + Django REST Framework, JWT |
| Ma'lumotlar bazasi | PostgreSQL 16 |
| Xarita | OpenStreetMap + Leaflet |
| Rasmlar | Mahalliy disk, Cloudinary yoki S3 (`STORAGE_BACKEND`) |
| AI tahlil | Claude vision API (ixtiyoriy, `ANTHROPIC_API_KEY`) |
| Hosting | Docker Compose (VPS) yoki Render (`render.yaml`) |

## Tez ishga tushirish (Docker)

```bash
cp .env.example .env        # parollar va kalitlarni o'zgartiring
docker compose up --build
```

- Sayt: http://localhost:3000
- Admin panel: http://localhost:8000/admin (`.env` dagi `DJANGO_SUPERUSER_*`)
- API: http://localhost:8000/api/

Birinchi ishga tushishda migratsiya fayllari avtomatik yaratiladi va `backend/apps/*/migrations/`
papkalariga yoziladi — **ularni git'ga qo'shing**. `SEED_DEMO=1` bo'lsa 14 ta hudud, 9 ta obida va
6 ta **DEMO** bitik kiritiladi.

> ⚠️ Demo bitiklar faqat sinov uchun (Basmala, Kalimai shahodat va Rahmon surasi 26-oyat namunalari).
> Ularning obidadagi aniq joyi tasdiqlanmagan. Haqiqiy ma'lumotni mutaxassis kiritgach, demo yozuvlarni
> o'chiring. Obida koordinatalari taxminiy — admin panelda aniqlashtiring.

## Docker'siz (ishlab chiqish)

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgres://bitiklar:bitiklar@localhost:5432/bitiklar DJANGO_DEBUG=1
python manage.py makemigrations accounts catalog
python manage.py migrate
python manage.py seed_demo
python manage.py createsuperuser
python manage.py runserver

# Frontend (boshqa terminalda)
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8000 npm run dev
```

## Foydalanuvchi rollari

| Rol | Imkoniyati |
|---|---|
| Mehmon | Katalog, xarita, bitik sahifalari, QR — ro'yxatdan o'tmasdan |
| O'quvchi (`reader`) | Ro'yxatdan o'tgan foydalanuvchi |
| Tadqiqotchi (`researcher`) | Admin **tasdiqlagach** (`is_verified`): yangi bitik yuboradi, tuzatish taklif qiladi, AI tahlildan foydalanadi. Yuborilganlar `pending` holatda turadi |
| Muharrir (`editor`) / admin | Hammasini tahrirlaydi, takliflarni qabul/rad etadi, nashr qiladi |

Tadqiqotchini tasdiqlash: Admin → Foydalanuvchilar → belgilash → *"Tanlangan tadqiqotchilarni tasdiqlash"*.

## Sahifalar (frontend)

| Yo'l | Mazmuni |
|---|---|
| `/uz` | Bosh sahifa: qidiruv, 4 ta tadqiqot bo'limi (arabiy, forsiy, eski turkiy, boshqa), tanlangan va yangi bitiklar |
| `/uz/bitiklar` | Katalog: qidiruv + til, yozuv uslubi, texnika, hudud bo'yicha filtr |
| `/uz/bitiklar/[slug]` | Bitik sahifasi: foto galereya, asl matn (RTL), transliteratsiya, 3 tilda tarjima, izoh, ma'lumotlar, mini-xarita, QR-kod, manbalar |
| `/uz/obidalar`, `/uz/obidalar/[slug]` | Obidalar ro'yxati va sahifasi (QR-kod bilan) |
| `/uz/xarita` | OpenStreetMap'da barcha obidalar |
| `/uz/tadqiqotchilar` | Kirish/ro'yxatdan o'tish, yangi bitik, mening bitiklarim, tuzatish taklifi, AI tahlil |
| `/uz/haqida` | Loyiha haqida |

`/ru/...` va `/en/...` — xuddi shunday. Til brauzer sozlamasidan aniqlanadi va eslab qolinadi.

## API (asosiylari)

```
GET  /api/stats/                         umumiy statistika
GET  /api/choices/                       filtr tanlovlari
GET  /api/regions/
GET  /api/monuments/?q=&region=&kind=
GET  /api/monuments/geojson/             xarita uchun
GET  /api/monuments/{slug}/
GET  /api/monuments/{slug}/qr/?lang=uz
GET  /api/inscriptions/?q=&language=&script=&technique=&region=&monument=&year_min=&year_max=&page=&page_size=
GET  /api/inscriptions/{slug}/
GET  /api/inscriptions/{slug}/qr/?lang=uz
POST /api/inscriptions/                  tadqiqotchi/muharrir (status → pending)
POST /api/inscriptions/{slug}/images/    rasm yuklash (multipart: image, caption, credit, is_primary)
GET  /api/inscriptions/mine/
GET  /api/inscriptions/pending/          muharrir
POST /api/inscriptions/{slug}/approve/   muharrir {note}
POST /api/inscriptions/{slug}/reject/    muharrir {note}
POST /api/suggestions/                   {inscription, field, proposed_text, justification}
POST /api/suggestions/{id}/accept/       muharrir — matnni bitikka qo'llaydi
POST /api/ai/analyze/                    multipart: image, hint → AI qoralama (JSON)
POST /api/auth/register/  POST /api/auth/token/  POST /api/auth/token/refresh/  GET /api/auth/me/
```

## Ma'lumotlar modeli

- **Region** — hudud (14 ta viloyat/respublika)
- **Monument** — obida: nomi (3 til), turi, hudud, shahar, davri, GPS, tavsif, muqova rasmi
- **Inscription** — bitik: sarlavha va joylashuv (3 til), tili, yozuv uslubi (kufiy, bannoiy, suls,
  nasta'liq…), texnikasi (bannoiy, koshin, majolika, terrakota, tosh, yog'och, ganch…), asl matn,
  transliteratsiya, tarjima va izoh (3 til), davri (matn + yillar + hijriy), xattot, aniq GPS, holati,
  kiritgan va ko'rib chiqqan foydalanuvchi
- **InscriptionImage** — rasmlar (asosiy rasm, izoh, muallif)
- **Source** — manbalar (kitob, maqola, arxiv, qo'lyozma, veb, dala tadqiqoti)
- **Suggestion** — tadqiqotchilarning tuzatish takliflari

## AI tahlil

`ANTHROPIC_API_KEY` o'rnatilsa, tadqiqotchi bitik suratini yuklaydi va AI quyidagilarni taklif qiladi:
til, yozuv uslubi, texnika, asl matn, transliteratsiya, 3 tilda tarjima, aniqlangan manba (oyat,
she'r…), ishonch darajasi va shubhali joylar. Natija **faqat qoralama** — formaga o'tkaziladi va
muharrir tekshiruvisiz nashr qilinmaydi. Har bir foydalanuvchiga soatiga 20 ta so'rov.

## Domen: bitiklar.uz

- `bitiklar.uz` → frontend, `api.bitiklar.uz` → backend.
- `.env`: `FRONTEND_URL`, `BACKEND_PUBLIC_URL`, `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`,
  `CSRF_TRUSTED_ORIGINS`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SITE_URL` ni shu manzillarga moslang.
- VPS'da oldiga Nginx/Caddy qo'yib HTTPS yoqing.

## Keyingi bosqichlar

- [ ] Haqiqiy bitiklarni mutaxassislar bilan kiritish, demo yozuvlarni o'chirish
- [ ] Obida koordinatalarini aniqlashtirish va muqova rasmlarini yuklash
- [ ] PostgreSQL to'liq matnli qidiruv (`SearchVector`) va arab harflarini normallashtirish
- [ ] Bitikni rasm ustida belgilash (annotatsiya), IIIF ko'rsatkich
- [ ] Ma'lumotlarni eksport qilish (CSV / JSON / TEI-EpiDoc) — ilmiy foydalanish uchun
- [ ] QR-kodlarni obidalar uchun ommaviy PDF ko'rinishida chop etish
