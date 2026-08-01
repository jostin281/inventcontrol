import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export type TipoMovimiento = 'Entrada' | 'Salida' | 'Ajuste';

export interface Movimiento {
  id: number;
  fecha: Date | string;
  producto: string;
  sku: string;
  tipo: TipoMovimiento;
  cantidad: number;
  usuario: string;
  nota?: string;
  colorProducto: string;
}

const API = 'http://localhost:3000/api/movimientos';

@Injectable({ providedIn: 'root' })
export class MovimientosService {
  private http = inject(HttpClient);

  private _movimientos = signal<Movimiento[]>([]);
  readonly movimientos = this._movimientos.asReadonly();

  readonly totalEntradas = computed(() =>
    this._movimientos()
      .filter(m => m.tipo === 'Entrada')
      .reduce((s, m) => s + m.cantidad, 0)
  );
  readonly totalSalidas = computed(() =>
    this._movimientos()
      .filter(m => m.tipo === 'Salida')
      .reduce((s, m) => s + Math.abs(m.cantidad), 0)
  );
  readonly movimientoNeto = computed(() => this.totalEntradas() - this.totalSalidas());

  cargar(): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(API).pipe(
      tap(list => this._movimientos.set(list))
    );
  }

  getAll(): Movimiento[] { return this._movimientos(); }

  create(data: Omit<Movimiento, 'id' | 'fecha'>): Observable<Movimiento> {
    return this.http.post<Movimiento>(API, data).pipe(
      tap(nuevo => this._movimientos.update(list => [nuevo, ...list]))
    );
  }

  update(id: number, data: Partial<Omit<Movimiento, 'id'>>): Observable<Movimiento> {
    return this.http.patch<Movimiento>(`${API}/${id}`, data).pipe(
      tap(actualizado =>
        this._movimientos.update(list =>
          list.map(m => (m.id === id ? actualizado : m))
        )
      )
    );
  }

  delete(id: number): Observable<{ eliminado: boolean }> {
    return this.http.delete<{ eliminado: boolean }>(`${API}/${id}`).pipe(
      tap(() => this._movimientos.update(list => list.filter(m => m.id !== id)))
    );
  }

  undoDelete(movimiento: Movimiento): void {
    this._movimientos.update(list =>
      [movimiento, ...list].sort((a, b) => b.id - a.id)
    );
  }
}
