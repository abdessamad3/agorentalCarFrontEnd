import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const ROLE_HIERARCHY: Record<string, string[]> = {
  'ROLE_ADMIN':   ['ROLE_MANAGER', 'ROLE_STAFF', 'ROLE_USER'],
  'ROLE_MANAGER': ['ROLE_STAFF', 'ROLE_USER'],
  'ROLE_STAFF':   ['ROLE_USER'],
};

function expandRoles(roles: string[]): string[] {
  const expanded = new Set(roles);
  for (const role of roles) {
    for (const inherited of (ROLE_HIERARCHY[role] ?? [])) {
      expanded.add(inherited);
    }
  }
  return Array.from(expanded);
}

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const required: string[] = route.data?.['roles'] ?? [];
  if (required.length === 0) return true;

  const user = authService.getStoredUser();
  const userRoles: string[] = expandRoles(user?.roles ?? []);

  const hasRole = required.some(r => userRoles.includes(r));
  if (!hasRole) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
