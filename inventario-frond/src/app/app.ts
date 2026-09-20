import {
  Component,
  inject,
  signal,
  computed,
  effect,
  untracked,
  HostListener,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatRippleModule } from '@angular/material/core';
import { AsyncPipe } from '@angular/common';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { ProductosService, Producto } from './core/services/productos.service';
import { NotificacionPreferenciasService } from './core/services/notificacion-preferencias.service';
import { AlertaStockDialog } from './shared/alerta-stock-dialog/alerta-stock-dialog';

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
    MatTooltipModule, MatBadgeModule, MatRippleModule,
    AlertaStockDialog,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  title = 'InvenControl';

  private router = inject(Router);
  private elRef = inject(ElementRef);
  private authService = inject(AuthService);
  private productosService = inject(ProductosService);
  private notifPrefs = inject(NotificacionPreferenciasService);

  /**
   * Emite `true` cuando la ruta activa es login o registro.
   *
   * El valor inicial NO puede calcularse con `this.router.url`: cuando este
   * componente raíz se construye, el router todavía no resolvió la
   * navegación de arranque (`router.url` sigue en `/`, antes de la
   * redirección a `/login`), así que `router.url.startsWith('/login')` daba
   * `false` por un instante aunque la app fuera a terminar en `/login` de
   * inmediato. Ese falso "no estoy en auth route" alcanzaba a colarse en el
   * efecto de abajo y disparaba la alerta de stock ANTES de llegar al
   * login. Por eso el valor inicial seguro es `true` (asumir que todavía
   * estamos en login/registro hasta que el router confirme lo contrario).
   */
  isAuthRoute$ = this.router.events.pipe(
    filter(e => e instanceof NavigationEnd),
    map((e: any) => AUTH_ROUTES.some(r => e.urlAfterRedirects.startsWith(r))),
    startWith(true)
  );

  /** Versión en signal de `isAuthRoute$`, para poder leerla dentro de `effect()`. */
  private isAuthRouteSignal = toSignal(this.isAuthRoute$, { initialValue: true });

  // ── Sidebar móvil ────────────────────────────────────────────────────────
  sidebarOpen = signal(false);

  toggleSidebar(): void {
    this.sidebarOpen.update(v => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  // ── Panel de notificaciones ───────────────────────────────────────────────
  showNotifPanel = signal(false);

  notificaciones = signal<Notificacion[]>([]);

  readonly notifCount = computed(
    () => this.notificaciones().filter(n => !n.leida).length
  );

  readonly notifCountStr = computed(() => {
    const c = this.notifCount();
    return c > 0 ? String(c) : '';
  });

  // ── Alerta de stock bajo al iniciar sesión (una sola vez por sesión) ───────
  mostrarAlertaLogin = signal(false);
  productosAlertaLogin = signal<Producto[]>([]);

  /** Evita recargar productos más de una vez por sesión iniciada. */
  private _productosCargados = false;

  constructor() {
    // Carga los productos y evalúa la alerta de stock una vez que hay
    // usuario autenticado Y ya se salió de las pantallas de login/registro
    // (es decir, ya se ve el dashboard/shell). No basta con que
    // `currentUser` exista: en la app móvil (y en la web, si no cerraste
    // sesión) el token queda guardado y `currentUser` ya está poblado desde
    // el arranque, mientras la app todavía muestra el login — sin la
    // condición de ruta, la alerta aparecería encima de esa pantalla en vez
    // de después de entrar de verdad. Se resetea al cerrar sesión para
    // volver a revisar en el siguiente inicio de sesión.
    effect(() => {
      const user = this.authService.currentUser();
      const enAuthRoute = this.isAuthRouteSignal();

      if (!user) {
        this._productosCargados = false;
        return;
      }
      if (enAuthRoute) return;

      if (!this._productosCargados) {
        this._productosCargados = true;
        this.productosService.cargar().subscribe(() => this._mostrarAlertaSiHayNovedad());
      }
    });

    // Reconstruye las notificaciones del campanario a partir del stock cada
    // vez que la lista de productos cambia (venta nueva, edición, etc.), y
    // las vacía si no hay sesión. La lectura de `notificaciones` dentro de
    // `_sincronizarAlertasStock` va envuelta en `untracked` para que este
    // efecto no se vuelva a disparar cuando el propio usuario marca/descarta
    // una notificación (eso solo muta `notificaciones`, no `productos`).
    // Las notificaciones de stock usan ids positivos (`producto.id*10+1/2`);
    // las de seguridad (más abajo) usan ids negativos a propósito, para que
    // este efecto pueda distinguir "las mías" de "las de otro origen" y no
    // borre una alerta de seguridad solo porque cambió el stock.
    effect(() => {
      const user = this.authService.currentUser();
      const activas = this.notifPrefs.alertasStockActivas();
      const sinStock = this.productosService.productosSinStock();
      const stockBajo = this.productosService.productosStockBajo();

      if (!user) {
        this.notificaciones.set([]);
        return;
      }
      if (!activas) {
        this.notificaciones.update(notifs => notifs.filter(n => n.id < 0));
        return;
      }
      this._sincronizarAlertasStock(sinStock, stockBajo);
    });

    // Alerta de seguridad: el backend marca un login como "dispositivo
    // nuevo" cuando esa cuenta nunca antes tuvo una sesión con ese mismo
    // dispositivo (ver AuthService.login / alertaSeguridadPendiente). Se
    // agrega una sola vez a la campana y se consume de inmediato, para que
    // no reaparezca al recargar la página ni se repita en cada render.
    effect(() => {
      const alerta = this.authService.alertaSeguridadPendiente();
      if (!alerta) return;

      if (this.notifPrefs.alertasSeguridadActivas()) {
        this.notificaciones.update(notifs => [
          {
            id: -Date.now(),
            tipo: 'error',
            titulo: 'Nuevo inicio de sesión detectado',
            descripcion: alerta.ip
              ? `Se inició sesión desde ${alerta.dispositivo} (IP ${alerta.ip}). Si no fuiste tú, cambia tu contraseña ahora.`
              : `Se inició sesión desde ${alerta.dispositivo}. Si no fuiste tú, cambia tu contraseña ahora.`,
            hora: new Date(),
            leida: false,
            icono: 'gpp_bad',
            ruta: '/configuracion',
          },
          ...notifs,
        ]);
      }
      this.authService.consumirAlertaSeguridad();
    });
  }

  // ── Menús ─────────────────────────────────────────────────────────────────
  mainMenu = [
    { label: 'Dashboard',      icon: 'dashboard',      link: '/dashboard' },
    { label: 'Punto de Venta', icon: 'point_of_sale',  link: '/pos' },
    { label: 'Productos',      icon: 'inventory_2',    link: '/productos' },
    { label: 'Categorías',     icon: 'category',       link: '/categorias' },
    { label: 'Movimientos',    icon: 'swap_horiz',     link: '/movimientos' },
    { label: 'Proveedores',    icon: 'local_shipping', link: '/proveedores' },
    { label: 'Reportes',       icon: 'bar_chart',      link: '/reportes' },
    { label: 'Asistente IA',   icon: 'smart_toy',      link: '/asistente-ia' },
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

  // ── Alertas de stock (campanario + modal de login) ─────────────────────────

  /**
   * Reconstruye la lista de notificaciones de stock a partir de los
   * productos agotados/bajos actuales, conservando el estado "leída" de las
   * que ya existían (para no "reabrir" algo que el usuario ya marcó como
   * leído solo porque volvió a recalcularse).
   */
  private _sincronizarAlertasStock(sinStock: Producto[], stockBajo: Producto[]): void {
    const actuales = untracked(() => this.notificaciones());
    const previasPorId = new Map(actuales.map(n => [n.id, n]));

    // Notificaciones de otro origen (p.ej. la de seguridad, con id
    // negativo) no las administra este método — se conservan tal cual.
    const otras = actuales.filter(n => n.id < 0);
    const actualesStock = actuales.filter(n => n.id >= 0);

    const nuevasStock: Notificacion[] = [
      ...sinStock.map(p => this._crearNotifStock(p, 'agotado', previasPorId)),
      ...stockBajo.map(p => this._crearNotifStock(p, 'bajo', previasPorId)),
    ];

    if (!this._mismasNotifs(actualesStock, nuevasStock)) {
      this.notificaciones.set([...otras, ...nuevasStock]);
    }
  }

  private _crearNotifStock(
    p: Producto,
    tipo: 'agotado' | 'bajo',
    previasPorId: Map<number, Notificacion>,
  ): Notificacion {
    // ids estables por producto+tipo (no chocan con ids de futuras
    // notificaciones de otro origen mientras esos usen otro rango).
    const id = p.id * 10 + (tipo === 'agotado' ? 1 : 2);
    const previa = previasPorId.get(id);
    return {
      id,
      tipo: tipo === 'agotado' ? 'error' : 'warning',
      titulo: tipo === 'agotado' ? 'Producto agotado' : 'Stock bajo',
      descripcion: tipo === 'agotado'
        ? `"${p.nombre}" se quedó sin unidades disponibles.`
        : `"${p.nombre}" tiene ${p.stock} de ${p.stockMax} unidades.`,
      hora: previa?.hora ?? new Date(),
      leida: previa?.leida ?? false,
      icono: tipo === 'agotado' ? 'remove_shopping_cart' : 'warning',
      ruta: '/productos',
    };
  }

  private _mismasNotifs(a: Notificacion[], b: Notificacion[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((n, i) => n.id === b[i].id && n.leida === b[i].leida);
  }

  /**
   * Se ejecuta justo después de la primera carga de productos de la sesión
   * (ver el `constructor`). Si hay productos con stock bajo o agotado,
   * muestra el modal una sola vez por sesión iniciada — en web o en la app
   * móvil, sin importar si fue un login recién hecho o una sesión ya
   * guardada que se retoma al abrir la app. Si no hay novedades, no muestra
   * nada.
   */
  private _mostrarAlertaSiHayNovedad(): void {
    if (!this.notifPrefs.alertasStockActivas()) return;

    const productos = [
      ...this.productosService.productosSinStock(),
      ...this.productosService.productosStockBajo(),
    ];
    if (productos.length === 0) return;

    this.productosAlertaLogin.set(productos);
    this.mostrarAlertaLogin.set(true);
  }

  cerrarAlertaLogin(): void {
    this.mostrarAlertaLogin.set(false);
  }

  irAProductosDesdeAlerta(): void {
    this.mostrarAlertaLogin.set(false);
    this.router.navigate(['/productos']);
  }
}
