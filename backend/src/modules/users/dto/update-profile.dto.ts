import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(3, 30, { message: 'Username 3-30 belgi bo\'lishi kerak' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username faqat harf, raqam va _ dan iborat bo\'lishi mumkin',
  })
  username?: string;

  /** Hozircha URL satr; upload moduli yozilganda /upload/avatar dan keladi */
  @IsOptional()
  @IsString()
  avatar?: string;
}
