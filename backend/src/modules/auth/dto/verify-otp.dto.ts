import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;

  @IsString()
  @Length(6, 6, { message: 'Kod 6 xonali bo\'lishi kerak' })
  @Matches(/^\d{6}$/, { message: 'Kod faqat raqamlardan iborat' })
  code: string;
}
