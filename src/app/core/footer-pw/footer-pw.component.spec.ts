import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FooterPwComponent } from './footer-pw.component';

describe('FooterPwComponent', () => {
  let component: FooterPwComponent;
  let fixture: ComponentFixture<FooterPwComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterPwComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FooterPwComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
