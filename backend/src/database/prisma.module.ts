import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // har bir modulda import qilish shart emas
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
