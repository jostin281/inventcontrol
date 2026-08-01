import {
  Component, inject, signal, computed, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule, MatChipInputEvent } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ProveedoresService, Proveedor } from '../../core/services/proveedores.service';

const GRADIENTES_DISPONIBLES = [
  'linear-gradient(135deg, #24389c, #3f51b5)',
  'linear-gradient(135deg, #006b5c, #00a58a)',
  'linear-gradient(135deg, #7c4dff, #b388ff)',
  'linear-gradient(135deg, #e65100, #ff8f00)',
  'linear-gradient(135deg, #c62828, #e53935)',
  'linear-gradient(135deg, #00695c, #26a69a)',
];

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule,
    MatTooltipModule, MatChipsModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
  templateUrl: './proveedores.html',
  styleUrl: './proveedores.css'
})
export class Proveedores implements OnInit {
  /** Expose Math for template usage */
  readonly Math = Math;
  protected svc = inject(ProveedoresService);
  private fb    = inject(FormBuilder);
  private snack = inject(MatSnackBar);

  // ── Datos ─────────────────────────────────────────────────────
  proveedoresActivos = this.svc.proveedoresActivos;
  tiempoPromedio     = this.svc.tiempoPromedioEntrega;
  tasaConfiabilidad  = this.svc.tasaConfiabilidad;
  auditoriasPend     = this.svc.auditoriasPendientes;

  // ── Filtro/búsqueda ───────────────────────────────────────────
  busqueda       = signal('');
  categoriaFiltro= signal('Todas');
  
  // Categorías de filtro construidas dinámicamente según lo existente en la DB
  categorias = computed(() => {
    const cats = new Set(this.svc.proveedores().map(p => p.categoria).filter(Boolean));
    return ['Todas', ...Array.from(cats)];
  });

  filtroVisible  = signal(false);

  // ── Lista filtrada ────────────────────────────────────────────
  proveedores = computed(() => {
    const q   = this.busqueda().toLowerCase();
    const cat = this.categoriaFiltro();
    return this.svc.proveedores().filter(p => {
      const matchCat = cat === 'Todas' || p.categoria === cat;
      const matchQ   = !q
        || p.nombre.toLowerCase().includes(q)
        || p.contacto.toLowerCase().includes(q)
        || p.categoria.toLowerCase().includes(q)
        || p.productos.some(pr => pr.toLowerCase().includes(q));
      return matchCat && matchQ;
    });
  });

  // ── Animaciones ───────────────────────────────────────────────
  kpiAnimado = signal(false);

  // ── Chips config ──────────────────────────────────────────────
  readonly separatorKeysCodes = [ENTER, COMMA] as const;
  productosNuevos: string[] = [];
  productosEditar: string[] = [];

  // ── Estados de paneles ────────────────────────────────────────
  panelCrearVisible   = signal(false);
  proveedorViendo     = signal<Proveedor | null>(null);
  proveedorEditando   = signal<Proveedor | null>(null);
  proveedorEliminar   = signal<Proveedor | null>(null);
  guardando           = signal(false);
  eliminando          = signal(false);

  // ── Formularios ───────────────────────────────────────────────
  form = this.fb.group({
    nombre:       ['', Validators.required],
    categoria:    ['', Validators.required],
    contacto:     ['', Validators.required],
    telefono:     [''],
    correo:       ['', [Validators.email]],
    calificacion: [4.0, [Validators.min(1), Validators.max(5)]],
    tiempoEntrega:[ 3, [Validators.min(1)]],
    confiabilidad:[ 90, [Validators.min(0), Validators.max(100)]],
  });

  ngOnInit(): void {
    this.svc.cargar().subscribe({
      next: () => this.kpiAnimado.set(true),
      error: () => {}
    });
  }

  // ── Helpers ───────────────────────────────────────────────────
  getInitials(nombre: string): string {
    return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
  }

  getStars(cal: number): number[] {
    return Array.from({ length: 5 }, (_, i) => i + 1);
  }

  formatFecha(d: Date | string | undefined): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  esPendienteAuditoria(p: Proveedor): boolean {
    return !!p.proximaAuditoria && new Date(p.proximaAuditoria) <= new Date();
  }

  getGradienteIndex(idx: number): string {
    return GRADIENTES_DISPONIBLES[idx % GRADIENTES_DISPONIBLES.length];
  }

  // ── Filtro toggle ─────────────────────────────────────────────
  toggleFiltro(): void { this.filtroVisible.update(v => !v); }

