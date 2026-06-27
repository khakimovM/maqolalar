import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { UploadService } from './upload.service';
import { multerOptions, multerCslOptions } from './multer.config';
import { MulterExceptionFilter } from './multer-exception.filter';
import { Roles } from '../../common/decorators/roles.decorator';

/** Yuklangan fayl (memoryStorage — buffer mavjud). */
type UploadedImage = { buffer: Buffer; mimetype: string; originalname: string };

@Controller('upload')
@UseFilters(MulterExceptionFilter)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /** Avatar yuklash. Har qanday kirgan foydalanuvchi. */
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', multerOptions()))
  uploadAvatar(@UploadedFile() file?: UploadedImage) {
    return this.respond('avatars', file);
  }

  /** Maqola muqovasi. ADMIN+ */
  @Roles(Role.ADMIN)
  @Post('cover')
  @UseInterceptors(FileInterceptor('file', multerOptions()))
  uploadCover(@UploadedFile() file?: UploadedImage) {
    return this.respond('covers', file);
  }

  /** Maqola ichidagi rasm (Tiptap editor). ADMIN+ */
  @Roles(Role.ADMIN)
  @Post('article-image')
  @UseInterceptors(FileInterceptor('file', multerOptions()))
  uploadArticleImage(@UploadedFile() file?: UploadedImage) {
    return this.respond('articles', file);
  }

  /** Maqola iqtibos uslubi (.csl). ADMIN+ */
  @Roles(Role.ADMIN)
  @Post('citation-style')
  @UseInterceptors(FileInterceptor('file', multerCslOptions()))
  async uploadCitationStyle(@UploadedFile() file?: { buffer: Buffer }) {
    if (!file) {
      throw new BadRequestException('Fayl yuborilmadi (maydon nomi: file)');
    }
    const url = await this.uploadService.saveCsl(file.buffer);
    return { data: { url }, message: 'Iqtibos uslubi yuklandi' };
  }

  private async respond(subdir: string, file?: UploadedImage) {
    if (!file) {
      throw new BadRequestException('Fayl yuborilmadi (maydon nomi: file)');
    }
    const url = await this.uploadService.saveImage(subdir, file.buffer);
    return { data: { url }, message: 'Fayl yuklandi' };
  }
}
