import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Para *ngFor

interface InfoCard {
  id: string;
  titulo: string;
  contenido: string;
  icono?: string; // Opcional, para un futuro ícono
}

@Component({
  selector: 'app-about-pw',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './acerca-de-pw.component.html',
  styleUrls: ['./acerca-de-pw.component.css']
})
export class AcercaDePwComponent {
  infoCards: InfoCard[] = [
    {
      id: 'q1',
      titulo: '¿Quiénes somos?',
      contenido: 'El **Instituto Nacional de los Pueblos Indígenas (INPI)** es la institución del Gobierno de México encargada de garantizar los derechos de los pueblos indígenas y afromexicano. Trabajamos para fortalecer su cultura, autonomía y desarrollo integral.'
    },
    {
      id: 'q2',
      titulo: '¿Qué hacemos?',
      contenido: 'Diseñamos e implementamos políticas públicas para el pleno ejercicio de los derechos de los pueblos indígenas. Esto incluye programas de desarrollo económico, social, cultural y lingüístico, siempre con un enfoque de respeto a sus tradiciones y formas de organización.'
    },
    {
      id: 'q3',
      titulo: '¿Para quiénes somos?',
      contenido: 'Nuestra labor está dirigida a todas las comunidades, pueblos y personas indígenas y afromexicanas de México. Nos comprometemos a trabajar de la mano con ellos para construir un futuro de bienestar y justicia.'
    },
    {
      id: 'q4',
      titulo: 'Nuestra misión',
      contenido: 'Ser el eje de las políticas públicas para garantizar el reconocimiento, protección y desarrollo de los pueblos indígenas y afromexicano, promoviendo su participación plena y efectiva en la vida nacional.'
    }
  ];
}