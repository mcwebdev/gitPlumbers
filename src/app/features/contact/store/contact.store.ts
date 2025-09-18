import { rxMethod } from '@ngrx/signals/rxjs-interop';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
  withProps,
} from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { pipe, switchMap, tap, catchError, of } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Functions, httpsCallable } from '@angular/fire/functions';
import { Router } from '@angular/router';

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
  withProps(() => ({
    _functions: inject(Functions),
    _http: inject(HttpClient),
    _router: inject(Router),
  })),
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
          }),
          switchMap(async () => {
            try {
              const formData = store.formData();
              const selectedFile = store.selectedFile();
              let filePath: string | null = null;

              // Upload file if one is selected
              if (selectedFile) {
                const file = selectedFile;
                try {
                  const effectiveContentType = file.type || 'application/zip';
                  const uploadResponse = await store._http
                    .post<UploadUrlResult>(
                      'https://us-central1-gitplumbers-35d92.cloudfunctions.net/getUploadUrl',
                      {
                        fileName: file.name,
                        contentType: effectiveContentType,
                      }
                    )
                    .toPromise();

                  if (!uploadResponse) throw new Error('No response from upload URL service');
                  filePath = uploadResponse.filePath;
                  const headers = new HttpHeaders({ 'Content-Type': effectiveContentType });
                  await store._http
                    .put(uploadResponse.url, file, { headers, responseType: 'text' })
                    .toPromise();
                } catch (error) {
                  throw new Error('File upload failed');
                }
              }

              // Submit form data
              await store._http
                .post(
                  'https://us-central1-gitplumbers-35d92.cloudfunctions.net/handleContactForm',
                  { ...formData, filePath }
                )
                .toPromise();

              // Reset form and navigate home
              patchState(store, initialState);
              store._router.navigate(['/']);

              return { success: true };
            } catch (error) {
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
