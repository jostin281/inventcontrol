import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface UsuarioBackend {
  id: number;
  nombre: string;
  correo: string;
  rol: 'admin' | 'usuario';
  activo: boolean;
  nombreNegocio?: string;
  tipoNegocio?: string;
  creadoEn?: string;
}

const API = 'http://localhost:3000/api/usuarios';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);

  private readonly _usuarios = signal<UsuarioBackend[]>([]);
  readonly usuarios = this._usuarios.asReadonly();

  cargar(): Observable<UsuarioBackend[]> {
    return this.http.get<UsuarioBackend[]>(API).pipe(
      tap(list => this._usuarios.set(list))
    );
  }

  getAll(): UsuarioBackend[] { return this._usuarios(); }

  create(data: { nombre: string; correo: string; contrasena: string; rol?: string }): Observable<UsuarioBackend> {
    return this.http.post<UsuarioBackend>(API, data).pipe(
      tap(nuevo => this._usuarios.update(list => [nuevo, ...list]))
    );
  }

  update(id: number, data: Partial<UsuarioBackend> & { contrasena?: string }): Observable<UsuarioBackend> {
    return this.http.patch<UsuarioBackend>(`${API}/${id}`, data).pipe(
      tap(actualizado =>
        this._usuarios.update(list =>
          list.map(u => (u.id === id ? actualizado : u))
        )
      )
    );
  }

  delete(id: number): Observable<{ eliminado: boolean }> {
    return this.http.delete<{ eliminado: boolean }>(`${API}/${id}`).pipe(
      tap(() => this._usuarios.update(list => list.filter(u => u.id !== id)))
    );
  }
}
