import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, User, authState, signOut } from '@angular/fire/auth';
import {
  Firestore,
  doc,
  docData,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';
import { from, map, of, shareReplay, switchMap } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface UserDocument {
  email?: string;
  displayName?: string;
  role?: UserRole;
  createdAt?: unknown;
  updatedAt?: unknown;
}

@Injectable({ providedIn: 'root' })
export class AuthUserService {
  private readonly auth = inject(Auth);
  private readonly firestore = inject(Firestore);
  private readonly router = inject(Router);

  private readonly authState$ = authState(this.auth).pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly profile$ = this.authState$.pipe(
    switchMap((user) => {
      if (!user) {
        return of(null);
      }
      const userDocRef = doc(this.firestore, 'users', user.uid);
      return from(getDoc(userDocRef)).pipe(
        map((snapshot) => {
          const docValue = snapshot.exists() ? (snapshot.data() as UserDocument) : undefined;
          return this.mergeUserAndDoc(user, docValue);
        })
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly profile = toSignal(this.profile$, { initialValue: null });

  readonly isAdmin = computed(() => this.profile()?.role === 'admin');

  private mergeUserAndDoc(user: User, docValue?: UserDocument): UserProfile {
    const base: UserProfile = {
      uid: user.uid,
      email: user.email ?? docValue?.email ?? '',
      displayName: user.displayName ?? docValue?.displayName ?? '',
      role: docValue?.role ?? 'user',
      createdAt: docValue?.createdAt,
      updatedAt: docValue?.updatedAt,
    };

    return base;
  }

  async ensureUserDocument(user: User, overrides?: Partial<UserProfile>): Promise<UserProfile> {
    const userDocRef = doc(this.firestore, 'users', user.uid);
    const snapshot = await getDoc(userDocRef);

    const describe = (value: unknown): string => {
      if (value === null) {
        return 'null';
      }
      if (value === undefined) {
        return 'undefined';
      }
      const ctor = (value as { constructor?: { name?: string } }).constructor;
      return ctor?.name ?? typeof value;
    };

    console.debug('[AuthUserService] ensureUserDocument attempt', {
      uid: user.uid,
      hasSnapshot: snapshot.exists(),
      overrideKeys: overrides ? Object.keys(overrides) : [],
    });

    if (!snapshot.exists()) {
      const payload: UserDocument = {
        email: user.email ?? overrides?.email ?? '',
        displayName: user.displayName ?? overrides?.displayName ?? '',
        role: overrides?.role ?? 'user',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      console.debug('[AuthUserService] creating user document', {
        uid: user.uid,
        email: payload.email,
        displayName: payload.displayName,
        role: payload.role,
        createdAtType: describe(payload.createdAt),
        updatedAtType: describe(payload.updatedAt),
      });

      try {
        await setDoc(userDocRef, payload, { merge: true });
      } catch (error) {
        console.error('[AuthUserService] setDoc failed', { uid: user.uid, error });
        throw error;
      }

      return {
        uid: user.uid,
        email: payload.email ?? '',
        displayName: payload.displayName ?? '',
        role: payload.role ?? 'user',
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      };
    }

    const currentData = snapshot.data() as UserDocument;
    const merged: UserDocument = {
      email: overrides?.email ?? currentData.email ?? user.email ?? '',
      displayName: overrides?.displayName ?? currentData.displayName ?? user.displayName ?? '',
      role: overrides?.role ?? currentData.role ?? 'user',
      createdAt: currentData.createdAt,
      updatedAt: currentData.updatedAt,
    };

    console.debug('[AuthUserService] merging user document', {
      uid: user.uid,
      emailChanged: merged.email !== currentData.email,
      displayNameChanged: merged.displayName !== currentData.displayName,
      roleChanged: merged.role !== currentData.role,
    });

    if (
      overrides?.email ||
      overrides?.displayName ||
      overrides?.role ||
      merged.email !== currentData.email ||
      merged.displayName !== currentData.displayName
    ) {
      try {
        await updateDoc(userDocRef, {
          email: merged.email,
          displayName: merged.displayName,
          role: merged.role,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error('[AuthUserService] updateDoc failed', { uid: user.uid, error });
        throw error;
      }
    }

    return {
      uid: user.uid,
      email: merged.email ?? '',
      displayName: merged.displayName ?? '',
      role: merged.role ?? 'user',
      createdAt: merged.createdAt,
      updatedAt: merged.updatedAt,
    };
  }

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    const snapshot = await getDoc(doc(this.firestore, 'users', uid));
    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data() as UserDocument;
    return {
      uid,
      email: data.email ?? '',
      displayName: data.displayName ?? '',
      role: data.role ?? 'user',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigate(['/']);
  }
}
