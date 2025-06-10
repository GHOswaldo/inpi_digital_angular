// src/app/pages/generate-letter-admin-pw/generate-letter-admin-pw.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para *ngFor, *ngIf
import { FormsModule } from '@angular/forms'; // Necesario para ngModel

// Interfaz para simular un becario (similar a la del dashboard)
interface Becario {
  id: string;
  nombre: string;
  email: string;
}

@Component({
  selector: 'app-generate-letter-admin-pw',
  standalone: true,
  imports: [CommonModule, FormsModule], // Importa FormsModule para el select y input
  templateUrl: './generate-letter-admin-pw.component.html',
  styleUrls: ['./generate-letter-admin-pw.component.css']
})
export class GenerateLetterAdminPwComponent implements OnInit {
  // Datos de ejemplo para los becarios (luego vendrán del backend)
  becarios: Becario[] = [
    { id: '1', nombre: 'Juan Pérez', email: 'juan.perez@example.com' },
    { id: '2', nombre: 'María García', email: 'maria.garcia@example.com' },
    { id: '3', nombre: 'Carlos López', email: 'carlos.lopez@example.com' },
    { id: '4', nombre: 'Ana Martínez', email: 'ana.martinez@example.com' },
  ];

  selectedBecarioId: string | null = null; // ID del becario seleccionado en el dropdown
  letterContent: string = ''; // Contenido de la carta (simulado)

  constructor() { }

  ngOnInit(): void {
    // Aquí podrías cargar la lista de becarios desde un servicio si ya tuvieras el backend listo
  }

  // Método para manejar la generación de la carta
  onGenerateLetter(): void {
    if (!this.selectedBecarioId) {
      alert('Por favor, selecciona un becario.');
      return;
    }
    const selectedBecario = this.becarios.find(b => b.id === this.selectedBecarioId);
    if (selectedBecario) {
      // Simulación del contenido de la carta
      this.letterContent = `Estimado(a) ${selectedBecario.nombre},\n\nPor medio de la presente, sí autorizo.\n\nAtentamente,\nEL INPI PUESKIENMAS`;
      alert(`Carta generada para ${selectedBecario.nombre}. (Lógica de generación de PDF pendiente).`);
      // Aquí en un futuro se integrará la llamada al backend para generar el PDF
    } else {
      alert('Becario no encontrado.');
    }
  }

  // Método para manejar la descarga de la carta (placeholder)
  onDownloadLetter(): void {
    if (this.letterContent) {
      alert('Descargando carta... (Lógica de descarga de PDF pendiente).');
      // Aquí en un futuro se integrará la lógica para descargar el PDF generado
    } else {
      alert('No hay contenido de carta para descargar. Genera una carta primero.');
    }
  }
}