// src/app/services/auth.service.ts
import { Injectable, NgZone } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, User, createUserWithEmailAndPassword, sendPasswordResetEmail, user as authUserObservable } from '@angular/fire/auth';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';

// Define una interfaz para el perfil de usuario en Firestore
export interface UserProfile {
  uid: string;
  email: string | null;
  role: 'admin' | 'cliente' | 'otro';
  displayName?: string | null;

  nombres?: string | null;
  apellidos?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  estado?: string | null; // Geographic state/province
  codigoPostal?: string | null;
  fechaNacimiento?: string | null; // Format YYYY-MM-DD for input type="date"

  estadoBecario?: 'Activo' | 'Pendiente' | 'Inactivo' | string;
  programaApoyo?: string | null;
  fotoUrl?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser$: Observable<User | null>;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.currentUser$ = authUserObservable(this.auth);
  }

  /**
   * Inicia sesión con email y contraseña.
   * @param email El email del usuario.
   * @param password La contraseña del usuario.
   * @returns Un Observable que emite el objeto User del usuario logueado.
   */
  login(email: string, password: string): Observable<User> {
    return from(signInWithEmailAndPassword(this.auth, email, password)).pipe(
      map(userCredential => userCredential.user)
    );
  }

  /**
   * Registra un nuevo usuario con email y contraseña y crea su perfil en Firestore.
   * Ahora acepta un objeto con datos adicionales del perfil.
   * @param email El email del nuevo usuario.
   * @param password La contraseña del nuevo usuario.
   * @param additionalData Datos adicionales del perfil (nombres, apellidos, etc.).
   * @returns Un Observable que emite el objeto User del usuario registrado.
   */
  register(email: string, password: string, additionalData: Partial<UserProfile> = {}): Observable<User | null> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(userCredential => {
        const user = userCredential.user;
        if (user && user.uid) {
          const userRef = doc(this.firestore, `users/${user.uid}`);
          
          const defaultDisplayName = additionalData.nombres && additionalData.apellidos
            ? `${additionalData.nombres} ${additionalData.apellidos}`
            : email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, char => char.toUpperCase());

          const userProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            role: 'cliente',
            displayName: defaultDisplayName,
            nombres: additionalData.nombres || null,
            apellidos: additionalData.apellidos || null,
            telefono: additionalData.telefono || null,
            direccion: additionalData.direccion || null,
            ciudad: additionalData.ciudad || null,
            estado: additionalData.estado || null,
            codigoPostal: additionalData.codigoPostal || null,
            fechaNacimiento: additionalData.fechaNacimiento || null,
            estadoBecario: 'Pendiente',
            programaApoyo: null,
            fotoUrl: null
          };

          return from(setDoc(userRef, userProfile)).pipe(
            tap(() => console.log(`Perfil de usuario ${user.uid} creado en Firestore con rol: ${userProfile.role}, Nombre: ${userProfile.displayName}`)),
            map(() => user)
          );
        } else {
          console.error('No se pudo obtener información del usuario después del registro.');
          return of(null);
        }
      })
    );
  }

  /**
   * Obtiene el perfil completo del usuario desde Firestore, incluyendo el rol y el displayName.
   * @param uid El UID del usuario.
   * @returns Un Observable que emite el perfil del usuario (incluyendo el rol y displayName) o null si no se encuentra.
   */
  getUserProfile(uid: string): Observable<UserProfile | null> {
    const userRef = doc(this.firestore, `users/${uid}`);
    return from(this.ngZone.run(() => getDoc(userRef))).pipe(
      map(snapshot => {
        if (snapshot.exists()) {
          return snapshot.data() as UserProfile;
        }
        return null;
      }),
      tap({
        error: (error: any) => console.error('Error al obtener perfil de usuario en getUserProfile:', error)
      })
    );
  }

  /**
   * Cierra la sesión del usuario actual y redirige a la página de inicio.
   * @returns Un Observable que se completa cuando la sesión ha sido cerrada.
   */
  logout(): Observable<void> {
    return from(signOut(this.auth)).pipe(
      tap(() => {
        this.router.navigate(['/home-pw']);
      })
    );
  }

  /**
   * Envía un correo electrónico de restablecimiento de contraseña.
   * @param email El correo electrónico del usuario.
   * @returns Un Observable que se completa cuando el correo ha sido enviado.
   */
  sendPasswordReset(email: string): Observable<void> {
    return from(sendPasswordResetEmail(this.auth, email));
  }

  /**
   * Devuelve un Observable que emite `true` si hay un usuario autenticado, `false` en caso contrario.
   * Útil para guards de ruta.
   * @returns Observable<boolean>
   */
  isAuthenticated(): Observable<boolean> {
    return this.currentUser$.pipe(map(user => !!user));
  }
}
