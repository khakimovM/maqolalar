import { Controller, Get, Param, Put } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  /** Bildirishnomalar ro'yxati + o'qilmaganlar soni. USER+ */
  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.notificationsService.list(userId);
  }

  /** Barchasini o'qildi deb belgilash. USER+ — ':id' dan OLDIN turishi shart. */
  @Put('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  /** Bitta bildirishnomani o'qildi deb belgilash. USER+ */
  @Put(':id/read')
  markRead(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.notificationsService.markRead(id, userId);
  }
}
