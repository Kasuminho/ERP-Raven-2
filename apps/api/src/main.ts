import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { json, NextFunction, Request, Response, urlencoded } from 'express';
import { join } from 'node:path';
import { AppModule } from './app.module';
import { RequestLoggingInterceptor } from './common/interceptors/request-logging.interceptor';

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
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  app.useGlobalInterceptors(new RequestLoggingInterceptor());
  const corsOrigins = (config.get<string>('app.corsOrigin', '') || '').split(',').map((value) => value.trim()).filter(Boolean);
  app.enableCors({
    origin: corsOrigins.includes('*') || corsOrigins.length === 0 ? true : corsOrigins,
    credentials: true,
  });
  app.enableShutdownHooks();

  await app.listen(config.get<number>('app.port', 3000));
}

function createRateLimiter(): (req: Request, res: Response, next: NextFunction) => void {
  const attempts = new Map<string, { count: number; resetAt: number }>();
  return (req, res, next) => {
    const isAuth = /\/auth\/discord(?:\/login)?\/?$/.test(req.path);
    const isUpload = /\/uploads\/image\/?$/.test(req.path);
    if (!isAuth && !isUpload) return next();

    const windowMs = 15 * 60 * 1000;
    const limit = isAuth ? 30 : 60;
    const now = Date.now();
    const key = `${isAuth ? 'auth' : 'upload'}:${req.ip}`;
    const current = attempts.get(key);
    const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    entry.count += 1;
    attempts.set(key, entry);
    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, limit - entry.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));
    if (entry.count > limit) return res.status(429).json({ statusCode: 429, message: 'Too many requests. Try again later.' });
    next();
  };
}

void bootstrap();
