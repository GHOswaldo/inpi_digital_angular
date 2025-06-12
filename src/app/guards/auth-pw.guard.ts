// src/app/guards/auth.guard-pw.guard.ts
import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { AuthService, UserProfile } from '../services/auth.service'; // Importa UserProfile para tipado
import { map, take, switchMap, catchError } from 'rxjs/operators';
import { of, Observable } from 'rxjs'; // Asegúrate de importar Observable

// Exporta una función que actuará como guard
export const authGuardPwGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtiene los roles esperados de la propiedad 'data' de la ruta.
  // Es crucial que esta propiedad exista en la definición de la ruta en app.routes.ts, por ejemplo:
  // { path: 'dashboard-admin-pw', canActivate: [authGuardPwGuard], data: { roles: ['admin'] } }
  const expectedRoles = route.data?.['roles'] as Array<UserProfile['role'] | string>; // Puede ser string para flexibilidad

  return authService.currentUser$.pipe(
    take(1), // Toma solo el primer valor emitido por currentUser$ y luego completa
    switchMap(user => {
      if (!user) {
        // Si no hay usuario logueado, lo redirigimos a la página de login
        console.log('Guard: No hay usuario logueado. Redirigiendo a /login-pw.');
        return of(router.createUrlTree(['/login-pw'])); // Devuelve un UrlTree para la redirección
      }

      // Si hay un usuario logueado, obtenemos su perfil para verificar el rol
      // CAMBIO CLAVE: Usa getUserProfile y aplica .pipe(take(1)) y tipado
      return authService.getUserProfile(user.uid).pipe(
        take(1), // Toma el primer valor y se completa para evitar escuchas continuas
        map((userProfile: UserProfile | null) => { // Tipado explícito para userProfile
          // Si no se especifican roles esperados para la ruta,
          // o si el usuario tiene el perfil y el rol coinciden
          if (!expectedRoles || expectedRoles.length === 0 || (userProfile && expectedRoles.includes(userProfile.role))) {
            // El usuario está logueado y tiene el rol correcto (o no se requiere un rol específico)
            return true;
          } else {
            // El usuario está logueado, pero no tiene el rol requerido para esta ruta
            console.warn(`Guard: Acceso denegado. Usuario logueado con rol '${userProfile?.role}' no tiene los roles requeridos: ${expectedRoles.join(', ')}.`);
            // Redirige a una ruta por defecto o de error (ej. al dashboard de admin por simplicidad)
            return router.createUrlTree(['/dashboard-admin-pw']); // Cambia a la ruta que consideres más adecuada para "acceso denegado"
          }
        }),
        // Manejo de errores en caso de que no se pueda obtener el perfil del usuario (ej. documento no existe)
        catchError((error: any) => { // Tipado explícito para error
          console.error('Guard: Error al obtener el perfil del usuario:', error);
          // Si hay un error al obtener el perfil, consideramos que no tiene acceso
          return of(router.createUrlTree(['/login-pw'])); // Redirige al login en caso de error
        })
      );
    })
  );
};
