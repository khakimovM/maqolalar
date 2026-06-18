import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Global JWT guard.
 *
 * @Public() endpointlar: token MAJBURIY EMAS, lekin yuborilgan bo'lsa
 * o'qiladi va request.user to'ldiriladi. Bu "optional auth" —
 * GET /articles da mehmon faqat FREE ko'radi, kirgan user PREMIUM ham.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isPublic) {
      return (await super.canActivate(context)) as boolean;
    }

    // Public endpoint: token bo'lsa o'qiymiz, xato/yo'q bo'lsa — mehmon
    try {
      await super.canActivate(context);
    } catch {
      // token yo'q yoki yaroqsiz — request.user = undefined bo'lib qoladi
    }
    return true;
  }
}
