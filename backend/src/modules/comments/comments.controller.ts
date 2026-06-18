import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CommentsService } from './comments.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ReportCommentDto } from './dto/report-comment.dto';

@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  // ----- Maqola bo'yicha -----

  @Public()
  @Get('articles/:slug/comments')
  findByArticle(@Param('slug') slug: string) {
    return this.commentsService.findByArticle(slug);
  }

  @Post('articles/:slug/comments')
  create(
    @Param('slug') slug: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.create(slug, userId, dto);
  }

  // ----- Comment bo'yicha -----
  // MUHIM: "reported" route'i ":id" li route'lardan oldin turibdi

  @Roles(Role.ADMIN)
  @Get('comments/reported')
  findReported(@CurrentUser() user: any) {
    return this.commentsService.findReported(user);
  }

  @Post('comments/:id/reply')
  reply(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentsService.reply(id, userId, dto);
  }

  @Put('comments/:id')
  update(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(id, userId, dto);
  }

  @Delete('comments/:id')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.commentsService.remove(id, userId);
  }

  @Post('comments/:id/report')
  report(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: ReportCommentDto,
  ) {
    return this.commentsService.report(id, userId, dto);
  }

  @Roles(Role.ADMIN)
  @Delete('comments/:id/admin')
  adminRemove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.commentsService.adminRemove(id, user);
  }
}
