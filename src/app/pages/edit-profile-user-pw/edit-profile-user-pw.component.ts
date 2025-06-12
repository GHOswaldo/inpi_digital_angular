// src/app/pages/edit-profile-user-pw/edit-profile-user-pw.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser'; // Importar DomSanitizer

// Firebase imports
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, Auth, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, Firestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, FirebaseStorage } from 'firebase/storage';

// Interfaz para el perfil del usuario (reflejando la estructura de Firestore)
interface UserProfileData {
  id: string; // uid de Firebase
  apellidos: string;
  ciudad: string;
  codigoPostal: string;
  direccion: string;
  displayName: string;
  email: string;
  estado: string;
  fechaNacimiento: string;
  fotoUrl: string | null; // Cambiado de 'profileImageUrl' a 'fotoUrl' para coincidir con Firestore
  nombres: string; // Cambiado de 'nombre' a 'nombres'
  telefono: string;
  profileImageUrl?: string; // Para la URL local o temporal de la imagen en el componente
}

// Global variables provided by the Canvas environment (MUST BE USED)
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

@Component({
  selector: 'app-edit-profile-user-pw',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-profile-user-pw.component.html',
  styleUrls: ['./edit-profile-user-pw.component.css']
})
export class EditProfileUserPwComponent implements OnInit {

  // Firebase Instances
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private storage: FirebaseStorage | null = null;

  userId: string | null = null; // UID del usuario autenticado
  isAuthReady: boolean = false; // Indica si el estado de autenticación ya fue verificado

  userProfile: UserProfileData = {
    id: '', // Se llenará con el UID del usuario
    nombres: '',
    apellidos: '',
    email: '',
    telefono: '',
    direccion: '',
    ciudad: '',
    estado: '',
    codigoPostal: '',
    fechaNacimiento: '',
    fotoUrl: null, // Debería cargarse desde Firebase
    displayName: '', // Se generará o cargará
    // Propiedades adicionales no mapeadas directamente a la interfaz de Firestore,
    // pero necesarias para el flujo del componente
    profileImageUrl: 'assets/default-profile.png' // URL de imagen por defecto
  };

  originalProfile: UserProfileData | null = null;
  selectedProfileImageFile: File | null = null; // Para almacenar el archivo de imagen seleccionado
  uploadProgress: number = 0;
  isUploadingImage: boolean = false;

  constructor(private sanitizer: DomSanitizer) { } // Inyectar DomSanitizer

  async ngOnInit(): Promise<void> {
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

      // Verifica si ya hay una aplicación Firebase inicializada.
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
        console.log('Firebase app initialized.');
      } else {
        this.app = getApp();
        console.log('Firebase app already exists, retrieved default app instance.');
      }

      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.storage = getStorage(this.app);

