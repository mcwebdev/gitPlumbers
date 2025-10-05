import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth, signInWithEmailAndPassword } from '@angular/fire/auth';

import { AuthUserService } from '../../shared/services/auth-user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly userService = inject(AuthUserService);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly profile = this.userService.profile;
  protected readonly isAuthLoading = this.userService.isAuthLoading;
  protected readonly isLoggedIn = this.userService.isLoggedIn;
  protected readonly buttonLabel = computed(() => {
    if (this.submitting()) {
      return 'Logging in...';
    }
    if (this.isAuthLoading()) {
      return 'Loading...';
    }
    return this.isLoggedIn() ? 'Go to Dashboard' : 'Log in';
  });

  protected async onSubmit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    // If user is already logged in, redirect to dashboard
    if (this.isLoggedIn()) {
      const profile = this.profile();
      if (profile) {
        const targetUrl = profile.role === 'admin' ? '/admin' : '/dashboard';
        await this.router.navigate([targetUrl]);
      }
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.form.disable({ emitEvent: false });

    try {
      const credential = await signInWithEmailAndPassword(this.auth, email, password);
      const profile = await this.userService.ensureUserDocument(credential.user);
      const targetUrl = profile.role === 'admin' ? '/admin' : '/dashboard';
      await this.router.navigate([targetUrl]);
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'We could not log you in right now. Please try again.';
      this.errorMessage.set(message);
    } finally {
      this.form.enable({ emitEvent: false });
      this.submitting.set(false);
    }
  }
}
