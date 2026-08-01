import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface Proveedor {
  id: number;
  nombre: string;
  categoria: string;
  contacto: string;
  telefono: string;
  correo: string;
  productos: string[];
  calificacion: number;
  activo: boolean;
  tiempoEntregaDias: number;
  confiabilidad: number;
  ultimaAuditoria?: Date | string;
  proximaAuditoria?: Date | string;
  gradienteColor: string;
  iniciales: string;
}

const API = 'http://localhost:3000/api/proveedores';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private http = inject(HttpClient);

  private _proveedores = signal<Proveedor[]>([]);
  readonly proveedores = this._proveedores.asReadonly();

  readonly proveedoresActivos = computed(() =>
    this._proveedores().filter(p => p.activo).length
  );
  readonly tiempoPromedioEntrega = computed(() => {
    const activos = this._proveedores().filter(p => p.activo);
    if (!activos.length) return 0;
    return Math.round(activos.reduce((s, p) => s + p.tiempoEntregaDias, 0) / activos.length);
  });
  readonly tasaConfiabilidad = computed(() => {
    const activos = this._proveedores().filter(p => p.activo);
    if (!activos.length) return 0;
    return Math.round(activos.reduce((s, p) => s + p.confiabilidad, 0) / activos.length);
  });
  readonly auditoriasPendientes = computed(() => {
    const hoy = new Date();
    return this._proveedores().filter(p =>
      p.proximaAuditoria && new Date(p.proximaAuditoria) <= hoy
    ).length;
  });

  cargar(): Observable<Proveedor[]> {
    return this.http.get<Proveedor[]>(API).pipe(
      tap(list => this._proveedores.set(list))
    );
  }

  getAll(): Proveedor[] { return this._proveedores(); }

  create(data: Omit<Proveedor, 'id'>): Observable<Proveedor> {
    return this.http.post<Proveedor>(API, data).pipe(
      tap(nuevo => this._proveedores.update(list => [nuevo, ...list]))
    );
  }

  update(id: number, data: Partial<Omit<Proveedor, 'id'>>): Observable<Proveedor> {
    return this.http.patch<Proveedor>(`${API}/${id}`, data).pipe(
      tap(actualizado =>
        this._proveedores.update(list =>
          list.map(p => (p.id === id ? actualizado : p))
        )
      )
    );
  }

  delete(id: number): Observable<{ eliminado: boolean }> {
    return this.http.delete<{ eliminado: boolean }>(`${API}/${id}`).pipe(
      tap(() => this._proveedores.update(list => list.filter(p => p.id !== id)))
    );
  }

  undoDelete(proveedor: Proveedor): void {
    this._proveedores.update(list =>
      [proveedor, ...list].sort((a, b) => a.id - b.id)
    );
  }
}
