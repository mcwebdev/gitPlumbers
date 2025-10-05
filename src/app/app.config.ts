import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, UrlSerializer } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { getFunctions, provideFunctions } from '@angular/fire/functions';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { providePrimeNG } from 'primeng/config';
import { MessageService } from 'primeng/api';
import Aura from '@primeuix/themes/aura';
import { routes } from './app.routes';
import { TrailingSlashUrlSerializer } from './shared/routing/trailing-slash-url-serializer';
import { environment } from '../environments/environment';

const firebaseConfig = environment.firebase;

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideAnimations(),
    provideRouter(routes),
    { provide: UrlSerializer, useClass: TrailingSlashUrlSerializer },
    // REMOVED: provideClientHydration(withEventReplay()) - was blocking Firebase calls for 48+ seconds
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


