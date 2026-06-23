import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

/**
 * Ma'lumotlar bazasini cheksiz shishishidan saqlovchi rejalashtirilgan tozalash.
 *
 * Nega kerak: refresh_tokens har login'da, article_views har ko'rishda o'sadi.
 * Bularsiz DB oylar ichida shishadi va sekinlashadi. Har kuni eskirgan
 * yozuvlarni o'chiramiz; agregat ma'lumot (Article.viewCount) saqlanib qoladi.
 *
 * Saqlash muddatlari .env orqali sozlanadi (0 = o'sha jadval tozalanmaydi).
 */
@Injectable()
export class MaintenanceService {
  private readonly logger = new Logger(MaintenanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Har kuni soat 03:00 (server vaqti) — kam trafik oynasi. */
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { name: 'data-retention' })
  async cleanup(): Promise<void> {
    const started = Date.now();
    this.logger.log('Retention tozalash boshlandi...');
    try {
      const [tokens, views, notifs, emails] = await Promise.all([
        this.cleanupRefreshTokens(),
        this.cleanupArticleViews(),
        this.cleanupNotifications(),
        this.cleanupEmailLogs(),
      ]);
      this.logger.log(
        `Retention tugadi (${Date.now() - started}ms): ` +
          `refresh_tokens=${tokens}, article_views=${views}, ` +
          `notifications=${notifs}, email_logs=${emails}`,
      );
    } catch (err) {
      // Bitta xato butun cron'ni o'ldirmasin — keyingi kun qayta urinadi.
      this.logger.error('Retention tozalashda xato', err as Error);
    }
  }

  /**
   * Muddati o'tgan refresh tokenlar. usedAt bo'lgan (rotation qilingan) tokenlar
   * ham, ishlatilmaganlar ham — faqat amal qilish muddati tugaganlar o'chiriladi.
   * Reuse-detection oynasi token amal qiladigan davr ichida saqlanadi.
   */
  private async cleanupRefreshTokens(): Promise<number> {
    const { count } = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return count;
  }

  /** N kundan eski ko'rish yozuvlari (Article.viewCount agregati saqlanadi). */
  private async cleanupArticleViews(): Promise<number> {
    const days = this.retentionDays('VIEW_RETENTION_DAYS', 180);
    if (days <= 0) return 0;
    const { count } = await this.prisma.articleView.deleteMany({
      where: { createdAt: { lt: this.daysAgo(days) } },
    });
    return count;
  }

  /** N kundan eski O'QILGAN bildirishnomalar (o'qilmaganlar tegilmaydi). */
  private async cleanupNotifications(): Promise<number> {
    const days = this.retentionDays('NOTIFICATION_RETENTION_DAYS', 90);
    if (days <= 0) return 0;
    const { count } = await this.prisma.notification.deleteMany({
      where: { isRead: true, createdAt: { lt: this.daysAgo(days) } },
    });
    return count;
  }

  /** N kundan eski email loglari (statistika eskirgach saqlash shart emas). */
  private async cleanupEmailLogs(): Promise<number> {
    const days = this.retentionDays('EMAILLOG_RETENTION_DAYS', 180);
    if (days <= 0) return 0;
    const { count } = await this.prisma.emailLog.deleteMany({
      where: { createdAt: { lt: this.daysAgo(days) } },
    });
    return count;
  }

  private retentionDays(key: string, fallback: number): number {
    return Number(this.config.get(key, fallback));
  }

  private daysAgo(days: number): Date {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }
}
