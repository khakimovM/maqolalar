# Maqolalar

Ziyolilar uchun bilim platformasi — kimyo, matematika, qurilish va boshqa yo'nalishlarda chuqur, ishonchli maqolalar. Mutaxassislar yozadi, o'quvchilar o'qiydi.

Loyiha uchta mustaqil ilovadan iborat (monorepo):

| Papka | Vazifa | Port | Domen (reja) |
|-------|--------|------|--------------|
| `backend/` | NestJS API + WebSocket | 3000 | api.sayt.uz |
| `frontend/` | Public sayt (Next.js) | 3001 | sayt.uz |
| `admin/` | Boshqaruv paneli (Next.js) | 3002 | admin.sayt.uz |

## Texnologiyalar

**Backend:** NestJS 11, Prisma 6 (PostgreSQL), Redis (ioredis), BullMQ, Passport JWT, Socket.IO, Swagger, Pino.

**Frontend & Admin:** Next.js 16, React 19, Tailwind CSS v4, TanStack Query, Zustand, framer-motion, Tiptap (KaTeX bilan), next-themes.

## Asosiy imkoniyatlar

- Rollar: USER / ADMIN / SUPERADMIN
- Maqolalar: FREE / PREMIUM, DRAFT / PUBLISHED / ARCHIVED
- Auth: email + OTP tasdiqlash, Google/GitHub OAuth, parol tiklash
- Maqola muharriri: matematik formulalar (LaTeX/KaTeX), o'lchami o'zgartiriladigan + qirqiladigan rasmlar
- Saqlangan maqolalar, o'qish progressi, izohlar, layklar
- Real-time bildirishnomalar (WebSocket)
- Light / dark mode, A−/A+ shrift

## Ishga tushirish

Har bir ilovada `.env` faylini sozlang (`backend/.env.example` namunasi bor), so'ng:

```bash
# Backend
cd backend
npm install
npx prisma migrate dev      # yoki: npx prisma db push
npm run start:dev           # :3000

# Frontend (yangi terminal)
cd frontend
npm install
npm run dev                 # :3001

# Admin (yangi terminal)
cd admin
npm install
npm run dev                 # :3002
```

PostgreSQL va Redis ishlab turishi kerak (Redis uchun Docker mumkin).
Backend Swagger hujjati: `http://localhost:3000/api/docs`.

## Muhit o'zgaruvchilari

Maxfiy fayllar (`.env`, `.env.local`) Git'ga **yuklanmaydi**. Frontend va Admin uchun:

```
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Admin uchun qo'shimcha: `NEXT_PUBLIC_SITE_URL=http://localhost:3001`.
Backend uchun to'liq ro'yxat `backend/.env.example` da.