      // Listener para cambios en el estado de autenticación
      if (this.auth) {
        onAuthStateChanged(this.auth, async (user) => {
          if (user) {
            this.userId = user.uid;
            this.isAuthReady = true;
            this.userProfile.id = user.uid; // Set the user ID in the profile data
            this.userProfile.email = user.email || ''; // Set email from auth
            console.log('User authenticated. UID:', this.userId);
            await this.loadUserProfile(); // Cargar el perfil del usuario desde Firestore
          } else {
            this.userId = null;
            this.isAuthReady = true;
            console.warn('No user authenticated. Profile editing functionality may be limited.');
            this.showMessageBox('Por favor, inicia sesión para editar tu perfil.');
          }
        });

        // Intentar iniciar sesión con token de Canvas si está disponible y no hay usuario actual
        if (typeof __initial_auth_token !== 'undefined' && !this.auth.currentUser) {
          try {
            console.log('Attempting to sign in with custom token...');
            await signInWithCustomToken(this.auth, __initial_auth_token);
          } catch (error: any) {
            console.error('Error al iniciar sesión con el token personalizado:', error);
          }
        } else if (this.auth.currentUser) {
          console.log('User already signed in from previous session or token. No custom token sign-in attempted.');
        }
      } else {
        console.error('Firebase Auth service is null. Cannot set up auth listener.');
        this.showMessageBox('Error crítico: El servicio de autenticación de Firebase no se inicializó correctamente.');
      }

    } catch (error: any) {
      console.error('Error crítico al inicializar o obtener servicios de Firebase:', error);
      this.showMessageBox('Error crítico: No se pudo inicializar la aplicación. Por favor, contacta a soporte.');
    }
  }

  // Cargar el perfil del usuario desde Firestore
  async loadUserProfile(): Promise<void> {
    if (!this.db || !this.userId) {
      console.warn('Firestore o User ID no disponible para cargar el perfil.');
      return;
    }

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        this.userProfile = {
          id: this.userId,
          nombres: data['nombres'] || '',
          apellidos: data['apellidos'] || '',
          email: data['email'] || this.userProfile.email, // Keep existing email if not in Firestore
          telefono: data['telefono'] || '',
          direccion: data['direccion'] || '',
          ciudad: data['ciudad'] || '',
          estado: data['estado'] || '',
          codigoPostal: data['codigoPostal'] || '',
          fechaNacimiento: data['fechaNacimiento'] || '',
          fotoUrl: data['fotoUrl'] || null,
          displayName: data['displayName'] || '',
          profileImageUrl: data['fotoUrl'] || 'assets/default-profile.png' // Use fotoUrl for display
        };
        this.originalProfile = { ...this.userProfile }; // Guardar una copia para el "cancelar"
        console.log('Perfil de usuario cargado:', this.userProfile);
      } else {
        console.log('Documento de perfil de usuario no encontrado. Se creará uno nuevo al guardar.');
        // Initialize originalProfile even if no document exists, for a clean state
        this.originalProfile = { ...this.userProfile };
      }
    } catch (error: any) {
      console.error('Error al cargar el perfil del usuario:', error);
      this.showMessageBox('Error al cargar tu perfil. Intenta de nuevo más tarde.');
    }
  }


  // Método para manejar la selección de un archivo de imagen de perfil
  onProfilePictureSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      // Validar tamaño del archivo (2MB) y tipo
      if (file.size > 2 * 1024 * 1024) { // 2MB
        this.showMessageBox('El tamaño máximo permitido para la imagen es 2MB.');
        this.selectedProfileImageFile = null;
        input.value = ''; // Limpia el input
        return;
      }
      if (!file.type.startsWith('image/')) {
        this.showMessageBox('Por favor, selecciona un archivo de imagen (JPG, PNG, GIF).');
        this.selectedProfileImageFile = null;
        input.value = ''; // Limpia el input
        return;
      }

      this.selectedProfileImageFile = file;
      // Crea una URL temporal para mostrar la vista previa de la imagen
      const reader = new FileReader();
      reader.onload = () => {
        this.userProfile.profileImageUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedProfileImageFile = null;
    }
  }

  // Método para subir la imagen de perfil a Firebase Storage
  async onUploadProfilePicture(): Promise<void> {
    if (!this.selectedProfileImageFile) {
      this.showMessageBox('Por favor, selecciona una imagen para subir.');
      return;
    }
    if (!this.storage || !this.userId || !this.db) {
      this.showMessageBox('Error: Servicios de Firebase no disponibles para subir imagen.');
      return;
    }

    this.isUploadingImage = true;
    this.uploadProgress = 0;

    try {
      const fileExtension = this.selectedProfileImageFile.name.split('.').pop();
      const fileName = `${this.userId}_${new Date().getTime()}.${fileExtension}`; // Nombre único
      const filePath = `profile_pictures/${this.userId}/${fileName}`;
      const fileRef = ref(this.storage, filePath);
      const uploadTask = uploadBytesResumable(fileRef, this.selectedProfileImageFile);

      uploadTask.on('state_changed',
        (snapshot) => {
          this.uploadProgress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        },
        (error: any) => { // Corregido: 'error' es de tipo 'unknown'
          console.error('Error al subir la imagen de perfil:', error);
          this.showMessageBox(`Error al subir la imagen: ${error.message}`);
          this.isUploadingImage = false;
          this.uploadProgress = 0;
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            this.userProfile.fotoUrl = downloadURL; // Actualiza fotoUrl en el perfil de usuario
            this.userProfile.profileImageUrl = downloadURL; // También actualiza la URL de visualización
            
            // Actualizar la fotoUrl en Firestore
            const userDocRef = doc(this.db!, 'users', this.userId!);
            await setDoc(userDocRef, { fotoUrl: downloadURL }, { merge: true });

            this.showMessageBox('Foto de perfil subida exitosamente!');
            this.selectedProfileImageFile = null; // Limpia el archivo seleccionado
            const fileInput = document.getElementById('profilePictureInput') as HTMLInputElement;
            if (fileInput) {
              fileInput.value = '';
            }
            this.isUploadingImage = false;
            this.uploadProgress = 0;
          } catch (error: any) { // Corregido: 'error' es de tipo 'unknown'
            console.error('Error al obtener URL de descarga o actualizar Firestore:', error);
            this.showMessageBox(`Error al procesar la imagen: ${error.message}`);
            this.isUploadingImage = false;
            this.uploadProgress = 0;
          }
        }
      );
    } catch (error: any) { // Corregido: 'error' es de tipo 'unknown'
      console.error('Error en el proceso de subida de imagen:', error);
      this.showMessageBox(`Error inesperado al subir la imagen: ${error.message}`);
      this.isUploadingImage = false;
      this.uploadProgress = 0;
    }
  }

  // Método para eliminar la foto de perfil
  async deleteProfilePicture(): Promise<void> {
    if (!this.userProfile.fotoUrl) {
      this.showMessageBox('No hay foto de perfil para eliminar.');
      return;
    }
    if (!this.storage || !this.userId || !this.db) {
      this.showMessageBox('Error: Servicios de Firebase no disponibles para eliminar imagen.');
      return;
    }

    try {
      // 1. Eliminar de Firebase Storage
      const oldPhotoRef = ref(this.storage, this.userProfile.fotoUrl);
      await deleteObject(oldPhotoRef);
      console.log('Foto de perfil eliminada de Storage.');

      // 2. Actualizar Firestore para eliminar la referencia a la foto
      const userDocRef = doc(this.db, 'users', this.userId);
      await setDoc(userDocRef, { fotoUrl: null }, { merge: true });

      this.userProfile.fotoUrl = null;
      this.userProfile.profileImageUrl = 'assets/default-profile.png'; // Restablecer a la imagen por defecto
      this.showMessageBox('Foto de perfil eliminada exitosamente.');

    } catch (error: any) { // Corregido: 'error' es de tipo 'unknown'
      console.error('Error al eliminar la foto de perfil:', error);
      this.showMessageBox(`Error al eliminar la foto: ${error.message}`);
    }
  }


  // Método para guardar los cambios (actualizado para incluir la foto de perfil)
  async onSave(): Promise<void> {
    if (!this.db || !this.userId) {
      this.showMessageBox('Error: Servicios de Firebase no disponibles para guardar información.');
      return;
    }

    this.showMessageBox('Guardando información...');
    console.log('Perfil a guardar:', this.userProfile);

    try {
      const userDocRef = doc(this.db, 'users', this.userId);
      // Preparar los datos a guardar, excluyendo 'profileImageUrl' que es solo para el frontend
      const dataToSave = {
        nombres: this.userProfile.nombres,
        apellidos: this.userProfile.apellidos,
        email: this.userProfile.email,
        telefono: this.userProfile.telefono,
        direccion: this.userProfile.direccion,
        ciudad: this.userProfile.ciudad,
        estado: this.userProfile.estado,
        codigoPostal: this.userProfile.codigoPostal,
        fechaNacimiento: this.userProfile.fechaNacimiento,
        fotoUrl: this.userProfile.fotoUrl, // Asegurarse de que fotoUrl se guarde
        displayName: `${this.userProfile.nombres} ${this.userProfile.apellidos}` // Actualizar displayName
      };
      await setDoc(userDocRef, dataToSave, { merge: true });

      // Si también hay una imagen seleccionada, la subimos (si no se subió ya con el botón)
      if (this.selectedProfileImageFile && !this.isUploadingImage) {
        await this.onUploadProfilePicture(); // Esperar a que la subida de la foto se complete
      }
      
      this.originalProfile = { ...this.userProfile }; // Actualizar la copia original después de guardar
      this.showMessageBox('Información actualizada exitosamente!');
    } catch (error: any) { // Corregido: 'error' es de tipo 'unknown'
      console.error('Error al guardar el perfil:', error);
      this.showMessageBox(`Error al guardar la información: ${error.message}`);
    }
  }

  // Método para cancelar los cambios
  onCancel(): void {
    if (this.originalProfile) {
      this.userProfile = { ...this.originalProfile };
      // Restaurar la URL de la imagen de perfil a la original
      this.userProfile.profileImageUrl = this.originalProfile.fotoUrl || 'assets/default-profile.png';
      this.selectedProfileImageFile = null; // Limpia el archivo seleccionado
      this.uploadProgress = 0;
      this.isUploadingImage = false;
      const fileInput = document.getElementById('profilePictureInput') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      this.showMessageBox('Cambios cancelados.');
    } else {
      console.warn('No hay perfil original para restaurar.');
      this.showMessageBox('No hay cambios para cancelar.');
    }
  }

  // --- Custom Message Box (instead of alert) ---
  private showMessageBox(message: string): void {
    console.log("APP MESSAGE:", message);
    // Aquí podrías implementar una UI más avanzada para mostrar el mensaje,
    // como un modal, un snackbar, etc.
  }
}
