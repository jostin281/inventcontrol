import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CategoriasService } from '../../../core/services/categorias.service';
import { ProveedoresService } from '../../../core/services/proveedores.service';

@Component({
  selector: 'app-nuevo-producto-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule,
    MatChipsModule, MatTooltipModule
  ],
  templateUrl: './nuevo-producto-dialog.html',
  styleUrl: './nuevo-producto-dialog.css'
})
export class NuevoProductoDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<NuevoProductoDialog>);
  private categoriasSvc = inject(CategoriasService);
  private proveedoresSvc = inject(ProveedoresService);

  categorias = computed(() => this.categoriasSvc.categorias().map(c => c.nombre));
  proveedores = computed(() => this.proveedoresSvc.proveedores().map(p => p.nombre));

  // Chips de opciones booleanas
  atributos = [
    { key: 'gravable',     label: 'Gravable',       icon: 'receipt_long' },
    { key: 'requiereSerie', label: 'Requiere Serie', icon: 'qr_code' },
    { key: 'fragil',       label: 'Frágil',          icon: 'local_shipping' },
  ];
  atributosActivos: Record<string, boolean> = {
    gravable: false, requiereSerie: false, fragil: false
  };

  // Imagen preview
  imagenPreview: string | null = null;

  form = this.fb.group({
    nombre:       ['', [Validators.required, Validators.minLength(2)]],
    categoria:    ['', Validators.required],
    descripcion:  [''],
    precio:       [null as number | null, [Validators.required, Validators.min(0)]],
    stockMinimo:  [1, [Validators.required, Validators.min(0)]],
    proveedor:    [''],
    sku:          [''],
  });

  toggleAtributo(key: string): void {
    this.atributosActivos[key] = !this.atributosActivos[key];
  }

  onImagenChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagenPreview = e.target?.result as string;
      };
      reader.readAsDataURL(input.files[0]);
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close({
      ...this.form.value,
      ...this.atributosActivos,
      imagen: this.imagenPreview
    });
  }
}
