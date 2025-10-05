import { Component, inject, signal, AfterViewInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TitleCasePipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

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
  imports: [ReactiveFormsModule, FormsModule, RouterModule, TitleCasePipe, ...primeNgModules],
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

  // State
  readonly proposals = toSignal(
    this.proposalService.listenForAllProposals().pipe(map((items) => items ?? [])),
    { initialValue: [] }
  );
  readonly availableUsers = signal<UserOption[]>([]);
  filteredUsers: UserOption[] = [];
  selectedUser: UserOption | null = null;
  showProposalForm = signal(false);
  showProposalDetail = signal(false);
  selectedProposal = signal<Proposal | null>(null);
  isLoading = signal(false);

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

  private async loadUsers(): Promise<void> {
    console.log('AdminProposalManagement: loadUsers() started');
    try {
      const users = await this.userService.listUsers();
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
    } catch (error) {
      console.error('AdminProposalManagement: Error loading users:', error);
    }
  }

  // UI Actions

  onCreateProposal(): void {
    this.proposalForm.reset();
    this.proposalForm.patchValue({
      currency: 'usd',
      items: [{ unitAmount: 0, quantity: 1, currency: 'usd' }]
    });
    this.selectedUser = null;
    this.showProposalForm.set(true);
  }

  onViewProposal(proposal: Proposal): void {
    this.selectedProposal.set(proposal);
    this.showProposalDetail.set(true);
  }

  onCloseProposalDetail(): void {
    this.showProposalDetail.set(false);
    this.selectedProposal.set(null);
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

      this.showProposalForm.set(false);
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
    this.showProposalForm.set(false);
    this.selectedUser = null;
  }

  onDialogVisibilityChange(visible: boolean): void {
    if (!visible) {
      this.showProposalForm.set(false);
      this.selectedUser = null;
    }
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
    const user: UserOption = this.selectedUser || event.value;
    this.selectedUser = user;

    this.proposalForm.patchValue({
      userId: user.uid,
      userName: user.name ?? user.displayName,
      userEmail: user.email,
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
    this.loadUsers();
  }
}
