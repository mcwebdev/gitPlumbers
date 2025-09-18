import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

// Define the form data interface for type safety
export interface ContactFormData {
  name: string;
  email: string;
  message: string;
  githubRepo: string;
}

// Define the upload result interface
export interface UploadUrlResult {
  url: string;
  filePath: string;
}

// Define the store state interface
export interface ContactState {
  formData: ContactFormData;
  selectedFile: File | null;
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
}

// Initial state
const initialState: ContactState = {
  formData: {
    name: '',
    email: '',
    message: '',
    githubRepo: '',
  },
  selectedFile: null,
  isSubmitting: false,
  isSuccess: false,
  error: null,
};

// Create the store
export const ContactStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withComputed((store) => ({
    isFormValid: computed(() => {
      const formData = store.formData();
      return (
        formData.name.trim() !== '' &&
        formData.email.trim() !== '' &&
        formData.message.trim() !== ''
      );
    }),
  })),
  withMethods((store) => {
    const functions = inject(Functions);
    const http = inject(HttpClient);
    const router = inject(Router);
    const messageService = inject(MessageService);

    return {
      // Update form data
      updateFormData: (formData: Partial<ContactFormData>) => {
        patchState(store, (state) => ({
          formData: { ...state.formData, ...formData },
        }));
      },

      // Set selected file
      setSelectedFile: (file: File | null) => {
        patchState(store, { selectedFile: file });
      },

      // Reset the form
      resetForm: () => {
        patchState(store, initialState);
      },

      // Submit form
      submitForm: rxMethod<void>(
        pipe(
          tap(() => {
            patchState(store, { isSubmitting: true, error: null });
            messageService.add({
              severity: 'info',
              summary: 'Sending...',
              detail: 'Your message is being sent.',
            });
          }),
          switchMap(async () => {
            console.log('🚀 Starting form submission');
            try {
              const formData = store.formData();
              const selectedFile = store.selectedFile();
              console.log('📋 Form data:', formData);
              console.log('📎 Selected file:', selectedFile?.name);
              let filePath: string | null = null;

              // Upload file if one is selected
              if (selectedFile) {
                const file = selectedFile;
                try {
                  const effectiveContentType = file.type || 'application/zip';
                  const uploadResponse = await http
                    .post<UploadUrlResult>(
                      'https://us-central1-gitplumbers-35d92.cloudfunctions.net/getUploadUrl',
                      {
                        fileName: file.name,
                        contentType: effectiveContentType,
                      }
                    )
                    .toPromise();

                  console.log('📥 Received upload response:', uploadResponse);
                  if (!uploadResponse) throw new Error('No response from upload URL service');

                  console.log('📁 FilePath:', uploadResponse.filePath);
                  console.log('🔗 Upload URL:', uploadResponse.url);

                  filePath = uploadResponse.filePath;
                  const headers = new HttpHeaders({ 'Content-Type': effectiveContentType });
                  await http
                    .put(uploadResponse.url, file, { headers, responseType: 'text' })
                    .toPromise();
                } catch (error) {
                  console.error('File upload failed:', error);
                  messageService.add({
                    severity: 'error',
                    summary: 'Error',
                    detail: 'File upload failed. Please try again.',
                  });
                  throw error;
                }
              }

              // Submit form data
              await http
                .post(
                  'https://us-central1-gitplumbers-35d92.cloudfunctions.net/handleContactForm',
                  { ...formData, filePath }
                )
                .toPromise();

              // Show success message
              messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'Your message has been sent!',
              });

              // Reset form and navigate home
              patchState(store, initialState);
              router.navigate(['/']);

              return { success: true };
            } catch (error) {
              console.error('Form submission failed:', error);
              messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'There was an error sending your message. Please try again.',
              });
              return { success: false, error };
            }
          }),
          tap((result: { success: boolean; error?: unknown }) => {
            patchState(store, {
              isSubmitting: false,
              isSuccess: result.success,
              error: result.success ? null : 'Submission failed',
            });
          }),
          catchError((error: unknown) => {
            patchState(store, {
              isSubmitting: false,
              error: 'An unexpected error occurred',
            });
            return of({ success: false, error });
          })
        )
      ),
    };
  })
);
