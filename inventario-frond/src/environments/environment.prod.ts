export const environment = {
  production: true,
  // Ruta relativa: en producción el frontend y el backend se sirven desde
  // el mismo dominio (nginx hace proxy_pass de /api al backend), así que
  // no hace falta (ni conviene) hardcodear un host aquí.
  apiUrl: '/api',
};
