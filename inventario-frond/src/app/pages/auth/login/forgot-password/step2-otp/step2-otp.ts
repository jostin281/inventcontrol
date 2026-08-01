import {
  Component, inject, signal, OnInit, OnDestroy,
  ViewChildren, QueryList, ElementRef,
} from '@angular/core';
import { CommonModule }                         from '@angular/common';
import { ReactiveFormsModule, FormBuilder }     from '@angular/forms';
import {
  MatDialogRef, MatDialogModule,
  MAT_DIALOG_DATA, MatDialog,
}                                               from '@angular/material/dialog';
import { MatButtonModule }                      from '@angular/material/button';
import { MatIconModule }                        from '@angular/material/icon';
import { MatProgressSpinnerModule }             from '@angular/material/progress-spinner';
import { Step3NewpassComponent }                from '../step3-newpass/step3-newpass';
import { delay } from 'rxjs';
import { of } from 'rxjs';

const CODIGO_VALIDO = '123456';
const RESEND_SECONDS = 30;

@Component({
  selector: 'app-step2-otp',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './step2-otp.html',
  styleUrl:    './step2-otp.css',
})
export class Step2OtpComponent implements OnInit, OnDestroy {
  private dialogRef  = inject(MatDialogRef<Step2OtpComponent>);
  private dialog     = inject(MatDialog);
  readonly data      = inject(MAT_DIALOG_DATA) as { correo: string };

  @ViewChildren('digitInput') digitInputs!: QueryList<ElementRef<HTMLInputElement>>;

  digits      = signal<string[]>(['', '', '', '', '', '']);
  codigoError = signal(false);
  verificando = signal(false);

  // Cuenta regresiva para reenviar
  resendCountdown = signal(RESEND_SECONDS);
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  get codigoCompleto(): boolean {
    return this.digits().every(d => d !== '');
  }

  ngOnInit(): void {
    this.startCountdown();
  }

  ngOnDestroy(): void {
    this.stopCountdown();
  }

  private startCountdown(): void {
    this.resendCountdown.set(RESEND_SECONDS);
    this.countdownInterval = setInterval(() => {
      this.resendCountdown.update(v => {
        if (v <= 1) { this.stopCountdown(); return 0; }
        return v - 1;
      });
    }, 1000);
  }

  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  reenviarCodigo(): void {
    if (this.resendCountdown() > 0) return;
    // Simula reenvío
    this.startCountdown();
    this.limpiarDigitos();
  }

  onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.replace(/\D/g, '').slice(-1); // solo un dígito
    input.value = value;

    const newDigits = [...this.digits()];
    newDigits[index] = value;
    this.digits.set(newDigits);
    this.codigoError.set(false);

    if (value && index < 5) {
      setTimeout(() => {
        const inputs = this.digitInputs.toArray();
        inputs[index + 1]?.nativeElement.focus();
      }, 0);
    }
  }

  onDigitKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace') {
      const newDigits = [...this.digits()];
      if (newDigits[index] === '' && index > 0) {
        // Borrar el anterior
        newDigits[index - 1] = '';
        this.digits.set(newDigits);
        setTimeout(() => {
          const inputs = this.digitInputs.toArray();
          inputs[index - 1]?.nativeElement.focus();
        }, 0);
      } else {
        newDigits[index] = '';
        this.digits.set(newDigits);
      }
      this.codigoError.set(false);
    }
  }

  onDigitPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text').replace(/\D/g, '').slice(0, 6) ?? '';
    const newDigits = [...this.digits()];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] ?? '';
    }
    this.digits.set(newDigits);
    // Focus al último campo rellenado
    setTimeout(() => {
      const inputs = this.digitInputs.toArray();
      const lastFilled = Math.min(pasted.length, 5);
      inputs[lastFilled]?.nativeElement.focus();
    }, 0);
  }

  private limpiarDigitos(): void {
    this.digits.set(['', '', '', '', '', '']);
    this.codigoError.set(false);
    setTimeout(() => {
      this.digitInputs.toArray()[0]?.nativeElement.focus();
    }, 0);
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  verificarCodigo(): void {
    if (!this.codigoCompleto) return;

    const codigo = this.digits().join('');
    this.verificando.set(true);

    of(null).pipe(delay(1000)).subscribe(() => {
      this.verificando.set(false);
      if (codigo !== CODIGO_VALIDO) {
        this.codigoError.set(true);
        this.limpiarDigitos();
        return;
      }
      // Código correcto → abrir paso 3
      this.dialogRef.close();
      this.dialog.open(Step3NewpassComponent, {
        width: '460px',
        maxWidth: '95vw',
        disableClose: true,
        data: { correo: this.data.correo },
        panelClass: 'fp-dialog',
      });
    });
  }
}
