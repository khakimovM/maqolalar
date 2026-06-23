import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import * as Sentry from '@sentry/node';

/**
 * Server xatolarini (5xx / noma'lum) Sentry'ga yuboradi.
 * 4xx (mijoz xatolari — validatsiya, 401, 404) yuborilmaydi — ular shovqin.
 * SENTRY_DSN o'rnatilmagan bo'lsa, captureException no-op (xavfsiz).
 */
@Injectable()
export class SentryInterceptor implements NestInterceptor {
  intercept(_ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      tap({
        error: (err: unknown) => {
          const status =
            err instanceof HttpException ? err.getStatus() : 500;
          if (status >= 500) {
            Sentry.captureException(err);
          }
        },
      }),
    );
  }
}
