import { IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(8, { message: 'Yangi parol kamida 8 belgi bo\'lishi kerak' })
  newPassword: string;
}
