// functions/src/index.ts

// Importa las librerías necesarias de Firebase Functions y Admin SDK
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Inicializa la aplicación Firebase Admin SDK
// Esto permite que la función acceda a Firebase con privilegios de administrador.
admin.initializeApp();

// Obtén referencias a los servicios de Firestore y Storage
const db = admin.firestore();
const storage = admin.storage();

/**
 * Define una interfaz para la ESTRUCTURA de los datos que el cliente enviará
 * a esta función callable.
 */
interface DeleteUserDocumentPayload {
  filePath: string;
  becarioId: string;
}

/**
 * Función HTTP Callable para eliminar un documento de becario de Firebase Storage
 * y limpiar su referencia en Firestore.
 *
 * Esta función es llamada por el cliente (Angular) y verifica el rol del usuario
 * en el servidor antes de realizar la operación de eliminación.
 *
 * @param request El objeto 'CallableRequest' que contiene tanto los datos (request.data)
 * como la información de autenticación (request.auth).
 *
 * @returns Un objeto con un mensaje de éxito o error.
 */
export const deleteUserDocument = functions.https.onCall(
  // Utilizamos CallableRequest<T> donde T es la interfaz de los datos que esperamos en el payload
  async (request: functions.https.CallableRequest<DeleteUserDocumentPayload>) => {
    // 1. Verificar autenticación del usuario que invoca la función
    // La información de autenticación está en request.auth
    if (!request.auth || !request.auth.uid) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Se requiere autenticación para realizar esta acción.'
      );
    }

    const callingUserId = request.auth.uid; // El UID del usuario que invocó la función
    const filePath = request.data.filePath; // Los datos del payload están en request.data
    const becarioId = request.data.becarioId; // El UID del becario al que pertenece el documento

    // 2. Validar que la ruta del archivo y el ID del becario se proporcionaron
    if (!filePath || typeof filePath !== 'string' || !becarioId || typeof becarioId !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Los campos "filePath" y "becarioId" son requeridos y deben ser cadenas.'
      );
    }

    // 3. Verificar el rol del usuario que invoca la función
    try {
      const userDoc = await db.collection('users').doc(callingUserId).get();
      const userRole = userDoc.data()?.role;

      // Permitir la eliminación si el usuario es el propietario del documento
      // O si el usuario invocador es un administrador.
      const isOwner = callingUserId === becarioId;
      const isAdmin = userRole === 'admin';

      if (!isOwner && !isAdmin) {
        throw new functions.https.HttpsError(
          'permission-denied',
          'No tienes permisos para eliminar este documento. Solo el propietario o un administrador pueden hacerlo.'
        );
      }

      // 4. Eliminar el archivo de Firebase Storage
      const bucket = storage.bucket(); // Obtén el bucket predeterminado
      const file = bucket.file(filePath);

      await file.delete();
      console.log(`Documento '${filePath}' eliminado de Storage por el usuario ${callingUserId}.`);

      // 5. Eliminar o actualizar la referencia del documento en Firestore
      // Extrae el nombre normalizado del documento del filePath para encontrar la referencia en Firestore
      // Asumimos que el filePath es algo como 'users/UID/documentos/TipoDocumento_NombreArchivo.pdf'
      // Necesitamos 'TipoDocumento' para la referencia en Firestore (users/UID/documentos/TipoDocumento)
      const parts = filePath.split('/');
      // Verificación de seguridad para la ruta del archivo
      if (parts.length < 4 || parts[0] !== 'users' || parts[1] !== becarioId || parts[2] !== 'documentos') {
        console.warn(`Ruta de archivo inesperada o no coincidente para Firestore: ${filePath}. No se limpiará la referencia en Firestore.`);
        return { success: true, message: 'Archivo eliminado de Storage, pero la ruta de Firestore no es estándar o no coincide.' };
      }
      
      const fileNameWithExtension = parts[parts.length - 1]; // "Actadenacimiento_8.- Taller de ciencias I (1) (1).pdf"
      // Utilizamos un regex más robusto para extraer el nombre del tipo de documento normalizado
      const fileTypeMatch = fileNameWithExtension.match(/^([a-zA-Z0-9]+)_?/); 

      let firestoreDocId = '';
      if (fileTypeMatch && fileTypeMatch[1]) {
        firestoreDocId = fileTypeMatch[1]; // Por ejemplo, "Actadenacimiento"
      } else {
        // Fallback si el nombre del archivo no sigue el patrón esperado (solo el tipo de documento)
        firestoreDocId = fileNameWithExtension.split('.')[0].replace(/[^a-zA-Z0-9]/g, ''); // Eliminar caracteres no alfanuméricos
      }

      if (firestoreDocId) {
        const docRef = db.collection('users').doc(becarioId).collection('documentos').doc(firestoreDocId);
        await docRef.update({
          urlDescarga: admin.firestore.FieldValue.delete(), // Elimina el campo
          nombreArchivo: admin.firestore.FieldValue.delete(), // Elimina el campo
          fechaSubida: admin.firestore.FieldValue.delete(), // Elimina el campo
        });
        console.log(`Referencia de documento '${firestoreDocId}' limpia en Firestore para becario ${becarioId}.`);
      } else {
        console.warn(`No se pudo determinar el ID del documento Firestore a partir de la ruta '${filePath}'. La referencia no se limpió.`);
      }

      return { success: true, message: 'Documento eliminado con éxito.' };

    } catch (error: any) {
      console.error('Error en Cloud Function deleteUserDocument:', error);
      // Re-lanza errores HTTPs para que el cliente pueda manejarlos
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      // Envía un error genérico si no es un HttpsError conocido
      throw new functions.https.HttpsError(
        'internal',
        'Error interno del servidor al eliminar el documento.',
        error.message // Envía el mensaje de error original para depuración
      );
    }
  }
);
