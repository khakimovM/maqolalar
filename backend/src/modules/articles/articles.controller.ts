import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { ArticlesService } from './articles.service';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { ArticleQueryDto } from './dto/article-query.dto';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  // MUHIM: "my" route'lari ":slug" dan OLDIN turishi shart,
  // aks holda Nest "my" ni slug deb qabul qiladi.

  @Roles(Role.ADMIN)
  @Get('my')
  findMy(@CurrentUser('id') userId: string, @Query() query: ArticleQueryDto) {
    return this.articlesService.findMy(userId, query);
  }

  @Roles(Role.ADMIN)
  @Get('my/analytics')
  myAnalytics(@CurrentUser('id') userId: string) {
    return this.articlesService.myAnalytics(userId);
  }

  /** Tahrirlash uchun bitta maqola (qoralama ham, content bilan). */
  @Roles(Role.ADMIN)
  @Get('my/:id')
  findMine(@Param('id') id: string, @CurrentUser() user: any) {
    return this.articlesService.findOneForEdit(id, user);
  }

  /** Mehmon: faqat FREE. Token bilan: FREE + PREMIUM. */
  @Public()
  @Get()
  findAll(@Query() query: ArticleQueryDto, @CurrentUser() user?: any) {
    return this.articlesService.findAll(query, user);
  }

  @Public()
  @Get(':slug')
  findBySlug(
    @Param('slug') slug: string,
    @Ip() ip: string,
    @CurrentUser() user?: any,
  ) {
    return this.articlesService.findBySlug(slug, user, ip);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateArticleDto, @CurrentUser('id') userId: string) {
    return this.articlesService.create(dto, userId);
  }

  @Roles(Role.ADMIN)
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() user: any,
  ) {
    return this.articlesService.update(id, dto, user);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.articlesService.remove(id, user);
  }

  @Roles(Role.ADMIN)
  @Put(':id/publish')
  publish(@Param('id') id: string, @CurrentUser() user: any) {
    return this.articlesService.publish(id, user);
  }

  @Roles(Role.ADMIN)
  @Put(':id/archive')
  archive(@Param('id') id: string, @CurrentUser() user: any) {
    return this.articlesService.archive(id, user);
  }
}
