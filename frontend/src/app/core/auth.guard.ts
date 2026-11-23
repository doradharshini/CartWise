import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Port of ProtectedRoute. Usage: canActivate: [authGuard('ADMIN')] (role optional). */
export const authGuard = (requiredRole?: string): CanActivateFn => (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/login'], { queryParams: { from: state.url } });
  }
  if (requiredRole && auth.role() !== requiredRole.toUpperCase()) {
    return router.createUrlTree(['/']);
  }
  return true;
};
