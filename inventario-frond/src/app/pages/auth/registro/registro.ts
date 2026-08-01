import { Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
  ValidatorFn
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatFormFieldModule }     from '@angular/material/form-field';
import { MatInputModule }         from '@angular/material/input';
import { MatButtonModule }        from '@angular/material/button';
import { MatSelectModule }        from '@angular/material/select';
import { MatIconModule }          from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';

/** Validador personalizado: confirmar que dos campos de contraseña coincidan */
export const passwordMatchValidator: ValidatorFn = (
  group: AbstractControl
): ValidationErrors | null => {
  const pass    = group.get('contrasena')?.value;
  const confirm = group.get('confirmarContrasena')?.value;
  return pass && confirm && pass !== confirm
    ? { passwordMismatch: true }
    : null;
};

@Component({
  selector: 'app-registro',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './registro.html',
  styleUrl: './registro.css'
})
export class Registro {
  private fb          = inject(FormBuilder);
  private router      = inject(Router);
  private authService = inject(AuthService);

  /* ── Estado ──────────────────────────────────────────────────────── */
  isLoading  = signal(false);
  hidePass   = signal(true);
  hidePass2  = signal(true);

  toggleHidePass():  void { this.hidePass.update(v => !v); }
  toggleHidePass2(): void { this.hidePass2.update(v => !v); }

  /* ── Opciones del select ──────────────────────────────────────────── */
  readonly tiposNegocio = [
    { value: 'retail',        label: 'Retail / Comercio' },
    { value: 'manufactura',   label: 'Manufactura' },
    { value: 'logistica',     label: 'Logística / Almacén' },
    { value: 'ecommerce',     label: 'E-commerce' },
    { value: 'otro',          label: 'Otro' },
  ];

  /* ── Formulario ───────────────────────────────────────────────────── */
  form = this.fb.group(
    {
      // Sección 1 – Negocio
      nombreNegocio:       ['', [Validators.required, Validators.minLength(2)]],
      tipoNegocio:         ['', Validators.required],

      // Sección 2 – Administrador
      nombreCompleto:      ['', [Validators.required, Validators.minLength(3)]],
      correo:              ['', [Validators.required, Validators.email]],
      contrasena:          ['', [Validators.required, Validators.minLength(8)]],
      confirmarContrasena: ['', Validators.required],
    },
    { validators: passwordMatchValidator }
  );

  /* Accesos rápidos */
  get nombreNegocio()       { return this.form.get('nombreNegocio')!; }
  get tipoNegocio()         { return this.form.get('tipoNegocio')!; }
  get nombreCompleto()      { return this.form.get('nombreCompleto')!; }
  get correo()              { return this.form.get('correo')!; }
  get contrasena()          { return this.form.get('contrasena')!; }
  get confirmarContrasena() { return this.form.get('confirmarContrasena')!; }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.isLoading()) return;

    this.isLoading.set(true);
    const v = this.form.value;

    this.authService.registro({
      nombre:        v.nombreCompleto ?? '',
      correo:        v.correo ?? '',
      contrasena:    v.contrasena ?? '',
      nombreNegocio: v.nombreNegocio ?? '',
      tipoNegocio:   v.tipoNegocio ?? '',
    }).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        const msg = err?.error?.message;
        if (typeof msg === 'string' && msg.includes('correo')) {
          this.correo.setErrors({ emailTaken: true });
        } else {
          this.form.setErrors({ serverError: true });
        }
      }
    });
  }
}
