import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

export type UserRole = 'admin' | 'usuario';

export interface UserSession {
  id: number;
  nombre: string;
  correo: string;
  rol: UserRole;
  companyId?: number;
  nombreNegocio?: string;
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

  // ── Registro ────────────────────────────────────────────────────────
  registro(data: {
    nombre: string;
    correo: string;
    contrasena: string;
    nombreNegocio?: string;
    tipoNegocio?: string;
  }): Observable<{ access_token: string; user: UserSession }> {
    return this.http.post<{ access_token: string; user: UserSession }>(
      `${API}/auth/registro`, data
    ).pipe(
      tap(res => this._saveSession(res)),
      catchError(err => throwError(() => err))
    );
  }

  // ── Login ────────────────────────────────────────────────────────────
  login(correo: string, contrasena: string): Observable<{ access_token: string; user: UserSession }> {
    return this.http.post<{ access_token: string; user: UserSession }>(
      `${API}/auth/login`, { correo, contrasena }
    ).pipe(
      tap(res => this._saveSession(res)),
      catchError(err => throwError(() => err))
    );
  }

  // ── Logout ───────────────────────────────────────────────────────────
  logout(): void {
    this.currentUser.set(null);
    this.token.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_KEY);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean { return !!this.token(); }
  isAdmin(): boolean        { return this.currentUser()?.rol === 'admin'; }
  getToken(): string | null  { return this.token(); }

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
