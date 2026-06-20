import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EmailStatus, EmailType, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { StatsQueryDto } from './dto/stats-query.dto';

const SAFE_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  avatar: true,
  role: true,
  isActive: true,
  isVerified: true,
  createdAt: true,
} as const;

type Bucket = { start: Date; end: Date; label: string };

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  /** Yangi admin yaratish (faqat SUPERADMIN). */
  async createAdmin(dto: CreateAdminDto) {
    const [byEmail, byUsername] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: dto.email } }),
      this.prisma.user.findUnique({ where: { username: dto.username } }),
    ]);
    if (byEmail) throw new ConflictException('Bu email allaqachon band');
    if (byUsername) throw new ConflictException('Bu username allaqachon band');

    const admin = await this.prisma.user.create({
      data: {
        email: dto.email,
        username: dto.username,
        password: await bcrypt.hash(dto.password, 10),
        role: Role.ADMIN,
        isVerified: true,
        isActive: true,
      },
      select: SAFE_USER_SELECT,
    });

    return { data: admin, message: 'Admin yaratildi' };
  }

  /** Adminlar ro'yxati (maqolalar soni bilan). */
  async listAdmins() {
    const admins = await this.prisma.user.findMany({
      where: { role: Role.ADMIN },
      orderBy: { createdAt: 'desc' },
      select: {
        ...SAFE_USER_SELECT,
        _count: { select: { articles: true } },
      },
    });
    return { data: admins, message: 'Adminlar ro\'yxati' };
  }

  /** Adminni faollashtirish / bloklash. Faqat ADMIN roliga ta'sir qiladi. */
  async setActive(id: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException('Faqat adminlarni boshqarish mumkin');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: SAFE_USER_SELECT,
    });

    if (!isActive) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    return {
      data: updated,
      message: isActive ? 'Admin faollashtirildi' : 'Admin bloklandi',
    };
  }

  /** Umumiy (barcha vaqt) jami ko'rsatkichlar. */
  async stats(query: StatsQueryDto) {
    const { from, to } = this.resolveRange(query);

    const [
      users,
      admins,
      articles,
      publishedArticles,
      comments,
      categories,
      viewsAgg,
      emails,
      newUsers,
      newArticles,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: Role.USER } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.article.count(),
      this.prisma.article.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.comment.count({ where: { isDeleted: false } }),
      this.prisma.category.count(),
      this.prisma.article.aggregate({ _sum: { viewCount: true } }),
      this.prisma.emailLog.count(),
      this.prisma.user.count({ where: { createdAt: { gte: from, lte: to } } }),
      this.prisma.article.count({
        where: { createdAt: { gte: from, lte: to } },
      }),
    ]);

    return {
      data: {
        totals: {
          users,
          admins,
          articles,
          publishedArticles,
          comments,
          categories,
          views: viewsAgg._sum.viewCount ?? 0,
          emails,
        },
        range: { from, to, newUsers, newArticles },
      },
      message: 'Statistika',
    };
  }

  /**
   * Vaqt qatorlari (o'sish grafiklari uchun): tanlangan davrga qarab
   * guruhlangan — foydalanuvchi, maqola, email, ko'rish, izoh.
   */
  async timeseries(query: StatsQueryDto) {
    const buckets = this.buildBuckets(query);
    const rangeStart = buckets[0].start;
    const rangeEnd = buckets[buckets.length - 1].end;
    const range = { gte: rangeStart, lt: rangeEnd };

    const [users, articles, emails, views, comments] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: Role.USER, createdAt: range },
        select: { createdAt: true },
      }),
      this.prisma.article.findMany({
        where: { createdAt: range },
        select: { createdAt: true },
      }),
      this.prisma.emailLog.findMany({
        where: { createdAt: range },
        select: { createdAt: true },
      }),
      this.prisma.articleView.findMany({
        where: { createdAt: range },
        select: { createdAt: true },
      }),
      this.prisma.comment.findMany({
        where: { createdAt: range },
        select: { createdAt: true },
      }),
    ]);

    const bucketize = (rows: { createdAt: Date }[]): number[] => {
      const counts = new Array<number>(buckets.length).fill(0);
      for (const r of rows) {
        const t = r.createdAt.getTime();
        for (let i = 0; i < buckets.length; i++) {
          if (t >= buckets[i].start.getTime() && t < buckets[i].end.getTime()) {
            counts[i] += 1;
            break;
          }
        }
      }
      return counts;
    };

    // Email holati/turlari — tanlangan davr ichida
    const [sent, failed, verification, reset, changeEmail] = await Promise.all([
      this.prisma.emailLog.count({ where: { createdAt: range, status: EmailStatus.SENT } }),
      this.prisma.emailLog.count({ where: { createdAt: range, status: EmailStatus.FAILED } }),
      this.prisma.emailLog.count({ where: { createdAt: range, type: EmailType.VERIFICATION } }),
      this.prisma.emailLog.count({ where: { createdAt: range, type: EmailType.RESET } }),
      this.prisma.emailLog.count({ where: { createdAt: range, type: EmailType.CHANGE_EMAIL } }),
    ]);

    return {
      data: {
        buckets: buckets.map((b) => b.label),
        series: {
          users: bucketize(users),
          articles: bucketize(articles),
          emails: bucketize(emails),
          views: bucketize(views),
          comments: bucketize(comments),
        },
        email: { sent, failed, verification, reset, changeEmail },
      },
      message: 'Vaqt qatorlari',
    };
  }

  // ── yordamchi: davrni bucketlarga bo'lish ──────────────────

  private dm(d: Date): string {
    return `${String(d.getDate()).padStart(2, '0')}/${String(
      d.getMonth() + 1,
    ).padStart(2, '0')}`;
  }
  private my(d: Date): string {
    return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(
      d.getFullYear(),
    ).slice(2)}`;
  }

  private buildBuckets(query: StatsQueryDto): Bucket[] {
    const now = new Date();
    const buckets: Bucket[] = [];

    // Maxsus oraliq — kunlik (>62 kun bo'lsa oylik)
    if (query.from) {
      const from = new Date(query.from);
      from.setHours(0, 0, 0, 0);
      const to = query.to ? new Date(query.to) : now;
      const days = Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1;
      if (days <= 62) {
        for (let i = 0; i < days; i++) {
          const s = new Date(from);
          s.setDate(s.getDate() + i);
          const e = new Date(s);
          e.setDate(e.getDate() + 1);
          buckets.push({ start: s, end: e, label: this.dm(s) });
        }
      } else {
        const cur = new Date(from.getFullYear(), from.getMonth(), 1);
        while (cur <= to) {
          const s = new Date(cur);
          const e = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
          buckets.push({ start: s, end: e, label: this.my(s) });
          cur.setMonth(cur.getMonth() + 1);
        }
      }
      return buckets;
    }

    switch (query.period) {
      case 'monthly': {
        // oxirgi 12 oy
        for (let i = 11; i >= 0; i--) {
          const s = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const e = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
          buckets.push({ start: s, end: e, label: this.my(s) });
        }
        break;
      }
      case 'yearly': {
        // oxirgi 5 yil
        const y = now.getFullYear();
        for (let i = 4; i >= 0; i--) {
          const s = new Date(y - i, 0, 1);
          const e = new Date(y - i + 1, 0, 1);
          buckets.push({ start: s, end: e, label: String(y - i) });
        }
        break;
      }
      case 'daily':
      default: {
        // oxirgi 14 kun
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - 13);
        for (let i = 0; i < 14; i++) {
          const s = new Date(start);
          s.setDate(s.getDate() + i);
          const e = new Date(s);
          e.setDate(e.getDate() + 1);
          buckets.push({ start: s, end: e, label: this.dm(s) });
        }
        break;
      }
    }
    return buckets;
  }

  /** period yoki from/to dan [from, to] oralig'ini hisoblaydi (jami stats uchun). */
  private resolveRange(query: StatsQueryDto): { from: Date; to: Date } {
    const now = new Date();
    if (query.from) {
      return {
        from: new Date(query.from),
        to: query.to ? new Date(query.to) : now,
      };
    }
    const from = new Date(now);
    switch (query.period) {
      case 'daily':
        from.setHours(0, 0, 0, 0);
        break;
      case 'yearly':
        from.setMonth(0, 1);
        from.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
      default:
        from.setDate(1);
        from.setHours(0, 0, 0, 0);
        break;
    }
    return { from, to: now };
  }
}
