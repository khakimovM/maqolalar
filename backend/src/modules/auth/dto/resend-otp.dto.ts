import { IsEmail } from 'class-validator';

export class ResendOtpDto {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;
}
