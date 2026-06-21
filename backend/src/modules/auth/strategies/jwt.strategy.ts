import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../database/prisma.service';
import { requireConfig } from '../../../common/utils/require-config';

export type JwtPayload = { sub: string; role: string };

/**
 * Access token tekshiruvi. Headerdan oladi:
 * Authorization: Bearer <token>
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // Maxfiy kalit majburiy (fail-fast) — bashorat qilinadigan fallback yo'q
      secretOrKey: requireConfig(config, 'JWT_ACCESS_SECRET'),
    });
  }

  /** Token to'g'ri bo'lsa chaqiriladi. Qaytgan qiymat request.user ga yoziladi. */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        username: true,
        avatar: true,
        role: true,
        isActive: true,
        isVerified: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Hisob topilmadi yoki bloklangan');
    }
    return user;
  }
}
