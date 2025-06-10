// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, signOut, User, createUserWithEmailAndPassword, sendPasswordResetEmail, user as authUserObservable } from '@angular/fire/auth';
import { Observable, from, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { Firestore, doc, setDoc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';

// Define una interfaz para el perfil de usuario en Firestore
export interface UserProfile {
  uid: string;
  email: string | null;
  role: 'admin' | 'cliente' | 'otro'; // Define los roles que necesites
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser$: Observable<User | null>; // Solo la declaración

  constructor(private auth: Auth, private firestore: Firestore, private router: Router) {
    // La inicialización se mueve aquí, donde 'this.auth' ya está disponible.
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
   * @param email El email del nuevo usuario.
   * @param password La contraseña del nuevo usuario.
   * @returns Un Observable que emite el objeto User del usuario registrado.
   */
  register(email: string, password: string): Observable<User | null> {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(userCredential => {
        const user = userCredential.user;
        if (user && user.uid) { // Asegúrate de que el user y su uid existan
          // Crear un documento de usuario en Firestore con un rol por defecto
          const userRef = doc(this.firestore, `users/${user.uid}`);
          // Creamos el perfil con uid, email y rol
          const userProfile: UserProfile = {
            uid: user.uid,
            email: user.email,
            role: 'cliente' // Rol por defecto
          };
          return from(setDoc(userRef, userProfile)).pipe(
            tap(() => console.log(`Perfil de usuario ${user.uid} creado en Firestore con rol: ${userProfile.role}`)),
            map(() => user) // Devuelve el usuario después de crear el documento
          );
        } else {
          // Si por alguna razón el usuario no se crea o no tiene UID
          console.error('No se pudo obtener información del usuario después del registro.');
          return of(null); // Emite null como un Observable
        }
      })
    );
  }

  /**
   * Obtiene el rol del usuario desde Firestore.
   * @param uid El UID del usuario.
   * @returns Un Observable que emite el perfil del usuario (incluyendo el rol) o null si no se encuentra.
   */
  getUserRole(uid: string): Observable<UserProfile | null> {
    const userRef = doc(this.firestore, `users/${uid}`);
    return from(getDoc(userRef)).pipe(
      map(snapshot => {
        if (snapshot.exists()) {
          return snapshot.data() as UserProfile;
        }
        return null;
      })
    );
  }

  /**
   * Cierra la sesión del usuario actual y redirige a la página de login.
   * @returns Un Observable que se completa cuando la sesión ha sido cerrada.
   */
  logout(): Observable<void> {
    return from(signOut(this.auth)).pipe(
      tap(() => {
        // Redirigir al login después de cerrar sesión
        this.router.navigate(['/login-pw']);
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