import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule }    from '@angular/material/dialog';
import { MatFormFieldModule }               from '@angular/material/form-field';
import { MatInputModule }                   from '@angular/material/input';
import { MatButtonModule }                  from '@angular/material/button';
import { MatIconModule }                    from '@angular/material/icon';
import { MatProgressSpinnerModule }         from '@angular/material/progress-spinner';
import { MatDialog }                        from '@angular/material/dialog';
import { Step2OtpComponent }                from '../step2-otp/step2-otp';
import { delay } from 'rxjs';
import { of } from 'rxjs';

@Component({
  selector: 'app-step1-email',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './step1-email.html',
  styleUrl:    './step1-email.css',
})
export class Step1EmailComponent {
  private dialogRef = inject(MatDialogRef<Step1EmailComponent>);
  private dialog    = inject(MatDialog);
  private fb        = inject(FormBuilder);

  enviando = signal(false);

  form = this.fb.group({
    correo: ['', [Validators.required, Validators.email]],
  });

  get correo() { return this.form.get('correo')!; }

  cancelar(): void {
    this.dialogRef.close();
  }

  enviarCodigo(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.enviando.set(true);

    // Simula llamada a API (preparado para AuthService real)
    of(null).pipe(delay(1400)).subscribe(() => {
      this.enviando.set(false);
      const correo = this.correo.value!;
      this.dialogRef.close();
      // Encadenar modal 2
      this.dialog.open(Step2OtpComponent, {
        width: '460px',
        maxWidth: '95vw',
        disableClose: true,
        data: { correo },
        panelClass: 'fp-dialog',
      });
    });
  }
}
