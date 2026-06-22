import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { OAuthProfile } from './strategies/google.strategy';

/**
 * OAuth oqimi (faqat USER rol):
 *  GET /auth/google         → Google consent sahifasiga yo'naltiradi
 *  GET /auth/google/callback → token yasab, frontendga redirect qiladi
 *  GET /auth/github ...      → GitHub uchun aynan shunday
 *
 * Muvaffaqiyatda: refresh token httpOnly cookie sifatida o'rnatiladi va
 * foydalanuvchi <OAUTH_SUCCESS_REDIRECT> ga TOKENSIZ yo'naltiriladi.
 * Frontend callback sahifasi /auth/refresh orqali access token oladi —
 * shunda token URL/history/referrer'da qolmaydi.
 */
@Public()
@Controller('auth')
export class OAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {
    // Guard Google'ga yo'naltiradi — bu metod tanasi ishlamaydi
  }

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  googleCallback(@Req() req: { user: OAuthProfile }, @Res() res: Response) {
    return this.finish(req.user, res);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  githubAuth() {
    // Guard GitHub'ga yo'naltiradi
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  githubCallback(@Req() req: { user: OAuthProfile }, @Res() res: Response) {
    return this.finish(req.user, res);
  }

  private async finish(profile: OAuthProfile, res: Response) {
    const result = await this.authService.oauthLogin(profile);
    const { refreshToken } = result.data;

    // Refresh tokenni httpOnly cookie sifatida o'rnatamiz (auth.controller bilan bir xil)
    const days = this.config.get<number>('JWT_REFRESH_EXPIRES_DAYS', 30);
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: '/auth',
      maxAge: days * 24 * 60 * 60 * 1000,
    });

    const base = this.config.get<string>(
      'OAUTH_SUCCESS_REDIRECT',
      'http://localhost:3001/oauth/callback',
    );
    // Tokensiz redirect — access token callback sahifasida /auth/refresh orqali olinadi
    res.redirect(base);
  }
}
