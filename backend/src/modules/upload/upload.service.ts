import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { uploadRoot } from './multer.config';

/**
 * Fayl saqlash xizmati. Hozir — local disk.
 * Kelajakda Cloudinary/S3 ga o'tkazish uchun shu servis abstraktlangan:
 * faqat `toUrl()` va papka boshqaruvi shu yerda — controller storage detalini bilmaydi.
 */
@Injectable()
export class UploadService {
  private readonly subdirs = ['avatars', 'covers', 'articles'];

  constructor(private readonly config: ConfigService) {
    // Yuklash papkalari mavjudligini ta'minlaymiz (start paytida)
    for (const sub of this.subdirs) {
      const dir = join(uploadRoot(), sub);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /** Yuklangan faylning to'liq public URL'ini yasaydi. */
  toUrl(subdir: string, filename: string): string {
    const base = (
      this.config.get<string>('APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    return `${base}/uploads/${subdir}/${filename}`;
  }
}
