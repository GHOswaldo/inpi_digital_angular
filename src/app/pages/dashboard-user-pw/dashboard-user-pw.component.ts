// src/app/pages/dashboard-user-pw/dashboard-user-pw.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Para *ngFor, *ngIf
import { FormsModule } from '@angular/forms'; // Para ngModel si lo necesitaras en el futuro para filtros, etc.

// Interfaz para simular la estructura de un documento
interface Documento {
  id: string;
  nombre: string;
  tipo: string; // Ej: PDF, JPG, DOCX
  fechaSubida: string; // Fecha en formato legible
  url?: string; // URL de descarga (opcional, para futuras implementaciones)
}

@Component({
  selector: 'app-dashboard-user-pw',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-user-pw.component.html',
  styleUrls: ['./dashboard-user-pw.component.css']
})
export class DashboardUserPwComponent implements OnInit {
  selectedFile: File | null = null; // Para almacenar el archivo seleccionado por el usuario
  // Lista de documentos simulados que el becario ha subido
  // En el futuro, estos documentos se cargarán desde Firebase Firestore/Storage
  misDocumentos: Documento[] = [
    { id: 'doc1', nombre: 'Acta de Nacimiento', tipo: 'PDF', fechaSubida: '2025-01-15' },
    { id: 'doc2', nombre: 'Identificación Oficial', tipo: 'PDF', fechaSubida: '2025-02-20' },
    { id: 'doc3', nombre: 'Comprobante de Domicilio', tipo: 'PDF', fechaSubida: '2025-03-10' },
  ];

  constructor() { }

  ngOnInit(): void {
    // Aquí, en el futuro, podrías cargar los documentos existentes del becario desde Firebase.
  }

  // Método para manejar la selección de un archivo
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      console.log('Archivo seleccionado:', this.selectedFile.name);
    } else {
      this.selectedFile = null;
    }
  }

  // Método para simular la subida del archivo
  onUploadDocument(): void {
    if (!this.selectedFile) {
      alert('Por favor, selecciona un archivo para subir.');
      return;
    }

    // Aquí iría la lógica real de subida a Firebase Storage
    // Por ahora, simulamos que se sube y lo añadimos a la lista
    const newDoc: Documento = {
      id: `doc${this.misDocumentos.length + 1}`,
      nombre: this.selectedFile.name,
      tipo: this.selectedFile.type.split('/')[1]?.toUpperCase() || 'Archivo', // Ej: 'pdf', 'jpeg'
      fechaSubida: new Date().toISOString().split('T')[0] // Fecha actual
    };

    this.misDocumentos.push(newDoc);
    this.selectedFile = null; // Limpia el archivo seleccionado
    alert(`Documento "${newDoc.nombre}" subido exitosamente (simulado).`);
    // Limpiar el input de tipo file (requiere acceder al elemento DOM o resetear el formulario)
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // Métodos placeholder para futuras funcionalidades
  onDownloadDocument(documentoId: string): void {
    const doc = this.misDocumentos.find(d => d.id === documentoId);
    if (doc) {
      alert(`Descargando documento "${doc.nombre}" (lógica backend pendiente).`);
      // Lógica para descargar el archivo desde Firebase Storage
    }
  }

  onDeleteDocument(documentoId: string): void {
    if (confirm(`¿Estás seguro de que quieres eliminar este documento?`)) {
      alert(`Eliminando documento con ID: ${documentoId} (lógica backend pendiente).`);
      // Lógica para eliminar el archivo de Firebase Storage y de Firestore
      this.misDocumentos = this.misDocumentos.filter(doc => doc.id !== documentoId);
    }
  }
}