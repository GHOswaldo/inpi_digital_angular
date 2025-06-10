import { Component, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-login-pw',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],
  templateUrl: './login-pw.component.html',
  styleUrls: ['./login-pw.component.css']
})
export class LoginPwComponent {
  email = '';
  password = '';
  errorMessage: string | null = null;
  isOpen = false;

  constructor(private authService: AuthService, private router: Router, private injector: Injector) {}

  togglePanel() {
    this.isOpen = !this.isOpen;
  }

  closePanel() {
    this.isOpen = false;
  }

  async onSubmit() {
    this.errorMessage = null;

    try {
      const user = await this.authService.login(this.email, this.password).toPromise();

      if (user && user.uid) {
        // Limpiar los campos después de un inicio de sesión exitoso
        this.email = '';
        this.password = '';
        // Fin de la adición para limpiar campos

        runInInjectionContext(this.injector, () => {
          this.authService.getUserRole(user.uid).subscribe(userProfile => {
            if (userProfile && userProfile.role) {
              switch (userProfile.role) {
                case 'admin':
                  this.router.navigate(['/dashboard-pw']);
                  break;
                case 'cliente':
                  this.router.navigate(['/file-manager']);
                  break;
                case 'otro':
                  this.router.navigate(['/some-other-path']);
                  break;
                default:
                  console.warn(`Rol desconocido: ${userProfile.role}. Redirigiendo a /dashboard-pw.`);
                  this.router.navigate(['/dashboard-pw']);
              }
            } else {
              console.warn('Usuario logueado sin perfil de Firestore. Redirigiendo a /dashboard-pw por defecto.');
              this.router.navigate(['/dashboard-pw']);
            }
            this.closePanel();
          }, error => {
            console.error('Error al obtener el rol del usuario:', error);
            this.errorMessage = 'Error al verificar el rol del usuario. Inténtalo de nuevo.';
          });
        });

      } else {
        this.errorMessage = 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
      }
    } catch (error: any) {
      console.error('Error de login:', error);
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        this.errorMessage = 'Correo o contraseña incorrectos. Por favor, inténtalo de nuevo.';
      } else if (error.code === 'auth/invalid-email') {
        this.errorMessage = 'El formato del correo electrónico es inválido.';
      } else {
        this.errorMessage = 'Ha ocurrido un error inesperado al iniciar sesión. Inténtalo más tarde.';
      }
    }
  }
}