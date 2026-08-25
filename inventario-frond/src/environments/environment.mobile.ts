export const environment = {
  production: true,
  // La app móvil (Capacitor) NO corre en el mismo origen que tu backend
  // como sí pasa con nginx en la versión web, así que aquí SÍ necesita la
  // URL pública y fija de tu servidor.
  //
  // IMPORTANTE: no pongas acá la IP local de tu PC (192.168.x.x) — esa IP
  // cambia según la red WiFi a la que te conectes, y el APK dejaría de
  // funcionar cada vez que cambies de red. Usá la URL pública que te da
  // el hosting en la nube (Render, Railway, etc.) una vez desplegado el
  // backend, algo como 'https://tu-backend.onrender.com/api'.
  apiUrl: 'https://TU-BACKEND.onrender.com/api',
};
