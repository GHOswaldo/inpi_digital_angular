import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardPwComponent } from './dashboard-pw.component';

describe('DashboardPwComponent', () => {
  let component: DashboardPwComponent;
  let fixture: ComponentFixture<DashboardPwComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPwComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DashboardPwComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
