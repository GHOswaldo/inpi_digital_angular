import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Siempre es buena práctica incluir CommonModule

@Component({
  selector: 'app-footer-pw', // Asegúrate de que el selector sea este
  standalone: true,           // Marcar como standalone
  imports: [CommonModule],    // Importar CommonModule
  templateUrl: './footer-pw.component.html',
  styleUrls: ['./footer-pw.component.css']
})
export class FooterPwComponent {
  // No hay lógica específica necesaria para un pie de página estático.
  constructor() { }
}