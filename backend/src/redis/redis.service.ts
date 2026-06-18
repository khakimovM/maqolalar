import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * OTP, rate limit va cache uchun Redis wrapper.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(config: ConfigService) {
    this.client = new Redis({
      host: config.get<string>('REDIS_HOST', 'localhost'),
      port: config.get<number>('REDIS_PORT', 6379),
    });
  }

  /** Qiymat olish. Topilmasa null. */
  get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /** Qiymat yozish. ttlSeconds berilsa — shu muddatdan keyin o'zi o'chadi. */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /** Bir yoki bir nechta keyni o'chirish. */
  async del(...keys: string[]): Promise<void> {
    if (keys.length) await this.client.del(...keys);
  }

  /** Counter oshirish (otp urinishlari uchun). */
  incr(key: string): Promise<number> {
    return this.client.incr(key);
  }

  /** Keyga TTL o'rnatish. */
  async expire(key: string, ttlSeconds: number): Promise<void> {
    await this.client.expire(key, ttlSeconds);
  }

  /** Keyning qolgan umri (sekund). Key yo'q bo'lsa -2, TTL siz bo'lsa -1. */
  ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /** Ulanish tirikligini tekshirish (health uchun). 'PONG' qaytadi. */
  ping(): Promise<string> {
    return this.client.ping();
  }

  onModuleDestroy() {
    this.client.quit();
  }
}
