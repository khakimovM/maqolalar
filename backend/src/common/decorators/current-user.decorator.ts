import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Controller'da joriy userni olish:
 *   me(@CurrentUser() user)         → butun user obyekti
 *   me(@CurrentUser('id') id)       → faqat id
 */
export const CurrentUser = createParamDecorator(
  (field: string | undefined, ctx: ExecutionContext) => {
    const user = ctx.switchToHttp().getRequest().user;
    return field ? user?.[field] : user;
  },
);
