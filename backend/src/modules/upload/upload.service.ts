import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { uploadRoot } from './multer.config';

type ImageFormat = 'jpeg' | 'png' | 'webp';

/** Juda katta rasmlarni (decompression bomba) cheklash uchun maksimal o'lcham. */
const MAX_DIMENSION = 2400;

// sharp ixtiyoriy (native paket). O'rnatilgan bo'lsa — qayta kodlash ishlaydi,
// bo'lmasa — kamida magic-byte tekshiruvi va xavfsiz kengaytma bilan saqlanadi.
// undefined = hali urinilmagan, null = mavjud emas.
let sharpModule: unknown | null | undefined;

async function loadSharp(): Promise<((...a: unknown[]) => unknown) | null> {
  if (sharpModule !== undefined) {
    return sharpModule as ((...a: unknown[]) => unknown) | null;
  }
  try {
    const mod = (await import('sharp')) as { default?: unknown };
    sharpModule = (mod.default ?? mod) as unknown;
  } catch {
    sharpModule = null;
  }
  return sharpModule as ((...a: unknown[]) => unknown) | null;
}

/**
 * Faylning HAQIQIY turini birinchi baytlari (magic bytes) bo'yicha aniqlaydi.
 * Client MIME yoki originalname'ga ishonmaydi.
 */
function sniffImage(buf: Buffer): ImageFormat | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buf.subarray(0, 8).equals(png)) return 'png';
  // WEBP: "RIFF"...."WEBP"
  if (
    buf.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buf.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'webp';
  }
  return null;
}

/**
 * Fayl saqlash xizmati. Hozir — local disk.
 * Kelajakda Cloudinary/S3 ga o'tkazish uchun abstraktlangan: faqat
 * saqlash mantig'i va `toUrl()` shu yerda; controller storage detalini bilmaydi.
 */
@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
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

  /**
   * Rasmni xavfsiz saqlaydi:
   *   1) magic-byte bilan haqiqiy turini aniqlaydi (MIME/kengaytmaga ishonmaydi);
   *   2) sharp mavjud bo'lsa qayta kodlaydi — EXIF/metadata tozalanadi,
   *      polyglot (rasm+skript) fayllar zararsizlantiriladi, o'lcham cheklanadi;
   *   3) kengaytma KONTENTDAN olinadi (.jpg/.png/.webp) — stored-XSS oldini oladi.
   */
  async saveImage(subdir: string, buffer?: Buffer): Promise<string> {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException("Fayl yuborilmadi yoki bo'sh");
    }

    const format = sniffImage(buffer);
    if (!format) {
      throw new BadRequestException(
        "Noto'g'ri yoki buzuq rasm fayli (jpg, png, webp qabul qilinadi)",
      );
    }

    const ext = format === 'jpeg' ? 'jpg' : format;
    const filename = `${randomUUID()}.${ext}`;
    const dir = join(uploadRoot(), subdir);

    const sharp = await loadSharp();
    let out: Buffer = buffer;

    if (sharp) {
      try {
        const pipeline = (
          sharp(buffer, { animated: true, failOn: 'error' }) as any
        )
          .rotate() // EXIF orientatsiyasini qo'llaydi va metadata'ni tozalaydi
          .resize({
            width: MAX_DIMENSION,
            height: MAX_DIMENSION,
            fit: 'inside',
            withoutEnlargement: true,
          });

        if (format === 'jpeg') {
          out = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
        } else if (format === 'png') {
          out = await pipeline.png({ compressionLevel: 9 }).toBuffer();
        } else {
          out = await pipeline.webp({ quality: 82 }).toBuffer();
        }
      } catch (e) {
        // sharp qayta kodlay olmasa (buzuq rasm) — rad etamiz
        this.logger.warn(
          `Rasmni qayta kodlab bo'lmadi: ${e instanceof Error ? e.message : e}`,
        );
        throw new BadRequestException('Rasmni qayta ishlab bo\'lmadi');
      }
    }

    await writeFile(join(dir, filename), out);
    return this.toUrl(subdir, filename);
  }

  /** Yuklangan faylning to'liq public URL'ini yasaydi. */
  toUrl(subdir: string, filename: string): string {
    const base = (
      this.config.get<string>('APP_URL') ?? 'http://localhost:3000'
    ).replace(/\/+$/, '');
    return `${base}/uploads/${subdir}/${filename}`;
  }
}
