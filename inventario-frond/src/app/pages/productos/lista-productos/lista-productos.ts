import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatRippleModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NuevoProductoDialog } from './nuevo-producto-dialog';
import { ProductosService, Producto } from '../../../core/services/productos.service';
import { CategoriasService } from '../../../core/services/categorias.service';
import { ProveedoresService } from '../../../core/services/proveedores.service';

@Component({
  selector: 'app-lista-productos',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatTableModule, MatCardModule, MatChipsModule,
    MatButtonModule, MatIconModule, MatInputModule,
    MatFormFieldModule, MatSelectModule, MatTooltipModule,
    MatBadgeModule, MatDialogModule, MatRippleModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './lista-productos.html',
  styleUrl: './lista-productos.css'
})
export class ListaProductos implements OnInit {
  private dialog = inject(MatDialog);
  private fb     = inject(FormBuilder);
  private productosService  = inject(ProductosService);
  private categoriasService = inject(CategoriasService);
  private proveedoresService= inject(ProveedoresService);

  isLoading = signal(true);
  error     = signal<string | null>(null);

  ngOnInit(): void {
    // Cargar productos, categorías y proveedores simultáneamente
    this.categoriasService.cargar().subscribe();
    this.proveedoresService.cargar().subscribe();
    this.productosService.cargar().subscribe({
      next: () => this.isLoading.set(false),
      error: () => { this.isLoading.set(false); this.error.set('No se pudo conectar al servidor'); }
    });
  }

  // ── Columnas ────────────────────────────────────────────────
  displayedColumns = ['producto', 'categoria', 'stock', 'precio', 'proveedor', 'actualizado', 'acciones'];

  // ── Opciones dinámicas de selects ─────────────────────────────
  categorias = computed(() => ['Todas', ...this.categoriasService.categorias().map(c => c.nombre)]);
  categoriasForm = computed(() => this.categoriasService.categorias().map(c => c.nombre));
  proveedores = computed(() => this.proveedoresService.proveedores().map(p => p.nombre));

  // ── Signals de filtro ───────────────────────────────────────
  busqueda        = signal('');
  categoriaFiltro = signal('Todas');

  // ── Estado de modales ────────────────────────────────────────
  productoViendo    = signal<Producto | null>(null);
  productoEditando  = signal<Producto | null>(null);
  productoEliminar  = signal<Producto | null>(null);
  eliminando        = signal(false); // animación de spinner

  // ── Formulario de edición ────────────────────────────────────
  editForm = this.fb.group({
    nombre:      ['', [Validators.required, Validators.minLength(2)]],
    categoria:   ['', Validators.required],
    precio:      [0 as number, [Validators.required, Validators.min(0)]],
    stock:       [0 as number, [Validators.required, Validators.min(0)]],
    stockMax:    [20 as number, [Validators.required, Validators.min(1)]],
    proveedor:   [''],
    sku:         [''],
    descripcion: [''],
  });

  // ── Datos del inventario ─────────────────────────────────────
  readonly productosRaw = this.productosService.productos;

  // ── Computed filtrado ────────────────────────────────────────
  productos = computed(() => {
    const q   = this.busqueda().toLowerCase();
    const cat = this.categoriaFiltro();
    return this.productosRaw().filter(p => {
      const matchCat = cat === 'Todas' || p.categoria === cat;
      const matchQ   = !q
        || p.nombre.toLowerCase().includes(q)
        || p.proveedor.toLowerCase().includes(q)
        || p.categoria.toLowerCase().includes(q)
        || (p.sku ?? '').toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  });

  // ── Helpers ──────────────────────────────────────────────────
  getStockLevel(p: Producto): 'ok' | 'low' | 'critical' {
    if (p.stock === 0)              return 'critical';
    if (p.stock / p.stockMax < 0.2) return 'low';
    return 'ok';
  }

  getStockPorcentaje(p: Producto): number {
    return Math.round((p.stock / p.stockMax) * 100);
  }

  getInitials(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  // ────────────────────────────────────────────────────────────
  // NUEVO PRODUCTO (MatDialog externo)
  // ────────────────────────────────────────────────────────────
  abrirNuevoProducto(): void {
    const ref = this.dialog.open(NuevoProductoDialog, {
      width: '500px', maxWidth: '95vw',
      panelClass: 'producto-dialog-panel',
      autoFocus: false, restoreFocus: false,
    });

    ref.afterClosed().subscribe(resultado => {
      if (!resultado) return;
      this.productosService.create({
        imagen:        resultado.imagen ?? '',
        nombre:        resultado.nombre,
        categoria:     resultado.categoria,
        stock:         0,
        stockMax:      resultado.stockMinimo * 10 || 20,
        precio:        resultado.precio ?? 0,
        proveedor:     resultado.proveedor || 'Sin proveedor',
        sku:           resultado.sku ?? '',
        descripcion:   resultado.descripcion ?? '',
        categoriaColor: '#f0f0f7',
      }).subscribe();
    });
  }

  // ────────────────────────────────────────────────────────────
  // VER DETALLE
  // ────────────────────────────────────────────────────────────
  abrirDetalle(p: Producto): void {
    this.productoViendo.set(p);
  }

  cerrarDetalle(): void {
    this.productoViendo.set(null);
  }

  // ────────────────────────────────────────────────────────────
  // EDITAR
  // ────────────────────────────────────────────────────────────
  abrirEditar(p: Producto): void {
    this.editForm.reset({
      nombre:      p.nombre,
      categoria:   p.categoria,
      precio:      p.precio,
      stock:       p.stock,
      stockMax:    p.stockMax,
      proveedor:   p.proveedor,
      sku:         p.sku ?? '',
      descripcion: p.descripcion ?? '',
    });
    this.productoEditando.set(p);
  }

  cerrarEditar(): void {
    this.productoEditando.set(null);
  }

  guardarEdicion(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }
    const editando = this.productoEditando();
    if (!editando) return;

    const v = this.editForm.value;
    this.productosService.update(editando.id, {
      nombre:      v.nombre!,
      categoria:   v.categoria!,
      precio:      v.precio!,
      stock:       v.stock!,
      stockMax:    v.stockMax!,
      proveedor:   v.proveedor || 'Sin proveedor',
      sku:         v.sku ?? '',
      descripcion: v.descripcion ?? '',
    }).subscribe();
    this.cerrarEditar();
  }

  // ────────────────────────────────────────────────────────────
  // ELIMINAR
  // ────────────────────────────────────────────────────────────
  abrirConfirmarEliminar(p: Producto): void {
    this.productoEliminar.set(p);
  }

  cancelarEliminar(): void {
    this.productoEliminar.set(null);
  }

  confirmarEliminar(): void {
    const p = this.productoEliminar();
    if (!p) return;
    this.eliminando.set(true);
    this.productosService.delete(p.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.productoEliminar.set(null);
      },
      error: () => this.eliminando.set(false)
    });
  }
}
