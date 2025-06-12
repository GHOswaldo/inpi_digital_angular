import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { DocumentUploadCardPwComponent } from '../../shared/document-upload-card-pw/document-upload-card-pw.component';

// Firebase imports
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, onAuthStateChanged, Auth, User } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, Firestore, onSnapshot, query, DocumentData } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, FirebaseStorage, StorageReference } from 'firebase/storage';
import { Observable, Subject, takeUntil } from 'rxjs';

// Definir una interfaz para el estado de cada documento
interface DocumentState {
  name: string; // Nombre amigable del documento (ej. "Acta de nacimiento")
  file: File | null; // El objeto File si ha sido seleccionado localmente
  status: 'pending' | 'selected' | 'uploaded' | 'error' | 'uploading'; // Estado actual del documento
  url: SafeResourceUrl | null; // URL segura para previsualización (Blob URL o Firebase Storage URL)
  firestoreUrl: string | null; // URL de descarga final desde Firebase Storage
  isUploading?: boolean; // Para indicar si un archivo se está subiendo
  uploadProgress?: number; // Progreso de la subida (0-100)
  errorMessage?: string; // Para mostrar errores específicos al usuario
}

// Global variables provided by the Canvas environment (MUST BE USED)
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

@Component({
  selector: 'app-dashboard-user-pw',
  standalone: true,
  imports: [
    CommonModule,
    DocumentUploadCardPwComponent
  ],
  templateUrl: './dashboard-user-pw.component.html',
  styleUrl: './dashboard-user-pw.component.css'
})
export class DashboardUserPwComponent implements OnInit, OnDestroy {

  // Firebase Instances
  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private storage: FirebaseStorage | null = null;

  userId: string | null = null; // UID del usuario autenticado
  isAuthReady: boolean = false; // Indica si el estado de autenticación ya fue verificado

  private unsubscribe$ = new Subject<void>(); // Para desuscribirse de listeners de Firebase

  // Lista de los 7 documentos requeridos, confirmada.
  documentTypes: string[] = [
    'Acta de nacimiento',
    'CURP',
    'Constancia de calificaciones',
    'Solicitud de beca',
    'INE',
    'Cuenta de banco',
    'Comprobante de domicilio'
  ];

  // Estado local de los documentos del becario, indexado por su nombre.
  documents: { [key: string]: DocumentState } = {};

  currentDocumentIndex: number = 0; // Índice del documento visible en el carrusel

  currentPreviewUrl: SafeResourceUrl | null = null; // URL para el iframe de previsualización
  currentPreviewFileName: string | null = null; // Nombre del archivo actualmente previsualizado

  constructor(private sanitizer: DomSanitizer) { }

  async ngOnInit(): Promise<void> {
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

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

      onAuthStateChanged(this.auth, async (user) => {
        if (user) {
          this.userId = user.uid;
          this.isAuthReady = true;
          console.log('User authenticated. UID:', this.userId);
          this.initializeDocumentStates();
          this.loadDocumentsFromFirestore();
        } else {
          this.userId = null;
          this.isAuthReady = true;
          console.warn('No hay usuario autenticado. Acceso a documentos restringido.');
        }
      });

      if (typeof __initial_auth_token !== 'undefined' && this.auth && !this.auth.currentUser) {
        try {
          console.log('Attempting to sign in with custom token...');
          await signInWithCustomToken(this.auth, __initial_auth_token);
        } catch (error: any) { // CORRECCIÓN AQUÍ: error: any
          console.error('Error al iniciar sesión con el token personalizado:', error);
        }
      } else if (this.auth && this.auth.currentUser) {
        console.log('User already signed in from previous session or token. No custom token sign-in attempted.');
      }

    } catch (error: any) { // CORRECCIÓN AQUÍ: error: any
      console.error('Error crítico al inicializar o obtener servicios de Firebase:', error);
      //alert('Error crítico: No se pudo inicializar la aplicación. Por favor, contacta a soporte.');
    }
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  private initializeDocumentStates(): void {
    this.documentTypes.forEach(docName => {
      this.documents[docName] = {
        name: docName,
        file: null,
        status: 'pending',
        url: null,
        firestoreUrl: null,
        isUploading: false,
        uploadProgress: 0,
        errorMessage: undefined
      };
    });
  }

