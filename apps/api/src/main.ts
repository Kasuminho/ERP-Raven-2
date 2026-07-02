import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { json, NextFunction, Request, Response, urlencoded } from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';
import { createGlobalValidationPipe } from './common/pipes/global-validation.pipe';
import { createRateLimiter } from './common/rate-limit/rate-limit.middleware';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const expressApp = app.getHttpAdapter().getInstance();

  expressApp.disable('x-powered-by');
  expressApp.set('trust proxy', 1);
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    if (config.get<string>('app.nodeEnv') === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });
  app.use(createRateLimiter());

  app.setGlobalPrefix(config.get<string>('app.apiPrefix', 'api/v1'));
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });
  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  const corsOrigins = (config.get<string>('app.corsOrigin', '') || '').split(',').map((value) => value.trim()).filter(Boolean);
  app.enableCors({
    origin: corsOrigins.includes('*') || corsOrigins.length === 0 ? true : corsOrigins,
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(config.get<number>('app.port', 3000));
}

void bootstrap();
