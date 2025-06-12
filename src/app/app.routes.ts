// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginPwComponent } from './components/login-pw/login-pw.component';
import { RegisterPwComponent } from './components/register-pw/register-pw.component';

// CAMBIO CLAVE 1: Importa 'authGuardPwGuard' con el nombre correcto de exportación
import { authGuardPwGuard } from './guards/auth-pw.guard';
// CAMBIO CLAVE 2: Importa el nuevo 'noAuthGuard'
import { noAuthGuard } from './guards/no-auth-pw.guard';

export const routes: Routes = [
  // --- Ruta de Inicio ---
  {
    path: '',
    redirectTo: 'home-pw',
    pathMatch: 'full'
  },
  {
    path: 'home-pw',
    loadComponent: () => import('./pages/home-pw/home-pw.component').then(m => m.HomePwComponent)
  },

  // --- Rutas de Autenticación (AHORA PROTEGIDAS CON noAuthGuard) ---
  {
    path: 'login-pw',
    component: LoginPwComponent,
    canActivate: [noAuthGuard] // CAMBIO CLAVE 3: Aplica el noAuthGuard aquí
  },
  {
    path: 'register-pw',
    component: RegisterPwComponent,
    canActivate: [noAuthGuard] // CAMBIO CLAVE 4: Aplica el noAuthGuard aquí
  },

  // --- Rutas Generales ---
  {
    path: 'programas-pw',
    loadComponent: () => import('./pages/programas-pw/programas-pw.component').then(m => m.ProgramasPwComponent)
  },
  {
    path: 'acerca-de-pw',
    loadComponent: () => import('./pages/acerca-de-pw/acerca-de-pw.component').then(m => m.AcercaDePwComponent)
  },
  {
    path: 'ayuda-pw',
    loadComponent: () => import('./pages/ayuda-pw/ayuda-pw.component').then(m => m.AyudaPwComponent)
  },

  // --- Rutas para ADMINISTRADOR (Protegidas por authGuardPwGuard) ---
  {
    path: 'dashboard-admin-pw',
    loadComponent: () => import('./pages/dashboard-admin-pw/dashboard-admin-pw.component').then(m => m.DashboardAdminPwComponent),
    canActivate: [authGuardPwGuard], // Ya usaba el nombre correcto, lo mantengo.
    data: { roles: ['admin'] }
  },
  {
    path: 'generate-letter-admin-pw',
    loadComponent: () => import('./pages/generate-letter-admin-pw/generate-letter-admin-pw.component').then(m => m.GenerateLetterAdminPwComponent),
    canActivate: [authGuardPwGuard], // Ya usaba el nombre correcto, lo mantengo.
    data: { roles: ['admin'] }
  },

  // --- Rutas para CLIENTE (Becario) (Protegidas por authGuardPwGuard) ---
  {
    path: 'dashboard-user-pw',
    loadComponent: () => import('./pages/dashboard-user-pw/dashboard-user-pw.component').then(m => m.DashboardUserPwComponent),
    canActivate: [authGuardPwGuard], // Ya usaba el nombre correcto, lo mantengo.
    data: { roles: ['cliente'] }
  },
  {
    path: 'edit-profile-user-pw',
    loadComponent: () => import('./pages/edit-profile-user-pw/edit-profile-user-pw.component').then(m => m.EditProfileUserPwComponent),
    canActivate: [authGuardPwGuard], // Ya usaba el nombre correcto, lo mantengo.
    data: { roles: ['cliente'] }
  },

  // --- Ruta Comodín ---
  { path: '**', redirectTo: 'home-pw' }
];
