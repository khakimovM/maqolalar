import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { OAuthController } from './oauth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { MailModule } from '../../mail/mail.module';
import { requireConfig } from '../../common/utils/require-config';

@Module({
  imports: [
    PassportModule,
    MailModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        // Maxfiy kalit majburiy — yo'q bo'lsa ilova ishga tushmaydi (fail-fast)
        secret: requireConfig(config, 'JWT_ACCESS_SECRET'),
        signOptions: {
          // '15m' kabi qiymat to'g'ri ishlaydi — yangi @nestjs/jwt tip
          // ta'rifi qattiqlashgani uchun cast kerak
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES', '15m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController, OAuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, GithubStrategy],
  exports: [AuthService],
})
export class AuthModule {}
