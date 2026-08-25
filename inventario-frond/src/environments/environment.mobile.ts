export const environment = {
  production: true,
  // La app móvil (Capacitor) NO corre en el mismo origen que tu backend
  // como sí pasa con nginx en la versión web, así que aquí SÍ necesita la
  // URL pública y fija de tu servidor. Backend desplegado en Render.
  apiUrl: 'https://inventcontrol.onrender.com/api',
};
