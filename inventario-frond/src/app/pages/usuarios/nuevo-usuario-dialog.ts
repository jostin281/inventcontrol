import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export interface NuevoUsuarioData {
  usuario?: any;
  readonly?: boolean;
}

@Component({
  selector: 'app-nuevo-usuario-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatButtonModule, MatIconModule, MatSlideToggleModule,
  ],
  templateUrl: './nuevo-usuario-dialog.html',
  styleUrl: './nuevo-usuario-dialog.css'
})
export class NuevoUsuarioDialog {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<NuevoUsuarioDialog>);
  readonly data = inject(MAT_DIALOG_DATA) as NuevoUsuarioData | undefined;

  roles = ['Administrador', 'Operador'];
  errorPassword = signal('');

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    correo: ['', [Validators.required, Validators.email]],
    rol: ['Operador', Validators.required],
    estado: ['Activo', Validators.required],
    password: [''],
    confirmPassword: [''],
  });

  constructor() {
    if (this.data?.usuario) {
      const u = this.data.usuario;
      this.form.patchValue({ nombre: u.nombre, correo: u.correo, rol: u.rol, estado: u.estado });
    } else {
      // Si es nuevo usuario, la contraseña es requerida (mínimo 6 caracteres)
      this.form.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
      this.form.get('confirmPassword')?.setValidators([Validators.required]);
    }
    if (this.data?.readonly) {
      this.form.disable();
    }
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  guardar(): void {
    this.errorPassword.set('');
    if (this.data?.readonly) { this.dialogRef.close(); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.value;
    if (v.password || v.confirmPassword || !this.data?.usuario) {
      if (v.password !== v.confirmPassword) {
        this.errorPassword.set('Las contraseñas no coinciden.');
        return;
      }
    }
    const result: any = {
      nombre: v.nombre,
      correo: v.correo,
      rol: v.rol,
      estado: v.estado,
    };
    if (v.password) {
      result.contrasena = v.password;
    }
    this.dialogRef.close(result);
  }
}
