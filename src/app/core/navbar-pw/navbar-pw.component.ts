// src/app/core/navbar-pw/navbar-pw.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesitas CommonModule para *ngIf
import { RouterLink } from '@angular/router'; // Necesitas RouterLink para los enlaces routerLink
import { AuthService, UserProfile } from '../../services/auth.service'; // Importa AuthService y UserProfile
import { Observable } from 'rxjs'; // Importa Observable
import { switchMap } from 'rxjs/operators'; // Importa switchMap

@Component({
  selector: 'app-navbar-pw', // Asegúrate de que el selector sea este
  standalone: true,
  imports: [RouterLink, CommonModule], // Importa RouterLink y CommonModule
  templateUrl: './navbar-pw.component.html',
  styleUrls: ['./navbar-pw.component.css']
})
export class NavbarPwComponent {
  // Propiedad para almacenar el perfil del usuario (incluido el rol)
  userRole$: Observable<UserProfile | null>;

  constructor(public authService: AuthService) { // Hacemos authService público para usarlo en el HTML (*ngIf)
    // Escucha el cambio del usuario autenticado para obtener su rol
    this.userRole$ = this.authService.currentUser$.pipe(
      // Utiliza switchMap para pasar del Observable<User> de Firebase Auth
      // al Observable<UserProfile> de Firestore.
      // Si no hay usuario logueado (user es null), emitimos null para el userProfile.
      switchMap(user => {
        if (user && user.uid) {
          return this.authService.getUserRole(user.uid);
        } else {
          // Si no hay usuario, emitir un Observable que inmediatamente emite null
          // Esto es importante para que el pipe async funcione correctamente
          return new Observable<UserProfile | null>(observer => {
            observer.next(null);
            observer.complete();
          });
        }
      })
    );
  }

  // Método para cerrar sesión, llamado desde el botón en el HTML
  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Sesión cerrada exitosamente');
        // La redirección al login-pw ya la maneja el AuthService en el tap()
      },
      error: (err) => {
        console.error('Error al cerrar sesión:', err);
      }
    });
  }
}