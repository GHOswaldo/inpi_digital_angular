// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router'; // RouterOutlet es necesario para mostrar las rutas
import { NavbarPwComponent } from './core/navbar-pw/navbar-pw.component';
import { FooterPwComponent } from './core/footer-pw/footer-pw.component';
// import { LoginPwComponent } from './components/login-pw/login-pw.component'; // <-- ¡ELIMINA ESTA IMPORTACIÓN!

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    NavbarPwComponent,
    FooterPwComponent
    // LoginPwComponent // <-- ¡ELIMINA ESTA LÍNEA DE LOS IMPORTS!
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'inpi-pw';
}