import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

import { AuthUserService } from '../../shared/services/auth-user.service';
import { RequestStatus, RequestsService } from '../../shared/services/requests.service';

interface Option<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardComponent {
  private readonly requestsService = inject(RequestsService);
  private readonly authUser = inject(AuthUserService);

  protected readonly profile = this.authUser.profile;

  protected readonly requests = toSignal(
    this.requestsService.listenForAllRequests().pipe(map((items) => items ?? [])),
    { initialValue: [] }
  );

  protected readonly hasRequests = computed(() => (this.requests() ?? []).length > 0);

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

    this.statusBusyState.update((state) => ({ ...state, [id]: true }));
    try {
      await this.requestsService.updateStatus(id, status);
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

    this.noteBusyState.update((state) => ({ ...state, [id]: true }));
    try {
      await this.requestsService.addNote(id, profile, draft);
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
}
