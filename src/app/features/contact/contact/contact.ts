import { Component, ViewChild, effect, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormGroup,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SeoService } from '../../../shared/services/seo.service';

import { ContactFormData, ContactStore } from '../store/contact.store';

import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea'; // see note below about pInputTextarea vs pTextarea
import { ButtonModule } from 'primeng/button';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
const GITHUB_REPO_REGEX =
  /^(?:https?:\/\/(?:www\.)?github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/)?$/;

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    FileUploadModule,
    ToastModule,
    RouterModule,
    LoadingSpinnerComponent,
  ],
  providers: [MessageService],
  templateUrl: './contact.html',
  styleUrls: ['./contact.scss'],
})
export class ContactComponent implements OnInit {
  private readonly _seoService = inject(SeoService);
  @ViewChild('uploader') uploader!: FileUpload;

  contactForm: FormGroup;
  readonly store = inject(ContactStore);

  loading = false; // mirrored from store if available
  selectedFile?: File; // for label/clear UX

  ngOnInit(): void {
    this._seoService.updateMetadata(this._seoService.getContactPageMetadata());
  }

  constructor(private fb: FormBuilder, private messages: MessageService) {
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      githubRepo: ['', [this.optionalGitHubValidator]],
      attachment: [null],
    });

    // keep store in sync when valid
    effect(() => {
      if (this.contactForm.valid) {
        const v = this.contactForm.value;
        const formData: ContactFormData = {
          name: v.name || '',
          email: v.email || '',
          message: v.message || '',
          githubRepo: v.githubRepo || '',
        };
        this.store.updateFormData(formData);
      }
    });

    // Monitor store state for UI updates
    effect(() => {
      const isSubmitting = this.store.isSubmitting();
      this.loading = isSubmitting;
    });

    // Handle success/error states from store
    effect(() => {
      const isSuccess = this.store.isSuccess();
      const error = this.store.error();

      if (isSuccess) {
        this.messages.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Your message has been sent!',
        });
        this.contactForm.reset();
        this.selectedFile = undefined;
        this.uploader?.clear();
      }

      if (error) {
        this.messages.add({
          severity: 'error',
          summary: 'Error',
          detail: error,
        });
      }
    });
  }

  // helpers for form CSS state used by the template
  ctrl = (key: string) => ({
    'ng-invalid':
      this.contactForm.get(key)?.invalid &&
      (this.contactForm.get(key)?.touched || this.contactForm.get(key)?.dirty),
    'ng-valid':
      this.contactForm.get(key)?.valid &&
      (this.contactForm.get(key)?.touched || this.contactForm.get(key)?.dirty),
  });
  invalid(key: string) {
    const c = this.contactForm.get(key);
    return !!(c && c.invalid && (c.touched || c.dirty));
  }

  optionalGitHubValidator = (control: AbstractControl): ValidationErrors | null => {
    const v = (control.value ?? '').trim();
    if (!v) return null;
    return GITHUB_REPO_REGEX.test(v) ? null : { githubFormat: true };
  };

  onSubmit(): void {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      this.messages.add({
        severity: 'error',
        summary: 'Check the form',
        detail: 'Please fix the highlighted fields.',
      });
      return;
    }

    // Update store with current form data before submitting
    const v = this.contactForm.value;
    const formData: ContactFormData = {
      name: v.name || '',
      email: v.email || '',
      message: v.message || '',
      githubRepo: v.githubRepo || '',
    };
    this.store.updateFormData(formData);

    // hand off to your store (it handles API + nav)
    this.store.submitForm();
  }

  onUpload(event: { files: File[] }): void {
    if (!event.files?.length) return;

    const file = event.files[0];
    const isZip = /\.zip$/i.test(file.name);
    const underLimit = file.size <= 20 * 1024 * 1024; // 20MB

    if (!isZip || !underLimit) {
      this.messages.add({
        severity: 'warn',
        summary: 'Attachment rejected',
        detail: !isZip ? 'Only .zip files are allowed.' : 'File must be 20MB or less.',
      });
      this.uploader?.clear();
      this.selectedFile = undefined;
      this.contactForm.patchValue({ attachment: null });
      // if your store expects File | undefined, this is fine; otherwise omit
      // @ts-ignore
      this.store.setSelectedFile?.(undefined);
      return;
    }

    this.selectedFile = file;
    this.contactForm.patchValue({ attachment: file });
    // store keeps the file if you need it downstream
    // @ts-ignore
    this.store.setSelectedFile?.(file);

    this.messages.add({ severity: 'info', summary: 'Attachment added', detail: file.name });
  }
}
