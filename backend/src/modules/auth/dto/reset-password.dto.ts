import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;

  /** verify-reset-otp dan qaytgan token */
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Parol kamida 8 belgi bo\'lishi kerak' })
  newPassword: string;
}
