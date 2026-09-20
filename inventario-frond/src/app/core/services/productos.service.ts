import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Producto {
  id: number;
  imagen: string;
  nombre: string;
  categoria: string;
  stock: number;
  stockMax: number;
  precio: number;
  proveedor: string;
  ultimaActualizacion: string | Date;
  categoriaColor: string;
  sku?: string;
  descripcion?: string;
}

const API = `${environment.apiUrl}/productos`;

@Injectable({ providedIn: 'root' })
export class ProductosService {
  private http = inject(HttpClient);

  private readonly _productos = signal<Producto[]>([]);
  readonly productos = this._productos.asReadonly();
  readonly totalProductos = computed(() => this._productos().length);
  readonly stockTotal = computed(() => this._productos().reduce((s, p) => s + p.stock, 0));

  // ── Alertas de stock (mismo criterio que el dashboard y el backend:
  //    ≤25% del stockMax se considera "bajo"; 0 unidades es "agotado") ──
  readonly productosSinStock = computed(() =>
    this._productos().filter(p => p.stock === 0)
  );
  readonly productosStockBajo = computed(() =>
    this._productos().filter(p => p.stock > 0 && p.stock <= p.stockMax * 0.25)
  );
  /** true si hay algún producto agotado o con stock bajo (para saber si hay "novedad"). */
  readonly hayAlertasStock = computed(() =>
    this.productosSinStock().length > 0 || this.productosStockBajo().length > 0
  );

  // ── Carga inicial desde el backend ───────────────────────────────────
  cargar(): Observable<Producto[]> {
    return this.http.get<Producto[]>(API).pipe(
      tap(list => this._productos.set(list))
    );
  }

  getAll(): Producto[] { return this._productos(); }

  getBySku(sku: string): Producto | undefined {
    if (!sku) return undefined;
    const s = sku.trim().toLowerCase();
    return this._productos().find(p => p.sku && p.sku.trim().toLowerCase() === s);
  }

  obtenerPorSku(sku: string): Observable<Producto> {
    return this.http.get<Producto>(`${API}/sku/${encodeURIComponent(sku)}`);
  }

  create(data: Omit<Producto, 'id' | 'ultimaActualizacion'>): Observable<Producto> {
    return this.http.post<Producto>(API, data).pipe(
      tap(nuevo => this._productos.update(list => [nuevo, ...list]))
    );
  }

  update(id: number, data: Partial<Omit<Producto, 'id'>>): Observable<Producto> {
    return this.http.patch<Producto>(`${API}/${id}`, data).pipe(
      tap(actualizado =>
        this._productos.update(list =>
          list.map(p => (p.id === id ? actualizado : p))
        )
      )
    );
  }

  delete(id: number): Observable<{ eliminado: boolean }> {
    return this.http.delete<{ eliminado: boolean }>(`${API}/${id}`).pipe(
      tap(() => this._productos.update(list => list.filter(p => p.id !== id)))
    );
  }
}
