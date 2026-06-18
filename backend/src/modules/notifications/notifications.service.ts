import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
  ) {}

  /**
   * Markaziy bildirishnoma yaratish: DB'ga yozadi VA real-time emit qiladi.
   * Comments/Likes service'lari shu metodni chaqiradi.
   */
  async create(userId: string, type: NotificationType, referenceId: string) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, referenceId },
    });

    // Real-time yuborish (user onlayn bo'lsa darhol ko'radi)
    this.gateway.emitToUser(userId, notification);

    return notification;
  }

  /** Foydalanuvchining bildirishnomalari + o'qilmaganlar soni. */
  async list(userId: string) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    // Har bildirishnomani tegishli maqola (slug + title) bilan boyitamiz:
    //  NEW_LIKE   → referenceId = articleId
    //  izoh turlari → referenceId = commentId → comment.article
    const likeArticleIds = items
      .filter((i) => i.type === NotificationType.NEW_LIKE)
      .map((i) => i.referenceId);
    const commentIds = items
      .filter((i) => i.type !== NotificationType.NEW_LIKE)
      .map((i) => i.referenceId);

    const [articles, comments] = await Promise.all([
      this.prisma.article.findMany({
        where: { id: { in: likeArticleIds } },
        select: { id: true, slug: true, title: true },
      }),
      this.prisma.comment.findMany({
        where: { id: { in: commentIds } },
        select: {
          id: true,
          article: { select: { slug: true, title: true } },
        },
      }),
    ]);

    const artById = new Map(
      articles.map((a) => [a.id, { slug: a.slug, title: a.title }]),
    );
    const artByComment = new Map(
      comments.map((c) => [
        c.id,
        c.article ? { slug: c.article.slug, title: c.article.title } : null,
      ]),
    );

    const enriched = items.map((i) => ({
      ...i,
      article:
        i.type === NotificationType.NEW_LIKE
          ? artById.get(i.referenceId) ?? null
          : artByComment.get(i.referenceId) ?? null,
    }));

    return {
      data: { items: enriched, unreadCount },
      message: 'Bildirishnomalar',
    };
  }

  /** Bitta bildirishnomani o'qildi deb belgilash. */
  async markRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException('Bildirishnoma topilmadi');
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException('Bu sizning bildirishnomangiz emas');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return { data: updated, message: 'O\'qildi deb belgilandi' };
  }

  /** Barcha bildirishnomalarni o'qildi deb belgilash. */
  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return {
      data: { updated: result.count },
      message: 'Barchasi o\'qildi deb belgilandi',
    };
  }
}
