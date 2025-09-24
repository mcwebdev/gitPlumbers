import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthUserService } from '../../shared/services/auth-user.service';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    CardModule,
  ],
  providers: [MessageService],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authUser = inject(AuthUserService);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);

  protected readonly profile = this.authUser.profile;
  protected readonly isLoading = signal(false);

  protected readonly profileForm = this.fb.nonNullable.group({
    displayName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    email: [{ value: '', disabled: true }], // Email is read-only
  });

  constructor() {
    // Initialize form with current profile data
    const currentProfile = this.profile();
    if (currentProfile) {
      this.profileForm.patchValue({
        displayName: currentProfile.displayName || '',
        email: currentProfile.email || '',
      });
    }
  }

  async onSave(): Promise<void> {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    const currentProfile = this.profile();
    if (!currentProfile) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User profile not found. Please try logging in again.',
      });
      return;
    }

    this.isLoading.set(true);
    
    try {
      const formValue = this.profileForm.getRawValue();
      
      // Update the user profile
      await this.authUser.updateUserProfile({
        displayName: formValue.displayName.trim(),
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Profile Updated',
        detail: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Update Failed',
        detail: 'Failed to update your profile. Please try again.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  onCancel(): void {
    this.router.navigate(['/dashboard']);
  }

  async onSignOut(): Promise<void> {
    try {
      await this.authUser.logout();
    } catch (error) {
      console.error('Error signing out:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Sign Out Failed',
        detail: 'Failed to sign out. Please try again.',
      });
    }
  }

  // Form control getters for template
  get displayNameControl() {
    return this.profileForm.controls.displayName;
  }

  get emailControl() {
    return this.profileForm.controls.email;
  }
}
