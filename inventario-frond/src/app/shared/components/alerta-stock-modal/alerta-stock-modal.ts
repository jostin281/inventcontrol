import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductosService, Producto } from '../../../core/services/productos.service';

@Component({
  selector: 'app-alerta-stock-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="alert-dialog-container">
      <div class="dialog-header">
        <div class="header-title">
          <mat-icon class="alert-icon">warning</mat-icon>
          <h2>Alertas de Reabastecimiento de Stock</h2>
        </div>
        <button mat-icon-button (click)="cerrar()" type="button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="dialog-content">
        @if (cargando()) {
          <div class="loading-box">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Analizando nivel de inventario...</p>
          </div>
        } @else if (productosAlertas().length === 0) {
          <div class="empty-box">
            <mat-icon class="check-icon">check_circle</mat-icon>
            <h3>¡Todo el inventario está al día!</h3>
            <p>No se encontraron productos agotados ni con stock crítico.</p>
          </div>
        } @else {
          <div class="summary-card">
            <div class="summary-info">
              <span class="summary-count">{{ productosAlertas().length }}</span>
              <div class="summary-text">
                <strong>{{ productosAlertas().length }} productos requieren reabastecimiento</strong>
                <small>Solicita el pedido directamente a tus proveedores vía WhatsApp</small>
              </div>
            </div>
          </div>

          <div class="products-list">
            @for (p of productosAlertas(); track p.id) {
              <div class="product-item">
                <div class="item-main">
                  <div class="status-badge" [class.badge-empty]="p.stock === 0" [class.badge-low]="p.stock > 0">
                    {{ p.stock === 0 ? '❌ AGOTADO' : '⚠️ STOCK BAJO (' + p.stock + ')' }}
                  </div>
                  <div class="item-name">{{ p.nombre }}</div>
                  <div class="item-details">
                    <span>SKU: {{ p.sku || 'N/A' }}</span>
                    <span>Categoría: {{ p.categoria || 'General' }}</span>
                    <span>Proveedor: <strong>{{ p.proveedor || 'Sin especificar' }}</strong></span>
                  </div>
                </div>
                <button mat-flat-button class="btn-ws-item" (click)="compartirWhatsAppProducto(p)" matTooltip="Enviar pedido por WhatsApp">
                  <mat-icon>chat</mat-icon> Pedir
                </button>
              </div>
            }
          </div>
        }
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button (click)="cerrar()" type="button">Cerrar</button>
        @if (productosAlertas().length > 0) {
          <button mat-flat-button class="btn-ws-global" (click)="enviarWhatsAppGlobal()" type="button">
            <mat-icon>chat</mat-icon> Pedir Todo por WhatsApp
          </button>
        }
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .alert-dialog-container {
      padding: 12px;
      box-sizing: border-box;
    }
    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .header-title h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: #0f172a;
    }
    .alert-icon {
      color: #ef4444;
      font-size: 26px;
      width: 26px;
      height: 26px;
    }
    .dialog-content {
      padding: 16px 0 !important;
      display: flex;
      flex-direction: column;
      gap: 14px;
      max-height: 65vh;
      overflow-y: auto;
    }
    .loading-box, .empty-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px;
      text-align: center;
      color: #64748b;
      gap: 10px;
    }
    .check-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #10b981;
    }
    .summary-card {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 12px;
      padding: 14px;
    }
    .summary-info {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .summary-count {
      background: #ef4444;
      color: white;
      font-size: 20px;
      font-weight: 800;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .summary-text {
      display: flex;
      flex-direction: column;
    }
    .summary-text strong {
      color: #991b1b;
      font-size: 14px;
    }
    .summary-text small {
      color: #b91c1c;
      font-size: 12px;
    }
    .products-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .product-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 14px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
    }
    .item-main {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .status-badge {
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 999px;
      width: fit-content;
    }
    .badge-empty {
      background: #fee2e2;
      color: #991b1b;
    }
    .badge-low {
      background: #fef3c7;
      color: #92400e;
    }
    .item-name {
      font-size: 14px;
      font-weight: 700;
      color: #1e293b;
    }
    .item-details {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: #64748b;
    }
    .btn-ws-item {
      background: #25d366 !important;
      color: white !important;
      border-radius: 8px !important;
      font-weight: 700 !important;
    }
    .btn-ws-global {
      background: #25d366 !important;
      color: white !important;
      border-radius: 8px !important;
      font-weight: 700 !important;
      padding: 0 18px !important;
    }
    .dialog-actions {
      padding-top: 10px;
      gap: 10px;
    }
  `]
})
export class AlertaStockModalDialog implements OnInit {
  private dialogRef = inject(MatDialogRef<AlertaStockModalDialog>);
  private productosService = inject(ProductosService);

  cargando = signal(true);
  productosAlertas = signal<Producto[]>([]);
  mensajeWhatsAppEncoded = '';

  ngOnInit(): void {
    this.cargarAlertas();
  }

  cargarAlertas(): void {
    // Obtener inmediatamente de la memoria del servicio
    const sinStock = this.productosService.productosSinStock();
    const stockBajo = this.productosService.productosStockBajo();
    const listaCompleta = [...sinStock, ...stockBajo];

    this.productosAlertas.set(listaCompleta);
    this.generarTextoWhatsApp(listaCompleta);
    this.cargando.set(false);

    // Intentar refrescar vía backend
    this.productosService.getAlertasStock().subscribe({
      next: (res) => {
        if (res && res.productos && res.productos.length > 0) {
          this.productosAlertas.set(res.productos);
          if (res.mensajeWhatsApp) {
            this.mensajeWhatsAppEncoded = res.mensajeWhatsApp;
          }
        }
      },
      error: () => {
        // Mantener la lista local de memoria
      }
    });
  }

  generarTextoWhatsApp(list: Producto[]): void {
    if (!list || list.length === 0) return;
    let txt = `🚨 *ALERTA DE REABASTECIMIENTO DE INVENTARIO*\n\n`;
    txt += `Hola, se requiere reabastecer los siguientes ${list.length} productos:\n\n`;
    list.forEach((p, i) => {
      const st = p.stock === 0 ? '❌ AGOTADO' : `⚠️ STOCK BAJO (${p.stock})`;
      txt += `${i + 1}. *${p.nombre}*\n`;
      txt += `   • Estado: ${st}\n`;
      txt += `   • SKU: ${p.sku || 'N/A'}\n`;
      txt += `   • Proveedor: ${p.proveedor || 'General'}\n\n`;
    });
    txt += `_Mensaje generado automáticamente por InvenControl._`;
    this.mensajeWhatsAppEncoded = encodeURIComponent(txt);
  }

  enviarWhatsAppGlobal(): void {
    if (!this.mensajeWhatsAppEncoded) {
      this.generarTextoWhatsApp(this.productosAlertas());
    }
    const url = `https://api.whatsapp.com/send?text=${this.mensajeWhatsAppEncoded}`;
    window.open(url, '_blank');
  }

  compartirWhatsAppProducto(p: Producto): void {
    const txt = `🚨 *REABASTECIMIENTO DE PRODUCTO*\n\nHola, requerimos pedir más unidades de:\n- *${p.nombre}*\n- SKU: ${p.sku || 'N/A'}\n- Stock Actual: ${p.stock}\n- Proveedor: ${p.proveedor || 'General'}\n\nPor favor confirmar precio y tiempo de entrega.`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(txt)}`;
    window.open(url, '_blank');
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
