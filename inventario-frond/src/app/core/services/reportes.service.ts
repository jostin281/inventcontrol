import { Injectable, inject } from '@angular/core';
import { ProductosService } from './productos.service';
import { MovimientosService } from './movimientos.service';
import { ProveedoresService } from './proveedores.service';
import { CategoriasService } from './categorias.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

// ── Types ──────────────────────────────────────────────────────────
export type CategoriaReporte =
  | 'rotacion'
  | 'valoracion'
  | 'utilizacion'
  | 'proveedores'
  | 'perdidas';

export interface BarraGrafico {
  label: string;
  valor: number;      // 0–100 (normalizado para altura)
  valorReal: number;  // valor original para tooltip
  variacion: number;  // positivo = sube, negativo = baja
  color: string;
}

export interface FilaTabla {
  [key: string]: string | number;
}

export interface ColumnaTabla {
  key: string;
  label: string;
  tipo: 'texto' | 'numero' | 'moneda' | 'porcentaje' | 'dias' | 'badge';
}

export interface Region {
  nombre: string;
  valor: number;      // 0–100
  valorReal: string;
}

export interface DatosReporte {
  titulo: string;
  subtitulo: string;
  insight: string;
  insightDetalle: string;
  metaLabel: string;
  metaValor: number;   // 0–100 para progress
  barras: BarraGrafico[];
  regiones: Region[];
  columnas: ColumnaTabla[];
  filas: FilaTabla[];
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private productosSvc = inject(ProductosService);
  private movimientosSvc = inject(MovimientosService);
  private proveedoresSvc = inject(ProveedoresService);
  private categoriasSvc = inject(CategoriasService);

  async getReporte(tipo: CategoriaReporte): Promise<DatosReporte> {
    // Cargar los servicios si aún no están cargados
    try {
      await forkJoin({
        productos: this.productosSvc.cargar().pipe(catchError(() => of([]))),
        movimientos: this.movimientosSvc.cargar().pipe(catchError(() => of([]))),
        proveedores: this.proveedoresSvc.cargar().pipe(catchError(() => of([]))),
        categorias: this.categoriasSvc.cargar().pipe(catchError(() => of([]))),
      }).toPromise();
    } catch {
      // continuar con lo que hay en memoria si falla
    }

    const productos = this.productosSvc.productos();
    const movimientos = this.movimientosSvc.movimientos();
    const proveedores = this.proveedoresSvc.proveedores();
    const categorias = this.categoriasSvc.categorias();

    switch (tipo) {
      case 'rotacion':
        return this.generarRotacion(productos, movimientos, categorias);
      case 'valoracion':
        return this.generarValoracion(productos, categorias);
      case 'utilizacion':
        return this.generarUtilizacion(productos, categorias);
      case 'proveedores':
        return this.generarProveedores(proveedores);
      case 'perdidas':
        return this.generarPerdidas(movimientos, productos);
    }
  }

