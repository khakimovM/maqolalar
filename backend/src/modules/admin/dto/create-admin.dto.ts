import { IsEmail, IsString, Length, Matches, MinLength } from 'class-validator';

export class CreateAdminDto {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  email: string;

  @IsString()
  @Length(3, 30, { message: 'Username 3-30 belgi bo\'lishi kerak' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username faqat harf, raqam va _ dan iborat bo\'lishi mumkin',
  })
  username: string;

  @IsString()
  @MinLength(8, { message: 'Parol kamida 8 belgi bo\'lishi kerak' })
  password: string;
}
