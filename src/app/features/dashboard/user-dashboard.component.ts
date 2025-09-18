import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

interface RequestStatusCopy {
  label: string;
  tone: 'neutral' | 'progress' | 'success' | 'warning';
}

interface UploadUrlResult {
  url: string;
  filePath: string;
}

const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FileUploadComponent],
  templateUrl: './user-dashboard.component.html',
  styleUrl: './user-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserDashboardComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authUser = inject(AuthUserService);
  private readonly requestsService = inject(RequestsService);
  private readonly http = inject(HttpClient);
  private selectedFile: File | null = null;

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

  // Filtering and sorting state
  protected readonly statusFilter = signal<RequestStatus | 'all'>('all');
  protected readonly sortBy = signal<'date' | 'status'>('date');
  protected readonly sortOrder = signal<'asc' | 'desc'>('desc');

  private readonly profile$ = this.authUser.profile$;

  protected readonly requests = toSignal(
    this.profile$.pipe(
      tap((profile) => {
        console.log('[UserDashboard] Profile changed', {
          hasProfile: !!profile,
          uid: profile?.uid,
          email: profile?.email,
          role: profile?.role,
        });
      }),
      switchMap((profile) => {
        if (!profile) {
          console.log('[UserDashboard] No profile, returning empty array');
          return of<SupportRequest[]>([]);
        }

        console.log('[UserDashboard] Starting to listen for user requests', {
          uid: profile.uid,
          email: profile.email,
        });

        return this.requestsService.listenForUserRequests(profile.uid).pipe(
          tap((requests) => {
            console.log('[UserDashboard] Received requests from service', {
              uid: profile.uid,
              count: requests?.length || 0,
              requests: requests,
            });
          }),
          catchError((error) => {
            console.error('[UserDashboard] listenForUserRequests failed - DETAILED', {
              error,
              uid: profile.uid,
              errorMessage: error?.message,
              errorCode: error?.code,
              errorName: error?.name,
              errorType: typeof error,
              fullError: error,
            });
            return of([]);
          }),
          map((items) => {
            console.log('[UserDashboard] Mapping items', {
              items: items ?? [],
              itemsLength: (items ?? []).length,
            });
            return items ?? [];
          })
        );
      })
    ),

    { initialValue: [] }
  );

  // Computed properties for filtering and sorting
  protected readonly filteredAndSortedRequests = computed(() => {
    const requests = this.requests() ?? [];
    const statusFilter = this.statusFilter();
    const sortBy = this.sortBy();
    const sortOrder = this.sortOrder();

    console.log('[UserDashboard] filteredAndSortedRequests - raw requests:', {
      count: requests.length,
      requests: requests,
      sampleRequest: requests[0] || 'No requests',
    });

    // Filter out any invalid requests and filter by status
    let filtered = requests.filter((request) => request && request.id);

    console.log('[UserDashboard] After filtering invalid requests:', {
      count: filtered.length,
      filtered: filtered,
    });

    if (statusFilter !== 'all') {
      filtered = filtered.filter((request) => request.status === statusFilter);
      console.log('[UserDashboard] After status filtering:', {
        statusFilter,
        count: filtered.length,
      });
    }

    // Sort requests
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

  protected readonly hasRequests = computed(() => (this.requests() ?? []).length > 0);

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

  protected statusCopy(status: RequestStatus): RequestStatusCopy {
    switch (status) {
      case 'in_progress':
        return { label: 'In progress', tone: 'progress' };
      case 'waiting_on_user':
        return { label: 'Waiting on you', tone: 'warning' };
      case 'resolved':
        return { label: 'Resolved', tone: 'success' };
      case 'closed':
        return { label: 'Closed', tone: 'neutral' };
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
        console.error('Failed to upload attachment', error);
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
      console.error('Failed to create request', error);
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
}
