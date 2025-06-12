// src/app/core/navbar-pw/navbar-pw.component.ts
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Observable } from 'rxjs';
import { switchMap, map } from 'rxjs/operators';

@Component({
  selector: 'app-navbar-pw',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar-pw.component.html',
  styleUrls: ['./navbar-pw.component.css']
})
export class NavbarPwComponent {
  userProfile$: Observable<UserProfile | null>;
  isMenuOpen: boolean = false;
  // Eliminamos userName$ de aquí, ya que la burbuja se mueve a AppComponent

  constructor(public authService: AuthService) {
    this.userProfile$ = this.authService.currentUser$.pipe(
      switchMap(user => {
        if (user && user.uid) {
          return this.authService.getUserProfile(user.uid);
        } else {
          return new Observable<UserProfile | null>(observer => {
            observer.next(null);
            observer.complete();
          });
        }
      })
    );
    // userName$ ya no se inicializa aquí
  }

  /**
   * Alterna el estado de apertura/cierre del menú de navegación en móviles.
   */
  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  // Método para cerrar sesión
  onLogout(): void {
    this.authService.logout().subscribe({
      next: () => {
        console.log('Sesión cerrada exitosamente');
        this.isMenuOpen = false; // Cerrar el menú hamburguesa
      },
      error: (err) => {
        console.error('Error al cerrar sesión:', err);
      }
    });
  }
}
