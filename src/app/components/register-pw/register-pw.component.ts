import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UserProfile } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { getFirestore, collection, getDocs, Firestore } from 'firebase/firestore';
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';

// Variables globales de Canvas (obligatorio usar)
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;

@Component({
  selector: 'app-register-pw',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register-pw.component.html',
  styleUrls: ['./register-pw.component.css']
})
export class RegisterPwComponent implements OnInit {
  email = '';
  password = '';
  confirmPassword = '';
  nombres = '';
  apellidos = '';
  telefono = '';
  direccion = '';
  ciudad = '';
  estado = '';
  codigoPostal = '';
  fechaNacimiento = '';
  errorMessage: string | null = null;

  mexicanStates: string[] = [];

  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

      console.log('ngOnInit: Initializing Firebase...');
      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
        console.log('ngOnInit: Firebase app initialized.');
      } else {
        this.app = getApp();
        console.log('ngOnInit: Firebase app already exists, retrieved default app instance.');
      }
      this.db = getFirestore(this.app);
      console.log('ngOnInit: Firestore instance obtained.');

      await this.fetchMexicanStates();
    } catch (error: any) {
      console.error('ngOnInit Error: Critical error during Firebase initialization or state fetching:', error);
      this.errorMessage = 'Error al cargar la aplicación. Inténtalo de nuevo más tarde.';
    }
  }

  async fetchMexicanStates(): Promise<void> {
    if (!this.db) {
      console.warn('fetchMexicanStates: Firestore is not initialized. Cannot fetch states.');
      this.errorMessage = 'Error: Firestore no está disponible para cargar los estados.';
      return;
    }
    console.log('fetchMexicanStates: Attempting to fetch states from "estadosMex" collection...');
    try {
      const collectionRef = collection(this.db, 'estadosMex');
      console.log('fetchMexicanStates: Collection reference obtained. Getting documents...');
      const querySnapshot = await getDocs(collectionRef);
      
      if (querySnapshot.empty) {
        console.warn('fetchMexicanStates: No documents found in "estadosMex" collection. Please ensure it is populated.');
        this.errorMessage = 'No se encontraron estados en la base de datos.';
        return;
      }

      this.mexicanStates = querySnapshot.docs.map(doc => {
        const data = doc.data();
        if (data && data['nombre']) {
          return data['nombre'] as string;
        } else {
          console.warn('fetchMexicanStates: Document found without a "nombre" field:', doc.id);
          return null;
        }
      }).filter(state => state !== null) as string[]; // Filtra los nulos si algún doc no tiene 'nombre'
      
      this.mexicanStates.sort(); // Ordenar alfabéticamente
      console.log('fetchMexicanStates: States loaded successfully:', this.mexicanStates);
      this.errorMessage = null; // Clear any previous error message related to states
    } catch (error: any) {
      console.error('fetchMexicanStates Error: Failed to retrieve Mexican states from Firestore:', error);
      // Más detalles del error para el usuario
      if (error.code === 'permission-denied') {
        this.errorMessage = 'Error de permisos: Asegúrate de que las reglas de Firestore permitan la lectura de la colección "estadosMex" para usuarios autenticados.';
      } else {
        this.errorMessage = `Error al cargar los estados: ${error.message}.`;
      }
    }
  }

  async onSubmit() {
    this.errorMessage = null;

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden.';
      return;
    }

    if (this.codigoPostal.length !== 5 || !/^\d{5}$/.test(this.codigoPostal)) {
      this.errorMessage = 'El código postal debe ser numérico y tener 5 dígitos.';
      return;
    }

    const additionalData: Partial<UserProfile> = {
      nombres: this.nombres,
      apellidos: this.apellidos,
      telefono: this.telefono,
      direccion: this.direccion,
      ciudad: this.ciudad,
      estado: this.estado,
      codigoPostal: this.codigoPostal,
      fechaNacimiento: this.fechaNacimiento
    };

    try {
      const user = await this.authService.register(this.email, this.password, additionalData).toPromise();
      console.log('Usuario registrado:', user);
      this.router.navigate(['/home-pw']);
    } catch (error: any) {
      console.error('Registration Error:', error);
      if (error.code === 'auth/email-already-in-use') {
        this.errorMessage = 'El correo electrónico ya está en uso.';
      } else if (error.code === 'auth/weak-password') {
        this.errorMessage = 'La contraseña debe tener al menos 6 caracteres.';
      } else if (error.code === 'auth/invalid-email') {
        this.errorMessage = 'El formato del correo electrónico es inválido.';
      } else {
        this.errorMessage = 'Error al registrar. Inténtalo de nuevo.';
      }
    }
  }
}
