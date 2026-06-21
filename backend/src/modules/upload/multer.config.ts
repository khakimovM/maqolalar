import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';

/** Ruxsat etilgan rasm MIME turlari (arzon birinchi filtr). */
export const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];

/** Max fayl hajmi (bayt). .env MAX_FILE_SIZE bo'lmasa — 5MB. */
export function maxFileSize(): number {
  return Number(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
}

/** Yuklash papkasining ildizi. .env UPLOAD_PATH bo'lmasa — ./uploads. */
export function uploadRoot(): string {
  return process.env.UPLOAD_PATH || './uploads';
}

/**
 * FileInterceptor uchun multer sozlamalari.
 *
 * Fayl DISKKA emas, XOTIRAGA (buffer) qabul qilinadi — shunda ishonchsiz
 * baytlar diskka tushishidan oldin magic-byte bilan tekshiriladi va
 * qayta kodlanadi (UploadService). MIME bu yerda faqat arzon birlamchi
 * filtr (uni soxtalashtirish mumkin, haqiqiy tekshiruv service'da).
 */
export function multerOptions() {
  return {
    storage: memoryStorage(),
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      cb: (error: Error | null, acceptFile: boolean) => void,
    ) => {
      if (ALLOWED_MIME.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(
          new BadRequestException(
            'Faqat rasm yuklash mumkin (jpg, jpeg, png, webp)',
          ),
          false,
        );
      }
    },
    limits: { fileSize: maxFileSize() },
  };
}
