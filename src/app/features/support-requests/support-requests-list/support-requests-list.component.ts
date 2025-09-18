import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageModule } from 'primeng/message';
import { ToolbarModule } from 'primeng/toolbar';
import { DialogModule } from 'primeng/dialog';
import { TextareaModule } from 'primeng/textarea';
import {
  RequestsService,
  SupportRequest,
  RequestStatus,
} from '../../../shared/services/requests.service';

@Component({
  selector: 'app-support-requests-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    InputTextModule,
    ProgressSpinnerModule,
    MessageModule,
    ToolbarModule,
    DialogModule,
    TextareaModule,
  ],
  templateUrl: './support-requests-list.component.html',
  styleUrls: ['./support-requests-list.component.scss'],
})
export class SupportRequestsListComponent implements OnInit {
  private requestsService = inject(RequestsService);
  router = inject(Router);

  showDetailDialog = signal(false);
  selectedRequest = signal<SupportRequest | null>(null);
  newNote = signal('');
  requests = signal<SupportRequest[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  filters = {
    status: null as RequestStatus | null,
    userEmail: '',
    dateFrom: null as Date | null,
    dateTo: null as Date | null,
  };

  statusOptions = [
    { label: 'New', value: 'new' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Waiting on User', value: 'waiting_on_user' },
    { label: 'Resolved', value: 'resolved' },
    { label: 'Closed', value: 'closed' },
  ];

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.loading.set(true);
    this.error.set(null);

    // For now, we'll load all requests. In a real app, you'd want to implement filtering
    this.requestsService.listenForAllRequests().subscribe({
      next: (requests) => {
        this.requests.set(requests || []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err.message || 'Failed to load requests');
        this.loading.set(false);
      },
    });
  }

  refreshRequests() {
    this.loadRequests();
  }

  applyFilters() {
    // For now, we'll just reload all requests
    // In a real app, you'd implement proper filtering
    this.loadRequests();
  }

  clearFilters() {
    this.filters = {
      status: null,
      userEmail: '',
      dateFrom: null,
      dateTo: null,
    };
    this.loadRequests();
  }

  viewRequest(request: SupportRequest) {
    this.selectedRequest.set(request);
    this.showDetailDialog.set(true);
    this.newNote.set('');
  }

  closeDetailDialog() {
    this.showDetailDialog.set(false);
    this.selectedRequest.set(null);
    this.newNote.set('');
  }

  updateStatus(requestId: string, status: RequestStatus) {
    this.requestsService
      .updateStatus(requestId, status)
      .then(() => {
        this.loadRequests(); // Reload to get updated data
      })
      .catch((error) => {
        this.error.set('Failed to update status: ' + error.message);
      });
  }

  addNote() {
    const request = this.selectedRequest();
    if (request && this.newNote().trim()) {
      // For now, we'll use admin role since this is the admin interface
      // In a real app, you'd get this from the current user context
      this.requestsService
        .addNote(
          request.id,
          {
            uid: 'admin',
            displayName: 'Admin',
            email: 'admin@example.com',
            role: 'admin',
          },
          this.newNote().trim()
        )
        .then(() => {
          this.newNote.set('');
          this.loadRequests(); // Reload to get updated data
        })
        .catch((error) => {
          this.error.set('Failed to add note: ' + error.message);
        });
    }
  }

  getStatusSeverity(status: RequestStatus): string {
    switch (status) {
      case 'new':
        return 'info';
      case 'in_progress':
        return 'warning';
      case 'waiting_on_user':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'danger';
      default:
        return 'info';
    }
  }

  getRepoName(githubRepo: string): string {
    const parts = githubRepo.split('/');
    return parts[parts.length - 1] || githubRepo;
  }

  getNewRequestsCount(): number {
    return this.requests().filter((r) => r.status === 'new').length;
  }

  getInProgressRequestsCount(): number {
    return this.requests().filter((r) => r.status === 'in_progress').length;
  }

  getResolvedRequestsCount(): number {
    return this.requests().filter((r) => r.status === 'resolved').length;
  }

  formatDate(date: unknown): string {
    if (!date) return '';
    try {
      if (typeof date === 'number') {
        return new Date(date).toLocaleString();
      }
      if (typeof date === 'string') {
        return new Date(date).toLocaleString();
      }
      const maybeTimestamp = date as { toDate?: () => Date };
      if (maybeTimestamp?.toDate) {
        return maybeTimestamp.toDate().toLocaleString();
      }
    } catch {
      return '';
    }
    return '';
  }
}
