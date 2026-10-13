import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/** Bounces an already-logged-in user away from /login and /register -- otherwise
 *  hitting those routes via the back button, a bookmark, or a refresh just re-shows
 *  the login form with no way back in, even though the session is still valid. */
export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated() && authService.hasRole('ROLE_USER')) {
    if (authService.mustChangePassword()) {
      return router.createUrlTree(['/change-password']);
    }
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
