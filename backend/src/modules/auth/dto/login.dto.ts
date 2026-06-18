import { IsEmail, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;

  @IsString()
  password: string;
}
