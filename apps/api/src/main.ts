import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { FirebaseAuthGuard } from './common/guards/firebase-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { FirebaseService } from './modules/firebase/firebase.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());

  // CORS â€” accept the primary WEB_URL, plus any comma-separated extras
  // (e.g. WEB_URL_EXTRA="https://*.vercel.app"), plus localhost in dev.
  const primary = process.env.WEB_URL || 'http://localhost:3000';
  const extras = (process.env.WEB_URL_EXTRA || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const allowVercelPreviews = process.env.ALLOW_VERCEL_PREVIEWS === 'true';

  app.enableCors({
    origin: (origin, cb) => {
      // Same-origin / curl / server-to-server
      if (!origin) return cb(null, true);
      if (origin === primary) return cb(null, true);
      if (extras.includes(origin)) return cb(null, true);
      if (allowVercelPreviews && /\.vercel\.app$/i.test(new URL(origin).hostname)) {
        return cb(null, true);
      }
      if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
        return cb(null, true);
      }
      return cb(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global guards, filters, interceptors
  const reflector = app.get(Reflector);
  const firebaseService = app.get(FirebaseService);
  app.useGlobalGuards(new FirebaseAuthGuard(reflector, firebaseService), new RolesGuard(reflector));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Coaching App API')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
