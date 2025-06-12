import { Component, OnInit, OnDestroy, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'; // Para sanear HTML
import { initializeApp, FirebaseApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, Firestore, DocumentData } from 'firebase/firestore';
import { Subscription } from 'rxjs'; // Para manejar suscripciones si fuera necesario, aunque getDocs es Promise

// Variables globales de Canvas (obligatorio usar)
declare const __app_id: string | undefined;
declare const __firebase_config: string | undefined;

// Declarar html2pdf globalmente para que TypeScript lo reconozca
declare const html2pdf: any; // Add this line to declare html2pdf

// Interfaz para la figura del personal del INPI
export interface FiguraInpi {
  id?: string; // Firestore document ID
  nombreCompleto: string;
  cargo: string;
}

@Component({
  selector: 'app-generate-letter-admin-pw',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './generate-letter-admin-pw.component.html',
  styleUrl: './generate-letter-admin-pw.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush // Optimización para renderizado
})
export class GenerateLetterAdminPwComponent implements OnInit, OnDestroy {

  private app: FirebaseApp | null = null;
  private db: Firestore | null = null;

  // Variables para los campos del formulario
  cantidadNumero: number | null = null;
  mesSeleccionado: string = '';
  figuraSeleccionadaId: string = ''; // ID de la figura seleccionada
  ciudadCarta: string = 'Durango, Durango'; // Valor por defecto
  diaCarta: number | null = null;
  anioCarta: number = new Date().getFullYear(); // Año actual por defecto

  // Listas para comboboxes
  meses: { value: string, label: string }[] = [];
  figurasInpi: FiguraInpi[] = []; // Lista de personal del INPI cargada desde Firestore

  selectedFigura: FiguraInpi | null = null; // Objeto completo de la figura seleccionada

  // Para la previsualización de la carta
  letterPreview: SafeHtml = '';
  errorMessage: string | null = null;

  constructor(private sanitizer: DomSanitizer) {}

  async ngOnInit(): Promise<void> {
    this.initializeMonths();
    
    try {
      const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
      const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

      if (getApps().length === 0) {
        this.app = initializeApp(firebaseConfig);
        console.log('Firebase app initialized in generate-letter-admin-pw.');
      } else {
        this.app = getApp();
        console.log('Firebase app already exists, retrieved default app instance in generate-letter-admin-pw.');
      }
      this.db = getFirestore(this.app);
      console.log('Firestore instance obtained for letter generation.');

      await this.fetchFigurasInpi();
      this.generateLetterContent(); // Genera la carta inicial al cargar

    } catch (error: any) {
      console.error('Error crítico al inicializar Firebase en generate-letter-admin-pw:', error);
      this.errorMessage = 'Error al cargar la aplicación. Inténtalo de nuevo más tarde.';
    }
  }

  ngOnDestroy(): void {
    // No hay suscripciones reactivas en este componente por ahora, pero se incluiría aquí.
  }

  /**
   * Inicializa la lista de meses para el combobox.
   */
  private initializeMonths(): void {
    const monthNames = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
    this.meses = monthNames.map(month => ({ value: month, label: month.charAt(0).toUpperCase() + month.slice(1) }));
    this.mesSeleccionado = this.meses[new Date().getMonth()].value; // Mes actual por defecto
    this.diaCarta = new Date().getDate(); // Día actual por defecto
  }

  /**
   * Carga la lista de figuras del INPI desde Firestore.
   */
  async fetchFigurasInpi(): Promise<void> {
    if (!this.db) {
      console.warn('Firestore no está inicializado para cargar figuras del INPI.');
      return;
    }
    try {
      const querySnapshot = await getDocs(collection(this.db, 'figurasInpi'));
      this.figurasInpi = querySnapshot.docs.map(doc => {
        const data = doc.data() as FiguraInpi;
        return {
          id: doc.id, // Asegura que el ID del documento también se almacene
          nombreCompleto: data.nombreCompleto || 'Nombre no especificado',
          cargo: data.cargo || 'Cargo no especificado'
        };
      }).sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto));
      console.log('Figuras del INPI cargadas:', this.figurasInpi);
      // Establecer el valor por defecto de figuraSeleccionadaId si hay figuras
      if (this.figurasInpi.length > 0) {
        this.figuraSeleccionadaId = this.figurasInpi[0].id || '';
        this.onFiguraSelect(); // Seleccionar la primera figura por defecto y actualizar la vista
      }
    } catch (error: any) {
      console.error('Error al obtener las figuras del INPI:', error);
      this.errorMessage = 'No se pudieron cargar las figuras del INPI. Revisa las reglas de Firestore.';
    }
  }

  /**
   * Se llama cuando se selecciona una figura del combobox.
   * Actualiza el objeto 'selectedFigura' con la figura completa.
   */
  onFiguraSelect(): void {
    this.selectedFigura = this.figurasInpi.find(f => f.id === this.figuraSeleccionadaId) || null;
    this.generateLetterContent(); // Regenera la carta cuando cambia la figura
  }

  /**
   * Convierte un número a su representación en letras en español.
   * Incluye soporte para decimales (centavos).
   * @param num El número a convertir.
   * @returns La representación en letras.
   */
  private convertNumberToWords(num: number): string {
    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
    const decenasY = ['', '', 'veinti', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

    const convertirUnidad = (n: number): string => {
      if (n < 10) return unidades[n];
      if (n < 20) return decenas[n - 10];
      if (n < 30) return (n === 20 ? 'veinte' : decenasY[Math.floor(n / 10)] + (n % 10 !== 0 ? ' y ' + unidades[n % 10] : ''));
      return decenasY[Math.floor(n / 10)] + (n % 10 !== 0 ? ' y ' + unidades[n % 10] : '');
    };

    const convertHundred = (n: number): string => {
      if (n < 100) return convertirUnidad(n);
      const c = Math.floor(n / 100);
      return (c === 1 && n === 100 ? 'cien' : centenas[c]) + (n % 100 !== 0 ? ' ' + convertHundred(n % 100) : '');
    };

    const convertThousands = (n: number): string => {
      if (n < 1000) return convertHundred(n);
      const m = Math.floor(n / 1000);
      const r = n % 1000;
      let s = (m === 1 ? 'un' : convertHundred(m)) + ' mil'; // 'un mil' para 1000
      if (r !== 0) s += ' ' + convertHundred(r);
      return s;
    };

    const convertMillions = (n: number): string => {
      if (n < 1000000) return convertThousands(n);
      const mm = Math.floor(n / 1000000);
      const r = n % 1000000;
      let s = (mm === 1 ? 'un millón' : convertThousands(mm) + ' millones');
      if (r !== 0) s += ' ' + convertThousands(r);
      return s;
    };

    if (num === 0) return 'CERO';

    const entero = Math.floor(num);
    let decimal = Math.round((num - entero) * 100); // Obtener los centavos y redondear
    if (decimal < 10 && decimal > 0) decimal = parseInt('0' + decimal.toString()); // Asegurar que sea 05 si es 5, no 5

    const enteroEnLetras = convertMillions(entero).toUpperCase();
    const centavos = decimal.toString().padStart(2, '0'); // Formato XX

    return `${enteroEnLetras} PESOS ${centavos}/100 M.N.`;
  }

  /**
   * Genera el contenido HTML de la carta rellenando los placeholders.
   */
  generateLetterContent(): void {
    if (this.cantidadNumero === null || this.diaCarta === null || !this.mesSeleccionado || !this.selectedFigura) {
      this.letterPreview = this.sanitizer.bypassSecurityTrustHtml('<p class="placeholder-text">Rellena todos los campos para generar la previsualización de la carta.</p>');
      return;
    }

    const cantidadEnLetras = this.convertNumberToWords(this.cantidadNumero);
    const mesActual = this.meses.find(m => m.value === this.mesSeleccionado)?.label || '';
    
    // Plantilla de la carta con los marcadores de posición
    const template = `
      <div class="letter-container">
        <p class="text-right">RECIBO DE APOYO ECONÓMICO</p>
        <p class="text-right strong">BUENO POR $<strong class="strong">${this.cantidadNumero?.toFixed(2)}</strong></p>
        <br>
        <p>Bajo protesta de decir verdad manifiesto que recibí del Instituto Nacional de los Pueblos Indígenas, el apoyo económico de $<strong class="strong">${this.cantidadNumero?.toFixed(2)}</strong></p>
        <p class="indent">(<strong class="strong">${cantidadEnLetras}</strong>), correspondiente al mes de <strong class="strong">${mesActual}</strong>,</p>
        <br>
        <p>por mi desempeño en la realización de actividades sociales y comunitarias en beneficio de comunidades indígenas y/o afromexicanas bajo la figura de</p>
        <p class="strong center-text-underline"><strong class="strong">${this.selectedFigura.cargo}</strong></p>
        <p>en el marco del Programa de Apoyo a la Educación Indígena.</p>
        <p>Reconozco que el otorgamiento de este apoyo no constituye una remuneración a un servicio personal ni subordinado,</p>
        <p>de manera que no representa un salario laboral por parte del INPI y manifiesto que no tengo ningún vínculo jurídico laboral</p>
        <p>que me una con el Instituto, lo que hago constar para todos los efectos legales que correspondan.</p>
        <br>
        <p class="text-center"><strong class="strong">${this.ciudadCarta}</strong>, a <strong class="strong">${this.diaCarta}</strong> de <strong class="strong">${mesActual}</strong> del <strong class="strong">${this.anioCarta}</strong></p>
        <br>
        <p class="text-center">RECIBÍ APOYO ECONÓMICO</p>
        <p class="strong center-text-underline"><strong class="strong">${this.selectedFigura.nombreCompleto}</strong></p>
        <p class="text-center">Nombre completo y firma autógrafa:</p>
        <br>
        <p class="note">NOTA:</p>
        <p class="note">Se deberá anexar copia de identificación oficial vigente con fotografía (INE, pasaporte, cédula profesional).</p>
        <p class="note">Fundamento Legal (Artículo 90 de la Ley del Impuesto sobre la Renta):</p>
        <p class="note-content">Este recibo fue realizado en conformidad con el Artículo 90 de la Ley de Impuesto sobre la Renta, que a la letra en sus párrafos 5 y 6 respectivamente, para tales efectos indica:</p>
        <p class="note-content">“Tampoco se consideran ingresos para efectos de este Título, los ingresos por apoyos económicos o monetarios que reciban los contribuyentes a través de los programas previstos en los presupuestos de egresos, de la Federación o de las Entidades Federativas.</p>
        <p class="note-content">Para efectos del párrafo anterior, en el caso de que los recursos que reciban los contribuyentes se destinen al apoyo de actividades empresariales, los programas correspondientes deberán contar con un padrón de beneficiarios; los recursos se deberán distribuir a través de transferencia electrónica de fondos a nombre de los beneficiarios quienes, a su vez, deberán cumplir con las obligaciones que se hayan establecido en las reglas de operación de los citados programas y deberán contar con la opinión favorable por parte de la autoridad competente respecto del cumplimiento de obligaciones fiscales cuando estén obligados a solicitarla en los términos de las disposiciones fiscales.</p>
        <p class="note-content">Los gastos o erogaciones que se realicen con los apoyos económicos a que se refiere este párrafo, que no se consideren ingresos, no serán deducibles para efectos de este impuesto. Las dependencias o entidades, federales o estatales, encargadas de otorgar o administrar los apoyos económicos o monetarios, deberán poner a disposición del público en general y mantener actualizados en sus respectivos medios electrónicos, el padrón de beneficiarios a que se refiere este párrafo, mismo que deberá contener los siguientes datos: nombre de la persona física beneficiaria, el monto, recurso, beneficio o apoyo otorgado para cada una de ellas, la unidad territorial, edad y sexo.”</p>
      </div>
    `;
    this.letterPreview = this.sanitizer.bypassSecurityTrustHtml(template);
  }

  /**
   * Genera el PDF de la carta utilizando html2pdf.js.
   */
  generatePdf(): void {
    if (this.cantidadNumero === null || this.diaCarta === null || !this.mesSeleccionado || !this.selectedFigura) {
      //alert('Por favor, rellena todos los campos de la carta antes de generar el PDF.');
      return;
    }

    // Obtener el elemento que contiene la previsualización de la carta
    const element = document.getElementById('letter-preview-content');

    if (element) {
      // Opciones para la generación del PDF
      const opt = {
        // --- Márgenes ajustados para intentar que todo quepa en una hoja ---
        // Los valores son [top, left, bottom, right] en milímetros (mm).
        // He reducido los márgenes a 10mm en todos los lados. Si sigue sin caber,
        // puedes probar con valores aún menores (ej. 5mm) si la impresora lo permite,
        // o considerar reducir un poco más el tamaño de fuente en el CSS.
        margin: [4, 4, 4, 4], 
        // --- FIN DE AJUSTE DE MÁRGENES ---
        filename: `Recibo_Apoyo_INPI_${this.selectedFigura.nombreCompleto.replace(/\s/g, '_')}_${this.mesSeleccionado}_${this.anioCarta}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, logging: true, dpi: 192, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'letter', orientation: 'portrait' }
      };

      // Importar html2pdf dinámicamente si aún no está cargado
      if (typeof html2pdf === 'undefined') {
        console.error('html2pdf.js no está cargado. Asegúrate de incluir el script en tu angular.json o en el HTML del componente (si es carga externa).');
        //alert('Error: La librería de generación de PDF no está cargada. Intenta de nuevo más tarde o revisa la configuración.');
        return;
      }
      
      // Utilizar html2pdf para generar el PDF
      html2pdf().from(element).set(opt).save();
    } else {
      console.error('Elemento de previsualización de la carta no encontrado.');
      //alert('Error: No se pudo encontrar el contenido de la carta para generar el PDF.');
    }
  }

  // Se llama en cualquier cambio de input para actualizar la previsualización
  onInputChange(): void {
    this.generateLetterContent();
  }
}