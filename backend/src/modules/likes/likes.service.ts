import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleStatus, NotificationType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class LikesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Toggle: layk yo'q bo'lsa qo'shadi, bor bo'lsa olib tashlaydi.
   */
  async toggle(articleId: string, userId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article || article.status !== ArticleStatus.PUBLISHED) {
      throw new NotFoundException('Maqola topilmadi');
    }

    const existing = await this.prisma.like.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });

    let liked: boolean;

    if (existing) {
      await this.prisma.like.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await this.prisma.like.create({ data: { userId, articleId } });
      liked = true;

      // Maqola muallifiga bildirishnoma (o'z maqolasiga bossa — yo'q)
      // DB'ga yozadi VA real-time emit qiladi
      if (article.authorId !== userId) {
        await this.notifications.create(
          article.authorId,
          NotificationType.NEW_LIKE,
          articleId,
        );
      }
    }

    const likeCount = await this.prisma.like.count({ where: { articleId } });

    return {
      data: { liked, likeCount },
      message: liked ? 'Layk bosildi' : 'Layk olib tashlandi',
    };
  }
}
