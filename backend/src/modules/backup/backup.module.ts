import { Module } from '@nestjs/common';
import { BackupService } from './backup.service';

/**
 * Zaxira (backup) moduli — DB va uploads uchun.
 * BackupService @Cron orqali kunlik ishlaydi va Telegram bot tomonidan
 * qo'lda chaqiriladi (create/latest).
 */
@Module({
  providers: [BackupService],
  exports: [BackupService],
})
export class BackupModule {}
