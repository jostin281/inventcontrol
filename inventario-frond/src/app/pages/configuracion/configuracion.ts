import {
  Component, OnInit, OnDestroy, inject, signal, computed,
  ElementRef, ViewChild, AfterViewInit, ChangeDetectorRef
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, Validators,
  AbstractControl, ValidationErrors, FormGroup
} from '@angular/forms';
import { MatCardModule }         from '@angular/material/card';
import { MatFormFieldModule }    from '@angular/material/form-field';
import { MatInputModule }        from '@angular/material/input';
import { MatSelectModule }       from '@angular/material/select';
import { MatSlideToggleModule }  from '@angular/material/slide-toggle';
import { MatButtonModule }       from '@angular/material/button';
import { MatIconModule }         from '@angular/material/icon';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule }      from '@angular/material/tooltip';
import { MatSnackBar }           from '@angular/material/snack-bar';
import { MatDividerModule }      from '@angular/material/divider';
import { MatRippleModule }       from '@angular/material/core';
import { Subscription }          from 'rxjs';
import { AuthService } from '../../core/services/auth.service';

// ── Validador de fortaleza ────────────────────────────────────────
export function passwordStrengthValidator(control: AbstractControl): ValidationErrors | null {
  const v: string = control.value || '';
  if (!v) return null;
  const strong = v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v);
  const medium = v.length >= 6 && /[A-Z]/.test(v) && /[0-9]/.test(v);
  return strong || medium ? null : { weakPassword: true };
}

export function getPasswordStrength(v: string): 0 | 1 | 2 | 3 {
  if (!v || v.length < 4) return 0;
  const strong = v.length >= 8 && /[A-Z]/.test(v) && /[0-9]/.test(v) && /[^A-Za-z0-9]/.test(v);
  if (strong) return 3;
  const medium = v.length >= 6 && /[A-Z]/.test(v) && /[0-9]/.test(v);
  if (medium) return 2;
  return 1;
}

// ── Dialog confirmación ───────────────────────────────────────────
import { Component as DComp, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@DComp({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, CommonModule],
  template: `
    <div class="dlg-wrap">
      <div class="dlg-icon-wrap" [class]="data.danger ? 'dlg-icon--danger' : 'dlg-icon--warn'">
        <mat-icon>{{ data.icon }}</mat-icon>
      </div>
      <h2 class="dlg-title">{{ data.title }}</h2>
      <p class="dlg-desc">{{ data.message }}</p>
      <div class="dlg-actions">
        <button mat-stroked-button [mat-dialog-close]="false" class="dlg-btn-cancel">Cancelar</button>
        <button mat-flat-button [mat-dialog-close]="true"
          [class]="data.danger ? 'dlg-btn-danger' : 'dlg-btn-primary'">
          {{ data.confirmLabel }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .dlg-wrap { padding: 32px 28px 24px; text-align: center; max-width: 380px; }
    .dlg-icon-wrap { width: 64px; height: 64px; border-radius: 50%; display: flex;
      align-items: center; justify-content: center; margin: 0 auto 20px;
      mat-icon { font-size: 32px; width: 32px; height: 32px; } }
    .dlg-icon--danger { background: #ffdad6; mat-icon { color: #ba1a1a; } }
    .dlg-icon--warn   { background: #fff3cd; mat-icon { color: #d97706; } }
    .dlg-title { font-size: 20px; font-weight: 700; color: #1a1b22; margin: 0 0 10px; }
    .dlg-desc  { font-size: 14px; color: #46464f; line-height: 1.6; margin: 0 0 24px; }
    .dlg-actions { display: flex; gap: 12px; justify-content: center; }
    .dlg-btn-cancel  { border-color: #c6c5d0 !important; color: #46464f !important; padding: 0 24px; }
    .dlg-btn-danger  { background: #ba1a1a !important; color: #fff !important; padding: 0 24px; }
    .dlg-btn-primary { background: #24389c !important; color: #fff !important; padding: 0 24px; }
  `]
})
export class ConfirmDialogComponent {
  data = inject(MAT_DIALOG_DATA);
  ref  = inject(MatDialogRef);
}

// ── Mock Data ─────────────────────────────────────────────────────
const MOCK_PERFIL = {
  nombre:    'InvenControl S.A.',
  correo:    'operaciones@invencontrol.mx',
  direccion: 'Av. Insurgentes Sur 1234, Col. Nápoles, CDMX, México',
  zona:      'America/Mexico_City',
  moneda:    'MXN'
};

