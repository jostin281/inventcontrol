import {
  Component, inject, signal, computed, OnInit, AfterViewInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MovimientosService, Movimiento, TipoMovimiento } from '../../core/services/movimientos.service';
import { ProductosService } from '../../core/services/productos.service';
import { AuthService } from '../../core/services/auth.service';

export interface ProductoItem {
  nombre: string;
  sku: string;
  color: string;
}

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatTooltipModule,
    MatChipsModule, MatButtonToggleModule, MatAutocompleteModule,
    MatDatepickerModule, MatNativeDateModule, MatProgressSpinnerModule
  ],
  templateUrl: './movimientos.html',
  styleUrl: './movimientos.css'
})
export class Movimientos implements OnInit, AfterViewInit {
  protected svc          = inject(MovimientosService);
  private productosSvc   = inject(ProductosService);
  private authSvc        = inject(AuthService);
  private fb             = inject(FormBuilder);
  private snack          = inject(MatSnackBar);

  // ── Columnas ─────────────────────────────────────────────────
  displayedColumns = ['fecha', 'producto', 'tipo', 'cantidad', 'usuario', 'acciones'];

  // ── Datos y KPIs ─────────────────────────────────────────────
  totalEntradas = this.svc.totalEntradas;
  totalSalidas  = this.svc.totalSalidas;
  movimientoNeto = this.svc.movimientoNeto;

  pctEntradas = computed(() => {
    const total = this.svc.totalEntradas() + this.svc.totalSalidas();
    return total ? Math.round((this.svc.totalEntradas() / total) * 100) : 0;
  });
  pctSalidas = computed(() => 100 - this.pctEntradas());

  // ── Filtros ───────────────────────────────────────────────────
  busqueda       = signal('');
  tipoFiltro     = signal<'Todos' | TipoMovimiento>('Todos');

  // ── Lista filtrada ────────────────────────────────────────────
  movimientos = computed(() => {
    const q    = this.busqueda().toLowerCase();
    const tipo = this.tipoFiltro();
    return this.svc.movimientos().filter(m => {
      const matchTipo = tipo === 'Todos' || m.tipo === tipo;
      const matchQ    = !q
        || m.producto.toLowerCase().includes(q)
        || (m.sku ?? '').toLowerCase().includes(q)
        || m.usuario.toLowerCase().includes(q);
      return matchTipo && matchQ;
    });
  });

  // ── Catálogo dinámico de productos ─────────────────────────────
  productosCatalogo = computed<ProductoItem[]>(() =>
    this.productosSvc.productos().map(p => ({
      nombre: p.nombre,
      sku: p.sku || `PROD-${p.id}`,
      color: p.categoriaColor || '#f0f0f7',
    }))
  );

