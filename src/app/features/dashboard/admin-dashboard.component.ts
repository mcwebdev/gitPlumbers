import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MultiSelectModule } from 'primeng/multiselect';

import { AuthUserService } from '../../shared/services/auth-user.service';
import { RequestStatus, RequestsService } from '../../shared/services/requests.service';
import { GitHubIssuesService } from '../../shared/services/github-issues.service';
import { GitHubIssueStatus } from '../../shared/models/github-issue.model';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';

interface Option<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MarkdownPipe, MultiSelectModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly requestsService = inject(RequestsService);
  private readonly githubIssuesService = inject(GitHubIssuesService);
  private readonly authUser = inject(AuthUserService);

  protected readonly profile = this.authUser.profile;

  protected readonly requests = toSignal(
    this.requestsService.listenForAllRequests().pipe(map((items) => items ?? [])),
    { initialValue: [] }
  );

  protected readonly githubIssues = toSignal(
    this.githubIssuesService.getAllIssues().pipe(map((items) => items ?? [])),
    { initialValue: [] }
  );

  // Combined items (support requests + GitHub issues) for unified display
  protected readonly allItems = computed(() => {
    const supportRequests = this.requests() ?? [];
    const githubItems = this.githubIssues() ?? [];
    
    // Convert GitHub issues to unified format
    const githubUnified = githubItems.map(issue => ({
      id: issue.id,
      type: 'github' as const,
      title: issue.title,
      message: issue.body,
      status: issue.status,
      createdAt: issue.createdAt,
      userName: issue.userName,
      userEmail: issue.userEmail,
      userId: issue.userId, // Include userId for filtering
      githubIssueUrl: issue.githubIssueUrl,
      repository: issue.repository,
      notes: (issue.notes || []).map(note => ({
        id: note.id,
        authorName: note.authorName,
        authorId: note.authorEmail,
        authorEmail: note.authorEmail,
        message: note.message,
        createdAt: note.createdAt,
        role: note.role
      }))
    }));

    // Convert support requests to unified format
    const supportUnified = supportRequests.map(request => ({
      id: request.id,
      type: 'support' as const,
      title: 'Support Request',
      message: request.message,
      status: request.status,
      createdAt: request.createdAt,
      userName: request.userName,
      userEmail: request.userEmail,
      userId: request.userId, // Include userId for filtering
      githubRepo: request.githubRepo,
      notes: (request.notes || []).map(note => ({
        id: note.id,
        authorName: note.authorName,
        authorId: note.authorId,
        authorEmail: note.authorEmail,
        message: note.message,
        createdAt: note.createdAt,
        role: note.role
      }))
    }));

    // Combine and sort by creation date (newest first)
    const combined = [...supportUnified, ...githubUnified];
    return combined.sort((a, b) => {
      const aTime = this.getTimestamp(a.createdAt);
      const bTime = this.getTimestamp(b.createdAt);
      return bTime - aTime;
    });
  });

  // User filtering state
  private readonly selectedUserEmails = signal<string[]>([]);

  // Extract unique users from all items
  protected readonly availableUsers = computed(() => {
    const allItems = this.allItems();
    const userMap = new Map<string, { email: string; name: string; uid: string }>();
    
    allItems.forEach(item => {
      if (item.userEmail && item.userId) {
        userMap.set(item.userEmail, {
          email: item.userEmail,
          name: item.userName || item.userEmail,
          uid: item.userId
        });
      }
    });
    
    return Array.from(userMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  });

  // Format user options for display with name and UID
  protected readonly userOptions = computed(() => {
    const users = this.availableUsers();
    return users.map(user => ({
      email: user.email,
      label: `${user.name} (${user.uid})`,
      value: user.email
    }));
  });

  // Filtered items based on selected users
  protected readonly filteredItems = computed(() => {
    const allItems = this.allItems();
    const selectedEmails = this.selectedUserEmails();
    
    if (selectedEmails.length === 0) {
      return allItems; // Show all if no filter applied
    }
    
    return allItems.filter(item => selectedEmails.includes(item.userEmail));
  });

  protected readonly hasRequests = computed(() => (this.filteredItems() ?? []).length > 0);

  protected readonly statusOptions: Option<RequestStatus>[] = [
    { label: 'New', value: 'new' },
    { label: 'In progress', value: 'in_progress' },
    { label: 'Waiting on user', value: 'waiting_on_user' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' },
  ];

  private readonly noteDraftState = signal<Record<string, string>>({});
  private readonly statusBusyState = signal<Record<string, boolean>>({});
  private readonly noteBusyState = signal<Record<string, boolean>>({});

  protected noteDraft(id: string): string {
    return this.noteDraftState()[id] ?? '';
  }

  protected isStatusBusy(id: string): boolean {
    return this.statusBusyState()[id] ?? false;
  }

  protected isNoteBusy(id: string): boolean {
    return this.noteBusyState()[id] ?? false;
  }

  protected updateDraft(id: string, value: string): void {
    this.noteDraftState.update((state) => ({ ...state, [id]: value }));
  }

  protected async changeStatus(id: string, status: RequestStatus): Promise<void> {
    if (!status) {
      return;
    }

    // Find the item to determine its type
    const item = this.allItems().find(item => item.id === id);
    if (!item) {
      return;
    }

    this.statusBusyState.update((state) => ({ ...state, [id]: true }));
    try {
      if (item.type === 'github') {
        // Use GitHubIssuesService for GitHub issues
        // Map RequestStatus to GitHubIssueStatus
        let githubStatus: GitHubIssueStatus;
        switch (status) {
          case 'new':
            githubStatus = 'open';
            break;
          case 'in_progress':
            githubStatus = 'in_progress';
            break;
          case 'waiting_on_user':
            githubStatus = 'waiting_on_user';
            break;
          case 'resolved':
            githubStatus = 'resolved';
            break;
          case 'closed':
            githubStatus = 'closed';
            break;
          default:
            githubStatus = 'open';
        }
        
        const result = await this.githubIssuesService.updateIssueStatus(id, githubStatus).toPromise();
        if (!result) {
          throw new Error('Failed to update GitHub issue status');
        }
      } else {
        // Use RequestsService for support requests
        await this.requestsService.updateStatus(id, status);
      }
    } finally {
      this.statusBusyState.update((state) => ({ ...state, [id]: false }));
    }
  }

  protected async sendNote(id: string): Promise<void> {
    const draft = this.noteDraft(id).trim();
    if (!draft) {
      return;
    }

    const profile = this.profile();
    if (!profile) {
      return;
    }

    // Find the item to determine its type
    const item = this.allItems().find(item => item.id === id);
    if (!item) {
      return;
    }

    this.noteBusyState.update((state) => ({ ...state, [id]: true }));
    try {
      if (item.type === 'github') {
        // Use GitHubIssuesService for GitHub issues
        const noteData = {
          authorName: profile.displayName || profile.email,
          authorEmail: profile.email,
          message: draft,
          role: profile.role === 'admin' ? 'admin' as const : 'customer' as const,
          isInternal: profile.role === 'admin' // Admin notes are internal by default
        };
        
        const result = await this.githubIssuesService.addIssueNote(id, noteData).toPromise();
        if (!result) {
          throw new Error('Failed to add note to GitHub issue');
        }
      } else {
        // Use RequestsService for support requests
        await this.requestsService.addNote(id, profile, draft);
      }
      this.updateDraft(id, '');
    } finally {
      this.noteBusyState.update((state) => ({ ...state, [id]: false }));
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
      const maybeTimestamp = input as { toDate?: () => Date };
      if (maybeTimestamp?.toDate) {
        return maybeTimestamp.toDate().toLocaleString();
      }
    } catch {
      return '';
    }

    return '';
  }

  private getTimestamp(input: unknown): number {
    if (!input) {
      return 0;
    }

    try {
      if (typeof input === 'number') {
        return input;
      }
      if (typeof input === 'string') {
        return new Date(input).getTime();
      }
      const maybeTimestamp = input as { toDate?: () => Date };
      if (maybeTimestamp?.toDate) {
        return maybeTimestamp.toDate().getTime();
      }
    } catch {
      return 0;
    }

    return 0;
  }

  protected onUserFilterChange(selectedEmails: string[]): void {
    this.selectedUserEmails.set(selectedEmails);
  }

  protected clearUserFilter(): void {
    this.selectedUserEmails.set([]);
  }

  protected get selectedUserEmailsValue(): string[] {
    return this.selectedUserEmails();
  }
}