  private loadDocumentsFromFirestore(): void {
    if (!this.db || !this.userId) {
      console.warn('Firestore o ID de usuario no disponible para cargar documentos.');
      return;
    }

    const userDocsCollectionRef = collection(this.db, `users/${this.userId}/documentos`);

    onSnapshot(userDocsCollectionRef, (snapshot) => {
      snapshot.docChanges().forEach(change => {
        const docData = change.doc.data();
        const docName = docData['nombreTipo'] as string;
        const firestoreUrl = docData['urlDescarga'] as string | null;
        const fileName = docData['nombreArchivo'] as string | null;

        if (docName && this.documents[docName]) {
          const currentDocState = this.documents[docName];
          currentDocState.firestoreUrl = firestoreUrl;
          currentDocState.status = firestoreUrl ? 'uploaded' : 'pending';
          currentDocState.errorMessage = undefined;

          if (firestoreUrl) {
            currentDocState.file = new File([], fileName || docName, { type: 'application/pdf' });
            currentDocState.url = this.sanitizer.bypassSecurityTrustResourceUrl(firestoreUrl);
          } else {
            currentDocState.file = null;
            currentDocState.url = null;
          }
        }
      });
      console.log('Documentos cargados/actualizados desde Firestore:', this.documents);

      this.updatePreviewForCurrentDocument();

    }, (error: any) => { // CORRECCIÓN AQUÍ: error: any
      console.error('Error al escuchar documentos:', error);
      //alert('Error al cargar los documentos. Por favor, intenta de nuevo más tarde.');
    });
  }

  prevDocument(): void {
    this.currentDocumentIndex = (this.currentDocumentIndex === 0) ?
      this.documentTypes.length - 1 :
      this.currentDocumentIndex - 1;
    this.updatePreviewForCurrentDocument();
  }

  nextDocument(): void {
    this.currentDocumentIndex = (this.currentDocumentIndex === this.documentTypes.length - 1) ?
      0 :
      this.currentDocumentIndex + 1;
    this.updatePreviewForCurrentDocument();
  }

  private updatePreviewForCurrentDocument(): void {
    const currentDocName = this.documentTypes[this.currentDocumentIndex];
    const currentDocState = this.documents[currentDocName];

    if (currentDocState) {
      if (currentDocState.file && currentDocState.status === 'selected') {
        this.onPreviewRequest({ documentName: currentDocName, file: currentDocState.file });
      }
      else if (currentDocState.status === 'uploaded' && currentDocState.firestoreUrl) {
        this.onPreviewRequest({ documentName: currentDocName, file: null });
      }
      else {
        this.currentPreviewUrl = null;
        this.currentPreviewFileName = null;
      }
    } else {
      this.currentPreviewUrl = null;
      this.currentPreviewFileName = null;
    }
  }

  isActive(index: number): boolean {
    return this.currentDocumentIndex === index;
  }

