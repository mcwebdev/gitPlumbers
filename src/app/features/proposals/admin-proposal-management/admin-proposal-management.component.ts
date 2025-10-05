import { Component, inject, signal, AfterViewInit, DestroyRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TitleCasePipe, CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { FormsModule } from '@angular/forms';

// Services and Models
import { ProposalService } from '../../../shared/services/proposal.service';
import { UserService } from '../../../shared/services/user.service';
import { AuthUserService, UserProfile } from '../../../shared/services/auth-user.service';
import { Proposal, ProposalStatus, CreateProposalRequest } from '../../../shared/models/proposal.interface';

interface UserOption extends UserProfile {
  name: string;
}

const primeNgModules = [
  CardModule,
  ButtonModule,
  TableModule,
  DialogModule,
  InputTextModule,
  TextareaModule,
  InputNumberModule,
  SelectModule,
  TagModule,
  TooltipModule,
  ConfirmDialogModule,
  ToastModule,
  ProgressSpinnerModule,
  PanelModule,
  DividerModule,
  AutoCompleteModule,
];

@Component({
  selector: 'app-admin-proposal-management',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterModule, TitleCasePipe, CommonModule, ...primeNgModules],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-proposal-management.component.html',
  styleUrl: './admin-proposal-management.component.scss'
})
export class AdminProposalManagementComponent implements AfterViewInit {
  private readonly proposalService = inject(ProposalService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthUserService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  // State
  readonly proposals = toSignal(
    this.proposalService.listenForAllProposals().pipe(map((items) => items ?? [])),
    { initialValue: [] }
  );
  readonly availableUsers = signal<UserOption[]>([]);
  filteredUsers: UserOption[] = [];
  selectedUser: UserOption | null = null;
  panelState = signal<'hidden' | 'visible' | 'closing'>('hidden');
  showProposalDetail = signal(false);
  selectedProposal = signal<Proposal | null>(null);
  isLoading = signal(false);
  adminNoteText = signal('');

  // Forms
  proposalForm!: FormGroup;

  // UI Configuration
  statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Rejected', value: 'rejected' },
    { label: 'Revision Requested', value: 'revision_requested' },
  ];

  currencyOptions = [
    { label: 'USD', value: 'usd' },
    { label: 'EUR', value: 'eur' },
    { label: 'GBP', value: 'gbp' },
  ];

  // Service templates for quick selection
  serviceTemplates = [
    {
      name: 'Code Review & Optimization',
      description: 'Comprehensive code review and performance optimization',
      unitAmount: 15000,
      currency: 'usd'
    },
    {
      name: 'Bug Fix & Debugging',
      description: 'Critical bug resolution and debugging services',
      unitAmount: 12000,
      currency: 'usd'
    },
    {
      name: 'Feature Development',
      description: 'Custom feature development and implementation',
      unitAmount: 18000,
      currency: 'usd'
    },
    {
      name: 'Technical Consultation',
      description: 'Technical architecture consultation and guidance',
      unitAmount: 20000,
      currency: 'usd'
    },
  ];

  constructor() {
    this.initializeForms();
  }

  ngAfterViewInit(): void {
    // ONLY run on client-side, skip SSR completely
    if (typeof window === 'undefined') {
      console.log('AdminProposalManagement: Skipping ngAfterViewInit on server');
      return;
    }

    console.log('AdminProposalManagement: ngAfterViewInit running on client');
    // Wait for next tick to ensure hydration is done
    setTimeout(() => {
      console.log('AdminProposalManagement: Calling loadUsers()');
      this.loadUsers();
    }, 100);
  }

  private initializeForms(): void {
    this.proposalForm = this.formBuilder.group({
      userId: ['', [Validators.required]],
      userName: ['', [Validators.required]],
      userEmail: ['', [Validators.required, Validators.email]],
      title: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', [Validators.maxLength(1000)]],
      currency: ['usd', [Validators.required]],
      items: this.formBuilder.array([this.createProposalItemFormGroup()]),
    });
  }

