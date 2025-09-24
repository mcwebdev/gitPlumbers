import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { filter, from, map, switchMap, take } from 'rxjs';

import { AuthUserService } from '../services/auth-user.service';

type GuardResult = boolean | UrlTree;

type GuardEvaluator = (profile: ReturnType<AuthUserService['profile']>) => GuardResult;

const evaluateGuard = (auth: AuthUserService, firebaseAuth: Auth, evaluator: GuardEvaluator) => {
  const cachedProfile = auth.profile();

  if (cachedProfile !== undefined) {
    return evaluator(cachedProfile);
  }

  return from(firebaseAuth.authStateReady()).pipe(
    switchMap(() =>
      auth.profile$.pipe(
        filter((profile) => profile !== undefined),
        take(1),
        map((profile) => evaluator(profile))
      )
    )
  );
};

export const userGuard: CanActivateFn = () => {
  const auth = inject(AuthUserService);
  const router = inject(Router);
  const firebaseAuth = inject(Auth);

  return evaluateGuard(auth, firebaseAuth, (profile) =>
    profile ? true : router.createUrlTree(['/login'])
  );
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthUserService);
  const router = inject(Router);
  const firebaseAuth = inject(Auth);

  return evaluateGuard(auth, firebaseAuth, (profile) => {
    if (!profile) {
      return router.createUrlTree(['/login']);
    }

    if (profile.role !== 'admin') {
      return router.createUrlTree(['/dashboard']);
    }

    return true;
  });
};