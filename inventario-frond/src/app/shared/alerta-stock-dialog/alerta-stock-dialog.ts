import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { Producto } from '../../core/services/productos.service';

/**
 * Modal que se muestra una sola vez justo después de iniciar sesión cuando
 * hay productos agotados o con stock bajo. Si no hay ninguno, App nunca la
 * abre (ver `_chequearAlertaDeLogin` en app.ts), así que este componente no
 * necesita manejar el caso "sin novedades".
 */
@Component({
  selector: 'app-alerta-stock-dialog',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './alerta-stock-dialog.html',
  styleUrl: './alerta-stock-dialog.css',
})
export class AlertaStockDialog {
  productos = input.required<Producto[]>();

  cerrar = output<void>();
  verProductos = output<void>();

  agotados(): Producto[] {
    return this.productos().filter(p => p.stock === 0);
  }

  bajos(): Producto[] {
    return this.productos().filter(p => p.stock > 0);
  }
}
