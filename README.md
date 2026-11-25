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
| Rasmlar | **Cloudflare R2** (`STORAGE_BACKEND=r2`); muqobil: mahalliy disk, S3, Cloudinary |
| AI tahlil | Claude vision API (ixtiyoriy, `ANTHROPIC_API_KEY`) |
| Hosting | **Bitta server**: bitta Docker konteyner (Nginx + Next.js + Django) — Render yoki VPS |

## Tuzilishi: bitta server

Sayt, API va admin panel **bitta konteynerda, bitta manzilda** ishlaydi:

```
brauzer ──► Nginx :$PORT ──┬─ /api  /admin  /static  /media ──► Django (gunicorn) 127.0.0.1:8000
                           └─ qolgan barcha sahifalar        ──► Next.js           127.0.0.1:3000
```

- Brauzer API'ga shu domenning o'zidan (`/api/...`) murojaat qiladi — CORS va alohida `api.` subdomen kerak emas.
- Fayllar: `Dockerfile` (ildizda), `deploy/nginx.conf.template`, `deploy/start.sh`.
- Asosiy sozlama — bitta `SITE_URL` (masalan `https://bitiklar.uz`). `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`,
  `FRONTEND_URL`, `BACKEND_PUBLIC_URL` shundan avtomatik olinadi. Render'da `SITE_URL` bo'sh bo'lsa,
  `*.onrender.com` manzili ishlatiladi.

## Tez ishga tushirish (Docker, VPS)

```bash
cp .env.example .env        # parollar va kalitlarni o'zgartiring
docker compose up --build
```

- Sayt: http://localhost:8080
- Admin panel: http://localhost:8080/admin (`.env` dagi `DJANGO_SUPERUSER_*`)
- API: http://localhost:8080/api/

VPS'da oldiga Caddy/Nginx qo'yib HTTPS yoqing va `bitiklar.uz` ni `localhost:8080` ga yo'naltiring.

## Render

New → Blueprint → repozitoriyni tanlang. `render.yaml` **bitta** web-servis (`bitiklar`) va PostgreSQL yaratadi.
Custom domain sifatida `bitiklar.uz` ni shu bitta servisga ulang.

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
GET  /api/inscriptions/geojson/          jonli xarita (bitiklar)
GET  /api/inscriptions/{slug}/tei/       TEI-EpiDoc XML
GET  /api/export/csv/ | json/ | tei/     ochiq ma'lumotlar (filtrlar: ?language=&region=&q=)
GET  /api/routes/  GET /api/routes/{slug}/
GET  /api/editor/overview/               muharrir paneli
POST /api/auth/researchers/{id}/verify/  muharrir {action: "decline"} — rad etish
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

## Rasmlar: Cloudflare R2

1. Cloudflare Dashboard → **R2** → *Create bucket* → nomi: `bitiklar-media`.
2. Bucket → **Settings → Public access** → *Custom Domains* → `media.bitiklar.uz` ulang
   (domen Cloudflare'da bo'lishi kerak). Sinov uchun *R2.dev subdomain* ni yoqsangiz ham bo'ladi.
3. R2 → **Manage R2 API Tokens** → *Create API token* → ruxsat: **Object Read & Write**, faqat shu bucket.
   Access Key ID va Secret Access Key ni saqlab oling.
4. `.env` (yoki Render env) ga yozing:

```
STORAGE_BACKEND=r2
R2_ACCOUNT_ID=...          # Dashboard o'ng tomonidagi Account ID
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=bitiklar-media
R2_PUBLIC_DOMAIN=media.bitiklar.uz
```

Yuklangan rasmlar `https://media.bitiklar.uz/inscriptions/2026/11/...` ko'rinishidagi havola bilan
beriladi va 1 yil keshlanadi. `R2_PUBLIC_DOMAIN` bo'sh qolsa, 7 kunlik imzolangan havolalar ishlatiladi
(ommaviy sayt uchun tavsiya etilmaydi). Mahalliy sinovda `STORAGE_BACKEND=local` qo'ying.

## AI tahlil

