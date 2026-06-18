import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ReadingProgressService } from './reading-progress.service';
import { SaveProgressDto } from './dto/save-progress.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller()
export class ReadingProgressController {
  constructor(
    private readonly readingProgressService: ReadingProgressService,
  ) {}

  /** O'qish belgisini saqlash/yangilash (upsert). USER+ */
  @Post('articles/:id/progress')
  save(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: SaveProgressDto,
  ) {
    return this.readingProgressService.save(id, userId, dto);
  }

  /** "Davom ettiriladi" ro'yxati. USER+ */
  @Get('users/me/reading')
  list(@CurrentUser('id') userId: string) {
    return this.readingProgressService.list(userId);
  }

  /** O'qish belgisini o'chirish. USER+ */
  @Delete('articles/:id/progress')
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.readingProgressService.remove(id, userId);
  }
}
