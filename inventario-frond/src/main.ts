import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Sin esto, cualquier pipe de fecha/moneda con locale "es" (usado en el
// Dashboard y otras pantallas) tira NG0701 "Missing locale data".
registerLocaleData(localeEs, 'es');

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
