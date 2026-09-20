import { Injectable } from '@angular/core';

const CODE128_PATTERNS: number[][] = [
  [2,1,2,2,2,2], [2,2,2,1,2,2], [2,2,2,2,2,1], [1,2,1,2,2,3], [1,2,1,3,2,2], [1,3,1,2,2,2],
  [1,2,2,2,1,3], [1,2,2,3,1,2], [1,3,2,2,1,2], [2,2,1,2,1,3], [2,2,1,3,1,2], [2,3,1,2,1,2],
  [1,1,2,2,3,2], [1,2,2,1,3,2], [1,2,2,2,3,1], [1,1,3,2,2,2], [1,2,3,1,2,2], [1,2,3,2,2,1],
  [2,2,3,2,1,1], [2,2,1,1,3,2], [2,2,1,2,3,1], [2,1,3,2,1,2], [2,2,3,1,1,2], [3,1,2,1,3,1],
  [3,1,1,2,2,2], [3,2,1,1,2,2], [3,2,1,2,2,1], [3,1,2,2,1,2], [3,2,2,1,1,2], [3,2,2,2,1,1],
  [2,1,2,1,2,3], [2,1,2,3,2,1], [2,3,2,1,2,1], [1,1,1,3,2,3], [1,3,1,1,2,3], [1,3,1,3,2,1],
  [1,1,2,3,1,3], [1,3,2,1,1,3], [1,3,2,3,1,1], [2,1,1,3,1,3], [2,3,1,1,1,3], [2,3,1,3,1,1],
  [1,1,2,1,3,3], [1,1,2,3,3,1], [1,3,2,1,3,1], [1,1,3,1,2,3], [1,1,3,3,2,1], [1,3,3,1,2,1],
  [3,1,3,1,2,1], [2,1,1,3,3,1], [2,3,1,1,3,1], [2,1,3,1,1,3], [2,1,3,3,1,1], [2,1,3,1,3,1],
  [3,1,1,1,2,3], [3,1,1,3,2,1], [3,3,1,1,2,1], [3,1,2,1,1,3], [3,1,2,3,1,1], [3,3,2,1,1,1],
  [3,1,4,1,1,1], [2,2,1,4,1,1], [4,3,1,1,1,1], [1,1,1,2,2,4], [1,1,1,4,2,2], [1,2,1,1,2,4],
  [1,2,1,4,2,1], [1,4,1,1,2,2], [1,4,1,2,2,1], [1,1,2,2,1,4], [1,1,2,4,1,2], [1,2,2,1,1,4],
  [1,2,2,4,1,1], [1,4,2,1,1,2], [1,4,2,2,1,1], [2,4,1,2,1,1], [2,2,1,1,1,4], [4,1,3,1,1,1],
  [2,4,1,1,1,2], [1,3,4,1,1,1], [1,1,1,2,4,2], [1,2,1,1,4,2], [1,2,1,2,4,1], [1,1,4,2,1,2],
  [1,2,4,1,1,2], [1,2,4,2,1,1], [4,1,1,2,1,2], [4,2,1,1,1,2], [4,2,1,2,1,1], [2,1,2,1,4,1],
  [2,1,4,1,2,1], [4,1,2,1,2,1], [1,1,1,1,4,3], [1,1,1,3,4,1], [1,3,1,1,4,1], [1,1,4,1,1,3],
  [1,1,4,3,1,1], [4,1,1,1,1,3], [4,1,1,3,1,1], [1,1,3,1,4,1], [1,1,4,1,3,1], [3,1,1,1,4,1],
  [4,1,1,1,3,1], // 102
  [2,1,1,4,1,2], // 103 (Start A)
  [2,1,1,2,1,4], // 104 (Start B)
  [2,1,1,2,3,2], // 105 (Start C)
  [2,3,3,1,1,1,2] // 106 (Stop)
];

@Injectable({ providedIn: 'root' })
export class BarcodeGeneratorService {

  /**
   * Genera una imagen Data URL (PNG) con un código de barras Code 128 100% estándar e ISO escaneable.
   */
  generateBarcodeDataUrl(text: string, width = 340, height = 110): string {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    const cleanText = (text || '').trim();
    if (!cleanText) return canvas.toDataURL('image/png');

    // Codificación estándar Code 128 B
    const symbols: number[] = [104]; // Start B
    let checkSum = 104;

    for (let i = 0; i < cleanText.length; i++) {
      const code = Math.max(0, Math.min(94, cleanText.charCodeAt(i) - 32));
      symbols.push(code);
      checkSum += (i + 1) * code;
    }

    const checkSymbol = checkSum % 103;
    symbols.push(checkSymbol);
    symbols.push(106); // Stop

    const totalModules = (symbols.length - 1) * 11 + 13;
    const quietZone = 20;
    const barAreaWidth = width - quietZone * 2;
    const moduleWidth = barAreaWidth / totalModules;
    const barHeight = height - 34;

    let currentX = quietZone;
    ctx.fillStyle = '#000000';

    for (let sIdx = 0; sIdx < symbols.length; sIdx++) {
      const sCode = symbols[sIdx];
      const pattern = CODE128_PATTERNS[sCode];
      if (!pattern) continue;

      let isBar = true;
      for (let p = 0; p < pattern.length; p++) {
        const w = pattern[p] * moduleWidth;
        if (isBar) {
          ctx.fillRect(currentX, 10, w, barHeight);
        }
        currentX += w;
        isBar = !isBar;
      }
    }

    // Texto descriptivo abajo
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#111827';
    ctx.fillText(cleanText, width / 2, height - 6);

    return canvas.toDataURL('image/png');
  }

  /**
   * Genera un Código QR 100% válido y escaneable.
   */
  generateQrDataUrl(text: string, size = 200): string {
    const cleanText = encodeURIComponent((text || 'INV').trim());
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${cleanText}`;
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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            background: #f3f4f6;
            box-sizing: border-box;
          }
          .nav-bar {
            position: sticky;
            top: 0;
            left: 0;
            right: 0;
            width: 100%;
            max-width: 360px;
            background: #0f172a;
            color: #ffffff;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.25);
            z-index: 99999;
            margin-bottom: 14px;
            border-radius: 8px;
            box-sizing: border-box;
          }
          .btn-nav-close {
            background: #334155;
            color: #ffffff;
            border: 1px solid #64748b;
            padding: 8px 14px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-family: sans-serif;
          }
          .btn-nav-print {
            background: #2563eb;
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-family: sans-serif;
          }
          .label-card {
            width: 320px;
            background: white;
            border: 2px dashed #4f46e5;
            border-radius: 12px;
            padding: 16px;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            text-align: center;
            box-sizing: border-box;
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
            .no-print { display: none !important; }
            body { background: white; padding: 0; }
            .label-card { border: 1px solid #000; box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="nav-bar no-print">
          <button class="btn-nav-close" onclick="window.close(); if(!window.closed){ history.back(); }">
            ← Volver Atrás
          </button>
          <button class="btn-nav-print" onclick="window.print()">
            🖨️ Imprimir
          </button>
        </div>

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

        <div class="no-print" style="margin-top: 16px; width: 100%; max-width: 320px;">
          <button class="btn-nav-close" style="width: 100%; justify-content: center; padding: 10px; background: #0f172a; color: white;" onclick="window.close(); if(!window.closed){ history.back(); }">
            ← Volver a Productos
          </button>
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
