import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.invencontrol.app',
  appName: 'InvenControl',
  webDir: 'dist/inventario-frond/browser',
  server: {
    // El backend en la nube (Render/Railway/etc.) sirve HTTPS con
    // certificado válido por defecto, así que la app también carga sobre
    // "https": evita el bloqueo de "Mixed Content" del WebView y de paso
    // viaja cifrado. La URL real del backend se configura en
    // src/environments/environment.mobile.ts, no aquí.
    androidScheme: 'https',
  },
};

export default config;
