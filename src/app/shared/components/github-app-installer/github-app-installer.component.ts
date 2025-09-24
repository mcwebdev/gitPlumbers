import {
  Component,
  effect,
  inject,
  OnInit,
  DestroyRef,
  input,
  output,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
} from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { environment } from '../../../../environments/environment';

import { ButtonModule } from 'primeng/button';
import { MultiSelectModule } from 'primeng/multiselect';
import { MessageService } from 'primeng/api';
import { AuthUserService } from '../../services/auth-user.service';
import { GitHubIssuesService } from '../../services/github-issues.service';
import { CreateGitHubIssueRequest } from '../../models/github-issue.model';
import { GitHubIssueFormComponent, GitHubIssueFormData } from '../github-issue-form/github-issue-form.component';
import { GitHubIssuesStore } from '../../stores/github-issues.store';

type RepositorySummary = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  htmlUrl: string;
};

export type GitHubAppInstallationData = {
  installationId: string;
  repoFullName: string;
  repositories: RepositorySummary[];
};

@Component({
  selector: 'app-github-app-installer',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    ButtonModule,
    MultiSelectModule,
    GitHubIssueFormComponent,
  ],
  providers: [MessageService],
  templateUrl: './github-app-installer.component.html',
  styleUrls: ['./github-app-installer.component.scss'],
})
export class GitHubAppInstallerComponent implements OnInit {
  // Inputs for customization
  readonly title = input<string>('Start with the gitPlumbers App');
  readonly description = input<string>(
    'Install the GitHub App, and choose the repository we should triage. The automation will label and assign it immediately.'
  );
  readonly showFooter = input<boolean>(true);
  readonly footerText = input<string>(
    "Need an NDA or want to brief us first? Use the form below and we'll coordinate access manually."
  );

  // Outputs for parent components
  readonly installationComplete = output<GitHubAppInstallationData>();
  readonly repositorySelected = output<string>();

  private readonly _messageService = inject(MessageService);
  private readonly _http = inject(HttpClient);
  private readonly _destroyRef = inject(DestroyRef);
  private readonly _fb = inject(FormBuilder);
  private readonly _authUserService = inject(AuthUserService);
  private readonly _githubIssuesService = inject(GitHubIssuesService);
  private readonly _cdr = inject(ChangeDetectorRef);
  
  // GitHub Issues Store for reactive state management
  readonly githubIssuesStore = inject(GitHubIssuesStore);

  readonly githubAppInstallUrl = environment.github.appInstallUrl;
  readonly githubAppListingUrl = environment.github.appListingUrl;

  repoForm: FormGroup;

  repositories: RepositorySummary[] = [];
  repoLoading = false;
  repoError: string | null = null;
  repoFormSubmitted = false;
  showIssueForm = false;

  // Issue selection properties - now managed by GitHubIssuesStore
  // All state is handled reactively through githubIssuesStore signals

  private readonly repoApiBase = environment.github.apiBaseUrl.replace(/\/$/, '');

