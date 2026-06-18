import { IsEmail } from 'class-validator';

export class ForgotPasswordDto {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;
}
