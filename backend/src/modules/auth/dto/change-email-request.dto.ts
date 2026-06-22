import { IsEmail, IsOptional, IsString } from 'class-validator';

export class ChangeEmailRequestDto {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  newEmail: string;

  /** Step-up: joriy parol (parol o'rnatilgan hisoblar uchun majburiy). */
  @IsOptional()
  @IsString()
  currentPassword?: string;
}
