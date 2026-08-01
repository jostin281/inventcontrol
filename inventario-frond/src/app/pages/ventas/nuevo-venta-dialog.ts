import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProductosService } from '../../core/services/productos.service';

@Component({
  selector: 'app-nuevo-venta-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
  ],
  templateUrl: './nuevo-venta-dialog.html',
  styleUrl: './nuevo-venta-dialog.css'
})
export class NuevoVentaDialog implements OnInit {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<NuevoVentaDialog>);
  private productosSvc = inject(ProductosService);

  productos = this.productosSvc.productos; // Use the read-only signal directly

  form = this.fb.group({
    cliente: ['', [Validators.required, Validators.minLength(2)]],
    productoId: [null as number | null, Validators.required],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    precio: [null as number | null, Validators.required],
    fecha: [new Date().toISOString().slice(0,10), Validators.required],
    estado: ['Completada', Validators.required],
  });

  ngOnInit(): void {
    // Ensure products are loaded from the backend
    this.productosSvc.cargar().subscribe();
  }

  onProductoChange(): void {
    const id = this.form.get('productoId')?.value as number | null;
    if (!id) return;
    const p = this.productos().find(x => x.id === id);
    if (p) this.form.patchValue({ precio: Math.round(p.precio * 100) / 100 });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const producto = this.productos().find(x => x.id === v.productoId);
    const total = (v.precio ?? 0) * (v.cantidad ?? 1);
    this.dialogRef.close({
      cliente: v.cliente,
      producto: producto ? producto.nombre : 'Producto',
      total,
      fecha: v.fecha,
      estado: v.estado,
    });
  }
}
