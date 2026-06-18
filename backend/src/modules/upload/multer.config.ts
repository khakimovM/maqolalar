import { BadRequestException } from '@nestjs/common';
import { diskStorage } from 'multer';
import { randomUUID } from 'crypto';
import { extname, join } from 'path';

/** Ruxsat etilgan rasm MIME turlari. */
export const ALLOWED_MIME = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

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
 * subdir — avatars | covers | articles.
 * Fayl `<uuid>.<ext>` nomi bilan diskka yoziladi.
 */
export function multerOptions(subdir: string) {
  return {
    storage: diskStorage({
      destination: join(uploadRoot(), subdir),
      filename: (_req, file, cb) => {
        const ext = extname(file.originalname).toLowerCase();
        cb(null, `${randomUUID()}${ext}`);
      },
    }),
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
            "Faqat rasm yuklash mumkin (jpg, jpeg, png, webp)",
          ),
          false,
        );
      }
    },
    limits: { fileSize: maxFileSize() },
  };
}
