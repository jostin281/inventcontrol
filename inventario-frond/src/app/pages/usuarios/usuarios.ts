import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { NuevoUsuarioDialog } from './nuevo-usuario-dialog';
import { UsuariosService, UsuarioBackend } from '../../core/services/usuarios.service';
import { ConfirmDialog } from '../../shared/confirm-dialog/confirm-dialog';

export interface UsuarioResumen {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  estado: string;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatTableModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatTooltipModule, MatDialogModule,
    MatProgressSpinnerModule, ConfirmDialog,
  ],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class Usuarios implements OnInit {
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  private usuariosSvc = inject(UsuariosService);
  private snack = inject(MatSnackBar);

  columnas = ['nombre', 'rol', 'estado', 'acciones'];
  roles = ['Administrador', 'Operador'];

  filtroStr = signal('');
  isLoading = signal(true);

  readonly usuarios = computed<UsuarioResumen[]>(() =>
    this.usuariosSvc.usuarios().map(u => ({
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      rol: u.rol === 'admin' ? 'Administrador' : 'Operador',
      estado: u.activo ? 'Activo' : 'Inactivo',
    }))
  );

  readonly usuariosFiltrados = computed<UsuarioResumen[]>(() => {
    const t = this.filtroStr().toLowerCase().trim();
    const list = this.usuarios();
    if (!t) return list;
    return list.filter(u =>
      u.nombre.toLowerCase().includes(t) ||
      u.correo.toLowerCase().includes(t) ||
      u.rol.toLowerCase().includes(t)
    );
  });

  ngOnInit(): void {
    this.usuariosSvc.cargar().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  // ── Signals estilo Productos ──────────────────────────────
  usuarioViendo    = signal<UsuarioResumen | null>(null);
  usuarioEditando  = signal<UsuarioResumen | null>(null);
  usuarioEliminar  = signal<UsuarioResumen | null>(null);
  eliminando       = signal(false);

  // ── Mensajes de error ─────────────────────────────────────
  mostrarCambioPassword = signal(false);
  mostrarNuevoPass      = signal(false);
  mostrarConfirmPass    = signal(false);
  errorPassword         = signal('');
  errorEdicion          = signal('');
  errorEliminar         = signal('');

  editForm = this.fb.group({
    nombre:          ['', [Validators.required, Validators.minLength(2)]],
    correo:          ['', [Validators.required, Validators.email]],
    rol:             ['Operador', Validators.required],
    estado:          ['Activo', Validators.required],
    nuevaPassword:   [''],
    confirmarPassword: [''],
  });

  // ── Abrir dialogs ─────────────────────────────────────────
  abrirNuevoUsuario(): void {
    const ref = this.dialog.open(NuevoUsuarioDialog, {
      width: '560px',
      panelClass: 'fp-dialog'
    });
    ref.afterClosed().subscribe((res: any) => {
      if (!res) return;
      this.usuariosSvc.create({
        nombre: res.nombre,
        correo: res.correo,
        contrasena: res.contrasena,
        rol: res.rol === 'Administrador' ? 'admin' : 'usuario',
        activo: res.estado === 'Activo',
      }).subscribe({
        next: () => {
          this.usuariosSvc.cargar().subscribe();
          this.snack.open('✓ Usuario creado correctamente', 'OK', { duration: 3000 });
        },
        error: (err) => {
          const msg = err.error?.message || 'Error al crear el usuario';
          this.snack.open(`✕ ${msg}`, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] });
        }
      });
    });
  }

  // ── Ver detalle ───────────────────────────────────────────
  abrirDetalle(u: UsuarioResumen): void  { this.usuarioViendo.set(u); }
  cerrarDetalle(): void                  { this.usuarioViendo.set(null); }

  // ── Editar (panel lateral) ────────────────────────────────
  abrirEditar(u: UsuarioResumen): void {
    this.editForm.reset({
      nombre: u.nombre,
      correo: u.correo,
      rol: u.rol,
      estado: u.estado,
      nuevaPassword: '',
      confirmarPassword: ''
    });
    this.mostrarCambioPassword.set(false);
    this.mostrarNuevoPass.set(false);
    this.mostrarConfirmPass.set(false);
    this.errorPassword.set('');
    this.errorEdicion.set('');
    this.usuarioEditando.set(u);
  }

  cerrarEditar(): void {
    this.errorPassword.set('');
    this.errorEdicion.set('');
    this.usuarioEditando.set(null);
  }

  toggleCambioPassword(): void {
    this.mostrarCambioPassword.update(v => !v);
    if (!this.mostrarCambioPassword()) {
      this.editForm.patchValue({ nuevaPassword: '', confirmarPassword: '' });
      this.errorPassword.set('');
    }
  }

  toggleVerNuevoPass(): void   { this.mostrarNuevoPass.update(v => !v); }
  toggleVerConfirmPass(): void { this.mostrarConfirmPass.update(v => !v); }

  guardarEdicion(): void {
    this.errorEdicion.set('');
    this.errorPassword.set('');
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      this.errorEdicion.set('Por favor completa los campos obligatorios correctamente.');
      return;
    }
    const editando = this.usuarioEditando();
    if (!editando) return;

    const v = this.editForm.value as {
      nombre?: string; correo?: string; rol?: string; estado?: string;
      nuevaPassword?: string; confirmarPassword?: string;
    };

    const updatePayload: any = {
      nombre: v.nombre,
      correo: v.correo,
      rol: v.rol === 'Administrador' ? 'admin' : 'usuario',
      activo: v.estado === 'Activo',
    };

    // Validar contraseñas si se quiere cambiar
    if (this.mostrarCambioPassword()) {
      const np = (v.nuevaPassword ?? '').trim();
      const cp = (v.confirmarPassword ?? '').trim();
      if (!np) { this.errorPassword.set('La nueva contraseña no puede estar vacía.'); return; }
      if (np.length < 6) { this.errorPassword.set('La contraseña debe tener al menos 6 caracteres.'); return; }
      if (np !== cp) { this.errorPassword.set('Las contraseñas no coinciden.'); return; }
      this.errorPassword.set('');
      updatePayload.contrasena = np;
    }

    this.usuariosSvc.update(editando.id, updatePayload).subscribe({
      next: () => {
        this.usuariosSvc.cargar().subscribe();
        this.snack.open('✓ Usuario actualizado correctamente', 'OK', { duration: 3000 });
        this.cerrarEditar();
      },
      error: (err) => this.errorEdicion.set(err.error?.message || 'Error al actualizar usuario')
    });
  }

  // ── Eliminar ──────────────────────────────────────────────
  abrirConfirmarEliminar(u: UsuarioResumen): void {
    this.errorEliminar.set('');
    this.usuarioEliminar.set(u);
  }
  cancelarEliminar(): void {
    this.errorEliminar.set('');
    this.usuarioEliminar.set(null);
  }

  confirmarEliminar(): void {
    const u = this.usuarioEliminar();
    if (!u) return;
    this.eliminando.set(true);
    this.errorEliminar.set('');
    this.usuariosSvc.delete(u.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.usuariosSvc.cargar().subscribe();
        this.usuarioEliminar.set(null);
        this.errorEliminar.set('');
        this.snack.open('✓ Usuario eliminado correctamente', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.eliminando.set(false);
        const msg = err.error?.message || 'Error al eliminar usuario';
        this.errorEliminar.set(msg);
        this.snack.open(`✕ ${msg}`, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] });
      }
    });
  }
}
