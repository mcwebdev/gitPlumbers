import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth, createUserWithEmailAndPassword, updateProfile } from '@angular/fire/auth';

import { AuthUserService } from '../../shared/services/auth-user.service';
import { InvoiceService } from '../../shared/services/invoice.service';

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
  private readonly userService = inject(AuthUserService);
  private readonly invoiceService = inject(InvoiceService);

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
      this.form.controls.confirmPassword.markAsTouched();
      return;
    }

    const { email, fullName } = this.form.getRawValue();

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.form.disable({ emitEvent: false });

    try {
      const credential = await createUserWithEmailAndPassword(this.auth, email, password);

      if (credential.user && fullName.trim().length > 1) {
        await updateProfile(credential.user, { displayName: fullName.trim() });
      }

      // Create Stripe customer
      let stripeCustomerId: string | undefined;
      try {
        const stripeCustomer = await this.invoiceService.createCustomer({
          name: fullName.trim(),
          email: email,
        });
        stripeCustomerId = stripeCustomer.id;
      } catch (stripeError) {
        console.error('Failed to create Stripe customer:', stripeError);
        // Continue with user creation even if Stripe fails
      }

      // Only include stripeCustomerId if it was successfully created
      const userOverrides: Partial<{ displayName: string; email: string; role: 'user'; stripeCustomerId: string }> = {
        displayName: fullName.trim(),
        email,
        role: 'user',
      };
      if (stripeCustomerId) {
        userOverrides.stripeCustomerId = stripeCustomerId;
      }

      await this.userService.ensureUserDocument(credential.user, userOverrides);

      await this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'We could not create your account right now. Try again later.';
      this.errorMessage.set(message);
    } finally {
      this.form.enable({ emitEvent: false });
      this.submitting.set(false);
    }
  }
}
