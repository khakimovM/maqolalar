import { ArticleStatus, ArticleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class ArticleQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  /** title va matn bo'yicha qidiruv */
  @IsOptional()
  @IsString()
  search?: string;

  /** kategoriya slug'i: ?category=kimyo */
  @IsOptional()
  @IsString()
  category?: string;

  /** faqat kirgan userlar uchun ma'noli: ?type=PREMIUM */
  @IsOptional()
  @IsEnum(ArticleType)
  type?: ArticleType;

  /** faqat GET /articles/my uchun: ?status=DRAFT */
  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;
}
