import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required, Validators.minLength(6)]],
    agreeToTerms: [false, [Validators.requiredTrue]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly buttonLabel = computed(() => (this.submitting() ? 'Creating account...' : 'Create account'));

  protected async onSubmit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { password, confirmPassword } = this.form.getRawValue();

    if (password !== confirmPassword) {
      this.errorMessage.set('Passwords need to match.');
      this.form.controls.confirmPassword.setErrors({ mismatch: true });
      return;
    }

    const { email, fullName } = this.form.getRawValue();

    this.submitting.set(true);
    this.errorMessage.set(null);

    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);

      if (result.user && fullName.trim().length > 1) {
        await updateProfile(result.user, { displayName: fullName.trim() });
      }

      await this.router.navigate(['/']);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'We could not create your account right now. Try again later.';
      this.errorMessage.set(message);
    } finally {
      this.submitting.set(false);
    }
  }
}

