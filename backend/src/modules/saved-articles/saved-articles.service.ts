import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

/** Saqlangan maqolalar ro'yxatida qaytariladigan maydonlar (og'ir content YO'Q). */
const SAVED_ARTICLE_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  type: true,
  viewCount: true,
  publishedAt: true,
  author: { select: { id: true, username: true, avatar: true } },
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { likes: true, comments: true } },
} satisfies Prisma.ArticleSelect;

@Injectable()
export class SavedArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Toggle: saqlanmagan bo'lsa saqlaydi, saqlangan bo'lsa olib tashlaydi.
   */
  async toggle(articleId: string, userId: string) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article || article.status !== ArticleStatus.PUBLISHED) {
      throw new NotFoundException('Maqola topilmadi');
    }

    const existing = await this.prisma.savedArticle.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });

    let saved: boolean;

    if (existing) {
      await this.prisma.savedArticle.delete({ where: { id: existing.id } });
      saved = false;
    } else {
      await this.prisma.savedArticle.create({ data: { userId, articleId } });
      saved = true;
    }

    return {
      data: { saved },
      message: saved ? 'Maqola saqlandi' : 'Saqlangandan olib tashlandi',
    };
  }

  /**
   * Foydalanuvchining saqlangan maqolalari (eng yangi avval).
   */
  async list(userId: string) {
    const items = await this.prisma.savedArticle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        article: { select: SAVED_ARTICLE_SELECT },
      },
    });

    // Faqat maqola + saqlangan vaqt qaytaramiz
    const data = items.map((item) => ({
      ...item.article,
      savedAt: item.createdAt,
    }));

    return { data, message: 'Saqlangan maqolalar' };
  }
}
