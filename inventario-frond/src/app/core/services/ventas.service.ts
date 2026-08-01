import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface Venta {
  id: number;
  cliente: string;
  producto: string;
  total: number;
  fecha: string;
  estado: string;
}

const API = 'http://localhost:3000/api/ventas';

@Injectable({ providedIn: 'root' })
export class VentasService {
  private http = inject(HttpClient);

  private readonly _ventas = signal<Venta[]>([]);
  readonly ventas = this._ventas.asReadonly();

  cargar(): Observable<Venta[]> {
    return this.http.get<Venta[]>(API).pipe(
      tap(list => this._ventas.set(list))
    );
  }

  getAll(): Venta[] { return this._ventas(); }

  create(data: Omit<Venta, 'id'>): Observable<Venta> {
    return this.http.post<Venta>(API, data).pipe(
      tap(nueva => this._ventas.update(list => [nueva, ...list]))
    );
  }

  update(id: number, data: Partial<Omit<Venta, 'id'>>): Observable<Venta> {
    return this.http.patch<Venta>(`${API}/${id}`, data).pipe(
      tap(actualizada =>
        this._ventas.update(list =>
          list.map(v => (v.id === id ? actualizada : v))
        )
      )
    );
  }

  delete(id: number): Observable<{ eliminado: boolean }> {
    return this.http.delete<{ eliminado: boolean }>(`${API}/${id}`).pipe(
      tap(() => this._ventas.update(list => list.filter(v => v.id !== id)))
    );
  }
}
