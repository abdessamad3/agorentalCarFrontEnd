import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { LoginComponent } from './login.component';
import { AuthService } from '../../services/auth.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;

  beforeEach(async () => {
    // AuthService/TranslationService need HttpClient; the component injects Router.
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('rejects a customer (ROLE_CLIENT) account with a clear error instead of a false success + silent redirect loop', () => {
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    spyOn(authService, 'login').and.returnValue(of({}));
    // A ROLE_CLIENT-only account has no ROLE_USER -- this is exactly what authGuard
    // checks to bounce them back to /login, which is the silent-stuck-on-login bug.
    spyOn(authService, 'hasRole').and.returnValue(false);
    const logoutSpy = spyOn(authService, 'logout');
    const navigateSpy = spyOn(router, 'navigate');

    component.loginForm.setValue({ email: 'client@example.com', password: 'whatever1' });
    component.onSubmit();

    expect(logoutSpy).toHaveBeenCalled();
    expect(component.errorMessage).toBeTruthy();
    expect(component.successMessage).toBeFalsy();
    expect(navigateSpy).not.toHaveBeenCalledWith(['/dashboard']);
  });

  it('logs a real staff account in normally (success message + redirect, no logout)', (done) => {
    const authService = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    spyOn(authService, 'login').and.returnValue(of({}));
    spyOn(authService, 'hasRole').and.returnValue(true);
    const logoutSpy = spyOn(authService, 'logout');
    const navigateSpy = spyOn(router, 'navigate');

    component.loginForm.setValue({ email: 'staff@example.com', password: 'whatever1' });
    component.onSubmit();

    expect(logoutSpy).not.toHaveBeenCalled();
    expect(component.successMessage).toBeTruthy();
    expect(component.errorMessage).toBeFalsy();
    setTimeout(() => {
      expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
      done();
    }, 1100);
  });
});
