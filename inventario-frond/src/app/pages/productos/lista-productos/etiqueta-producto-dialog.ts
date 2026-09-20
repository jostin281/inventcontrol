import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BarcodeGeneratorService } from '../../../core/services/barcode-generator.service';

export interface EtiquetaDialogData {
  nombre: string;
  sku?: string;
  precio: number;
  categoria?: string;
}

@Component({
  selector: 'app-etiqueta-producto-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <div class="dialog-header no-print">
      <div class="header-title-container">
        <mat-icon color="primary">qr_code_2</mat-icon>
        <h2 mat-dialog-title class="dialog-title">Etiqueta de Producto</h2>
      </div>
      <button mat-icon-button (click)="cerrar()" matTooltip="Volver a productos">
        <mat-icon>close</mat-icon>
      </button>
    </div>

    <mat-dialog-content class="dialog-content">
      <div class="print-area">
        <div class="label-card">
          <div class="title">{{ data.nombre }}</div>
          <div class="category">{{ data.categoria || 'INVENTARIO' }}</div>
          <div class="price">\${{ data.precio | number:'1.2-2' }}</div>

          <img class="barcode" [src]="barcodeImg" alt="Código de barras" />

          <div class="footer-flex">
            <div class="sku-box">
              <div class="sku-label">SKU / CÓDIGO</div>
              <div class="sku-value">{{ sku }}</div>
            </div>
            <img class="qr" [src]="qrImg" alt="Código QR" />
          </div>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="center" class="dialog-actions no-print">
      <button mat-stroked-button class="btn-volver" (click)="cerrar()">
        <mat-icon>arrow_back</mat-icon>
        Volver a productos
      </button>
      <button mat-flat-button color="primary" class="btn-imprimir" (click)="imprimir()">
        <mat-icon>print</mat-icon>
        Imprimir
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 14px 18px;
      background: #0f172a;
      color: white;
    }
    .header-title-container {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .dialog-title {
      margin: 0 !important;
      font-size: 17px !important;
      font-weight: 600 !important;
      color: white !important;
    }
    .dialog-content {
      padding: 24px 16px !important;
      display: flex;
      justify-content: center;
      background: #f8fafc;
    }
    .label-card {
      width: 310px;
      background: white;
      border: 2px dashed #4f46e5;
      border-radius: 14px;
      padding: 18px;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08);
      text-align: center;
      box-sizing: border-box;
      margin: 0 auto;
    }
    .title {
      font-size: 16px;
      font-weight: bold;
      color: #111827;
      margin-bottom: 4px;
      text-transform: uppercase;
      word-break: break-word;
    }
    .category {
      font-size: 12px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .price {
      font-size: 24px;
      font-weight: 800;
      color: #059669;
      margin: 8px 0;
    }
    .barcode {
      max-width: 100%;
      height: auto;
      margin-top: 8px;
    }
    .footer-flex {
      display: flex;
      align-items: center;
      justify-content: space-around;
      margin-top: 12px;
      border-top: 1px solid #e5e7eb;
      padding-top: 10px;
    }
    .sku-box {
      text-align: left;
    }
    .sku-label {
      font-size: 10px;
      color: #6b7280;
      font-weight: 600;
    }
    .sku-value {
      font-size: 13px;
      font-weight: bold;
      font-family: monospace;
      color: #111827;
    }
    .qr {
      width: 60px;
      height: 60px;
    }
    .dialog-actions {
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      gap: 12px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
    }
    .btn-volver {
      border-color: #cbd5e1 !important;
      color: #334155 !important;
      font-weight: 600;
    }
    .btn-imprimir {
      font-weight: 600;
      padding: 0 20px;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      .dialog-content {
        padding: 0 !important;
        background: white !important;
      }
      .label-card {
        border: 1px solid #000;
        box-shadow: none;
      }
    }
  `]
})
export class EtiquetaProductoDialog implements OnInit {
  sku = '';
  barcodeImg = '';
  qrImg = '';

  constructor(
    public dialogRef: MatDialogRef<EtiquetaProductoDialog>,
    @Inject(MAT_DIALOG_DATA) public data: EtiquetaDialogData,
    private barcodeService: BarcodeGeneratorService
  ) {}

  ngOnInit(): void {
    this.sku = (this.data.sku && this.data.sku.trim() !== '')
      ? this.data.sku.trim()
      : ('789' + Math.floor(100000000 + Math.random() * 900000000));

    this.barcodeImg = this.barcodeService.generateBarcodeDataUrl(this.sku, 320, 100);
    this.qrImg = this.barcodeService.generateQrDataUrl(this.sku, 150);
  }

  cerrar(): void {
    this.dialogRef.close();
  }

  imprimir(): void {
    this.barcodeService.imprimirEtiqueta({
      nombre: this.data.nombre,
      sku: this.sku,
      precio: this.data.precio,
      categoria: this.data.categoria
    });
  }
}
