import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  // bufferLogs — boot loglari pino tayyor bo'lguncha buferlanadi
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Pino structured logging
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);

  // CORS — faqat ruxsat etilgan originlar
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

  // Swagger — API hujjati: http://localhost:3000/api/docs
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Maqolalar API')
    .setDescription('Blog platformasi backend API hujjati')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);

  app
    .get(Logger)
    .log(`API ishga tushdi: http://localhost:${port} (docs: /api/docs)`);
}
bootstrap();
