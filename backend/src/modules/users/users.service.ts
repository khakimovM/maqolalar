import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

/** Javoblarda qaytariladigan xavfsiz maydonlar (password YO'Q). */
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  username: true,
  avatar: true,
  role: true,
  isActive: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });
    return { data: user, message: 'OK' };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (!dto.username && dto.avatar === undefined) {
      throw new BadRequestException(
        "O'zgartirish uchun kamida bitta maydon yuboring",
      );
    }

    // Username band emasligini tekshiramiz (o'ziniki bo'lsa — OK)
    if (dto.username) {
      const existing = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('Bu username band');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.username && { username: dto.username }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar }),
      },
      select: SAFE_USER_SELECT,
    });

    return { data: user, message: 'Profil yangilandi' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new UnauthorizedException('Hisob topilmadi');

    // OAuth orqali kirgan, parol o'rnatmagan user
    if (!user.password) {
      throw new BadRequestException(
        "Hisobingiz OAuth orqali yaratilgan — parol o'rnatilmagan",
      );
    }

    if (!(await bcrypt.compare(dto.oldPassword, user.password))) {
      throw new BadRequestException("Joriy parol noto'g'ri");
    }

    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException(
        'Yangi parol eskisidan farq qilishi kerak',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: await bcrypt.hash(dto.newPassword, 12) },
    });

    // Xavfsizlik: barcha qurilmalardagi sessiyalar bekor qilinadi
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    return {
      data: null,
      message: "Parol o'zgartirildi — barcha qurilmalarda qaytadan kirish kerak",
    };
  }
}
