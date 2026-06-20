import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ChangeEmailRequestDto } from './dto/change-email-request.dto';
import { ChangeEmailConfirmDto } from './dto/change-email-confirm.dto';

// Auth endpointlarida qattiqroq limit: 10 so'rov / 60 sekund
@Throttle({ default: { limit: 10, ttl: 60_000 } })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyEmail(dto);
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
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  /** Access token talab qilinadi (header) + body da refreshToken */
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@CurrentUser('id') userId: string, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(userId, dto);
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

  /** Email o'zgartirish — 1-qadam: yangi emailga kod yuborish (auth talab). */
  @HttpCode(HttpStatus.OK)
  @Post('change-email/request')
  requestEmailChange(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangeEmailRequestDto,
  ) {
    return this.authService.requestEmailChange(userId, dto.newEmail);
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
