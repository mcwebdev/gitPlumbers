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
    provideFirebaseApp(() => {
      console.log('[Firebase] Initializing Firebase app with config:', {
        apiKey: firebaseConfig.apiKey?.substring(0, 10) + '...',
        authDomain: firebaseConfig.authDomain,
        projectId: firebaseConfig.projectId,
      });
      const app = initializeApp(firebaseConfig);
      console.log('[Firebase] Firebase app initialized:', {
        name: app.name,
        options: {
          projectId: app.options.projectId,
          authDomain: app.options.authDomain,
        },
      });
      return app;
    }),
    // Never wire up emulators here; this app should always use the hosted Firebase services.
    provideAuth(() => {
      console.log('[Firebase] Initializing Auth...');
      const auth = getAuth();
      console.log('[Firebase] Auth initialized:', {
        app: auth.app.name,
        currentUser: !!auth.currentUser,
      });
      return auth;
    }),
    provideFirestore(() => {
      console.log('[Firebase] Initializing Firestore...');
      const firestore = getFirestore();
      console.log('[Firebase] Firestore initialized:', {
        app: firestore.app.name,
        type: firestore.type,
        settings: 'private',
      });
      return firestore;
    }),
    provideFunctions(() => {
      console.log('[Firebase] Initializing Functions...');
      const functions = getFunctions();
      console.log('[Firebase] Functions initialized:', {
        app: functions.app.name,
        region: functions.region,
      });
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
