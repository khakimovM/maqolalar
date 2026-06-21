import { ConfigService } from '@nestjs/config';

/**
 * Majburiy env o'zgaruvchini oladi. Yo'q (yoki bo'sh) bo'lsa — xato tashlaydi,
 * shunda ilova ishga tushmaydi (fail-fast). Maxfiy kalitlar uchun bashorat
 * qilinadigan fallback ishlatishdan saqlanish maqsadida.
 */
export function requireConfig(config: ConfigService, key: string): string {
  const value = config.get<string>(key);
  if (!value) {
    throw new Error(
      `Muhim env o'zgaruvchi topilmadi: ${key}. Uni .env faylga qo'shing.`,
    );
  }
  return value;
}
