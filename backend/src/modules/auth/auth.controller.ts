import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangeEmailRequestDto } from './dto/change-email-request.dto';
import { ChangeEmailConfirmDto } from './dto/change-email-confirm.dto';

/** Refresh token httpOnly cookie nomi va yo'li (faqat /auth/* ga yuboriladi). */
const REFRESH_COOKIE = 'refresh_token';
const COOKIE_PATH = '/auth';

// Auth endpointlarida qattiqroq limit: 10 so'rov / 60 sekund
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private get cookieBaseOptions() {
    // COOKIE_SECURE berilsa — o'shanga bo'ysunadi (HTTP/IP bosqichida 'false').
    // Berilmasa — NODE_ENV=production da true. HTTPS'da true bo'lishi SHART.
    const secureEnv = this.config.get<string>('COOKIE_SECURE');
    return {
      httpOnly: true,
      secure:
        secureEnv !== undefined
          ? secureEnv === 'true'
          : this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax' as const,
      path: COOKIE_PATH,
    };
  }

  /** Refresh tokenni httpOnly cookie sifatida o'rnatadi. */
  private setRefreshCookie(res: Response, token: string) {
    const days = this.config.get<number>('JWT_REFRESH_EXPIRES_DAYS', 30);
    res.cookie(REFRESH_COOKIE, token, {
      ...this.cookieBaseOptions,
      maxAge: days * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, this.cookieBaseOptions);
  }

  /**
   * Service javobidagi refreshToken'ni cookie'ga ko'chiradi va body'dan
   * olib tashlaydi — refresh token hech qachon JS o'qiy oladigan joyda bo'lmaydi.
   */
  private withRefreshCookie<T extends { refreshToken?: string }>(
    res: Response,
    result: { data: T; message: string },
  ) {
    const { refreshToken, ...data } = result.data;
    if (refreshToken) this.setRefreshCookie(res, refreshToken);
    return { ...result, data };
  }

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  async verifyEmail(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(dto);
    return this.withRefreshCookie(res, result);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('resend-otp')
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto);
    return this.withRefreshCookie(res, result);
  }

  /** Refresh — token cookie'dan o'qiladi, yangi juftlik beriladi (rotation). */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const result = await this.authService.refresh(token);
    return this.withRefreshCookie(res, result);
  }

  /** Logout — cookie'dagi refresh token bekor qilinadi va cookie tozalanadi. */
  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    const result = await this.authService.logout(token);
    this.clearRefreshCookie(res);
    return result;
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-reset-otp')
  verifyResetOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyResetOtp(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  /** Email o'zgartirish — 1-qadam: joriy parol + yangi emailga kod (auth talab). */
  @HttpCode(HttpStatus.OK)
  @Post('change-email/request')
  requestEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangeEmailRequestDto,
  ) {
    return this.authService.requestEmailChange(
      userId,
      dto.newEmail,
      dto.currentPassword,
    );
  }

  /** Email o'zgartirish — 2-qadam: kodni tasdiqlab emailni yangilash. */
  @HttpCode(HttpStatus.OK)
  @Post('change-email/confirm')
  confirmEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangeEmailConfirmDto,
  ) {
    return this.authService.confirmEmailChange(userId, dto.newEmail, dto.code);
  }
}
