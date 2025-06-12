import { Component, AfterViewInit } from '@angular/core'; // Ya no ViewChild
import { CommonModule } from '@angular/common';
// Eliminado: LoginPwComponent ya no se importa aquí
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { LoginPanelService } from '../../services/login-panel-pw.service';
import { Observable } from 'rxjs';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-home-pw',
  standalone: true,
  imports: [
    CommonModule,
    // Eliminado: LoginPwComponent ya no se importa aquí
    RouterLink
  ],
  templateUrl: './home-pw.component.html',
  styleUrls: ['./home-pw.component.css']
})
export class HomePwComponent implements AfterViewInit {
  // Eliminado: @ViewChild(LoginPwComponent) loginPanel: LoginPwComponent | undefined;

  currentUser$: Observable<User | null>;

  constructor(
    private authService: AuthService,
    private loginPanelService: LoginPanelService // Inyecta el nuevo servicio
  ) {
    this.currentUser$ = this.authService.currentUser$;
  }

  ngAfterViewInit(): void { }

  /**
   * Envía una señal al LoginPanelService para que se abra/cierre el panel de login.
   * Este método será llamado por el botón "Iniciar sesión" en la plantilla.
   */
  triggerLoginPanel(): void {
    this.loginPanelService.toggleLoginPanel();
  }
}
