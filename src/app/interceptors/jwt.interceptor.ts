import {
  HttpInterceptorFn, HttpErrorResponse,
  HttpContextToken, HttpContext,
  HttpRequest, HttpHandlerFn
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, tap, throwError, filter, take } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const SKIP_AUTH_REDIRECT = new HttpContextToken<boolean>(() => false);

const isAuthRoute = (url: string) =>
  url.includes('/auth/login') ||
  url.includes('/auth/register') ||
  url.includes('/auth/refresh') ||
  url.includes('/auth/logout');

function cloneWithToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const jwtInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const router      = inject(Router);

  const isAuth = isAuthRoute(request.url);

  if (!isAuth && authService.getToken() && authService.isSessionExpired()) {
    authService.logout();
    router.navigate(['/login']);
    return throwError(() => new Error('Session expired due to inactivity'));
  }

  const token = authService.getToken();
  if (token) {
    request = cloneWithToken(request, token);
  }

  return next(request).pipe(
    tap(() => {
      if (!isAuth && authService.getToken()) {
        authService.updateActivity();
      }
    }),
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuth && !request.context.get(SKIP_AUTH_REDIRECT)) {
        const refreshToken = authService.getRefreshToken();

        if (refreshToken && !authService.refreshing$.getValue()) {
          // Start refresh
          authService.refreshing$.next(true);

          return authService.refreshAccessToken().pipe(
            switchMap((newToken: string) => {
              authService.refreshing$.next(false);
              return next(cloneWithToken(request, newToken));
            }),
            catchError((refreshError) => {
              authService.refreshing$.next(false);
              authService.logout();
              router.navigate(['/login']);
              return throwError(() => refreshError);
            })
          );
        }

        if (authService.refreshing$.getValue()) {
          // Another request already started refresh — wait for it to finish
          return authService.refreshing$.pipe(
            filter(isRefreshing => !isRefreshing),
            take(1),
            switchMap(() => {
              const newToken = authService.getToken();
              return newToken
                ? next(cloneWithToken(request, newToken))
                : throwError(() => error);
            })
          );
        }

        authService.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
