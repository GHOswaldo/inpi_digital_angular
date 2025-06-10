// src/app/pages/edit-profile-user-pw/edit-profile-user-pw.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaz para simular el perfil del usuario (añadimos profileImageUrl)
interface UserProfileData {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion: string;
  ciudad: string;
  estado: string;
  codigoPostal: string;
  fechaNacimiento: string;
  profileImageUrl?: string; // URL de la foto de perfil (opcional)
}

@Component({
  selector: 'app-edit-profile-user-pw',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-profile-user-pw.component.html',
  styleUrls: ['./edit-profile-user-pw.component.css']
})
export class EditProfileUserPwComponent implements OnInit {
  userProfile: UserProfileData = {
    id: 'user123',
    nombre: 'Ternurín',
    apellido: 'Ternura',
    email: 'ternura.tierna@sylvanian.com',
    telefono: '55 1234 5678',
    direccion: 'Calle de la ternura 666',
    ciudad: 'Ternuralandia',
    estado: 'Distrito Ternuril',
    codigoPostal: '34000',
    fechaNacimiento: '2000-05-10',
    profileImageUrl: 'default-profile.jpg' // URL de imagen por defecto (crea esta imagen en assets)
  };

  originalProfile: UserProfileData | null = null;
  selectedProfileImageFile: File | null = null; // Para almacenar el archivo de imagen seleccionado

  constructor() { }

  ngOnInit(): void {
    this.originalProfile = { ...this.userProfile };
  }

  // Método para manejar la selección de un archivo de imagen de perfil
  onProfilePictureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Solo permite archivos de imagen
      if (file.type.startsWith('image/')) {
        this.selectedProfileImageFile = file;
        // Crea una URL temporal para mostrar la vista previa de la imagen
        const reader = new FileReader();
        reader.onload = () => {
          this.userProfile.profileImageUrl = reader.result as string;
        };
        reader.readAsDataURL(file);
      } else {
        alert('Por favor, selecciona un archivo de imagen (JPG, PNG, GIF).');
        this.selectedProfileImageFile = null;
        input.value = ''; // Limpia el input
      }
    } else {
      this.selectedProfileImageFile = null;
    }
  }

  // Método placeholder para la subida de la imagen (la lógica real con Firebase Storage)
  onUploadProfilePicture(): void {
    if (!this.selectedProfileImageFile) {
      alert('Por favor, selecciona una imagen para subir.');
      return;
    }
    alert(`Subiendo imagen: ${this.selectedProfileImageFile.name} (Lógica de Firebase Storage pendiente).`);
    // Aquí iría la llamada al servicio para subir la imagen a Firebase Storage
    // Cuando la subida sea exitosa, actualizarías userProfile.profileImageUrl
    // y limpiarías selectedProfileImageFile
    this.selectedProfileImageFile = null; // Simula que la subida fue exitosa y limpia el archivo
    const fileInput = document.getElementById('profilePictureInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }


  // Método para guardar los cambios (actualizado para incluir la foto de perfil)
  onSave(): void {
    // Aquí iría la lógica real para guardar los cambios en Firestore
    alert('Guardando información... (Lógica backend pendiente)');
    console.log('Perfil a guardar:', this.userProfile);

    // Si también hay una imagen seleccionada, podrías iniciar la subida aquí o en un botón separado
    if (this.selectedProfileImageFile) {
      this.onUploadProfilePicture(); // Llama a la función de subida (simulada por ahora)
    }

    this.originalProfile = { ...this.userProfile };
    alert('Información actualizada exitosamente!');
  }

  // Método para cancelar los cambios
  onCancel(): void {
    if (this.originalProfile) {
      this.userProfile = { ...this.originalProfile };
      // Si la URL de la imagen de perfil cambió, restaurarla también
      this.userProfile.profileImageUrl = this.originalProfile.profileImageUrl;
      this.selectedProfileImageFile = null; // Limpia el archivo seleccionado
      const fileInput = document.getElementById('profilePictureInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      alert('Cambios cancelados.');
    } else {
      console.warn('No hay perfil original para restaurar.');
    }
  }
}