import { TestBed } from '@angular/core/testing';

import { LoginPanelPwService } from './login-panel-pw.service';

describe('LoginPanelPwService', () => {
  let service: LoginPanelPwService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoginPanelPwService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
