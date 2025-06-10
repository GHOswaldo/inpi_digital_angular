// src/app/core/navbar-pw/navbar-pw.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NavbarPwComponent } from './navbar-pw.component';

describe('NavbarPwComponent', () => {
  let component: NavbarPwComponent;
  let fixture: ComponentFixture<NavbarPwComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NavbarPwComponent] // Solo importa el componente en sí mismo si es standalone
    })
    .compileComponents(); // Compila el componente para las pruebas

    fixture = TestBed.createComponent(NavbarPwComponent); // Crea una instancia del componente
    component = fixture.componentInstance; // Obtiene la instancia del componente
    fixture.detectChanges(); // Ejecuta la detección de cambios inicial para renderizar el componente
  });

  it('should create', () => {
    expect(component).toBeTruthy(); // Verifica que el componente se haya creado correctamente
  });
});