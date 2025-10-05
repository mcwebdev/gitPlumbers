import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FileUploadComponent,
  FileUploadConfig,
} from '../../shared/components/file-upload/file-upload.component';
import { catchError, firstValueFrom, map, of, switchMap, tap } from 'rxjs';
import { AuthUserService } from '../../shared/services/auth-user.service';
import {
  CreateSupportRequestPayload,
  RequestStatus,
  RequestsService,
  SupportRequest,
} from '../../shared/services/requests.service';
import { GitHubIssuesService } from '../../shared/services/github-issues.service';
import { GitHubIssue, GitHubIssueStatus } from '../../shared/models/github-issue.model';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { GitHubAppInstallerComponent, type GitHubAppInstallationData } from '../../shared/components/github-app-installer/github-app-installer.component';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { UserInvoiceViewComponent } from '../invoices/user-invoice-view/user-invoice-view.component';
import { UserProposalDashboardComponent } from '../proposals/user-proposal-dashboard/user-proposal-dashboard.component';
import { InvoiceStore } from '../invoices/store/invoice.store';
import { ProposalService } from '../../shared/services/proposal.service';
import { AccordionModule } from 'primeng/accordion';
interface RequestStatusCopy {
  label: string;
  tone: 'neutral' | 'progress' | 'success' | 'warning';
}

interface UnifiedNote {
  id?: string;
  authorName: string;
  authorId?: string;
  authorEmail?: string;
  message: string;
  createdAt: Date;
  role?: string;
}

// Unified status type that can handle both GitHub and Support request statuses
type UnifiedStatus = RequestStatus | GitHubIssueStatus;

interface UnifiedRequest {
  id: string;
  type: 'github' | 'support';
  title: string;
  message: string;
  status: UnifiedStatus;
  createdAt: Date;
  notes: UnifiedNote[];
  // GitHub-specific properties (only present when type === 'github')
  githubIssueUrl?: string;
  repository?: string;
  // Support-specific properties (only present when type === 'support')
  githubRepo?: string;
}

