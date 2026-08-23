import { Injectable, signal } from '@angular/core';

const KEY_STOCK     = 'invencontrol-alertas-stock-activas';
const KEY_SEGURIDAD = 'invencontrol-alertas-seguridad-activas';

/**
 * Preferencias del usuario para activar/desactivar los tipos de alerta que
 * sí están implementados de verdad (a diferencia de "Movimientos de
 * inventario" en Configuración, que sigue siendo solo maqueta visual porque
 * el backend no manda resúmenes por correo).
 *
 * - Stock bajo/agotado: campana de notificaciones + modal al iniciar sesión.
 * - Reportes de seguridad: campana de notificaciones cuando el backend
 *   detecta un login desde un dispositivo que la cuenta nunca había usado
 *   (ver `AuthService.alertaSeguridadPendiente`).
 *
 * Se guardan en localStorage porque hoy no existe un endpoint en el backend
 * para preferencias de notificación por usuario — es deliberadamente
 * simple.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionPreferenciasService {
  private readonly _alertasStockActivas = signal<boolean>(this._leerInicial(KEY_STOCK, true));
  readonly alertasStockActivas = this._alertasStockActivas.asReadonly();

  setAlertasStockActivas(activo: boolean): void {
    this._alertasStockActivas.set(activo);
    this._guardar(KEY_STOCK, activo);
  }

  // Activas por defecto: es una alerta de seguridad de la cuenta, tiene
  // sentido que avise salvo que el usuario decida apagarla explícitamente.
  private readonly _alertasSeguridadActivas = signal<boolean>(this._leerInicial(KEY_SEGURIDAD, true));
  readonly alertasSeguridadActivas = this._alertasSeguridadActivas.asReadonly();

  setAlertasSeguridadActivas(activo: boolean): void {
    this._alertasSeguridadActivas.set(activo);
    this._guardar(KEY_SEGURIDAD, activo);
  }

  private _guardar(key: string, activo: boolean): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, activo ? '1' : '0');
    }
  }

  private _leerInicial(key: string, porDefecto: boolean): boolean {
    if (typeof localStorage === 'undefined') return porDefecto;
    const raw = localStorage.getItem(key);
    // Sin preferencia guardada todavía → el valor por defecto de ese tipo de alerta.
    return raw === null ? porDefecto : raw === '1';
  }
}
