import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { assertProductionEnv } from '@soatbay/common';
import { AppModule } from './app.module';

async function bootstrap() {
  assertProductionEnv([
    'DATABASE_URL',
    'REDIS_URL',
    'JWT_SECRET',
    'EMPLOYER_BOT_TOKEN',
    'WORKER_BOT_TOKEN',
  ]);

  const app = await NestFactory.create(AppModule);

  const prefix = process.env.BACKEND_GLOBAL_PREFIX ?? 'api';
  app.setGlobalPrefix(prefix);

  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins?.length ? corsOrigins : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 3000);
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`🚀 Backend API listening on port ${port}/${prefix}`);
}

bootstrap();
