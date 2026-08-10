import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.invencontrol.app',
  appName: 'InvenControl',
  webDir: 'dist/inventario-frond/browser',
  server: {
    // El backend corre en HTTP plano (sin certificado) en la red local,
    // así que la app también debe cargar sobre HTTP: si cargara sobre
    // "https" y llamara a un backend "http", el WebView bloquea la
    // petición por "Mixed Content". La URL real del backend se configura
    // en src/environments/environment.mobile.ts, no aquí.
    androidScheme: 'http',
  },
};

export default config;
