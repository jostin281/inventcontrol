import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CategoriasService } from '../../../core/services/categorias.service';
import { ProveedoresService } from '../../../core/services/proveedores.service';
import { ProductosService } from '../../../core/services/productos.service';
import { BarcodeScannerModalDialog } from '../../../shared/components/barcode-scanner-modal/barcode-scanner-modal';

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
  private dialog = inject(MatDialog);
  private categoriasSvc = inject(CategoriasService);
  private proveedoresSvc = inject(ProveedoresService);
  private productosSvc = inject(ProductosService);

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
  imagenError: string | null = null;

  form = this.fb.group({
    nombre:       ['', [Validators.required, Validators.minLength(2)]],
    categoria:    ['', Validators.required],
    descripcion:  [''],
    precio:       [null as number | null, [Validators.required, Validators.min(0)]],
    stock:        [0, [Validators.required, Validators.min(0)]],
    stockMinimo:  [1, [Validators.required, Validators.min(0)]],
    proveedor:    [''],
    sku:          [''],
  });

  abrirEscaneoBarcode(): void {
    const ref = this.dialog.open(BarcodeScannerModalDialog, { width: '92vw', maxWidth: '460px' });
    ref.afterClosed().subscribe((codigo: string | null) => {
      if (codigo) {
        this.form.patchValue({ sku: codigo.trim() });
        // Verificar si el producto ya existe en inventario
        const existente = this.productosSvc.getBySku(codigo.trim());
        if (existente) {
          alert(`¡Atención! Ya existe un producto registrado con este código de barras:\n\n` +
                `Nombre: ${existente.nombre}\nCategoría: ${existente.categoria}\nPrecio: $${existente.precio}\nStock actual: ${existente.stock}\n\n` +
                `Se han cargado los datos automáticamente.`);
          this.form.patchValue({
            nombre: existente.nombre,
            categoria: existente.categoria,
            precio: existente.precio,
            proveedor: existente.proveedor || '',
            descripcion: existente.descripcion || '',
          });
        }
      }
    });
  }

  toggleAtributo(key: string): void {
    this.atributosActivos[key] = !this.atributosActivos[key];
  }

  onImagenChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.imagenError = null;

    if (file.size > 5 * 1024 * 1024) {
      this.imagenError = 'La imagen no puede superar 5 MB';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.imagenPreview = e.target?.result as string;
    };
    reader.readAsDataURL(file);
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
