import { Component, Injector, runInInjectionContext } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../services/auth.service'; // Importa UserProfile para tipado
import { Router, RouterLink } from '@angular/router';
import { take } from 'rxjs/operators'; // Necesario para .pipe(take(1))

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
      // Usamos .toPromise() en login, que es el patrón que ya tenías
      const user = await this.authService.login(this.email, this.password).toPromise();

      if (user && user.uid) {
        // Limpiar los campos después de un inicio de sesión exitoso
        this.email = '';
        this.password = '';

        runInInjectionContext(this.injector, () => {
          // CAMBIO CLAVE: Usa getUserProfile y aplica .pipe(take(1)) y tipado
          this.authService.getUserProfile(user.uid).pipe(take(1)).subscribe(
            (userProfile: UserProfile | null) => { // Tipado explícito para userProfile
              if (userProfile && userProfile.role) {
                switch (userProfile.role) {
                  case 'admin':
                    this.router.navigate(['/dashboard-admin-pw']); // Asegúrate de que esta es la ruta correcta
                    break;
                  case 'cliente':
                    this.router.navigate(['/dashboard-user-pw']); // Asegúrate de que esta es la ruta correcta
                    break;
                  case 'otro':
                    this.router.navigate(['/some-other-path']); // Si tienes otra ruta para 'otro'
                    break;
                  default:
                    console.warn(`Rol desconocido: ${userProfile.role}. Redirigiendo a /dashboard-admin-pw.`);
                    this.router.navigate(['/dashboard-admin-pw']); // Ruta por defecto
                }
              } else {
                console.warn('Usuario logueado sin perfil de Firestore. Redirigiendo a /dashboard-admin-pw por defecto.');
                this.router.navigate(['/dashboard-admin-pw']); // Ruta por defecto
              }
              this.closePanel(); // Cerrar el panel de login después de la redirección
            },
            (error: any) => { // Tipado explícito para error
              console.error('Error al obtener el perfil/rol del usuario:', error);
              this.errorMessage = 'Error al verificar el rol del usuario. Inténtalo de nuevo.';
            }
          );
        });

      } else {
        this.errorMessage = 'Credenciales inválidas. Por favor, verifica tu correo y contraseña.';
      }
    } catch (error: any) { // Tipado explícito para error en el catch principal
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
