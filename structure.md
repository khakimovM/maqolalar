# Maqolalar — NestJS Loyiha Strukturasi

## Umumiy ko'rinish

```
maqolalar-backend/
│
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   │
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── articles/
│   │   ├── categories/
│   │   ├── comments/
│   │   ├── likes/
│   │   ├── saved-articles/
│   │   ├── reading-progress/
│   │   ├── notifications/
│   │   ├── upload/
│   │   ├── admin/
│   │   └── health/               ← GET /health (monitoring)
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── guards/
│   │   ├── filters/
│   │   ├── interceptors/
│   │   ├── pipes/
│   │   └── utils/
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── jwt.config.ts
│   │   ├── redis.config.ts
│   │   ├── mail.config.ts
│   │   └── database.config.ts
│   │
│   ├── database/
│   │   ├── prisma.service.ts
│   │   └── seed.ts               ← SuperAdmin shu yerda yaratiladi
│   │
│   ├── redis/
│   │   └── redis.service.ts      ← OTP, rate limit, cache
│   │
│   └── mail/
│       ├── mail.module.ts
│       ├── mail.service.ts       ← Nodemailer
│       ├── mail.processor.ts     ← BullMQ worker
│       └── templates/
│           ├── otp-verification.hbs
│           └── otp-reset.hbs
│
├── uploads/                      ← Local storage
│   ├── avatars/
│   ├── covers/
│   └── articles/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── .env
├── .env.example
├── docker-compose.yml            ← PostgreSQL + Redis + app
└── package.json
```

---

## Modullar va ularning vazifalari

---

### `auth` moduli
Autentifikatsiya bilan bog'liq hamma narsa.

```
auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts           ← Access token tekshiradi
│   ├── jwt-refresh.strategy.ts   ← Refresh token tekshiradi
│   ├── google.strategy.ts        ← OAuth Google
│   └── github.strategy.ts        ← OAuth GitHub
└── dto/
    ├── register.dto.ts
    ├── login.dto.ts
    ├── verify-otp.dto.ts
    ├── resend-otp.dto.ts
    ├── forgot-password.dto.ts
    └── reset-password.dto.ts
```

**Endpointlar:**
| Method | URL | Vazifa |
|--------|-----|--------|
| POST | /auth/register | Ro'yxatdan o'tish → OTP yuboradi |
| POST | /auth/verify-email | OTP tekshiradi → account faollashtiradi |
| POST | /auth/resend-otp | Yangi OTP yuboradi |
| POST | /auth/login | Kirish → access + refresh token |
| POST | /auth/refresh | Yangi access token olish |
| POST | /auth/logout | Refresh tokenni o'chiradi |
| POST | /auth/forgot-password | Reset OTP yuboradi |
| POST | /auth/verify-reset-otp | Reset OTP tekshiradi |
| POST | /auth/reset-password | Yangi parol o'rnatadi |
| GET  | /auth/google | Google OAuth boshlaydi |
| GET  | /auth/google/callback | Google callback |
| GET  | /auth/github | GitHub OAuth boshlaydi |
| GET  | /auth/github/callback | GitHub callback |

---

### `users` moduli
User profil boshqaruvi.

```
users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
└── dto/
    ├── update-profile.dto.ts
    └── change-password.dto.ts
```

**Endpointlar:**
| Method | URL | Vazifa | Rol |
|--------|-----|--------|-----|
| GET | /users/me | O'z profilini ko'rish | USER+ |
| PUT | /users/me | Profil tahrirlash (username, avatar) | USER+ |
| PUT | /users/me/password | Parol o'zgartirish | USER+ |

---

### `articles` moduli
Maqolalar CRUD va qidiruv.

```
articles/
├── articles.module.ts
├── articles.controller.ts
├── articles.service.ts
└── dto/
    ├── create-article.dto.ts
    ├── update-article.dto.ts
    └── article-query.dto.ts      ← filter, search, pagination
```

**Endpointlar:**
| Method | URL | Vazifa | Rol |
|--------|-----|--------|-----|
| GET | /articles | Maqolalar ro'yxati (filter, search, pagination) | PUBLIC/USER |
| GET | /articles/:slug | Bitta maqola | PUBLIC/USER |
| POST | /articles | Yangi maqola yaratish | ADMIN+ |
| PUT | /articles/:id | Maqolani tahrirlash | ADMIN+ (o'ziniki) |
| DELETE | /articles/:id | Maqolani o'chirish | ADMIN+ (o'ziniki) |
| PUT | /articles/:id/publish | Draft → Published | ADMIN+ |
| PUT | /articles/:id/archive | Published → Archived | ADMIN+ |
| GET | /articles/my | O'zining maqolalari (dashboard) | ADMIN+ |
| GET | /articles/my/analytics | Maqolalar statistikasi | ADMIN+ |

