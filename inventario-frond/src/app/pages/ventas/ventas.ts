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
import { TicketPrintService } from '../../core/services/ticket-print.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-ventas',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTooltipModule, MatDialogModule,
    MatProgressSpinnerModule, ConfirmDialog,
  ],
  templateUrl: './ventas.html',
  styleUrl: './ventas.css'
})
export class Ventas implements OnInit {
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  private productosSvc = inject(ProductosService);
  private ventasSvc = inject(VentasService);
  private ticketSvc = inject(TicketPrintService);

  columnas = ['folio', 'cliente', 'producto', 'total', 'metodoPago', 'fecha', 'estado', 'acciones'];
  filtroStr = '';
  isLoading = signal(true);
  /** Mensaje de error de la última operación (p. ej. "stock insuficiente"). */
  errorMsg = signal<string | null>(null);

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
      v.estado.toLowerCase().includes(t) ||
      (v.folio ?? '').toLowerCase().includes(t) ||
      (v.metodoPago ?? '').toLowerCase().includes(t) ||
      v.fecha.toLowerCase().includes(t)
    );
  }

  totalVentas(): number {
    return this.ventas.reduce((acc, venta) => acc + venta.total, 0);
  }

  abrirNuevoVenta(): void {
    const ref = this.dialog.open(NuevoVentaDialog);
    ref.afterClosed().subscribe((res: any) => {
      if (!res) return;
      this.errorMsg.set(null);
      this.ventasSvc.create({
        cliente: res.cliente,
        producto: res.producto,
        productoId: res.productoId,
        cantidad: res.cantidad ?? 1,
        total: Math.round((res.total ?? 0) * 100) / 100,
        fecha: res.fecha,
        estado: res.estado,
      }).subscribe({
        next: (ventaCreada) => {
          this.productosSvc.cargar().subscribe();
          // Imprimir ticket automáticamente al registrar la venta
          this.imprimirTicket(ventaCreada);
        },
        error: (err) => this.errorMsg.set(this._mensajeError(err)),
      });
    });
  }

  imprimirTicket(v: Venta): void {
    this.ticketSvc.imprimirTicket({
      id: v.id,
      cliente: v.cliente,
      producto: v.producto,
      cantidad: v.cantidad || 1,
      total: v.total,
      fecha: v.fecha,
      estado: v.estado,
      metodoPago: v.metodoPago || 'Efectivo',
      folio: v.folio,
    });
  }

  private _mensajeError(err: any): string {
    return err?.error?.message ?? 'No se pudo completar la operación. Intenta de nuevo.';
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
    this.errorMsg.set(null);
    this.ventasSvc.update(editando.id, {
      cliente: v.cliente,
      producto: v.producto,
      total: v.total,
      fecha: v.fecha,
      estado: v.estado,
    }).subscribe({
      next: () => {
        this.cerrarEditar();
        this.productosSvc.cargar().subscribe();
      },
      error: (err) => this.errorMsg.set(this._mensajeError(err)),
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
        this.productosSvc.cargar().subscribe();
      },
      error: () => this.eliminando.set(false)
    });
  }
}
