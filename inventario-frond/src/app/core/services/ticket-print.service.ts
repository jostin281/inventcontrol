import { Injectable, inject } from '@angular/core';
import { BarcodeGeneratorService } from './barcode-generator.service';

export interface VentaTicket {
  id?: number;
  cliente: string;
  producto: string;
  cantidad?: number;
  total: number;
  fecha: string | Date;
  estado: string;
  sku?: string;
  metodoPago?: string;
  folio?: string;
}

export interface TicketItem {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface PosTicketData {
  folio: string;
  cliente: string;
  metodoPago?: string;
  fecha?: string | Date;
  items: TicketItem[];
  total: number;
  montoRecibido?: number;
  cambio?: number;
  paperWidth?: '58mm' | '80mm';
  nombreNegocio?: string;
}

@Injectable({ providedIn: 'root' })
export class TicketPrintService {
  private barcodeSvc = inject(BarcodeGeneratorService);

  imprimirTicket(venta: VentaTicket, nombreNegocio = 'INVENTCONTROL - POS', paperWidth: '58mm' | '80mm' = '80mm'): void {
    const folio = venta.folio || (venta.id ? `TICK-${String(venta.id).padStart(6, '0')}` : `TICK-${Date.now().toString().slice(-6)}`);
    const cantidad = venta.cantidad || 1;
    const precioUnitario = venta.total / cantidad;

    this.imprimirTicketPOS({
      folio,
      cliente: venta.cliente,
      metodoPago: venta.metodoPago || 'Efectivo',
      fecha: venta.fecha,
      total: venta.total,
      paperWidth,
      nombreNegocio,
      items: [
        {
          nombre: venta.producto,
          cantidad,
          precioUnitario,
          subtotal: venta.total,
        }
      ]
    });
  }

  imprimirTicketPOS(data: PosTicketData): void {
    const nombreNegocio = data.nombreNegocio || 'INVENTCONTROL POS';
    const paperWidth = data.paperWidth || '80mm';
    const bodyWidth = paperWidth === '58mm' ? '54mm' : '78mm';
    const fontSize = paperWidth === '58mm' ? '11px' : '12px';

    const fechaFmt = new Date(data.fecha || Date.now()).toLocaleString('es-ES', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const qrImg = this.barcodeSvc.generateQrDataUrl(data.folio, 80);
    const barcodeImg = this.barcodeSvc.generateBarcodeDataUrl(data.folio, 260, 55);

    const rowsHtml = data.items.map(item => `
      <tr>
        <td style="padding: 3px 0;">${item.cantidad}x ${item.nombre}</td>
        <td style="text-align: right; padding: 3px 0;">$${item.precioUnitario.toFixed(2)}</td>
        <td style="text-align: right; padding: 3px 0;">$${item.subtotal.toFixed(2)}</td>
      </tr>
    `).join('');

    const win = window.open('', '_blank', 'width=450,height=700');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket POS - ${data.folio}</title>
        <style>
          @page {
            size: ${paperWidth} auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            margin: 0;
            padding: 8px;
            width: ${bodyWidth};
            background: #ffffff;
            color: #000000;
            font-size: ${fontSize};
          }
          .ticket-container {
            text-align: center;
          }
          .header-title {
            font-size: 15px;
            font-weight: bold;
            text-transform: uppercase;
            margin-bottom: 2px;
          }
          .sub-header {
            font-size: 10px;
            margin-bottom: 6px;
            border-bottom: 1px dashed #000;
            padding-bottom: 4px;
          }
          .info-table {
            width: 100%;
            text-align: left;
            margin-bottom: 6px;
            font-size: 10px;
          }
          .info-table td {
            padding: 1px 0;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            border-top: 1px dashed #000;
            border-bottom: 1px dashed #000;
            margin: 6px 0;
            font-size: 10px;
          }
          .items-table th {
            text-align: left;
            padding: 4px 0;
            border-bottom: 1px solid #000;
          }
          .total-section {
            border-top: 1px dashed #000;
            padding-top: 4px;
            margin-top: 4px;
            text-align: right;
            font-size: 13px;
            font-weight: bold;
          }
          .footer-section {
            margin-top: 12px;
            border-top: 1px dashed #000;
            padding-top: 8px;
            text-align: center;
          }
          .qr-img {
            width: 75px;
            height: 75px;
            margin-top: 4px;
          }
          .barcode-img {
            max-width: 90%;
            height: auto;
            margin-top: 4px;
          }
          @media print {
            body { padding: 2px; }
          }
        </style>
      </head>
      <body>
        <div class="ticket-container">
          <div class="header-title">${nombreNegocio}</div>
          <div class="sub-header">COMPROBANTE INTERNO DE VENTA (POS)</div>

          <table class="info-table">
            <tr>
              <td><strong>FOLIO:</strong> ${data.folio}</td>
              <td style="text-align: right;"><strong>PAGO:</strong> ${data.metodoPago || 'Efectivo'}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>FECHA:</strong> ${fechaFmt}</td>
            </tr>
            <tr>
              <td colspan="2"><strong>CLIENTE:</strong> ${data.cliente}</td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th>CANT / DESCRIPCIÓN</th>
                <th style="text-align: right;">PRECIO</th>
                <th style="text-align: right;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="total-section">
            <div>TOTAL COBRADO: $${data.total.toFixed(2)}</div>
            ${data.montoRecibido !== undefined && data.montoRecibido !== null && data.montoRecibido > 0 ? `
              <div style="font-size: 10px; font-weight: normal; margin-top: 2px;">RECIBIDO: $${data.montoRecibido.toFixed(2)}</div>
              <div style="font-size: 11px; margin-top: 1px;">CAMBIO: $${(data.cambio || 0).toFixed(2)}</div>
            ` : ''}
          </div>

          <div class="footer-section">
            <div>¡Gracias por su compra!</div>
            <img class="qr-img" src="${qrImg}" alt="QR Ticket" />
            <br/>
            <img class="barcode-img" src="${barcodeImg}" alt="Barcode Ticket" />
            <div style="font-size: 9px; margin-top: 4px;">Conserve este ticket como comprobante de entrega</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 250);
          };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  }
}
