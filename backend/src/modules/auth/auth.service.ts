import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuthProvider, User } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { MailService } from '../../mail/mail.service';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

type OtpPurpose = 'verify' | 'reset';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mail: MailService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ==========================================================
  // REGISTER → OTP → VERIFY
  // ==========================================================

  async register(dto: RegisterDto) {
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Email band, lekin tasdiqlanmagan — parolni yangilab, qayta OTP yuboramiz
    if (existingByEmail && !existingByEmail.isVerified) {
      await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: { password: await bcrypt.hash(dto.password, 10) },
      });
      await this.sendOtp(dto.email, 'verify');
      return {
        data: { email: dto.email },
        message: 'Tasdiqlash kodi qayta yuborildi',
      };
    }

    if (existingByEmail) {
      throw new ConflictException("Bu email allaqachon ro'yxatdan o'tgan");
    }

    const existingByUsername = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existingByUsername) {
      throw new ConflictException('Bu username band');
    }

    await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: await bcrypt.hash(dto.password, 10),
        isVerified: false,
      },
    });

    await this.sendOtp(dto.email, 'verify');

    return {
      data: { email: dto.email },
      message: 'Tasdiqlash kodi emailingizga yuborildi',
    };
  }

  async verifyEmail(dto: VerifyOtpDto) {
    await this.checkOtp(dto.email, 'verify', dto.code);

    const user = await this.prisma.user.update({
      where: { email: dto.email },
      data: { isVerified: true },
    });

    // Tasdiqlangan zahoti tokenlar beramiz — qayta login shart emas
    const tokens = await this.issueTokens(user);
    return {
      data: { user: this.sanitize(user), ...tokens },
      message: 'Email tasdiqlandi',
    };
  }

  async resendOtp(dto: ResendOtpDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) throw new BadRequestException('Bunday email topilmadi');
    if (user.isVerified) {
      throw new BadRequestException('Email allaqachon tasdiqlangan');
    }

    await this.sendOtp(dto.email, 'verify');
    return { data: null, message: 'Yangi kod yuborildi' };
  }

  // ==========================================================
  // LOGIN / REFRESH / LOGOUT
  // ==========================================================

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user || !user.password) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }
    if (!(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException("Email yoki parol noto'g'ri");
    }
    if (!user.isVerified) {
      throw new UnauthorizedException(
        'Email tasdiqlanmagan — avval emailni tasdiqlang',
      );
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Hisobingiz bloklangan');
    }

    const tokens = await this.issueTokens(user);
    return {
      data: { user: this.sanitize(user), ...tokens },
      message: 'Muvaffaqiyatli kirildi',
    };
  }

  async refresh(dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored) {
      throw new UnauthorizedException("Refresh token yaroqsiz");
    }
    if (stored.expiresAt < new Date()) {
      await this.prisma.refreshToken.delete({ where: { id: stored.id } });
      throw new UnauthorizedException('Refresh token muddati tugagan');
    }
    if (!stored.user.isActive) {
      throw new UnauthorizedException('Hisobingiz bloklangan');
    }

    const accessToken = await this.signAccessToken(stored.user);
    return { data: { accessToken }, message: 'Token yangilandi' };
  }

  async logout(userId: string, dto: RefreshTokenDto) {
    const tokenHash = this.hashToken(dto.refreshToken);
    // deleteMany — token topilmasa ham xato bermaydi (idempotent)
    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash, userId },
    });
    return { data: null, message: 'Chiqildi' };
  }

  // ==========================================================
  // PAROL TIKLASH
  // ==========================================================

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Email mavjudligini oshkor qilmaymiz — har doim bir xil javob
    if (user && user.isVerified && user.isActive) {
      await this.sendOtp(dto.email, 'reset');
    }
    return {
      data: null,
      message: 'Agar bu email mavjud bo\'lsa, kod yuborildi',
    };
  }

  async verifyResetOtp(dto: VerifyOtpDto) {
    await this.checkOtp(dto.email, 'reset', dto.code);

    // Bir martalik reset token — Redis'da 10 daqiqa
    const token = randomBytes(32).toString('hex');
    const ttl = this.config.get<number>('RESET_TOKEN_TTL', 600);
    await this.redis.set(`reset:${dto.email}`, token, ttl);

    return { data: { resetToken: token }, message: 'Kod tasdiqlandi' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const stored = await this.redis.get(`reset:${dto.email}`);
    if (!stored || stored !== dto.token) {
      throw new BadRequestException(
        'Reset token yaroqsiz yoki muddati tugagan',
      );
    }

    const user = await this.prisma.user.update({
      where: { email: dto.email },
      data: { password: await bcrypt.hash(dto.newPassword, 10) },
    });

    await this.redis.del(`reset:${dto.email}`);

    // Xavfsizlik: barcha qurilmalardagi sessiyalar bekor qilinadi
    await this.prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    return { data: null, message: 'Parol yangilandi — qaytadan kiring' };
  }

  // ==========================================================
  // OTP HELPERS (Redis)
  // ==========================================================

  private async sendOtp(email: string, purpose: OtpPurpose) {
    // Bloklangan bo'lsa — yangi kod ham yuborilmaydi
    await this.ensureNotBlocked(email, purpose);

    const cooldownKey = `otp:cooldown:${purpose}:${email}`;
    if (await this.redis.get(cooldownKey)) {
      const wait = await this.redis.ttl(cooldownKey);
      throw new HttpException(
        `Yangi kod so'rash uchun ${wait > 0 ? wait : 60} sekund kuting`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const ttl = this.config.get<number>('OTP_TTL', 180);
    const cooldown = this.config.get<number>('OTP_COOLDOWN', 60);

    await this.redis.set(`otp:${purpose}:${email}`, code, ttl);
    await this.redis.set(cooldownKey, '1', cooldown);

    if (purpose === 'verify') {
      await this.mail.sendOtpVerification(email, code);
    } else {
      await this.mail.sendOtpReset(email, code);
    }
  }

  private async checkOtp(email: string, purpose: OtpPurpose, code: string) {
    await this.ensureNotBlocked(email, purpose);

    const attemptsKey = `otp:attempts:${purpose}:${email}`;
    const stored = await this.redis.get(`otp:${purpose}:${email}`);

    // Kod umuman yo'q — muddati tugagan yoki so'ralmagan.
    // Urinish hisoblanmaydi: bu xato emas, kod shunchaki eskirgan.
    if (!stored) {
      throw new BadRequestException(
        "Kod muddati tugagan yoki mavjud emas — yangi kod so'rang",
      );
    }

    // Kod bor, lekin noto'g'ri — urinish hisoblanadi
    if (stored !== code) {
      const attempts = await this.redis.incr(attemptsKey);
      const blockTtl = this.config.get<number>('OTP_BLOCK_TTL', 10800);
      if (attempts === 1) await this.redis.expire(attemptsKey, blockTtl);

      const max = this.config.get<number>('OTP_MAX_ATTEMPTS', 3);
      if (attempts >= max) {
        await this.redis.set(`otp:block:${purpose}:${email}`, '1', blockTtl);
        await this.redis.del(`otp:${purpose}:${email}`, attemptsKey);
        throw new HttpException(
          `Kod noto'g'ri. Urinishlar tugadi — ${this.formatDuration(blockTtl)}dan keyin qayta urinib ko'ring`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      throw new BadRequestException(
        `Kod noto'g'ri — ${max - attempts} ta urinish qoldi`,
      );
    }

    // To'g'ri — barcha izlarni tozalaymiz
    await this.redis.del(
      `otp:${purpose}:${email}`,
      attemptsKey,
      `otp:cooldown:${purpose}:${email}`,
    );
  }

  /** Blok mavjud bo'lsa — qolgan vaqt bilan 429 otadi. */
  private async ensureNotBlocked(email: string, purpose: OtpPurpose) {
    const blockKey = `otp:block:${purpose}:${email}`;
    if (await this.redis.get(blockKey)) {
      const remaining = await this.redis.ttl(blockKey);
      throw new HttpException(
        `Juda ko'p noto'g'ri urinish — siz vaqtincha bloklangansiz. ${this.formatDuration(remaining)}dan keyin qayta urinib ko'ring`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** Sekundni o'qiladigan formatga o'giradi: 9930 → "2 soat 46 daqiqa" */
  private formatDuration(seconds: number): string {
    if (seconds <= 0) return 'bir necha soniya';
    const h = Math.floor(seconds / 3600);
    const m = Math.ceil((seconds % 3600) / 60);
    if (h > 0) return m > 0 ? `${h} soat ${m} daqiqa` : `${h} soat`;
    if (m > 0) return `${m} daqiqa`;
    return `${seconds} soniya`;
  }

  // ==========================================================
  // TOKEN HELPERS
  // ==========================================================

  // ==========================================================
  // OAuth (Google / GitHub) — faqat USER rol uchun
  // ==========================================================

  /**
   * OAuth orqali kirish/ro'yxatdan o'tish.
   * 1) Shu provider+providerId bog'langan account bormi — o'sha user.
   * 2) Yo'q bo'lsa, shu email bilan user bormi — accountni unga bog'laymiz.
   * 3) U ham yo'q — yangi user + OAuthAccount yaratamiz.
   */
  async oauthLogin(profile: {
    provider: OAuthProvider | 'GOOGLE' | 'GITHUB';
    providerId: string;
    email?: string;
    name?: string;
    avatar?: string;
  }) {
    const provider = profile.provider as OAuthProvider;

    const existing = await this.prisma.oAuthAccount.findUnique({
      where: { provider_providerId: { provider, providerId: profile.providerId } },
      include: { user: true },
    });

    let user = existing?.user ?? null;

    if (!user) {
      // Email bo'yicha mavjud userga bog'lash
      if (profile.email) {
        user = await this.prisma.user.findUnique({
          where: { email: profile.email },
        });
      }

      if (user) {
        await this.prisma.oAuthAccount.create({
          data: { userId: user.id, provider, providerId: profile.providerId },
        });
      } else {
        // Yangi user yaratish (email shart)
        if (!profile.email) {
          throw new BadRequestException(
            "OAuth profilida email yo'q — kira olmaysiz",
          );
        }
        const username = await this.uniqueUsername(
          profile.name || profile.email.split('@')[0],
        );
        user = await this.prisma.user.create({
          data: {
            email: profile.email,
            username,
            avatar: profile.avatar,
            role: 'USER',
            isVerified: true,
            isActive: true,
            oauthAccounts: {
              create: { provider, providerId: profile.providerId },
            },
          },
        });
      }
    }

    if (!user.isActive) {
      throw new ForbiddenException('Hisob bloklangan');
    }

    const tokens = await this.issueTokens(user);
    return { data: { user: this.sanitize(user), ...tokens }, message: 'OK' };
  }

  /** Username'ni ruxsat etilgan belgilarga keltirib, unikal qiladi. */
  private async uniqueUsername(base: string): Promise<string> {
    let clean =
      base
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 24) || 'user';

    let candidate = clean;
    while (await this.prisma.user.findUnique({ where: { username: candidate } })) {
      candidate = `${clean}_${randomBytes(2).toString('hex')}`;
    }
    return candidate;
  }

  private signAccessToken(user: User): Promise<string> {
    return this.jwt.signAsync({ sub: user.id, role: user.role });
  }

  private async issueTokens(user: User) {
    const accessToken = await this.signAccessToken(user);

    // Refresh token — tasodifiy satr (JWT emas), DB da faqat hash saqlanadi
    const refreshToken = randomBytes(40).toString('hex');
    const days = this.config.get<number>('JWT_REFRESH_EXPIRES_DAYS', 30);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: this.hashToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Javobdan parolni olib tashlaydi. */
  private sanitize(user: User) {
    const { password, ...safe } = user;
    return safe;
  }
}
