export const environment = {
  production: true,
  // Versión web pública (Static Site en Render): no hay nginx haciendo de
  // proxy como en el docker-compose local, así que acá sí hace falta la
  // URL completa del backend (igual que usa la app móvil).
  apiUrl: 'https://inventcontrol.onrender.com/api',
};
