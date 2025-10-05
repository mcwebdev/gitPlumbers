import { Component, inject, signal, computed, effect } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { switchMap, of } from 'rxjs';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { TextareaModule } from 'primeng/textarea';
import { MessageService, ConfirmationService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

// Services and Models
import { ProposalService } from '../../../shared/services/proposal.service';
import { AuthUserService } from '../../../shared/services/auth-user.service';
import { Proposal, ProposalStatus } from '../../../shared/models/proposal.interface';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

const primeNgModules = [
  CardModule,
  ButtonModule,
  TableModule,
  DialogModule,
  TagModule,
  TooltipModule,
  ConfirmDialogModule,
  ToastModule,
  PanelModule,
  DividerModule,
  TextareaModule,
];

@Component({
  selector: 'app-user-proposal-dashboard',
  standalone: true,
  imports: [RouterModule, CommonModule, TitleCasePipe, FormsModule, LoadingSpinnerComponent, ...primeNgModules],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user-proposal-dashboard.component.html',
  styleUrl: './user-proposal-dashboard.component.scss'
})
export class UserProposalDashboardComponent {
  private readonly proposalService = inject(ProposalService);
  private readonly authService = inject(AuthUserService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly currentUser = this.authService.profile;

  // Listen for proposals for the current user - lazy loaded
  readonly proposals = toSignal(
    this.authService.profile$.pipe(
      switchMap(profile => {
        if (!profile?.uid || typeof window === 'undefined') {
          return of([]);
        }
        return this.proposalService.listenForUserProposals(profile.uid);
      })
    ),
    { initialValue: [] }
  );

  readonly selectedProposal = signal<Proposal | null>(null);
  readonly showProposalDetail = signal(false);
  readonly isLoading = signal(false);
  readonly showRevisionDialog = signal(false);
  readonly revisionNotes = signal('');
  readonly userNoteText = signal('');

  // Computed statistics
  readonly stats = computed(() => {
    const props = this.proposals();
    return {
      total: props.length,
      pending: props.filter(p => p.status === 'sent').length,
      accepted: props.filter(p => p.status === 'accepted').length,
      rejected: props.filter(p => p.status === 'rejected').length,
      revisionRequested: props.filter(p => p.status === 'revision_requested').length,
    };
  });

  // UI Actions

  onViewProposal(proposal: Proposal): void {
    this.selectedProposal.set(proposal);
    this.showProposalDetail.set(true);
  }

  onCloseProposalDetail(): void {
    this.showProposalDetail.set(false);
    this.selectedProposal.set(null);
    this.userNoteText.set('');
  }

  async onAddUserNote(): Promise<void> {
    const proposal = this.selectedProposal();
    const noteText = this.userNoteText().trim();

    if (!proposal) {
      return;
    }

    if (!noteText) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Note Required',
        detail: 'Please enter a note before submitting',
        life: 3000
      });
      return;
    }

    try {
      this.isLoading.set(true);
      const user = this.currentUser();

      if (!user) {
        throw new Error('User profile not found');
      }

      await this.proposalService.addNote(proposal.id, user, noteText);

      this.messageService.add({
        severity: 'success',
        summary: 'Note Added',
        detail: 'Your note has been added to the proposal',
        life: 3000
      });

      this.userNoteText.set('');
    } catch (error) {
      console.error('Error adding user note:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to add note',
        life: 3000
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  async onAcceptProposal(proposal: Proposal): Promise<void> {
    if (proposal.status !== 'sent') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Accept',
        detail: 'Only sent proposals can be accepted',
        life: 3000
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Accept proposal "${proposal.title}"? This will notify the admin.`,
      header: 'Accept Proposal',
      icon: 'pi pi-check-circle',
      acceptButtonStyleClass: 'p-button-success',
      accept: async () => {
        try {
          this.isLoading.set(true);
          await this.proposalService.updateProposal(proposal.id, { status: 'accepted' });
          this.messageService.add({
            severity: 'success',
            summary: 'Accepted',
            detail: 'Proposal accepted successfully',
            life: 3000
          });
          this.onCloseProposalDetail();
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to accept proposal',
            life: 3000
          });
        } finally {
          this.isLoading.set(false);
        }
      }
    });
  }

  async onRejectProposal(proposal: Proposal): Promise<void> {
    if (proposal.status !== 'sent') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Reject',
        detail: 'Only sent proposals can be rejected',
        life: 3000
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Reject proposal "${proposal.title}"? This will notify the admin.`,
      header: 'Reject Proposal',
      icon: 'pi pi-times-circle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          this.isLoading.set(true);
          await this.proposalService.updateProposal(proposal.id, { status: 'rejected' });
          this.messageService.add({
            severity: 'success',
            summary: 'Rejected',
            detail: 'Proposal rejected successfully',
            life: 3000
          });
          this.onCloseProposalDetail();
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to reject proposal',
            life: 3000
          });
        } finally {
          this.isLoading.set(false);
        }
      }
    });
  }

  onRequestRevision(proposal: Proposal): void {
    if (proposal.status !== 'sent') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Request Revision',
        detail: 'Only sent proposals can have revisions requested',
        life: 3000
      });
      return;
    }

    this.revisionNotes.set('');
    this.showRevisionDialog.set(true);
  }

  async onSubmitRevisionRequest(): Promise<void> {
    const proposal = this.selectedProposal();
    const notes = this.revisionNotes().trim();

    if (!proposal) {
      return;
    }

    if (!notes) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Notes Required',
        detail: 'Please provide details about what changes you need',
        life: 3000
      });
      return;
    }

    try {
      this.isLoading.set(true);

      // Update status to revision_requested
      await this.proposalService.updateProposal(proposal.id, {
        status: 'revision_requested'
      });

      // Add a note with the revision request details
      const user = this.currentUser();
      if (user) {
        try {
          await this.proposalService.addNote(proposal.id, user, `Revision requested: ${notes}`);
        } catch (noteError) {
          console.error('Error adding note to proposal:', noteError);
          // Continue even if note fails - status was already updated
        }
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Revision Requested',
        detail: 'Your revision request has been sent to the admin',
        life: 3000
      });

      this.showRevisionDialog.set(false);
      this.revisionNotes.set('');
      this.onCloseProposalDetail();
    } catch (error) {
      console.error('Error requesting revision:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to request revision: ${error instanceof Error ? error.message : 'Unknown error'}`,
        life: 5000
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  onCancelRevisionRequest(): void {
    this.showRevisionDialog.set(false);
    this.revisionNotes.set('');
  }

  // Utility Methods

  getStatusSeverity(status: ProposalStatus): 'success' | 'info' | 'warning' | 'danger' {
    const severityMap: Record<ProposalStatus, 'success' | 'info' | 'warning' | 'danger'> = {
      'draft': 'info',
      'sent': 'warning',
      'accepted': 'success',
      'rejected': 'danger',
      'revision_requested': 'warning'
    };
    return severityMap[status] || 'info';
  }

  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return 'N/A';

    try {
      if (typeof timestamp === 'number') {
        return new Date(timestamp).toLocaleDateString();
      }
      if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString();
      }
      const maybeTimestamp = timestamp as { toDate?: () => Date };
      if (maybeTimestamp?.toDate) {
        return maybeTimestamp.toDate().toLocaleDateString();
      }
    } catch {
      return 'N/A';
    }

    return 'N/A';
  }

  canAccept(proposal: Proposal): boolean {
    return proposal.status === 'sent';
  }

  canReject(proposal: Proposal): boolean {
    return proposal.status === 'sent';
  }

  canRequestRevision(proposal: Proposal): boolean {
    return proposal.status === 'sent';
  }
}
