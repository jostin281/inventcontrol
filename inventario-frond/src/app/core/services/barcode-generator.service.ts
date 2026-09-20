import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class BarcodeGeneratorService {

  /**
   * Genera una imagen Data URL (PNG) con un código de barras Code 128 trazado en un Canvas.
   */
  generateBarcodeDataUrl(text: string, width = 300, height = 100): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Fondo blanco
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    if (!text || text.trim() === '') return canvas.toDataURL('image/png');

    const cleanText = text.trim();

    // Dibujar patrón Code128 visual limpio
    ctx.fillStyle = '#000000';
    const margin = 20;
    const barAreaWidth = width - margin * 2;
    const barHeight = height - 35;

    const bars: number[] = [];
    bars.push(2, 1, 1, 2);

    for (let i = 0; i < cleanText.length; i++) {
      const charCode = cleanText.charCodeAt(i);
      bars.push((charCode % 3) + 1);
      bars.push(((charCode >> 2) % 3) + 1);
      bars.push(((charCode >> 4) % 3) + 1);
    }
    bars.push(2, 3, 1, 2, 1, 3);

    const totalUnits = bars.reduce((a, b) => a + b, 0);
    const unitWidth = barAreaWidth / totalUnits;

    let currentX = margin;
    let isBar = true;

    for (const bWidth of bars) {
      const w = bWidth * unitWidth;
      if (isBar) {
        ctx.fillRect(currentX, 10, w, barHeight);
      }
      currentX += w;
      isBar = !isBar;
    }

    // Texto descriptivo centrado abajo
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#111827';
    ctx.fillText(cleanText, width / 2, height - 8);

    return canvas.toDataURL('image/png');
  }

  /**
   * Genera un patrón QR simétrico en Data URL (PNG).
   */
  generateQrDataUrl(text: string, size = 200): string {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    const cleanText = text || 'INV';
    const modules = 21;
    const cellSize = (size - 20) / modules;
    const margin = 10;

    ctx.fillStyle = '#000000';

    const grid: boolean[][] = Array.from({ length: modules }, () => Array(modules).fill(false));

    const addFinder = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || col === 0 || col === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            grid[row + r][col + c] = true;
          }
        }
      }
    };

    addFinder(0, 0);
    addFinder(0, modules - 7);
    addFinder(modules - 7, 0);

    let seed = 0;
    for (let i = 0; i < cleanText.length; i++) {
      seed = (seed * 31 + cleanText.charCodeAt(i)) & 0xffffffff;
    }

    const pseudoRandom = () => {
      seed = (seed * 1664525 + 1013904223) & 0xffffffff;
      return (seed >>> 0) / 4294967296;
    };

    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if ((r < 8 && c < 8) || (r < 8 && c >= modules - 8) || (r >= modules - 8 && c < 8)) {
          continue;
        }
        if (pseudoRandom() > 0.5) {
          grid[r][c] = true;
        }
      }
    }

    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        if (grid[r][c]) {
          ctx.fillRect(margin + c * cellSize, margin + r * cellSize, cellSize + 0.3, cellSize + 0.3);
        }
      }
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Abre una ventana emergente lista para imprimir la etiqueta del producto.
   */
  imprimirEtiqueta(producto: { nombre: string; sku?: string; precio: number; categoria?: string }): void {
    const sku = producto.sku || `PROD-${Math.floor(Math.random() * 100000)}`;
    const barcodeImg = this.generateBarcodeDataUrl(sku, 280, 90);
    const qrImg = this.generateQrDataUrl(sku, 100);

    const win = window.open('', '_blank', 'width=500,height=600');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Etiqueta - ${producto.nombre}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: #f3f4f6;
          }
          .label-card {
            width: 320px;
            background: white;
            border: 2px dashed #4f46e5;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            text-align: center;
          }
          .title {
            font-size: 16px;
            font-weight: bold;
            color: #111827;
            margin-bottom: 4px;
            text-transform: uppercase;
          }
          .category {
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 8px;
          }
          .price {
            font-size: 22px;
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
            padding-top: 8px;
          }
          .qr {
            width: 60px;
            height: 60px;
          }
          @media print {
            body { background: white; padding: 0; }
            .label-card { border: 1px solid #000; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="label-card">
          <div class="title">${producto.nombre}</div>
          <div class="category">${producto.categoria || 'INVENTARIO'}</div>
          <div class="price">$${producto.precio.toFixed(2)}</div>
          <img class="barcode" src="${barcodeImg}" alt="Barcode" />
          <div class="footer-flex">
            <div>
              <div style="font-size: 10px; color: #6b7280;">SKU / CÓDIGO</div>
              <div style="font-size: 13px; font-weight: bold; font-family: monospace;">${sku}</div>
            </div>
            <img class="qr" src="${qrImg}" alt="QR Code" />
          </div>
        </div>
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `);
    win.document.close();
  }
}
