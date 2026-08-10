export const environment = {
  production: true,
  // La app móvil (Capacitor) NO corre en el mismo origen que tu backend
  // como sí pasa con nginx en la versión web, así que aquí SÍ necesita la
  // URL completa de tu servidor. Reemplaza esto por la IP local de tu PC
  // (ejecuta `ipconfig` en PowerShell y busca "Dirección IPv4", algo como
  // 192.168.1.XX) o por tu dominio real si lo despliegas en la nube.
  apiUrl: 'http://192.168.1.6/api',
};
