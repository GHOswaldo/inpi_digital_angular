// src/app/pages/dashboard-admin-pw/dashboard-admin-pw.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para *ngFor, *ngIf
import { FormsModule } from '@angular/forms'; // Necesario para ngModel en el input de búsqueda

// Interfaz para simular la estructura de un becario
interface Becario {
  id: string;
  nombre: string;
  email: string;
  rol: string; // En un futuro, podría ser 'becario'
  estado: string; // Activo, Inactivo, Pendiente
}

@Component({
  selector: 'app-dashboard-admin-pw',
  standalone: true,
  imports: [CommonModule, FormsModule], // Importa FormsModule
  templateUrl: './dashboard-admin-pw.component.html',
  styleUrls: ['./dashboard-admin-pw.component.css']
})
export class DashboardAdminPwComponent implements OnInit {
  // Datos de ejemplo para los becarios (luego vendrán del backend)
  becarios: Becario[] = [
    { id: '1', nombre: 'Juan Pérez', email: 'juan.perez@example.com', rol: 'cliente', estado: 'Activo' },
    { id: '2', nombre: 'María García', email: 'maria.garcia@example.com', rol: 'cliente', estado: 'Pendiente' },
    { id: '3', nombre: 'Carlos López', email: 'carlos.lopez@example.com', rol: 'cliente', estado: 'Activo' },
    { id: '4', nombre: 'Ana Martínez', email: 'ana.martinez@example.com', rol: 'cliente', estado: 'Inactivo' },
  ];

  filteredBecarios: Becario[] = [];
  searchTerm: string = '';

  constructor() { }

  ngOnInit(): void {
    this.filteredBecarios = [...this.becarios]; // Inicializa la lista filtrada con todos los becarios
  }

  // Método para manejar la búsqueda de becarios
  onSearch(): void {
    if (!this.searchTerm) {
      this.filteredBecarios = [...this.becarios];
      return;
    }
    const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
    this.filteredBecarios = this.becarios.filter(becario =>
      becario.nombre.toLowerCase().includes(lowerCaseSearchTerm) ||
      becario.email.toLowerCase().includes(lowerCaseSearchTerm) ||
      becario.estado.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }

  // Métodos placeholder para futuras funcionalidades
  onAddBecario(): void {
    alert('Funcionalidad para añadir becario (backend pendiente).');
    // Aquí iría la lógica para abrir un formulario o modal para añadir un becario
  }

  onViewDocuments(becarioId: string): void {
    alert(`Ver documentos del becario con ID: ${becarioId} (backend pendiente).`);
    // Aquí iría la lógica para navegar a una página de documentos o abrir un modal
  }

  onEditBecario(becarioId: string): void {
    alert(`Editar becario con ID: ${becarioId} (backend pendiente).`);
    // Aquí iría la lógica para editar la información del becario
  }

  onDeleteBecario(becarioId: string): void {
    if (confirm(`¿Estás seguro de que quieres eliminar al becario con ID: ${becarioId}?`)) {
      alert(`Eliminar becario con ID: ${becarioId} (backend pendiente).`);
      // Aquí iría la lógica para eliminar el becario del backend
      this.becarios = this.becarios.filter(b => b.id !== becarioId);
      this.onSearch(); // Refrescar la lista
    }
  }
}