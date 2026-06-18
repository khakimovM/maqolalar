import { PartialType } from '@nestjs/mapped-types';
import { CreateArticleDto } from './create-article.dto';

/** Barcha maydonlar ixtiyoriy — faqat yuborilganlari yangilanadi. */
export class UpdateArticleDto extends PartialType(CreateArticleDto) {}
