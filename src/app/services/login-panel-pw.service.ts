// src/app/services/login-panel.service.ts
import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LoginPanelService {
  // Un Subject que actuará como un Observable para emitir señales
  private openPanelSubject = new Subject<void>();

  // Observable que los componentes pueden suscribirse para recibir la señal
  openPanel$: Observable<void> = this.openPanelSubject.asObservable();

  constructor() { }

  /**
   * Emite una señal para indicar que el panel de login debe abrirse/cerrarse.
   * Cualquier componente suscrito a openPanel$ recibirá esta señal.
   */
  toggleLoginPanel(): void {
    this.openPanelSubject.next();
  }
}
