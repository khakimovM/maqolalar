import { Module } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';

/**
 * Rejalashtirilgan DB tozalash (retention).
 * ScheduleModule.forRoot() app.module'da global ulanadi; bu modul shu jadvalga
 * cron ishchisini qo'shadi. PrismaModule global, shuning uchun import shart emas.
 */
@Module({
  providers: [MaintenanceService],
})
export class MaintenanceModule {}
