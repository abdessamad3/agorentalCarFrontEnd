import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    // AuthService's constructor reads auth_token/refresh_token from localStorage and
    // can call logout() (a real HTTP POST without provideHttpClientTesting()) if a
    // stale token happens to be present -- clear it first so this test never depends
    // on whatever a previous spec left behind, and never makes a live network call.
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthService);
  });

  afterEach(() => localStorage.clear());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
