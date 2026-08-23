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
import { AuthService, SesionActiva } from '../../core/services/auth.service';
import { NotificacionPreferenciasService } from '../../core/services/notificacion-preferencias.service';

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
import { FormsModule } from '@angular/forms';

@DComp({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [
    MatDialogModule, MatButtonModule, MatIconModule, CommonModule,
    FormsModule, MatFormFieldModule, MatInputModule,
  ],
  template: `
    <div class="dlg-wrap">
      <div class="dlg-icon-wrap" [class]="data.danger ? 'dlg-icon--danger' : 'dlg-icon--warn'">
        <mat-icon>{{ data.icon }}</mat-icon>
      </div>
      <h2 class="dlg-title">{{ data.title }}</h2>
      <p class="dlg-desc">{{ data.message }}</p>

      @if (data.requierePassword) {
        <mat-form-field appearance="outline" class="dlg-pass-field">
          <mat-label>Tu contraseña</mat-label>
          <input matInput type="password" [(ngModel)]="password"
            name="dlgPassword" autocomplete="current-password">
        </mat-form-field>
      }

      <div class="dlg-actions">
        <button mat-stroked-button [mat-dialog-close]="null" class="dlg-btn-cancel">Cancelar</button>
        <button mat-flat-button (click)="confirmar()"
          [disabled]="data.requierePassword && !password"
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
    .dlg-pass-field { width: 100%; text-align: left; margin-bottom: 4px; }
    .dlg-actions { display: flex; gap: 12px; justify-content: center; }
    .dlg-btn-cancel  { border-color: #c6c5d0 !important; color: #46464f !important; padding: 0 24px; }
    .dlg-btn-danger  { background: #ba1a1a !important; color: #fff !important; padding: 0 24px; }
    .dlg-btn-primary { background: #24389c !important; color: #fff !important; padding: 0 24px; }
  `]
})
export class ConfirmDialogComponent {
  data = inject(MAT_DIALOG_DATA);
  ref  = inject(MatDialogRef);
  password = '';

  confirmar(): void {
    if (this.data.requierePassword) {
      this.ref.close({ password: this.password });
    } else {
      this.ref.close(true);
    }
  }
}

