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
import { multerOptions } from './multer.config';
import { MulterExceptionFilter } from './multer-exception.filter';
import { Roles } from '../../common/decorators/roles.decorator';

/** Yuklangan fayl tipini sodda ifodalash (Express.Multer.File). */
type UploadedImage = { filename: string };

@Controller('upload')
@UseFilters(MulterExceptionFilter)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  /** Avatar yuklash. Har qanday kirgan foydalanuvchi. */
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', multerOptions('avatars')))
  uploadAvatar(@UploadedFile() file?: UploadedImage) {
    return this.respond('avatars', file);
  }

  /** Maqola muqovasi. ADMIN+ */
  @Roles(Role.ADMIN)
  @Post('cover')
  @UseInterceptors(FileInterceptor('file', multerOptions('covers')))
  uploadCover(@UploadedFile() file?: UploadedImage) {
    return this.respond('covers', file);
  }

  /** Maqola ichidagi rasm (Tiptap editor). ADMIN+ */
  @Roles(Role.ADMIN)
  @Post('article-image')
  @UseInterceptors(FileInterceptor('file', multerOptions('articles')))
  uploadArticleImage(@UploadedFile() file?: UploadedImage) {
    return this.respond('articles', file);
  }

  private respond(subdir: string, file?: UploadedImage) {
    if (!file) {
      throw new BadRequestException('Fayl yuborilmadi (maydon nomi: file)');
    }
    return {
      data: { url: this.uploadService.toUrl(subdir, file.filename) },
      message: 'Fayl yuklandi',
    };
  }
}
