import { IsString, Length } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  @Length(1, 2000, { message: 'Comment 1-2000 belgi bo\'lishi kerak' })
  content: string;
}
