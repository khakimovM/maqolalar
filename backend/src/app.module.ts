import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { LoggerModule } from 'nestjs-pino';
import { join } from 'path';

import { PrismaModule } from './database/prisma.module';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { CommentsModule } from './modules/comments/comments.module';
import { LikesModule } from './modules/likes/likes.module';
import { SavedArticlesModule } from './modules/saved-articles/saved-articles.module';
import { ReadingProgressModule } from './modules/reading-progress/reading-progress.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { UploadModule } from './modules/upload/upload.module';
import { AdminModule } from './modules/admin/admin.module';
import { HealthModule } from './modules/health/health.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { TelegramModule } from './modules/telegram/telegram.module';
import { BackupModule } from './modules/backup/backup.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { SentryInterceptor } from './common/interceptors/sentry.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    // Rejalashtirilgan ishlar (retention cron) uchun
    ScheduleModule.forRoot(),

    // Pino structured logging (har so'rov loglanadi)
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isProd = config.get<string>('NODE_ENV') === 'production';
        return {
          pinoHttp: {
            level: isProd ? 'info' : 'debug',
            // Dev'da chiroyli rangli log, prod'da toza JSON
            transport: isProd
              ? undefined
              : { target: 'pino-pretty', options: { singleLine: true } },
            // Maxfiy maydonlar loglarga tushmasin
            redact: ['req.headers.authorization', 'req.headers.cookie'],
          },
        };
      },
    }),

    // /uploads papkasini tashqariga ochish (yuklangan rasmlar)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.UPLOAD_PATH || 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        // Rasmlar ommaviy — canvas (qirqish) uchun CORS ochiq bo'lsin
        setHeaders: (res) => {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      },
    }),

    // Rate-limit — Redis storage (ko'p instansiyada birgalikda ishlaydi)
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('THROTTLE_TTL', 60) * 1000,
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          `redis://${config.get<string>('REDIS_HOST', 'localhost')}:${config.get<number>('REDIS_PORT', 6379)}`,
        ),
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    PrismaModule,
    RedisModule,
    MailModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ArticlesModule,
    CommentsModule,
    LikesModule,
    SavedArticlesModule,
    ReadingProgressModule,
    NotificationsModule,
    UploadModule,
    AdminModule,
    HealthModule,
    MaintenanceModule,
    TelegramModule,
    BackupModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    // Sentry xato kuzatuvi — javob formatlanishidan oldin xatolarni "tap" qiladi
    { provide: APP_INTERCEPTOR, useClass: SentryInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
  ],
})
export class AppModule {}
