import { Component, OnInit, inject, signal, computed, HostListener } from '@angular/core';
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

import { AuthService } from '../../core/services/auth.service';
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
  private authService = inject(AuthService);
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

  // Pago con QR / Transferencia (Imágenes separadas y sincronizadas con el Backend)
  qrPagoImagen = signal<string | null>(
    this.authService.currentUser()?.qrPagoImagen || localStorage.getItem('invencontrol-qr-pago')
  );
  transferenciaImagen = signal<string | null>(
    this.authService.currentUser()?.transferenciaImagen || localStorage.getItem('invencontrol-transferencia-pago')
  );
  referenciaPago = signal<string>('');

  imagenMetodoActual = computed(() => {
    if (this.metodoPago === 'Pago por QR') return this.qrPagoImagen();
    if (this.metodoPago === 'Transferencia Bancaria' || this.metodoPago === 'Transferencia') return this.transferenciaImagen();
    return null;
  });

  tituloMetodoActual = computed(() => {
    return this.metodoPago === 'Pago por QR' ? 'Pago con Código QR' : 'Pago por Transferencia Bancaria';
  });

  subtituloMetodoActual = computed(() => {
    return this.metodoPago === 'Pago por QR'
      ? 'Muestra este código QR al cliente para recibir el pago'
      : 'Muestra la foto de tus datos de cuenta bancaria al cliente para la transferencia';
  });

  iconoMetodoActual = computed(() => {
    return this.metodoPago === 'Pago por QR' ? 'qr_code_2' : 'account_balance';
  });

  // Escaneo directo de código
  codigoDirectoInput = signal('');

  // Calculadora de Vuelto / Cambio en Efectivo
  dineroRecibido = signal<number | null>(null);

  // Carrito de compras
  cart = signal<CartItem[]>([]);
  procesandoCobro = signal(false);

  // Modal de confirmación tras finalizar la venta
  ultimaVentaExitosa = signal<PosCheckoutResponse | null>(null);
  ultimoMontoRecibido = signal<number | null>(null);
  ultimoVuelto = signal<number>(0);

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

  // Vuelto computado a entregar
  vuelto = computed(() => {
    const rec = this.dineroRecibido();
    const total = this.totalVenta();
    if (rec === null || rec === undefined || isNaN(rec) || rec <= 0) return 0;
    return Math.max(0, Math.round((rec - total) * 100) / 100);
  });

  // Faltante computado en caso de monto insuficiente
  faltante = computed(() => {
    const rec = this.dineroRecibido();
    const total = this.totalVenta();
    if (rec === null || rec === undefined || isNaN(rec) || rec <= 0) return 0;
    return Math.max(0, Math.round((total - rec) * 100) / 100);
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

  // ── Escaneo Rápido Directo ("de una") ──────────────────────
  procesarCodigoDirecto(): void {
    const code = this.codigoDirectoInput().trim();
    if (!code) return;
    this.procesarEscaneoCodigo(code);
    this.codigoDirectoInput.set('');

    // Reenfocar automáticamente para seguir escaneando sin usar el mouse
    setTimeout(() => {
      const el = document.getElementById('input-codigo-directo') as HTMLInputElement;
      if (el) el.focus();
    }, 60);
  }

  fijarDineroRecibido(monto: number): void {
    this.dineroRecibido.set(monto);
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
    this.dineroRecibido.set(null);
  }

  // ── Escáner de Código de Barras Modal ──────────────────────
  abrirEscaner(): void {
    const ref = this.dialog.open(BarcodeScannerModalDialog, { width: '92vw', maxWidth: '460px' });
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

    // Validación de Dinero Recibido si es pago en Efectivo
    if (this.metodoPago === 'Efectivo' && this.dineroRecibido() !== null && this.dineroRecibido()! > 0) {
      if (this.dineroRecibido()! < this.totalVenta()) {
        this.snack.open(`✕ El dinero recibido ($${this.dineroRecibido()!.toFixed(2)}) es menor al total. Faltan $${this.faltante().toFixed(2)}`, 'Entendido', {
          duration: 4000,
          panelClass: ['snack-error'],
        });
        return;
      }
    }

    if (this.procesandoCobro()) return; // Protección contra doble clic
    this.procesandoCobro.set(true);

    const rec = this.metodoPago === 'Efectivo' ? (this.dineroRecibido() || this.totalVenta()) : null;
    const vue = this.metodoPago === 'Efectivo' ? this.vuelto() : 0;
    this.ultimoMontoRecibido.set(rec);
    this.ultimoVuelto.set(vue);

    const ref = this.referenciaPago().trim();
    const metodoFinal = ref ? `${this.metodoPago} (Ref: ${ref})` : this.metodoPago;

    const payload = {
      cliente: this.clienteNombre || 'Cliente Mostrador',
      metodoPago: metodoFinal,
      items: this.cart().map(item => ({
        productoId: item.producto.id,
        cantidad: item.cantidad,
      })),
    };

    this.ventasSvc.createPosBatch(payload).subscribe({
      next: (response) => {
        this.procesandoCobro.set(false);
        this.ultimaVentaExitosa.set(response);

        // Prevenir que el botón atrás de Android cierre la app al ver el ticket
        try { window.history.pushState({ posModal: true }, ''); } catch {}

        // Imprimir ticket automáticamente con vuelto y dinero recibido
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
      montoRecibido: this.ultimoMontoRecibido() || undefined,
      cambio: this.ultimoVuelto(),
      paperWidth: this.anchoPapel,
      nombreNegocio: 'INVENTCONTROL - POS',
    });
  }

  cerrarModalExito(): void {
    this.ultimaVentaExitosa.set(null);
    this.ultimoMontoRecibido.set(null);
    this.ultimoVuelto.set(0);
    this.referenciaPago.set('');
  }

  @HostListener('window:popstate')
  onPopState(): void {
    if (this.ultimaVentaExitosa()) {
      this.cerrarModalExito();
    }
  }

  // ── Gestión de Imágenes por Método (QR vs Transferencia Bancaria) ─────────
  triggerFileInput(): void {
    const el = document.getElementById('input-qr-file-hidden') as HTMLInputElement;
    if (el) el.click();
  }

  onQrImagenChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
      this.snack.open('La imagen no puede superar 4 MB', 'OK', { duration: 3500, panelClass: ['snack-error'] });
      input.value = '';
      return;
    }

    const isQr = this.metodoPago === 'Pago por QR';
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (isQr) {
        this.qrPagoImagen.set(result);
        try { localStorage.setItem('invencontrol-qr-pago', result); } catch {}
        this.authService.actualizarPerfilNegocio({ qrPagoImagen: result }).subscribe();
        this.snack.open('✓ Imagen de Código QR guardada y sincronizada', 'OK', { duration: 3000 });
      } else {
        this.transferenciaImagen.set(result);
        try { localStorage.setItem('invencontrol-transferencia-pago', result); } catch {}
        this.authService.actualizarPerfilNegocio({ transferenciaImagen: result }).subscribe();
        this.snack.open('✓ Imagen de Datos de Cuenta / Transferencia guardada y sincronizada', 'OK', { duration: 3000 });
      }
    };
    reader.readAsDataURL(file);
  }

  eliminarQrImagen(): void {
    if (this.metodoPago === 'Pago por QR') {
      this.qrPagoImagen.set(null);
      try { localStorage.removeItem('invencontrol-qr-pago'); } catch {}
      this.authService.actualizarPerfilNegocio({ qrPagoImagen: null }).subscribe();
      this.snack.open('Imagen de Código QR eliminada', 'OK', { duration: 2500 });
    } else {
      this.transferenciaImagen.set(null);
      try { localStorage.removeItem('invencontrol-transferencia-pago'); } catch {}
      this.authService.actualizarPerfilNegocio({ transferenciaImagen: null }).subscribe();
      this.snack.open('Imagen de Transferencia Bancaria eliminada', 'OK', { duration: 2500 });
    }
  }

  getInitials(nombre: string): string {
    return nombre ? nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase() : 'P';
  }
}
