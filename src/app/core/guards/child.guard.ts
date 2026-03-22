import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from '../services/auth.service';

export const childGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  if (authService.getCurrentRole()?.toLowerCase() !== 'child') {
    return router.parseUrl('/home');
  }

  return true;
};
