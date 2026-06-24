import {
  IsEmail,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
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
  // bcrypt 72 baytdan keyin parolni jimgina kesib tashlaydi — shuni cheklaymiz.
  @MaxLength(72, { message: 'Parol 72 belgidan oshmasligi kerak' })
  @Matches(/(?=.*[A-Za-z])(?=.*\d)/, {
    message: 'Parol kamida bitta harf va bitta raqamdan iborat bo\'lishi kerak',
  })
  password: string;
}
