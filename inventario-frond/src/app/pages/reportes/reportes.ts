import {
  Component, inject, signal, computed,
  OnInit, OnDestroy, AfterViewInit,
  ChangeDetectorRef
} from '@angular/core';
import { CommonModule, DecimalPipe, PercentPipe } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { MatSelectModule }       from '@angular/material/select';
import { MatFormFieldModule }    from '@angular/material/form-field';
import { MatInputModule }        from '@angular/material/input';
import { MatDatepickerModule }   from '@angular/material/datepicker';
import { MatNativeDateModule }   from '@angular/material/core';
import { MatButtonModule }       from '@angular/material/button';
import { MatIconModule }         from '@angular/material/icon';
import { MatTableModule }        from '@angular/material/table';
import { MatTooltipModule }      from '@angular/material/tooltip';
import { MatSnackBar }           from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressBarModule }  from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule }         from '@angular/material/card';
import { MatDividerModule }      from '@angular/material/divider';
import { ActivatedRoute } from '@angular/router';

import {
  ReportesService,
  CategoriaReporte,
  DatosReporte,
  BarraGrafico,
  FilaTabla,
} from '../../core/services/reportes.service';
import { ReportesExportService } from '../../core/services/reportes-export.service';

export interface OpcionCategoria {
  value: CategoriaReporte;
  label: string;
  icon:  string;
}

// ─────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    DecimalPipe,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatDatepickerModule, MatNativeDateModule,
    MatButtonModule, MatIconModule, MatTableModule,
    MatTooltipModule, MatButtonToggleModule,
    MatProgressBarModule, MatProgressSpinnerModule,
    MatCardModule, MatDividerModule,
  ],
  templateUrl: './reportes.html',
  styleUrl:    './reportes.css',
})
export class Reportes implements OnInit, AfterViewInit, OnDestroy {

  private svc    = inject(ReportesService);
  private expSvc = inject(ReportesExportService);
  private snack  = inject(MatSnackBar);
  private cdr    = inject(ChangeDetectorRef);
  private fb     = inject(FormBuilder);
  private route  = inject(ActivatedRoute);

  // ── Estado principal ────────────────────────────────────────────
  categoria    = signal<CategoriaReporte>('rotacion');
  cargando     = signal(false);
  datos        = signal<DatosReporte | null>(null);
  vistaGrafico = signal<'barras' | 'lineas'>('barras');

  // ── Estado de exportación ───────────────────────────────────────
  exportandoPdf   = signal(false);
  exportandoExcel = signal(false);

  // ── Hover del gráfico ───────────────────────────────────────────
  barraHover   = signal<BarraGrafico | null>(null);
  tooltipX     = signal(0);
  tooltipY     = signal(0);

  // ── Barra animada ───────────────────────────────────────────────
  barrasAnimadas = signal(false);

