import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { authGuardPwGuard } from './auth-pw.guard';

describe('authGuardPwGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => authGuardPwGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
