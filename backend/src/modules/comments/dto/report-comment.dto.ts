import { IsOptional, IsString, Length } from 'class-validator';

export class ReportCommentDto {
  @IsOptional()
  @IsString()
  @Length(3, 500, { message: 'Sabab 3-500 belgi bo\'lishi kerak' })
  reason?: string;
}
