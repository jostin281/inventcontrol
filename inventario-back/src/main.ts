import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';

const DEV_ORIGINS = [
  'http://localhost:4200',
  'http://127.0.0.1:4200',
  'http://localhost:4201',
  'http://127.0.0.1:4201',
];

// La app móvil (Capacitor) hace sus peticiones desde estos orígenes fijos,
// sin importar la IP/dominio real del backend al que apunte. Se agregan
// siempre, tanto en dev como si FRONTEND_URL está configurado.
const CAPACITOR_ORIGINS = [
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
];

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // Las imágenes de productos se envían como base64 dentro del JSON, así
  // que el límite por defecto de Express (100kb) se queda corto. Se sube
  // a 10mb (debe ir de la mano con client_max_body_size en nginx.conf).
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Orígenes permitidos por CORS. En producción, el frontend se sirve
  // normalmente desde el mismo dominio (proxy de nginx), así que CORS no
  // debería ni activarse; aun así se deja configurable vía FRONTEND_URL
  // (admite varios orígenes separados por coma) para despliegues distintos.
  const frontendUrl = process.env.FRONTEND_URL;
  const baseOrigins = frontendUrl
    ? frontendUrl.split(',').map(o => o.trim())
    : DEV_ORIGINS;
  const origins = [...baseOrigins, ...CAPACITOR_ORIGINS];

  app.enableCors({
    origin: origins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validación automática de DTOs
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Prefijo global de API
  app.setGlobalPrefix('api');

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Backend corriendo en http://localhost:${port}/api`);
}
bootstrap();
