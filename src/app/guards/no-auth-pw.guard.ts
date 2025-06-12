// src/app/guards/no-auth.guard.ts
import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService, UserProfile } from '../services/auth.service'; // Importa AuthService y UserProfile
import { Observable, of } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';

// Este guard se usará en rutas como /login-pw y /register-pw
// Su propósito es redirigir a los usuarios que ya están logueados lejos de estas páginas,
// y gestionar el acceso a login/register para usuarios no logueados.
export const noAuthGuard: CanActivateFn = (
  route, // Acceso a la información de la ruta actual
  state
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtenemos el path de la ruta que se está intentando activar
  const currentPath = route.routeConfig?.path;

  return authService.currentUser$.pipe(
    take(1), // Tomamos solo el valor actual del usuario y nos desuscribimos
    switchMap(user => {
      if (user) {
        // SCENARIO 1: EL USUARIO ESTÁ LOGUEADO
        // Si un usuario ya logueado intenta ir a login o register, lo redirigimos a su dashboard
        return authService.getUserProfile(user.uid).pipe(
          take(1), // También tomamos un solo valor del perfil
          map((userProfile: UserProfile | null) => {
            if (userProfile && userProfile.role === 'admin') {
              console.log('Guard: Usuario admin logueado intentando acceder a ruta de auth, redirigiendo a /dashboard-admin-pw.');
              return router.createUrlTree(['/dashboard-admin-pw']);
            } else if (userProfile && userProfile.role === 'cliente') {
              console.log('Guard: Usuario cliente logueado intentando acceder a ruta de auth, redirigiendo a /dashboard-user-pw.');
              return router.createUrlTree(['/dashboard-user-pw']);
            } else {
              // En caso de rol desconocido o sin perfil, redirigir a un valor seguro
              console.warn('Guard: Usuario logueado con rol desconocido, redirigiendo a /home-pw.');
              return router.createUrlTree(['/home-pw']);
            }
          })
        );
      } else {
        // SCENARIO 2: EL USUARIO NO ESTÁ LOGUEADO
        if (currentPath === 'login-pw') {
          // Si el usuario no está logueado y intenta acceder a /login-pw, redirigimos a /home-pw
          console.log('Guard: Usuario no logueado intentando acceder a /login-pw, redirigiendo a /home-pw.');
          return of(router.createUrlTree(['/home-pw']));
        } else if (currentPath === 'register-pw') {
          // Si el usuario no está logueado y intenta acceder a /register-pw, PERMITIMOS el acceso
          console.log('Guard: Usuario no logueado intentando acceder a /register-pw, PERMITIENDO acceso.');
          return of(true); // Permite el acceso a la página de registro
        }
        // Fallback para cualquier otra ruta que este guard pudiera estar protegiendo (poco probable si solo se aplica a login/register)
        console.warn('Guard: Usuario no logueado en una ruta inesperada para este guard, redirigiendo a /home-pw.');
        return of(router.createUrlTree(['/home-pw']));
      }
    })
  );
};
