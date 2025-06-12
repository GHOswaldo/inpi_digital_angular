// src/app/app.component.ts
import { Component, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core'; // Importa ViewChild, AfterViewInit, OnDestroy
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { NavbarPwComponent } from './core/navbar-pw/navbar-pw.component';
import { FooterPwComponent } from './core/footer-pw/footer-pw.component';
import { LoginPwComponent } from './components/login-pw/login-pw.component';
import { AuthService, UserProfile } from './services/auth.service';
import { LoginPanelService } from './services/login-panel-pw.service';
import { Observable, Subscription } from 'rxjs'; // Importa Subscription
import { map, switchMap } from 'rxjs/operators';
import { User } from '@angular/fire/auth';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    NavbarPwComponent,
    FooterPwComponent,
    LoginPwComponent
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy { // Implementa AfterViewInit, OnDestroy
  title = 'inpi-pw';

  // Obtenemos una referencia al componente LoginPwComponent, ahora que es hijo directo de AppComponent
  @ViewChild(LoginPwComponent) loginPanelComponent: LoginPwComponent | undefined;

  currentUser$: Observable<User | null>;
  userProfile$: Observable<UserProfile | null>;
  userName$: Observable<string | null>;

  private panelToggleSubscription: Subscription; // Para gestionar la suscripción del servicio

  constructor(
    private authService: AuthService,
    private loginPanelService: LoginPanelService // Inyecta el nuevo servicio
  ) {
    this.currentUser$ = this.authService.currentUser$;

    this.userProfile$ = this.currentUser$.pipe(
      switchMap(user => {
        if (user && user.uid) {
          return this.authService.getUserProfile(user.uid);
        } else {
          return new Observable<UserProfile | null>(observer => {
            observer.next(null);
            observer.complete();
          });
        }
      })
    );

    this.userName$ = this.userProfile$.pipe(
      map(userProfile => {
        if (userProfile && userProfile.displayName) {
          return userProfile.displayName;
        } else if (userProfile && userProfile.email) {
          return userProfile.email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, char => char.toUpperCase());
        }
        return null;
      })
    );

    // Inicializa la suscripción (se asignará en ngAfterViewInit)
    this.panelToggleSubscription = new Subscription();
  }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    // Nos suscribimos al servicio DESPUÉS de que la vista se ha inicializado
    // para asegurar que loginPanelComponent ya esté disponible.
    this.panelToggleSubscription = this.loginPanelService.openPanel$.subscribe(() => {
      if (this.loginPanelComponent) {
        this.loginPanelComponent.togglePanel();
      } else {
        console.warn('LoginPwComponent no encontrado en AppComponent. No se pudo alternar el panel.');
      }
    });
  }

  ngOnDestroy(): void {
    // Es crucial desuscribirse para evitar fugas de memoria
    if (this.panelToggleSubscription) {
      this.panelToggleSubscription.unsubscribe();
    }
  }
}
