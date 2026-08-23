import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

/**
 * Diálogo flotante de confirmación reutilizable (overlay oscuro + tarjeta
 * centrada). Pensado sobre todo para acciones destructivas ("¿Eliminar X?"),
 * pero sirve para cualquier confirmación con dos botones.
 *
 * El mensaje se pasa por content projection para poder incluir <strong>,
 * saltos de línea o una nota de advertencia adicional tal como lo hacía
 * cada página antes de que este diálogo se compartiera:
 *
 *   @if (proveedorEliminar()) {
 *     <app-confirm-dialog
 *       titulo="¿Eliminar proveedor?"
 *       [cargando]="eliminando()"
 *       (cancelar)="cancelarEliminar()"
 *       (confirmar)="confirmarEliminar()">
 *       Estás a punto de eliminar <strong>{{ proveedorEliminar()!.nombre }}</strong>.
 *     </app-confirm-dialog>
 *   }
 */
@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './confirm-dialog.html',
  styleUrl: './confirm-dialog.css',
})
export class ConfirmDialog {
  // ── Contenido ────────────────────────────────────────────────
  titulo         = input.required<string>();
  icono          = input('delete_forever');
  iconoConfirmar = input('delete');
  textoCancelar  = input('Cancelar');
  textoConfirmar = input('Sí, eliminar');
  textoCargando  = input('Eliminando…');

  // ── Estado ───────────────────────────────────────────────────
  /** Deshabilita el botón de confirmar y muestra el spinner. */
  cargando = input(false);

  // ── Eventos ──────────────────────────────────────────────────
  cancelar  = output<void>();
  confirmar = output<void>();
}
