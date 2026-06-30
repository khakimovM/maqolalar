import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf, Markup } from 'telegraf';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../database/prisma.service';

type Step = 'name' | 'phone' | 'reason';
interface Session {
  step: Step;
  name?: string;
  phone?: string;
}

/**
 * "Muallif bo'lish" arizalari uchun Telegram bot.
 *
 * Oqim:
 *   1) /start → bot ism, telefon, sababni bosqichma-bosqich so'raydi.
 *   2) Ariza DB'ga (AdminRequest, PENDING) yoziladi va superadminga
 *      ✅/❌ tugmalari bilan yuboriladi.
 *   3) Superadmin ✅ bossa → admin avtomatik yaratiladi, arizachiga
 *      login(email)+parol va admin panel havolasi yuboriladi.
 *      ❌ bossa → arizachiga rad xabari boradi.
 *   4) /stats — superadmin uchun arizalar statistikasi.
 *
 * TELEGRAM_BOT_TOKEN bo'lmasa — bot ishga tushmaydi (graceful).
 */
@Injectable()
export class TelegramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private bot?: Telegraf;
  private sessions = new Map<number, Session>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const token = this.config.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      this.logger.log('TELEGRAM_BOT_TOKEN yo\'q — Telegram bot o\'chiq.');
      return;
    }
    this.bot = new Telegraf(token);
    this.registerHandlers();

    void this.bot
      .launch()
      .catch((e) =>
        this.logger.error('Telegram bot ishga tushmadi', e as Error),
      );
    this.logger.log('Telegram bot ishga tushdi (long-polling).');
    void this.setupCommands();
  }

  /**
   * Buyruqlar menyusi. Default (hamma) — faqat /start.
   * Superadmin chatida esa /stats, /pending, /help qo'shimcha ko'rinadi
   * (BotCommandScopeChat). Bu faqat menyuni yashiradi — haqiqiy ruxsat
   * tekshiruvi handler'larda (chat id === superadmin).
   */
  private async setupCommands() {
    const bot = this.bot!;
    try {
      await bot.telegram.setMyCommands([
        { command: 'start', description: "Muallif bo'lish uchun ariza qoldirish" },
      ]);
      if (this.superadminId) {
        await bot.telegram.setMyCommands(
          [
            { command: 'stats', description: 'Arizalar statistikasi' },
            { command: 'pending', description: 'Kutilayotgan arizalar' },
            { command: 'help', description: 'Buyruqlar ro\'yxati' },
          ],
          { scope: { type: 'chat', chat_id: Number(this.superadminId) } },
        );
      }
    } catch (e) {
      this.logger.warn(`setMyCommands xato: ${String(e)}`);
    }
  }

  onModuleDestroy() {
    this.bot?.stop('SIGTERM');
  }

  private get superadminId(): string | undefined {
    return this.config.get<string>('SUPERADMIN_TELEGRAM_ID');
  }
  private get panelUrl(): string {
    return this.config.get<string>('ADMIN_PANEL_URL') ?? 'http://localhost:3002';
  }

  private registerHandlers() {
    const bot = this.bot!;

    bot.start(async (ctx) => {
      this.sessions.set(ctx.from.id, { step: 'name' });
      await ctx.reply(
        "Assalomu alaykum! Muallif bo'lish uchun ariza qoldiramiz.\n\n" +
          '1/3 — Ism familiyangizni yuboring:',
        Markup.removeKeyboard(),
      );
    });

    bot.command('stats', async (ctx) => {
      if (String(ctx.from.id) !== this.superadminId) return;
      await ctx.reply(await this.statsText());
    });

    bot.command('help', async (ctx) => {
      if (String(ctx.from.id) !== this.superadminId) return;
      await ctx.reply(
        'Buyruqlar:\n' +
          '/stats — arizalar statistikasi\n' +
          '/pending — kutilayotgan arizalar (tugmalar bilan)',
      );
    });

    bot.command('pending', async (ctx) => {
      if (String(ctx.from.id) !== this.superadminId) return;
      const items = await this.prisma.adminRequest.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'asc' },
        take: 20,
      });
      if (items.length === 0) {
        await ctx.reply('Kutilayotgan ariza yo\'q.');
        return;
      }
      for (const r of items) {
        const uname = r.telegramUsername ? `@${r.telegramUsername}` : '—';
        await ctx.reply(
          `👤 ${r.name} ${uname}\n📱 ${r.phone ?? '—'}\n✍️ ${r.reason}`,
          Markup.inlineKeyboard([
            [
              Markup.button.callback('✅ Tasdiqlash', `approve:${r.id}`),
              Markup.button.callback('❌ Rad etish', `reject:${r.id}`),
            ],
          ]),
        );
      }
    });

    // Telefonni "kontakt" tugmasi orqali yuborganda
    bot.on('contact', async (ctx) => {
      const s = this.sessions.get(ctx.from.id);
      if (!s || s.step !== 'phone') return;
      s.phone = ctx.message.contact.phone_number;
      s.step = 'reason';
      await ctx.reply(
        '3/3 — Nima uchun maqola yozmoqchisiz? Qisqacha yozing:',
        Markup.removeKeyboard(),
      );
    });

    bot.on('text', async (ctx) => {
      const text = ctx.message.text;
      if (text.startsWith('/')) return; // buyruqlar alohida hal qilinadi

      const s = this.sessions.get(ctx.from.id);
      if (!s) {
        await ctx.reply("Ariza boshlash uchun /start ni bosing.");
        return;
      }

      if (s.step === 'name') {
        s.name = text.trim().slice(0, 100);
        s.step = 'phone';
        await ctx.reply(
          '2/3 — Telefon raqamingizni yuboring (tugma orqali yoki qo\'lda):',
          Markup.keyboard([
            [Markup.button.contactRequest('📱 Telefon raqamni yuborish')],
          ])
            .oneTime()
            .resize(),
        );
        return;
      }

      if (s.step === 'phone') {
        s.phone = text.trim().slice(0, 30);
        s.step = 'reason';
        await ctx.reply(
          '3/3 — Nima uchun maqola yozmoqchisiz? Qisqacha yozing:',
          Markup.removeKeyboard(),
        );
        return;
      }

      if (s.step === 'reason') {
        await this.submitRequest(ctx, text.trim().slice(0, 1000));
      }
    });

    bot.action(/^approve:(.+)$/, (ctx) => this.decide(ctx, ctx.match[1], true));
    bot.action(/^reject:(.+)$/, (ctx) => this.decide(ctx, ctx.match[1], false));
  }

  /** Arizani DB'ga yozadi va superadminga yuboradi. */
  private async submitRequest(ctx: any, reason: string) {
    const s = this.sessions.get(ctx.from.id);
    if (!s) return;

    const req = await this.prisma.adminRequest.create({
      data: {
        telegramId: String(ctx.from.id),
        telegramUsername: ctx.from.username ?? null,
        name: s.name ?? ctx.from.first_name ?? 'Noma\'lum',
        phone: s.phone ?? null,
        reason,
      },
    });
    this.sessions.delete(ctx.from.id);

    await ctx.reply(
      "✅ Arizangiz qabul qilindi va ko'rib chiqilmoqda. Javobni shu yerda olasiz.",
    );

    if (!this.superadminId) {
      this.logger.warn('SUPERADMIN_TELEGRAM_ID yo\'q — ariza yuborilmadi.');
      return;
    }
    const uname = req.telegramUsername ? `@${req.telegramUsername}` : '—';
    await this.bot!.telegram.sendMessage(
      this.superadminId,
      `🆕 Yangi muallif arizasi\n\n` +
        `👤 Ism: ${req.name}\n` +
        `🔗 Telegram: ${uname}\n` +
        `📱 Telefon: ${req.phone ?? '—'}\n\n` +
        `✍️ Sabab:\n${req.reason}`,
      Markup.inlineKeyboard([
        [
          Markup.button.callback('✅ Tasdiqlash', `approve:${req.id}`),
          Markup.button.callback('❌ Rad etish', `reject:${req.id}`),
        ],
      ]),
    );
  }

  /** Superadmin tasdiq/rad qarori. approve=true → admin yaratiladi. */
  private async decide(ctx: any, reqId: string, approve: boolean) {
    if (String(ctx.from?.id) !== this.superadminId) {
      await ctx.answerCbQuery("Ruxsat yo'q");
      return;
    }
    const req = await this.prisma.adminRequest.findUnique({
      where: { id: reqId },
    });
    if (!req || req.status !== 'PENDING') {
      await ctx.answerCbQuery('Ariza allaqachon ko\'rib chiqilgan');
      return;
    }

    if (!approve) {
      await this.prisma.adminRequest.update({
        where: { id: reqId },
        data: { status: 'REJECTED', decidedAt: new Date() },
      });
      await this.safeDm(
        req.telegramId,
        "Kechirasiz, muallif bo'lish arizangiz rad etildi.",
      );
      await ctx.editMessageText(`❌ Rad etildi — ${req.name}`);
      await ctx.answerCbQuery('Rad etildi');
      return;
    }

    // Tasdiqlash: default admin yaratamiz
    const username = await this.uniqueUsername(req.telegramUsername || req.name);
    const password = this.randomPassword();
    let email = `tg${req.telegramId}@maqolalar.local`;
    if (await this.prisma.user.findUnique({ where: { email } })) {
      email = `tg${req.telegramId}-${Date.now()}@maqolalar.local`;
    }

    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        password: await bcrypt.hash(password, 12),
        role: 'ADMIN',
        isVerified: true,
        isActive: true,
      },
    });

    await this.prisma.adminRequest.update({
      where: { id: reqId },
      data: {
        status: 'APPROVED',
        decidedAt: new Date(),
        createdUserId: user.id,
      },
    });

    await this.safeDm(
      req.telegramId,
      `✅ Arizangiz tasdiqlandi!\n\n` +
        `Admin panelga kirish ma'lumotlari:\n` +
        `🔑 Login (email): ${email}\n` +
        `🔒 Parol: ${password}\n\n` +
        `🔗 Admin panel: ${this.panelUrl}\n\n` +
        `⚠️ Kirgandan so'ng email va parolingizni o'zgartiring.`,
    );
    await ctx.editMessageText(`✅ Tasdiqlandi — ${req.name} (${username})`);
    await ctx.answerCbQuery('Admin yaratildi');
  }

  private async statsText(): Promise<string> {
    const [pending, approved, rejected] = await Promise.all([
      this.prisma.adminRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.adminRequest.count({ where: { status: 'APPROVED' } }),
      this.prisma.adminRequest.count({ where: { status: 'REJECTED' } }),
    ]);
    return (
      `📊 Arizalar statistikasi\n\n` +
      `⏳ Kutilmoqda: ${pending}\n` +
      `✅ Tasdiqlangan: ${approved}\n` +
      `❌ Rad etilgan: ${rejected}\n` +
      `Σ Jami: ${pending + approved + rejected}`
    );
  }

  /** Xato bo'lsa ham botni yiqitmaydigan DM. */
  private async safeDm(chatId: string, text: string) {
    try {
      await this.bot!.telegram.sendMessage(chatId, text);
    } catch (e) {
      this.logger.warn(`DM yuborib bo'lmadi (${chatId}): ${String(e)}`);
    }
  }

  private async uniqueUsername(base: string): Promise<string> {
    const clean =
      base
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 24) || 'muallif';
    let candidate = clean;
    while (
      await this.prisma.user.findUnique({ where: { username: candidate } })
    ) {
      candidate = `${clean}_${randomBytes(2).toString('hex')}`;
    }
    return candidate;
  }

  /** Harf + raqamdan iborat tasodifiy parol (parol siyosatiga mos). */
  private randomPassword(): string {
    return 'Mq' + randomBytes(5).toString('hex'); // masalan: Mq3f9a2c1b → harf+raqam, 12 belgi
  }
}
