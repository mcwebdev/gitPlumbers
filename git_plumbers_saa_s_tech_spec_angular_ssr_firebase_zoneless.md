# gitPlumbers SaaS – Technical Specification (Angular SSR + Firebase, Zoneless)

**Last updated:** 2025‑09‑16  
**Primary color:** `#004c89`  
**Stack:** Angular 17+ (standalone, SSR, zoneless), Firebase (Auth, Firestore, Hosting, Functions/Cloud Run optional), PrimeNG + PrimeFlex (utility CSS)

---

## 1) Goals & Non‑Goals

### Goals
- Marketing splash page (SEO‑friendly, SSR, fast) for **gitPlumbers**.
- Auth flows: **sign‑in**, **sign‑up**, **sign‑out**, **forgot‑password** using Firebase Auth (email/password; providers extensible).
- Post‑login **Dashboard** shell with protected routes.
- Clean **zoneless** Angular configuration and SSR on Firebase Hosting + Functions.
- Strong security (Firestore rules, Auth guards), accessibility (WCAG 2.1 AA), and performance.

### Non‑Goals
- Deep product features beyond the dashboard shell.  
- Complex role/permissions UI (spec includes foundation only).

---

## 2) Brand, Voice, and Content

- **Product name:** gitPlumbers  
- **Tagline (proposed):** _"We unclog your tech debt—so your code can flow."_  
- **Primary color:** `#004c89` (derived from the logo).  
- **Secondary (neutral) palette:** `#0b1f2e` (ink), `#e6f0f7` (tint), `#ffffff` (surface), `#ffcc00` (accent/warn alt).  
- **Typography:** System stack or Inter; 1.25–1.5 line‑height; `rem` units; prefers‑reduced‑motion supported.  
- **Iconography:** Lucide or Material Symbols rounded.  

### Landing Page Copy (gitPlumbers‑branded)

**Hero:**  
_“Stop vibe coding. Start shipping with confidence.”_  
**Sub:** In today’s fast‑moving tech landscape, “vibe coding” breeds patchwork, bugs, and fragile systems. **gitPlumbers** stabilizes foundations and unlocks sustainable velocity.

**What we do**  
- **Enterprise Application Development** – Scalable, future‑ready systems tailored to your stack.  
- **Advanced Data Visualization** – Clear, actionable insights from complex data.  
- **Facial Recognition** – Robust identity verification for security and trust.  
- **Body Pix AI** – Real‑time body recognition for immersive, human‑centered apps.  
- **Voice Command Integration** – Accessible, natural interfaces powered by speech.  
- **Web3 & Blockchain** – Secure, decentralized solutions (smart contracts, dApps).

**Why gitPlumbers?**  
Tech Debt Triage • Bug Resolution at Scale • AI‑Powered Innovation.  
_Your business deserves more than vibe coding. With gitPlumbers, stabilize today and innovate for tomorrow._

> Note: Content above adapts provided copy from "DeepSpeed AI" to **gitPlumbers** per request.

---

## 3) Information Architecture & Routes

| Path | Page/Feature | Access | Notes |
|---|---|---|---|
| `/` | Marketing Splash | Public | SSR + pre‑render for SEO. |
| `/auth/sign-in` | Sign‑in | Public | Email/password; OAuth optional later. |
| `/auth/sign-up` | Sign‑up | Public | Terms/Privacy links. |
| `/auth/forgot-password` | Forgot password | Public | Sends reset email; confirm screen. |
| `/auth/sign-out` | Sign‑out | Public | Executes signOut then redirects. |
| `/app` | Dashboard (shell) | **Protected** | Requires auth guard; lazy module. |
| `/app/profile` | User profile | Protected | Update display name, photo URL. |
| `/legal/terms`, `/legal/privacy` | Legal pages | Public | Static markdown routed. |
| `/*` | 404 | Public | SSR friendly.

---

## 4) High‑Level Architecture

- **Angular 17+** standalone app with **SSR** and **zoneless** change detection.  
- **Firebase Auth** for identity; **Firestore** for user profile + app data.  
- **Firebase Hosting** serves static + SSR via **Cloud Functions** (or Cloud Run).  
- **PrimeNG/PrimeFlex CSS** for layout/utility; **PrimeNG** for form controls with custom theme.

```
Browser ⇄ Firebase Hosting ⇄ (SSR) Cloud Function (Express + Angular server bundle)
                                     ⇣
                                   Firestore, Auth, (Storage optional)
```

---

## 5) Project Setup (commands & structure)

