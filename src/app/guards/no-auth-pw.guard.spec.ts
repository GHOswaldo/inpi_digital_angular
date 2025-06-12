import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { noAuthPwGuard } from './no-auth-pw.guard';

describe('noAuthPwGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => noAuthPwGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
