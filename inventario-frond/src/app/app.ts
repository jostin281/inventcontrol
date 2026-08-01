import {
  Component,
  inject,
  signal,
  computed,
  HostListener,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatRippleModule } from '@angular/material/core';
import { AsyncPipe } from '@angular/common';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';

export interface Notificacion {
  id: number;
  tipo: 'warning' | 'info' | 'success' | 'error';
  titulo: string;
  descripcion: string;
  hora: Date;
  leida: boolean;
  icono: string;
  ruta?: string;
}

/** Rutas que deben mostrarse sin el shell (sidenav + topbar) */
const AUTH_ROUTES = ['/login', '/registro'];

@Component({
  selector: 'app-root',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, AsyncPipe,
    MatSidenavModule, MatIconModule, MatButtonModule,
    MatTooltipModule, MatBadgeModule, MatRippleModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'InvenControl';

  private router = inject(Router);
  private elRef = inject(ElementRef);
  private authService = inject(AuthService);

  /** Emite `true` cuando la ruta activa es login o registro */
  isAuthRoute$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    map((e: any) => AUTH_ROUTES.some(r => e.urlAfterRedirects.startsWith(r))),
    startWith(AUTH_ROUTES.some(r => this.router.url.startsWith(r)))
  );

  // ── Panel de notificaciones ───────────────────────────────────────────────
  showNotifPanel = signal(false);

  private _baseNotifs: Notificacion[] = [];

  notificaciones = signal<Notificacion[]>([]);

  readonly notifCount = computed(
    () => this.notificaciones().filter(n => !n.leida).length
  );

  readonly notifCountStr = computed(() => {
    const c = this.notifCount();
    return c > 0 ? String(c) : '';
  });

  // ── Menús ─────────────────────────────────────────────────────────────────
  mainMenu = [
    { label: 'Dashboard',    icon: 'dashboard',      link: '/dashboard' },
    { label: 'Productos',    icon: 'inventory_2',    link: '/productos' },
    { label: 'Categorías',   icon: 'category',       link: '/categorias' },
    { label: 'Movimientos',  icon: 'swap_horiz',     link: '/movimientos' },
    { label: 'Proveedores',  icon: 'local_shipping', link: '/proveedores' },
    { label: 'Reportes',     icon: 'bar_chart',      link: '/reportes' },
    { label: 'Asistente IA', icon: 'smart_toy',      link: '/asistente-ia' },
  ];

  readonly adminMenu = [
    { label: 'Ventas', icon: 'sell', link: '/ventas' },
    { label: 'Usuarios', icon: 'group', link: '/usuarios' },
  ];

  configMenu = [
    { label: 'Configuración', icon: 'settings', link: '/configuracion' },
  ];

  readonly currentUser = this.authService.currentUser;
  readonly isAdmin = computed(() => this.authService.isAdmin());

  get userInitials(): string {
    const nombre = this.currentUser()?.nombre ?? 'UD';
    return nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  get userDisplayName(): string {
    return this.currentUser()?.nombre ?? 'Usuario demo';
  }

  get userRoleLabel(): string {
    return this.currentUser()?.rol === 'admin' ? 'Administrador' : 'Usuario';
  }

  // ── Acciones del panel ────────────────────────────────────────────────────
  toggleNotifPanel(event: Event): void {
    event.stopPropagation();
    this.showNotifPanel.update(v => !v);
  }

  marcarTodasLeidas(): void {
    this.notificaciones.update(notifs =>
      notifs.map(n => ({ ...n, leida: true }))
    );
  }

  marcarLeida(notif: Notificacion): void {
    this.notificaciones.update(notifs =>
      notifs.map(n => n.id === notif.id ? { ...n, leida: true } : n)
    );
    if (notif.ruta) {
      this.showNotifPanel.set(false);
      this.router.navigate([notif.ruta]);
    }
  }

  eliminarNotif(event: Event, id: number): void {
    event.stopPropagation();
    this.notificaciones.update(notifs => notifs.filter(n => n.id !== id));
  }

  limpiarTodas(): void {
    this.notificaciones.set([]);
    this.showNotifPanel.set(false);
  }

  /** Cierra el panel si se hace clic fuera */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const panel = this.elRef.nativeElement.querySelector('.notif-panel');
    const btn = this.elRef.nativeElement.querySelector('#btn-notifications');
    if (
      this.showNotifPanel() &&
      panel && !panel.contains(event.target as Node) &&
      btn && !btn.contains(event.target as Node)
    ) {
      this.showNotifPanel.set(false);
    }
  }

  tiempoRelativo(fecha: Date): string {
    const diff = (Date.now() - fecha.getTime()) / 1000;
    if (diff < 60) return 'Hace unos segundos';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return `Hace ${Math.floor(diff / 86400)} días`;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