### 5.1 Angular + SSR
1. (Starter provided) Keep existing SSR and **zoneless** setup. Ensure `provideRouter(routes)`, `provideClientHydration(withEventReplay())`, and `provideZonelessChangeDetection()` are present in `app.config.ts`.
2. Confirm `main.server.ts`/`server.ts` entries compile and deploy on Firebase Functions/Hosting.

### 5.2 Firebase
1. `firebase init` → Hosting (SSR), Functions (Node 20), Firestore, Emulators.  
2. `ng add @angular/fire` and configure environments.  
3. Emulators: Auth, Firestore, Functions; `firebase emulators:start`.  
4. **Set `projectId`** in `environment.ts` and verify Firebase config matches your console app.

### 5.3 Suggested Workspace Structure
```
/src
  /app
    app.config.ts
    app.routes.ts
    core/ (services, guards)
    shared/ (ui atoms, pipes)
    features/
      marketing/
      auth/
        sign-in/
        sign-up/
        forgot-password/
        sign-out/
      dashboard/
  index.html
  main.ts
  main.server.ts
  server.ts
/functions (Firebase Functions)
/firebase.json
/firestore.rules
```

### 5.4 PrimeNG Setup (in this starter)
- Install: `npm i primeng primeicons primeflex`.  
- Global styles: add the imports shown in **Theming & UI System** to `styles.scss` (create it if missing) and reference it in `angular.json` → `projects.<app>.architect.build.options.styles`.
- If you prefer per‑component styles only, you can import PrimeNG CSS in `app.scss`, but global `styles.scss` is recommended.

---

## 6) Zoneless + SSR Configuration (Angular 17+)

**`main.ts`**
```ts
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

bootstrapApplication(AppComponent, {
  ...appConfig,
  ngZone: 'noop', // zoneless
});
```

**`app.config.ts`** (core providers)
```ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { getApp, initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { routes } from './app.routes';
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideClientHydration(),
    provideHttpClient(withInterceptors([authTokenInterceptor])),
    importProvidersFrom(
      provideFirebaseApp(() => initializeApp(environment.firebase)),
      provideAuth(() => getAuth(getApp())),
      provideFirestore(() => getFirestore(getApp())),
    ),
  ],
};
```

**`server.ts`** (SSR entry, Firebase friendly)
```ts
import 'zone.js/node';
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { join } from 'path';
import { fileURLToPath } from 'url';
import bootstrap from './src/main.server';

const server = express();
const distFolder = join(process.cwd(), 'dist/gitplumbers/browser');
const indexHtml = 'index';
const commonEngine = new CommonEngine();

server.set('view engine', 'html');
server.set('views', distFolder);

server.get('*.*', express.static(distFolder, { maxAge: '1y' }));

server.get('*', (req, res, next) => {
  commonEngine
    .render({
      bootstrap,
      documentFilePath: join(distFolder, 'index.html'),
      url: req.originalUrl,
      providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }],
    })
    .then(html => res.send(html))
    .catch(err => next(err));
});

export default server;
```

**Firebase Function wrapper** (`functions/src/ssr.ts`)
```ts
import * as functions from 'firebase-functions/v2/https';
import server from '../../server';

export const ssr = functions.onRequest({ region: 'us-central1' }, server);
```

**`firebase.json`** (Hosting rewrites)
```json
{
  "hosting": {
    "public": "dist/gitplumbers/browser",
    "rewrites": [
      { "source": "**", "function": { "functionId": "ssr" } }
    ]
  }
}
```

---

## 7) Routing, Guards, and Lazy Modules

**`app.routes.ts`**
```ts
import { Routes } from '@angular/router';
import { canActivateAuth } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/marketing/landing.component').then(m => m.LandingComponent) },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES) },
  { path: 'app', canActivate: [canActivateAuth], loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES) },
  { path: 'legal', loadChildren: () => import('./features/legal/legal.routes').then(m => m.LEGAL_ROUTES) },
  { path: '**', loadComponent: () => import('./shared/not-found.component').then(m => m.NotFoundComponent) }
];
```

**Auth guard (functional)**
```ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const canActivateAuth: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.user$.pipe(
    map(u => u ? true : router.createUrlTree(['/auth/sign-in']))
  );
};
```

---

## 8) Auth Flows & Components

**Services**
- `AuthService` wraps Firebase Auth: `signIn`, `signUp`, `signOut`, `sendPasswordResetEmail`, `updateProfile`, `idToken$`, `user$` (from `authState`).
- `UserService` (Firestore) for profile doc `/users/{uid}` (displayName, photoURL, roles, createdAt, updatedAt).

