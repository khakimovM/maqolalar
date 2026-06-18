import { Controller, Get, Param, Post } from '@nestjs/common';
import { SavedArticlesService } from './saved-articles.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class SavedArticlesController {
  constructor(private readonly savedArticlesService: SavedArticlesService) {}

  /** Toggle saqlash. USER+ */
  @Post('articles/:id/save')
  toggle(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.savedArticlesService.toggle(id, userId);
  }

  /** Saqlangan maqolalar ro'yxati. USER+ */
  @Get('users/me/saved')
  list(@CurrentUser('id') userId: string) {
    return this.savedArticlesService.list(userId);
  }
}