`ANTHROPIC_API_KEY` o'rnatilsa, tadqiqotchi bitik suratini yuklaydi va AI quyidagilarni taklif qiladi:
til, yozuv uslubi, texnika, asl matn, transliteratsiya, 3 tilda tarjima, aniqlangan manba (oyat,
she'r…), ishonch darajasi va shubhali joylar. Natija **faqat qoralama** — formaga o'tkaziladi va
muharrir tekshiruvisiz nashr qilinmaydi. Har bir foydalanuvchiga soatiga 20 ta so'rov.

## Domen: bitiklar.uz

- `bitiklar.uz` → bitta servis (sayt + `/api` + `/admin`). `api.bitiklar.uz` endi kerak emas.
- `.env`: `SITE_URL=https://bitiklar.uz`, `NEXT_PUBLIC_SITE_URL=https://bitiklar.uz`,
  qo'shimcha domenlar bo'lsa `DJANGO_ALLOWED_HOSTS=www.bitiklar.uz`.
- `NEXT_PUBLIC_API_URL` ni bo'sh qoldiring (faqat Docker'siz ishlab chiqishda `http://localhost:8000`).

## Imkoniyatlar (2-bosqich)

### Jonli xarita — `/uz/xarita`
- Barcha nashr qilingan **bitiklar** xaritada (aniq GPS bo'lsa — o'sha nuqtada, bo'lmasa obida joyida).
  Bir joydagi bir nechta bitik bitta belgiga yig'iladi, belgi rangi — bitik tili.
- **«Mening joylashuvim»** — foydalanuvchi qayerda turgani real vaqtda (GPS, `watchPosition`) ko'k nuqta va
  aniqlik doirasi bilan ko'rinadi; xohlasa xarita uni kuzatib boradi.
- **Eng yaqin bitiklar** ro'yxati: masofa va yo'nalish strelkasi (↗ 120 m), «Yo'l» — piyoda yo'l ko'rsatish.
- Bitikdan 60 m ichiga kelganda **«Siz bitik yonidasiz»** xabari chiqadi (telefon titraydi).
- Sxema / sun'iy yo'ldosh qatlami, til bo'yicha filtr, obidalar qatlami. Bitik sahifasidan `?bitik=slug` bilan ochiladi.
- Joylashuv faqat **HTTPS**da ishlaydi (Render va Cloudflare buni beradi).

### Admin: joyni xaritadan belgilash
- Obida va Bitik sahifalarida koordinata maydonlari ostida xarita: bosing yoki belgini suring — kenglik/uzunlik
  avtomatik yoziladi. **«Mening joylashuvim»** — obida oldida turib telefon GPS'idan olish. Manzil bo'yicha qidiruv,
  sun'iy yo'ldosh ko'rinishi. Bitik sahifasida obidaning o'zi kulrang nuqta bilan ko'rsatiladi.
- Tadqiqotchi formasida (`/uz/tadqiqotchilar`) ham xuddi shunday joy tanlagich bor.

### Boshqalar
| Imkoniyat | Qayerda |
|---|---|
| Arab yozuvida aqlli qidiruv (harakatlar, أ/ا, ي/ی, ة/ه, fors raqamlari, oʻ/o' birxillashtiriladi) | `apps/catalog/textnorm.py`, katalog qidiruvi |
| Ochiq ma'lumotlar: CSV, JSON, TEI-EpiDoc | `/api/export/csv/`, `/json/`, `/tei/` (katalog filtrlari ishlaydi), bitik uchun `/api/inscriptions/{slug}/tei/` |
| Iqtibos keltirish (ГОСТ, APA, Chicago, BibTeX) | har bir bitik sahifasida |
| Rasm ustida belgilash | Admin → Bitik → rasm qatorida «✎ Rasmda belgilash»; saytda raqamli ramkalar |
| Audio (qiroat / o'qib berish) | Admin → Bitik → «Audio» |
| Yo'nalishlar | Admin → Yo'nalishlar; saytda `/uz/yonalishlar` |
| O'zgarishlar tarixi | Admin → har bir yozuvda «Tarix» tugmasi (`django-simple-history`) |
| Muharrir paneli | `/uz/tadqiqotchilar?tab=editor` — navbat, takliflar (eski/yangi matn), tadqiqotchilarni tasdiqlash |
| Email xabarnomalar | nashr/rad, taklif javobi, tadqiqotchi tasdig'i; yangi bitik — muharrirlarga (`EMAIL_*`) |
| QR-kodlarni ommaviy chop etish | `/uz/qr-chop` (obidalar yoki bitiklar, hudud bo'yicha; A4, «PDF sifatida saqlash») |
| Kunlik zaxira | `python manage.py backup_db` — konteyner o'zi har 24 soatda ishga tushiradi (`BACKUP_*`) |
| Kesh | statistika, xarita, filtrlar — mehmonlar uchun 2 daqiqa |
| SEO | har sahifada canonical/hreflang, Open Graph rasm, schema.org JSON-LD, sitemap |
| Xatolarni kuzatish | `SENTRY_DSN` |

### Zaxiradan tiklash

```bash
python manage.py backup_db --list
gunzip -c bitiklar-2026-11-25T0300.json.gz > backup.json
python manage.py loaddata backup.json
```

Render'da disk vaqtinchalik — `BACKUP_BUCKET` ga R2'da **alohida yopiq** bucket bering (masalan `bitiklar-backups`,
ommaviy domen ulamang). R2 tokeniga shu bucketga ham yozish ruxsatini qo'shing.

### ⚠️ Migratsiyalar

Yangi modellar (Yo'nalish, tarix jadvallari) va maydonlar (audio, rasm belgilari, qidiruv matni) qo'shildi.
Ishga tushganda `makemigrations` ularni avtomatik yaratadi, lekin **bir marta** kompyuteringizda yaratib, git'ga
qo'shib qo'yish to'g'ri:

```bash
docker compose up --build        # migratsiyalar backend/apps/*/migrations/ ga yoziladi
git add backend/apps/*/migrations && git commit -m "migratsiyalar"
```

## Dizayn va admin panel (3-bosqich)

**Sayt**
- Yangi dizayn tizimi: lojuvard–firuza–oltin ranglar, yumshoq soyalar, katta yozuvlar, **yorug' / qorong'i ko'rinish**
  (tizim sozlamasiga qarab yoki header'dagi tugma bilan; tanlov eslab qolinadi).
- Header: shaffof "shisha" ko'rinish, **tezkor qidiruv oynasi** (`/` yoki `Ctrl+K`), til va mavzu tugmalari.
- Telefonda **pastki menyu** (Bosh sahifa · Bitiklar · Xarita · Obidalar · Yo'nalishlar) — obida yonida bir qo'l bilan.
- Bosh sahifa: katta qidiruv, tezkor teglar, **«Yaqinimdagi bitiklar»** (xaritani ochib joylashuvni darhol yoqadi),
  «Qanday foydalaniladi» 3 qadam, yo'nalishlar, olimlar uchun bo'lim.
- Katalog: tanlangan filtrlar teg ko'rinishida (× bilan olib tashlanadi), saralash (yangi / ko'p o'qilgan / qadimiy / nomi).
- Bitik sahifasi: til/yozuv teglari, **ulashish** (telefonda tizim oynasi) va asl matndan nusxa olish, yon panel qotib turadi.
- Yuklanish skeleti, chiroyli 404 sahifa, «Yuqoriga» tugmasi, klaviatura bilan boshqarish va `prefers-reduced-motion`.

**Admin panel** — [Unfold](https://unfoldadmin.com) mavzusi
- Yon menyu (Bitiklar, Obidalar, Yo'nalishlar, Takliflar, Foydalanuvchilar) va **kutilayotganlar soni belgisi**.
- Bosh sahifa (dashboard): asosiy ko'rsatkichlar, ko'rib chiqish navbati, **ma'lumot sifati** (rasmsiz, joyi
  belgilanmagan, tarjimasiz, manbasiz bitiklar — bir bosishda ro'yxat), tillar va hududlar diagrammasi,
  so'nggi o'zgarishlar, eng ko'p o'qilganlar, tezkor tugmalar.
- Bitik formasi bo'limlarga ajratilgan: Sarlavha · Yozuv · Tarjima va izoh · Sana · **Joylashuv (xarita)** · Audio ·
  Rasmlar · Manbalar · Ko'rib chiqish. Saqlanmagan o'zgarish bo'lsa ogohlantiradi.
- Ro'yxatda rasm, holat rangli belgi bilan; har bir qatorda **«✓ Nashr» / «✕ Rad»** tugmalari, forma tepasida ham.
- Takliflarda hozirgi va taklif etilgan matn yonma-yon. Qorong'i rejim.

## 4-bosqich: realroq xarita, rasm sifati, AI rejimlari

**Xarita**
- Qatlamlar: **Xarita** (CARTO), **Sun'iy yo'ldosh** (Esri), **Sun'iy yo'ldosh + nomlar**. Bitta obida xaritasi
  sun'iy yo'ldoshda ochiladi. Esri tasviri 18-darajadan keyin kattalashtirib ko'rsatiladi. Hammasi kalitsiz.
- **Butun ekran** tugmasi barcha xaritalarda.
- **Qayerda joylashgan / Qanday borish** (obida va bitik sahifalarida): koordinata (nusxa olish, ulashish),
  «mendan qancha uzoqda», navigatorlar: Yandex Navigator, Yandex Xaritalar, Google Maps, 2GIS, Apple, Waze, OSM.
  Jonli xaritada va gid rejimida «Yo'l» tugmasi ham shu ro'yxatni ochadi.
- Telefonda kichik xaritalar sahifa aylantirishga xalaqit bermaydi (xarita ikki barmoq bilan suriladi).
- Admin paneldagi joy tanlagich ham sun'iy yo'ldoshda ochiladi.

**Rasmlar**
- Asl fayl **siqilmasdan, to'liq sifatda** saqlanadi. Saytda tez ochilishi uchun 2400 px va 720 px yuqori sifatli
  WebP nusxalar avtomatik yaratiladi (`apps/catalog/imaging.py`). Telefon rasmining burilishi to'g'rilanadi,
  iPhone **HEIC** qabul qilinadi. Eski rasmlar uchun: `python manage.py build_thumbs` (ishga tushishda o'zi bajariladi).
- Bitik sahifasida rasmni bosing → **to'liq ekran**, g'ildirak/ikki barmoq bilan 8× gacha kattalashtirish,
  surish; 2× dan oshganda asl faylga o'tadi (xattotlik tafsilotlari), «Asl sifatda» yuklab olish.

**AI rejimlari** (`ANTHROPIC_API_KEY` kerak; bo'lmasa sayt «hozircha yoqilmagan» deydi)
- **AI gid** har bir bitik sahifasida: *Oddiy tilda · Bolalar uchun · Ilmiy tahlil · Savol bering* (suhbat).
  Javob faqat katalog ma'lumotiga tayanadi, keshlanadi (bir xil savolga qayta pul ketmaydi).
- **Rasmdan aniqlash** (`/uz/aniqlash`): tashrif buyuruvchi yozuvni suratga oladi → AI o'qiydi → katalogdan mos
  bitiklar (yaqin atrofdagilar ustun) chiqadi.
- Limit (IP bo'yicha): AI gid 30/soat, aniqlash 15/soat — `REST_FRAMEWORK.DEFAULT_THROTTLE_RATES`.
- **Ovoz bilan tinglash** — tarjima va AI javobini brauzerning o'z ovozi o'qiydi (bepul).

**Qulayliklar**
- ☆ **Saqlash** va **yaqinda ko'rilganlar** (`/uz/saqlanganlar`, ro'yxatdan o'tmasdan, qurilmada saqlanadi).
- **A− / A+** — matn o'lchami (asl yozuv, tarjima, izoh), eslab qolinadi.
- Saytni telefonga **ilova kabi o'rnatish** (PWA manifest, «Bosh ekranga qo'shish»).

## 5-bosqich: ilmiy bo'limlar, gid, o'yin, AI tarjima, import

**Ilmiy bo'limlar**
| Bo'lim | Sahifa | Admin |
|---|---|---|
| Shaxslar (xattot, usta, homiy, hukmdor) | `/uz/shaxslar` | Shaxslar; bitik formasida «Aloqador shaxslar» |
| Qur'on oyatlari ko'rsatkichi | `/uz/oyatlar` | Bitik → «Qur'on oyatlari»: `2:255; 55:26-27; 112` |
| Vaqt chizig'i (sulolalar) | `/uz/davrlar` | Bitik → «Davr / sulola» |
| Atamalar lug'ati (30 ta tayyor atama) | `/uz/lugat`; bitik sahifasida uslub/texnika ustida izoh ⓘ | Atamalar lug'ati |
| Ikki bitikni taqqoslash | `/uz/taqqoslash` (bitik sahifasida ⇄) | — |

**Tashrif buyuruvchilar uchun**
- **Gid rejimi** (`/uz/yonalishlar/<slug>/gid`): kompas strelkasi va masofa, 60 m ga yetganda bekat avtomatik
  ochiladi (obida tavsifi ovozli, bitiklar ro'yxati), ekran o'chmaydi, qayerda qolgani eslab qolinadi.
- **Bitik ovchisi** (`/uz/ovchi`): obida yonida «Men shu yerdaman» (GPS 150 m) → to'plam va nishonlar.
- **Viktorina** (`/uz/viktorina`): katalogdan avtomatik tuziladi, AI xarajatisiz.
- **Oflayn rejim**: service worker; yo'nalish sahifasida «Internetsiz ko'rish uchun saqlash».
- **Boshqa tillar**: bitik tarjimasini 16 tilda o'qish (turk, qozoq, arab, nemis, xitoy…) — AI, keshlanadi.
- **Rasm yuborish**: tashrifchi rasm yuboradi → Admin → «Tashrifchilar rasmlari» → «Qabul qilish» → galereyaga.
- Header'da «Ko'proq» menyusi, telefonda pastki menyuda «Ko'proq» → `/uz/kashf` (barcha bo'limlar).

**Muharrirlar uchun**
- **AI tarjima qoralamasi**: Admin → Bitiklar → belgilang → «AI: bo'sh tarjimalarni to'ldirish» (yoki bitik
  sahifasidagi tugma). Faqat bo'sh maydonlar to'ldiriladi, «Muharrir izohi»ga belgi qo'yiladi — tekshirish shart.
- **Excel'dan import**: Admin → yon menyu «Excel'dan import» → namuna faylni yuklab oling → to'ldiring →
  avval «Sinov rejimi» bilan yuklang → xatosiz bo'lsa, haqiqiy import. CSV ham qabul qilinadi.

## AI provayderi: OpenAI yoki Anthropic

Barcha AI imkoniyatlari (AI gid, rasmdan aniqlash, tadqiqotchi AI tahlili, AI tarjima, boshqa tillar) bitta
modul orqali ishlaydi — `apps/ai/llm.py`. Render → Environment:

```
AI_PROVIDER=openai          # yoki anthropic; bo'sh bo'lsa — qaysi kalit berilgan bo'lsa, o'sha
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o         # rasmni o'qiy oladigan (vision) model bo'lishi shart
```

## Keyingi bosqichlar

- [ ] Haqiqiy bitiklarni mutaxassislar bilan kiritish, demo yozuvlarni o'chirish
- [ ] Obida koordinatalarini aniqlashtirish va muqova rasmlarini yuklash
- [x] Arab harflarini normallashtirib qidirish
- [ ] PostgreSQL to'liq matnli qidiruv (`SearchVector`) — bitiklar soni minglab bo'lganda
- [x] Bitikni rasm ustida belgilash (annotatsiya) — [ ] IIIF ko'rsatkich
- [x] Ma'lumotlarni eksport qilish (CSV / JSON / TEI-EpiDoc)
- [x] QR-kodlarni ommaviy chop etish
- [ ] Oflayn rejim (PWA): obida yonida internet sust bo'lsa ham xarita va bitiklar ochilsin
