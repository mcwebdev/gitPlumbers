import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Auth, sendPasswordResetEmail } from '@angular/fire/auth';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(Auth);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly buttonLabel = computed(() => (this.submitting() ? 'Sending reset...' : 'Send reset link'));

  protected async onSubmit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email } = this.form.getRawValue();

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);
    this.form.disable({ emitEvent: false });

    try {
      await sendPasswordResetEmail(this.auth, email);
      this.successMessage.set("We've sent a reset link to your inbox. Check spam just in case.");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'We could not send the reset email. Try again in a moment.';
      this.errorMessage.set(message);
    } finally {
      this.form.enable({ emitEvent: false });
      this.submitting.set(false);
    }
  }
}