// ── Valores por defecto de "Perfil del negocio" mientras carga el real ──
// (se pisan de inmediato en ngOnInit con los datos guardados de verdad).
const PERFIL_POR_DEFECTO = {
  nombre:    '',
  correo:    '',
  direccion: '',
  zona:      'America/Guayaquil',
  moneda:    'USD'
};

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
  private notifPrefs = inject(NotificacionPreferenciasService);

  // ── Sección activa (scroll-spy) ───────────────────────────────
  activeSection = signal<string>('perfil');

  // ── Logo preview ──────────────────────────────────────────────
  logoPreview = signal<string | null>(null);

  // ── Sesiones activas (reales: web y app móvil) ─────────────────
  sesiones = signal<SesionActiva[]>([]);
  sesionesCargando = signal(true);
  sesionesError = signal<string | null>(null);

  // ── Formulario: Perfil del negocio ────────────────────────────
  // "direccion" es opcional a propósito: exigirla bloqueaba en silencio el
  // guardado de TODO (incluidas las cuentas ya existentes, que nunca la
  // llenaron) sin ningún aviso visible si el usuario estaba scrolleado
  // más abajo en la pantalla.
  perfilForm: FormGroup = this.fb.group({
    nombre:    [PERFIL_POR_DEFECTO.nombre,    Validators.required],
    correo:    [PERFIL_POR_DEFECTO.correo,    [Validators.required, Validators.email]],
    direccion: [PERFIL_POR_DEFECTO.direccion],
    zona:      [PERFIL_POR_DEFECTO.zona,      Validators.required],
    moneda:    [PERFIL_POR_DEFECTO.moneda,    Validators.required],
  });

  // ── Formulario: Notificaciones ──────────────────────────────────
  // "stockBajo" y "seguridad" hacen algo real: prenden/apagan, respectivamente,
  // la alerta de stock (campana + modal de login) y la alerta de "inicio de
  // sesión desde un dispositivo nuevo" (campana). "movimientos" todavía es
  // solo maqueta visual — el backend no tiene resumen por correo.
  notifForm: FormGroup = this.fb.group({
    stockBajo:   [this.notifPrefs.alertasStockActivas()],
    movimientos: [true],
    seguridad:   [this.notifPrefs.alertasSeguridadActivas()],
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

  // ── Opciones para selects (app exclusiva para Ecuador) ─────────
  // Ecuador continental usa un solo huso horario (UTC-5, sin horario de
  // verano); Galápagos usa el suyo propio (UTC-6).
  zonas = [
    { value: 'America/Guayaquil', label: 'Ecuador continental (GMT-5)' },
    { value: 'Pacific/Galapagos', label: 'Galápagos (GMT-6)' },
  ];
  // Ecuador usa el dólar estadounidense como moneda oficial desde 2000.
  monedas = [
    { code: 'USD', label: 'USD – Dólar Estadounidense' },
  ];

  // ── Mostrar/ocultar contraseña ────────────────────────────────
  showActual = signal(false);
  showNueva  = signal(false);

  // ── Estado del cambio de contraseña ───────────────────────────
  credGuardando = signal(false);
  credError     = signal<string | null>(null);

  // ── Refs a las secciones para scroll-spy ─────────────────────
  @ViewChild('secPerfil')       secPerfil!: ElementRef;
  @ViewChild('secNotif')        secNotif!: ElementRef;
  @ViewChild('secSeguridad')    secSeguridad!: ElementRef;
  @ViewChild('secPeligro')      secPeligro!: ElementRef;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  // ── Estado del guardado de Perfil del negocio ──────────────────
  guardandoPerfil = signal(false);

  private authService = inject(AuthService);
  private subs = new Subscription();
  private observer!: IntersectionObserver;

  /** Carga en el formulario y en `logoPreview` los datos reales guardados del negocio. */
  private _cargarPerfilDesdeUsuario(): void {
    const user = this.authService.currentUser() as any;
    if (!user) return;
    this.perfilForm.patchValue({
      nombre:    user.nombreNegocio || user.nombre || 'Mi Negocio',
      correo:    user.correoOperaciones || user.correo || '',
      direccion: user.direccion || '',
      zona:      user.zona || 'America/Guayaquil',
      moneda:    user.moneda || 'USD',
    });
    this.logoPreview.set(user.logo || null);
  }

  ngOnInit(): void {
    this._cargarPerfilDesdeUsuario();

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

    this.cargarSesiones();

    // Limpiar el error de "contraseña actual incorrecta" al volver a escribir
    this.subs.add(
      this.passForm.valueChanges.subscribe(() => {
        if (this.credError()) this.credError.set(null);
      })
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
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      this.snack.open('El logo no puede superar 2 MB', 'OK', { duration: 3500, panelClass: ['snack-error'] });
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = e => this.logoPreview.set(e.target?.result as string);
    reader.readAsDataURL(file);
    this._dirty.set(true);
  }

  // ── Guardar todos los cambios ─────────────────────────────────
  guardarTodo(): void {
    if (this.guardandoPerfil()) return;

    // "stockBajo" y "seguridad" son reales y no dependen del perfil del
    // negocio: se guardan siempre, aunque el formulario de perfil tenga
    // campos inválidos pendientes (si no, un error ahí abajo bloqueaba en
    // silencio TODO el guardado, incluidos estos toggles).
    this.notifPrefs.setAlertasStockActivas(!!this.notifForm.value.stockBajo);
    this.notifPrefs.setAlertasSeguridadActivas(!!this.notifForm.value.seguridad);
    this.notifForm.markAsPristine();

    if (this.perfilForm.invalid) {
      this.perfilForm.markAllAsTouched();
      this.scrollTo('perfil');
      this.snack.open(
        'Revisa el Perfil del negocio: hay campos obligatorios sin completar (el resto ya se guardó)',
        'OK', { duration: 5000, panelClass: ['snack-error'] }
      );
      this._dirty.set(this.perfilForm.dirty || this.passForm.dirty);
      return;
    }

    const { nombre, correo, direccion, zona, moneda } = this.perfilForm.value;
    this.guardandoPerfil.set(true);

    this.authService.actualizarPerfilNegocio({
      nombreNegocio: nombre || undefined,
      correoOperaciones: correo || undefined,
      direccion: direccion || undefined,
      zona: zona || undefined,
      moneda: moneda || undefined,
      logo: this.logoPreview(),
    }).subscribe({
      next: () => {
        this.guardandoPerfil.set(false);
        this.perfilForm.markAsPristine();
        this.notifForm.markAsPristine();
        this.passForm.markAsPristine();
        this._dirty.set(false);
        this.snack.open('✓ Cambios guardados correctamente', 'OK', {
          duration: 3500, panelClass: ['snack-success']
        });
      },
      error: (err) => {
        this.guardandoPerfil.set(false);
        const msg = err?.error?.message || 'No se pudo guardar el perfil del negocio';
        this.snack.open('✕ ' + msg, 'OK', { duration: 4500, panelClass: ['snack-error'] });
      }
    });
  }

  // ── Descartar ─────────────────────────────────────────────────
  descartarCambios(): void {
    this._cargarPerfilDesdeUsuario();
    this.perfilForm.markAsPristine();
    this.notifForm.reset({
      stockBajo: this.notifPrefs.alertasStockActivas(),
      movimientos: true,
      seguridad: this.notifPrefs.alertasSeguridadActivas(),
    });
    this.passForm.reset();
    this.passwordStrength.set(0);
    this.credError.set(null);
    this._dirty.set(false);
  }

  // ── Seguridad: Actualizar contraseña ─────────────────────────
  actualizarCredenciales(): void {
    if (this.passForm.invalid) { this.passForm.markAllAsTouched(); return; }

    const { actual, nueva } = this.passForm.value;
    this.credError.set(null);
    this.credGuardando.set(true);

    this.authService.cambiarContrasena(actual, nueva).subscribe({
      next: () => {
        this.credGuardando.set(false);
        this.passForm.reset();
        this.passwordStrength.set(0);
        this.snack.open('✓ Contraseña actualizada', 'OK', { duration: 3000 });
      },
      error: (err) => {
        this.credGuardando.set(false);
        this.credError.set(
          err?.error?.message || 'No se pudo actualizar la contraseña'
        );
      }
    });
  }

  // ── Sesiones: cargar y revocar (reales) ────────────────────────
  cargarSesiones(): void {
    this.sesionesCargando.set(true);
    this.sesionesError.set(null);
    this.authService.obtenerSesiones().subscribe({
      next: (lista) => {
        this.sesionesCargando.set(false);
        this.sesiones.set(lista);
      },
      error: () => {
        this.sesionesCargando.set(false);
        this.sesionesError.set('No se pudieron cargar las sesiones activas');
      }
    });
  }

  revocar(id: number): void {
    this.authService.revocarSesion(id).subscribe({
      next: () => {
        this.sesiones.update(list => list.filter(s => s.id !== id));
        this.snack.open('Sesión revocada', 'OK', { duration: 2500 });
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo revocar la sesión';
        this.snack.open(msg, 'OK', { duration: 3500, panelClass: ['snack-error'] });
      }
    });
  }

  // ── Zona de peligro ───────────────────────────────────────────
  backupGenerando = signal(false);
  orgEliminando    = signal(false);

  archivarDB(): void {
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        icon: 'archive', danger: false,
        title: '¿Archivar base de datos?',
        message: 'Se descargará un archivo comprimido (.json.gz) con todos los productos, categorías, proveedores, movimientos, ventas y usuarios de tu empresa.',
        confirmLabel: 'Sí, archivar'
      }, panelClass: 'custom-dialog'
    }).afterClosed().subscribe(ok => {
      if (!ok) return;
      this.backupGenerando.set(true);
      this.authService.generarBackup().subscribe({
        next: (blob) => {
          this.backupGenerando.set(false);
          const fecha = new Date().toISOString().slice(0, 10);
          this._descargarBlob(blob, `invencontrol-backup-${fecha}.json.gz`);
          this.snack.open('✓ Backup descargado', 'OK', { duration: 3500 });
        },
        error: () => {
          this.backupGenerando.set(false);
          this.snack.open('No se pudo generar el backup', 'OK', { duration: 3500, panelClass: ['snack-error'] });
        }
      });
    });
  }

  eliminarOrg(): void {
    const orgNombre = this.perfilForm.get('nombre')?.value || 'la organización';
    this.dialog.open(ConfirmDialogComponent, {
      data: {
        icon: 'delete_forever', danger: true, requierePassword: true,
        title: '¿Eliminar organización?',
        message: `Esta acción es IRREVERSIBLE. Se eliminarán todos los datos, usuarios y configuraciones de "${orgNombre}" permanentemente. Confirma con tu contraseña.`,
        confirmLabel: 'Eliminar permanentemente'
      }, panelClass: 'custom-dialog'
    }).afterClosed().subscribe((res: { password: string } | null) => {
      if (!res?.password) return;
      this.orgEliminando.set(true);
      this.authService.eliminarOrganizacion(res.password).subscribe({
        next: () => {
          this.snack.open('Organización eliminada', 'OK', { duration: 4000, panelClass: ['snack-error'] });
          // La cuenta ya no existe en el backend: cerrar sesión solo localmente.
          this.authService.forzarLogoutLocal();
        },
        error: (err) => {
          this.orgEliminando.set(false);
          const msg = err?.error?.message || 'No se pudo eliminar la organización';
          this.snack.open(msg, 'OK', { duration: 4000, panelClass: ['snack-error'] });
        }
      });
    });
  }

  private _descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nombreArchivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
}
