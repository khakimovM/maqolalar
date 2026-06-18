import { Controller, Param, Post } from '@nestjs/common';
import { LikesService } from './likes.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('articles')
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  /** Toggle: bosilsa qo'shiladi, yana bosilsa olib tashlanadi. USER+ */
  @Post(':id/like')
  toggle(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.likesService.toggle(id, userId);
  }
}
