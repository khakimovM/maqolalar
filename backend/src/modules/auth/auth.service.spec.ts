import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';

/**
 * AuthService unit testlari — Prisma/Redis/Mail/Jwt/Config mock qilingan.
 * Asosiy e'tibor: xavfsizlik mantig'i (login, refresh rotation + reuse
 * detection, step-up parol, email o'zgartirish ogohlantirishi).
 */
describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let redis: any;
  let mail: any;
  let jwt: any;
  let config: any;

  const future = new Date(Date.now() + 60_000);
  const past = new Date(Date.now() - 60_000);

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      refreshToken: {
        findUnique: jest.fn(),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn().mockResolvedValue({}),
      },
    };
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      ttl: jest.fn().mockResolvedValue(0),
      incr: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(undefined),
    };
    mail = {
      sendOtpVerification: jest.fn(),
      sendOtpReset: jest.fn(),
      sendOtpChangeEmail: jest.fn(),
      sendEmailChangedNotice: jest.fn(),
    };
    jwt = { signAsync: jest.fn().mockResolvedValue('access.jwt.token') };
    config = { get: jest.fn((_k: string, d?: unknown) => d) };

    service = new AuthService(prisma, redis, mail, jwt, config);
  });

  // ── LOGIN ──────────────────────────────────────────────
  describe('login', () => {
    it("to'g'ri parol bilan tokenlar qaytaradi va parolni sanitize qiladi", async () => {
      const password = await bcrypt.hash('correct', 8);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.com',
        password,
        isVerified: true,
        isActive: true,
        role: 'USER',
      });

      const res = await service.login({ email: 'a@b.com', password: 'correct' } as any);

      expect(res.data.accessToken).toBe('access.jwt.token');
      expect(res.data.refreshToken).toEqual(expect.any(String));
      expect((res.data.user as any).password).toBeUndefined();
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
    });

    it("noto'g'ri parolda 401 tashlaydi", async () => {
      const password = await bcrypt.hash('correct', 8);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        password,
        isVerified: true,
        isActive: true,
      });
      await expect(
        service.login({ email: 'a@b.com', password: 'wrong' } as any),
      ).rejects.toThrow();
    });

    it('tasdiqlanmagan emailda kirishni rad etadi', async () => {
      const password = await bcrypt.hash('correct', 8);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        password,
        isVerified: false,
        isActive: true,
      });
      await expect(
        service.login({ email: 'a@b.com', password: 'correct' } as any),
      ).rejects.toThrow(/tasdiqlanmagan/);
    });
  });

  // ── REFRESH: rotation + reuse detection ────────────────
  describe('refresh', () => {
    it("token yo'q bo'lsa 401", async () => {
      await expect(service.refresh(undefined)).rejects.toThrow();
    });

    it("DB da topilmasa 401", async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);
      await expect(service.refresh('tok')).rejects.toThrow(/yaroqsiz/);
    });

    it('REUSE: ishlatilgan token qayta kelsa — butun oilani bekor qiladi', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 't1',
        family: 'fam-1',
        usedAt: new Date(),
        expiresAt: future,
        user: { id: 'u1', isActive: true, role: 'USER' },
      });

      await expect(service.refresh('tok')).rejects.toThrow(/Sessiya buzilgan/);
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { family: 'fam-1' },
      });
    });

    it('muddati tugagan tokenni o\'chiradi va 401 beradi', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 't1',
        family: 'fam-1',
        usedAt: null,
        expiresAt: past,
        user: { id: 'u1', isActive: true, role: 'USER' },
      });
      await expect(service.refresh('tok')).rejects.toThrow(/muddati tugagan/);
      expect(prisma.refreshToken.delete).toHaveBeenCalledWith({ where: { id: 't1' } });
    });

    it('ROTATION: eski tokenni used belgilab, o\'sha oilada yangi juftlik beradi', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue({
        id: 't1',
        family: 'fam-1',
        usedAt: null,
        expiresAt: future,
        user: { id: 'u1', isActive: true, role: 'USER' },
      });

      const res = await service.refresh('tok');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { usedAt: expect.any(Date) },
      });
      expect(res.data.accessToken).toBe('access.jwt.token');
      expect(res.data.refreshToken).toEqual(expect.any(String));
      // yangi token o'sha oilada yaratiladi
      expect(prisma.refreshToken.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ family: 'fam-1' }),
        }),
      );
    });
  });

  // ── LOGOUT ─────────────────────────────────────────────
  describe('logout', () => {
    it('token bo\'lsa hash bo\'yicha o\'chiradi', async () => {
      await service.logout('tok');
      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
      });
    });

    it('token bo\'lmasa ham xato bermaydi (idempotent)', async () => {
      await expect(service.logout(undefined)).resolves.toBeDefined();
      expect(prisma.refreshToken.deleteMany).not.toHaveBeenCalled();
    });
  });

  // ── EMAIL O'ZGARTIRISH: step-up parol ──────────────────
  describe('requestEmailChange (step-up)', () => {
    it("noto'g'ri joriy parolda rad etadi", async () => {
      const password = await bcrypt.hash('mypass', 8);
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'u1',
        email: 'old@x.com',
        password,
      });
      await expect(
        service.requestEmailChange('u1', 'new@x.com', 'wrong'),
      ).rejects.toThrow(/Joriy parol/);
      expect(mail.sendOtpChangeEmail).not.toHaveBeenCalled();
    });

    it("to'g'ri parol bilan yangi emailga kod yuboradi", async () => {
      const password = await bcrypt.hash('mypass', 8);
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', email: 'old@x.com', password }) // user
        .mockResolvedValueOnce(null); // taken tekshiruvi
      await service.requestEmailChange('u1', 'new@x.com', 'mypass');
      expect(mail.sendOtpChangeEmail).toHaveBeenCalledWith('new@x.com', expect.any(String));
    });

    it('OAuth hisob (parolsiz) — step-up o\'tkazib yuboriladi', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', email: 'old@x.com', password: null })
        .mockResolvedValueOnce(null);
      await service.requestEmailChange('u1', 'new@x.com');
      expect(mail.sendOtpChangeEmail).toHaveBeenCalled();
    });

    it('email band bo\'lsa konflikt beradi', async () => {
      const password = await bcrypt.hash('mypass', 8);
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', email: 'old@x.com', password })
        .mockResolvedValueOnce({ id: 'u2' }); // boshqa user band qilgan
      await expect(
        service.requestEmailChange('u1', 'busy@x.com', 'mypass'),
      ).rejects.toThrow(/band/);
    });
  });

  describe('confirmEmailChange', () => {
    it('emailni yangilaydi va eski emailga ogohlantirish yuboradi', async () => {
      prisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u1', email: 'old@x.com' }) // user
        .mockResolvedValueOnce(null); // taken
      redis.get.mockImplementation((key) =>
        Promise.resolve(key.startsWith('otp:change-email:') ? '123456' : null),
      );
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        email: 'new@x.com',
        password: 'hash',
      });

      const res = await service.confirmEmailChange('u1', 'new@x.com', '123456');

      expect(mail.sendEmailChangedNotice).toHaveBeenCalledWith('old@x.com', 'new@x.com');
      expect((res.data as any).password).toBeUndefined();
    });
  });
});