  // ── Rango de fechas (form) ──────────────────────────────────────
  rangoForm = this.fb.group({
    inicio: [new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)],
    fin:    [new Date()],
  });

  // ── Categorías disponibles ──────────────────────────────────────
  categorias: OpcionCategoria[] = [
    { value: 'rotacion',    label: 'Rotación de Stock',          icon: 'sync' },
    { value: 'valoracion',  label: 'Valoración de Inventario',   icon: 'payments' },
    { value: 'utilizacion', label: 'Utilización de Almacén',     icon: 'warehouse' },
    { value: 'proveedores', label: 'Desempeño de Proveedores',   icon: 'local_shipping' },
    { value: 'perdidas',    label: 'Análisis de Pérdidas/Mermas',icon: 'trending_down' },
  ];

  // ── Columnas de la tabla ────────────────────────────────────────
  columnaKeys = computed(() =>
    this.datos()?.columnas.map(c => c.key) ?? []
  );

  // ── Puntos SVG para gráfico de líneas ──────────────────────────
  lineaPoints = computed(() => {
    const barras = this.datos()?.barras ?? [];
    if (!barras.length) return '';
    const w = 560; // ancho útil SVG
    const h = 220; // alto útil SVG
    const stepX = w / (barras.length - 1 || 1);
    return barras
      .map((b, i) => `${i * stepX},${h - (b.valor / 100) * h}`)
      .join(' ');
  });

  readonly Math = Math;

  // ── Expose Math.max para templates ─────────────────────────────
  maxVal = computed(() =>
    Math.max(...(this.datos()?.barras.map(b => b.valorReal) ?? [1]))
  );

  ngOnInit(): void {
    this.route.queryParamMap.subscribe(params => {
      const categoriaParam = params.get('categoria') as CategoriaReporte | null;
      if (categoriaParam && this.categorias.some(c => c.value === categoriaParam)) {
        this.categoria.set(categoriaParam);
      }
      this.cargarReporte();
    });
  }

  ngAfterViewInit(): void {}
  ngOnDestroy(): void {}

  // ── Carga / recarga de datos ────────────────────────────────────
  async cargarReporte(): Promise<void> {
    this.barrasAnimadas.set(false);
    this.cargando.set(true);
    this.datos.set(null);

    const d = await this.svc.getReporte(this.categoria());
    this.datos.set(d);
    this.cargando.set(false);
    this.cdr.detectChanges();

    // Trigger animación de barras
    requestAnimationFrame(() => {
      setTimeout(() => this.barrasAnimadas.set(true), 80);
    });
  }

  onCategoriaChange(val: CategoriaReporte): void {
    this.categoria.set(val);
    this.cargarReporte();
  }

  // ── Tooltip del gráfico ─────────────────────────────────────────
  onBarraEnter(barra: BarraGrafico, event: MouseEvent): void {
    this.barraHover.set(barra);
    this.moverTooltip(event);
  }

  onBarraMove(event: MouseEvent): void {
    this.moverTooltip(event);
  }

  onBarraSalir(): void {
    this.barraHover.set(null);
  }

  private moverTooltip(event: MouseEvent): void {
    const rect = (event.currentTarget as HTMLElement)
      .closest('.chart-area')
      ?.getBoundingClientRect();
    if (rect) {
      this.tooltipX.set(event.clientX - rect.left + 12);
      this.tooltipY.set(event.clientY - rect.top - 10);
    }
  }

  // ── Formateo para tabla ─────────────────────────────────────────
  formatearCelda(valor: unknown, tipo: string): string {
    const n = Number(valor);
    switch (tipo) {
      case 'moneda':     return `$${n.toLocaleString('es-MX', { minimumFractionDigits: 0 })}`;
      case 'porcentaje': return `${n > 0 ? '+' : ''}${n.toFixed(1)}%`;
      case 'dias':       return `${n} días`;
      case 'numero':     return n.toLocaleString('es-MX');
      default:           return String(valor);
    }
  }

  esBadge(tipo: string): boolean  { return tipo === 'badge'; }
  esPosVar(v: unknown): boolean   { return Number(v) > 0;    }
  esNegVar(v: unknown): boolean   { return Number(v) < 0;    }

  // ── Exportar ────────────────────────────────────────────────────
  exportarPDF(): void {
    const d = this.datos();
    if (!d || this.exportandoPdf()) return;

    this.exportandoPdf.set(true);

    // Pequeño delay para que el spinner se muestre antes de bloquear el hilo
    setTimeout(() => {
      try {
        const rango = this.getRangoLabel();
        this.expSvc.exportarPdf(
          { columnas: d.columnas, filas: d.filas },
          d.titulo,
          d.insight,
          rango,
        );
        this.snack.open('✅ Reporte PDF descargado', 'OK', {
          duration: 4000, panelClass: ['snack-success'],
        });
      } catch (err) {
        this.snack.open('❌ Error al generar PDF', 'OK', { duration: 4000 });
        console.error(err);
      } finally {
        this.exportandoPdf.set(false);
      }
    }, 80);
  }

  exportarExcel(): void {
    const d = this.datos();
    if (!d || this.exportandoExcel()) return;

    this.exportandoExcel.set(true);

    setTimeout(() => {
      try {
        this.expSvc.exportarExcel(
          { columnas: d.columnas, filas: d.filas },
          d.titulo,
          d.insight,
        );
        this.snack.open('✅ Reporte Excel descargado', 'OK', {
          duration: 4000, panelClass: ['snack-success'],
        });
      } catch (err) {
        this.snack.open('❌ Error al generar Excel', 'OK', { duration: 4000 });
        console.error(err);
      } finally {
        this.exportandoExcel.set(false);
      }
    }, 80);
  }

  // ── Label de rango de fechas ────────────────────────────────────
  getRangoLabel(): string {
    const ini = this.rangoForm.get('inicio')?.value as Date | null;
    const fin = this.rangoForm.get('fin')?.value as Date | null;
    const fmt = (d: Date) => d.toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' });
    if (ini && fin) return `${fmt(ini)} – ${fmt(fin)}`;
    if (ini)        return `Desde ${fmt(ini)}`;
    return 'Sin rango definido';
  }

  // ── Label de categoría activa ───────────────────────────────────
  getLabelCategoria(): string {
    return this.categorias.find(c => c.value === this.categoria())?.label ?? '';
  }

  // ── Helpers gráfico de líneas ───────────────────────────────────
  getLineaX(i: number, total: number): number {
    return total <= 1 ? 280 : (i / (total - 1)) * 560;
  }

  getLineaY(valor: number): number {
    return 220 - (valor / 100) * 220;
  }

  getLineaPoints(barras: BarraGrafico[]): string {
    return barras
      .map((b, i) => `${this.getLineaX(i, barras.length)},${this.getLineaY(b.valor)}`)
      .join(' ');
  }

  getAreaPath(barras: BarraGrafico[]): string {
    if (!barras.length) return '';
    const pts = barras.map((b, i) =>
      `${this.getLineaX(i, barras.length)},${this.getLineaY(b.valor)}`
    ).join(' L ');
    const lastX = this.getLineaX(barras.length - 1, barras.length);
    return `M ${pts} L ${lastX},220 L 0,220 Z`;
  }
}
