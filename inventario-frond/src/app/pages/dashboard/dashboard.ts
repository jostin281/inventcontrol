import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatRippleModule } from '@angular/material/core';
import { forkJoin } from 'rxjs';
import { ProductosService } from '../../core/services/productos.service';
import { MovimientosService } from '../../core/services/movimientos.service';
import { ProveedoresService } from '../../core/services/proveedores.service';

export interface KpiCard {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  variant: 'default' | 'error' | 'primary' | 'success';
  badge?: string;
  badgeColor?: string;
  progress?: number;
}

export interface MovimientoReciente {
  producto: string;
  tipo: 'Entrada' | 'Salida';
  cantidad: number;
  cliente: string;
  hora: string;
  estado: 'Completado' | 'Pendiente';
  inicial: string;
  color: string;
}

export interface ProductoVenta {
  nombre: string;
  unidades: number;
  porcentaje: number;
  color: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, CurrencyPipe,
    MatCardModule, MatIconModule, MatButtonModule,
    MatChipsModule, MatTooltipModule, MatBadgeModule, MatRippleModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {
  private productosService   = inject(ProductosService);
  private movimientosService = inject(MovimientosService);
  private proveedoresService = inject(ProveedoresService);

  today = new Date();
  isLoading = signal(true);

  // ── KPI Cards (se actualizan con datos reales) ────────────────
  kpis = signal<KpiCard[]>([
    { title: 'Valor Total Inventario', value: '—',   subtitle: 'Cargando...', icon: 'payments',    variant: 'default',  badge: '', badgeColor: 'success' },
    { title: 'Stock Bajo',             value: '—',   subtitle: 'Cargando...', icon: 'warning',     variant: 'error' },
    { title: 'Movimientos (Entradas)', value: '—',   subtitle: 'Cargando...', icon: 'swap_horiz',  variant: 'success', progress: 0 },
    { title: 'Productos Totales',      value: '—',   subtitle: 'Cargando...', icon: 'inventory_2', variant: 'primary' },
  ]);

  // ── Productos más en stock ─────────────────────────────────────
  productosTop = signal<ProductoVenta[]>([]);

  // ── Movimientos recientes ──────────────────────────────────────
  movimientos = signal<MovimientoReciente[]>([]);

  // ── Animación de barras ────────────────────────────────────────
  barrasAnimadas = signal(false);

  ngOnInit(): void {
    forkJoin({
      productos:    this.productosService.cargar(),
      movimientos:  this.movimientosService.cargar(),
      proveedores:  this.proveedoresService.cargar(),
    }).subscribe({
      next: ({ productos, movimientos }) => {
        this.isLoading.set(false);

        // ── KPIs ────────────────────────────────────────────────
        const valorTotal = productos.reduce((s, p) => s + p.precio * p.stock, 0);
        const stockBajo  = productos.filter(p => p.stock > 0 && p.stock / p.stockMax < 0.25).length;
        const sinStock   = productos.filter(p => p.stock === 0).length;
        const entradas   = movimientos.filter(m => m.tipo === 'Entrada').reduce((s, m) => s + m.cantidad, 0);

        this.kpis.set([
          {
            title: 'Valor Total Inventario',
            value: '$' + valorTotal.toLocaleString('es-MX', { minimumFractionDigits: 0 }),
            subtitle: `${productos.length} productos en catálogo`,
            icon: 'payments', variant: 'default', badge: '+stock', badgeColor: 'success'
          },
          {
            title: 'Stock Bajo / Sin Stock',
            value: String(stockBajo + sinStock),
            subtitle: `${sinStock} sin stock, ${stockBajo} críticos`,
            icon: 'warning', variant: 'error'
          },
          {
            title: 'Total Entradas',
            value: String(entradas),
            subtitle: `${movimientos.length} movimientos registrados`,
            icon: 'swap_horiz', variant: 'success',
            progress: movimientos.length ? Math.min(100, Math.round((entradas / movimientos.length) * 100)) : 0
          },
          {
            title: 'Productos Totales',
            value: String(productos.length),
            subtitle: `${sinStock} agotados`,
            icon: 'inventory_2', variant: 'primary'
          },
        ]);

        // ── Top productos ────────────────────────────────────────
        const top = [...productos]
          .sort((a, b) => b.stock - a.stock)
          .slice(0, 6);
        const maxStock = top[0]?.stock ?? 1;
        const colores = ['#24389c','#3f51b5','#006b5c','#5c6bc0','#00897b','#7986cb'];
        this.productosTop.set(top.map((p, i) => ({
          nombre:     p.nombre,
          unidades:   p.stock,
          porcentaje: Math.round((p.stock / maxStock) * 100),
          color:      colores[i % colores.length],
        })));

        // ── Movimientos recientes ────────────────────────────────
        const recientes = [...movimientos]
          .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
          .slice(0, 5);
        this.movimientos.set(recientes.map(m => ({
          producto: m.producto,
          tipo:     m.tipo as 'Entrada' | 'Salida',
          cantidad: m.tipo === 'Salida' ? -m.cantidad : m.cantidad,
          cliente:  m.nota ?? m.usuario,
          hora:     this._tiempoRelativo(new Date(m.fecha)),
          estado:   'Completado' as const,
          inicial:  m.usuario.charAt(0).toUpperCase(),
          color:    m.colorProducto,
        })));

        setTimeout(() => this.barrasAnimadas.set(true), 200);
      },
      error: () => {
        this.isLoading.set(false);
      }
    });
  }

  private _tiempoRelativo(fecha: Date): string {
    const diff = Date.now() - fecha.getTime();
    const min  = Math.floor(diff / 60000);
    if (min < 60)   return `Hace ${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24)   return `Hace ${hrs}h`;
    return `Hace ${Math.floor(hrs / 24)}d`;
  }
}
