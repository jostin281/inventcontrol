import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { MatFormFieldModule }  from '@angular/material/form-field';
import { MatInputModule }      from '@angular/material/input';
import { MatButtonModule }     from '@angular/material/button';
import { MatCheckboxModule }   from '@angular/material/checkbox';
import { MatIconModule }       from '@angular/material/icon';

import { AuthService } from '../../../core/services/auth.service';

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

    this.isLoading.set(true);

    this.authService.login(correo, contrasena).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: () => {
        this.isLoading.set(false);
        this.form.get('contrasena')?.setErrors({ invalidCredentials: true });
      }
    });
  }

  togglePassword(): void {
    this.hidePassword.update(v => !v);
  }
}