> **Eslatma:** Ro'yxatdan o'tmagan user faqat FREE maqolalarni ko'radi.
> USER bo'lsa FREE + PREMIUM maqolalarni ko'radi.
> PUBLISHED bo'lgan maqolalar chiqadi, DRAFT va ARCHIVED chiqmaydi.

> ⚠️ **MUHIM — route tartibi:** Controller'da `GET /articles/my` va `GET /articles/my/analytics` route'lari `GET /articles/:slug` dan **OLDIN** e'lon qilinishi SHART. Aks holda Nest `"my"` ni slug deb qabul qiladi.

> **Slug to'qnashuvi:** slug mavjud bo'lsa `-2`, `-3` suffix qo'shiladi (`python-asoslari-2`).

> **View hisobi:** `GET /articles/:slug` da `viewCount++` va `ArticleView` jadvaliga yozuv qo'shiladi (userId yoki ipHash bilan).

> **searchText:** create/update da Tiptap Json'dan plain text extract qilinib `searchText` ustuniga yoziladi — qidiruv shu ustun bo'yicha ishlaydi.

---

### `categories` moduli
Maqola kategoriyalari.

```
categories/
├── categories.module.ts
├── categories.controller.ts
├── categories.service.ts
└── dto/
    └── create-category.dto.ts
```

**Endpointlar:**
| Method | URL | Vazifa | Rol |
|--------|-----|--------|-----|
| GET | /categories | Barcha kategoriyalar | PUBLIC |
| POST | /categories | Yangi kategoriya | SUPERADMIN |
| PUT | /categories/:id | Kategoriya tahrirlash | SUPERADMIN |
| DELETE | /categories/:id | Kategoriya o'chirish | SUPERADMIN |

---

### `comments` moduli
Commentlar va nested replies.

```
comments/
├── comments.module.ts
├── comments.controller.ts
├── comments.service.ts
└── dto/
    ├── create-comment.dto.ts
    └── report-comment.dto.ts
```

**Endpointlar:**
| Method | URL | Vazifa | Rol |
|--------|-----|--------|-----|
| GET | /articles/:slug/comments | Maqola commentlari | PUBLIC |
| POST | /articles/:slug/comments | Comment yozish | USER+ |
| POST | /comments/:id/reply | Commentga javob | USER+ |
| PUT | /comments/:id | O'z commentini tahrirlash (isEdited=true) | USER+ |
| DELETE | /comments/:id | O'z commentini o'chirish | USER+ |
| POST | /comments/:id/report | Spam deb belgilash | USER+ |
| DELETE | /comments/:id/admin | Istalgan commentni o'chirish | ADMIN+ |
| GET | /comments/reported | Spam belgilangan commentlar | ADMIN+ |

---

### `likes` moduli
Maqolaga layk bosish/olib tashlash.

```
likes/
├── likes.module.ts
├── likes.controller.ts
└── likes.service.ts
```

**Endpointlar:**
| Method | URL | Vazifa | Rol |
|--------|-----|--------|-----|
| POST | /articles/:id/like | Layk bosish / olib tashlash (toggle) | USER+ |

---

### `saved-articles` moduli
Maqolalarni saqlash.

```
saved-articles/
├── saved-articles.module.ts
├── saved-articles.controller.ts
└── saved-articles.service.ts
```

**Endpointlar:**
| Method | URL | Vazifa | Rol |
|--------|-----|--------|-----|
| POST | /articles/:id/save | Saqlash / olib tashlash (toggle) | USER+ |
| GET | /users/me/saved | Saqlangan maqolalar | USER+ |

---

### `reading-progress` moduli
O'qish joyini belgilash.

```
reading-progress/
├── reading-progress.module.ts
├── reading-progress.controller.ts
├── reading-progress.service.ts
└── dto/
    └── save-progress.dto.ts
```

**Endpointlar:**
| Method | URL | Vazifa | Rol |
|--------|-----|--------|-----|
| POST | /articles/:id/progress | O'qish joyini saqlash (upsert) | USER+ |
| GET | /users/me/reading | Davom ettirilayotgan maqolalar | USER+ |
| DELETE | /articles/:id/progress | Belgini o'chirish | USER+ |

---

### `notifications` moduli
Bildirishnomalar.

```
notifications/
├── notifications.module.ts
├── notifications.controller.ts
├── notifications.service.ts
└── notifications.gateway.ts     ← WebSocket (Socket.IO)
```

**Endpointlar:**
| Method | URL | Vazifa | Rol |
|--------|-----|--------|-----|
| GET | /notifications | O'z bildirishnomalarini ko'rish | USER+ |
| PUT | /notifications/:id/read | O'qildi deb belgilash | USER+ |
| PUT | /notifications/read-all | Hammasini o'qildi | USER+ |

