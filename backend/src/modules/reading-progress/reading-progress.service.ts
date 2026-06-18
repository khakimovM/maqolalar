import { Injectable, NotFoundException } from '@nestjs/common';
import { ArticleStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { SaveProgressDto } from './dto/save-progress.dto';

/** "Davom ettiriladi" ro'yxatida qaytariladigan maqola maydonlari. */
const PROGRESS_ARTICLE_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  type: true,
  publishedAt: true,
  author: { select: { id: true, username: true, avatar: true } },
  category: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.ArticleSelect;

@Injectable()
export class ReadingProgressService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upsert: bor bo'lsa yangilaydi, yo'q bo'lsa yaratadi.
   * "Shu yerda to'xtadim" tugmasi bosilganda chaqiriladi.
   */
  async save(articleId: string, userId: string, dto: SaveProgressDto) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
    });
    if (!article || article.status !== ArticleStatus.PUBLISHED) {
      throw new NotFoundException('Maqola topilmadi');
    }

    const progress = await this.prisma.readingProgress.upsert({
      where: { userId_articleId: { userId, articleId } },
      create: { userId, articleId, scrollPercent: dto.scrollPercent },
      update: { scrollPercent: dto.scrollPercent, lastMarkedAt: new Date() },
    });

    return {
      data: {
        scrollPercent: progress.scrollPercent,
        lastMarkedAt: progress.lastMarkedAt,
      },
      message: 'O\'qish belgisi saqlandi',
    };
  }

  /**
   * "Davom ettiriladi" tabi — eng oxirgi belgilangan avval.
   */
  async list(userId: string) {
    const items = await this.prisma.readingProgress.findMany({
      where: { userId },
      orderBy: { lastMarkedAt: 'desc' },
      select: {
        scrollPercent: true,
        lastMarkedAt: true,
        article: { select: PROGRESS_ARTICLE_SELECT },
      },
    });

    const data = items.map((item) => ({
      ...item.article,
      scrollPercent: item.scrollPercent,
      lastMarkedAt: item.lastMarkedAt,
    }));

    return { data, message: 'Davom ettirilayotgan maqolalar' };
  }

  /**
   * Belgini o'chirish (ro'yxatdan olib tashlash).
   */
  async remove(articleId: string, userId: string) {
    const existing = await this.prisma.readingProgress.findUnique({
      where: { userId_articleId: { userId, articleId } },
    });
    if (!existing) {
      throw new NotFoundException('O\'qish belgisi topilmadi');
    }

    await this.prisma.readingProgress.delete({ where: { id: existing.id } });

    return { data: null, message: 'O\'qish belgisi o\'chirildi' };
  }
}
