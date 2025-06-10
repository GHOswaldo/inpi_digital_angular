import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service'; // Importa el AuthService
import { Router } from '@angular/router'; // Importa Router

@Component({
  selector: 'app-dashboard-pw',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-pw.component.html',
  styleUrls: ['./dashboard-pw.component.css']
})
export class DashboardPwComponent {
  constructor(private authService: AuthService, private router: Router) {}

  async onLogout() {
    try {
      await this.authService.logout().toPromise(); // Cierra la sesión
      // Redirige al usuario a la página de login después de cerrar sesión
      this.router.navigate(['/login-pw']);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Opcional: mostrar un mensaje de error al usuario si el logout falla
    }
  }
}