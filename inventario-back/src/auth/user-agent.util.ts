/**
 * Convierte un User-Agent en algo legible tipo "Chrome · Windows 11", sin
 * depender de ninguna librería externa. No pretende ser exhaustivo — cubre
 * los navegadores/SO más comunes y detecta la app móvil (Capacitor/Android
 * WebView, que siempre incluye "; wv" en el User-Agent).
 */
export function parseUserAgent(ua: string | undefined | null): {
  dispositivo: string;
  tipo: 'movil' | 'escritorio';
} {
  const s = ua || '';

  let so = 'Dispositivo desconocido';
  if (/android/i.test(s)) so = 'Android';
  else if (/iphone|ipad|ipod/i.test(s)) so = 'iOS';
  else if (/windows nt 10\.0/i.test(s)) so = 'Windows 11';
  else if (/windows/i.test(s)) so = 'Windows';
  else if (/mac os x/i.test(s)) so = 'macOS';
  else if (/linux/i.test(s)) so = 'Linux';

  const esMovil = /android|iphone|ipad|ipod/i.test(s);
  const esAppCapacitor = /;\s*wv\)/i.test(s) || /\bwv\b/i.test(s);

  if (esAppCapacitor) {
    return { dispositivo: `App InvenControl · ${so}`, tipo: 'movil' };
  }

  let navegador = 'Navegador';
  if (/edg\//i.test(s)) navegador = 'Edge';
  else if (/opr\//i.test(s) || /opera/i.test(s)) navegador = 'Opera';
  else if (/crios\//i.test(s)) navegador = 'Chrome';
  else if (/chrome\//i.test(s)) navegador = 'Chrome';
  else if (/fxios\//i.test(s) || /firefox\//i.test(s)) navegador = 'Firefox';
  else if (/safari\//i.test(s)) navegador = 'Safari';

  return {
    dispositivo: `${navegador} · ${so}`,
    tipo: esMovil ? 'movil' : 'escritorio',
  };
}
