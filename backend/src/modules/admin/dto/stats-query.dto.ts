import { IsDateString, IsIn, IsOptional } from 'class-validator';

export class StatsQueryDto {
  /** Tayyor oraliq: daily (bugun), monthly (shu oy), yearly (shu yil). */
  @IsOptional()
  @IsIn(['daily', 'monthly', 'yearly'], {
    message: 'period faqat daily, monthly yoki yearly bo\'lishi mumkin',
  })
  period?: 'daily' | 'monthly' | 'yearly';

  /** Maxsus oraliq boshlanishi (YYYY-MM-DD). */
  @IsOptional()
  @IsDateString({}, { message: 'from sana formati YYYY-MM-DD bo\'lsin' })
  from?: string;

  /** Maxsus oraliq tugashi (YYYY-MM-DD). */
  @IsOptional()
  @IsDateString({}, { message: 'to sana formati YYYY-MM-DD bo\'lsin' })
  to?: string;
}
