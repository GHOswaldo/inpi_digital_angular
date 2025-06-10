import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Para *ngFor, *ngIf
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; // Para sanitizar URLs de YouTube

interface PreguntaFrecuente {
  id: string;
  pregunta: string;
  respuesta: string;
  abierta: boolean; // Para controlar si la respuesta está visible
}

@Component({
  selector: 'app-help-pw',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ayuda-pw.component.html',
  styleUrls: ['./ayuda-pw.component.css']
})
export class AyudaPwComponent {
  faqs: PreguntaFrecuente[] = [
    {
      id: 'faq1',
      pregunta: '¿Cómo funciona el proceso de postulación a un programa?',
      respuesta: 'El proceso inicia con el registro en nuestra plataforma, donde se te pedirá información básica. Luego, podrás seleccionar el programa de tu interés y subir los documentos requeridos en tu sección de "Mis Documentos". Un equipo revisará tu postulación y te notificará sobre el estado.',
      abierta: false
    },
    {
      id: 'faq2',
      pregunta: '¿Qué documentos necesito para subir mi información?',
      respuesta: 'Generalmente se requiere identificación oficial, comprobante de domicilio, acta de nacimiento, y documentos específicos del programa al que aplicas (ej. historial académico, constancias). Consulta la sección de "Mis Documentos" para ver los requerimientos específicos.',
      abierta: false
    },
    {
      id: 'faq3',
      pregunta: '¿Puedo editar mi información personal después de registrarme?',
      respuesta: 'Sí, puedes editar tu información personal en cualquier momento desde la sección "Editar Información Personal" de tu perfil de usuario. Recuerda guardar los cambios para que se apliquen.',
      abierta: false
    },
    {
      id: 'faq4',
      pregunta: '¿Cómo puedo verificar el estado de mi solicitud o beca?',
      respuesta: 'El estado de tu solicitud o beca se actualizará en tu Dashboard de Becario. También recibirás notificaciones por correo electrónico sobre cualquier cambio o requerimiento adicional.',
      abierta: false
    },
    {
      id: 'faq5',
      pregunta: '¿Qué hago si tengo problemas para subir un documento?',
      respuesta: 'Verifica que el archivo no exceda el tamaño máximo permitido y que esté en uno de los formatos aceptados (PDF, DOCX, JPG, PNG). Si el problema persiste, intenta con otro navegador o contacta a nuestro equipo de soporte.',
      abierta: false
    }
  ];

  // ID del video de YouTube para la sección de ayuda
  helpVideoId: string = 'O7UyyeFoXxY'; // Ejemplo de video tutorial o informativo

  constructor(private sanitizer: DomSanitizer) {}

  // Método para alternar la visibilidad de la respuesta
  toggleFaq(faq: PreguntaFrecuente): void {
    faq.abierta = !faq.abierta;
  }

  // Método para obtener la URL segura del video de YouTube
  getSafeYouTubeUrl(videoId: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
  }
}