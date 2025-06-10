import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoginPwComponent } from './login-pw.component';

describe('LoginPwComponent', () => {
  let component: LoginPwComponent;
  let fixture: ComponentFixture<LoginPwComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPwComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginPwComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
