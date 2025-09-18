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
  template: `
    <div class="support-requests-container">
      <p-toolbar>
        <ng-template pTemplate="left">
          <h2>Support Requests</h2>
        </ng-template>
        <ng-template pTemplate="right">
          <p-button
            label="Refresh"
            icon="pi pi-refresh"
            (onClick)="refreshRequests()"
            [loading]="loading()"
          >
          </p-button>
        </ng-template>
      </p-toolbar>

      <!-- Error Message -->
      <p-message *ngIf="error()" severity="error" [text]="error()!" (onClose)="error.set(null)">
      </p-message>

      <!-- Statistics Cards -->
      <div class="stats-grid">
        <p-card>
          <ng-template pTemplate="header">
            <div class="stat-header">
              <i class="pi pi-inbox"></i>
              <span>Total</span>
            </div>
          </ng-template>
          <div class="stat-value">{{ requests().length }}</div>
        </p-card>

        <p-card>
          <ng-template pTemplate="header">
            <div class="stat-header">
              <i class="pi pi-clock"></i>
              <span>New</span>
            </div>
          </ng-template>
          <div class="stat-value">{{ getNewRequestsCount() }}</div>
        </p-card>

        <p-card>
          <ng-template pTemplate="header">
            <div class="stat-header">
              <i class="pi pi-cog"></i>
              <span>In Progress</span>
            </div>
          </ng-template>
          <div class="stat-value">{{ getInProgressRequestsCount() }}</div>
        </p-card>

        <p-card>
          <ng-template pTemplate="header">
            <div class="stat-header">
              <i class="pi pi-check"></i>
              <span>Completed</span>
            </div>
          </ng-template>
          <div class="stat-value">{{ getResolvedRequestsCount() }}</div>
        </p-card>
      </div>

      <!-- Filters -->
      <p-card class="filters-card">
        <ng-template pTemplate="header">
          <span>Filters</span>
        </ng-template>
        <div class="filters-grid">
          <div class="filter-item">
            <label for="statusFilter">Status:</label>
            <select
              id="statusFilter"
              [(ngModel)]="filters.status"
              (change)="applyFilters()"
              class="status-select"
            >
              <option value="">All Statuses</option>
              <option *ngFor="let option of statusOptions" [value]="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>

          <div class="filter-item">
            <label for="emailFilter">Email:</label>
            <input
              id="emailFilter"
              type="text"
              pInputText
              [(ngModel)]="filters.userEmail"
              placeholder="Filter by email"
              (input)="applyFilters()"
            />
          </div>

          <div class="filter-item">
            <label for="dateFromFilter">From Date:</label>
            <input
              id="dateFromFilter"
              type="date"
              [(ngModel)]="filters.dateFrom"
              (change)="applyFilters()"
              class="date-input"
            />
          </div>

          <div class="filter-item">
            <label for="dateToFilter">To Date:</label>
            <input
              id="dateToFilter"
              type="date"
              [(ngModel)]="filters.dateTo"
              (change)="applyFilters()"
              class="date-input"
            />
          </div>

          <div class="filter-actions">
            <p-button
              label="Clear Filters"
              icon="pi pi-times"
              severity="secondary"
              (onClick)="clearFilters()"
            >
            </p-button>
          </div>
        </div>
      </p-card>

      <!-- Requests Table -->
      <p-card>
        <ng-template pTemplate="header">
          <span>Support Requests ({{ requests().length }})</span>
        </ng-template>

        <div *ngIf="loading()" class="loading-container">
          <p-progressSpinner></p-progressSpinner>
          <p>Loading support requests...</p>
        </div>

        <p-table
          *ngIf="!loading()"
          [value]="requests()"
          [paginator]="true"
          [rows]="10"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Showing {first} to {last} of {totalRecords} entries"
          [rowsPerPageOptions]="[10, 25, 50]"
          styleClass="p-datatable-sm"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Message</th>
              <th>GitHub Repo</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </ng-template>

          <ng-template pTemplate="body" let-request>
            <tr>
              <td>
                <code class="request-id">{{ request.id.substring(0, 8) }}...</code>
              </td>
              <td>
                <div class="user-info">
                  <div class="user-email">{{ request.userEmail }}</div>
                  <small class="user-name">{{ request.userName }}</small>
                </div>
              </td>
              <td>
                <div class="message-preview">
                  {{
                    request.message.length > 50
                      ? request.message.substring(0, 50) + '...'
                      : request.message
                  }}
                </div>
              </td>
              <td>
                <a [href]="request.githubRepo" target="_blank" class="repo-link">
                  <i class="pi pi-external-link"></i>
                  {{ getRepoName(request.githubRepo) }}
                </a>
              </td>
              <td>
                <p-tag [value]="request.status" [severity]="getStatusSeverity(request.status)">
                </p-tag>
              </td>
              <td>
                <div class="date-info">
                  <div>{{ formatDate(request.createdAt) }}</div>
                  <small *ngIf="formatDate(request.updatedAt) !== formatDate(request.createdAt)">
                    Updated: {{ formatDate(request.updatedAt) }}
                  </small>
                </div>
              </td>
              <td>
                <div class="action-buttons">
                  <p-button
                    icon="pi pi-eye"
                    size="small"
                    severity="info"
                    [text]="true"
                    pTooltip="View Details"
                    (onClick)="viewRequest(request)"
                  >
                  </p-button>
                  <p-button
                    *ngIf="request.status === 'new'"
                    icon="pi pi-play"
                    size="small"
                    severity="success"
                    [text]="true"
                    pTooltip="Start Progress"
                    (onClick)="updateStatus(request.id, 'in_progress')"
                  >
                  </p-button>
                  <p-button
                    *ngIf="request.status === 'in_progress'"
                    icon="pi pi-check"
                    size="small"
                    severity="success"
                    [text]="true"
                    pTooltip="Mark Complete"
                    (onClick)="updateStatus(request.id, 'resolved')"
                  >
                  </p-button>
                </div>
              </td>
            </tr>
          </ng-template>

          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center">
                <div class="empty-state">
                  <i class="pi pi-inbox" style="font-size: 3rem; color: #ccc;"></i>
                  <p>No support requests found</p>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Request Detail Dialog -->
      <p-dialog
        header="Support Request Details"
        [(visible)]="showDetailDialog"
        [modal]="true"
        [style]="{ width: '80vw', maxWidth: '800px' }"
        [closable]="true"
      >
        @if (selectedRequest(); as request) {
        <div class="request-detail">
          <div class="detail-section">
            <h4>Request Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <label>ID:</label>
                <code>{{ request.id }}</code>
              </div>
              <div class="detail-item">
                <label>Status:</label>
                <p-tag [value]="request.status" [severity]="getStatusSeverity(request.status)">
                </p-tag>
              </div>
              <div class="detail-item">
                <label>Created:</label>
                <span>{{ formatDate(request.createdAt) }}</span>
              </div>
              <div class="detail-item">
                <label>Updated:</label>
                <span>{{ formatDate(request.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>User Information</h4>
            <div class="detail-grid">
              <div class="detail-item">
                <label>Email:</label>
                <span>{{ request.userEmail }}</span>
              </div>
              <div class="detail-item">
                <label>Name:</label>
                <span>{{ request.userName }}</span>
              </div>
              <div class="detail-item">
                <label>User ID:</label>
                <code>{{ request.userId }}</code>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h4>Request Details</h4>
            <div class="detail-item">
              <label>Message:</label>
              <p class="request-message">{{ request.message }}</p>
            </div>
            <div class="detail-item" *ngIf="request.githubRepo">
              <label>GitHub Repository:</label>
              <a [href]="request.githubRepo" target="_blank" class="repo-link">
                <i class="pi pi-external-link"></i>
                {{ request.githubRepo }}
              </a>
            </div>
            <div class="detail-item" *ngIf="request.filePath">
              <label>File Path:</label>
              <code>{{ request.filePath }}</code>
            </div>
          </div>

          <div class="detail-section">
            <h4>Notes ({{ request.notes.length }})</h4>
            <div class="notes-container">
              @for (note of request.notes; track note.id) {
              <div class="note-item">
                <div class="note-meta">
                  <strong>{{ note.authorName }}</strong>
                  <span class="role">{{ note.role | titlecase }}</span>
                  <span class="time">{{ formatDate(note.createdAt) }}</span>
                </div>
                <div class="note-content">{{ note.message }}</div>
              </div>
              } @if (request.notes.length === 0) {
              <div class="no-notes">
                <p>No notes added yet.</p>
              </div>
              }
            </div>

            <div class="add-note-section">
              <textarea
                pInputTextarea
                [(ngModel)]="newNote"
                placeholder="Add a note..."
                rows="3"
                class="note-input"
              >
              </textarea>
              <p-button
                label="Add Note"
                icon="pi pi-plus"
                (onClick)="addNote()"
                [disabled]="!newNote().trim()"
              >
              </p-button>
            </div>
          </div>
        </div>
        }

        <ng-template pTemplate="footer">
          <div class="dialog-actions">
            <p-button
              *ngIf="selectedRequest()?.status === 'new'"
              label="Start Progress"
              icon="pi pi-play"
              severity="success"
              (onClick)="updateStatus(selectedRequest()!.id, 'in_progress')"
            >
            </p-button>
            <p-button
              *ngIf="selectedRequest()?.status === 'in_progress'"
              label="Mark Complete"
              icon="pi pi-check"
              severity="success"
              (onClick)="updateStatus(selectedRequest()!.id, 'resolved')"
            >
            </p-button>
            <p-button
              label="Close"
              icon="pi pi-times"
              severity="secondary"
              (onClick)="closeDetailDialog()"
            >
            </p-button>
          </div>
        </ng-template>
      </p-dialog>
    </div>
  `,
  styles: [
    `
      .support-requests-container {
        padding: 1rem;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .stat-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem;
        background: var(--surface-100);
        border-radius: 4px;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: bold;
        text-align: center;
        color: var(--primary-color);
      }

      .filters-card {
        margin-bottom: 1rem;
      }

      .filters-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        align-items: end;
      }

      .filter-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .filter-item label {
        font-weight: 500;
        color: var(--text-color-secondary);
      }

      .filter-actions {
        display: flex;
        align-items: end;
      }

      .status-select,
      .date-input {
        padding: 0.5rem;
        border: 1px solid var(--surface-300);
        border-radius: 4px;
        background: var(--surface-0);
        color: var(--text-color);
        font: inherit;
      }

      .status-select:focus,
      .date-input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 2px var(--primary-color-text);
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
      }

      .request-id {
        font-family: monospace;
        background: var(--surface-100);
        padding: 0.25rem 0.5rem;
        border-radius: 4px;
        font-size: 0.875rem;
      }

      .user-info {
        display: flex;
        flex-direction: column;
      }

      .user-email {
        font-weight: 500;
      }

      .user-name {
        color: var(--text-color-secondary);
      }

      .message-preview {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .repo-link {
        color: var(--primary-color);
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 0.25rem;
      }

      .repo-link:hover {
        text-decoration: underline;
      }

      .date-info {
        display: flex;
        flex-direction: column;
      }

      .date-info small {
        color: var(--text-color-secondary);
      }

      .action-buttons {
        display: flex;
        gap: 0.25rem;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
        color: var(--text-color-secondary);
      }

      .request-detail {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .detail-section h4 {
        margin: 0 0 1rem 0;
        color: var(--primary-color);
        border-bottom: 1px solid var(--surface-200);
        padding-bottom: 0.5rem;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .detail-item label {
        font-weight: 500;
        color: var(--text-color-secondary);
        font-size: 0.875rem;
      }

      .request-message {
        background: var(--surface-50);
        padding: 1rem;
        border-radius: 4px;
        border-left: 4px solid var(--primary-color);
        margin: 0;
      }

      .notes-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        max-height: 200px;
        overflow-y: auto;
      }

      .note-item {
        background: var(--surface-50);
        padding: 0.75rem;
        border-radius: 4px;
        border-left: 3px solid var(--primary-color);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .note-meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem;
        font-size: 0.85rem;
        color: var(--text-color-secondary);
      }

      .note-meta strong {
        color: var(--text-color);
      }

      .note-meta .role {
        text-transform: uppercase;
        letter-spacing: 0.12em;
        font-size: 0.75rem;
        color: var(--primary-color);
      }

      .note-meta .time {
        color: var(--text-color-secondary);
      }

      .note-content {
        margin: 0;
        color: var(--text-color);
      }

      .no-notes {
        text-align: center;
        color: var(--text-color-secondary);
        padding: 1rem;
      }

      .add-note-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .note-input {
        width: 100%;
      }

      .dialog-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }

      @media (max-width: 768px) {
        .filters-grid {
          grid-template-columns: 1fr;
        }

        .stats-grid {
          grid-template-columns: repeat(2, 1fr);
        }

        .detail-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
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