**Components/Pages**
- `LandingComponent` – Hero, features, CTA to Sign‑up.
- `SignInComponent` – Reactive form (email, password). Links: Sign‑up, Forgot.
- `SignUpComponent` – Reactive form (email, password, confirm). Accept T&Cs checkbox.
- `ForgotPasswordComponent` – Email input; success state.
- `SignOutComponent` – On init, calls `signOut()` then navigates `/`.
- `DashboardShellComponent` – App toolbar, sidenav, user menu; `<router-outlet>`.

**Auth Service (sketch)**
```ts
import { Injectable, inject, signal } from '@angular/core';
import { Auth, authState, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, updateProfile, getIdToken } from '@angular/fire/auth';
import { doc, docData, Firestore, setDoc, serverTimestamp } from '@angular/fire/firestore';
import { from, map, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private auth = inject(Auth);
  private db = inject(Firestore);
  user$ = authState(this.auth);
  idToken$ = this.user$.pipe(switchMap(u => u ? from(getIdToken(u, true)) : [null]));

  signIn(email: string, password: string){
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }
  signUp(email: string, password: string){
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap(cred => setDoc(doc(this.db, 'users', cred.user.uid), {
        uid: cred.user.uid, email, roles: ['user'], createdAt: serverTimestamp(), updatedAt: serverTimestamp()
      }))
    );
  }
  forgot(email: string){ return from(sendPasswordResetEmail(this.auth, email)); }
  signOut(){ return from(signOut(this.auth)); }
}
```

**HTTP Interceptor (optional) – attach ID token**
```ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { firstValueFrom } from 'rxjs';

export const authTokenInterceptor: HttpInterceptorFn = async (req, next) => {
  const token = await firstValueFrom(inject(AuthService).idToken$);
  if (!token) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
```

---

## 9) Firestore Data Model

```
/users/{uid}
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  roles: string[]   // e.g., ["user"], optionally ["admin"]
  createdAt: Timestamp
  updatedAt: Timestamp

// add domain models under /orgs or /projects later as needed
```

**Firestore Composite Indexes** – none required for auth flows; add as features grow.

---

## 10) Security Rules (minimum viable)

**`firestore.rules`**
```ruby
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isSelf(uid) { return request.auth != null && request.auth.uid == uid; }
    match /users/{uid} {
      allow read: if isSelf(uid);
      allow create: if isSelf(uid);
      allow update: if isSelf(uid);
      allow delete: if false; // no deletes by default
    }
  }
}
```

**Auth settings**
- Enable Email/Password in Firebase Console.  
- (Optional) Add Google/GitHub providers later; update UI accordingly.

---

## 11) Theming & UI System

### PrimeNG + PrimeFlex
- **Packages**: `primeng`, `primeicons`, `primeflex`.
- **Theme**: Use an Aura theme as a base (e.g., `aura-light-noir`), then override tokens to match `#004c89`.

**Install**
```bash
npm i primeng primeicons primeflex
```

**Global styles**  
Add to `styles.scss` (or include via `angular.json` → `styles`):
```scss
/* PrimeNG base + icons + utilities */
@import "primeng/resources/themes/aura-light-noir/theme.css";
@import "primeng/resources/primeng.min.css";
@import "primeicons/primeicons.css";
@import "primeflex/primeflex.min.css";

/* Primary color overrides */
:root {
  --p-primary-color: #004c89;
  --p-primary-contrast-color: #ffffff;
  --p-primary-hover-color: color-mix(in srgb, #004c89 90%, white);
  --p-focus-ring-color: color-mix(in srgb, #004c89 25%, transparent);
}
```

**PrimeNG configuration**  
Use standalone imports in components or create a `UiModule` for grouped imports. Suggested frequently used modules: `InputTextModule`, `PasswordModule`, `ButtonModule`, `CardModule`, `CheckboxModule`, `ToastModule`, `MenubarModule`.

A11y: ensure focus ring visible; contrast for primary on white ≥ 4.5:1 (satisfied with `#004c89`).

---

## 12) SEO, Analytics, and Performance

- SSR for `/` and static **prerender** of marketing routes for faster TTFB: `ng run gitplumbers:prerender`.  
- `<title>`, meta description, OpenGraph/Twitter cards; JSON‑LD `Organization` schema.
- GA4 via gtag or GTM (load after consent).  
- Performance budgets: LCP < 2.5s (3G fast), CLS < 0.1, TBT < 200ms.  
- Image strategy: responsive `srcset`, WebP/AVIF, lazy loading below fold.

---

## 13) CI/CD (GitHub Actions → Firebase)

