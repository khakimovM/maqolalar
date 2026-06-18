import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { MulterError } from 'multer';
import { maxFileSize } from './multer.config';

/**
 * Multer xatolarini toza 400 ga aylantiradi (aks holda 500 bo'lar edi).
 * Eng muhimi — hajm limiti oshganda tushunarli xabar.
 */
@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const mb = (maxFileSize() / (1024 * 1024)).toFixed(0);

    const message =
      exception.code === 'LIMIT_FILE_SIZE'
        ? `Fayl hajmi ${mb}MB dan oshmasligi kerak`
        : `Fayl yuklashda xato: ${exception.message}`;

    res.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      message,
      data: null,
    });
  }
}
