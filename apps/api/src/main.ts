import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module.js';
import { ApiExceptionFilter } from './common/http-exception.filter.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: { origin: process.env.WEB_ORIGIN ?? 'http://127.0.0.1:3000', credentials: true } });
  app.use(helmet({ crossOriginResourcePolicy: false }));
  app.use(cookieParser());
  app.useGlobalFilters(new ApiExceptionFilter());
  const document = SwaggerModule.createDocument(app, new DocumentBuilder().setTitle('Aruna Dewa API').setVersion('1.0').build());
  SwaggerModule.setup('openapi', app, document);
  app.enableShutdownHooks();
  const port = Number(process.env.PORT ?? '3001');
  await app.listen(port, process.env.HOST ?? '127.0.0.1');
  new Logger('Bootstrap').log(`API listening on http://127.0.0.1:${port}`);
}

void bootstrap();
