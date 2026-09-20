import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { ProductosService, Producto } from '../../core/services/productos.service';
import { CategoriasService } from '../../core/services/categorias.service';
import { VentasService, PosCheckoutResponse } from '../../core/services/ventas.service';
import { TicketPrintService, TicketItem } from '../../core/services/ticket-print.service';
import { BarcodeScannerModalDialog } from '../../shared/components/barcode-scanner-modal/barcode-scanner-modal';

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

@Component({
  selector: 'app-pos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDialogModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './pos.html',
  styleUrl: './pos.css',
})
export class PosComponent implements OnInit {
  private productosSvc = inject(ProductosService);
  private categoriasSvc = inject(CategoriasService);
  private ventasSvc = inject(VentasService);
  private ticketSvc = inject(TicketPrintService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  // Estados de datos
  isLoading = signal(true);
  busquedaStr = signal('');
  categoriaFiltro = signal('Todas');
  clienteNombre = 'Cliente Mostrador';
  metodoPago = 'Efectivo';
  anchoPapel: '58mm' | '80mm' = '80mm';

  // Carrito de compras
  cart = signal<CartItem[]>([]);
  procesandoCobro = signal(false);

  // Modal de confirmación tras finalizar la venta
  ultimaVentaExitosa = signal<PosCheckoutResponse | null>(null);

  // Listas computadas de catálogo
  categorias = computed(() => ['Todas', ...this.categoriasSvc.categorias().map(c => c.nombre)]);
  productosRaw = this.productosSvc.productos;

  productosFiltrados = computed(() => {
    const q = this.busquedaStr().toLowerCase().trim();
    const cat = this.categoriaFiltro();
    return this.productosRaw().filter(p => {
      const matchCat = cat === 'Todas' || p.categoria === cat;
      const matchQ =
        !q ||
        p.nombre.toLowerCase().includes(q) ||
        (p.sku ?? '').toLowerCase().includes(q) ||
        p.categoria.toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  });

  // Totales computados del carrito
  totalItemsCart = computed(() => this.cart().reduce((sum, item) => sum + item.cantidad, 0));

  totalVenta = computed(() => {
    return Math.round(this.cart().reduce((sum, item) => sum + item.producto.precio * item.cantidad, 0) * 100) / 100;
  });

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.isLoading.set(true);
    this.categoriasSvc.cargar().subscribe();
    this.productosSvc.cargar().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false),
    });
  }

  // ── Lógica del Carrito ─────────────────────────────────────
  agregarAlCarrito(prod: Producto, cantidad = 1): void {
    if (prod.stock <= 0) {
      this.snack.open(`El producto "${prod.nombre}" no tiene stock disponible`, 'Cerrar', {
        duration: 3500,
        panelClass: ['snack-error'],
      });
      return;
    }

    const currentCart = [...this.cart()];
    const index = currentCart.findIndex(item => item.producto.id === prod.id);

    if (index >= 0) {
      const nuevaCantidad = currentCart[index].cantidad + cantidad;
      if (nuevaCantidad > prod.stock) {
        this.snack.open(`No hay suficiente stock. Disponible: ${prod.stock}`, 'Cerrar', { duration: 3500 });
        return;
      }
      currentCart[index] = { ...currentCart[index], cantidad: nuevaCantidad };
    } else {
      currentCart.push({ producto: prod, cantidad });
    }

    this.cart.set(currentCart);
  }

  actualizarCantidad(prodId: number, cambio: number): void {
    const currentCart = [...this.cart()];
    const index = currentCart.findIndex(item => item.producto.id === prodId);
    if (index < 0) return;

    const nuevaCantidad = currentCart[index].cantidad + cambio;
    const stockMax = currentCart[index].producto.stock;

    if (nuevaCantidad <= 0) {
      this.eliminarDelCarrito(prodId);
      return;
    }

    if (nuevaCantidad > stockMax) {
      this.snack.open(`Stock máximo alcanzado (${stockMax} unidades)`, 'Cerrar', { duration: 3000 });
      return;
    }

    currentCart[index] = { ...currentCart[index], cantidad: nuevaCantidad };
    this.cart.set(currentCart);
  }

  cambiarCantidadDirecta(prodId: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    let nuevaCantidad = parseInt(input.value, 10);
    if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) nuevaCantidad = 1;

    const currentCart = [...this.cart()];
    const index = currentCart.findIndex(item => item.producto.id === prodId);
    if (index < 0) return;

    const stockMax = currentCart[index].producto.stock;
    if (nuevaCantidad > stockMax) {
      nuevaCantidad = stockMax;
      input.value = String(stockMax);
      this.snack.open(`Ajustado al stock máximo disponible (${stockMax})`, 'Cerrar', { duration: 3000 });
    }

    currentCart[index] = { ...currentCart[index], cantidad: nuevaCantidad };
    this.cart.set(currentCart);
  }

  eliminarDelCarrito(prodId: number): void {
    this.cart.set(this.cart().filter(item => item.producto.id !== prodId));
  }

  vaciarCarrito(): void {
    this.cart.set([]);
  }

  // ── Escáner de Código de Barras ────────────────────────────
  abrirEscaner(): void {
    const ref = this.dialog.open(BarcodeScannerModalDialog, { width: '480px' });
    ref.afterClosed().subscribe((codigo: string | null) => {
      if (codigo) {
        this.procesarEscaneoCodigo(codigo);
      }
    });
  }

  procesarEscaneoCodigo(codigo: string): void {
    const clean = codigo.trim().toLowerCase();
    const prod = this.productosRaw().find(
      p => (p.sku && p.sku.trim().toLowerCase() === clean) || String(p.id) === clean
    );

    if (prod) {
      this.agregarAlCarrito(prod, 1);
      this.snack.open(`✓ Agregado: ${prod.nombre}`, 'OK', { duration: 2500 });
    } else {
      this.snack.open(`✕ No se encontró ningún producto con el código "${codigo}"`, 'Entendido', {
        duration: 4000,
        panelClass: ['snack-error'],
      });
    }
  }

  // ── Finalizar y Cobrar Venta (Transacción Backend) ────────
  finalizarVenta(): void {
    if (this.cart().length === 0) {
      this.snack.open('El carrito está vacío', 'Cerrar', { duration: 3000 });
      return;
    }

    if (this.procesandoCobro()) return; // Protección contra doble clic
    this.procesandoCobro.set(true);

    const payload = {
      cliente: this.clienteNombre || 'Cliente Mostrador',
      metodoPago: this.metodoPago || 'Efectivo',
      items: this.cart().map(item => ({
        productoId: item.producto.id,
        cantidad: item.cantidad,
      })),
    };

    this.ventasSvc.createPosBatch(payload).subscribe({
      next: (response) => {
        this.procesandoCobro.set(false);
        this.ultimaVentaExitosa.set(response);

        // Imprimir ticket automáticamente
        this.imprimirTicketRespuesta(response);

        // Refrescar inventario en toda la app
        this.productosSvc.cargar().subscribe();

        // Vaciar carrito
        this.vaciarCarrito();
      },
      error: (err) => {
        this.procesandoCobro.set(false);
        const msg = err?.error?.message || 'Error al procesar la venta en el servidor';
        this.snack.open(`✕ ${msg}`, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] });
      },
    });
  }

  imprimirTicketRespuesta(res: PosCheckoutResponse): void {
    const itemsTicket: TicketItem[] = this.cart().length > 0
      ? this.cart().map(i => ({
          nombre: i.producto.nombre,
          cantidad: i.cantidad,
          precioUnitario: i.producto.precio,
          subtotal: i.producto.precio * i.cantidad,
        }))
      : res.ventas.map(v => ({
          nombre: v.producto,
          cantidad: v.cantidad,
          precioUnitario: v.total / v.cantidad,
          subtotal: v.total,
        }));

    this.ticketSvc.imprimirTicketPOS({
      folio: res.folio,
      cliente: res.cliente,
      metodoPago: res.metodoPago,
      items: itemsTicket,
      total: res.total,
      paperWidth: this.anchoPapel,
      nombreNegocio: 'INVENTCONTROL - POS',
    });
  }

  cerrarModalExito(): void {
    this.ultimaVentaExitosa.set(null);
  }

  getInitials(nombre: string): string {
    return nombre ? nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : 'P';
  }
}
