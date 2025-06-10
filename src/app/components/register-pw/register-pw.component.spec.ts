import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RegisterPwComponent } from './register-pw.component';

describe('RegisterPwComponent', () => {
  let component: RegisterPwComponent;
  let fixture: ComponentFixture<RegisterPwComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RegisterPwComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterPwComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
