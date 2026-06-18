import { IsString, Length } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @Length(2, 50, { message: 'Kategoriya nomi 2-50 belgi bo\'lishi kerak' })
  name: string;
}
