// src/app/guards/auth.guard-pw.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, UserProfile } from '../services/auth.service'; // Importa UserProfile
import { map, take, switchMap, catchError } from 'rxjs/operators'; // Añade switchMap y catchError
import { of } from 'rxjs'; // Añade 'of'

export const authGuardPw: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Obtiene los roles esperados de la propiedad 'data' de la ruta.
  // Es crucial que esta propiedad exista en la definición de la ruta en app.routes.ts, por ejemplo:
  // { path: 'dashboard-admin-pw', canActivate: [authGuardPw], data: { roles: ['admin'] } }
  const expectedRoles = route.data?.['roles'] as Array<UserProfile['role']>;

  return authService.currentUser$.pipe(
    take(1), // Toma solo el primer valor emitido por currentUser$ y luego completa
    switchMap(user => {
      if (!user) {
        // Si no hay usuario logueado, lo redirigimos a la página de login
        console.log('Guard: No hay usuario logueado. Redirigiendo a /login-pw.');
        return of(router.createUrlTree(['/login-pw'])); // Devuelve un UrlTree para la redirección
      }

      // Si hay un usuario logueado, obtenemos su perfil para verificar el rol
      return authService.getUserRole(user.uid).pipe(
        map(userProfile => {
          // Si no se especifican roles esperados para la ruta, o si el usuario tiene el perfil y el rol coinciden
          if (!expectedRoles || expectedRoles.length === 0 || (userProfile && expectedRoles.includes(userProfile.role))) {
            // El usuario está logueado y tiene el rol correcto (o no se requiere un rol específico)
            return true;
          } else {
            // El usuario está logueado, pero no tiene el rol requerido para esta ruta
            console.warn(`Guard: Acceso denegado. Usuario logueado con rol '${userProfile?.role}' no tiene los roles requeridos: ${expectedRoles}.`);
            // Puedes redirigirlo a una página de "acceso denegado", a su propio dashboard, o al login
            return router.createUrlTree(['/login-pw']); // Redirige al login, puedes cambiarlo
          }
        }),
        // Manejo de errores en caso de que no se pueda obtener el perfil del usuario (ej. documento no existe)
        catchError((error) => {
          console.error('Guard: Error al obtener el perfil del usuario:', error);
          // Si hay un error al obtener el perfil, consideramos que no tiene acceso
          return of(router.createUrlTree(['/login-pw']));
        })
      );
    })
  );
};