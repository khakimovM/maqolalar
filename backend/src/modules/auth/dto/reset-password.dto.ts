import {
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ResetPasswordDto {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;

  /** verify-reset-otp dan qaytgan token */
  @IsString()
  token: string;

  @IsString()
  @MinLength(8, { message: 'Parol kamida 8 belgi bo\'lishi kerak' })
  @MaxLength(72, { message: 'Parol 72 belgidan oshmasligi kerak' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Parol kamida bitta harf va bitta raqamdan iborat bo\'lishi kerak',
  })
  newPassword: string;
}
