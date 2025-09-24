import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Auth, User, authState, signOut, updateProfile } from '@angular/fire/auth';
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
  githubInstallationId?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

interface UserDocument {
  email?: string;
  displayName?: string;
  role?: UserRole;
  githubInstallationId?: string;
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
      githubInstallationId: docValue?.githubInstallationId,
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

    // Validate user data before processing
    if (!user?.uid) {
      throw new Error('User ID is required to ensure user document');
    }

    if (!snapshot.exists()) {
      const payload: UserDocument = {
        email: user.email ?? overrides?.email ?? '',
        displayName: user.displayName ?? overrides?.displayName ?? '',
        role: overrides?.role ?? 'user',
        githubInstallationId: overrides?.githubInstallationId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Validate payload before creating document
      if (!payload.email || !payload.displayName) {
        throw new Error('Email and display name are required to create user document');
      }

      try {
        await setDoc(userDocRef, payload, { merge: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to create user document: ${errorMessage}`);
      }

      return {
        uid: user.uid,
        email: payload.email ?? '',
        displayName: payload.displayName ?? '',
        role: payload.role ?? 'user',
        githubInstallationId: payload.githubInstallationId,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      };
    }

    const currentData = snapshot.data() as UserDocument;
    const merged: UserDocument = {
      email: overrides?.email ?? currentData.email ?? user.email ?? '',
      displayName: overrides?.displayName ?? currentData.displayName ?? user.displayName ?? '',
      role: overrides?.role ?? currentData.role ?? 'user',
      githubInstallationId: overrides?.githubInstallationId ?? currentData.githubInstallationId,
      createdAt: currentData.createdAt,
      updatedAt: currentData.updatedAt,
    };

    // Validate merged data before processing
    if (!merged.email || !merged.displayName) {
      throw new Error('Email and display name are required to update user document');
    }

    if (
      overrides?.email ||
      overrides?.displayName ||
      overrides?.role ||
      overrides?.githubInstallationId ||
      merged.email !== currentData.email ||
      merged.displayName !== currentData.displayName ||
      merged.githubInstallationId !== currentData.githubInstallationId
    ) {
      try {
        await updateDoc(userDocRef, {
          email: merged.email,
          displayName: merged.displayName,
          role: merged.role,
          githubInstallationId: merged.githubInstallationId,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to update user document: ${errorMessage}`);
      }
    }

    return {
      uid: user.uid,
      email: merged.email ?? '',
      displayName: merged.displayName ?? '',
      role: merged.role ?? 'user',
      githubInstallationId: merged.githubInstallationId,
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
      githubInstallationId: data.githubInstallationId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  }

  async updateGitHubInstallationId(installationId: string): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to update GitHub installation ID');
    }

    const userDocRef = doc(this.firestore, 'users', user.uid);
    try {
      await updateDoc(userDocRef, {
        githubInstallationId: installationId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update GitHub installation ID: ${errorMessage}`);
    }
  }

  async updateUserProfile(updates: Partial<Pick<UserProfile, 'displayName'>>): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw new Error('User must be authenticated to update profile');
    }

    const userDocRef = doc(this.firestore, 'users', user.uid);
    
    try {
      // Update Firebase Auth profile if displayName is being updated
      if (updates.displayName !== undefined) {
        await updateProfile(user, { displayName: updates.displayName });
      }

      // Update Firestore document
      await updateDoc(userDocRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update user profile: ${errorMessage}`);
    }
  }

  async logout(): Promise<void> {
    await signOut(this.auth);
    await this.router.navigate(['/']);
  }
}
