import { IsString } from 'class-validator';

/** refresh va logout endpointlari uchun */
export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}
