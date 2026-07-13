# ============ Builder ============
FROM node:22-alpine AS builder
WORKDIR /app

# Avval faqat manifestlar — layer cache uchun
COPY package*.json ./
RUN npm ci

# Prisma client generatsiyasi (schema o'zgarmasa cache'da qoladi)
COPY prisma ./prisma
RUN npx prisma generate

# Qolgan manba + build
COPY . .
RUN npm run build

# ============ Runner ============
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Backup uchun pg_dump (postgres 16 mijozi) — tar/gzip alpine bilan keladi
RUN apk add --no-cache postgresql16-client

# Builder'dan tayyor narsalarni node foydalanuvchisi egaligida ko'chiramiz.
# node_modules to'liq — ichida prisma CLI ham bor (migrate deploy uchun).
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --chown=node:node package*.json ./

# Yuklangan fayllar + zaxiralar papkasi (volume bilan ulanadi), node yoza olishi uchun
RUN mkdir -p uploads backups && chown -R node:node uploads backups

# Xavfsizlik: konteyner root ostida emas, node foydalanuvchisi sifatida ishlaydi
USER node

EXPOSE 3000

# Start: avval migratsiyalarni qo'llaymiz, keyin serverni ishga tushiramiz
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