**`.github/workflows/deploy.yml`**
```yaml
name: Deploy
on:
  push:
    branches: [ main ]
jobs:
  build-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run build:ssr
      - run: npm run functions:build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-firebase-project-id
```

---

## 14) Testing Strategy

- **Unit**: Jasmine/Karma or Jest for services/guards.  
- **E2E**: Playwright (recommended) for auth flows and redirection rules.  
- **Accessibility**: Pa11y CI or axe in Playwright.  
- **Smoke**: SSR response contains meta tags; `/auth/*` loads without JS.

---

## 15) Acceptance Criteria (MVP)

- [ ] Marketing page SSR + prerendered; Lighthouse ≥ 90 (Perf, SEO, A11y).  
- [ ] Sign‑up creates user and Firestore `/users/{uid}` doc.  
- [ ] Sign‑in/out works; redirect to `/app` when authenticated.  
- [ ] Forgot password sends reset email and shows confirmation.  
- [ ] Guard blocks `/app` when logged out, redirects to `/auth/sign-in`.  
- [ ] Firestore rules enforce self‑access only for user docs.  
- [ ] Primary color `#004c89` applied across PrimeNG theme and PrimeNG/PrimeFlex.

---

## 16) Milestones & Estimates (implementation order)

1. **Scaffold & Config** (SSR, zoneless, PrimeNG/PrimeFlex, Material, Firebase) – 0.5–1d  
2. **Marketing Page** (layout, copy, SEO) – 0.5–1d  
3. **Auth Flows** (UI + service + routes + rules) – 1–1.5d  
4. **Dashboard Shell** (protected routes, layout) – 0.5d  
5. **CI/CD + Emulators + Tests** – 0.5–1d

---

## 17) Appendix – Component Stubs

**Sign‑in (PrimeNG template sketch)**
```html
<p-card class="mx-auto" style="max-width: 480px">
  <ng-template pTemplate="title">Welcome back</ng-template>
  <form [formGroup]="form" (ngSubmit)="submit()" class="p-fluid">
    <div class="field">
      <label for="email">Email</label>
      <input id="email" pInputText formControlName="email" type="email" required />
    </div>
    <div class="field">
      <label for="password">Password</label>
      <p-password id="password" formControlName="password" [feedback]="false" toggleMask />
    </div>
    <button pButton type="submit" label="Sign in" class="w-full" [disabled]="form.invalid"></button>
    <a routerLink="/auth/forgot-password" class="text-sm block mt-3">Forgot password?</a>
  </form>
</p-card>
```

**Sign‑up (PrimeNG template sketch)**
```html
<p-card class="mx-auto" style="max-width: 520px">
  <ng-template pTemplate="title">Create your account</ng-template>
  <form [formGroup]="form" (ngSubmit)="submit()" class="p-fluid">
    <div class="field">
      <label for="email">Email</label>
      <input id="email" pInputText formControlName="email" type="email" required />
    </div>
    <div class="field">
      <label for="password">Password</label>
      <p-password id="password" formControlName="password" [feedback]="true" toggleMask />
    </div>
    <div class="field-checkbox">
      <p-checkbox formControlName="acceptTos" inputId="tos"></p-checkbox>
      <label for="tos">I agree to the Terms</label>
    </div>
    <button pButton type="submit" label="Sign up" class="w-full" [disabled]="form.invalid"></button>
  </form>
</p-card>
```

**Dashboard Shell (PrimeNG Menubar)**
```html
<p-menubar [model]="menu">
  <ng-template pTemplate="start">
    <a routerLink="/" class="font-bold" style="color: var(--p-primary-color)">gitPlumbers</a>
  </ng-template>
  <ng-template pTemplate="end">
    <button pButton label="Sign out" (click)="signOut()"></button>
  </ng-template>
</p-menubar>
<main class="p-4">
  <router-outlet />
</main>
```

**Routing (drop‑in for your starter’s empty routes)**
```ts
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { canActivateAuth } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/marketing/landing.component').then(m => m.LandingComponent) },
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES) },
  { path: 'app', canActivate: [canActivateAuth], loadChildren: () => import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES) },
  { path: '**', loadComponent: () => import('./shared/not-found.component').then(m => m.NotFoundComponent) }
];
```

**Auth Guard (same as before; unchanged)**

## 18) Future Enhancements
- Role‑based routes (`admin`), server‑verified claims via Callable Functions.  
- Organization model (`/orgs/{id}/members`).  
- File uploads (Storage) with security rules.  
- Internationalization (i18n) and dark mode.

---

**End of Spec**

