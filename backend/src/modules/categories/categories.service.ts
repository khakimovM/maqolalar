import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { slugify } from '../../common/utils/slugify';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { articles: { where: { status: 'PUBLISHED' } } },
        },
      },
    });

    return {
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        articleCount: c._count.articles,
      })),
      message: 'OK',
    };
  }

  async create(dto: CreateCategoryDto) {
    const slug = slugify(dto.name);

    const existing = await this.prisma.category.findFirst({
      where: { OR: [{ name: dto.name }, { slug }] },
    });
    if (existing) {
      throw new ConflictException('Bunday kategoriya allaqachon mavjud');
    }

    const category = await this.prisma.category.create({
      data: { name: dto.name, slug },
    });
    return { data: category, message: 'Kategoriya yaratildi' };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.ensureExists(id);

    const slug = slugify(dto.name);
    const conflict = await this.prisma.category.findFirst({
      where: { OR: [{ name: dto.name }, { slug }], NOT: { id } },
    });
    if (conflict) {
      throw new ConflictException('Bunday kategoriya allaqachon mavjud');
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: { name: dto.name, slug },
    });
    return { data: category, message: 'Kategoriya yangilandi' };
  }

  async remove(id: string) {
    await this.ensureExists(id);

    try {
      await this.prisma.category.delete({ where: { id } });
    } catch (e) {
      // P2003 — foreign key: kategoriyada maqolalar bor (onDelete: Restrict)
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2003'
      ) {
        throw new ConflictException(
          "Bu kategoriyada maqolalar bor — avval ularni boshqa kategoriyaga o'tkazing",
        );
      }
      throw e;
    }

    return { data: null, message: "Kategoriya o'chirildi" };
  }

  private async ensureExists(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');
  }
}
