import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { EmailStatus, EmailType } from '@prisma/client';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../database/prisma.service';

type MailJobData = { email: string; code?: string; newEmail?: string };

const SUBJECTS: Record<string, string> = {
  'otp-verification': 'Ilm Faktor — Email tasdiqlash kodi',
  'otp-reset': 'Ilm Faktor — Parolni tiklash kodi',
  'otp-change-email': 'Ilm Faktor — Yangi emailni tasdiqlash kodi',
  'email-changed': 'Ilm Faktor — Hisobingiz emaili o\'zgartirildi',
};

// Job nomini EmailType enum'ga moslash (faqat OTP turlari statistikaga yoziladi)
const TYPE_MAP: Record<string, EmailType> = {
  'otp-verification': EmailType.VERIFICATION,
  'otp-reset': EmailType.RESET,
  'otp-change-email': EmailType.CHANGE_EMAIL,
};

/**
 * BullMQ worker: "mail" navbatidagi joblarni qayta ishlaydi.
 *
 * DEV MODE: .env da MAIL_USER bo'sh bo'lsa, email yuborilmaydi —
 * OTP kod konsolga chiqadi. Postman bilan test qilish uchun qulay.
 *
 * OTP urinishlari EmailLog jadvaliga yoziladi (statistika uchun).
 */
@Processor('mail')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super();
    const user = this.config.get<string>('MAIL_USER');
    if (user) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('MAIL_HOST'),
        port: this.config.get<number>('MAIL_PORT', 587),
        secure: false,
        auth: { user, pass: this.config.get<string>('MAIL_PASS') },
      });
    }
  }

  async process(job: Job<MailJobData>): Promise<void> {
    const { email, code, newEmail } = job.data;
    const isNotice = job.name === 'email-changed';
    // OTP turi (statistikaga yoziladi); ogohlantirish xati uchun undefined
    const type = TYPE_MAP[job.name];

    // DEV MODE — SMTP sozlanmagan: konsolga chiqaramiz
    if (!this.transporter) {
      this.logger.log(
        isNotice
          ? `📧 [DEV MODE] ${job.name} → ${email} | yangi email: ${newEmail}`
          : `📧 [DEV MODE] ${job.name} → ${email} | KOD: ${code}`,
      );
      if (type) await this.logEmail(type, email, EmailStatus.SENT);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('MAIL_FROM'),
        to: email,
        subject: SUBJECTS[job.name] ?? 'Ilm Faktor',
        html: isNotice
          ? this.noticeHtml(newEmail ?? '')
          : this.render(`${job.name}.hbs`, { code: code ?? '', email }),
      });
      this.logger.log(`📧 ${job.name} yuborildi → ${email}`);
      if (type) await this.logEmail(type, email, EmailStatus.SENT);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`📧 ${job.name} XATO → ${email}: ${msg}`);
      if (type) await this.logEmail(type, email, EmailStatus.FAILED, msg);
      throw err; // BullMQ qayta urinishi uchun
    }
  }

  /** Email o'zgartirilgani haqida eski emailga yuboriladigan ogohlantirish. */
  private noticeHtml(newEmail: string): string {
    return (
      `<p>Assalomu alaykum,</p>` +
      `<p>Ilm Faktor hisobingiz email manzili <b>${newEmail}</b> ga o'zgartirildi.</p>` +
      `<p>Agar bu o'zgarishni siz qilmagan bo'lsangiz, darhol qo'llab-quvvatlash ` +
      `xizmatiga murojaat qiling — hisobingiz xavf ostida bo'lishi mumkin.</p>`
    );
  }

  /** EmailLog yozuvini yaratadi — statistikani buzmaslik uchun o'zi xato bersa yutiladi. */
  private async logEmail(
    type: EmailType,
    recipient: string,
    status: EmailStatus,
    error?: string,
  ): Promise<void> {
    try {
      await this.prisma.emailLog.create({
        data: { type, recipient, status, error: error ?? null },
      });
    } catch (e) {
      this.logger.warn(
        `EmailLog yozib bo'lmadi: ${e instanceof Error ? e.message : e}`,
      );
    }
  }

  /** .hbs shablonni topib, ma'lumot bilan render qiladi. */
  private render(filename: string, data: Record<string, string>): string {
    const candidates = [
      path.join(__dirname, 'templates', filename), // dist (build)
      path.join(process.cwd(), 'src', 'mail', 'templates', filename), // dev
    ];
    const file = candidates.find((p) => fs.existsSync(p));
    if (!file) return `<p>Sizning kodingiz: <b>${data.code}</b></p>`;
    return Handlebars.compile(fs.readFileSync(file, 'utf8'))(data);
  }
}
