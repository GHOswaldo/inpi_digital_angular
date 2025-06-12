import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Para *ngFor, *ngIf
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; // Para sanitizar URLs de YouTube

interface Programa {
  id: string;
  nombre: string;
  imagenUrl: string; // URL de una imagen representativa del programa
  youtubeVideoId: string; // ID del video de YouTube (ej. 'dQw4w9WgXcQ')
  descripcion: string;
}

@Component({
  selector: 'app-programas-pw',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './programas-pw.component.html',
  styleUrls: ['./programas-pw.component.css']
})
export class ProgramasPwComponent implements OnInit {
  // Datos simulados de los programas
  programas: Programa[] = [
    {
      id: 'p1',
      nombre: 'Programa de Apoyo a Proyectos Productivos',
      imagenUrl: 'p1.jpeg', // Asegúrate de crear esta imagen
      youtubeVideoId: 'MTcUo0jz-PA', // Ejemplo: Video sobre apoyo rural
      descripcion: 'Impulsamos proyectos productivos en comunidades indígenas, fomentando la autonomía económica y el desarrollo sostenible. Apoyamos desde la planificación hasta la comercialización de productos tradicionales y agrícolas.'
    },
    {
      id: 'p2',
      nombre: 'Programa de Becas para Jóvenes Indígenas',
      imagenUrl: 'p2.jpeg', // Asegúrate de crear esta imagen
      youtubeVideoId: 'fRw2M6qtYBc', // Ejemplo: Video sobre becas
      descripcion: 'Ofrecemos becas educativas a jóvenes indígenas que buscan continuar con sus estudios en nivel superior. Creemos en el poder de la educación para transformar vidas y comunidades.'
    },
    {
      id: 'p3',
      nombre: 'Programa de Fortalecimiento de Lenguas Indígenas',
      imagenUrl: 'p3.jpeg', // Asegúrate de crear esta imagen
      youtubeVideoId: 'EX2lAkVwTYU', // Ejemplo: Video sobre lenguas
      descripcion: 'Trabajamos para preservar y revitalizar las lenguas originarias de México a través de talleres, materiales didácticos y actividades culturales. Las lenguas son el corazón de nuestra identidad.'
    }
  ];

  constructor(private sanitizer: DomSanitizer) { }

  ngOnInit(): void {
    // Aquí puedes cargar programas desde un servicio si tuvieras un backend
  }

  // Método para obtener la URL segura del video de YouTube
  getSafeYouTubeUrl(videoId: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.youtube.com/embed/${videoId}`);
  }
}