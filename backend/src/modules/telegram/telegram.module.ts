import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';

/**
 * Telegram "muallif bo'lish" so'rovlari moduli.
 * TELEGRAM_BOT_TOKEN .env'da bo'lsagina bot ishga tushadi.
 */
@Module({
  providers: [TelegramService],
})
export class TelegramModule {}
