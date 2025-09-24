import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { BehaviorSubject, firstValueFrom, filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthPreloaderService {
  private readonly auth = inject(Auth);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly _initialized = new BehaviorSubject<boolean>(false);
  
  readonly initialized$ = this._initialized.asObservable();

  constructor() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    // Only initialize on browser platform
    if (!isPlatformBrowser(this.platformId)) {
      this._initialized.next(true);
      return;
    }

    // Wait for Firebase Auth to determine initial auth state
    const unsubscribe = onAuthStateChanged(this.auth, () => {
      this._initialized.next(true);
      unsubscribe(); // Only need to listen once for initialization
    });
  }

  async waitForInitialization(): Promise<void> {
    if (this._initialized.value) {
      return;
    }
    
    await firstValueFrom(this.initialized$.pipe(
      // Wait until initialized is true
      filter(initialized => initialized)
    ));
  }
}