**WebSocket event:**
```
ws://domain/notifications → "notification" event
```

---

### `upload` moduli
Fayl yuklash (local storage).

```
upload/
├── upload.module.ts
├── upload.controller.ts
└── upload.service.ts
```

**Endpointlar:**
| Method | URL | Vazifa | Rol |
|--------|-----|--------|-----|
| POST | /upload/avatar | Avatar yuklash | USER+ |
| POST | /upload/article-image | Maqola uchun rasm | ADMIN+ |
| POST | /upload/cover | Maqola muqovasi | ADMIN+ |

> Fayllar `/uploads/{type}/{uuid}.{ext}` formatida saqlanadi.
> `/uploads` papkasi `ServeStaticModule` (`@nestjs/serve-static`) orqali tashqariga ochiladi — `app.module.ts` da sozlanadi.

---

### `admin` moduli
SuperAdmin panel uchun.

```
admin/
├── admin.module.ts
├── admin.controller.ts
├── admin.service.ts
└── dto/
    └── create-admin.dto.ts
```

**Endpointlar:**
| Method | URL | Vazifa | Rol |
|--------|-----|--------|-----|
| POST | /admin/create-admin | Yangi admin yaratish | SUPERADMIN |
| GET | /admin/admins | Adminlar ro'yxati | SUPERADMIN |
| PUT | /admin/admins/:id/deactivate | Adminni bloklash | SUPERADMIN |
| GET | /admin/stats | Umumiy statistika | SUPERADMIN |

**Stats parametrlari:** `?period=daily|monthly|yearly` yoki `?from=2025-01-01&to=2025-06-01`

---

## Common qism

```
common/
├── decorators/
│   ├── current-user.decorator.ts     ← @CurrentUser()
│   ├── roles.decorator.ts            ← @Roles(Role.ADMIN)
│   └── public.decorator.ts           ← @Public() — JWT o'tkazib yuboradi
│
├── guards/
│   ├── jwt-auth.guard.ts             ← Global guard
│   └── roles.guard.ts                ← Rol tekshiradi
│
├── filters/
│   └── http-exception.filter.ts      ← Barcha xatolarni bir formatda qaytaradi
│
├── interceptors/
│   └── response.interceptor.ts       ← Javobni { data, message } formatga o'giradi
│
└── pipes/
    └── validation.pipe.ts            ← Global DTO validation
```

---

## Qo'shimcha infratuzilma

### `health` moduli
| Method | URL | Vazifa | Rol |
|--------|-----|--------|-----|
| GET | /health | DB + Redis holatini tekshiradi (`@nestjs/terminus`) | PUBLIC |

### Swagger
- `@nestjs/swagger` — barcha endpointlar hujjatlanadi
- URL: `/api/docs` (faqat development da ochiq)

### Global rate limit
- `@nestjs/throttler` — global: 100 req / 60 sekund (har bir IP uchun)
- Auth endpointlarida qattiqroq limit: 10 req / 60 sekund
- OTP'ning o'z Redis limitlari alohida ishlaydi

### Logging
- `nestjs-pino` — structured JSON log
- Har bir request: method, url, statusCode, responseTime
- Production'da log fayl yoki stdout (Docker)

### Reset token (parol tiklash)
- `POST /auth/verify-reset-otp` muvaffaqiyatli bo'lsa: random token generatsiya qilinadi
- Redis: `reset:{email}` → token, TTL 600 sekund (10 daqiqa)
- `POST /auth/reset-password` shu token bilan keladi → tekshiriladi → parol yangilanadi → key o'chiriladi

### RefreshToken xavfsizligi
- Plain token DB ga yozilMAYDI — `tokenHash = SHA-256(token)` saqlanadi
- Refresh so'rovida kelgan token hash qilinib DB dan qidiriladi

---

## .env tuzilmasi

```env
# App
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/maqolalar

# JWT
JWT_ACCESS_SECRET=...
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRES=30d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Mail
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@gmail.com
MAIL_PASS=...
MAIL_FROM="Maqolalar <your@gmail.com>"

# OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback

# Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=5242880   # 5MB

# OTP
OTP_TTL=180             # 3 daqiqa (sekund)
OTP_MAX_ATTEMPTS=3
OTP_COOLDOWN=60         # 1 daqiqa

# Reset token
RESET_TOKEN_TTL=600     # 10 daqiqa (sekund)

# Rate limit (global)
THROTTLE_TTL=60
THROTTLE_LIMIT=100

# Frontend URL (CORS uchun)
FRONTEND_URL=http://localhost:3001
```
