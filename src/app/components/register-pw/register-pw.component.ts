import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router'; // Importar RouterLink para el enlace "Iniciar Sesión"

@Component({
  selector: 'app-register-pw',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink], // Asegúrate de tener RouterLink aquí
  templateUrl: './register-pw.component.html',
  styleUrls: ['./register-pw.component.css']
})
export class RegisterPwComponent {
  email = '';
  password = '';
  confirmPassword = '';
  errorMessage: string | null = null;

  // Eliminamos: isOpen = false;

  constructor(private authService: AuthService, private router: Router) {}

  // Eliminamos: togglePanel() { ... }
  // Eliminamos: closePanel() { ... }

  async onSubmit() {
    this.errorMessage = null;

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    try {
      const user = await this.authService.register(this.email, this.password).toPromise();
      console.log('Usuario registrado:', user);

      // Después de registrar, lo ideal es redirigir al login o al dashboard.
      // Para este caso, después de un registro exitoso, te redirigiré al login
      // para que el usuario inicie sesión con sus nuevas credenciales.
      this.router.navigate(['/login-pw']);

    } catch (error: any) {
      console.error('Error de registro:', error);
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'El correo electrónico ya está en uso.';
      } else if (error.code === 'auth/weak-password') {
        this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        this.errorMessage = 'El formato del correo electrónico es inválido.';
      } else {
        this.errorMessage = 'Error al registrar. Inténtalo de nuevo.';
      }
    }
  }
}