import { isPlatformServer } from '@angular/common';
import {
  ApplicationConfig,
  PLATFORM_ID,
  inject,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth, connectAuthEmulator } from '@angular/fire/auth';
import { connectFunctionsEmulator, getFunctions, provideFunctions } from '@angular/fire/functions';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

const firebaseConfig = {
  apiKey: 'AIzaSyD-bfWuFt2M1plj_gamhS3RadtD7R34HRI',
  authDomain: 'gitplumbers-35d92.firebaseapp.com',
  projectId: 'gitplumbers-35d92',
  storageBucket: 'gitplumbers-35d92.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideRouter(routes),
    provideClientHydration(),
    provideHttpClient(withFetch()),
    MessageService,
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => {
      const auth = getAuth();
      const platformId = inject(PLATFORM_ID);

      if (
        !isPlatformServer(platformId) &&
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      }

      return auth;
    }),
    provideFunctions(() => {
      const functions = getFunctions();
      const platformId = inject(PLATFORM_ID);
      // Connect to emulator in development for both client and server
      if (
        !isPlatformServer(platformId) &&
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        connectFunctionsEmulator(functions, 'localhost', 5001);
      }
      return functions;
    }),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
      ripple: true,
    }),
  ],
};
