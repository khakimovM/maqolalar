import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class ChangeEmailConfirmDto {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  newEmail: string;

  @IsString()
  @Length(6, 6, { message: 'Kod 6 xonali bo\'lishi kerak' })
  @Matches(/^\d{6}$/, { message: 'Kod faqat raqamlardan iborat' })
  code: string;
}
