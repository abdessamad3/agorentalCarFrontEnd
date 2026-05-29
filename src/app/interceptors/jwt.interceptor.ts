import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get token from auth service
  const token = authService.getToken();

  // Clone request and add token if available
  if (token) {

    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

  } else {
  }

  // Handle response
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('❌ HTTP Error:');
      console.error('   Status:', error.status);
      console.error('   Message:', error.message);
      console.error('   Body:', error.error);

      // Handle 401 only for protected routes (not auth endpoints)
      const isAuthRoute = request.url.includes('/auth/login') || request.url.includes('/auth/register');
      if (error.status === 401 && !isAuthRoute) {
        authService.logout();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
