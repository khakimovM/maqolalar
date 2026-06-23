import { ArticlesService } from './articles.service';
import { ArticleStatus, ArticleType, Role } from '@prisma/client';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

/**
 * Avtorizatsiya mantig'i (DB'siz, mock bilan):
 *  - PREMIUM kontent mehmonlardan yashiriladi
 *  - egalik: ADMIN faqat o'zinikini, SUPERADMIN hammasini boshqaradi
 */

describe('ArticlesService — avtorizatsiya', () => {
  let service: ArticlesService;
  let prisma: any;
  let redis: any;
  let config: any;

  beforeEach(() => {
    prisma = {
      article: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
      articleView: { create: jest.fn() },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    config = { get: jest.fn((_k: string, d?: unknown) => d) };
    service = new ArticlesService(prisma, redis, config);
  });

  describe('findBySlug — premium gating', () => {
    it("PREMIUM + mehmon (user yo'q) → 403", async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: 'a1',
        status: ArticleStatus.PUBLISHED,
        type: ArticleType.PREMIUM,
        viewCount: 0,
        searchText: '',
      });
      await expect(service.findBySlug('s', undefined)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('PREMIUM + kirgan user → ruxsat', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: 'a1',
        status: ArticleStatus.PUBLISHED,
        type: ArticleType.PREMIUM,
        viewCount: 5,
        searchText: '',
      });
      const res = await service.findBySlug('s', { id: 'u1', role: Role.USER });
      expect(res.data.id).toBe('a1');
    });

    it('FREE + mehmon → ruxsat', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: 'a2',
        status: ArticleStatus.PUBLISHED,
        type: ArticleType.FREE,
        viewCount: 0,
        searchText: '',
      });
      const res = await service.findBySlug('s', undefined, '1.2.3.4');
      expect(res.data.id).toBe('a2');
    });

    it('nashr qilinmagan (DRAFT) → 404', async () => {
      prisma.article.findUnique.mockResolvedValue({
        id: 'a3',
        status: ArticleStatus.DRAFT,
        type: ArticleType.FREE,
        viewCount: 0,
        searchText: '',
      });
      await expect(service.findBySlug('s', undefined)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('topilmasa → 404', async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      await expect(service.findBySlug('s', undefined)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('remove — egalik (findOwned)', () => {
    const own = { id: 'art1', authorId: 'me' };

    it("egasi (ADMIN) → o'chiradi", async () => {
      prisma.article.findUnique.mockResolvedValue(own);
      await service.remove('art1', { id: 'me', role: Role.ADMIN });
      expect(prisma.article.delete).toHaveBeenCalledWith({
        where: { id: 'art1' },
      });
    });

    it('begona ADMIN → 403, o\'chirmaydi', async () => {
      prisma.article.findUnique.mockResolvedValue(own);
      await expect(
        service.remove('art1', { id: 'other', role: Role.ADMIN }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.article.delete).not.toHaveBeenCalled();
    });

    it("SUPERADMIN begona maqolani ham → o'chiradi", async () => {
      prisma.article.findUnique.mockResolvedValue(own);
      await service.remove('art1', { id: 'super', role: Role.SUPERADMIN });
      expect(prisma.article.delete).toHaveBeenCalled();
    });

    it('topilmasa → 404', async () => {
      prisma.article.findUnique.mockResolvedValue(null);
      await expect(
        service.remove('artX', { id: 'me', role: Role.ADMIN }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
