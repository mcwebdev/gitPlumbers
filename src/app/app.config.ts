import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';
import { provideClientHydration } from '@angular/platform-browser';

const firebaseConfig = {
  apiKey: 'AIzaSyD-bfWuFt2M1plj_gamhS3RadtD7R34HRI',
  authDomain: 'gitplumbers-35d92.firebaseapp.com',
  databaseURL: 'https://gitplumbers-35d92-default-rtdb.firebaseio.com',
  projectId: 'gitplumbers-35d92',
  storageBucket: 'gitplumbers-35d92.firebasestorage.app',
  messagingSenderId: '26354659373',
  appId: '1:26354659373:web:41a73fb6c95a3098f5c8a4',
  measurementId: 'G-QL89VJ3CC3',
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
    // Never wire up emulators here; this app should always use the hosted Firebase services.
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideFunctions(() => getFunctions()),
    providePrimeNG({
      theme: {
        preset: Aura,
      },
      ripple: true,
    }),
  ],
};
