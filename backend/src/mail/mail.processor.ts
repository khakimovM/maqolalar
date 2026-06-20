import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

type MailJobData = { email: string; code: string };

const SUBJECTS: Record<string, string> = {
  'otp-verification': 'Maqolalar — Email tasdiqlash kodi',
  'otp-reset': 'Maqolalar — Parolni tiklash kodi',
  'otp-change-email': 'Maqolalar — Yangi emailni tasdiqlash kodi',
};

/**
 * BullMQ worker: "mail" navbatidagi joblarni qayta ishlaydi.
 *
 * DEV MODE: .env da MAIL_USER bo'sh bo'lsa, email yuborilmaydi —
 * OTP kod konsolga chiqadi. Postman bilan test qilish uchun qulay.
 */
@Processor('mail')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);
  private readonly transporter: nodemailer.Transporter | null = null;

  constructor(private readonly config: ConfigService) {
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

    // DEV MODE — SMTP sozlanmagan
    if (!this.transporter) {
      this.logger.log(`📧 [DEV MODE] ${job.name} → ${email} | KOD: ${code}`);
      return;
    }

    await this.transporter.sendMail({
      from: this.config.get<string>('MAIL_FROM'),
      to: email,
      subject: SUBJECTS[job.name] ?? 'Maqolalar',
      html: this.render(`${job.name}.hbs`, { code, email }),
    });
    this.logger.log(`📧 ${job.name} yuborildi → ${email}`);
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
