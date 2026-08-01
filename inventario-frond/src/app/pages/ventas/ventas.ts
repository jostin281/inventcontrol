import { Component, signal, inject, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NuevoVentaDialog } from './nuevo-venta-dialog';
import { ProductosService } from '../../core/services/productos.service';
import { VentasService, Venta } from '../../core/services/ventas.service';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTooltipModule, MatDialogModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css'
})
export class Ventas implements OnInit {
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  private productosSvc = inject(ProductosService);
  private ventasSvc = inject(VentasService);

  columnas = ['cliente', 'producto', 'total', 'fecha', 'estado', 'acciones'];
  filtroStr = '';
  isLoading = signal(true);

  ngOnInit(): void {
    this.productosSvc.cargar().subscribe();
    this.ventasSvc.cargar().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  get ventas(): Venta[] {
    return this.ventasSvc.ventas();
  }

  get ventasFiltradas(): Venta[] {
    const t = this.filtroStr.toLowerCase();
    if (!t) return this.ventas;
    return this.ventas.filter(v =>
      v.cliente.toLowerCase().includes(t) ||
      v.producto.toLowerCase().includes(t) ||
      v.estado.toLowerCase().includes(t)
    );
  }

  totalVentas(): number {
    return this.ventas.reduce((acc, venta) => acc + venta.total, 0);
  }

  abrirNuevoVenta(): void {
    const ref = this.dialog.open(NuevoVentaDialog);
    ref.afterClosed().subscribe((res: any) => {
      if (!res) return;
      this.ventasSvc.create({
        cliente: res.cliente,
        producto: res.producto,
        total: Math.round((res.total ?? 0) * 100) / 100,
        fecha: res.fecha,
        estado: res.estado,
      }).subscribe();
    });
  }

  // ── Estado estilo Productos (ver / editar / eliminar)
  ventaViendo = signal<Venta | null>(null);
  ventaEditando = signal<Venta | null>(null);
  ventaEliminar = signal<Venta | null>(null);
  eliminando = signal(false);

  editForm = this.fb.group({
    cliente: ['', [Validators.required, Validators.minLength(2)]],
    producto: ['', Validators.required],
    total: [0, [Validators.required, Validators.min(0)]],
    fecha: ['', Validators.required],
    estado: ['Completada', Validators.required],
  });

  productos = computed(() => this.productosSvc.getAll());

  // ── Ver detalle
  abrirDetalle(v: Venta): void { this.ventaViendo.set(v); }
  cerrarDetalle(): void { this.ventaViendo.set(null); }

  // ── Editar
  abrirEditar(v: Venta): void {
    this.editForm.reset({ cliente: v.cliente, producto: v.producto, total: v.total, fecha: v.fecha, estado: v.estado });
    this.ventaEditando.set(v);
  }
  cerrarEditar(): void { this.ventaEditando.set(null); }

  guardarEdicion(): void {
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const editando = this.ventaEditando();
    if (!editando) return;

    const v = this.editForm.value as { cliente?: string; producto?: string; total?: number; fecha?: string; estado?: string };
    this.ventasSvc.update(editando.id, {
      cliente: v.cliente,
      producto: v.producto,
      total: v.total,
      fecha: v.fecha,
      estado: v.estado,
    }).subscribe({
      next: () => this.cerrarEditar()
    });
  }

  // ── Eliminar
  abrirConfirmarEliminar(v: Venta): void { this.ventaEliminar.set(v); }
  cancelarEliminar(): void { this.ventaEliminar.set(null); }

  confirmarEliminar(): void {
    const v = this.ventaEliminar();
    if (!v) return;
    this.eliminando.set(true);
    this.ventasSvc.delete(v.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.ventaEliminar.set(null);
      },
      error: () => this.eliminando.set(false)
    });
  }
}
