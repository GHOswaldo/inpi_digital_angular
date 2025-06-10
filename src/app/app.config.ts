// src/app/app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

export const appConfig: ApplicationConfig = { // <--- ¡Asegúrate que tenga 'export const appConfig'!
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes), provideFirebaseApp(() => initializeApp({ projectId: "inpi-pw", appId: "1:509802139506:web:d93e7593cd3b8d757817eb", storageBucket: "inpi-pw.firebasestorage.app", apiKey: "AIzaSyAA9BobRQeIRkgy-6Y7ltkBZQ8GuLHYdXQ", authDomain: "inpi-pw.firebaseapp.com", messagingSenderId: "509802139506" })), provideAuth(() => getAuth()), provideFirestore(() => getFirestore())]
};