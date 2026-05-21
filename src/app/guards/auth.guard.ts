import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  // 1. Inject dependencies using inject() (functional way)
  const authService = inject(AuthService);
  const router = inject(Router);

  // 2. Check if user is logged in
  if (authService.isAuthenticated()) {
    return true; // Allow access
  }

  // 3. If not logged in, redirect to login page
  // We save the attempted URL so we can redirect back after login (optional UX bonus)
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};
