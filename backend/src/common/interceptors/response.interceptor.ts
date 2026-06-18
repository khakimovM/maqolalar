import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Barcha muvaffaqiyatli javoblar bir formatda:
 * { statusCode, message, data }
 *
 * Service { data, message } qaytarsa — message ishlatiladi,
 * oddiy qiymat qaytarsa — message: "OK".
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((body) => {
        if (
          body &&
          typeof body === 'object' &&
          'data' in body &&
          'message' in body
        ) {
          return { statusCode, message: body.message, data: body.data };
        }
        return { statusCode, message: 'OK', data: body ?? null };
      }),
    );
  }
}
