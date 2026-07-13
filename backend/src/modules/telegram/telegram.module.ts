import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { BackupModule } from '../backup/backup.module';

/**
 * Telegram "muallif bo'lish" so'rovlari moduli.
 * TELEGRAM_BOT_TOKEN .env'da bo'lsagina bot ishga tushadi.
 * BackupModule — superadminga backup tugmalari uchun.
 */
@Module({
  imports: [BackupModule],
  providers: [TelegramService],
})
export class TelegramModule {}
