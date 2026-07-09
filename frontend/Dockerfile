# Next.js frontend — build + start (yagona bosqich, ishonchli).
FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci

# NEXT_PUBLIC_* qiymatlari build paytida .env dan o'qiladi.
# Shuning uchun serverda frontend/.env faylini oldindan yarating.
COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3001
CMD ["npm", "run", "start"]
