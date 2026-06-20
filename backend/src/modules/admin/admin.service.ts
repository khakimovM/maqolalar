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

    // Bloklanganda barcha sessiyalarni bekor qilamiz
    if (!isActive) {
      await this.prisma.refreshToken.deleteMany({ where: { userId: id } });
    }

    return {
      data: updated,
      message: isActive ? 'Admin faollashtirildi' : 'Admin bloklandi',
    };
  }

  /** Umumiy statistika + tanlangan oraliqdagi yangi yozuvlar. */
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
        },
        range: {
          from,
          to,
          newUsers,
          newArticles,
        },
      },
      message: 'Statistika',
    };
  }

  /** period yoki from/to dan [from, to] oralig'ini hisoblaydi. */
  private resolveRange(query: StatsQueryDto): { from: Date; to: Date } {
    const now = new Date();

    // Maxsus oraliq ustunlikka ega
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

  /**
   * Email yuborish statistikasi: jami/davr bo'yicha son, holat (sent/failed),
   * turlari bo'yicha taqsimot va so'nggi 14 kunlik o'sish grafigi.
   */
  async emailStats() {
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const weekAgo = new Date(startOfDay);
    weekAgo.setDate(weekAgo.getDate() - 6); // bugun + oldingi 6 kun = 7 kun

    const monthStart = new Date(now);
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const DAYS = 14;
    const seriesStart = new Date(startOfDay);
    seriesStart.setDate(seriesStart.getDate() - (DAYS - 1));

    // So'nggi 14 kun uchun kunlik count (timezone'ga mos chegaralar bilan)
    const dayCounts = await Promise.all(
      Array.from({ length: DAYS }).map((_, i) => {
        const start = new Date(seriesStart);
        start.setDate(start.getDate() + i);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        const date = `${start.getFullYear()}-${String(
          start.getMonth() + 1,
        ).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        return this.prisma.emailLog
          .count({ where: { createdAt: { gte: start, lt: end } } })
          .then((count) => ({ date, count }));
      }),
    );

    const [all, today, week, month, sent, failed, verification, reset, changeEmail] =
      await Promise.all([
        this.prisma.emailLog.count(),
        this.prisma.emailLog.count({ where: { createdAt: { gte: startOfDay } } }),
        this.prisma.emailLog.count({ where: { createdAt: { gte: weekAgo } } }),
        this.prisma.emailLog.count({ where: { createdAt: { gte: monthStart } } }),
        this.prisma.emailLog.count({ where: { status: EmailStatus.SENT } }),
        this.prisma.emailLog.count({ where: { status: EmailStatus.FAILED } }),
        this.prisma.emailLog.count({ where: { type: EmailType.VERIFICATION } }),
        this.prisma.emailLog.count({ where: { type: EmailType.RESET } }),
        this.prisma.emailLog.count({ where: { type: EmailType.CHANGE_EMAIL } }),
      ]);

    return {
      data: {
        totals: { today, week, month, all },
        status: { sent, failed },
        byType: { verification, reset, changeEmail },
        series: dayCounts,
      },
      message: 'Email statistikasi',
    };
  }
}