  onFileChange(event: { documentName: string, file: File | null }): void {
    const doc = this.documents[event.documentName];
    if (doc) {
      doc.file = event.file;
      doc.errorMessage = undefined;

      if (event.file) {
        doc.status = 'selected';
        doc.url = this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(event.file));
        doc.firestoreUrl = null;
      } else {
        doc.status = 'pending';
        doc.url = null;
        doc.firestoreUrl = null;
      }
      if (this.documentTypes[this.currentDocumentIndex] === event.documentName) {
        this.updatePreviewForCurrentDocument();
      }
    }
  }

  onPreviewRequest(event: { documentName: string, file: File | null }): void {
    const docState = this.documents[event.documentName];

    if (event.file && docState.status === 'selected') {
      this.currentPreviewFileName = event.file.name;
      this.currentPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(event.file));
    }
    else if (docState && docState.url) {
      this.currentPreviewFileName = docState.name + (docState.firestoreUrl ? " (Desde la nube)" : "");
      this.currentPreviewUrl = docState.url;
    }
    else {
      this.currentPreviewFileName = null;
      this.currentPreviewUrl = null;
    }
  }

  onFileRemoved(event: { documentName: string }): void {
    const doc = this.documents[event.documentName];
    if (doc) {
      if (doc.firestoreUrl && this.storage && this.userId && this.db) {
        this.deleteFileFromStorage(event.documentName, doc.firestoreUrl);
      } else {
        doc.file = null;
        doc.status = 'pending';
        doc.url = null;
        doc.firestoreUrl = null;
        doc.errorMessage = undefined;
        this.updatePreviewForCurrentDocument();
      }
    }
  }

  async deleteFileFromStorage(docName: string, downloadUrl: string): Promise<void> {
    if (!this.storage || !this.userId || !this.db) {
      console.error('Servicios de Firebase no inicializados o UID de usuario no disponible para eliminar.');
      this.documents[docName].errorMessage = 'Error: Servicios no disponibles para eliminar.';
      return;
    }

    const docState = this.documents[docName];
    if (!docState) return;

    docState.isUploading = true;
    docState.status = 'uploading'; // O un estado 'deleting' si lo creamos
    docState.errorMessage = undefined;

    try {
      const path = decodeURIComponent(downloadUrl.split('/o/')[1].split('?')[0]);
      const fileRef = ref(this.storage, path);
      await deleteObject(fileRef);
      console.log(`Documento "${docName}" eliminado de Storage.`);

      const normalizedDocName = docName.replace(/\s+/g, '');
      const docRef = doc(this.db, `users/${this.userId}/documentos`, normalizedDocName);
      await setDoc(docRef, { urlDescarga: null, nombreArchivo: null, fechaSubida: null }, { merge: true });
      console.log(`Metadatos del documento "${docName}" limpiados en Firestore.`);

      docState.file = null;
      docState.status = 'pending';
      docState.url = null;
      docState.firestoreUrl = null;
      docState.isUploading = false;
      docState.uploadProgress = 0;

      this.updatePreviewForCurrentDocument();
      alert(`Documento "${docName}" eliminado con éxito.`);
    } catch (error: any) { // CORRECCIÓN AQUÍ: error: any
      console.error(`Error al eliminar "${docName}" de Storage o Firestore:`, error);
      docState.status = 'error';
      docState.errorMessage = `Error al eliminar el archivo: ${error.message}`;
      docState.isUploading = false;
      //alert(`Error al eliminar el documento "${docName}". Revisa la consola.`);
    }
  }

  canSaveExpedient(): boolean {
    if (!this.isAuthReady || !this.userId) {
      return false;
    }

    const hasSelectedFiles = this.documentTypes.some(docName => this.documents[docName].status === 'selected');
    const allDocumentsUploaded = this.documentTypes.every(docName => this.documents[docName].status === 'uploaded');
    const hasUploadingFiles = this.documentTypes.some(docName => this.documents[docName].status === 'uploading');
    const hasErrorInFiles = this.documentTypes.some(docName => this.documents[docName].status === 'error');

    return (hasSelectedFiles || allDocumentsUploaded) && !hasUploadingFiles && !hasErrorInFiles;
  }

  async saveExpedient(): Promise<void> {
    console.log('>>> saveExpedient() ha sido llamado. <<<');

    if (!this.db || !this.storage || !this.userId) {
      console.error('Servicios de Firebase no inicializados o UID de usuario no disponible.');
      //alert('Error: Servicios de Firebase no disponibles.');
      return;
    }

    console.log('Intentando guardar expediente completo...');
    const uploadPromises: Promise<void>[] = [];

    for (const docName of this.documentTypes) {
      const docState = this.documents[docName];

      if (docState.file && docState.status === 'selected' && !docState.isUploading) {
        docState.isUploading = true;
        docState.status = 'uploading';
        docState.uploadProgress = 0;
        docState.errorMessage = undefined;

        const normalizedDocName = docName.replace(/\s+/g, '');
        const filePath = `users/${this.userId}/documentos/${normalizedDocName}_${docState.file.name}`;
        console.log('Ruta de Storage para el documento:', filePath);
        const fileRef = ref(this.storage, filePath);
        const uploadTask = uploadBytesResumable(fileRef, docState.file);

        const uploadPromise = new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              docState.uploadProgress = Math.round(progress);
            },
            (error: any) => { // CORRECCIÓN AQUÍ: error: any
              console.error(`Error al subir "${docName}":`, error);
              docState.status = 'error';
              docState.errorMessage = `Error al subir: ${error.message}`;
              docState.isUploading = false;
              reject(error);
            },
            async () => {
              try {
                const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                docState.firestoreUrl = downloadURL;
                docState.isUploading = false;
                docState.status = 'uploaded';

                const docRef = doc(this.db!, `users/${this.userId}/documentos`, normalizedDocName);
                await setDoc(docRef, {
                  nombreTipo: docName,
                  urlDescarga: downloadURL,
                  nombreArchivo: docState.file!.name,
                  fechaSubida: new Date()
                }, { merge: true });

                console.log(`Documento "${docName}" subido y metadatos guardados:`, downloadURL);
                resolve();
              } catch (error: any) { // CORRECCIÓN AQUÍ: error: any
                console.error(`Error al obtener URL de descarga o guardar en Firestore para "${docName}":`, error);
                docState.status = 'error';
                docState.errorMessage = `Error al guardar URL: ${error.message}`;
                docState.isUploading = false;
                reject(error);
              }
            }
          );
        });
        uploadPromises.push(uploadPromise);
      }
    }

    if (uploadPromises.length === 0) {
      //alert('No hay nuevos documentos seleccionados o modificados para guardar.');
      return;
    }

    try {
      await Promise.all(uploadPromises);
      //alert('Expediente guardado con éxito.');
    } catch (error: any) { // CORRECCIÓN AQUÍ: error: any
      //alert('Hubo un error al guardar algunos documentos. Por favor, revisa la consola para más detalles.');
    }
  }
}