  private generarRotacion(productos: any[], movimientos: any[], categorias: any[]): DatosReporte {
    if (!productos.length) {
      return {
        titulo: 'Velocidad de Rotación de Stock',
        subtitulo: 'Frecuencia de movimiento vs. duración de almacenamiento por categoría',
        insight: 'No hay productos registrados en el inventario',
        insightDetalle: 'Agrega productos en el módulo de Inventario para analizar la velocidad de rotación.',
        metaLabel: 'Meta: 8.0x  |  Actual: 0.0x',
        metaValor: 0,
        barras: [],
        regiones: [],
        columnas: [
          { key: 'producto', label: 'Producto', tipo: 'texto' },
          { key: 'categoria', label: 'Categoría', tipo: 'badge' },
          { key: 'vendidas', label: 'Stock actual', tipo: 'numero' },
          { key: 'dias', label: 'Días estim.', tipo: 'dias' },
          { key: 'ratio', label: 'Ratio rotación', tipo: 'numero' },
        ],
        filas: [],
      };
    }

    const catMap = new Map<string, number>();
    productos.forEach(p => {
      const cat = p.categoria || 'Sin categoría';
      catMap.set(cat, (catMap.get(cat) || 0) + p.stock);
    });

    const colores = ['#24389c', '#3f51b5', '#5c6bc0', '#7986cb', '#006b5c', '#00897b'];
    const entries = Array.from(catMap.entries());
    const maxVal = Math.max(...entries.map(e => e[1]), 1);

    const barras: BarraGrafico[] = entries.map(([label, total], i) => ({
      label,
      valor: Math.round((total / maxVal) * 100),
      valorReal: total,
      variacion: 0,
      color: colores[i % colores.length],
    }));

    const topCat = [...entries].sort((a, b) => b[1] - a[1])[0];

    const filas: FilaTabla[] = productos.map(p => ({
      producto: p.nombre,
      categoria: p.categoria || 'Sin categoría',
      vendidas: p.stock,
      dias: 15,
      ratio: Number((p.stock / (p.stockMax || 1)).toFixed(1)),
    }));

    return {
      titulo: 'Velocidad de Rotación de Stock',
      subtitulo: 'Frecuencia de movimiento vs. duración de almacenamiento por categoría',
      insight: topCat ? `🏆 ${topCat[0]} tiene el mayor volumen con ${topCat[1]} unidades en stock` : 'Análisis de rotación preparado',
      insightDetalle: 'Monitorea las existencias para asegurar que los productos de mayor movimiento mantengan niveles óptimos de stock.',
      metaLabel: `Total productos: ${productos.length}  |  Unidades: ${productos.reduce((s, p) => s + p.stock, 0)}`,
      metaValor: Math.min(100, Math.round((productos.filter(p => p.stock > 0).length / (productos.length || 1)) * 100)),
      barras,
      regiones: entries.slice(0, 4).map(([nombre, val]) => ({
        nombre,
        valor: Math.round((val / maxVal) * 100),
        valorReal: `${val} u.`,
      })),
      columnas: [
        { key: 'producto', label: 'Producto', tipo: 'texto' },
        { key: 'categoria', label: 'Categoría', tipo: 'badge' },
        { key: 'vendidas', label: 'Stock actual', tipo: 'numero' },
        { key: 'dias', label: 'Días en inv.', tipo: 'dias' },
        { key: 'ratio', label: 'Ratio (Stock/Max)', tipo: 'numero' },
      ],
      filas,
    };
  }

