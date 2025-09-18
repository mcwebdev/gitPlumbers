import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { map, take } from 'rxjs';

import { AuthUserService } from '../services/auth-user.service';

export const userGuard: CanActivateFn = () => {
  const auth = inject(AuthUserService);
  const router = inject(Router);

  return auth.profile$.pipe(
    take(1),
    map((profile) => (profile ? true : router.createUrlTree(['/login'])))
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthUserService);
  const router = inject(Router);

  return auth.profile$.pipe(
    take(1),
    map((profile) => {
      if (!profile) {
        return router.createUrlTree(['/login']);
      }

      if (profile.role !== 'admin') {
        return router.createUrlTree(['/dashboard']);
      }

      return true;
    })
  );
};