  private createProposalItemFormGroup(): FormGroup {
    return this.formBuilder.group({
      productName: ['', [Validators.required, Validators.maxLength(250)]],
      description: ['', [Validators.maxLength(500)]],
      unitAmount: [0, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      currency: ['usd', [Validators.required]],
    });
  }

  get proposalItems(): FormArray {
    return this.proposalForm.get('items') as FormArray;
  }

  private loadUsers(): void {
    if (this.availableUsers().length > 0) {
      console.log('AdminProposalManagement: Users already loaded, skipping');
      return;
    }

    console.log('AdminProposalManagement: loadUsers() started');
    this.userService.listUsers().pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe({
      next: (users) => {
        console.log('AdminProposalManagement: Got users from service:', users.length);
        const userOptions = users.map(user => ({
          ...user,
          id: user.uid,
          name: user.displayName || user.email || user.uid,
          email: user.email,
          displayName: user.displayName
        } as UserOption));
        console.log('AdminProposalManagement: Setting availableUsers signal with:', userOptions.length, 'users');
        this.availableUsers.set(userOptions);
        console.log('AdminProposalManagement: availableUsers() after set:', this.availableUsers());
      },
      error: (error) => {
        console.error('AdminProposalManagement: Error loading users:', error);
      }
    });
  }

  // UI Actions

  onCreateProposal(): void {
    this.proposalForm.reset();
    this.proposalForm.patchValue({
      currency: 'usd',
      items: [{ unitAmount: 0, quantity: 1, currency: 'usd' }]
    });
    this.selectedUser = null;
    this.panelState.set('visible');
  }

  onViewProposal(proposal: Proposal): void {
    this.selectedProposal.set(proposal);
    this.showProposalDetail.set(true);
  }

  onCloseProposalDetail(): void {
    this.showProposalDetail.set(false);
    this.selectedProposal.set(null);
    this.adminNoteText.set('');
  }

  async onAddAdminNote(): Promise<void> {
    const proposal = this.selectedProposal();
    const noteText = this.adminNoteText().trim();

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
      const admin = this.authService.profile();

      if (!admin) {
        throw new Error('Admin profile not found');
      }

      await this.proposalService.addNote(proposal.id, admin, noteText);

      this.messageService.add({
        severity: 'success',
        summary: 'Note Added',
        detail: 'Your note has been added to the proposal',
        life: 3000
      });

      this.adminNoteText.set('');
    } catch (error) {
      console.error('Error adding admin note:', error);
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

  async onDeleteProposal(proposal: Proposal): Promise<void> {
    this.confirmationService.confirm({
      message: `Delete proposal "${proposal.title}"? This action cannot be undone.`,
      header: 'Delete Proposal',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.proposalService.deleteProposal(proposal.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Deleted',
            detail: 'Proposal deleted successfully',
            life: 3000
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete proposal',
            life: 3000
          });
        }
      }
    });
  }

  async onSendProposal(proposal: Proposal): Promise<void> {
    if (proposal.status !== 'draft') {
      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Send',
        detail: 'Only draft proposals can be sent',
        life: 3000
      });
      return;
    }

    this.confirmationService.confirm({
      message: `Send proposal "${proposal.title}" to ${proposal.userName}?`,
      header: 'Send Proposal',
      icon: 'pi pi-send',
      accept: async () => {
        try {
          await this.proposalService.updateProposal(proposal.id, { status: 'sent' });
          this.messageService.add({
            severity: 'success',
            summary: 'Sent',
            detail: 'Proposal sent successfully',
            life: 3000
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to send proposal',
            life: 3000
          });
        }
      }
    });
  }

  // Form Actions

  async onSubmitProposal(): Promise<void> {
    if (this.proposalForm.invalid) {
      this.markFormGroupTouched(this.proposalForm);
      return;
    }

    if (!this.selectedUser) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select a user for this proposal',
        life: 3000
      });
      return;
    }

    try {
      this.isLoading.set(true);
      const formValue = this.proposalForm.value;

      const request: CreateProposalRequest = {
        userId: this.selectedUser.uid,
        userEmail: this.selectedUser.email,
        userName: this.selectedUser.name,
        title: formValue.title,
        description: formValue.description,
        items: formValue.items.map((item: any) => ({
          ...item,
          unitAmount: Math.round(item.unitAmount * 100), // Convert to cents
        })),
        currency: formValue.currency,
      };

      await this.proposalService.createProposal(request);

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Proposal created successfully',
        life: 3000
      });

      this.closePanel();
      this.proposalForm.reset();
      this.selectedUser = null;
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to create proposal',
        life: 3000
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  onAddProposalItem(): void {
    this.proposalItems.push(this.createProposalItemFormGroup());
  }

  onRemoveProposalItem(index: number): void {
    if (this.proposalItems.length > 1) {
      this.proposalItems.removeAt(index);
    }
  }

  onApplyServiceTemplate(template: typeof this.serviceTemplates[0], itemIndex: number): void {
    const itemControl = this.proposalItems.at(itemIndex);
    if (itemControl) {
      itemControl.patchValue({
        productName: template.name,
        description: template.description,
        unitAmount: template.unitAmount / 100,
        currency: template.currency
      });
    }
  }

  onCancelForm(): void {
    this.closePanel();
    this.selectedUser = null;
  }

  closePanel(): void {
    this.panelState.set('closing');
    setTimeout(() => {
      this.panelState.set('hidden');
      this.proposalForm.reset();
      this.selectedUser = null;
    }, 300); // Match CSS transition duration
  }

  // User Selection

  filterUsers(event: any): void {
    const query = event.query.toLowerCase();
    const allUsers = this.availableUsers();

    if (!query) {
      this.filteredUsers = allUsers;
    } else {
      this.filteredUsers = allUsers.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }
  }

  async onUserSelect(event: any): Promise<void> {
    const user: UserOption | null = this.selectedUser || event?.value || null;
    if (!user) {
      console.warn('AdminProposalManagement: onUserSelect called with no user');
      return;
    }

    this.selectedUser = user;

    this.proposalForm.patchValue({
      userId: user.uid ?? '',
      userName: user.name ?? user.displayName ?? '',
      userEmail: user.email ?? '',
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

  getProposalTotal(): string {
    let total = 0;
    for (const control of this.proposalItems.controls) {
      const unitAmount = control.get('unitAmount')?.value || 0;
      const quantity = control.get('quantity')?.value || 1;
      total += unitAmount * quantity * 100;
    }
    return this.formatAmount(total, 'usd');
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach(arrayControl => {
          if (arrayControl instanceof FormGroup) {
            this.markFormGroupTouched(arrayControl);
          } else {
            arrayControl.markAsTouched();
          }
        });
      } else {
        control?.markAsTouched();
      }
    });
  }

  onRefresh(): void {
    this.loadUsers(); // Will check if already loaded
  }
}
