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
 * Muvaffaqiyatda foydalanuvchi quyidagiga yo'naltiriladi:
 *  <OAUTH_SUCCESS_REDIRECT>?accessToken=...&refreshToken=...
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
    const base = this.config.get<string>(
      'OAUTH_SUCCESS_REDIRECT',
      'http://localhost:3001/oauth/callback',
    );
    const { accessToken, refreshToken } = result.data;
    const url =
      `${base}?accessToken=${encodeURIComponent(accessToken)}` +
      `&refreshToken=${encodeURIComponent(refreshToken)}`;
    res.redirect(url);
  }
}