  private generarValoracion(productos: any[], categorias: any[]): DatosReporte {
    const valorTotalInventario = productos.reduce((s, p) => s + (p.precio * p.stock), 0);

    if (!productos.length || valorTotalInventario === 0) {
      return {
        titulo: 'Valoración de Inventario',
        subtitulo: 'Valor total de activos en inventario por categoría de producto',
        insight: '💰 El valor del inventario es $0 MXN',
        insightDetalle: 'No hay productos con existencias y precios asignados. Agrega productos en la sección correspondiente.',
        metaLabel: 'Meta: —  |  Actual: $0',
        metaValor: 0,
        barras: [],
        regiones: [],
        columnas: [
          { key: 'categoria', label: 'Categoría', tipo: 'badge' },
          { key: 'unidades', label: 'Unidades', tipo: 'numero' },
          { key: 'costoUnit', label: 'Costo prom.', tipo: 'moneda' },
          { key: 'valorTotal', label: 'Valor total', tipo: 'moneda' },
          { key: 'pct', label: '% del total', tipo: 'porcentaje' },
        ],
        filas: [],
      };
    }

    const catMap = new Map<string, { unidades: number; valorTotal: number; count: number }>();
    productos.forEach(p => {
      const cat = p.categoria || 'Sin categoría';
      const prev = catMap.get(cat) || { unidades: 0, valorTotal: 0, count: 0 };
      catMap.set(cat, {
        unidades: prev.unidades + p.stock,
        valorTotal: prev.valorTotal + (p.precio * p.stock),
        count: prev.count + 1,
      });
    });

    const entries = Array.from(catMap.entries());
    const maxValorCat = Math.max(...entries.map(e => e[1].valorTotal), 1);
    const colores = ['#24389c', '#3f51b5', '#5c6bc0', '#7986cb', '#9fa8da', '#c5cae9'];

    const barras: BarraGrafico[] = entries.map(([label, data], i) => ({
      label,
      valor: Math.round((data.valorTotal / maxValorCat) * 100),
      valorReal: data.valorTotal,
      variacion: 0,
      color: colores[i % colores.length],
    }));

    const topCat = [...entries].sort((a, b) => b[1].valorTotal - a[1].valorTotal)[0];

    const filas: FilaTabla[] = entries.map(([cat, data]) => ({
      categoria: cat,
      unidades: data.unidades,
      costoUnit: data.unidades > 0 ? Math.round(data.valorTotal / data.unidades) : 0,
      valorTotal: data.valorTotal,
      pct: Number(((data.valorTotal / (valorTotalInventario || 1)) * 100).toFixed(1)),
    }));

    return {
      titulo: 'Valoración de Inventario',
      subtitulo: 'Valor total de activos en inventario por categoría de producto',
      insight: `💰 Valor total del inventario: $${valorTotalInventario.toLocaleString('es-MX')} MXN`,
      insightDetalle: topCat ? `La categoría ${topCat[0]} representa el ${((topCat[1].valorTotal / (valorTotalInventario || 1)) * 100).toFixed(0)}% del valor total ($${topCat[1].valorTotal.toLocaleString('es-MX')} MXN).` : '',
      metaLabel: `Total productos: ${productos.length} | Valor: $${valorTotalInventario.toLocaleString('es-MX')}`,
      metaValor: 100,
      barras,
      regiones: entries.slice(0, 4).map(([nombre, data]) => ({
        nombre,
        valor: Math.round((data.valorTotal / maxValorCat) * 100),
        valorReal: `$${data.valorTotal.toLocaleString('es-MX')}`,
      })),
      columnas: [
        { key: 'categoria', label: 'Categoría', tipo: 'badge' },
        { key: 'unidades', label: 'Unidades', tipo: 'numero' },
        { key: 'costoUnit', label: 'Costo prom.', tipo: 'moneda' },
        { key: 'valorTotal', label: 'Valor total', tipo: 'moneda' },
        { key: 'pct', label: '% del total', tipo: 'porcentaje' },
      ],
      filas,
    };
  }

  private generarUtilizacion(productos: any[], categorias: any[]): DatosReporte {
    if (!productos.length) {
      return {
        titulo: 'Utilización de Almacén',
        subtitulo: 'Porcentaje de ocupación y capacidad disponible por categoría de producto',
        insight: 'No hay datos de almacén disponibles',
        insightDetalle: 'Registra productos con su stock y capacidad máxima para analizar la ocupación.',
        metaLabel: 'Capacidad ideal: ≤ 80%  |  Promedio: 0%',
        metaValor: 0,
        barras: [],
        regiones: [],
        columnas: [
          { key: 'zona', label: 'Categoría/Zona', tipo: 'badge' },
          { key: 'capacidad', label: 'Capacidad max.', tipo: 'numero' },
          { key: 'ocupado', label: 'Stock actual', tipo: 'numero' },
          { key: 'disponible', label: 'Disponible', tipo: 'numero' },
          { key: 'pct', label: '% Utilización', tipo: 'porcentaje' },
        ],
        filas: [],
      };
    }

    const catMap = new Map<string, { capacidad: number; ocupado: number }>();
    productos.forEach(p => {
      const cat = p.categoria || 'Sin categoría';
      const prev = catMap.get(cat) || { capacidad: 0, ocupado: 0 };
      catMap.set(cat, {
        capacidad: prev.capacidad + (p.stockMax || 20),
        ocupado: prev.ocupado + p.stock,
      });
    });

    const entries = Array.from(catMap.entries());
    const colores = ['#24389c', '#d97706', '#006b5c', '#3f51b5', '#5c6bc0'];

    const barras: BarraGrafico[] = entries.map(([label, data], i) => {
      const pct = Math.min(100, Math.round((data.ocupado / (data.capacidad || 1)) * 100));
      return {
        label,
        valor: pct,
        valorReal: pct,
        variacion: 0,
        color: pct > 85 ? '#ba1a1a' : colores[i % colores.length],
      };
    });

    const promUtil = Math.round(barras.reduce((s, b) => s + b.valor, 0) / (barras.length || 1));

    const filas: FilaTabla[] = entries.map(([cat, data]) => {
      const pct = Math.min(100, Math.round((data.ocupado / (data.capacidad || 1)) * 100));
      return {
        zona: cat,
        capacidad: data.capacidad,
        ocupado: data.ocupado,
        disponible: Math.max(0, data.capacidad - data.ocupado),
        pct,
      };
    });

    return {
      titulo: 'Utilización de Almacén',
      subtitulo: 'Porcentaje de ocupación y capacidad disponible por categoría de producto',
      insight: `📦 Promedio de utilización: ${promUtil}%`,
      insightDetalle: promUtil > 80 ? 'La ocupación supera la meta recomendada del 80%. Considera ampliar espacio.' : 'El nivel de almacenamiento se encuentra dentro de los parámetros estables.',
      metaLabel: `Capacidad ideal: ≤ 80%  |  Promedio: ${promUtil}%`,
      metaValor: promUtil,
      barras,
      regiones: entries.slice(0, 4).map(([nombre, data]) => ({
        nombre,
        valor: Math.min(100, Math.round((data.ocupado / (data.capacidad || 1)) * 100)),
        valorReal: `${Math.round((data.ocupado / (data.capacidad || 1)) * 100)}%`,
      })),
      columnas: [
        { key: 'zona', label: 'Categoría/Zona', tipo: 'badge' },
        { key: 'capacidad', label: 'Capacidad max.', tipo: 'numero' },
        { key: 'ocupado', label: 'Stock actual', tipo: 'numero' },
        { key: 'disponible', label: 'Disponible', tipo: 'numero' },
        { key: 'pct', label: '% Utilización', tipo: 'porcentaje' },
      ],
      filas,
    };
  }

