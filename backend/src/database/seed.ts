/**
 * SuperAdmin yaratish — FAQAT shu fayl orqali, UI dan emas.
 * Ishga tushirish: npm run seed
 * Ma'lumotlar .env dan olinadi: SUPERADMIN_EMAIL / USERNAME / PASSWORD
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const username = process.env.SUPERADMIN_USERNAME;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !username || !password) {
    throw new Error(
      '.env da SUPERADMIN_EMAIL, SUPERADMIN_USERNAME, SUPERADMIN_PASSWORD to\'ldirilishi shart',
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`SuperAdmin allaqachon mavjud: ${email}`);
    return;
  }

  await prisma.user.create({
    data: {
      email,
      username,
      password: await bcrypt.hash(password, 12),
      role: 'SUPERADMIN',
      isVerified: true,
      isActive: true,
    },
  });

  console.log(`✅ SuperAdmin yaratildi: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