interface UploadUrlResult {
  url: string;
  filePath: string;
}

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, RouterModule, FileUploadComponent, GitHubAppInstallerComponent, ConfirmDialogModule, MarkdownPipe, UserInvoiceViewComponent, UserProposalDashboardComponent, AccordionModule],
  providers: [MessageService, ConfirmationService, InvoiceStore],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDashboardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authUser = inject(AuthUserService);
  private readonly requestsService = inject(RequestsService);
  private readonly githubIssuesService = inject(GitHubIssuesService);
  private readonly http = inject(HttpClient);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly invoiceStore = inject(InvoiceStore);
  private readonly proposalService = inject(ProposalService);
  private selectedFile: File | null = null;

  constructor() {
    // Load invoices when component initializes to show badge count
    effect(() => {
      const profile = this.profile();
      if (profile) {
        this.invoiceStore.loadInvoices();
      }
    });
  }

  protected readonly fileUploadConfig: FileUploadConfig = {
    accept: '.zip',
    maxFileSize: MAX_ATTACHMENT_BYTES,
    label: 'Attach files (optional)',
    hint: 'Upload a .zip file up to 20MB with relevant code, logs, or documentation',
  };

  protected readonly profile = this.authUser.profile;

  protected readonly form = this.fb.nonNullable.group({
    message: ['', [Validators.required, Validators.minLength(10)]],
    githubRepo: ['', []],
  });

  protected readonly submitting = signal(false);

  protected readonly feedback = signal<string | null>(null);

  protected readonly feedbackTone = signal<'success' | 'error' | 'info'>('info');

  // Form visibility state
  protected readonly showForm = signal(false);

  // Tab state
  protected readonly activeTab = signal<'requests' | 'invoices' | 'proposals'>('requests');

  // Filtering and sorting state
  protected readonly statusFilter = signal<RequestStatus | 'all'>('all');
  protected readonly sortBy = signal<'date' | 'status'>('date');
  protected readonly sortOrder = signal<'asc' | 'desc'>('desc');

  private readonly profile$ = this.authUser.profile$;

  protected readonly requests = toSignal(
    this.profile$.pipe(
      switchMap((profile) => {
        if (!profile) {
          return of<SupportRequest[]>([]);
        }

        return this.requestsService.listenForUserRequests(profile.uid).pipe(
          catchError((error) => {
            // Handle error silently - component will show appropriate UI state
            return of([]);
          }),
          map((items) => items ?? [])
        );
      })
    ),
    { initialValue: [] }
  );

  protected readonly githubIssues = toSignal(
    this.profile$.pipe(
      switchMap((profile) => {
        if (!profile) {
          return of<GitHubIssue[]>([]);
        }

        return this.githubIssuesService.getUserIssues(profile.uid).pipe(
          catchError((error) => {
            return of([]);
          })
        );
      })
    ),
    { initialValue: [] }
  );

  // Proposals for current user
  protected readonly proposals = toSignal(
    this.profile$.pipe(
      switchMap((profile) => {
        if (!profile) {
          return of([]);
        }
        return this.proposalService.listenForUserProposals(profile.uid).pipe(
          catchError((error) => {
            return of([]);
          })
        );
      })
    ),
    { initialValue: [] }
  );

  // User invoices computed from invoice store
  protected readonly userInvoices = computed(() => {
    const currentUser = this.profile();
    if (!currentUser) return [];

    return this.invoiceStore.invoices().filter(invoice =>
      invoice.customer === currentUser.stripeCustomerId ||
      invoice.customer_email === currentUser.email ||
      invoice.metadata?.['userId'] === currentUser.uid
    );
  });

  // Count badges
  protected readonly proposalsCount = computed(() => this.proposals().length);
  protected readonly invoicesCount = computed(() => this.userInvoices().length);

  // Combined items (support requests + GitHub issues)
  protected readonly allItems = computed(() => {
    const requests = this.requests() ?? [];
    const githubIssues = this.githubIssues() ?? [];
    
    // Convert GitHub issues to a unified format
    const githubItems = githubIssues.map(issue => ({
      id: issue.id,
      type: 'github' as const,
      title: issue.title,
      message: issue.body,
      status: issue.status,
      createdAt: issue.createdAt,
      githubIssueUrl: issue.githubIssueUrl,
      repository: issue.repository,
      notes: (issue.notes || []).map(note => ({
        id: note.id,
        authorName: note.authorName,
        authorId: note.authorEmail, // Use email as ID for GitHub notes
        authorEmail: note.authorEmail,
        message: note.message,
        createdAt: note.createdAt,
        role: note.role
      } as UnifiedNote))
    }));

    // Convert support requests to unified format
    const supportItems = requests.map(request => ({
      id: request.id,
      type: 'support' as const,
      title: `Support Request`,
      message: request.message,
      status: request.status,
      createdAt: request.createdAt,
      githubRepo: request.githubRepo,
      notes: (request.notes || []).map(note => ({
        id: note.id,
        authorName: note.authorName,
        authorId: note.authorId,
        authorEmail: note.authorEmail,
        message: note.message,
        createdAt: note.createdAt,
        role: note.role
      } as UnifiedNote))
    }));

    return [...supportItems, ...githubItems];
  });

  // Computed properties for filtering and sorting
  protected readonly filteredAndSortedRequests = computed(() => {
    const allItems = this.allItems();
    const statusFilter = this.statusFilter();
    const sortBy = this.sortBy();
    const sortOrder = this.sortOrder();

    // Filter out any invalid items and filter by status
    let filtered = allItems.filter((item) => item && item.id);

    if (statusFilter !== 'all') {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    // Sort items
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'date') {
        const timestampA = this.getTimestamp(a.createdAt);
        const timestampB = this.getTimestamp(b.createdAt);
        comparison = timestampA - timestampB;
      } else if (sortBy === 'status') {
        comparison = a.status.localeCompare(b.status);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  });

  protected readonly hasRequests = computed(() => this.allItems().length > 0);

  protected readonly hasFilteredRequests = computed(
    () => this.filteredAndSortedRequests().length > 0
  );

  // Available filter options
  protected readonly statusOptions = [
    { value: 'all' as const, label: 'All Requests' },
    { value: 'new' as const, label: 'New' },
    { value: 'in_progress' as const, label: 'In Progress' },
    { value: 'waiting_on_user' as const, label: 'Waiting on You' },
    { value: 'resolved' as const, label: 'Resolved' },
    { value: 'closed' as const, label: 'Closed' },
  ];

  protected readonly sortOptions = [
    { value: 'date' as const, label: 'Date' },
    { value: 'status' as const, label: 'Status' },
  ];

  protected statusCopy(status: RequestStatus | GitHubIssue['status']): RequestStatusCopy {
    switch (status) {
      case 'in_progress':
        return { label: 'In progress', tone: 'progress' };
      case 'waiting_on_user':
        return { label: 'Waiting on you', tone: 'warning' };
      case 'resolved':
        return { label: 'Resolved', tone: 'success' };
      case 'closed':
        return { label: 'Closed', tone: 'neutral' };
      case 'open':
        return { label: 'Open', tone: 'neutral' };
      default:
        return { label: 'New', tone: 'neutral' };
    }
  }

  protected onFileSelected(file: File | null): void {
    this.selectedFile = file;
  }

  private async uploadAttachment(file: File): Promise<string> {
    const contentType = file.type || 'application/zip';
    const uploadResult = await firstValueFrom(
      this.http.post<UploadUrlResult>(
        'https://us-central1-gitplumbers-35d92.cloudfunctions.net/getUploadUrl',
        { fileName: file.name, contentType }
      )
    );

    if (!uploadResult?.url || !uploadResult.filePath) {
      throw new Error('Failed to retrieve upload URL.');
    }

    const headers = new HttpHeaders({ 'Content-Type': contentType });
    await firstValueFrom(this.http.put(uploadResult.url, file, { headers, responseType: 'text' }));
    return uploadResult.filePath;
  }

  // Filter and sort methods
  protected onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newValue = target.value as RequestStatus | 'all';
    this.statusFilter.set(newValue);
  }

  protected onSortByChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newValue = target.value as 'date' | 'status';
    this.sortBy.set(newValue);
  }

  protected toggleSortOrder(): void {
    const currentOrder = this.sortOrder();
    const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
    this.sortOrder.set(newOrder);
  }

  protected clearFilters(): void {
    this.statusFilter.set('all');
    this.sortBy.set('date');
    this.sortOrder.set('desc');
  }

  protected toggleForm(): void {
    this.showForm.set(!this.showForm());
    // Clear feedback when toggling
    if (!this.showForm()) {
      this.feedback.set(null);
    }
  }

  // TrackBy function for ngFor
  protected trackByRequestId(index: number, request: any): string {
    return request?.id || index.toString();
  }

  // Helper function to convert various date formats to timestamp
  private getTimestamp(dateValue: unknown): number {
    if (!dateValue) return 0;

    // Handle Firebase Timestamp objects
    if (typeof dateValue === 'object' && dateValue !== null && 'seconds' in dateValue) {
      const timestamp = dateValue as { seconds: number; nanoseconds?: number };
      return timestamp.seconds * 1000; // Convert seconds to milliseconds
    }

    // Handle regular Date objects, strings, or numbers
    try {
      return new Date(dateValue as string | number | Date).getTime();
    } catch {
      return 0;
    }
  }

  protected async submit(): Promise<void> {
    this.feedback.set(null);

    if (this.submitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.feedback.set('Please add a bit more detail so we can help.');
      this.feedbackTone.set('error');
      return;
    }

    const profile = this.profile();
    if (!profile) {
      this.feedback.set('You need to be signed in to send a request.');
      this.feedbackTone.set('error');
      return;
    }

    this.submitting.set(true);
    this.form.disable({ emitEvent: false });
    let filePath: string | null = null;

    if (this.selectedFile) {
      try {
        filePath = await this.uploadAttachment(this.selectedFile);
      } catch (error) {
        this.feedback.set('We could not upload your attachment. Please try again.');
        this.feedbackTone.set('error');
        this.form.enable({ emitEvent: false });
        this.submitting.set(false);
        return;
      }
    }

    const payload: CreateSupportRequestPayload = {
      message: this.form.controls.message.getRawValue().trim(),
      githubRepo: this.form.controls.githubRepo.getRawValue().trim() || undefined,
      filePath: filePath ?? undefined,
    };

    let shouldClearAttachment = false;
    try {
      await this.requestsService.createRequest(profile, payload);
      this.form.reset();
      shouldClearAttachment = true;
      this.feedback.set("Request received. We'll get back ASAP.");
      this.feedbackTone.set('success');

      // Auto-collapse form after successful submission with a delay
      setTimeout(() => {
        this.showForm.set(false);
        this.feedback.set(null);
      }, 2000);

      // Clear file selection
      this.selectedFile = null;
    } catch (error) {
      this.feedback.set('We could not send that request. Please try again.');
      this.feedbackTone.set('error');
    } finally {
      this.form.enable({ emitEvent: false });
      this.submitting.set(false);
      if (shouldClearAttachment) {
        this.selectedFile = null;
      }
    }
  }

  protected formatTimestamp(input: unknown): string {
    if (!input) {
      return '';
    }

    try {
      if (typeof input === 'number') {
        return new Date(input).toLocaleString();
      }
      if (typeof input === 'string') {
        return new Date(input).toLocaleString();
      }

      // Firestore Timestamp support
      const maybeTimestamp = input as { toDate?: () => Date };
      if (maybeTimestamp?.toDate) {
        return maybeTimestamp.toDate().toLocaleString();
      }
    } catch {
      return '';
    }

    return '';
  }

  onGitHubAppInstallationComplete(data: GitHubAppInstallationData): void {
    // Handle installation completion if needed
  }

  onRepositorySelected(repoFullName: string): void {
    // Handle repository selection if needed
  }

  /**
   * Remove GitHub issue from dashboard only (keeps GitHub issue intact)
   */
  async removeIssueFromDashboard(issue: UnifiedRequest): Promise<void> {
    this.confirmationService.confirm({
      message: `Remove "${issue.title}" from your dashboard?\n\nThis will only remove it from your dashboard view. The issue will remain open on GitHub and can be re-synced later.`,
      header: 'Remove from Dashboard',
      icon: 'pi pi-eye-slash',
      acceptLabel: 'Remove',
      rejectLabel: 'Cancel',
      accept: () => {
        this.performRemoveFromDashboard(issue);
      }
    });
  }

  private async performRemoveFromDashboard(issue: UnifiedRequest): Promise<void> {
    
    try {
      const success = await this.githubIssuesService.removeIssueFromDashboard(issue.id).toPromise();
      
      if (success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Issue Removed',
          detail: 'Issue has been removed from your dashboard. It still exists on GitHub and can be re-synced later.',
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to Remove',
          detail: 'Failed to remove issue from dashboard. Please try again.',
        });
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'An error occurred while removing the issue. Please try again.',
      });
    }
  }

  /**
   * Delete GitHub issue completely (from both dashboard and GitHub)
   */
  async deleteIssueCompletely(issue: UnifiedRequest): Promise<void> {
    this.confirmationService.confirm({
      message: `Permanently delete "${issue.title}"?\n\nThis will close the issue on GitHub (cannot be undone) and remove it from your dashboard. This action cannot be undone.`,
      header: '⚠️ Permanent Delete',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete Permanently',
      rejectLabel: 'Cancel',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.performDeleteCompletely(issue);
      }
    });
  }

  private async performDeleteCompletely(issue: UnifiedRequest): Promise<void> {
    
    try {
      // Get the full GitHub issue data from the current issues
      const fullIssue = this.githubIssues()?.find(gi => gi.id === issue.id);
      if (!fullIssue) {
        this.messageService.add({
          severity: 'error',
          summary: 'Issue Not Found',
          detail: 'Could not find the full issue data. Please refresh and try again.',
        });
        return;
      }

      const result = await this.githubIssuesService.deleteIssueCompletely(
        fullIssue.id,
        fullIssue.installationId,
        fullIssue.repository,
        fullIssue.githubIssueId
      ).toPromise();
      
      if (result?.success) {
        this.messageService.add({
          severity: 'success',
          summary: 'Issue Deleted',
          detail: 'Issue has been permanently closed on GitHub and removed from your dashboard.',
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed to Delete',
          detail: result?.error || 'Failed to delete issue. Please try again.',
        });
      }
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'An error occurred while deleting the issue. Please try again.',
      });
    }
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToInvoices(): void {
    this.router.navigate(['/invoices']);
  }

  protected setActiveTab(tab: 'requests' | 'invoices' | 'proposals'): void {
    this.activeTab.set(tab);
  }
}
