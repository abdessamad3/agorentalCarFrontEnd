import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }

  // Client-portal accounts (ROLE_CLIENT) must never reach the admin dashboard.
  if (!authService.hasRole('ROLE_USER')) {
    return router.createUrlTree(['/login']);
  }

  // Redirect to change-password if the user is required to change it,
  // but not if they are already navigating to that page (avoids infinite loop).
  if (authService.mustChangePassword() && !state.url.startsWith('/change-password')) {
    return router.createUrlTree(['/change-password']);
  }

  return true;
};
