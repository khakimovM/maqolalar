import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import * as Sentry from '@sentry/node';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser: false — body parser'ni o'zimiz limit bilan ulaymiz (pastda).
  // bufferLogs — boot loglari pino tayyor bo'lguncha buferlanadi.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    bodyParser: false,
  });

  app.useLogger(app.get(Logger));
  const config = app.get(ConfigService);

  // Sentry — xato kuzatuvi. Faqat SENTRY_DSN o'rnatilgan bo'lsa faollashadi;
  // aks holda captureException no-op (ilova bemalol ishlaydi).
  const sentryDsn = config.get<string>('SENTRY_DSN');
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: config.get<string>('NODE_ENV', 'development'),
      tracesSampleRate: 0, // faqat xatolar — performance tracing yo'q
    });
  }

  // Reverse-proxy (nginx) orqasida bo'lsa, haqiqiy mijoz IP'si
  // X-Forwarded-For header'idan olinadi (rate-limit / IP-hash uchun).
  // Proksi yo'q bo'lsa YOQMASLIK kerak (IP soxtalashtirilishi mumkin).
  if (config.get<string>('TRUST_PROXY') === '1') {
    app.set('trust proxy', 1);
  }

  // Xavfsizlik header'lari (HSTS, X-Frame-Options, X-Content-Type-Options, ...).
  // crossOriginResourcePolicy: cross-origin — /uploads rasmlari boshqa
  // origin (sayt)dan yuklanishi uchun bloklanmaydi.
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  // Cookie'larni o'qish (refresh token httpOnly cookie'da)
  app.use(cookieParser());

  // Body hajmi limiti — ulkan payload bilan DoS oldini oladi.
  // Maqola JSON'i uchun yetarli (rasmlar alohida yuklanadi, URL saqlanadi).
  const bodyLimit = config.get<string>('BODY_LIMIT', '2mb');
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));

  // CORS — faqat ruxsat etilgan originlar (cookie uchun credentials: true)
  const origins = (config.get<string>('FRONTEND_URLS') ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins, credentials: true });

  // Global DTO validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO da yo'q maydonlar olib tashlanadi
      forbidNonWhitelisted: true, // ortiqcha maydon kelsa — 400
      transform: true,
    }),
  );

  // Swagger — faqat production'dan tashqarida (prod'da API sxemasi oshkor bo'lmasin)
  if (config.get<string>('NODE_ENV') !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Maqolalar API')
      .setDescription('Blog platformasi backend API hujjati')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  app.get(Logger).log(`API ishga tushdi: http://localhost:${port}`);
}
bootstrap();
