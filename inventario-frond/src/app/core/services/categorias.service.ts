import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Categoria {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  colorIcono: string;
  // Estos campos se calculan en el frontend a partir de productos
  totalProductos?: number;
  stockBajo?: number;
}

const API = `${environment.apiUrl}/categorias`;

@Injectable({ providedIn: 'root' })
export class CategoriasService {
  private http = inject(HttpClient);

  private _categorias = signal<Categoria[]>([]);
  readonly categorias = this._categorias.asReadonly();

  readonly totalProductos = computed(() =>
    this._categorias().reduce((s, c) => s + (c.totalProductos ?? 0), 0)
  );
  readonly totalStockBajo = computed(() =>
    this._categorias().reduce((s, c) => s + (c.stockBajo ?? 0), 0)
  );

  cargar(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(API).pipe(
      tap(list => this._categorias.set(list))
    );
  }

  getAll(): Categoria[] { return this._categorias(); }

  create(data: Omit<Categoria, 'id'>): Observable<Categoria> {
    return this.http.post<Categoria>(API, data).pipe(
      tap(nueva => this._categorias.update(list => [nueva, ...list]))
    );
  }

  update(id: number, data: Partial<Omit<Categoria, 'id'>>): Observable<Categoria> {
    return this.http.patch<Categoria>(`${API}/${id}`, data).pipe(
      tap(actualizada =>
        this._categorias.update(list =>
          list.map(c => (c.id === id ? actualizada : c))
        )
      )
    );
  }

  delete(id: number): Observable<{ eliminado: boolean }> {
    return this.http.delete<{ eliminado: boolean }>(`${API}/${id}`).pipe(
      tap(() => this._categorias.update(list => list.filter(c => c.id !== id)))
    );
  }
}
