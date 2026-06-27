import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ArticleStatus, ArticleType, Prisma, Role, User } from '@prisma/client';
import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { uploadRoot } from '../upload/multer.config';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { slugify } from '../../common/utils/slugify';
import { extractTiptapText } from '../../common/utils/tiptap-text';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleQueryDto } from './dto/article-query.dto';

type SafeUser = Pick<User, 'id' | 'role'> | undefined;

/** Ro'yxatda qaytariladigan maydonlar (og'ir content YO'Q). */
const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  type: true,
  status: true,
  viewCount: true,
  publishedAt: true,
  createdAt: true,
  author: { select: { id: true, username: true, avatar: true } },
  category: { select: { id: true, name: true, slug: true } },
  _count: { select: { likes: true, comments: true } },
} satisfies Prisma.ArticleSelect;

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  // ==========================================================
  // PUBLIC: RO'YXAT VA BITTA MAQOLA
  // ==========================================================

  async findAll(query: ArticleQueryDto, user: SafeUser) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.ArticleWhereInput = {
      status: ArticleStatus.PUBLISHED,
      // Mehmon faqat FREE ko'radi; kirgan user filtr tanlashi mumkin
      type: user ? query.type : ArticleType.FREE,
      ...(query.category && { category: { slug: query.category } }),
      ...(query.search && {
        OR: [
          { title: { contains: query.search, mode: 'insensitive' as const } },
          {
            searchText: {
              contains: query.search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: {
        items,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
      message: 'OK',
    };
  }

  async findBySlug(slug: string, user: SafeUser, ip?: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      include: {
        author: { select: { id: true, username: true, avatar: true } },
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    if (!article || article.status !== ArticleStatus.PUBLISHED) {
      throw new NotFoundException('Maqola topilmadi');
    }

    // PREMIUM — faqat ro'yxatdan o'tganlar uchun
    if (article.type === ArticleType.PREMIUM && !user) {
      throw new ForbiddenException(
        "Bu PREMIUM maqola — o'qish uchun ro'yxatdan o'ting",
      );
    }

    // View hisobi: takroriy ko'rishlar vaqt oynasida bir marta sanaladi
    const counted = await this.recordView(article.id, user, ip);

    const { searchText, ...result } = article;
    return {
      data: { ...result, viewCount: result.viewCount + (counted ? 1 : 0) },
      message: 'OK',
    };
  }

  /**
   * SEO metadata uchun yengil ma'lumot — viewCount oshmaydi va content
   * qaytarilmaydi. Premium maqolalar uchun ham ochiq (faqat meta, matn emas).
   */
  async findMetaBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      select: {
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        type: true,
        status: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { username: true } },
        category: { select: { name: true, slug: true } },
      },
    });

    if (!article || article.status !== ArticleStatus.PUBLISHED) {
      throw new NotFoundException('Maqola topilmadi');
    }

    return { data: article, message: 'OK' };
  }

  // ==========================================================
  // ADMIN: CRUD
  // ==========================================================

  /**
   * Maqolaning .csl iqtibos uslubini RAW matn sifatida qaytaradi. Controller uni
   * to'g'ri MIME bilan yuboradi → Zotero Connector "uslubni o'rnataymi?" deydi.
   */
  async getCitationStyle(slug: string): Promise<string> {
    const article = await this.prisma.article.findUnique({
      where: { slug },
      select: { citationStyle: true },
    });
    if (!article?.citationStyle) {
      throw new NotFoundException('Bu maqolada iqtibos uslubi yo\'q');
    }
    // Faqat fayl nomini olamiz — path-traversal himoyasi
    const filename = article.citationStyle.split('/').pop() ?? '';
    if (!/^[\w.-]+\.csl$/.test(filename)) {
      throw new NotFoundException('Iqtibos uslubi fayli topilmadi');
    }
    try {
      return await readFile(join(uploadRoot(), 'styles', filename), 'utf8');
    } catch {
      throw new NotFoundException('Iqtibos uslubi fayli topilmadi');
    }
  }

  async create(dto: CreateArticleDto, authorId: string) {
    await this.ensureCategoryExists(dto.categoryId);

    const searchText = extractTiptapText(dto.content);

    const article = await this.prisma.article.create({
      data: {
        title: dto.title,
        slug: await this.uniqueSlug(dto.title),
        content: dto.content,
        searchText,
        excerpt: dto.excerpt ?? this.deriveExcerpt(searchText),
        coverImage: dto.coverImage,
        citationStyle: dto.citationStyle,
        type: dto.type ?? ArticleType.FREE,
        authorId,
        categoryId: dto.categoryId,
      },
      select: LIST_SELECT,
    });

    return { data: article, message: 'Maqola yaratildi (DRAFT)' };
  }

  async update(id: string, dto: UpdateArticleDto, user: { id: string; role: Role }) {
    const article = await this.findOwned(id, user);

    if (dto.categoryId) await this.ensureCategoryExists(dto.categoryId);

    const searchText = dto.content
      ? extractTiptapText(dto.content)
      : undefined;

    const updated = await this.prisma.article.update({
      where: { id: article.id },
      data: {
        ...(dto.title && { title: dto.title }), // slug o'zgarmaydi — SEO barqarorligi
        ...(dto.content && { content: dto.content, searchText }),
        ...(dto.excerpt !== undefined && { excerpt: dto.excerpt }),
        ...(dto.coverImage !== undefined && { coverImage: dto.coverImage }),
        ...(dto.citationStyle !== undefined && {
          citationStyle: dto.citationStyle,
        }),
        ...(dto.type && { type: dto.type }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
      },
      select: LIST_SELECT,
    });

    return { data: updated, message: 'Maqola yangilandi' };
  }

  async remove(id: string, user: { id: string; role: Role }) {
    const article = await this.findOwned(id, user);
    await this.prisma.article.delete({ where: { id: article.id } });
    return { data: null, message: "Maqola o'chirildi" };
  }

  // ==========================================================
  // ADMIN: STATUS BOSHQARUVI
  // ==========================================================

  async publish(id: string, user: { id: string; role: Role }) {
    const article = await this.findOwned(id, user);

    const updated = await this.prisma.article.update({
      where: { id: article.id },
      data: {
        status: ArticleStatus.PUBLISHED,
        // publishedAt faqat birinchi marta set qilinadi
        ...(article.publishedAt ? {} : { publishedAt: new Date() }),
      },
      select: LIST_SELECT,
    });

    return { data: updated, message: 'Maqola e\'lon qilindi' };
  }

  async archive(id: string, user: { id: string; role: Role }) {
    const article = await this.findOwned(id, user);

    const updated = await this.prisma.article.update({
      where: { id: article.id },
      data: { status: ArticleStatus.ARCHIVED },
      select: LIST_SELECT,
    });

    return { data: updated, message: 'Maqola arxivlandi' };
  }

  // ==========================================================
  // ADMIN: DASHBOARD
  // ==========================================================

  async findMy(authorId: string, query: ArticleQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const where: Prisma.ArticleWhereInput = {
      authorId,
      ...(query.status && { status: query.status }),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        select: LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      data: {
        items,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      },
      message: 'OK',
    };
  }

  async myAnalytics(authorId: string) {
    const articles = await this.prisma.article.findMany({
      where: { authorId },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        type: true,
        viewCount: true,
        publishedAt: true,
        _count: { select: { likes: true, comments: true } },
      },
      orderBy: { viewCount: 'desc' },
    });

    const totals = articles.reduce(
      (acc, a) => ({
        views: acc.views + a.viewCount,
        likes: acc.likes + a._count.likes,
        comments: acc.comments + a._count.comments,
      }),
      { views: 0, likes: 0, comments: 0 },
    );

    return {
      data: {
        totals: { ...totals, articles: articles.length },
        articles: articles.map((a) => ({
          id: a.id,
          title: a.title,
          slug: a.slug,
          status: a.status,
          type: a.type,
          views: a.viewCount,
          likes: a._count.likes,
          comments: a._count.comments,
          publishedAt: a.publishedAt,
        })),
      },
      message: 'OK',
    };
  }

  // ==========================================================
  // HELPERS
  // ==========================================================

  /**
   * Tahrirlash uchun bitta maqola (qoralama/arxiv ham), egalik tekshiruvi bilan.
   * View hisoblamaydi; content qaytadi (searchText'siz).
   */
  async findOneForEdit(id: string, user: { id: string; role: Role }) {
    const article = await this.findOwned(id, user);
    const { searchText, ...result } = article;
    void searchText;
    return { data: result, message: 'OK' };
  }

  /**
   * Maqolani topadi va egalikni tekshiradi:
   * ADMIN — faqat o'zinikini, SUPERADMIN — istalganini boshqaradi.
   */
  private async findOwned(id: string, user: { id: string; role: Role }) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('Maqola topilmadi');

    if (user.role !== Role.SUPERADMIN && article.authorId !== user.id) {
      throw new ForbiddenException(
        "Bu maqola sizniki emas — faqat o'z maqolangizni boshqara olasiz",
      );
    }
    return article;
  }

  /** Slug to'qnashsa "-2", "-3" suffix qo'shadi. */
  private async uniqueSlug(title: string): Promise<string> {
    const base = slugify(title);
    let slug = base;
    let counter = 2;

    while (await this.prisma.article.findUnique({ where: { slug } })) {
      slug = `${base}-${counter++}`;
    }
    return slug;
  }

  /** Excerpt berilmasa — matnning birinchi ~200 belgisi. */
  private deriveExcerpt(searchText: string): string | null {
    if (!searchText) return null;
    return searchText.length <= 200
      ? searchText
      : `${searchText.slice(0, 200).trimEnd()}...`;
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');
  }

  /**
   * View hisobi — bir foydalanuvchi/IP uchun belgilangan vaqt oynasida
   * (VIEW_DEDUP_TTL, standart 1 soat) faqat BIR MARTA sanaladi. Sahifani
   * qayta yuklash ko'rishlar sonini sun'iy oshirmaydi.
   * Sanalganda true qaytaradi. Redis nosoz bo'lsa — ko'rish baribir sanaladi.
   */
  private async recordView(
    articleId: string,
    user: SafeUser,
    ip?: string,
  ): Promise<boolean> {
    const identity = user?.id ?? (ip ? this.ipHash(ip) : null);

    if (identity) {
      try {
        const key = `view:${articleId}:${identity}`;
        if (await this.redis.get(key)) {
          return false; // yaqinda sanalган — qayta sanamaymiz
        }
        const ttl = this.config.get<number>('VIEW_DEDUP_TTL', 3600);
        await this.redis.set(key, '1', ttl);
      } catch {
        // Redis muammosi — dedup'ni o'tkazib yuboramiz, ko'rish sanalaveradi
      }
    }

    await this.prisma.$transaction([
      this.prisma.article.update({
        where: { id: articleId },
        data: { viewCount: { increment: 1 } },
      }),
      this.prisma.articleView.create({
        data: {
          articleId,
          userId: user?.id ?? null,
          ipHash: !user && ip ? this.ipHash(ip) : null,
        },
      }),
    ]);
    return true;
  }

  private ipHash(ip: string): string {
    return createHash('sha256').update(ip).digest('hex');
  }
}
