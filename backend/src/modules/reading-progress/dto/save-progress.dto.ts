import { IsInt, Max, Min } from 'class-validator';

export class SaveProgressDto {
  /** O'qilgan foiz: 0-100 */
  @IsInt({ message: 'scrollPercent butun son bo\'lishi kerak' })
  @Min(0, { message: 'scrollPercent 0 dan kichik bo\'lmasin' })
  @Max(100, { message: 'scrollPercent 100 dan katta bo\'lmasin' })
  scrollPercent: number;
}
