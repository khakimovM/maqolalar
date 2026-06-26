import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';

/**
 * "Muallif bo'lish" so'rovlarini Telegram orqali superadminga yetkazadi.
 *
 * Oqim (faqat relay):
 *   1) Foydalanuvchi botga /start beradi → ism/email/sababni bitta xabarda yuboradi.
 *   2) Bot xabarni SUPERADMIN_TELEGRAM_ID'ga yo'naltiradi.
 *   3) Superadmin admin panelda admin yaratib, kreditallarni foydalanuvchiga
 *      (Telegram @username orqali) o'zi yuboradi.
 *
 * TELEGRAM_BOT_TOKEN bo'lmasa — bot umuman ishga tushmaydi (graceful, build buzilmaydi).
 */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: Telegraf;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.log('TELEGRAM_BOT_TOKEN yo\'q — Telegram bot o\'chiq.');
      return;
    }
    const superadminId = this.config.get<string>('SUPERADMIN_TELEGRAM_ID');

    this.bot = new Telegraf(token);

    this.bot.start((ctx) =>
      ctx.reply(
        "Assalomu alaykum! Maqolalar platformasida muallif bo'lmoqchi bo'lsangiz, " +
          'quyidagilarni BITTA xabarda yuboring:\n\n' +
          '• Ism familiyangiz\n' +
          "• Foydalanmoqchi bo'lgan emailingiz\n" +
          '• Nima haqida yozmoqchisiz (qisqacha)\n\n' +
          "So'rovingiz superadminga yetkaziladi.",
      ),
    );

    this.bot.on('text', async (ctx) => {
      // /start dan boshqa buyruqlarni e'tiborsiz qoldiramiz
      if (ctx.message.text.startsWith('/')) return;

      if (!superadminId) {
        await ctx.reply(
          "Hozircha so'rovlarni qabul qilib bo'lmayapti. Keyinroq urinib ko'ring.",
        );
        this.logger.warn('SUPERADMIN_TELEGRAM_ID yo\'q — so\'rov yetkazilmadi.');
        return;
      }

      const from = ctx.from;
      const uname = from?.username ? `@${from.username}` : '(username yo\'q)';
      const name = [from?.first_name, from?.last_name]
        .filter(Boolean)
        .join(' ');

      try {
        await this.bot!.telegram.sendMessage(
          superadminId,
          `🆕 Yangi muallif (admin) so'rovi\n\n` +
            `👤 ${name} ${uname}\n` +
            `🆔 chat id: ${from?.id}\n\n` +
            `✉️ Xabar:\n${ctx.message.text}\n\n` +
            `— Tasdiqlasangiz: admin panelda yangi admin yarating va ` +
            `email/parolni ${uname} ga yuboring.`,
        );
        await ctx.reply(
          "✅ So'rovingiz superadminga yuborildi. Tez orada siz bilan bog'lanishadi.",
        );
      } catch (e) {
        this.logger.error('So\'rovni superadminga yuborib bo\'lmadi', e as Error);
        await ctx.reply(
          "Kechirasiz, so'rovni yuborishda xatolik. Keyinroq urinib ko'ring.",
        );
      }
    });

    // MUHIM: launch() bot to'xtaguncha yechilmaydigan promise qaytaradi —
    // shuning uchun await QILMAYMIZ (aks holda ilova ishga tushishi osilib qoladi).
    void this.bot
      .launch()
      .catch((e) =>
        this.logger.error('Telegram bot ishga tushmadi', e as Error),
      );
    this.logger.log('Telegram bot ishga tushdi (long-polling).');
  }

  onModuleDestroy() {
    this.bot?.stop('SIGTERM');
  }
}
