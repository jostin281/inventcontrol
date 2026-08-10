import { ConfigService } from '@nestjs/config';

const DEV_FALLBACK_SECRET = 'invencontrol_dev_secret_do_not_use_in_prod';

/**
 * Devuelve el secreto usado para firmar/verificar los JWT.
 * En producción es obligatorio definir JWT_SECRET: si falta, la app no debe
 * arrancar (evita quedar firmando tokens con una clave conocida/pública).
 */
export function getJwtSecret(config: ConfigService): string {
  const secret = config.get<string>('JWT_SECRET');
  const isProd = config.get<string>('NODE_ENV') === 'production';

  if (!secret) {
    if (isProd) {
      throw new Error(
        'JWT_SECRET no está definido. Configúralo como variable de entorno antes de arrancar en producción.',
      );
    }
    return DEV_FALLBACK_SECRET;
  }
  return secret;
}
