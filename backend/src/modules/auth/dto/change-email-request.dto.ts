import { IsEmail } from 'class-validator';

export class ChangeEmailRequestDto {
  @IsEmail({}, { message: "Email noto'g'ri formatda" })
  newEmail: string;
}
