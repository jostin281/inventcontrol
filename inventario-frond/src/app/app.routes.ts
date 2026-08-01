import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login',   loadComponent: () => import('./pages/auth/login/login').then(m => m.Login) },
  { path: 'registro', loadComponent: () => import('./pages/auth/registro/registro').then(m => m.Registro) },

  { path: 'dashboard',    canActivate: [authGuard], loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard) },
  { path: 'productos',    canActivate: [authGuard], loadComponent: () => import('./pages/productos/lista-productos/lista-productos').then(m => m.ListaProductos) },
  { path: 'productos/nuevo', canActivate: [authGuard], loadComponent: () => import('./pages/productos/producto-form/producto-form').then(m => m.ProductoForm) },
  { path: 'productos/:id',   canActivate: [authGuard], loadComponent: () => import('./pages/productos/producto-detalle/producto-detalle').then(m => m.ProductoDetalle) },
  { path: 'categorias',   canActivate: [authGuard], loadComponent: () => import('./pages/categorias/categorias').then(m => m.Categorias) },
  { path: 'movimientos',  canActivate: [authGuard], loadComponent: () => import('./pages/movimientos/movimientos').then(m => m.Movimientos) },
  { path: 'proveedores',  canActivate: [authGuard], loadComponent: () => import('./pages/proveedores/proveedores').then(m => m.Proveedores) },
  { path: 'reportes',     canActivate: [authGuard], loadComponent: () => import('./pages/reportes/reportes').then(m => m.Reportes) },
  { path: 'asistente-ia', canActivate: [authGuard], loadComponent: () => import('./pages/asistente-ia/asistente-ia').then(m => m.AsistenteIa) },
  { path: 'configuracion',canActivate: [authGuard], loadComponent: () => import('./pages/configuracion/configuracion').then(m => m.Configuracion) },
  {
    path: 'ventas',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/ventas/ventas').then(m => m.Ventas),
  },
  {
    path: 'usuarios',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/usuarios/usuarios').then(m => m.Usuarios),
  },
  { path: '**', redirectTo: 'dashboard' }
];