const MOCK_SESIONES = [
  { id: 1, dispositivo: 'Chrome · Windows 11',  icono: 'computer',      ubicacion: 'CDMX, México',    actual: true  },
  { id: 2, dispositivo: 'Safari · iPhone 14',   icono: 'smartphone',    ubicacion: 'Monterrey, México', actual: false },
  { id: 3, dispositivo: 'Firefox · macOS',       icono: 'laptop_mac',    ubicacion: 'Guadalajara, México', actual: false },
];

// ── Main Component ────────────────────────────────────────────────
@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatSlideToggleModule, MatButtonModule, MatIconModule, MatDialogModule,
    MatTooltipModule, MatDividerModule, MatRippleModule
  ],
  templateUrl: './configuracion.html',
  styleUrl: './configuracion.css'
})
export class Configuracion implements OnInit, AfterViewInit, OnDestroy {
  private fb    = inject(FormBuilder);
  private dialog = inject(MatDialog);
  private snack  = inject(MatSnackBar);
  private cdr    = inject(ChangeDetectorRef);

  // ── Sección activa (scroll-spy) ───────────────────────────────
  activeSection = signal<string>('perfil');

  // ── Logo preview ──────────────────────────────────────────────
  logoPreview = signal<string | null>(null);

  // ── Sesiones activas ──────────────────────────────────────────
  sesiones = signal([...MOCK_SESIONES]);

  // ── Formulario: Perfil del negocio ────────────────────────────
  perfilForm: FormGroup = this.fb.group({
    nombre:    [MOCK_PERFIL.nombre,    Validators.required],
    correo:    [MOCK_PERFIL.correo,    [Validators.required, Validators.email]],
    direccion: [MOCK_PERFIL.direccion, Validators.required],
    zona:      [MOCK_PERFIL.zona,      Validators.required],
    moneda:    [MOCK_PERFIL.moneda,    Validators.required],
  });

  // ── Formulario: Notificaciones ────────────────────────────────
  notifForm: FormGroup = this.fb.group({
    stockBajo:   [true],
    movimientos: [true],
    seguridad:   [false],
  });

  // ── Formulario: Cambiar contraseña ────────────────────────────
  passForm: FormGroup = this.fb.group({
    actual: ['', Validators.required],
    nueva:  ['', [Validators.required, Validators.minLength(6), passwordStrengthValidator]],
  });

  // ── Fortaleza de contraseña ───────────────────────────────────
  passwordStrength = signal<0 | 1 | 2 | 3>(0);
  strengthLabel    = computed(() => ['', 'Débil', 'Media', 'Fuerte'][this.passwordStrength()]);
  strengthColor    = computed(() => ['', '#ba1a1a', '#d97706', '#006b5c'][this.passwordStrength()]);

  get businessInitials(): string {
    const name = this.perfilForm.get('nombre')?.value || 'IC';
    return name.split(' ').slice(0, 2).map((n: string) => n[0]).join('').toUpperCase();
  }

  // ── ¿Hay cambios pendientes? ──────────────────────────────────
  hayDirty = computed(() => this._dirty());
  private _dirty = signal(false);

  // ── Opciones para selects ─────────────────────────────────────
  zonas = [
    'America/Mexico_City', 'America/Cancun', 'America/Monterrey',
    'America/New_York', 'America/Los_Angeles', 'Europe/Madrid', 'UTC'
  ];
  monedas = [
    { code: 'MXN', label: 'MXN – Peso Mexicano' },
    { code: 'USD', label: 'USD – Dólar Estadounidense' },
    { code: 'EUR', label: 'EUR – Euro' },
    { code: 'COP', label: 'COP – Peso Colombiano' },
  ];

  // ── Mostrar/ocultar contraseña ────────────────────────────────
  showActual = signal(false);
  showNueva  = signal(false);

  // ── Refs a las secciones para scroll-spy ─────────────────────
  @ViewChild('secPerfil')       secPerfil!: ElementRef;
  @ViewChild('secNotif')        secNotif!: ElementRef;
  @ViewChild('secSeguridad')    secSeguridad!: ElementRef;
  @ViewChild('secPeligro')      secPeligro!: ElementRef;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  private authService = inject(AuthService);
  private subs = new Subscription();
  private observer!: IntersectionObserver;

