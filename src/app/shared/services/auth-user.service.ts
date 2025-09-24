import { Injectable, computed, inject, signal, effect } from '@angular/core';
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
import { from, map, of, shareReplay, switchMap, startWith, tap } from 'rxjs';
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

  private readonly STORAGE_KEY = 'gitplumbers_auth_profile';
  
  // Initialize with cached profile from localStorage if available
  private readonly cachedProfile = this.getCachedProfile();
  
  private readonly authState$ = authState(this.auth).pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly profile$ = this.authState$.pipe(
    switchMap((user) => {
      if (!user) {
        // Clear cache when user logs out
        this.clearCachedProfile();
        return of(null);
      }
      const userDocRef = doc(this.firestore, 'users', user.uid);
      return from(getDoc(userDocRef)).pipe(
        map((snapshot) => {
          const docValue = snapshot.exists() ? (snapshot.data() as UserDocument) : undefined;
          const profile = this.mergeUserAndDoc(user, docValue);
          // Cache the profile to localStorage
          this.setCachedProfile(profile);
          return profile;
        })
      );
    }),
    // Start with cached profile if available, then update with real data
    startWith(this.cachedProfile),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // Use cached profile as initial value if available, otherwise undefined
  readonly profile = toSignal(this.profile$, { initialValue: this.cachedProfile });

  // Add a loading state signal - only loading if no cached data and profile is undefined
  readonly isAuthLoading = computed(() => {
    const profile = this.profile();
    return !this.cachedProfile && profile === undefined;
  });
  
  // Update isLoggedIn to handle loading state
  readonly isLoggedIn = computed(() => {
    const profile = this.profile();
    return profile !== undefined && profile !== null;
  });

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

    try {
      // Ensure user document exists first, then update with GitHub installation ID
      await this.ensureUserDocument(user, { githubInstallationId: installationId });
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

    try {
      // Update Firebase Auth profile if displayName is being updated
      if (updates.displayName !== undefined) {
        await updateProfile(user, { displayName: updates.displayName });
      }

      // Ensure user document exists first, then update with the new data
      await this.ensureUserDocument(user, updates);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to update user profile: ${errorMessage}`);
    }
  }

  async logout(): Promise<void> {
    this.clearCachedProfile();
    await signOut(this.auth);
    await this.router.navigate(['/']);
  }

  private isLocalStorageAvailable(): boolean {
    try {
      return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  private getCachedProfile(): UserProfile | undefined {
    if (!this.isLocalStorageAvailable()) {
      return undefined;
    }

    try {
      const cached = localStorage.getItem(this.STORAGE_KEY);
      if (cached) {
        const profile = JSON.parse(cached) as UserProfile;
        // Validate cached profile has required fields
        if (profile.uid && profile.email && profile.role) {
          return profile;
        }
      }
    } catch (error) {
      console.warn('Failed to parse cached auth profile:', error);
      this.clearCachedProfile();
    }
    return undefined;
  }

  private setCachedProfile(profile: UserProfile): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profile));
    } catch (error) {
      console.warn('Failed to cache auth profile:', error);
    }
  }

  private clearCachedProfile(): void {
    if (!this.isLocalStorageAvailable()) {
      return;
    }

    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear cached auth profile:', error);
    }
  }
}