  private generarProveedores(proveedores: any[]): DatosReporte {
    if (!proveedores.length) {
      return {
        titulo: 'Desempeño de Proveedores',
        subtitulo: 'Índice de calificación, puntualidad y confiabilidad por proveedor',
        insight: 'No hay proveedores registrados',
        insightDetalle: 'Agrega proveedores en la sección correspondiente para visualizar las métricas de desempeño.',
        metaLabel: 'Meta: ≥ 80pts  |  Promedio: 0pts',
        metaValor: 0,
        barras: [],
        regiones: [],
        columnas: [
          { key: 'proveedor', label: 'Proveedor', tipo: 'texto' },
          { key: 'puntualidad', label: 'Confiabilidad %', tipo: 'porcentaje' },
          { key: 'calidad', label: 'Calificación (0-5)', tipo: 'numero' },
          { key: 'entregaDias', label: 'T. entrega (días)', tipo: 'dias' },
          { key: 'puntuacion', label: 'Productos asc.', tipo: 'numero' },
        ],
        filas: [],
      };
    }

    const colores = ['#006b5c', '#00897b', '#26a69a', '#4db6ac', '#80cbc4'];

    const barras: BarraGrafico[] = proveedores.map((p, i) => ({
      label: p.nombre,
      valor: p.confiabilidad || 80,
      valorReal: p.confiabilidad || 80,
      variacion: 0,
      color: colores[i % colores.length],
    }));

    const promConf = Math.round(proveedores.reduce((s, p) => s + (p.confiabilidad || 80), 0) / proveedores.length);
    const topProv = [...proveedores].sort((a, b) => (b.confiabilidad || 0) - (a.confiabilidad || 0))[0];

    const filas: FilaTabla[] = proveedores.map(p => ({
      proveedor: p.nombre,
      puntualidad: p.confiabilidad || 90,
      calidad: p.calificacion || 4.5,
      entregaDias: p.tiempoEntregaDias || 3,
      puntuacion: Array.isArray(p.productos) ? p.productos.length : 0,
    }));

    return {
      titulo: 'Desempeño de Proveedores',
      subtitulo: 'Índice de calificación, puntualidad y confiabilidad por proveedor',
      insight: topProv ? `⭐ ${topProv.nombre}: mejor confiabilidad registrada (${topProv.confiabilidad || 90}%)` : '',
      insightDetalle: `Se evalúan ${proveedores.length} proveedores registrados. Confiabilidad promedio: ${promConf}%.`,
      metaLabel: `Meta: ≥ 80%  |  Promedio: ${promConf}%`,
      metaValor: promConf,
      barras,
      regiones: proveedores.slice(0, 4).map(p => ({
        nombre: p.nombre,
        valor: p.confiabilidad || 80,
        valorReal: `${p.confiabilidad || 80}%`,
      })),
      columnas: [
        { key: 'proveedor', label: 'Proveedor', tipo: 'texto' },
        { key: 'puntualidad', label: 'Confiabilidad %', tipo: 'porcentaje' },
        { key: 'calidad', label: 'Calificación (0-5)', tipo: 'numero' },
        { key: 'entregaDias', label: 'T. entrega (días)', tipo: 'dias' },
        { key: 'puntuacion', label: 'Productos asc.', tipo: 'numero' },
      ],
      filas,
    };
  }

