// functions/src/index.ts

// Importa las librerías necesarias de Firebase Admin SDK
import * as admin from "firebase-admin";

// Importa los módulos específicos para funciones de segunda generación (v2)
import { onCall, CallableRequest, HttpsError } from "firebase-functions/v2/https";
import { logger } from "firebase-functions"; // Usar el logger de funciones V2

// Inicializa la aplicación Firebase Admin SDK
admin.initializeApp();

// Obtén referencias a los servicios de Firestore y Storage
const db = admin.firestore();
const storage = admin.storage();

/**
 * Define una interfaz para la ESTRUCTURA de los datos que el cliente enviará
 * a la función callable 'deleteUserDocument'.
 */
interface DeleteUserDocumentPayload {
  filePath: string;
  becarioId: string;
}

/**
 * Define una interfaz para la carga útil de la función de subida de documentos.
 */
interface UploadBecarioDocumentPayload {
  becarioUid: string;
  documentType: string; // Ej: "Acta de Nacimiento", "CURP"
  fileName: string;
  fileContentBase64: string; // Contenido del archivo codificado en Base64
  fileMimeType: string; // Ej: "application/pdf", "image/jpeg"
}

/**
 * Función HTTP Callable para eliminar un documento de becario de Firebase Storage
 * y limpiar su referencia en Firestore.
 * Compatible con funciones de segunda generación (v2).
 * SOLO PUEDE SER LLAMADA POR EL PROPIETARIO DEL DOCUMENTO O UN ADMINISTRADOR.
 */
export const deleteUserDocument = onCall(
  async (request: CallableRequest<DeleteUserDocumentPayload>) => {
    // 1. Verificar autenticación del usuario que invoca la función
    if (!request.auth || !request.auth.uid) {
      logger.error('deleteUserDocument: Solicitud no autenticada.');
      throw new HttpsError(
        'unauthenticated',
        'Se requiere autenticación para realizar esta acción.'
      );
    }

    const callingUserId = request.auth.uid;
    const filePath = request.data.filePath;
    const becarioId = request.data.becarioId;

    // 2. Validar que la ruta del archivo y el ID del becario se proporcionaron
    if (!filePath || typeof filePath !== 'string' || !becarioId || typeof becarioId !== 'string') {
      logger.error('deleteUserDocument: Argumentos inválidos.', { filePath, becarioId });
      throw new HttpsError(
        'invalid-argument',
        'Los campos "filePath" y "becarioId" son requeridos y deben ser cadenas.'
      );
    }

    // 3. Verificar el rol del usuario que invoca la función
    try {
      const userDoc = await db.collection('users').doc(callingUserId).get();
      const userRole = userDoc.data()?.role;

      const isOwner = callingUserId === becarioId;
      const isAdmin = userRole === 'admin';

      if (!isOwner && !isAdmin) {
        logger.warn('deleteUserDocument: Permisos denegados.', { callingUserId, becarioId, userRole });
        throw new HttpsError(
          'permission-denied',
          'No tienes permisos para eliminar este documento. Solo el propietario o un administrador pueden hacerlo.'
        );
      }

      // 4. Eliminar el archivo de Firebase Storage
      const bucket = storage.bucket();
      const file = bucket.file(filePath);

      await file.delete();
      logger.info(`Documento '${filePath}' eliminado de Storage por el usuario ${callingUserId}.`);

      // 5. Eliminar o actualizar la referencia del documento en Firestore
      // Se asume una estructura de Firestore: users/{becarioId}/documentos/{tipoDeDocumento}
      const parts = filePath.split('/');
      // Verifica si la ruta del archivo sigue el patrón esperado para documentos de usuario
      if (parts.length < 4 || parts[0] !== 'users' || parts[1] !== becarioId || parts[2] !== 'documentos') {
        logger.warn(`deleteUserDocument: Ruta de archivo inesperada para Firestore: ${filePath}. No se limpiará la referencia en Firestore.`);
        return { success: true, message: 'Archivo eliminado de Storage, pero la ruta de Firestore no es estándar o no coincide.' };
      }
      
      // Intenta determinar el ID del documento en Firestore a partir del nombre del archivo
      // Esto asume que el ID del documento Firestore es la primera parte del nombre del archivo
      // antes del primer '_' o '.' (ej: 'ActadeNacimiento_timestamp_original.pdf' -> 'ActadeNacimiento')
      const fileNameWithExtension = parts[parts.length - 1];
      const fileTypeMatch = fileNameWithExtension.match(/^([a-zA-Z0-9]+)_?/); 

      let firestoreDocId = '';
      if (fileTypeMatch && fileTypeMatch[1]) {
        firestoreDocId = fileTypeMatch[1];
      } else {
        // Fallback si el patrón '_timestamp' no existe, toma todo antes de la extensión
        firestoreDocId = fileNameWithExtension.split('.')[0].replace(/[^a-zA-Z0-9]/g, '');
      }

      if (firestoreDocId) {
        const docRef = db.collection('users').doc(becarioId).collection('documentos').doc(firestoreDocId);
        await docRef.update({
          urlDescarga: admin.firestore.FieldValue.delete(),
          nombreArchivo: admin.firestore.FieldValue.delete(),
          fechaSubida: admin.firestore.FieldValue.delete(),
          storagePath: admin.firestore.FieldValue.delete(), // Asegúrate de borrar la ruta también
          mimeType: admin.firestore.FieldValue.delete(),
        });
        logger.info(`Referencia de documento '${firestoreDocId}' limpia en Firestore para becario ${becarioId}.`);
      } else {
        logger.warn(`deleteUserDocument: No se pudo determinar el ID del documento Firestore a partir de la ruta '${filePath}'. La referencia no se limpió.`);
      }

      return { success: true, message: 'Documento eliminado con éxito.' };

    } catch (error: any) {
      logger.error('Error en Cloud Function deleteUserDocument:', error);
      if (error instanceof HttpsError) {
        throw error;
      }
      // Captura y lanza errores HTTP personalizados
      throw new HttpsError(
        'internal',
        'Error interno del servidor al eliminar el documento.',
        error.message, // Mensaje de error para depuración en el cliente // Objeto de error completo para logs del servidor
      );
    }
  }
);


