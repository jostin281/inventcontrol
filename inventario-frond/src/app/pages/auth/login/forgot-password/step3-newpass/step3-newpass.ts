import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import {
  MatDialogRef, MatDialogModule,
  MAT_DIALOG_DATA,
}                                      from '@angular/material/dialog';
import { MatFormFieldModule }          from '@angular/material/form-field';
import { MatInputModule }              from '@angular/material/input';
import { MatButtonModule }             from '@angular/material/button';
import { MatIconModule }               from '@angular/material/icon';
import { MatProgressSpinnerModule }    from '@angular/material/progress-spinner';
import { MatSnackBar }                 from '@angular/material/snack-bar';
import { MatSnackBarModule }           from '@angular/material/snack-bar';
import { delay } from 'rxjs';
import { of } from 'rxjs';

// Validador de contraseñas coincidentes
function passwordsMatchValidator(control: AbstractControl): ValidationErrors | null {
  const nueva     = control.get('nueva')?.value;
  const confirmar = control.get('confirmar')?.value;
  if (nueva && confirmar && nueva !== confirmar) {
    return { noCoinciden: true };
  }
  return null;
}

// Calcula fortaleza 0-4
function calcularFortaleza(password: string): number {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8)              score++;
  if (/[A-Z]/.test(password))            score++;
  if (/[0-9]/.test(password))            score++;
  if (/[^A-Za-z0-9]/.test(password))     score++;
  return score;
}

@Component({
  selector: 'app-step3-newpass',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './step3-newpass.html',
  styleUrl:    './step3-newpass.css',
})
export class Step3NewpassComponent {
  private dialogRef = inject(MatDialogRef<Step3NewpassComponent>);
  private fb        = inject(FormBuilder);
  private snack     = inject(MatSnackBar);
  readonly data     = inject(MAT_DIALOG_DATA) as { correo: string };

  guardando        = signal(false);
  hideNueva        = signal(true);
  hideConfirmar    = signal(true);
  fortaleza        = signal(0);

  readonly fortalezaLabels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte'];
  readonly fortalezaColors = ['', '#ba1a1a', '#d97706', '#3f51b5', '#006b5c'];

  form = this.fb.group(
    {
      nueva:     ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator }
  );

  get nueva()     { return this.form.get('nueva')!; }
  get confirmar() { return this.form.get('confirmar')!; }
  get noCoinciden(): boolean {
    return this.form.hasError('noCoinciden') && this.confirmar.touched;
  }

  toggleHideNueva():     void { this.hideNueva.update(v => !v); }
  toggleHideConfirmar(): void { this.hideConfirmar.update(v => !v); }

  onNuevaChange(value: string): void {
    this.fortaleza.set(calcularFortaleza(value));
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.guardando.set(true);
    of(null).pipe(delay(1200)).subscribe(() => {
      this.guardando.set(false);
      this.dialogRef.close();
      // TODO: llamar AuthService.cambiarContrasena(correo, nueva)
      this.snack.open('✅ Contraseña actualizada correctamente', 'OK', {
        duration: 5000,
        panelClass: ['snack-success'],
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
      });
    });
  }
}
