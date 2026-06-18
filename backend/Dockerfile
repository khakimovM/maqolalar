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

# Builder'dan tayyor narsalarni olamiz (qayta build/generate shart emas).
# node_modules to'liq ko'chiriladi — ichida prisma CLI ham bor (migrate deploy uchun).
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

# Yuklangan fayllar uchun papka (volume bilan ulanadi)
RUN mkdir -p uploads

EXPOSE 3000

# Start: avval migratsiyalarni qo'llaymiz, keyin serverni ishga tushiramiz
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
