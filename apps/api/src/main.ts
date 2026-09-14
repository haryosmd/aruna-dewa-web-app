import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/http-exception.filter.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { assertRuntimeEnv, isProduction, loadEnvFileIfPresent, trustProxySetting } from './common/env.js';
import { isAllowedOrigin, webOrigins } from './common/web-origin.js';

async function bootstrap(): Promise<void> {
  // Gerbang pertama: menolak menyala dengan konfigurasi yang salah lebih jujur daripada
  // menyala dan menandatangani token dengan rahasia contoh.
  loadEnvFileIfPresent();
  assertRuntimeEnv();
  // Validator, bukan string tunggal: `credentials: true` mengharuskan header dipantulkan
  // persis, jadi daftar origin yang sah harus dicocokkan satu per satu — tanpa wildcard.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: { origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), credentials: true },
  });
  // Harus lebih dulu dari apa pun yang membaca `request.ip`: tiap limiter per-IP dan kolom
  // `Session.ip` hanya melihat alamat load balancer kalau setelan ini belum berlaku.
  app.set('trust proxy', trustProxySetting());
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cookieParser());
  app.useGlobalFilters(new ApiExceptionFilter());
  // Peta 43 rute lengkap dengan bentuk body-nya bukan sesuatu yang perlu diumumkan di produksi.
  if (!isProduction()) {
    const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Aruna Dewa API').setVersion('1.0').build());
    SwaggerModule.setup('openapi', app, document);
  }
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? '3001');
  await app.listen(port, process.env.HOST ?? '127.0.0.1');
  new Logger('Bootstrap').log(`API listening on http://127.0.0.1:${port} — origin web: ${webOrigins().join(', ')}`);
}

void bootstrap();
