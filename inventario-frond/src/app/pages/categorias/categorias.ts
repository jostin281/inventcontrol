import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { CategoriasService, Categoria } from '../../core/services/categorias.service';

// Re-export Categoria for backwards compatibility
export type { Categoria };

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule,
    MatTooltipModule, MatRippleModule, MatChipsModule,
    MatSelectModule
  ],
  templateUrl: './categorias.html',
  styleUrl: './categorias.css'
})
export class Categorias implements OnInit {

  private categoriasService = inject(CategoriasService);

  isLoading = signal(true);
  error     = signal<string | null>(null);

  ngOnInit(): void {
    this.categoriasService.cargar().subscribe({
      next: () => this.isLoading.set(false),
      error: () => { this.isLoading.set(false); this.error.set('No se pudo cargar las categorías'); }
    });
  }

  // ── Búsqueda ─────────────────────────────────────────────────
  busqueda = signal('');

  // ── Modal nueva / editar categoría ───────────────────────────
  modalAbierto = signal(false);
  editando = signal<Categoria | null>(null);

  // ── Panel Ver Detalle ─────────────────────────────────────────
  categoriaViendo = signal<Categoria | null>(null);

  // ── Dialog Confirmar Eliminar ─────────────────────────────────
  categoriaEliminar = signal<Categoria | null>(null);
  eliminando        = signal(false);

  // Opciones de color/icono para el formulario
  coloresDisponibles = [
    { bg: '#dde1ff', icon: '#24389c', label: 'Azul' },
    { bg: '#7ef8e0', icon: '#006b5c', label: 'Verde' },
    { bg: '#ffdad6', icon: '#ba1a1a', label: 'Rojo' },
    { bg: '#d4f4e9', icon: '#006b3c', label: 'Esmeralda' },
    { bg: '#fff0c2', icon: '#8a6000', label: 'Ámbar' },
    { bg: '#f3e5ff', icon: '#6750a4', label: 'Púrpura' },
  ];
  iconosDisponibles = [
    'category', 'store', 'inventory_2', 'shopping_bag', 'local_shipping',
    'build', 'restaurant', 'checkroom', 'medical_services', 'devices',
    'face', 'fitness_center', 'home', 'auto_stories'
  ];

  // Campos del formulario modal
  formNombre      = '';
  formDescripcion = '';
  formColor       = this.coloresDisponibles[0];
  formIcono       = 'category';
  formError       = '';

  // ── Computed — derivados del servicio compartido ──────────────
  categorias = computed(() => {
    const q = this.busqueda().toLowerCase();
    if (!q) return this.categoriasService.categorias();
    return this.categoriasService.categorias().filter(c =>
      c.nombre.toLowerCase().includes(q) ||
      c.descripcion.toLowerCase().includes(q)
    );
  });

  totalProductos = computed(() => this.categoriasService.totalProductos());
  totalStockBajo = computed(() => this.categoriasService.totalStockBajo());

  // ── Modal ─────────────────────────────────────────────────────
  abrirModal(cat?: Categoria): void {
    this.formError = '';
    if (cat) {
      this.editando.set(cat);
      this.formNombre      = cat.nombre;
      this.formDescripcion = cat.descripcion;
      this.formIcono       = cat.icono;
      this.formColor       = this.coloresDisponibles.find(c => c.bg === cat.color)
                             ?? this.coloresDisponibles[0];
    } else {
      this.editando.set(null);
      this.formNombre      = '';
      this.formDescripcion = '';
      this.formIcono       = 'laptop';
      this.formColor       = this.coloresDisponibles[0];
    }
    this.modalAbierto.set(true);
  }

  cerrarModal(): void {
    this.modalAbierto.set(false);
  }

  guardar(): void {
    if (!this.formNombre.trim()) {
      this.formError = 'El nombre es requerido.';
      return;
    }

    const editando = this.editando();

    if (editando) {
      this.categoriasService.update(editando.id, {
        nombre:      this.formNombre.trim(),
        descripcion: this.formDescripcion.trim(),
        icono:       this.formIcono,
        color:       this.formColor.bg,
        colorIcono:  this.formColor.icon,
      }).subscribe();
    } else {
      this.categoriasService.create({
        nombre:      this.formNombre.trim(),
        descripcion: this.formDescripcion.trim(),
        icono:       this.formIcono,
        color:       this.formColor.bg,
        colorIcono:  this.formColor.icon,
      }).subscribe();
    }

    this.cerrarModal();
  }

  // ── Ver Detalle ───────────────────────────────────────────────
  abrirDetalle(cat: Categoria): void {
    this.categoriaViendo.set(cat);
  }

  cerrarDetalle(): void {
    this.categoriaViendo.set(null);
  }

  // ── Confirmar Eliminar ────────────────────────────────────────
  abrirConfirmarEliminar(cat: Categoria): void {
    this.categoriaEliminar.set(cat);
  }

  cancelarEliminar(): void {
    this.categoriaEliminar.set(null);
  }

  confirmarEliminar(): void {
    const cat = this.categoriaEliminar();
    if (!cat) return;
    this.eliminando.set(true);
    this.categoriasService.delete(cat.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.categoriaEliminar.set(null);
      },
      error: () => this.eliminando.set(false)
    });
  }
}
