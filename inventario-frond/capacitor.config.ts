import type { CapacitorConfig } from '@capacitor/cli';

// Variante local vs. variante para compartir (nube), elegida con una
// variable de entorno antes de sincronizar Capacitor. Así los dos APKs
// tienen distinto "appId" y pueden estar instalados a la vez en el mismo
// celular, sin pisarse uno al otro.
//
// APK para compartir (apunta a Render):
//   ng build --configuration mobile
//   npx cap sync android
//
// APK para probar en TU red local (apunta a tu IP de LAN):
//   $env:APP_VARIANT="local"   (PowerShell)
//   ng build --configuration mobile-local
//   npx cap sync android
//   Remove-Item Env:APP_VARIANT   (para volver a compilar la de nube después)
const isLocal = process.env.APP_VARIANT === 'local';

const config: CapacitorConfig = {
  appId: isLocal ? 'com.invencontrol.app.local' : 'com.invencontrol.app',
  appName: isLocal ? 'InvenControl 2.0' : 'InvenControl',
  webDir: 'dist/inventario-frond/browser',
  server: {
    // El backend en la nube sirve HTTPS; tu backend local (Docker en tu
    // PC) sirve HTTP plano sin certificado. El esquema tiene que
    // coincidir con el del backend al que apunta cada variante, si no el
    // WebView bloquea la petición por "Mixed Content".
    androidScheme: isLocal ? 'http' : 'https',
  },
};

export default config;