  constructor() {
    this.repoForm = this._fb.group({
      installationId: ['', [Validators.required]],
      repoFullName: ['', [Validators.required]],
    });

    // Watch for repository selection changes
    this.repoForm.controls['repoFullName'].valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((repoFullName) => {
        if (repoFullName) {
          this.repositorySelected.emit(repoFullName);
        }
      });

    // Watch for installation ID changes
    this.repoForm.controls['installationId'].valueChanges
      .pipe(takeUntilDestroyed(this._destroyRef))
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

  ngOnInit(): void {
    this.bootstrapInstallationFromQuery();
    this.bootstrapInstallationFromUserProfile();
  }

  loadInstallationRepos(): void {
    this.repoFormSubmitted = true;
    const installationIdControl = this.repoForm.controls['installationId'];

    if (installationIdControl.invalid) {
      installationIdControl.markAsTouched();
      return;
    }

    const installationId = (installationIdControl.value ?? '').trim();

    if (!installationId) {
      return;
    }

    this.repoLoading = true;
    this.repoError = null;
    this.repositories = [];
    this.repoForm.controls['repoFullName'].setValue('');

    const url = `${this.repoApiBase}/getInstallationRepos/${encodeURIComponent(installationId)}`;

    this._http
      .get<{ repositories: RepositorySummary[] }>(url, {
        observe: 'response',
        responseType: 'text' as 'json',
      })
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe({
        next: (response) => {
          try {
            const data = JSON.parse(response.body as unknown as string);

            const repositories = data.repositories || data;
            this.repoLoading = false;
            this.repositories = repositories ?? [];

            if (this.repositories.length > 0) {
              const firstRepo = this.repositories[0].fullName;
              this.repoForm.controls['repoFullName'].setValue(firstRepo);
            }

            // Save installation ID to user profile
            this.saveInstallationIdToUserProfile(installationId);

            // Emit installation complete event
            this.installationComplete.emit({
              installationId,
              repoFullName: this.repoForm.controls['repoFullName'].value,
              repositories: this.repositories,
            });
          } catch (parseError) {
            this.repoLoading = false;
            this.repoError = 'Invalid response from repository service. Please try again.';
          }
        },
        error: (error) => {
          this.repoLoading = false;

          if (error.status === 0 || error.name === 'HttpErrorResponse') {
            this.repoError = 'Unable to connect to the repository service. Please try again later or contact support.';
          } else if (error.status === 404) {
            this.repoError = 'GitHub App installation not found. Please reinstall the GitHub App or check the Installation ID.';
            
            // Clear the invalid installation ID from user profile and form
            this.clearInstallationIdFromUserProfile();
            this.repoForm.patchValue({ installationId: '', repoFullName: '' });
            this.repositories = [];
          } else if (error.status === 401) {
            this.repoError = 'GitHub App authentication failed. Please reinstall the GitHub App.';
            
            // Clear the invalid installation ID from user profile and form
            this.clearInstallationIdFromUserProfile();
            this.repoForm.patchValue({ installationId: '', repoFullName: '' });
            this.repositories = [];
          } else {
            this.repoError = 'Unable to load repositories. Double-check the Installation ID and granted repository access.';
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

  async syncExternalIssues(): Promise<void> {
    const repoFullName = this.repoForm.controls['repoFullName'].value;
    const installationId = this.repoForm.controls['installationId'].value;
    const profile = this._authUserService.profile();

    if (!repoFullName || !installationId || !profile) {
      this._messageService.add({
        severity: 'error',
        summary: 'Missing Information',
        detail: 'Please select a repository and ensure you are logged in.',
      });
      return;
    }

    try {
      const result = await this._githubIssuesService.syncExternalIssues(installationId, repoFullName).toPromise();
      
      if (result?.success) {
        this._messageService.add({
          severity: 'success',
          summary: 'Issues Synced',
          detail: `Successfully synced ${result.count} external GitHub issues to your dashboard.`,
        });
      } else {
        this._messageService.add({
          severity: 'error',
          summary: 'Sync Failed',
          detail: result?.error || 'Unable to sync external GitHub issues. Please try again.',
        });
      }
    } catch (error) {
      this._messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to sync external GitHub issues. Please try again.',
      });
    }
  }

  loadAvailableIssues(): void {
    const repoFullName = this.repoForm.controls['repoFullName'].value;
    const installationId = this.repoForm.controls['installationId'].value;
    const profile = this._authUserService.profile();

    if (!repoFullName || !installationId || !profile) {
      this._messageService.add({
        severity: 'error',
        summary: 'Missing Information',
        detail: 'Please select a repository and ensure you are logged in.',
      });
      return;
    }

    // Use the store's rxMethod to load issues reactively
    this.githubIssuesStore.loadAvailableIssues({ installationId, repoFullName });
  }

  syncSelectedIssues(): void {
    const repoFullName = this.repoForm.controls['repoFullName'].value;
    const installationId = this.repoForm.controls['installationId'].value;

    if (!repoFullName || !installationId) {
      this._messageService.add({
        severity: 'error',
        summary: 'Missing Information',
        detail: 'Repository and installation information are required.',
      });
      return;
    }

    // Use the store's rxMethod to sync selected issues reactively
    this.githubIssuesStore.syncSelectedIssues({ installationId, repoFullName });
  }

  cancelIssueSelection(): void {
    this.githubIssuesStore.cancelIssueSelection();
  }

  showCreateIssueForm(): void {
    const repoFullName = this.repoForm.controls['repoFullName'].value;
    const installationId = this.repoForm.controls['installationId'].value;

    if (!repoFullName || !installationId) {
      this._messageService.add({
        severity: 'error',
        summary: 'Missing Information',
        detail: 'Please select a repository first.',
      });
      return;
    }

    this.showIssueForm = true;
  }

  onIssueCreated(issueData: GitHubIssueFormData): void {
    this.showIssueForm = false;
    
    this._messageService.add({
      severity: 'success',
      summary: 'GitHub Issue Created',
      detail: 'Your GitHub issue has been created successfully and will appear in your dashboard.',
    });
  }

  onIssueFormCancelled(): void {
    this.showIssueForm = false;
  }

  clearInstallationData(): void {
    localStorage.removeItem('gitplumbers_installation_id');
    this.repoForm.patchValue({ installationId: '', repoFullName: '' });
    this.repositories = [];
    this.repoError = null;
    this.repoFormSubmitted = false;
    
    // Clear from user profile as well
    this.clearInstallationIdFromUserProfile();
  }

  private async clearInstallationIdFromUserProfile(): Promise<void> {
    try {
      await this._authUserService.updateGitHubInstallationId('');
    } catch (error) {
      // Don't show error to user as this is a background operation
    }
  }

  loadInstallationIdFromStorage(): void {
    // First check localStorage
    let storedId = localStorage.getItem('gitplumbers_installation_id');

    // If not in localStorage, check user profile
    if (!storedId) {
      const profile = this._authUserService.profile();
      storedId = profile?.githubInstallationId || null;
    }

    if (storedId) {
      this.repoForm.patchValue({ installationId: storedId });

      // Auto-load repositories
      queueMicrotask(() => this.loadInstallationRepos());
    } else {
      this._messageService.add({
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
    if (typeof window === 'undefined') {
      return;
    }

    const params = new URLSearchParams(window.location.search);

    let installationId = params.get('installation_id');

    // If not in URL, try to get from localStorage
    if (!installationId) {
      installationId = localStorage.getItem('gitplumbers_installation_id');
    }

    if (!installationId) {
      return;
    }

    // Save to localStorage for persistence
    localStorage.setItem('gitplumbers_installation_id', installationId);

    // Populate the form
    this.repoForm.patchValue({ installationId });

    // Clean up URL parameters but keep the installation_id for now
    // Only remove setup_action and other GitHub-specific params
    params.delete('setup_action');
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);

    // Auto-load repositories if we have a valid installation ID
    queueMicrotask(() => this.loadInstallationRepos());
  }

  private bootstrapInstallationFromUserProfile(): void {
    const profile = this._authUserService.profile();
    if (!profile?.githubInstallationId) {
      return;
    }

    const installationId = profile.githubInstallationId;

    // Only populate if form is empty
    const currentValue = this.repoForm.controls['installationId'].value;
    if (!currentValue) {
      this.repoForm.patchValue({ installationId });
      
      // Auto-load repositories
      queueMicrotask(() => this.loadInstallationRepos());
    }
  }

  private async saveInstallationIdToUserProfile(installationId: string): Promise<void> {
    try {
      await this._authUserService.updateGitHubInstallationId(installationId);
    } catch (error) {
      // Don't show error to user as this is a background operation
      // The installation still works, just won't be persisted to profile
    }
  }
}
