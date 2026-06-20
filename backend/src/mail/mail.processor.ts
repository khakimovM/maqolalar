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

type MailJobData = { email: string; code: string };

const SUBJECTS: Record<string, string> = {
  'otp-verification': 'Maqolalar — Email tasdiqlash kodi',
  'otp-reset': 'Maqolalar — Parolni tiklash kodi',
  'otp-change-email': 'Maqolalar — Yangi emailni tasdiqlash kodi',
};

// Job nomini EmailType enum'ga moslash
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
 * Har bir urinish EmailLog jadvaliga yoziladi (statistika uchun).
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
    const { email, code } = job.data;
    const type = TYPE_MAP[job.name] ?? EmailType.VERIFICATION;

    // DEV MODE — SMTP sozlanmagan: kod konsolga, baribir log yoziladi
    if (!this.transporter) {
      this.logger.log(`📧 [DEV MODE] ${job.name} → ${email} | KOD: ${code}`);
      await this.logEmail(type, email, EmailStatus.SENT);
      return;
    }

    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('MAIL_FROM'),
        to: email,
        subject: SUBJECTS[job.name] ?? 'Maqolalar',
        html: this.render(`${job.name}.hbs`, { code, email }),
      });
      this.logger.log(`📧 ${job.name} yuborildi → ${email}`);
      await this.logEmail(type, email, EmailStatus.SENT);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`📧 ${job.name} XATO → ${email}: ${msg}`);
      await this.logEmail(type, email, EmailStatus.FAILED, msg);
      throw err; // BullMQ qayta urinishi uchun
    }
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
