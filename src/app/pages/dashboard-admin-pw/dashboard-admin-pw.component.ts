import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

// Firebase imports
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getAuth, Auth, User, onAuthStateChanged } from 'firebase/auth';
// Importar QuerySnapshot y DocumentChange para tipado correcto
import { getFirestore, collection, query, where, onSnapshot, Firestore, doc, setDoc, getDocs, QuerySnapshot, DocumentChange } from 'firebase/firestore'; 
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject, FirebaseStorage } from 'firebase/storage';
import { getFunctions, httpsCallable, Functions } from 'firebase/functions';


import { UserProfile } from '../../services/auth.service'; // Asegúrate de que esta interfaz es correcta y accesible
import { DocumentUploadCardPwComponent } from '../../shared/document-upload-card-pw/document-upload-card-pw.component';

interface DocumentState {
  name: string;
  file: File | null;
  status: 'pending' | 'selected' | 'uploaded' | 'error' | 'uploading';
  url: SafeResourceUrl | null;
  firestoreUrl: string | null;
  isUploading?: boolean;
  uploadProgress?: number;
  errorMessage?: string;
}

// Variables globales de Canvas (obligatorio usar)
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;
declare const __initial_auth_token: string | undefined;

@Component({
  selector: 'app-dashboard-admin-pw',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DocumentUploadCardPwComponent
  ],
  templateUrl: './dashboard-admin-pw.component.html',
  styleUrl: './dashboard-admin-pw.component.css'
})
export class DashboardAdminPwComponent implements OnInit, OnDestroy {

  private app: FirebaseApp | null = null;
  private auth: Auth | null = null;
  private db: Firestore | null = null;
  private storage: FirebaseStorage | null = null;
  private functions: Functions | null = null;

  adminUserId: string | null = null;
  isAuthReady: boolean = false;
  private unsubscribeListeners: (() => void)[] = [];

  allBecarios: UserProfile[] = [];
  filteredBecarios: UserProfile[] = [];
  searchTerm: string = '';

  showDetailsPanel: boolean = false;
  selectedBecario: UserProfile | null = null;
  panelMode: 'info' | 'documents' | null = null;

  mexicanStates: string[] = [];

  documentTypes: string[] = [
    'Acta de nacimiento',
    'CURP',
    'Constancia de calificaciones',
    'Solicitud de beca',
    'INE',
    'Cuenta de banco',
    'Comprobante de domicilio'
  ];
  documents: { [key: string]: DocumentState } = {};
  currentPreviewUrl: SafeResourceUrl | null = null;
  currentPreviewFileName: string | null = null;
  currentDocumentIndex: number = 0;

  constructor(private sanitizer: DomSanitizer) { }

  async ngOnInit(): Promise<void> {
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
        console.log('Firebase app initialized in admin dashboard.');
      } else {
        this.app = getApp();
        console.log('Firebase app already exists, retrieved default app instance in admin dashboard.');
      }

      this.auth = getAuth(this.app);
      this.db = getFirestore(this.app);
      this.storage = getStorage(this.app);
      this.functions = getFunctions(this.app);

      await this.fetchMexicanStates();

