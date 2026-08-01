import { Injectable, inject } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { ProveedoresService, Proveedor } from './proveedores.service';
import { CategoriasService, Categoria } from './categorias.service';
import { MovimientosService } from './movimientos.service';
import { ProductosService, Producto } from './productos.service';

export type ActionType =
  | 'crear_proveedor'
  | 'crear_categoria'
  | 'crear_producto'
  | 'generar_reporte'
  | 'editar_proveedor'
  | 'eliminar_proveedor'
  | 'eliminar_categoria'
  | 'consulta_stock'
  | 'consulta_proveedores'
  | 'reabastecimiento'
  | 'orden_compra'
  | 'upgrade_plan'
  | 'unknown';

export interface ActionResult {
  success: boolean;
  entidad?: string;
  nombre?: string;
  id?: number;
  ruta?: string;
  mensaje?: string;
}

const GRADIENTES = [
  'linear-gradient(135deg, #24389c, #3f51b5)',
  'linear-gradient(135deg, #006b5c, #00a58a)',
  'linear-gradient(135deg, #7c4dff, #b388ff)',
  'linear-gradient(135deg, #e65100, #ff8f00)',
  'linear-gradient(135deg, #c62828, #e53935)',
  'linear-gradient(135deg, #00695c, #26a69a)',
];

function randomGradiente(): string {
  return GRADIENTES[Math.floor(Math.random() * GRADIENTES.length)];
}

function iniciales(nombre: string): string {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase() ?? '')
    .join('');
}

@Injectable({ providedIn: 'root' })
export class AiActionsService {
  private proveedoresService = inject(ProveedoresService);
  private categoriasService  = inject(CategoriasService);
  private movimientosService = inject(MovimientosService);
  private productosService   = inject(ProductosService);

  // ── Proveedores ────────────────────────────────────────────────────────────

  crearProveedor(datos: {
    nombre: string;
    contacto?: string;
    correo?: string;
    telefono?: string;
    categoria?: string;
  }): Observable<ActionResult> {
    return this.proveedoresService.create({
      nombre: datos.nombre,
      categoria: datos.categoria ?? 'General',
      contacto: datos.contacto ?? 'Sin especificar',
      telefono: datos.telefono ?? 'Sin teléfono',
      correo: datos.correo ?? '',
      productos: [],
      calificacion: 0,
      activo: true,
      tiempoEntregaDias: 5,
      confiabilidad: 80,
      ultimaAuditoria: new Date(),
      gradienteColor: randomGradiente(),
      iniciales: iniciales(datos.nombre),
    }).pipe(map(nuevo => ({
      success: true,
      entidad: 'proveedor',
      nombre: nuevo.nombre,
      id: nuevo.id,
      ruta: '/proveedores',
      mensaje: `Proveedor "${nuevo.nombre}" creado exitosamente.`,
    })));
  }

  editarProveedor(
    id: number,
    cambios: Partial<Omit<Proveedor, 'id'>>
  ): Observable<ActionResult> {
    const existente = this.proveedoresService.getAll().find(p => p.id === id);
    if (!existente) {
      return of({ success: false, mensaje: `No se encontró el proveedor con ID ${id}.` });
    }
    return this.proveedoresService.update(id, cambios).pipe(map(() => ({
      success: true,
      entidad: 'proveedor',
      nombre: existente.nombre,
      id,
      ruta: '/proveedores',
      mensaje: `Proveedor "${existente.nombre}" actualizado.`,
    })));
  }

  eliminarProveedor(id: number): Observable<ActionResult> {
    const existente = this.proveedoresService.getAll().find(p => p.id === id);
    if (!existente) {
      return of({ success: false, mensaje: `No se encontró el proveedor con ID ${id}.` });
    }
    return this.proveedoresService.delete(id).pipe(map(() => ({
      success: true,
      entidad: 'proveedor',
      nombre: existente.nombre,
      id,
      ruta: '/proveedores',
      mensaje: `Proveedor "${existente.nombre}" eliminado.`,
    })));
  }

  // ── Categorías ─────────────────────────────────────────────────────────────

  crearCategoria(datos: { nombre: string; descripcion?: string }): Observable<ActionResult> {
    return this.categoriasService.create({
      nombre: datos.nombre,
      descripcion: datos.descripcion ?? '',
      icono: 'category',
      color: '#dde1ff',
      colorIcono: '#24389c',
    }).pipe(map(nueva => ({
      success: true,
      entidad: 'categoria',
      nombre: nueva.nombre,
      id: nueva.id,
      ruta: '/categorias',
      mensaje: `Categoría "${nueva.nombre}" creada exitosamente.`,
    })));
  }

  eliminarCategoria(id: number): Observable<ActionResult> {
    const existente = this.categoriasService.getAll().find(c => c.id === id);
    if (!existente) {
      return of({ success: false, mensaje: `No se encontró la categoría con ID ${id}.` });
    }
    return this.categoriasService.delete(id).pipe(map(() => ({
      success: true,
      entidad: 'categoria',
      nombre: existente.nombre,
      id,
      ruta: '/categorias',
      mensaje: `Categoría "${existente.nombre}" eliminada.`,
    })));
  }

  // ── Reportes ─────────────────────────────────────────────────────────────

  generarReporte(categoria: 'rotacion' | 'valoracion' | 'utilizacion' | 'proveedores' | 'perdidas'): ActionResult {
    return {
      success: true,
      entidad: 'reporte',
      nombre: categoria,
      ruta: `/reportes?categoria=${categoria}`,
      mensaje: `Reporte de ${categoria} abierto en una vista dedicada.`,
    };
  }

  // ── Productos ─────────────────────────────────────────────────────────────

  crearProducto(datos: {
    nombre: string;
    categoria?: string;
    precio?: number;
    stock?: number;
    stockMax?: number;
    proveedor?: string;
    sku?: string;
    descripcion?: string;
  }): Observable<ActionResult> {
    return this.productosService.create({
      nombre: datos.nombre,
      categoria: datos.categoria ?? 'Accesorios',
      precio: datos.precio ?? 0,
      stock: datos.stock ?? 0,
      stockMax: datos.stockMax ?? Math.max(20, (datos.stock ?? 0) * 2),
      proveedor: datos.proveedor ?? 'Sin proveedor',
      sku: datos.sku ?? '',
      descripcion: datos.descripcion ?? '',
      imagen: '',
      categoriaColor: '#f0f0f7',
    }).pipe(map(producto => ({
      success: true,
      entidad: 'producto',
      nombre: producto.nombre,
      id: producto.id,
      ruta: '/productos',
      mensaje: `Producto "${producto.nombre}" creado correctamente y agregado al inventario.`,
    })));
  }

  // ── Consultas ──────────────────────────────────────────────────────────────

  getResumenInventario(): {
    proveedores: number;
    categorias: number;
    stockBajo: number;
    movimientosHoy: number;
  } {
    const hoy = new Date().toDateString();
    return {
      proveedores: this.proveedoresService.proveedores().filter(p => p.activo).length,
      categorias:  this.categoriasService.categorias().length,
      stockBajo:   this.categoriasService.categorias().filter(c => (c.stockBajo ?? 0) > 0).length,
      movimientosHoy: this.movimientosService
        .movimientos()
        .filter(m => new Date(m.fecha).toDateString() === hoy).length,
    };
  }
}
