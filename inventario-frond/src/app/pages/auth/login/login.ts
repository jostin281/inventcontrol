import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatFormFieldModule }  from '@angular/material/form-field';
import { MatInputModule }      from '@angular/material/input';
import { MatButtonModule }     from '@angular/material/button';
import { MatCheckboxModule }   from '@angular/material/checkbox';
import { MatIconModule }       from '@angular/material/icon';

import { AuthService } from '../../../core/services/auth.service';

// "Recordarme" acá NO tiene nada que ver con la duración de la sesión —
// solo recuerda el correo (y el propio estado del checkbox) para la
// próxima vez que se abra esta pantalla, en localStorage.
const REMEMBER_KEY     = 'invencontrol-recordarme';
const REMEMBER_EMAIL_KEY = 'invencontrol-correo-guardado';

// ─── Imágenes del carrusel (Unsplash – warehouses / inventario) ──────────────
const CAROUSEL_SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&q=80',
    quote: 'Controla tu inventario,\nhaz crecer tu negocio',
    sub:   'Gestión inteligente para PyMEs'
  },
  {
    url: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1200&q=80',
    quote: 'Visibilidad total\nde tu stock en tiempo real',
    sub:   'Decisiones basadas en datos'
  },
  {
    url: 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=1200&q=80',
    quote: 'Optimiza tu cadena\nde suministro',
    sub:   'Menos pérdidas, más ganancias'
  }
];

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login implements OnInit, OnDestroy {
  private fb     = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);

  /* ── Carrusel ──────────────────────────────────────────────────────── */
  readonly slides = CAROUSEL_SLIDES;
  activeSlide = signal(0);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.startAutoplay();
    this._cargarCorreoRecordado();
  }

  /** Si la vez anterior se guardó "Recordarme", precarga el correo y deja el checkbox marcado. */
  private _cargarCorreoRecordado(): void {
    if (typeof localStorage === 'undefined') return;
    const recordado = localStorage.getItem(REMEMBER_KEY) === '1';
    if (!recordado) return;
    const correoGuardado = localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
    this.form.patchValue({ correo: correoGuardado, recordarme: true });
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  private startAutoplay(): void {
    this.intervalId = setInterval(() => {
      this.activeSlide.update(i => (i + 1) % this.slides.length);
    }, 5000);
  }

  private stopAutoplay(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  goToSlide(index: number): void {
    this.stopAutoplay();
    this.activeSlide.set(index);
    this.startAutoplay();
  }

  /* ── Formulario ────────────────────────────────────────────────────── */
  hidePassword = signal(true);
  isLoading    = signal(false);

  form = this.fb.group({
    correo:      ['', [Validators.required, Validators.email]],
    contrasena:  ['', [Validators.required, Validators.minLength(6)]],
    recordarme:  [false]
  });

  get correo()    { return this.form.get('correo')!; }
  get contrasena(){ return this.form.get('contrasena')!; }

  onSubmit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.isLoading()) return;

    const correo     = this.form.value.correo ?? '';
    const contrasena = this.form.value.contrasena ?? '';
    const recordarme = this.form.value.recordarme ?? false;

    this._guardarCorreoRecordado(recordarme, correo);

    this.isLoading.set(true);

    this.authService.login(correo, contrasena).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401 || err.status === 400) {
          this.form.get('contrasena')?.setErrors({ invalidCredentials: true });
        } else {
          this.form.get('contrasena')?.setErrors({ networkError: true });
        }
      }
    });
  }

  togglePassword(): void {
    this.hidePassword.update(v => !v);
  }

  private _guardarCorreoRecordado(recordarme: boolean, correo: string): void {
    if (typeof localStorage === 'undefined') return;
    if (recordarme) {
      localStorage.setItem(REMEMBER_KEY, '1');
      localStorage.setItem(REMEMBER_EMAIL_KEY, correo);
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  }
}
