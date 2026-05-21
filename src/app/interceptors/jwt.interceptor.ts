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

  console.log('🌐 INTERCEPTOR - Intercepting request:');
  console.log('   URL:', request.url);
  console.log('   Method:', request.method);
  console.log('   Token available:', !!token);

  // Clone request and add token if available
  if (token) {
    console.log('✅ Adding Authorization header with token');
    console.log('   Token:', token.substring(0, 20) + '...');

    request = request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });

    console.log('✅ Request cloned with Authorization header');
  } else {
    console.warn('⚠️ No token available! Request will be sent without Authorization');
  }

  // Handle response
  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('❌ HTTP Error:');
      console.error('   Status:', error.status);
      console.error('   Message:', error.message);
      console.error('   Body:', error.error);

      // Handle 401 Unauthorized
      if (error.status === 401) {
        console.error('🔴 401 Unauthorized - Token is invalid or expired');
        authService.logout();
        router.navigate(['/login']);
      }

      return throwError(() => error);
    })
  );
};