  ngOnInit(): void {
    // Cargar perfil dinámico desde el usuario autenticado
    const user = this.authService.currentUser() as any;
    if (user) {
      this.perfilForm.patchValue({
        nombre: user.nombreNegocio || user.nombre || 'Mi Negocio',
        correo: user.correo || '',
        direccion: 'Dirección por registrar',
        zona: 'America/Mexico_City',
        moneda: 'MXN'
      });
    }

    // Trackear cambios de formularios
    const trackDirty = () => this._dirty.set(
      this.perfilForm.dirty || this.notifForm.dirty || this.passForm.dirty
    );
    this.subs.add(this.perfilForm.valueChanges.subscribe(trackDirty));
    this.subs.add(this.notifForm.valueChanges.subscribe(trackDirty));
    this.subs.add(this.passForm.valueChanges.subscribe(trackDirty));

    // Fortaleza de contraseña en tiempo real
    this.subs.add(
      this.passForm.get('nueva')!.valueChanges.subscribe(v =>
        this.passwordStrength.set(getPasswordStrength(v || ''))
      )
    );
  }

  ngAfterViewInit(): void {
    // Scroll-spy con IntersectionObserver
    const sections = [
      { el: this.secPerfil?.nativeElement,    id: 'perfil'    },
      { el: this.secNotif?.nativeElement,     id: 'notif'     },
      { el: this.secSeguridad?.nativeElement, id: 'seguridad' },
      { el: this.secPeligro?.nativeElement,   id: 'peligro'   },
    ];

    this.observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const match = sections.find(s => s.el === e.target);
            if (match) { this.activeSection.set(match.id); this.cdr.markForCheck(); }
          }
        }
      },
      { root: this.scrollContainer?.nativeElement, threshold: 0.35 }
    );

    sections.forEach(s => { if (s.el) this.observer.observe(s.el); });
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.observer?.disconnect();
  }

  // ── Navegación desde mini-nav ─────────────────────────────────
  scrollTo(id: string): void {
    const map: Record<string, ElementRef> = {
      perfil:    this.secPerfil,
      notif:     this.secNotif,
      seguridad: this.secSeguridad,
      peligro:   this.secPeligro,
    };
    map[id]?.nativeElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.activeSection.set(id);
  }

  // ── Logo ──────────────────────────────────────────────────────
  onLogoChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => this.logoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this._dirty.set(true);
  }

  // ── Guardar todos los cambios ─────────────────────────────────
  guardarTodo(): void {
    if (this.perfilForm.invalid) { this.perfilForm.markAllAsTouched(); return; }
    // Simular guardado
    setTimeout(() => {
      this.perfilForm.markAsPristine();
      this.notifForm.markAsPristine();
      this.passForm.markAsPristine();
      this._dirty.set(false);
      this.snack.open('✓ Cambios guardados correctamente', 'OK', {
        duration: 3500, panelClass: ['snack-success']
      });
    }, 600);
  }

  // ── Descartar ─────────────────────────────────────────────────
  descartarCambios(): void {
    this.perfilForm.reset(MOCK_PERFIL);
    this.notifForm.reset({ stockBajo: true, movimientos: true, seguridad: false });
    this.passForm.reset();
    this.passwordStrength.set(0);
    this.logoPreview.set(null);
    this._dirty.set(false);
  }

  // ── Seguridad: Actualizar contraseña ─────────────────────────
  actualizarCredenciales(): void {
    if (this.passForm.invalid) { this.passForm.markAllAsTouched(); return; }
    setTimeout(() => {
      this.passForm.reset();
      this.passwordStrength.set(0);
      this.snack.open('✓ Contraseña actualizada', 'OK', { duration: 3000 });
    }, 500);
  }

  // ── Sesiones: Revocar ─────────────────────────────────────────
  revocar(id: number): void {
    this.sesiones.update(list => list.filter(s => s.id !== id));
    this.snack.open('Sesión revocada', 'OK', { duration: 2500 });
  }

  // ── Zona de peligro ───────────────────────────────────────────
  archivarDB(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        icon: 'archive', danger: false,
        title: '¿Archivar base de datos?',
        message: 'Se creará un archivo comprimido de todos los datos actuales. Esta operación puede tardar varios minutos.',
        confirmLabel: 'Sí, archivar'
      }, panelClass: 'custom-dialog'
    }).afterClosed().subscribe(ok => {
      if (ok) this.snack.open('Archivado iniciado — recibirás un correo al terminar', 'OK', { duration: 5000 });
    });
  }

  eliminarOrg(): void {
    const orgNombre = this.perfilForm.get('nombre')?.value || 'la organización';
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        icon: 'delete_forever', danger: true,
        title: '¿Eliminar organización?',
        message: `Esta acción es IRREVERSIBLE. Se eliminarán todos los datos, usuarios y configuraciones de "${orgNombre}" permanentemente.`,
        confirmLabel: 'Eliminar permanentemente'
      }, panelClass: 'custom-dialog'
    }).afterClosed().subscribe(ok => {
      if (ok) this.snack.open('Organización eliminada', 'OK', { duration: 4000, panelClass: ['snack-error'] });
    });
  }
}
