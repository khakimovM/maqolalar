import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

const JOB_OPTS = {
  attempts: 3, // xato bo'lsa 3 marta uriniladi
  backoff: { type: 'exponential' as const, delay: 2000 },
  removeOnComplete: true,
  removeOnFail: 50,
};

/**
 * Email yuborish — to'g'ridan-to'g'ri emas, BullMQ navbati orqali.
 * Request bloklanmaydi, email orqa fonda ketadi.
 */
@Injectable()
export class MailService {
  constructor(@InjectQueue('mail') private readonly queue: Queue) {}

  /** Ro'yxatdan o'tish OTP kodi */
  sendOtpVerification(email: string, code: string) {
    return this.queue.add('otp-verification', { email, code }, JOB_OPTS);
  }

  /** Parol tiklash OTP kodi */
  sendOtpReset(email: string, code: string) {
    return this.queue.add('otp-reset', { email, code }, JOB_OPTS);
  }

  /** Yangi emailni tasdiqlash OTP kodi (email o'zgartirish) */
  sendOtpChangeEmail(email: string, code: string) {
    return this.queue.add('otp-change-email', { email, code }, JOB_OPTS);
  }

  /** Email o'zgartirilgani haqida ESKI emailga ogohlantirish xati */
  sendEmailChangedNotice(oldEmail: string, newEmail: string) {
    return this.queue.add(
      'email-changed',
      { email: oldEmail, newEmail },
      JOB_OPTS,
    );
  }
}
