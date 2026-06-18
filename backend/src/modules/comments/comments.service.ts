import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ArticleStatus,
  NotificationType,
  Prisma,
  Role,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ReportCommentDto } from './dto/report-comment.dto';

const AUTHOR_SELECT = {
  select: { id: true, username: true, avatar: true, role: true },
};

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ==========================================================
  // O'QISH
  // ==========================================================

  async findByArticle(slug: string) {
    const article = await this.findPublishedArticle(slug);

    const comments = await this.prisma.comment.findMany({
      where: { articleId: article.id },
      include: { author: AUTHOR_SELECT },
      orderBy: { createdAt: 'asc' },
    });

    // Tekis ro'yxatdan daraxt yasaymiz (nested replies)
    type Node = (typeof comments)[number] & { replies: Node[] };
    const map = new Map<string, Node>();
    const roots: Node[] = [];

    for (const c of comments) {
      map.set(c.id, { ...this.present(c), replies: [] } as unknown as Node);
    }
    for (const c of comments) {
      const node = map.get(c.id)!;
      if (c.parentId && map.has(c.parentId)) {
        map.get(c.parentId)!.replies.push(node);
      } else {
        roots.push(node);
      }
    }

    return {
      data: { items: roots, total: comments.length },
      message: 'OK',
    };
  }

  // ==========================================================
  // YOZISH
  // ==========================================================

  async create(slug: string, userId: string, dto: CreateCommentDto) {
    const article = await this.findPublishedArticle(slug);

    const comment = await this.prisma.comment.create({
      data: { content: dto.content, authorId: userId, articleId: article.id },
      include: { author: AUTHOR_SELECT },
    });

    // Maqola muallifiga bildirishnoma (o'ziga o'zi yozsa — yo'q)
    if (article.authorId !== userId) {
      await this.notify(article.authorId, NotificationType.NEW_COMMENT, comment.id);
    }

    return { data: this.present(comment), message: 'Comment qo\'shildi' };
  }

  async reply(parentId: string, userId: string, dto: CreateCommentDto) {
    const parent = await this.prisma.comment.findUnique({
      where: { id: parentId },
      include: { article: true },
    });

    if (!parent || parent.isDeleted) {
      throw new NotFoundException('Comment topilmadi');
    }
    if (parent.article.status !== ArticleStatus.PUBLISHED) {
      throw new NotFoundException('Maqola topilmadi');
    }

    const reply = await this.prisma.comment.create({
      data: {
        content: dto.content,
        authorId: userId,
        articleId: parent.articleId,
        parentId: parent.id,
      },
      include: { author: AUTHOR_SELECT },
    });

    // Comment egasiga bildirishnoma (o'z commentiga javob bersa — yo'q)
    if (parent.authorId !== userId) {
      await this.notify(parent.authorId, NotificationType.NEW_REPLY, reply.id);
    }

    return { data: this.present(reply), message: 'Javob qo\'shildi' };
  }

  async update(id: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.findAlive(id);

    if (comment.authorId !== userId) {
      throw new ForbiddenException("Faqat o'z commentingizni tahrirlay olasiz");
    }

    const updated = await this.prisma.comment.update({
      where: { id },
      data: { content: dto.content, isEdited: true },
      include: { author: AUTHOR_SELECT },
    });

    return { data: this.present(updated), message: 'Comment yangilandi' };
  }

  /** O'z commentini soft delete qilish. */
  async remove(id: string, userId: string) {
    const comment = await this.findAlive(id);

    if (comment.authorId !== userId) {
      throw new ForbiddenException("Faqat o'z commentingizni o'chira olasiz");
    }

    await this.softDelete(id);
    return { data: null, message: "Comment o'chirildi" };
  }

  // ==========================================================
  // SPAM REPORT
  // ==========================================================

  async report(id: string, userId: string, dto: ReportCommentDto) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { article: true },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment topilmadi');
    }
    if (comment.authorId === userId) {
      throw new BadRequestException(
        "O'z commentingizni spam deb belgilay olmaysiz",
      );
    }

    try {
      await this.prisma.commentReport.create({
        data: { commentId: id, reportedById: userId, reason: dto.reason },
      });
    } catch (e) {
      // unique(commentId, reportedById) — bir user bir marta
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        throw new ConflictException(
          'Siz bu commentni allaqachon spam deb belgilagansiz',
        );
      }
      throw e;
    }

    // Maqola muallifiga (admin) bildirishnoma
    if (comment.article.authorId !== userId) {
      await this.notify(
        comment.article.authorId,
        NotificationType.COMMENT_SPAM,
        comment.id,
      );
    }

    return { data: null, message: 'Comment spam deb belgilandi' };
  }

  // ==========================================================
  // ADMIN MODERATSIYA
  // ==========================================================

  /** ADMIN — o'z maqolasidagi istalgan commentni, SUPERADMIN — hammasini. */
  async adminRemove(id: string, user: { id: string; role: Role }) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { article: true },
    });

    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment topilmadi');
    }
    if (
      user.role !== Role.SUPERADMIN &&
      comment.article.authorId !== user.id
    ) {
      throw new ForbiddenException(
        "Faqat o'z maqolangizdagi commentlarni o'chira olasiz",
      );
    }

    await this.softDelete(id);
    return { data: null, message: "Comment o'chirildi (moderatsiya)" };
  }

  /** Spam deb belgilangan commentlar ro'yxati. */
  async findReported(user: { id: string; role: Role }) {
    const comments = await this.prisma.comment.findMany({
      where: {
        isDeleted: false,
        reports: { some: {} },
        // ADMIN faqat o'z maqolalaridagi reportlarni ko'radi
        ...(user.role !== Role.SUPERADMIN && {
          article: { authorId: user.id },
        }),
      },
      include: {
        author: AUTHOR_SELECT,
        article: { select: { id: true, title: true, slug: true } },
        reports: {
          include: {
            reportedBy: { select: { id: true, username: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { reports: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: {
        items: comments.map((c) => ({
          id: c.id,
          content: c.content,
          author: c.author,
          article: c.article,
          reportCount: c._count.reports,
          reports: c.reports.map((r) => ({
            reason: r.reason,
            reportedBy: r.reportedBy,
            createdAt: r.createdAt,
          })),
          createdAt: c.createdAt,
        })),
        total: comments.length,
      },
      message: 'OK',
    };
  }

  // ==========================================================
  // HELPERS
  // ==========================================================

  private async findPublishedArticle(slug: string) {
    const article = await this.prisma.article.findUnique({ where: { slug } });
    if (!article || article.status !== ArticleStatus.PUBLISHED) {
      throw new NotFoundException('Maqola topilmadi');
    }
    return article;
  }

  private async findAlive(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.isDeleted) {
      throw new NotFoundException('Comment topilmadi');
    }
    return comment;
  }

  /** Soft delete: yozuv qoladi, content yashiriladi, replies saqlanadi. */
  private softDelete(id: string) {
    return this.prisma.comment.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /** O'chirilgan comment javobda "[o'chirilgan]" ko'rinadi. */
  private present<T extends { isDeleted: boolean; content: string }>(c: T): T {
    return c.isDeleted ? { ...c, content: "[o'chirilgan]" } : c;
  }

  private notify(
    userId: string,
    type: NotificationType,
    referenceId: string,
  ) {
    // DB'ga yozadi VA real-time emit qiladi
    return this.notifications.create(userId, type, referenceId);
  }
}
