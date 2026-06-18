import { ArticleType } from '@prisma/client';
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @Length(3, 200, { message: 'Sarlavha 3-200 belgi bo\'lishi kerak' })
  title: string;

  /** Tiptap JSON format */
  @IsObject({ message: 'content Tiptap JSON obyekti bo\'lishi kerak' })
  content: Record<string, any>;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsEnum(ArticleType, { message: 'type FREE yoki PREMIUM bo\'lishi kerak' })
  type?: ArticleType;

  @IsOptional()
  @IsString()
  @Length(10, 300, { message: 'Excerpt 10-300 belgi bo\'lishi kerak' })
  excerpt?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;
}
