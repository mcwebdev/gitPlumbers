import {
  Component,
  ViewChild,
  effect,
  inject,
  OnInit,
  DestroyRef,
} from '@angular/core';
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
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SeoService } from '../../../shared/services/seo.service';
import { environment } from '../../../../environments/environment';

import { ContactFormData, ContactStore } from '../store/contact.store';

import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

const GITHUB_REPO_REGEX =
  /^(?:https?:\/\/(?:www\.)?github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(?:\/)?$/;

type RepositorySummary = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  htmlUrl: string;
};

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    HttpClientModule,
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
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  @ViewChild('uploader') uploader!: FileUpload;

  contactForm: FormGroup;
  readonly store = inject(ContactStore);
  readonly githubAppInstallUrl = environment.github.appInstallUrl;
  readonly githubAppListingUrl = environment.github.appListingUrl;

  repoForm: FormGroup;

  loading = false; // mirrored from store if available
  selectedFile?: File; // for label/clear UX

  repositories: RepositorySummary[] = [];
  repoLoading = false;
  repoError: string | null = null;
  repoFormSubmitted = false;

  private readonly repoApiBase = environment.github.apiBaseUrl.replace(/\/$/, '');

  ngOnInit(): void {
    console.log('🚀 ContactComponent: ngOnInit starting...');
    this._seoService.updateMetadata(this._seoService.getContactPageMetadata());
    
    if (typeof window !== 'undefined') {
      console.log('🔍 ContactComponent: Current URL:', window.location.href);
    }
    console.log('🔍 ContactComponent: API Base URL:', this.repoApiBase);
    
    this.bootstrapInstallationFromQuery();
    console.log('✅ ContactComponent: ngOnInit completed');
  }

  constructor(private fb: FormBuilder, private messages: MessageService) {
    console.log('🏗️ ContactComponent: Constructor starting...');
    
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      githubRepo: ['', [this.optionalGitHubValidator]],
      attachment: [null],
    });

    this.repoForm = this.fb.group({
      installationId: ['', [Validators.required]],
      repoFullName: ['', [Validators.required]],
    });
    
    console.log('✅ ContactComponent: Forms initialized');

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

    effect(() => {
      const isSubmitting = this.store.isSubmitting();
      this.loading = isSubmitting;
    });

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

    this.repoForm.controls['installationId'].valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newValue) => {
        this.repoFormSubmitted = false;
        this.repoError = null;
        this.repositories = [];
        this.repoLoading = false;
        this.repoForm.controls['repoFullName'].setValue('');
        
        // Clear localStorage if user manually changes installation ID
        const storedId = localStorage.getItem('gitplumbers_installation_id');
        if (storedId && storedId !== newValue) {
          localStorage.removeItem('gitplumbers_installation_id');
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

    const v = this.contactForm.value;
    const formData: ContactFormData = {
      name: v.name || '',
      email: v.email || '',
      message: v.message || '',
      githubRepo: v.githubRepo || '',
    };
    this.store.updateFormData(formData);
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
      // @ts-ignore - store method is optional
      this.store.setSelectedFile?.(undefined);
      return;
    }

    this.selectedFile = file;
    this.contactForm.patchValue({ attachment: file });
    // @ts-ignore - store method is optional
    this.store.setSelectedFile?.(file);

    this.messages.add({ severity: 'info', summary: 'Attachment added', detail: file.name });
  }

  loadInstallationRepos(): void {
    console.log('🔍 loadInstallationRepos: Starting...');
    this.repoFormSubmitted = true;
    const installationIdControl = this.repoForm.controls['installationId'];

    if (installationIdControl.invalid) {
      console.log('❌ loadInstallationRepos: Installation ID control is invalid');
      installationIdControl.markAsTouched();
      return;
    }

    const installationId = (installationIdControl.value ?? '').trim();
    console.log('🔍 loadInstallationRepos: Installation ID:', installationId);
    
    if (!installationId) {
      console.log('❌ loadInstallationRepos: No installation ID provided');
      return;
    }

    this.repoLoading = true;
    this.repoError = null;
    this.repositories = [];
    this.repoForm.controls['repoFullName'].setValue('');

    const url = `${this.repoApiBase}/getInstallationRepos/${encodeURIComponent(installationId)}`;
    console.log('🔍 loadInstallationRepos: Making API request to:', url);
    console.log('🔍 loadInstallationRepos: API Base URL:', this.repoApiBase);

    this.http
      .get<{ repositories: RepositorySummary[] }>(url, { 
        observe: 'response',
        responseType: 'text' as 'json'
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response) => {
          console.log('✅ loadInstallationRepos: Raw API response status:', response.status);
          console.log('✅ loadInstallationRepos: Raw API response body:', response.body);
          console.log('✅ loadInstallationRepos: Response headers:', response.headers);
          
          try {
            const data = JSON.parse(response.body as unknown as string);
            console.log('✅ loadInstallationRepos: Parsed response data:', data);
            
            const repositories = data.repositories || data;
            this.repoLoading = false;
            this.repositories = repositories ?? [];
            console.log('✅ loadInstallationRepos: Processed repositories:', this.repositories);
            
            if (this.repositories.length > 0) {
              const firstRepo = this.repositories[0].fullName;
              this.repoForm.controls['repoFullName'].setValue(firstRepo);
              console.log('✅ loadInstallationRepos: Set first repository as default:', firstRepo);
            } else {
              console.log('⚠️ loadInstallationRepos: No repositories found');
            }
          } catch (parseError) {
            console.error('❌ loadInstallationRepos: JSON parse error:', parseError);
            console.error('❌ loadInstallationRepos: Raw response that failed to parse:', response.body);
            this.repoLoading = false;
            this.repoError = 'Invalid response from repository service. Please try again.';
          }
        },
        error: (error) => {
          console.error('❌ loadInstallationRepos: API error:', error);
          console.error('❌ loadInstallationRepos: Error status:', error.status);
          console.error('❌ loadInstallationRepos: Error name:', error.name);
          console.error('❌ loadInstallationRepos: Error message:', error.message);
          console.error('❌ loadInstallationRepos: Full error object:', error);
          
          this.repoLoading = false;
          
          if (error.status === 0 || error.name === 'HttpErrorResponse') {
            this.repoError = 'Unable to connect to the repository service. Please try again later or contact support.';
            console.log('❌ loadInstallationRepos: Connection error - API server not reachable');
          } else {
            this.repoError = 'Unable to load repositories. Double-check the Installation ID and granted repository access.';
            console.log('❌ loadInstallationRepos: API error - check installation ID and permissions');
          }
        },
      });
  }

  get selectedRepoIssueLink(): string | null {
    const repoFullName = this.repoForm.controls['repoFullName'].value;
    if (!repoFullName) {
      return null;
    }
    return this.buildIssueUrl(repoFullName);
  }

  clearInstallationData(): void {
    console.log('🧹 clearInstallationData: Clearing all installation data');
    localStorage.removeItem('gitplumbers_installation_id');
    this.repoForm.patchValue({ installationId: '', repoFullName: '' });
    this.repositories = [];
    this.repoError = null;
    this.repoFormSubmitted = false;
    console.log('✅ clearInstallationData: Installation data cleared');
  }

  loadInstallationIdFromStorage(): void {
    console.log('🔍 loadInstallationIdFromStorage: Checking localStorage...');
    const storedId = localStorage.getItem('gitplumbers_installation_id');
    console.log('🔍 loadInstallationIdFromStorage: Found stored ID:', storedId);
    
    if (storedId) {
      this.repoForm.patchValue({ installationId: storedId });
      console.log('✅ loadInstallationIdFromStorage: Loaded installation ID from storage:', storedId);
      
      // Auto-load repositories
      console.log('🚀 loadInstallationIdFromStorage: Auto-loading repositories...');
      queueMicrotask(() => this.loadInstallationRepos());
    } else {
      console.log('❌ loadInstallationIdFromStorage: No installation ID found in localStorage');
      this.messages.add({
        severity: 'warn',
        summary: 'No Installation ID Found',
        detail: 'No saved installation ID found. Please install the GitHub App first.',
      });
    }
  }

  private buildIssueUrl(repoFullName: string): string {
    return `https://github.com/${repoFullName}/issues/new?template=audit.yml&title=%5BgitPlumbers%5D+Request+Help`;
  }

  private bootstrapInstallationFromQuery(): void {
    console.log('🔍 bootstrapInstallationFromQuery: Starting...');
    
    if (typeof window === 'undefined') {
      console.log('❌ bootstrapInstallationFromQuery: Window is undefined (SSR)');
      return;
    }

    const params = new URLSearchParams(window.location.search);
    console.log('🔍 bootstrapInstallationFromQuery: Current URL params:', params.toString());
    
    let installationId = params.get('installation_id');
    console.log('🔍 bootstrapInstallationFromQuery: Installation ID from URL:', installationId);
    
    // If not in URL, try to get from localStorage
    if (!installationId) {
      installationId = localStorage.getItem('gitplumbers_installation_id');
      console.log('🔍 bootstrapInstallationFromQuery: Installation ID from localStorage:', installationId);
    }
    
    if (!installationId) {
      console.log('❌ bootstrapInstallationFromQuery: No installation ID found');
      return;
    }

    // Save to localStorage for persistence
    localStorage.setItem('gitplumbers_installation_id', installationId);
    console.log('✅ bootstrapInstallationFromQuery: Saved installation ID to localStorage:', installationId);
    
    // Populate the form
    this.repoForm.patchValue({ installationId });
    console.log('✅ bootstrapInstallationFromQuery: Populated form with installation ID');
    
    // Clean up URL parameters but keep the installation_id for now
    // Only remove setup_action and other GitHub-specific params
    params.delete('setup_action');
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
    console.log('✅ bootstrapInstallationFromQuery: Cleaned URL to:', nextUrl);
    
    // Auto-load repositories if we have a valid installation ID
    console.log('🚀 bootstrapInstallationFromQuery: Auto-loading repositories...');
    queueMicrotask(() => this.loadInstallationRepos());
  }
}
