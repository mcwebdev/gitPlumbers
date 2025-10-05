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
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';

// Services and Models
import { ProposalService } from '../../../shared/services/proposal.service';
import { AuthUserService } from '../../../shared/services/auth-user.service';
import { Proposal, ProposalStatus } from '../../../shared/models/proposal.interface';

const primeNgModules = [
  CardModule,
  ButtonModule,
  TableModule,
  DialogModule,
  TagModule,
  TooltipModule,
  ConfirmDialogModule,
  ToastModule,
  ProgressSpinnerModule,
  PanelModule,
  DividerModule,
];

@Component({
  selector: 'app-user-proposal-dashboard',
  standalone: true,
  imports: [RouterModule, TitleCasePipe, ...primeNgModules],
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

  // Computed statistics
  readonly stats = computed(() => {
    const props = this.proposals();
    return {
      total: props.length,
      pending: props.filter(p => p.status === 'sent').length,
      accepted: props.filter(p => p.status === 'accepted').length,
      rejected: props.filter(p => p.status === 'rejected').length,
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

  async onRequestRevision(proposal: Proposal): Promise<void> {
    if (proposal.status !== 'sent') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Request Revision',
        detail: 'Only sent proposals can have revisions requested',
        life: 3000
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Request revision for "${proposal.title}"? This will notify the admin that changes are needed.`,
      header: 'Request Revision',
      icon: 'pi pi-pencil',
      accept: async () => {
        try {
          this.isLoading.set(true);
          await this.proposalService.updateProposal(proposal.id, { status: 'revision_requested' });
          this.messageService.add({
            severity: 'success',
            summary: 'Revision Requested',
            detail: 'Revision request sent successfully',
            life: 3000
          });
          this.onCloseProposalDetail();
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to request revision',
            life: 3000
          });
        } finally {
          this.isLoading.set(false);
        }
      }
    });
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
