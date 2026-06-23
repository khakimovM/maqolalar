import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';

/**
 * Rol ierarxiyasi (USER < ADMIN < SUPERADMIN) to'g'ri ishlashini tekshiradi.
 * Bu — permission matritsasining yuragi.
 */

function ctx(user: unknown): any {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  };
}

function guardWith(required: Role[] | undefined): RolesGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  } as unknown as Reflector;
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it("rol talab qilinmasa — har kim o'tadi", () => {
    expect(guardWith(undefined).canActivate(ctx(undefined))).toBe(true);
    expect(guardWith([]).canActivate(ctx({ role: Role.USER }))).toBe(true);
  });

  it("user yo'q bo'lsa — rad etiladi", () => {
    expect(guardWith([Role.ADMIN]).canActivate(ctx(undefined))).toBe(false);
  });

  it('USER, ADMIN talab qilinsa — rad etiladi', () => {
    expect(guardWith([Role.ADMIN]).canActivate(ctx({ role: Role.USER }))).toBe(
      false,
    );
  });

  it("ADMIN, ADMIN talab qilinsa — o'tadi", () => {
    expect(guardWith([Role.ADMIN]).canActivate(ctx({ role: Role.ADMIN }))).toBe(
      true,
    );
  });

  it("SUPERADMIN, ADMIN talab qilinsa — o'tadi (ierarxiya)", () => {
    expect(
      guardWith([Role.ADMIN]).canActivate(ctx({ role: Role.SUPERADMIN })),
    ).toBe(true);
  });

  it("USER, USER talab qilinsa — o'tadi", () => {
    expect(guardWith([Role.USER]).canActivate(ctx({ role: Role.USER }))).toBe(
      true,
    );
  });

  it("ADMIN, SUPERADMIN talab qilinsa — rad etiladi", () => {
    expect(
      guardWith([Role.SUPERADMIN]).canActivate(ctx({ role: Role.ADMIN })),
    ).toBe(false);
  });
});