  private generarPerdidas(movimientos: any[], productos: any[]): DatosReporte {
    const mermas = movimientos.filter(m => m.tipo === 'Ajuste' || (m.nota && m.nota.toLowerCase().includes('merma')));

    if (!mermas.length) {
      return {
        titulo: 'Análisis de Pérdidas y Mermas',
        subtitulo: 'Pérdidas por categoría: caducidad, daños, robo y errores operativos',
        insight: '📉 Sin mermas ni pérdidas registradas',
        insightDetalle: 'No existen registros de movimientos tipo Ajuste o merma en el periodo.',
        metaLabel: 'Meta: ≤ 1.5%  |  Actual: 0.0%',
        metaValor: 0,
        barras: [],
        regiones: [],
        columnas: [
          { key: 'categoria', label: 'Producto/Categoría', tipo: 'badge' },
          { key: 'unidades', label: 'Unidades perdidas', tipo: 'numero' },
          { key: 'valorPerd', label: 'Valor estimado', tipo: 'moneda' },
          { key: 'causa', label: 'Tipo / Nota', tipo: 'texto' },
        ],
        filas: [],
      };
    }

    const prodMap = new Map<string, { prod: any; cantidad: number }>();
    mermas.forEach(m => {
      const prodName = m.producto;
      const prev = prodMap.get(prodName) || { prod: m, cantidad: 0 };
      prodMap.set(prodName, {
        prod: m,
        cantidad: prev.cantidad + Math.abs(m.cantidad),
      });
    });

    const entries = Array.from(prodMap.entries());
    const maxCant = Math.max(...entries.map(e => e[1].cantidad), 1);
    const colores = ['#ba1a1a', '#e53935', '#ef9a9a', '#ffcdd2'];

    const barras: BarraGrafico[] = entries.map(([label, data], i) => ({
      label,
      valor: Math.round((data.cantidad / maxCant) * 100),
      valorReal: data.cantidad,
      variacion: 0,
      color: colores[i % colores.length],
    }));

    const totalUnidadesPerdidas = entries.reduce((s, e) => s + e[1].cantidad, 0);

    const filas: FilaTabla[] = entries.map(([prodName, data]) => ({
      categoria: prodName,
      unidades: data.cantidad,
      valorPerd: data.cantidad * 100, // estimado
      causa: data.prod.nota || 'Ajuste de inventario',
    }));

    return {
      titulo: 'Análisis de Pérdidas y Mermas',
      subtitulo: 'Pérdidas por categoría: caducidad, daños, robo y errores operativos',
      insight: `📉 Unidades ajustadas por pérdida: ${totalUnidadesPerdidas}`,
      insightDetalle: `Se registraron ${mermas.length} ajustes de inventario.`,
      metaLabel: `Total mermas: ${totalUnidadesPerdidas} unidades`,
      metaValor: 20,
      barras,
      regiones: entries.slice(0, 4).map(([nombre, data]) => ({
        nombre,
        valor: Math.round((data.cantidad / maxCant) * 100),
        valorReal: `${data.cantidad} u.`,
      })),
      columnas: [
        { key: 'categoria', label: 'Producto/Categoría', tipo: 'badge' },
        { key: 'unidades', label: 'Unidades perdidas', tipo: 'numero' },
        { key: 'valorPerd', label: 'Valor estimado', tipo: 'moneda' },
        { key: 'causa', label: 'Tipo / Nota', tipo: 'texto' },
      ],
      filas,
    };
  }
}
