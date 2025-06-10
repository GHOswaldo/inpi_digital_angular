// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LoginPwComponent } from './components/login-pw/login-pw.component';
import { RegisterPwComponent } from './components/register-pw/register-pw.component';
import { authGuardPw } from './guards/auth.guard-pw.guard';

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

  // --- Rutas de Autenticación ---
  { path: 'login-pw', component: LoginPwComponent },
  { path: 'register-pw', component: RegisterPwComponent },

  // --- Rutas Generales (ahora con nombres en español para coincidir con la navbar) ---
  {
    path: 'programas-pw', // CAMBIADO de 'programs-pw' a 'programas-pw'
    loadComponent: () => import('./pages/programas-pw/programas-pw.component').then(m => m.ProgramasPwComponent)
  },
  {
    path: 'acerca-de-pw', // CAMBIADO de 'about-pw' a 'acerca-de-pw'
    loadComponent: () => import('./pages/acerca-de-pw/acerca-de-pw.component').then(m => m.AcercaDePwComponent)
  },
  {
    path: 'ayuda-pw', // CAMBIADO de 'help-pw' a 'ayuda-pw'
    loadComponent: () => import('./pages/ayuda-pw/ayuda-pw.component').then(m => m.AyudaPwComponent)
  },

  // --- Rutas para ADMINISTRADOR (Protegidas por guard) ---
  {
    path: 'dashboard-admin-pw',
    loadComponent: () => import('./pages/dashboard-admin-pw/dashboard-admin-pw.component').then(m => m.DashboardAdminPwComponent),
    canActivate: [authGuardPw],
    data: { roles: ['admin'] }
  },
  {
    path: 'generate-letter-admin-pw',
    loadComponent: () => import('./pages/generate-letter-admin-pw/generate-letter-admin-pw.component').then(m => m.GenerateLetterAdminPwComponent),
    canActivate: [authGuardPw],
    data: { roles: ['admin'] }
  },

  // --- Rutas para CLIENTE (Becario) (Protegidas por guard) ---
  {
    path: 'dashboard-user-pw',
    loadComponent: () => import('./pages/dashboard-user-pw/dashboard-user-pw.component').then(m => m.DashboardUserPwComponent),
    canActivate: [authGuardPw],
    data: { roles: ['cliente'] }
  },
  {
    path: 'edit-profile-user-pw',
    loadComponent: () => import('./pages/edit-profile-user-pw/edit-profile-user-pw.component').then(m => m.EditProfileUserPwComponent),
    canActivate: [authGuardPw],
    data: { roles: ['cliente'] }
  },

  // --- Ruta Comodín ---
  { path: '**', redirectTo: 'home-pw' }
];