/**
 * Función HTTP Callable para que un administrador suba/actualice un documento de becario en Firebase Storage.
 * Compatible con funciones de segunda generación (v2).
 * SOLO PUEDE SER LLAMADA POR UN ADMINISTRADOR.
 */
export const uploadBecarioDocument = onCall(
  async (request: CallableRequest<UploadBecarioDocumentPayload>) => {
    logger.info("uploadBecarioDocument: Función llamada.", { data: request.data, auth: request.auth });

    // 1. Verificar autenticación del usuario que invoca la función
    if (!request.auth || !request.auth.uid) {
      logger.warn("uploadBecarioDocument: Solicitud no autenticada.");
      throw new HttpsError('unauthenticated', 'Solo usuarios autenticados pueden subir documentos.');
    }

    const adminUid = request.auth.uid;

    // 2. Verificar que el usuario autenticado tiene rol de 'admin'
    try {
      const adminDoc = await db.collection('users').doc(adminUid).get();
      const adminData = adminDoc.data();

      if (!adminDoc.exists || adminData?.role !== 'admin') {
        logger.warn('uploadBecarioDocument: Permiso denegado para usuario no administrador.', { uid: adminUid });
        throw new HttpsError('permission-denied', 'Solo los administradores pueden subir documentos de becarios.');
      }
    } catch (error: any) {
      logger.error('uploadBecarioDocument: Error al verificar rol del administrador.', error);
      throw new HttpsError('internal', `Error al verificar su estado de administrador: ${error.message || 'error desconocido'}`);
    }

    // 3. Validación de datos de entrada (payload)
    const { becarioUid, documentType, fileName, fileContentBase64, fileMimeType } = request.data;

    if (!becarioUid || typeof becarioUid !== 'string' ||
        !documentType || typeof documentType !== 'string' ||
        !fileName || typeof fileName !== 'string' ||
        !fileContentBase64 || typeof fileContentBase64 !== 'string' ||
        !fileMimeType || typeof fileMimeType !== 'string') {
      logger.error('uploadBecarioDocument: Argumentos inválidos.', { data: request.data });
      throw new HttpsError('invalid-argument', 'Todos los campos son requeridos y deben ser cadenas: becarioUid, documentType, fileName, fileContentBase64, fileMimeType.');
    }

    // 4. Preparación del archivo para Storage
    const fileBuffer = Buffer.from(fileContentBase64, 'base64');
    // Normaliza el tipo de documento (ej: "Acta de Nacimiento" -> "ActaDeNacimiento")
    const timestamp = Date.now();
    const normalizedDocName = documentType.replace(/\s+/g, '');
    // Genera un nombre de archivo único para evitar colisiones en Storage
    const uniqueFileName = `${normalizedDocName}_${timestamp}_${fileName}`;
    // Define la ruta en Storage
    const filePath = `users/${becarioUid}/documentos/${uniqueFileName}`;
    const fileRef = storage.bucket().file(filePath); // Accede al bucket por defecto

    logger.info(`uploadBecarioDocument: Intentando subir archivo a ${filePath}`, { becarioUid, documentType, fileName, fileMimeType });

    // 5. Subida del archivo a Firebase Storage
    try {
      await fileRef.save(fileBuffer, {
        metadata: { contentType: fileMimeType, customMetadata: { uploadedBy: adminUid, documentType: documentType } },
        resumable: false // 'false' es eficiente para archivos pequeños enviados por Callable Functions
      });

      // 6. Obtener URL de descarga y actualizar Firestore
      // Generar una URL firmada con una expiración muy lejana para que sea "permanente" para la aplicación
      const downloadURL = await fileRef.getSignedUrl({
        action: 'read',
        expires: '03-01-2500', // Una fecha muy lejana para acceso persistente.
      });

      // Guardar la URL y metadatos en una subcolección 'documentos' dentro del documento del becario
      // El ID del documento en Firestore será el nombre normalizado del tipo de documento (ej: "ActaDeNacimiento")
      const documentRef = db.collection('users').doc(becarioUid).collection('documentos').doc(normalizedDocName);
      await documentRef.set({
        name: documentType, // Nombre original del tipo de documento (ej: "Acta de Nacimiento")
        urlDescarga: downloadURL[0], // URL de descarga del archivo
        fechaSubida: admin.firestore.FieldValue.serverTimestamp(), // Fecha de subida
        uploadedBy: adminUid, // UID del administrador que subió el archivo
        nombreArchivo: fileName, // Nombre original del archivo
        storagePath: filePath, // Ruta completa del archivo en Storage
        mimeType: fileMimeType // Tipo MIME del archivo
      }, { merge: true }); // Usar merge para no sobrescribir otros campos del documento si ya existe

      logger.info(`uploadBecarioDocument: Archivo subido y Firestore actualizado con éxito.`, { downloadURL: downloadURL[0], becarioUid, documentType });

      return { success: true, message: `Documento '${documentType}' subido con éxito.`, downloadURL: downloadURL[0], storagePath: filePath };

    } catch (error: any) {
      logger.error(`uploadBecarioDocument: Error al subir archivo o actualizar Firestore.`, error);
      throw new HttpsError('internal', `Error al subir el documento: ${error.message || 'error desconocido'}`);
    }
  }
);