      if (this.auth) { // Asegurarse de que 'this.auth' no sea null
        onAuthStateChanged(this.auth, async (user) => {
          if (user) {
            this.adminUserId = user.uid;
            this.isAuthReady = true;
            console.log('Admin authenticated. UID:', this.adminUserId);
            this.loadBecarios();
          } else {
            this.adminUserId = null;
            this.isAuthReady = true;
            console.warn('No admin user authenticated. Access to admin dashboard restricted.');
            this.showMessageBox('Acceso no autorizado. Por favor, inicie sesión como administrador.'); // Reemplazado alert
          }
        });
      } else {
        console.error('Firebase Auth service is null. Cannot set up auth listener.');
        this.showMessageBox('Error crítico: El servicio de autenticación de Firebase no se inicializó correctamente.'); // Reemplazado alert
      }


    } catch (error: any) { // Tipado 'error: any'
      console.error('Error crítico al inicializar Firebase en dashboard-admin-pw:', error);
      this.showMessageBox('Error crítico: No se pudo inicializar la aplicación de administración.'); // Reemplazado alert
    }
  }

  ngOnDestroy(): void {
    this.unsubscribeListeners.forEach(unsub => unsub());
  }

  async fetchMexicanStates(): Promise<void> {
    if (!this.db) {
      console.warn('fetchMexicanStates: Firestore no está inicializado para cargar estados.');
      return;
    }
    try {
      const querySnapshot = await getDocs(collection(this.db, 'estadosMex'));
      this.mexicanStates = querySnapshot.docs.map(doc => doc.data()['nombre'] as string).sort();
      console.log('Estados de México cargados en Admin Dashboard:', this.mexicanStates);
    } catch (error: any) { // Tipado 'error: any'
      console.error('fetchMexicanStates Error: Failed to retrieve Mexican states from Firestore in Admin Dashboard:', error);
    }
  }

  private loadBecarios(): void {
    if (!this.db || !this.adminUserId) {
      console.warn('Firestore o Admin User ID no disponible para cargar becarios.');
      return;
    }

    const usersCollectionRef = collection(this.db, 'users');
    const q = query(usersCollectionRef, where('role', '==', 'cliente'));

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot) => {
      this.allBecarios = snapshot.docs.map(doc => {
        const data = doc.data() as UserProfile;
        return {
          ...data,
          uid: doc.id,
          nombres: data.nombres || null,
          apellidos: data.apellidos || null,
          telefono: data.telefono || null,
          direccion: data.direccion || null,
          ciudad: data.ciudad || null,
          estado: data.estado || null,
          codigoPostal: data.codigoPostal || null,
          fechaNacimiento: data.fechaNacimiento || null,
          estadoBecario: data.estadoBecario || 'No especificado',
          programaApoyo: data.programaApoyo || null,
          fotoUrl: data.fotoUrl || null,
        };
      });
      console.log('Becarios cargados desde Firestore:', this.allBecarios);
      this.onSearch();
    }, (error: any) => { // Tipado 'error: any'
      console.error('Error al escuchar becarios:', error);
      this.showMessageBox('Error al cargar la lista de becarios. Por favor, intenta de nuevo más tarde.'); // Reemplazado alert
    });

    this.unsubscribeListeners.push(unsubscribe);
  }

  onSearch(): void {
    if (!this.searchTerm) {
      this.filteredBecarios = [...this.allBecarios];
    } else {
      const lowerCaseSearchTerm = this.searchTerm.toLowerCase();
      this.filteredBecarios = this.allBecarios.filter(becario =>
        becario.displayName?.toLowerCase().includes(lowerCaseSearchTerm) ||
        becario.email?.toLowerCase().includes(lowerCaseSearchTerm) ||
        becario.uid.toLowerCase().includes(lowerCaseSearchTerm) ||
        becario.nombres?.toLowerCase().includes(lowerCaseSearchTerm) ||
        becario.apellidos?.toLowerCase().includes(lowerCaseSearchTerm) ||
        becario.estadoBecario?.toLowerCase().includes(lowerCaseSearchTerm) ||
        becario.ciudad?.toLowerCase().includes(lowerCaseSearchTerm) ||
        becario.estado?.toLowerCase().includes(lowerCaseSearchTerm)
      );
    }
  }

  trackByUid(index: number, becario: UserProfile): string {
    return becario.uid;
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'https://placehold.co/40x40/adb5bd/ffffff?text=PF';
  }

  viewInternInfo(becario: UserProfile): void {
    this.selectedBecario = { ...becario }; 
    this.panelMode = 'info';
    this.showDetailsPanel = true;
    console.log('Ver información del becario:', this.selectedBecario);
  }

  async saveInternInfo(): Promise<void> {
    if (!this.db || !this.selectedBecario) {
      console.error('Firestore o becario seleccionado no disponible para guardar.');
      this.showMessageBox('Error: No se pudo guardar la información.'); // Reemplazado alert
      return;
    }
    try {
      const userRef = doc(this.db, `users/${this.selectedBecario.uid}`);
      const newDisplayName = (this.selectedBecario.nombres && this.selectedBecario.apellidos)
        ? `${this.selectedBecario.nombres} ${this.selectedBecario.apellidos}`
        : this.selectedBecario.displayName;

      await setDoc(userRef, {
        displayName: newDisplayName,
        nombres: this.selectedBecario.nombres,
        apellidos: this.selectedBecario.apellidos,
        telefono: this.selectedBecario.telefono,
        direccion: this.selectedBecario.direccion,
        ciudad: this.selectedBecario.ciudad,
        estado: this.selectedBecario.estado,
        codigoPostal: this.selectedBecario.codigoPostal,
        fechaNacimiento: this.selectedBecario.fechaNacimiento,
        estadoBecario: this.selectedBecario.estadoBecario,
        programaApoyo: this.selectedBecario.programaApoyo,
        fotoUrl: this.selectedBecario.fotoUrl
      }, { merge: true });

      console.log('Información del becario actualizada:', this.selectedBecario.uid);
      this.showMessageBox('Información del becario guardada con éxito.'); // Reemplazado alert
      this.closeDetailsPanel();
    } catch (error: any) { // Tipado 'error: any'
      console.error('Error al guardar la información del becario:', error);
      this.showMessageBox(`Error al guardar la información: ${error.message}`); // Reemplazado alert
    }
  }

  viewInternDocuments(becario: UserProfile): void {
    this.selectedBecario = becario;
    this.panelMode = 'documents';
    this.showDetailsPanel = true;
    console.log('Ver documentos del becario:', this.selectedBecario);
    this.initializeDocumentStatesForSelectedBecario();
    this.loadDocumentsForSelectedBecario();
  }

  private initializeDocumentStatesForSelectedBecario(): void {
    this.documents = {};
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
    this.currentPreviewUrl = null;
    this.currentPreviewFileName = null;
    this.currentDocumentIndex = 0;
  }

  /**
   * Carga los documentos de la subcolección 'documentos' del becario seleccionado.
   * Utiliza onSnapshot para actualizaciones en tiempo real.
   */
  private loadDocumentsForSelectedBecario(): void {
    if (!this.db || !this.selectedBecario?.uid) {
      console.warn('Firestore o becario seleccionado no disponible para cargar documentos.');
      return;
    }

    // Desuscribirse de listeners anteriores si los hubiera para esta subcolección
    this.unsubscribeListeners.forEach(unsub => unsub());
    this.unsubscribeListeners = [];

    // Referencia a la subcolección 'documentos' del becario específico
    const becarioDocsCollectionRef = collection(this.db, `users/${this.selectedBecario.uid}/documentos`);

    // Utiliza onSnapshot con la referencia a la subcolección
    const unsubscribe = onSnapshot(becarioDocsCollectionRef, (snapshot: QuerySnapshot) => {
      snapshot.docChanges().forEach((change: DocumentChange) => {
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
      console.log('Documentos del becario seleccionado cargados/actualizados:', this.documents);
      this.updatePreviewForCurrentDocumentAdmin();
    }, (error: any) => { // Tipado 'error: any'
      console.error('Error al escuchar documentos del becario seleccionado:', error);
      this.showMessageBox('Error al cargar los documentos del becario. Por favor, intenta de nuevo más tarde.'); // Reemplazado alert
    });

    this.unsubscribeListeners.push(unsubscribe);
  }

  sendEmail(email: string | null | undefined): void {
    if (email) {
      const subject = encodeURIComponent('Asunto: Sobre tu expediente de becario');
      const body = encodeURIComponent(`Estimado becario,\n\nHemos revisado tu expediente. Por favor, ponte en contacto con nosotros para discutir algunos detalles.\n\nSaludos,\nEquipo de Becas`);
      window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
    } else {
      this.showMessageBox('Correo electrónico del becario no disponible.'); // Reemplazado alert
    }
  }

  closeDetailsPanel(): void {
    this.showDetailsPanel = false;
    this.selectedBecario = null;
    this.panelMode = null;
    this.documents = {};
    this.currentPreviewUrl = null;
    this.currentPreviewFileName = null;
    this.unsubscribeListeners.forEach(unsub => unsub());
    this.unsubscribeListeners = [];
    this.loadBecarios();
  }

  updatePreviewForCurrentDocumentAdmin(): void {
    const currentDocName = this.documentTypes[this.currentDocumentIndex];
    const currentDocState = this.documents[currentDocName];

    if (currentDocState) {
      if (currentDocState.file && currentDocState.status === 'selected') {
        this.onPreviewRequestAdmin({ documentName: currentDocName, file: currentDocState.file });
      } else if (currentDocState.status === 'uploaded' && currentDocState.firestoreUrl) {
        this.onPreviewRequestAdmin({ documentName: currentDocName, file: null });
      } else {
        this.currentPreviewUrl = null;
        this.currentPreviewFileName = null;
      }
    } else {
      this.currentPreviewUrl = null;
      this.currentPreviewFileName = null;
    }
  }

  onFileChangeAdmin(event: { documentName: string, file: File | null }): void {
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
        this.updatePreviewForCurrentDocumentAdmin();
      }
    }
  }

  onPreviewRequestAdmin(event: { documentName: string, file: File | null }): void {
    const docState = this.documents[event.documentName];

    if (event.file && docState.status === 'selected') {
      this.currentPreviewFileName = event.file.name;
      this.currentPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(URL.createObjectURL(event.file));
    } else if (docState && docState.url) { // Usar docState.url que ya es SafeResourceUrl
      this.currentPreviewFileName = docState.name + (docState.firestoreUrl ? " (Desde la nube)" : "");
      this.currentPreviewUrl = docState.url;
    } else {
      this.currentPreviewFileName = null;
      this.currentPreviewUrl = null;
    }
  }

  onFileRemovedAdmin(event: { documentName: string }): void {
    const doc = this.documents[event.documentName];
    if (doc) {
      if (doc.firestoreUrl && this.selectedBecario?.uid && this.functions) {
        this.deleteFileViaCloudFunction(event.documentName, doc.firestoreUrl, this.selectedBecario.uid);
      } else {
        doc.file = null;
        doc.status = 'pending';
        doc.url = null;
        doc.firestoreUrl = null;
        doc.errorMessage = undefined;
        this.updatePreviewForCurrentDocumentAdmin();
      }
    }
  }

  async deleteFileViaCloudFunction(docName: string, downloadUrl: string, becarioId: string): Promise<void> {
    if (!this.functions) {
      console.error('Firebase Functions no está inicializado.');
      this.documents[docName].errorMessage = 'Error: Funciones no disponibles para eliminar.';
      return;
    }

    const docState = this.documents[docName];
    if (!docState) return;

    docState.isUploading = true;
    docState.status = 'uploading'; // O un estado 'deleting' si lo creamos
    docState.errorMessage = undefined;

    try {
      const url = new URL(downloadUrl);
      const encodedPath = url.pathname.split('/o/')[1];
      const filePath = decodeURIComponent(encodedPath.split('?')[0]);

      const deleteCallable = httpsCallable(this.functions, 'deleteUserDocument');
      const result = await deleteCallable({ filePath: filePath, becarioId: becarioId });

      console.log('Resultado de la Cloud Function:', result.data);

      docState.file = null;
      docState.status = 'pending';
      docState.url = null;
      docState.firestoreUrl = null;
      docState.isUploading = false;
      docState.uploadProgress = 0;

      this.updatePreviewForCurrentDocumentAdmin();
      this.showMessageBox(`Documento "${docName}" eliminado con éxito para ${this.selectedBecario?.displayName}.`); // Reemplazado alert
    } catch (error: any) { // Tipado 'error: any'
      console.error(`Error al llamar a Cloud Function para eliminar "${docName}" para ${this.selectedBecario?.uid}:`, error);
      docState.status = 'error';
      docState.errorMessage = `Error al eliminar el archivo: ${error.message}`;
      docState.isUploading = false;
      const errorMessage = error.code ? `(${error.code}) ${error.message}` : error.message;
      this.showMessageBox(`Error al eliminar el documento "${docName}" para ${this.selectedBecario?.displayName}: ${errorMessage}. Revisa la consola para más detalles.`); // Reemplazado alert
    }
  }

  canSaveExpedientAdmin(): boolean {
    if (!this.isAuthReady || !this.adminUserId || !this.selectedBecario?.uid) {
      return false;
    }

    const hasSelectedFiles = this.documentTypes.some(docName => this.documents[docName].status === 'selected');
    const allDocumentsUploaded = this.documentTypes.every(docName => this.documents[docName].status === 'uploaded');
    const hasUploadingFiles = this.documentTypes.some(docName => this.documents[docName].status === 'uploading');
    const hasErrorInFiles = this.documentTypes.some(docName => this.documents[docName].status === 'error');

    return (hasSelectedFiles || allDocumentsUploaded) && !hasUploadingFiles && !hasErrorInFiles;
  }

  async saveExpedientAdmin(): Promise<void> {
    console.log('>>> saveExpedientAdmin() ha sido llamado. <<<');

    if (!this.db || !this.storage || !this.selectedBecario?.uid) {
      console.error('Servicios de Firebase no inicializados o UID del becario no disponible.');
      this.showMessageBox('Error: Servicios de Firebase no disponibles.'); // Reemplazado alert
      return;
    }

    console.log(`Intentando guardar expediente completo para el becario: ${this.selectedBecario.uid}...`);
    const uploadPromises: Promise<void>[] = [];

    for (const docName of this.documentTypes) {
      const docState = this.documents[docName];

      if (docState.file && docState.status === 'selected' && !docState.isUploading) {
        docState.isUploading = true;
        docState.status = 'uploading';
        docState.uploadProgress = 0;
        docState.errorMessage = undefined;

        const normalizedDocName = docName.replace(/\s+/g, '');
        // La ruta de Storage está bien construida aquí
        const filePath = `users/${this.selectedBecario.uid}/documentos/${normalizedDocName}_${docState.file.name}`;
        console.log('Ruta de Storage para el documento (Admin):', filePath);
        const fileRef = ref(this.storage, filePath);
        const uploadTask = uploadBytesResumable(fileRef, docState.file);

        const uploadPromise = new Promise<void>((resolve, reject) => {
          uploadTask.on('state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              docState.uploadProgress = Math.round(progress);
            },
            (error: any) => { // Tipado 'error: any'
              console.error(`Error al subir "${docName}" (Admin):`, error);
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

                const docRef = doc(this.db!, `users/${this.selectedBecario!.uid}/documentos`, normalizedDocName);
                await setDoc(docRef, {
                  nombreTipo: docName,
                  urlDescarga: downloadURL,
                  nombreArchivo: docState.file!.name,
                  fechaSubida: new Date()
                }, { merge: true });

                console.log(`Documento "${docName}" subido y metadatos guardados (Admin):`, downloadURL);
                resolve();
              } catch (error: any) { // Tipado 'error: any'
                console.error(`Error al obtener URL de descarga o guardar en Firestore para "${docName}" (Admin):`, error);
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
      this.showMessageBox('No hay nuevos documentos seleccionados o modificados para guardar.'); // Reemplazado alert
      return;
    }

    try {
      await Promise.all(uploadPromises);
      this.showMessageBox(`Expediente del becario ${this.selectedBecario!.displayName} guardado con éxito.`); // Reemplazado alert
    } catch (error: any) { // Tipado 'error: any'
      this.showMessageBox('Hubo un error al guardar algunos documentos. Por favor, revisa la consola para más detalles.'); // Reemplazado alert
    }
  }

  prevDocumentAdmin(): void {
    this.currentDocumentIndex = (this.currentDocumentIndex === 0) ?
      this.documentTypes.length - 1 :
      this.currentDocumentIndex - 1;
    this.updatePreviewForCurrentDocumentAdmin();
  }

  nextDocumentAdmin(): void {
    this.currentDocumentIndex = (this.currentDocumentIndex === this.documentTypes.length - 1) ?
      0 :
      this.currentDocumentIndex + 1;
    this.updatePreviewForCurrentDocumentAdmin();
  }

  isActiveAdmin(index: number): boolean {
    return this.currentDocumentIndex === index;
  }

  // --- Custom Message Box (instead of alert) ---
  private showMessageBox(message: string): void {
    console.log("APP MESSAGE:", message);
    // Puedes añadir una UI más avanzada para mostrar el mensaje aquí
  }
}
