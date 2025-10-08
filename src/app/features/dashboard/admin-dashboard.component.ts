import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MultiSelectModule } from 'primeng/multiselect';

import { AuthUserService } from '../../shared/services/auth-user.service';
import { RequestStatus, RequestsService } from '../../shared/services/requests.service';
import { GitHubIssuesService } from '../../shared/services/github-issues.service';
import { GitHubIssueStatus } from '../../shared/models/github-issue.model';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';
import { UserService } from '../../shared/services/user.service';

interface Option<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [FormsModule, RouterModule, TitleCasePipe, MarkdownPipe, MultiSelectModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly requestsService = inject(RequestsService);
  private readonly githubIssuesService = inject(GitHubIssuesService);
  private readonly authUser = inject(AuthUserService);
  private readonly userService = inject(UserService);

  protected readonly profile = this.authUser.profile;

  // All users from Firestore
  protected readonly allUsers = signal<Array<{ uid: string; email: string; displayName: string }>>([]);

  constructor() {
    // Load all users on init
    effect(() => {
      if (this.profile()) {
        this.loadUsers();
      }
    }, { allowSignalWrites: true });
  }

  private loadUsers(): void {
    this.userService.listUsers().subscribe({
      next: (users) => {
        this.allUsers.set(users.map(u => ({
          uid: u.uid,
          email: u.email,
          displayName: u.displayName || u.email
        })));
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

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
      installationId: issue.installationId, // Include installationId for git clone
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

  // Format user options for display with displayName and email
  protected readonly userOptions = computed(() => {
    const users = this.allUsers();
    return users
      .map(user => ({
        email: user.email,
        label: `${user.displayName} (${user.email})`,
        value: user.email
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
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

  protected async copyCloneCommand(repository: string, installationId?: string): Promise<void> {
    if (!installationId) {
      // Fallback to regular clone if no installation ID
      const cloneCommand = `git clone https://github.com/${repository}.git`;
      await this.copyToClipboard(cloneCommand);
      return;
    }

    const apiBaseUrl = 'https://us-central1-gitplumbers-35d92.cloudfunctions.net';
    const repoName = repository.split('/')[1];

    // Create a Windows batch script that fetches token and sets up git credential helper
    const windowsScript = `@echo off
REM gitPlumbers Auto-Clone Script for Windows
REM This script fetches a fresh GitHub App token and clones the repository

set REPO=${repository}
set INSTALLATION_ID=${installationId}
set API_URL=${apiBaseUrl}/getInstallationAccessToken/%INSTALLATION_ID%

echo Fetching GitHub App installation token...
curl -s "%API_URL%" > token_response.json

REM Extract token from JSON response (requires PowerShell)
for /f "delims=" %%i in ('powershell -Command "(Get-Content token_response.json | ConvertFrom-Json).token"') do set TOKEN=%%i
del token_response.json

if "%TOKEN%"=="" (
    echo Failed to get installation token
    exit /b 1
)

echo Token acquired, cloning repository...
git clone https://x-access-token:%TOKEN%@github.com/%REPO%.git

echo.
echo Repository cloned successfully!
echo.
echo IMPORTANT: To push changes later, run this command inside the repo folder:
echo   refresh-token.bat
echo.

REM Create a helper script to refresh the token for push operations
cd ${repoName}
(
echo @echo off
echo echo Refreshing GitHub App token...
echo curl -s "${apiBaseUrl}/getInstallationAccessToken/${installationId}" ^> token_response.json
echo for /f "delims=" %%%%i in ^('powershell -Command "^(Get-Content token_response.json ^| ConvertFrom-Json^).token"'^) do set NEW_TOKEN=%%%%i
echo del token_response.json
echo git remote set-url origin https://x-access-token:%%NEW_TOKEN%%@github.com/${repository}.git
echo echo Token refreshed! You can now push your changes.
) > refresh-token.bat

echo Helper script created: refresh-token.bat
`;

    await this.copyToClipboard(windowsScript);

    const instructions = `📋 Windows clone script copied to clipboard!

SETUP INSTRUCTIONS:
1. Create file: clone-${repoName}.bat
2. Paste the clipboard content
3. Run: clone-${repoName}.bat

WORKFLOW:
• Clone: Run clone-${repoName}.bat (does this once)
• Make your code fixes
• Before pushing: Run refresh-token.bat (gets fresh token)
• Push: git push origin your-branch

The refresh-token.bat script will be created automatically in the cloned repo folder!`;

    alert(instructions);
    console.log('✅ Windows clone script copied');
  }

  private async copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert(`Copy this command:\n\n${text}`);
    }
  }
}
