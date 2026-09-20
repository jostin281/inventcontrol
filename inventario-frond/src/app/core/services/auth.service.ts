import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserRole = 'admin' | 'usuario';

export interface UserSession {
  id: number;
  nombre: string;
  correo: string;
  rol: UserRole;
  companyId?: number;
  nombreNegocio?: string;
  correoOperaciones?: string;
  direccion?: string;
  zona?: string;
  moneda?: string;
  logo?: string | null;
  qrPagoImagen?: string | null;
  transferenciaImagen?: string | null;
}

/** Datos editables de "Perfil del negocio" en Configuración — todos opcionales. */
export interface PerfilNegocioUpdate {
  nombreNegocio?: string;
  correoOperaciones?: string;
  direccion?: string;
  zona?: string;
  moneda?: string;
  logo?: string | null;
  qrPagoImagen?: string | null;
  transferenciaImagen?: string | null;
}

export interface SesionActiva {
  id: number;
  dispositivo: string;
  tipo: 'movil' | 'escritorio';
  ip: string | null;
  creadaEn: string;
  actual: boolean;
}

/** El backend la manda en la respuesta de /auth/login cuando el dispositivo
 *  que inició sesión nunca antes se había visto en esta cuenta. */
export interface AlertaSeguridad {
  nuevoDispositivo: true;
  dispositivo: string;
  ip: string | null;
}

const API = environment.apiUrl;
const STORAGE_KEY = 'invencontrol-token';
const USER_KEY    = 'invencontrol-user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http   = inject(HttpClient);
  private router = inject(Router);

  readonly currentUser = signal<UserSession | null>(this._readStoredUser());
  readonly token       = signal<string | null>(localStorage.getItem(STORAGE_KEY));

  /** Alerta de "dispositivo nuevo" pendiente de mostrar del último login (la
   *  consume el shell de la app para ponerla en la campana y la limpia). */
  readonly alertaSeguridadPendiente = signal<AlertaSeguridad | null>(null);

  // ── Registro ────────────────────────────────────────────────────────
  registro(data: {
    nombre: string;
    correo: string;
    contrasena: string;
    nombreNegocio?: string;
    tipoNegocio?: string;
    codigoAutorizacion?: string;
  }): Observable<{ access_token: string; user: UserSession }> {
    return this.http.post<{ access_token: string; user: UserSession }>(
      `${API}/auth/registro`, data
    ).pipe(
      tap(res => this._saveSession(res)),
      catchError(err => throwError(() => err))
    );
  }

  // ── Login ────────────────────────────────────────────────────────────
  login(correo: string, contrasena: string): Observable<{ access_token: string; user: UserSession; alertaSeguridad?: AlertaSeguridad | null }> {
    return this.http.post<{ access_token: string; user: UserSession; alertaSeguridad?: AlertaSeguridad | null }>(
      `${API}/auth/login`, { correo, contrasena }
    ).pipe(
      tap(res => {
        this._saveSession(res);
        this.alertaSeguridadPendiente.set(res.alertaSeguridad ?? null);
      }),
      catchError(err => throwError(() => err))
    );
  }

  /** El shell (campana de notificaciones) llama esto tras mostrar la alerta, para no repetirla. */
  consumirAlertaSeguridad(): void {
    this.alertaSeguridadPendiente.set(null);
  }

  // ── Logout ───────────────────────────────────────────────────────────
  logout(): void {
    // Avisa al backend para que esta sesión deje de listarse como activa.
    // Best-effort: si falla (sin red, token ya vencido, etc.) se cierra la
    // sesión localmente de todos modos.
    this.http.post(`${API}/auth/logout`, {}).pipe(
      catchError(() => of(null))
    ).subscribe(() => this._limpiarSesionLocal());
  }

  /** Limpia la sesión local sin avisar al backend (para cuando la cuenta ya no existe, p.ej. tras eliminar la organización). */
  forzarLogoutLocal(): void {
    this._limpiarSesionLocal();
  }

  private _limpiarSesionLocal(): void {
    this.currentUser.set(null);
    this.token.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean { return !!this.token(); }
  isAdmin(): boolean        { return this.currentUser()?.rol === 'admin'; }
  getToken(): string | null  { return this.token(); }

  // ── Cambiar contraseña (usuario autenticado, cualquier rol) ──────────
  cambiarContrasena(contrasenaActual: string, contrasenaNueva: string): Observable<{ actualizado: boolean }> {
    return this.http.patch<{ actualizado: boolean }>(
      `${API}/auth/cambiar-contrasena`, { contrasenaActual, contrasenaNueva }
    );
  }

  // ── Sesiones activas (web + app móvil, del usuario autenticado) ──────
  obtenerSesiones(): Observable<SesionActiva[]> {
    return this.http.get<SesionActiva[]>(`${API}/auth/sesiones`);
  }

  revocarSesion(id: number): Observable<{ revocada: boolean }> {
    return this.http.delete<{ revocada: boolean }>(`${API}/auth/sesiones/${id}`);
  }

  // ── Zona de peligro (solo admin) ──────────────────────────────────────
  generarBackup(): Observable<Blob> {
    return this.http.get(`${API}/usuarios/organizacion/backup`, { responseType: 'blob' });
  }

  eliminarOrganizacion(password: string): Observable<{}> {
    return this.http.delete(`${API}/usuarios/organizacion`, { body: { password } });
  }

  // ── Perfil del negocio (nombre, dirección, zona, moneda, logo) ───────
  obtenerPerfilNegocio(): Observable<Partial<UserSession>> {
    return this.http.get<Partial<UserSession>>(`${API}/usuarios/organizacion/perfil`).pipe(
      tap(cambios => this._actualizarPerfilLocal(cambios)),
      catchError(() => of({}))
    );
  }

  actualizarPerfilNegocio(data: PerfilNegocioUpdate): Observable<Partial<UserSession>> {
    return this.http.patch<Partial<UserSession>>(
      `${API}/usuarios/organizacion/perfil`, data
    ).pipe(
      tap(cambios => this._actualizarPerfilLocal(cambios))
    );
  }

  /** Refleja los cambios guardados en `currentUser` y en el usuario cacheado en localStorage. */
  private _actualizarPerfilLocal(cambios: Partial<UserSession>): void {
    const actual = this.currentUser();
    if (!actual) return;
    const actualizado = { ...actual, ...cambios };
    this.currentUser.set(actualizado);
    localStorage.setItem(USER_KEY, JSON.stringify(actualizado));
  }

  private _saveSession(res: { access_token: string; user: UserSession }): void {
    this.token.set(res.access_token);
    this.currentUser.set(res.user);
    localStorage.setItem(STORAGE_KEY, res.access_token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  }

  private _readStoredUser(): UserSession | null {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as UserSession; } catch { return null; }
  }
}
