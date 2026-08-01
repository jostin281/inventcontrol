import { Component, signal, inject, OnInit } from '@angular/core';
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
import { NuevoUsuarioDialog } from './nuevo-usuario-dialog';
import { UsuariosService, UsuarioBackend } from '../../core/services/usuarios.service';

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
    MatProgressSpinnerModule
  ],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.css'
})
export class Usuarios implements OnInit {
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);
  private usuariosSvc = inject(UsuariosService);

  columnas = ['nombre', 'rol', 'estado', 'acciones'];
  roles = ['admin', 'usuario'];

  filtroStr = '';
  isLoading = signal(true);

  ngOnInit(): void {
    this.usuariosSvc.cargar().subscribe({
      next: () => this.isLoading.set(false),
      error: () => this.isLoading.set(false)
    });
  }

  get usuarios(): UsuarioResumen[] {
    return this.usuariosSvc.usuarios().map(u => ({
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      rol: u.rol === 'admin' ? 'Administrador' : 'Operador',
      estado: u.activo ? 'Activo' : 'Inactivo',
    }));
  }

  get usuariosFiltrados(): UsuarioResumen[] {
    const t = this.filtroStr.toLowerCase();
    if (!t) return this.usuarios;
    return this.usuarios.filter(u =>
      u.nombre.toLowerCase().includes(t) ||
      u.correo.toLowerCase().includes(t) ||
      u.rol.toLowerCase().includes(t)
    );
  }

  // ── Signals estilo Productos ──────────────────────────────
  usuarioViendo    = signal<UsuarioResumen | null>(null);
  usuarioEditando  = signal<UsuarioResumen | null>(null);
  usuarioEliminar  = signal<UsuarioResumen | null>(null);
  eliminando       = signal(false);

  // ── Cambio de contraseña ──────────────────────────────────
  mostrarCambioPassword = signal(false);
  mostrarNuevoPass      = signal(false);
  mostrarConfirmPass    = signal(false);
  errorPassword         = signal('');

  editForm = this.fb.group({
    nombre:          ['', [Validators.required, Validators.minLength(2)]],
    correo:          ['', [Validators.required, Validators.email]],
    rol:             ['', Validators.required],
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
        contrasena: res.contrasena || '12345678',
        rol: res.rol === 'Administrador' ? 'admin' : 'usuario',
      }).subscribe();
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
      rol: u.rol === 'Administrador' ? 'admin' : 'usuario',
      estado: u.estado,
      nuevaPassword: '',
      confirmarPassword: ''
    });
    this.mostrarCambioPassword.set(false);
    this.mostrarNuevoPass.set(false);
    this.mostrarConfirmPass.set(false);
    this.errorPassword.set('');
    this.usuarioEditando.set(u);
  }

  cerrarEditar(): void {
    this.errorPassword.set('');
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
    if (this.editForm.invalid) { this.editForm.markAllAsTouched(); return; }
    const editando = this.usuarioEditando();
    if (!editando) return;

    const v = this.editForm.value as {
      nombre?: string; correo?: string; rol?: string; estado?: string;
      nuevaPassword?: string; confirmarPassword?: string;
    };

    const updatePayload: any = {
      nombre: v.nombre,
      correo: v.correo,
      rol: v.rol,
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
      next: () => this.cerrarEditar(),
      error: (err) => this.errorPassword.set(err.error?.message || 'Error al actualizar usuario')
    });
  }

  // ── Eliminar ──────────────────────────────────────────────
  abrirConfirmarEliminar(u: UsuarioResumen): void { this.usuarioEliminar.set(u); }
  cancelarEliminar(): void                        { this.usuarioEliminar.set(null); }

  confirmarEliminar(): void {
    const u = this.usuarioEliminar();
    if (!u) return;
    this.eliminando.set(true);
    this.usuariosSvc.delete(u.id).subscribe({
      next: () => {
        this.eliminando.set(false);
        this.usuarioEliminar.set(null);
      },
      error: () => this.eliminando.set(false)
    });
  }
}