  // ── Autocomplete productos ────────────────────────────────────
  busquedaProductoTexto = signal('');
  productosFiltrados = computed(() => {
    const q = this.busquedaProductoTexto().toLowerCase();
    if (!q) return this.productosCatalogo();
    return this.productosCatalogo().filter(p =>
      p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  });
  productoSeleccionado: ProductoItem | null = null;

  // ── Animación KPI ─────────────────────────────────────────────
  kpiAnimado = signal(false);

  // ── SVG Sparkline ──────────────────────────────────────────────
  readonly sparklinePoints = '0,40 20,35 40,42 60,20 80,28 100,15 120,22 140,8 160,18';

  // ── Estado de paneles y dialogs ───────────────────────────────
  panelCrearVisible   = signal(false);
  movimientoViendo    = signal<Movimiento | null>(null);
  movimientoEditando  = signal<Movimiento | null>(null);
  movimientoEliminar  = signal<Movimiento | null>(null);
  guardando           = signal(false);
  eliminando          = signal(false);

  // ── Formulario crear/editar ───────────────────────────────────
  form = this.fb.group({
    productoBusqueda: ['', Validators.required],
    tipo:             ['Entrada' as TipoMovimiento, Validators.required],
    cantidad:         [1, [Validators.required, Validators.min(1)]],
    nota:             [''],
  });

  ngOnInit(): void {
    this.productosSvc.cargar().subscribe();
    this.svc.cargar().subscribe({
      next: () => this.kpiAnimado.set(true),
      error: () => {}
    });
  }

  getInitials(nombre: string): string {
    if (!nombre) return 'P';
    return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  formatFecha(fecha: any): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  formatHora(fecha: any): string {
    if (!fecha) return '—';
    return new Date(fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }

  getRelativo(fecha: any): string {
    if (!fecha) return '—';
    const diff = Date.now() - new Date(fecha).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `Hace ${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `Hace ${hrs}h`;
    return `Hace ${Math.floor(hrs / 24)}d`;
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.kpiAnimado.set(true), 150);
  }

  // ── Autocomplete ──────────────────────────────────────────────
  onBusquedaProducto(q: string): void {
    this.busquedaProductoTexto.set(q);
    const match = this.productosCatalogo().find(p => p.nombre.toLowerCase() === q.toLowerCase());
    this.productoSeleccionado = match ?? { nombre: q, sku: '', color: '#f0f0f7' };
  }

  seleccionarProducto(prod: ProductoItem): void {
    this.productoSeleccionado = prod;
    this.form.patchValue({ productoBusqueda: prod.nombre });
  }

  displayProducto(val: string): string { return val; }

  // ── Crear ─────────────────────────────────────────────────────
  abrirCrear(): void {
    this.form.reset({ tipo: 'Entrada', cantidad: 1 });
    this.productoSeleccionado = null;
    this.busquedaProductoTexto.set('');
    this.panelCrearVisible.set(true);
  }

  cerrarCrear(): void {
    this.panelCrearVisible.set(false);
  }

  guardarNuevo(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    const v = this.form.value;
    const prodNombre = v.productoBusqueda!.trim();
    const prodObj = this.productoSeleccionado ?? { nombre: prodNombre, sku: '', color: '#f0f0f7' };

    const cantFinal = v.tipo === 'Salida' || v.tipo === 'Ajuste'
      ? -(v.cantidad ?? 1)
      : (v.cantidad ?? 1);

    const currentUserNombre = this.authSvc.currentUser()?.nombre || 'Usuario';

    this.svc.create({
      producto:      prodObj.nombre,
      sku:           prodObj.sku,
      tipo:          v.tipo as TipoMovimiento,
      cantidad:      cantFinal,
      usuario:       currentUserNombre,
      nota:          v.nota ?? '',
      colorProducto: prodObj.color,
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarCrear();
        this.snack.open('Movimiento registrado correctamente', 'OK', { duration: 3000, panelClass: ['snack-success'] });
      },
      error: () => this.guardando.set(false)
    });
  }

  // ── Ver detalle ───────────────────────────────────────────────
  abrirDetalle(m: Movimiento): void {
    this.movimientoViendo.set(m);
  }
  cerrarDetalle(): void {
    this.movimientoViendo.set(null);
  }

  // ── Editar ────────────────────────────────────────────────────
  abrirEditar(m: Movimiento): void {
    this.movimientoViendo.set(null);
    const prod = this.productosCatalogo().find(p => p.sku === m.sku) ?? null;
    this.productoSeleccionado = prod ?? { nombre: m.producto, sku: m.sku, color: m.colorProducto };
    this.form.reset({
      productoBusqueda: m.producto,
      tipo:             m.tipo,
      cantidad:         Math.abs(m.cantidad),
      nota:             m.nota ?? '',
    });
    this.movimientoEditando.set(m);
  }

  cerrarEditar(): void {
    this.movimientoEditando.set(null);
  }

  guardarEdicion(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const editando = this.movimientoEditando();
    if (!editando) return;

    const v = this.form.value;
    const prodNombre = v.productoBusqueda!.trim();
    const prodObj = this.productoSeleccionado ?? { nombre: prodNombre, sku: editando.sku, color: editando.colorProducto };

    const cantFinal = v.tipo === 'Salida' || v.tipo === 'Ajuste'
      ? -(v.cantidad ?? 1)
      : (v.cantidad ?? 1);

    this.svc.update(editando.id, {
      producto:      prodObj.nombre,
      sku:           prodObj.sku,
      tipo:          v.tipo as TipoMovimiento,
      cantidad:      cantFinal,
      nota:          v.nota ?? '',
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarEditar();
        this.snack.open('Movimiento actualizado', 'OK', { duration: 3000 });
      },
      error: () => this.guardando.set(false)
    });
  }

  // ── Eliminar ──────────────────────────────────────────────────
  abrirEliminar(m: Movimiento): void { this.movimientoEliminar.set(m); }
  cancelarEliminar(): void          { this.movimientoEliminar.set(null); }

  confirmarEliminar(): void {
    const m = this.movimientoEliminar();
    if (!m) return;
    this.eliminando.set(true);
    const backup = { ...m };
    this.svc.delete(m.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.movimientoEliminar.set(null);
        const ref = this.snack.open(`Movimiento de "${m.producto}" eliminado`, 'Deshacer', { duration: 5000, panelClass: ['snack-warn'] });
        ref.onAction().subscribe(() => this.svc.undoDelete(backup));
      },
      error: () => this.eliminando.set(false)
    });
  }
}