  // ── Chips: crear ──────────────────────────────────────────────
  addProductoCrear(event: MatChipInputEvent): void {
    const val = (event.value || '').trim();
    if (val) this.productosNuevos.push(val);
    event.chipInput!.clear();
  }

  removeProductoCrear(prod: string): void {
    const i = this.productosNuevos.indexOf(prod);
    if (i >= 0) this.productosNuevos.splice(i, 1);
  }

  // ── Chips: editar ─────────────────────────────────────────────
  addProductoEditar(event: MatChipInputEvent): void {
    const val = (event.value || '').trim();
    if (val) this.productosEditar.push(val);
    event.chipInput!.clear();
  }

  removeProductoEditar(prod: string): void {
    const i = this.productosEditar.indexOf(prod);
    if (i >= 0) this.productosEditar.splice(i, 1);
  }

  // ── CRUD: Crear ───────────────────────────────────────────────
  abrirCrear(): void {
    this.form.reset({ calificacion: 4.0, tiempoEntrega: 3, confiabilidad: 90 });
    this.productosNuevos = [];
    this.panelCrearVisible.set(true);
  }

  cerrarCrear(): void { this.panelCrearVisible.set(false); }

  guardarNuevo(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const v = this.form.value;
    const idx = this.svc.proveedores().length % GRADIENTES_DISPONIBLES.length;

    this.svc.create({
      nombre:            v.nombre!,
      categoria:         v.categoria!,
      contacto:          v.contacto!,
      telefono:          v.telefono ?? '',
      correo:            v.correo ?? '',
      productos:         [...this.productosNuevos],
      calificacion:      v.calificacion ?? 4.0,
      activo:            true,
      tiempoEntregaDias: v.tiempoEntrega ?? 3,
      confiabilidad:     v.confiabilidad ?? 90,
      ultimaAuditoria:   new Date(),
      gradienteColor:    GRADIENTES_DISPONIBLES[idx],
      iniciales:         this.getInitials(v.nombre!),
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarCrear();
        this.snack.open('Proveedor agregado correctamente', 'OK', { duration: 3000, panelClass: ['snack-success'] });
      },
      error: () => this.guardando.set(false)
    });
  }

  // ── CRUD: Ver ─────────────────────────────────────────────────
  abrirDetalle(p: Proveedor): void { this.proveedorViendo.set(p); }
  cerrarDetalle(): void            { this.proveedorViendo.set(null); }

  // ── CRUD: Editar ──────────────────────────────────────────────
  abrirEditar(p: Proveedor): void {
    this.proveedorViendo.set(null);
    this.productosEditar = [...p.productos];
    this.form.reset({
      nombre:        p.nombre,
      categoria:     p.categoria,
      contacto:      p.contacto,
      telefono:      p.telefono,
      correo:        p.correo,
      calificacion:  p.calificacion,
      tiempoEntrega: p.tiempoEntregaDias,
      confiabilidad: p.confiabilidad,
    });
    this.proveedorEditando.set(p);
  }

  cerrarEditar(): void { this.proveedorEditando.set(null); }

  guardarEdicion(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const v = this.form.value;

    this.svc.update(this.proveedorEditando()!.id, {
      nombre:            v.nombre!,
      categoria:         v.categoria!,
      contacto:          v.contacto!,
      telefono:          v.telefono ?? '',
      correo:            v.correo ?? '',
      productos:         [...this.productosEditar],
      calificacion:      v.calificacion ?? 4.0,
      tiempoEntregaDias: v.tiempoEntrega ?? 3,
      confiabilidad:     v.confiabilidad ?? 90,
      iniciales:         this.getInitials(v.nombre!),
    }).subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarEditar();
        this.snack.open('Proveedor actualizado', 'OK', { duration: 3000 });
      },
      error: () => this.guardando.set(false)
    });
  }

  // ── CRUD: Eliminar ────────────────────────────────────────────
  abrirEliminar(p: Proveedor): void  { this.proveedorEliminar.set(p); }
  cancelarEliminar(): void           { this.proveedorEliminar.set(null); }

  confirmarEliminar(): void {
    const p = this.proveedorEliminar();
    if (!p) return;
    this.eliminando.set(true);
    const backup = { ...p, productos: [...p.productos] };
    this.svc.delete(p.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.proveedorEliminar.set(null);
        const ref = this.snack.open(`"${p.nombre}" eliminado`, 'Deshacer', { duration: 5000, panelClass: ['snack-warn'] });
        ref.onAction().subscribe(() => this.svc.undoDelete(backup));
      },
      error: () => this.eliminando.set(false)
    });
  }
}
