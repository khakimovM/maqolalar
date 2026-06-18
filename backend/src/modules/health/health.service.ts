import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** DB va Redis holatini tekshiradi (xato bo'lsa 'down', tashlamaydi). */
  async check() {
    const [db, redis] = await Promise.all([
      this.pingDb(),
      this.pingRedis(),
    ]);

    const status = db && redis ? 'ok' : 'degraded';

    return {
      data: {
        status,
        db: db ? 'up' : 'down',
        redis: redis ? 'up' : 'down',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
      },
      message: 'Health',
    };
  }

  private async pingDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  private async pingRedis(): Promise<boolean> {
    try {
      const res = await this.redis.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }
}
