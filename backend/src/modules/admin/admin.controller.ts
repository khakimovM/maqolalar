import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { StatsQueryDto } from './dto/stats-query.dto';
import { Roles } from '../../common/decorators/roles.decorator';

/** Butun controller faqat SUPERADMIN uchun. */
@Roles(Role.SUPERADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** Yangi admin yaratish. */
  @Post('create-admin')
  createAdmin(@Body() dto: CreateAdminDto) {
    return this.adminService.createAdmin(dto);
  }

  /** Adminlar ro'yxati. */
  @Get('admins')
  listAdmins() {
    return this.adminService.listAdmins();
  }

  /** Adminni bloklash. */
  @Put('admins/:id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.adminService.setActive(id, false);
  }

  /** Adminni faollashtirish. */
  @Put('admins/:id/activate')
  activate(@Param('id') id: string) {
    return this.adminService.setActive(id, true);
  }

  /** Umumiy statistika. ?period=daily|monthly|yearly yoki ?from=&to= */
  @Get('stats')
  stats(@Query() query: StatsQueryDto) {
    return this.adminService.stats(query);
  }

  /** Email yuborish statistikasi (kunlik o'sish grafigi + jami). */
  @Get('email-stats')
  emailStats() {
    return this.adminService.emailStats();
  }
}
