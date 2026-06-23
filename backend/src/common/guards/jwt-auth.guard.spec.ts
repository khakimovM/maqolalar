import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';

/**
 * "Optional auth" mantig'i:
 *  - himoyalangan endpoint: token majburiy (super natijasi qaytariladi)
 *  - @Public endpoint: token bo'lsa o'qiladi, yo'q/yaroqsiz bo'lsa — mehmon (true)
 *
 * super.canActivate (passport mixin) prototip zanjirida mock qilinadi.
 */

function ctx(): any {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({}) }),
  };
}

function makeGuard(isPublic: boolean): JwtAuthGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;
  return new JwtAuthGuard(reflector);
}

// super.canActivate => JwtAuthGuard -> AuthGuard('jwt') mixin prototip
function spySuper(guard: JwtAuthGuard, impl: () => Promise<boolean>) {
  const mixinProto = Object.getPrototypeOf(Object.getPrototypeOf(guard));
  return jest
    .spyOn(mixinProto as { canActivate: () => Promise<boolean> }, 'canActivate')
    .mockImplementation(impl);
}

describe('JwtAuthGuard (optional-auth)', () => {
  afterEach(() => jest.restoreAllMocks());

  it('himoyalangan: super true qaytarsa — true', async () => {
    const g = makeGuard(false);
    spySuper(g, async () => true);
    await expect(g.canActivate(ctx())).resolves.toBe(true);
  });

  it('himoyalangan: token yaroqsiz bo\'lsa — xato ko\'tariladi', async () => {
    const g = makeGuard(false);
    spySuper(g, async () => {
      throw new Error('no token');
    });
    await expect(g.canActivate(ctx())).rejects.toThrow();
  });

  it('public + token bor: super o\'qiydi, natija true', async () => {
    const g = makeGuard(true);
    spySuper(g, async () => true);
    await expect(g.canActivate(ctx())).resolves.toBe(true);
  });

  it('public + token yo\'q/yaroqsiz: xato yutiladi, true (mehmon)', async () => {
    const g = makeGuard(true);
    spySuper(g, async () => {
      throw new Error('no token');
    });
    await expect(g.canActivate(ctx())).resolves.toBe(true);
  });
});
