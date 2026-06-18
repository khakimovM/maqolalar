# Maqolalar — Blog Platformasi: To'liq Loyiha Hujjati
Bu hujjat loyihaning barcha tahlil qilingan qismlari, qabul qilingan qarorlar va texnik arxitekturani o'z ichiga oladi. Loyihani davom ettiradigan AI yoki dasturchi uchun yozilgan.
---
## 1. Loyiha haqida umumiy ma'lumot
**Maqolalar** — kategoriyalarga bo'lingan, premium va bepul maqolalar mavjud bo'lgan blog platformasi. Foydalanuvchilar maqolalarni o'qiydi, layk bosadi, comment yozadi. Adminlar maqola yozadi. SuperAdmin tizimni boshqaradi.
---
## 2. Rollar va huquqlar
### USER
- Ro'yxatdan o'tmasdan: faqat FREE maqolalarni ko'radi
- Ro'yxatdan o'tgandan keyin: FREE + PREMIUM maqolalarni ko'radi
- Maqolaga layk bosadi (toggle — bir marta bossa qo'shiladi, yana bassа olib tashlanadi)
- Maqolaga comment yozadi
- Commentga nested reply yozadi
- O'zi yozgan commentni o'chiradi (soft delete)
- Boshqa userning commentini spam deb belgilaydi
- Maqolani "Keyinroq o'qiyman" ro'yxatiga saqlaydi (toggle)
- O'qiyotgan maqolasida "Shu yerda to'xtadim" tugmasini bosadi → scroll pozitsiya (0–100%) saqlanadi → qayta kirganda smooth scroll bilan o'sha joyga tushadi
- Profil sahifasida: saqlangan maqolalar va davom ettirilayotgan maqolalar alohida tablarda
- Bildirishnomalar: o'z commentiga reply kelganda va o'z maqolasiga layk bosilganda (agar admin bo'lsa)
### ADMIN
- USER qila oladigan barcha narsalar
- Maqola yozadi (Rich text editor: Tiptap)
- Maqolani DRAFT sifatida saqlaydi, tayyor bo'lgach PUBLISH qiladi
- Maqolani PREMIUM yoki FREE deb belgilaydi
- Maqolani ARCHIVED qila oladi
- O'zining barcha maqolalari ro'yxatini ko'radi (dashboard)
- Maqolalar analitikasi: har bir maqola uchun layk soni, comment soni
- Spam belgilangan commentlar haqida notification oladi va ularni o'chira oladi
- Profil: username, avatar, parol o'zgartirish
- Bildirishnomalar: maqolasiga yangi comment, maqolasiga layk, comment spam belgilandi
### SUPERADMIN
- ADMIN qila oladigan barcha narsalar
- Admin yaratadi (faqat SuperAdmin)
- Adminlar ro'yxatini ko'radi
- Adminni bloklaydi/aktivlashtiradi
- Umumiy statistika ko'radi:
  - Jami userlar, adminlar, maqolalar soni
  - Kunlik / oylik / yillik statistika
  - Custom sana oralig'i (`from` – `to`)
- Kategoriyalarni boshqaradi (qo'shish, tahrirlash, o'chirish)
- **SuperAdmin faqat `seed.ts` orqali yaratiladi, UI orqali yaratib bo'lmaydi**
---
## 3. Maqola xususiyatlari
Har bir maqolada:
- `title` — sarlavha
- `slug` — URL uchun avtomatik yasaladi (masalan: `"Python Asoslari"` → `python-asoslari`), unique. To'qnashuvda `-2`, `-3` suffix qo'shiladi
- `excerpt` — ro'yxat sahifalari uchun qisqa tavsif (optional)
- `content` — Tiptap JSON format (rich text). Maqola ichidagi rasm URL'lari shu Json ichida saqlanadi (alohida jadval YO'Q)
- `searchText` — content'dan avtomatik extract qilingan plain text — qidiruv shu ustun bo'yicha ishlaydi (create/update da yangilanadi)
- `coverImage` — muqova rasmi (optional)
- `viewCount` — ko'rishlar soni (tezkor counter; batafsil statistika `ArticleView` jadvalida)
- `author` — maqola yozgan Admin
- `category` — qaysi yo'nalish (kimyo, matematika, qurilish va h.k.)
- `type` — FREE yoki PREMIUM
- `status` — DRAFT, PUBLISHED, ARCHIVED
- `publishedAt` — publish qilingan vaqt
---
## 4. Admin Rich Text Editor (Tiptap)
Editor quyidagi imkoniyatlarni qo'llab-quvvatlashi kerak:
- **Bold**, *Italic*, Underline, ~~Strikethrough~~
- Heading darajalari: H1, H2, H3, H4, H5, H6
- Superscript va Subscript (belgilangan qismni yuqori/pastga qo'yish)
- Matematik va fizik formulalar — **KaTeX** extension
- Emoji / sticker panel (Telegram stickerlari emas, oddiy emoji picker)
- Maqola ichiga rasm yuklash (drag & drop yoki tugma orqali)
- Rasm yuklanishi `/upload/article-image` endpointiga ketadi
---
## 5. O'qish belgisi (Reading Progress) — qanday ishlaydi
1. User maqolani o'qiyotganda tugma (masalan: 🔖) ko'rinib turadi
2. User shu tugmani bosadi
3. Frontend joriy `window.scrollY / document.body.scrollHeight * 100` ni hisoblaydi
4. `POST /articles/:id/progress` ga `{ scrollPercent: 67 }` yuboradi
5. Backend `ReadingProgress` jadvalida `upsert` qiladi (userId + articleId unique)
6. User o'sha maqolaga qayta kirsa, backend `scrollPercent` qaytaradi
7. Frontend `window.scrollTo({ top: calculatedPosition, behavior: 'smooth' })` chaqiradi
**Profil sahifasida:** "Davom ettiriladi" tabida — maqola nomi, qancha foiz o'qilganligi, oxirgi o'qilgan vaqt chiqadi.
---
## 6. Autentifikatsiya arxitekturasi
### Ro'yxatdan o'tish (User uchun)
1. `POST /auth/register` — email, username, password yuboriladi
2. Backend parolni hash qiladi (bcrypt), User yaratadi (`isVerified: false`)
3. 6 xonali OTP generatsiya qilinadi → **BullMQ queue** ga tushadi → **Nodemailer** email yuboradi
4. OTP **Redis** da saqlanadi: `SET otp:{email} {code} EX 180` (3 daqiqa)
5. `POST /auth/verify-email` — OTP kiritiladi → to'g'ri bo'lsa `isVerified: true`
### Kirish
1. `POST /auth/login` — email + password
2. Backend verify qiladi, **Access Token** (15 daqiqa) + **Refresh Token** (30 kun) qaytaradi
3. Refresh Token **PostgreSQL** da saqlanadi (`RefreshToken` jadvali)
4. Access Token frontend da **memory** da yoki **httpOnly cookie** da saqlanadi
### Token yangilash
1. `POST /auth/refresh` — Refresh Token yuboriladi
2. Backend DB dan tekshiradi → yangi Access Token qaytaradi
### Logout
1. `POST /auth/logout` — DB dan Refresh Token o'chiriladi
### Parolni tiklash
1. `POST /auth/forgot-password` — email yuboriladi → OTP ketadi (Redis, 3 daqiqa)
2. `POST /auth/verify-reset-otp` — OTP tekshiriladi → random reset token generatsiya qilinadi, Redis'da `reset:{email}` → token (TTL 10 daqiqa) saqlanadi va clientga qaytariladi
3. `POST /auth/reset-password` — yangi parol + reset token → Redis'dan tekshiriladi → parol yangilanadi → key o'chiriladi → userning barcha RefreshTokenlari bekor qilinadi
### OAuth2 (faqat USER rol uchun)
- Google va GitHub orqali kirish
- `OAuthAccount` jadvalida saqlanadi
- Agar email allaqachon mavjud bo'lsa — mavjud accountga bog'lanadi
### Rate Limiting (Redis)
```
otp:attempts:{email}  → noto'g'ri urinishlar (3 tadan keyin 3 soatga blok)
otp:cooldown:{email}  → yangi OTP so'rash oralig'i (60 sekund)
```
---
## 7. Texnik Stack
| Qism | Texnologiya | Sabab |
|------|------------|-------|
| Backend | **NestJS** | Modular arxitektura, TypeScript, decorator-based |
| Frontend | **Next.js** | SSR — SEO muhim (maqolalar Google da chiqishi kerak) |
| Database | **PostgreSQL** | Relational, ishonchli |
| ORM | **Prisma** | Type-safe, migration boshqaruvi qulay |
| Cache / OTP / Rate limit | **Redis** | TTL, tezlik |
| Email Queue | **BullMQ** | Background job, OTP email uchun |
| Email yuborish | **Nodemailer** | BullMQ worker ichida |
| Rich Text Editor | **Tiptap** | Extensible, KaTeX qo'llab-quvvatlaydi |
| Auth | **JWT** (Passport.js) | Access (15min) + Refresh (30d) |
| File Storage | **Local (Multer)** | Cloud puli yo'q, bitta server |
| Real-time | **WebSocket (Socket.IO)** | Bildirishnomalar uchun |
| Global state | **Zustand** | Frontend |
| Server state | **TanStack Query** | Frontend API calls |
---
## 8. Database Sxemasi (Prisma)
Faylda: `schema.prisma`
### Modellar ro'yxati va qisqacha izohi
**User**
- `id`, `username` (unique), `email` (unique), `password` (nullable — OAuth uchun), `avatar`, `role` (USER/ADMIN/SUPERADMIN), `isActive`, `isVerified`
**OAuthAccount**
- `userId`, `provider` (GOOGLE/GITHUB), `providerId` — unique(provider + providerId)
**RefreshToken**
- `tokenHash` (unique — SHA-256, plain token saqlanMAYDI), `userId`, `expiresAt` — logout va multi-device uchun DB da saqlanadi
**Category**
- `name` (unique), `slug` (unique) — SuperAdmin tomonidan boshqariladi
**Article**
- `title`, `slug` (unique), `excerpt`, `content` (Json — Tiptap), `searchText` (qidiruv uchun plain text), `coverImage`, `type` (FREE/PREMIUM), `status` (DRAFT/PUBLISHED/ARCHIVED), `viewCount`, `publishedAt`, `authorId`, `categoryId`
- Indekslar: `[status, type, publishedAt]`, `[categoryId]`, `[authorId]`
**ArticleView**
- `articleId`, `userId` (nullable — mehmonlar uchun), `ipHash`, `createdAt` — har bir ko'rish yoziladi, kunlik/oylik analytics shu yerdan. Indeks: `[articleId, createdAt]`
**Like**
- `userId`, `articleId` — unique(userId + articleId) — bir marta layk
**Comment**
- `content`, `isDeleted` (soft delete), `isEdited`, `authorId`, `articleId`, `parentId` (null = top-level, value = reply) — o'ziga-o'zi self-relation. Indekslar: `[articleId]`, `[parentId]`
**CommentReport**
- `commentId`, `reportedById`, `reason` — unique(commentId + reportedById)
**SavedArticle**
- `userId`, `articleId` — unique(userId + articleId)
**ReadingProgress**
- `userId`, `articleId`, `scrollPercent` (0–100), `lastMarkedAt` — unique(userId + articleId), upsert bilan yangilanadi
**Notification**
- `userId` (kimga), `type` (NEW_COMMENT/NEW_REPLY/NEW_LIKE/COMMENT_SPAM), `referenceId` (maqola yoki comment ID), `isRead`. Indeks: `[userId, isRead]`
### Enum lar
```
Role:             USER | ADMIN | SUPERADMIN
ArticleType:      FREE | PREMIUM
ArticleStatus:    DRAFT | PUBLISHED | ARCHIVED
NotificationType: NEW_COMMENT | NEW_REPLY | NEW_LIKE | COMMENT_SPAM
OAuthProvider:    GOOGLE | GITHUB
```
---
## 9. NestJS Modullar Strukturasi
```
src/
├── modules/
│   ├── auth/           ← JWT, OAuth, OTP, login/register/logout
│   ├── users/          ← Profil ko'rish, tahrirlash, parol o'zgartirish
│   ├── articles/       ← CRUD, qidiruv, filter, publish/archive
│   ├── categories/     ← CRUD (SuperAdmin)
│   ├── comments/       ← Yozish, reply, o'chirish, spam report
│   ├── likes/          ← Toggle like
│   ├── saved-articles/ ← Toggle save, ro'yxat
│   ├── reading-progress/ ← Saqlash, olish, o'chirish
│   ├── notifications/  ← Ro'yxat, o'qildi belgilash + WebSocket gateway
│   ├── upload/         ← Avatar, cover, article-image yuklash
│   └── admin/          ← Admin yaratish, statistika, adminlar ro'yxati
│
├── common/
│   ├── decorators/     ← @CurrentUser(), @Roles(), @Public()
│   ├── guards/         ← JwtAuthGuard (global), RolesGuard
│   ├── filters/        ← HttpExceptionFilter (barcha xatolar bir formatda)
│   ├── interceptors/   ← ResponseInterceptor → { data, message, statusCode }
│   └── pipes/          ← ValidationPipe (global)
│
├── config/             ← app, jwt, redis, mail, database config
├── database/           ← PrismaService, seed.ts
├── redis/              ← RedisService (OTP, rate limit, cache)
└── mail/               ← MailModule, MailService, BullMQ processor, templates
```
---
## 10. API Endpointlar ro'yxati
### Auth
| Method | URL | Kimga |
|--------|-----|-------|
| POST | /auth/register | Hammaga |
| POST | /auth/verify-email | Hammaga |
| POST | /auth/resend-otp | Hammaga |
| POST | /auth/login | Hammaga |
| POST | /auth/refresh | Kirgan user |
| POST | /auth/logout | Kirgan user |
| POST | /auth/forgot-password | Hammaga |
| POST | /auth/verify-reset-otp | Hammaga |
| POST | /auth/reset-password | Hammaga |
| GET | /auth/google | Hammaga |
| GET | /auth/google/callback | Hammaga |
| GET | /auth/github | Hammaga |
| GET | /auth/github/callback | Hammaga |
### Users
| Method | URL | Kimga |
|--------|-----|-------|
| GET | /users/me | USER+ |
| PUT | /users/me | USER+ |
| PUT | /users/me/password | USER+ |
### Articles
| Method | URL | Kimga |
|--------|-----|-------|
| GET | /articles | PUBLIC (FREE) / USER+ (FREE+PREMIUM) |
| GET | /articles/:slug | PUBLIC (FREE) / USER+ (FREE+PREMIUM) |
| POST | /articles | ADMIN+ |
| PUT | /articles/:id | ADMIN+ (faqat o'ziniki) |
| DELETE | /articles/:id | ADMIN+ (faqat o'ziniki) |
| PUT | /articles/:id/publish | ADMIN+ |
| PUT | /articles/:id/archive | ADMIN+ |
| GET | /articles/my | ADMIN+ |
| GET | /articles/my/analytics | ADMIN+ |

> ⚠️ **MUHIM:** Controller'da `/articles/my` route'lari `/articles/:slug` dan **OLDIN** e'lon qilinishi shart — aks holda Nest `"my"` ni slug deb oladi.
> `GET /articles/:slug` da `viewCount++` va `ArticleView` ga yozuv qo'shiladi.
### Categories
| Method | URL | Kimga |
|--------|-----|-------|
| GET | /categories | PUBLIC |
| POST | /categories | SUPERADMIN |
| PUT | /categories/:id | SUPERADMIN |
| DELETE | /categories/:id | SUPERADMIN |
### Comments
| Method | URL | Kimga |
|--------|-----|-------|
| GET | /articles/:slug/comments | PUBLIC |
| POST | /articles/:slug/comments | USER+ |
| POST | /comments/:id/reply | USER+ |
| PUT | /comments/:id | USER+ (o'ziniki, isEdited=true) |
| DELETE | /comments/:id | USER+ (o'ziniki) |
| POST | /comments/:id/report | USER+ |
| DELETE | /comments/:id/admin | ADMIN+ |
| GET | /comments/reported | ADMIN+ |
### Likes
| Method | URL | Kimga |
|--------|-----|-------|
| POST | /articles/:id/like | USER+ (toggle) |
### Saved Articles
| Method | URL | Kimga |
|--------|-----|-------|
| POST | /articles/:id/save | USER+ (toggle) |
| GET | /users/me/saved | USER+ |
### Reading Progress
| Method | URL | Kimga |
|--------|-----|-------|
| POST | /articles/:id/progress | USER+ |
| GET | /users/me/reading | USER+ |
| DELETE | /articles/:id/progress | USER+ |
### Notifications
| Method | URL | Kimga |
|--------|-----|-------|
| GET | /notifications | USER+ |
| PUT | /notifications/:id/read | USER+ |
| PUT | /notifications/read-all | USER+ |
### Upload
| Method | URL | Kimga |
|--------|-----|-------|
| POST | /upload/avatar | USER+ |
| POST | /upload/article-image | ADMIN+ |
| POST | /upload/cover | ADMIN+ |
### Admin
| Method | URL | Kimga |
|--------|-----|-------|
| POST | /admin/create-admin | SUPERADMIN |
| GET | /admin/admins | SUPERADMIN |
| PUT | /admin/admins/:id/deactivate | SUPERADMIN |
| GET | /admin/stats | SUPERADMIN |
### Health
| Method | URL | Kimga |
|--------|-----|-------|
| GET | /health | PUBLIC (DB + Redis holati, `@nestjs/terminus`) |
---
## 11. Fayl Saqlash (Local Storage)
- **Kutubxona:** Multer (NestJS built-in)
- **Joylashuv:** `/uploads/{type}/{uuid}.{ext}`
- **Papkalar:** `uploads/avatars/`, `uploads/covers/`, `uploads/articles/`
- **Max hajm:** 5MB
- **Ruxsat etilgan formatlar:** jpg, jpeg, png, webp
- **URL:** `http://domain.com/uploads/avatars/abc123.jpg` (static serve)
- **Kelajakda:** Cloudinary yoki S3 ga o'tkazish uchun `UploadService` abstractlangan holda yoziladi
---
## 12. Redis da nima saqlanadi
```
otp:{email}              → OTP kodi           TTL: 180 sekund
otp:attempts:{email}     → Noto'g'ri urinishlar TTL: 3 soat (3 marta xato bo'lsa blok)
otp:cooldown:{email}     → Yangi OTP so'rash   TTL: 60 sekund
reset:{email}            → Parol reset tokeni  TTL: 600 sekund (verify-reset-otp dan keyin yoziladi, reset-password da o'chiriladi)
```
---
## 13. BullMQ Queue
**Faqat email yuborish uchun ishlatiladi:**
- Queue nomi: `mail`
- Job turlari: `otp-verification`, `otp-reset`
- Processor: `mail.processor.ts`
- Template engine: Handlebars (`.hbs`)
- Template fayllar: `src/mail/templates/`
---
## 14. WebSocket (Socket.IO)
- `NotificationsGateway` — `src/modules/notifications/notifications.gateway.ts`
- User kirganida o'z `userId` bo'yicha room ga qo'shiladi
- Yangi notification yaratilganda `server.to(userId).emit('notification', data)` chaqiriladi
- Frontend `socket.on('notification', handler)` bilan tinglaydi
---
## 15. .env o'zgaruvchilari
```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/maqolalar
JWT_ACCESS_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES=30d
REDIS_HOST=localhost
REDIS_PORT=6379
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@gmail.com
MAIL_PASS=...
MAIL_FROM="Maqolalar <your@gmail.com>"
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880
OTP_TTL=180
OTP_MAX_ATTEMPTS=3
OTP_COOLDOWN=60
RESET_TOKEN_TTL=600
THROTTLE_TTL=60
THROTTLE_LIMIT=100
# CORS uchun ruxsat etilgan originlar (vergul bilan)
FRONTEND_URLS=http://localhost:3001,http://localhost:3002
```
---
## 15.5. Domen va papka arxitekturasi

Loyiha 3 ta alohida ilova sifatida quriladi (xavfsizlik — admin panel alohida subdomen ostida izolyatsiya qilinadi):

```
maqolalar/
├── backend/      → api.sayt.uz      (NestJS — bitta API hammaga xizmat qiladi)
├── frontend/     → sayt.uz          (Next.js, SSR — SEO uchun)
└── admin/        → admin.sayt.uz    (Next.js, SSR shart emas)
```

**Xavfsizlik qoidalari:**
- CORS: backend faqat `sayt.uz` va `admin.sayt.uz` originlariga ruxsat beradi (`FRONTEND_URLS` env — vergul bilan ajratilgan ro'yxat)
- Cookie: refresh token cookie'si `.sayt.uz` ga EMAS, har bir origin o'zinikiga qo'yiladi (subdomen izolyatsiyasi buzilmasin)
- admin.sayt.uz: `robots.txt` disallow + `noindex` meta — qidiruvda chiqmaydi
- Admin login: backend `role: USER` qaytarsa, admin front sessiya yaratmaydi
- Keyinchalik (ixtiyoriy): admin subdomen uchun IP allowlist
- API client va TS turlar hozircha ikkala frontend'da nusxa; keyin monorepo `shared/` ga chiqarilishi mumkin

---
## 16. Loyiha holati — nima qilingan, nima qolgan
### Qilingan ✅
- Loyiha arxitekturasi to'liq rejalashtirilgan
- Barcha rollar va huquqlar aniqlangan
- Barcha funksiyalar aniqlangan
- DB sxemasi yozilgan (`schema.prisma`)
- NestJS modullar strukturasi aniqlangan
- Barcha API endpointlar aniqlangan
- Texnik qarorlar qabul qilingan
- Struktura review qilindi va yaxshilandi (2026-06-10): searchText/excerpt/viewCount/ArticleView qo'shildi, ArticleImage olib tashlandi, RefreshToken hash'landi, indekslar, comment edit, health/Swagger/Throttler/pino/docker-compose qo'shildi
### Qolgan ⏳
- NestJS loyihasini `nest new` bilan yaratish
- Prisma migration ishlatish
- Har bir modulni kod bilan yozish (auth dan boshlab)
- Frontend (Next.js) ni yaratish
- Docker / deployment konfiguratsiyasi
### Tavsiya etilgan tartib
1. `nest new maqolalar-backend`
2. Prisma, Redis, BullMQ, Passport, JWT paketlarini o'rnatish
3. `auth` moduli (register → OTP → login → refresh → logout)
4. `users` moduli
5. `articles` moduli
6. `categories` moduli
7. `comments` moduli
8. `likes`, `saved-articles`, `reading-progress` modullari
9. `notifications` moduli + WebSocket
10. `upload` moduli
11. `admin` moduli
12. Seed fayl (SuperAdmin yaratish)
13. Global guard, filter, interceptor
14. Next.js frontend
---
## 17. Muhim texnik qarorlar va sabablari
| Qaror | Sabab |
|-------|-------|
| OTP Redis da saqlanadi (DB emas) | TTL avtomatik o'chiradi, cron job shart emas |
| Refresh Token DB da saqlanadi (Redis emas) | Server restart da o'chib ketmaydi, revoke qilish mumkin |
| File storage local (Cloudinary/S3 emas) | Pullik servislar kerak emas, kichik loyiha uchun yetarli |
| UploadService abstracted | Kelajakda cloud ga o'tkazish oson bo'lsin |
| Comment soft delete | Reply lar saqlanib qolsin, "deleted" ko'rinishida chiqsin |
| Article content Json tip | Tiptap JSON format, render qilish oson |
| Slug unique | SEO uchun, ID o'rniga URL da chiroyli ko'rinadi |
| Next.js frontend | SSR — maqolalar Google da indekslansin |
| BullMQ faqat email uchun | Notification in-app (DB + WebSocket), email emas |
| SuperAdmin faqat seeder | UI dan yaratish xavfli |
| RefreshToken hash'lab saqlanadi (SHA-256) | DB sizib chiqsa ham sessiyalar o'g'irlanmaydi |
| ArticleImage jadvali olib tashlandi | Rasm URL'lari Tiptap content (Json) ichida — alohida jadval dublikat edi |
| searchText alohida ustun | Json ichidan qidirish samarasiz; keyinchalik tsvector ga o'tish oson |
| viewCount + ArticleView | Tezkor counter + batafsil (kunlik/oylik, unique) statistika manbasi |
| Route tartibi: /articles/my OLDIN | NestJS :slug bilan to'qnashuvni oldini olish |
| Swagger, Throttler, pino, health check | API hujjat, global himoya, kuzatuv, monitoring |
| Docker Compose | PostgreSQL + Redis + app bir buyruqda ko'tariladi |
