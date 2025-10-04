import { Component, inject, effect, computed, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { RouterModule } from '@angular/router';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { DatePickerModule } from 'primeng/datepicker';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MenuModule } from 'primeng/menu';
import { FormsModule } from '@angular/forms';

// Store and Services
import { InvoiceStore } from '../store/invoice.store';
// InvoiceService removed - using MCP tools directly
import { AuthUserService } from '../../../shared/services/auth-user.service';
import { UserService } from '../../../shared/services/user.service';
import { UserProfile } from '../../../shared/services/auth-user.service';
import { 
  StripeInvoice, 
  StripeCustomer, 
  InvoiceFormData,
  CreateCustomerRequest,
} from '../../../shared/models/stripe.interface';

// Update UserOption
interface UserOption extends UserProfile {
  name: string; // alias displayName
}

/**
 * Admin Invoice Management Component
 * Allows admins to create invoices for users
 * Following NGRX012 Component Message Handling pattern
 */
const primeNgModules = [
  CardModule,
  ButtonModule,
  TableModule,
  DialogModule,
  InputTextModule,
  TextareaModule,
  InputNumberModule,
  SelectModule,
  DatePickerModule,
  TagModule,
  TooltipModule,
  ConfirmDialogModule,
  ToastModule,
  ProgressSpinnerModule,
  PanelModule,
  DividerModule,
  AutoCompleteModule,
  MenuModule,
];

@Component({
  selector: 'app-admin-invoice-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule, ...primeNgModules],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-invoice-management.component.html',
  styleUrl: './admin-invoice-management.component.scss'
})
export class AdminInvoiceManagementComponent implements OnInit {
  // Dependency injection
  private readonly _invoiceStore = inject(InvoiceStore);
  // _invoiceService removed - using MCP tools directly
  private readonly _authService = inject(AuthUserService);
  private readonly _userService = inject(UserService);
  private readonly _messageService = inject(MessageService);
  private readonly _confirmationService = inject(ConfirmationService);
  private readonly _formBuilder = inject(FormBuilder);

  // Store signals (direct access following NGRX009)
  readonly invoices = this._invoiceStore.invoices;
  readonly customers = this._invoiceStore.customers;
  readonly isLoading = this._invoiceStore.isAnyLoading;
  readonly showInvoiceForm = this._invoiceStore.showInvoiceForm;
  readonly showCustomerForm = this._invoiceStore.showCustomerForm;
  readonly error = this._invoiceStore.error;
  readonly invoiceStats = this._invoiceStore.invoiceStats;
  readonly hasMoreInvoices = this._invoiceStore.hasMoreInvoices;
  
  // Local UI state signals
  readonly availableUsers = signal<UserOption[]>([]);
  readonly filteredUsers = signal<UserOption[]>([]);
  selectedUser: UserOption | null = null;
  private readonly _pendingCustomerUserId = signal<string | null>(null);

  // Forms
  customerForm!: FormGroup;
  invoiceForm!: FormGroup;

  // UI state
  selectedColumns = [
    { field: 'number', header: 'Invoice #' },
    { field: 'customer', header: 'Customer/User' },
    { field: 'total', header: 'Amount' },
    { field: 'status', header: 'Status' },
    { field: 'created', header: 'Date' },
    { field: 'actions', header: 'Actions' }
  ];

  statusOptions = [
    { label: 'All', value: null },
    { label: 'Draft', value: 'draft' },
    { label: 'Open', value: 'open' },
    { label: 'Paid', value: 'paid' },
    { label: 'Uncollectible', value: 'uncollectible' },
    { label: 'Void', value: 'void' }
  ];

  currencyOptions = [
    { label: 'USD', value: 'usd' },
    { label: 'EUR', value: 'eur' },
    { label: 'GBP', value: 'gbp' }
  ];

  // Common service types for quick selection
  serviceTemplates = [
    {
      name: 'Code Review & Optimization',
      description: 'Comprehensive code review and performance optimization',
      unitAmount: 15000, // $150.00
      currency: 'usd'
    },
    {
      name: 'Bug Fix & Debugging',
      description: 'Critical bug resolution and debugging services',
      unitAmount: 12000, // $120.00
      currency: 'usd'
    },
    {
      name: 'Feature Development',
      description: 'Custom feature development and implementation',
      unitAmount: 18000, // $180.00
      currency: 'usd'
    },
    {
      name: 'Technical Consultation',
      description: 'Technical architecture consultation and guidance',
      unitAmount: 20000, // $200.00
      currency: 'usd'
    },
    {
      name: 'Emergency Support',
      description: 'Urgent technical support and issue resolution',
      unitAmount: 25000, // $250.00
      currency: 'usd'
    }
  ];

  constructor() {
    this.initializeForms();
    this.setupEffects();
  }

  ngOnInit(): void {
    void this.loadUsers();
    this._invoiceStore.loadCustomers();
    this._invoiceStore.loadInvoices();
  }

  /**
   * Initialize reactive forms
   */
  private initializeForms(): void {
    this.customerForm = this._formBuilder.group({
      name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.email]],
      description: ['', [Validators.maxLength(500)]],
    });

    this.invoiceForm = this._formBuilder.group({
      userId: ['', [Validators.required]],
      customerName: ['', [Validators.required, Validators.maxLength(100)]],
      customerEmail: ['', [Validators.required, Validators.email]],
      description: ['', [Validators.maxLength(500)]],
      daysUntilDue: [30, [Validators.min(0), Validators.max(365)]],
      items: this._formBuilder.array([this.createInvoiceItemFormGroup()]),
    });
  }

  /**
   * Create form group for invoice items
   */
  private createInvoiceItemFormGroup(): FormGroup {
    return this._formBuilder.group({
      productName: ['', [Validators.required, Validators.maxLength(250)]],
      description: ['', [Validators.maxLength(500)]],
      unitAmount: [0, [Validators.required, Validators.min(1)]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      currency: ['usd', [Validators.required]],
    });
  }

  /**
   * Get invoice items form array
   */
  get invoiceItems(): FormArray {
    return this.invoiceForm.get('items') as FormArray;
  }

  /**
   * Setup effects for handling store state changes
   */
  private setupEffects(): void {
    // Handle error messages
    effect(() => {
      const error = this.error();
      if (error) {
        this._messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error,
          life: 5000
        });
        if (error.includes('Failed to create customer')) {
          this._pendingCustomerUserId.set(null);
        }
        this._invoiceStore.clearError();
      }
    });

    // Handle success messages
    effect(() => {
      const lastOperation = this._invoiceStore.lastOperation();
      if (lastOperation && lastOperation.includes('successfully')) {
        this._messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: lastOperation,
          life: 3000
        });
      }
    });

    effect(() => {
      const pendingUserId = this._pendingCustomerUserId();
      if (!pendingUserId) {
        return;
      }

      const customers = this.customers();
      const newCustomer = customers.find(c => c.metadata?.['userId'] === pendingUserId);
      if (!newCustomer) {
        return;
      }

      this._pendingCustomerUserId.set(null);

      void this._authService.updateUserProfileById(pendingUserId, { stripeCustomerId: newCustomer.id })
        .then(() => {
          if (this.selectedUser && this.selectedUser.uid === pendingUserId) {
            this.selectedUser = { ...this.selectedUser, stripeCustomerId: newCustomer.id };
          }

          this.availableUsers.update(users => users.map(user => 
            user.uid === pendingUserId ? { ...user, stripeCustomerId: newCustomer.id } : user
          ));
          this.filteredUsers.update(users => users.map(user => 
            user.uid === pendingUserId ? { ...user, stripeCustomerId: newCustomer.id } : user
          ));

          this._messageService.add({ severity: 'success', summary: 'Customer Created' });
        })
        .catch(err => {
          this._messageService.add({ severity: 'error', detail: `Failed to update user: ${err.message}` });
        });
    }, { allowSignalWrites: true });
  }

  /**
   * Load available users for invoice creation
   * In a real app, this would fetch from your user management system
   */
  private async loadUsers(): Promise<void> {
    try {
      const users = await this._userService.listUsers();
      const userOptions = users.map((user: UserProfile) => {
        const resolvedName = user.displayName || user.email || user.uid;
        return {
          ...user,
          id: user.uid,
          name: resolvedName,
          email: user.email,
          displayName: resolvedName
        } as UserOption;
      });
      this.availableUsers.set(userOptions);
      this.filteredUsers.set(userOptions);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to load users: ${message}`,
        life: 5000
      });
    }
  }

  // UI Actions

  /**
   * Show create invoice form
   */
  onCreateInvoice(): void {
    console.log('AdminInvoiceManagementComponent: onCreateInvoice method called.');
    this.invoiceForm.reset();
    this.invoiceForm.patchValue({
      daysUntilDue: 30,
      items: [{ unitAmount: 0, quantity: 1, currency: 'usd' }]
    });
    this.selectedUser = null;
    this._invoiceStore.setShowInvoiceForm(true);
  }

  /**
   * Show create customer form
   */
  onCreateCustomer(): void {
    this.customerForm.reset();
    this._invoiceStore.setShowCustomerForm(true);
  }

  /**
   * View invoice details
   */
  onViewInvoice(invoice: StripeInvoice): void {
    this._invoiceStore.selectInvoice(invoice);
  }

  /**
   * Finalize draft invoice
   */
  onFinalizeInvoice(invoice: StripeInvoice): void {
    if (invoice.status !== 'draft') {
      this._messageService.add({
        severity: 'warn',
        summary: 'Cannot Finalize',
        detail: 'Only draft invoices can be finalized',
        life: 3000
      });
      return;
    }

    this._confirmationService.confirm({
      message: `Are you sure you want to finalize invoice ${invoice.number || invoice.id}? This will send it to the customer.`,
      header: 'Confirm Finalization',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this._invoiceStore.finalizeInvoice(invoice.id);
      }
    });
  }

  /**
   * Delete invoice
   */
  onDeleteInvoice(invoice: StripeInvoice): void {
    const isDraft = invoice.status === 'draft';
    const action = isDraft ? 'delete' : 'void';
    const message = isDraft
      ? `Delete draft invoice ${invoice.number || invoice.id}? This will permanently remove it.`
      : `Void invoice ${invoice.number || invoice.id}? This will mark it as uncollectible and remove it from the list. The invoice will still exist in Stripe as voided.`;

    this._confirmationService.confirm({
      message,
      header: isDraft ? 'Delete Invoice' : 'Void Invoice',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: isDraft ? 'Delete' : 'Void',
      accept: () => {
        this._invoiceStore.deleteInvoice(invoice.id);
      }
    });
  }

  /**
   * Create payment link for invoice
   */
  onCreatePaymentLink(invoice: StripeInvoice): void {
    console.log('AdminInvoiceManagementComponent: onCreatePaymentLink click', { invoiceId: invoice.id, status: invoice.status, hostedUrl: invoice.hosted_invoice_url, invoicePdf: invoice.invoice_pdf });
    if (invoice.status !== 'open') {
      this._messageService.add({
        severity: 'warn',
        summary: 'Unavailable',
        detail: 'Only open invoices can be paid online.',
        life: 3000,
      });
      return;
    }

    const hostedUrl = invoice.hosted_invoice_url || invoice.invoice_pdf;
    if (!hostedUrl) {
      this._messageService.add({
        severity: 'error',
        summary: 'Missing Payment Link',
        detail: 'This invoice does not have an online payment URL yet. Finalize the invoice or try refreshing.',
        life: 4000,
      });
      return;
    }

    if (typeof window !== 'undefined') {
      window.open(hostedUrl, '_blank', 'noopener');
    } else {
      console.log('AdminInvoiceManagementComponent: Payment URL', hostedUrl);
    }
    this._messageService.add({
      severity: 'info',
      summary: 'Payment Page Opened',
      detail: 'A new tab was opened with the Stripe payment page.',
      life: 3000,
    });
  }

  // Form Actions

  /**
   * Submit customer form
   */
  onSubmitCustomer(): void {
    if (this.customerForm.invalid) {
      this.markFormGroupTouched(this.customerForm);
      return;
    }

    const customerData = {
      name: this.customerForm.value.name,
      email: this.customerForm.value.email || undefined,
      description: this.customerForm.value.description || undefined,
    };

    this._invoiceStore.createCustomer(customerData);
  }

  /**
   * Submit invoice form
   */
  onSubmitInvoice(): void {
    if (this.invoiceForm.invalid) {
      this.markFormGroupTouched(this.invoiceForm);
      return;
    }

    if (!this.selectedUser) {
      this._messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select a user for this invoice',
        life: 3000
      });
      return;
    }

    const formValue = this.invoiceForm.value;
    this.createInvoiceForUser(formValue);
  }

  /**
   * Add invoice item to form
   */
  onAddInvoiceItem(): void {
    this.invoiceItems.push(this.createInvoiceItemFormGroup());
  }

  /**
   * Remove invoice item from form
   */
  onRemoveInvoiceItem(index: number): void {
    if (this.invoiceItems.length > 1) {
      this.invoiceItems.removeAt(index);
    }
  }

  /**
   * Apply service template to invoice item
   */
  onApplyServiceTemplate(template: typeof this.serviceTemplates[0], itemIndex: number): void {
    const itemControl = this.invoiceItems.at(itemIndex);
    if (itemControl) {
      itemControl.patchValue({
        productName: template.name,
        description: template.description,
        unitAmount: template.unitAmount / 100, // Convert cents to dollars for display
        currency: template.currency
      });
    }
  }

  /**
   * Cancel form and hide dialog
   */
  onCancelForm(): void {
    this._invoiceStore.setShowInvoiceForm(false);
    this._invoiceStore.setShowCustomerForm(false);
    this.selectedUser = null;
  }

  // User Selection

  /**
   * Filter users for autocomplete
   */
  onFilterUsers(event: { query: string }): void {
    const query = event.query?.toLowerCase().trim() || '';

    // Show all users if query is empty (dropdown click)
    if (!query) {
      this.filteredUsers.set(this.availableUsers());
      return;
    }

    const users = this.availableUsers().filter(user =>
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
    this.filteredUsers.set(users);
  }

  /**
   * Handle user selection
   */
  async onUserSelect(event: any): Promise<void> {
    const user: UserOption = {
      ...event.value,
      name: event.value?.name ?? event.value?.displayName ?? event.value?.email ?? 'Unknown user',
      displayName: event.value?.displayName ?? event.value?.name ?? event.value?.email ?? 'Unknown user'
    };

    try {
      let customerId = user.stripeCustomerId;

      // If user doesn't have a Stripe customer ID, create one
      if (!customerId) {
        const customerData: CreateCustomerRequest = {
          name: user.name ?? user.displayName,
          email: user.email,
          description: `Customer for user ${user.uid}`,
          metadata: { userId: user.uid },
        };

        this._pendingCustomerUserId.set(user.uid);
        this._invoiceStore.createCustomer(customerData);
      }

      this.selectedUser = { ...user, stripeCustomerId: customerId };

      this.invoiceForm.patchValue({
        userId: user.uid,
        customerName: user.name ?? user.displayName,
        customerEmail: user.email,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to prepare customer: ${message}`,
        life: 5000,
      });
    }
  }

  /**
   * Clear user selection
   */
  onClearUserSelection(): void {
    this.selectedUser = null;
    this.invoiceForm.patchValue({
      userId: '',
      customerName: '',
      customerEmail: ''
    });
  }

  // Utility Methods

  /**
   * Get invoice status severity for UI styling
   */
  getStatusSeverity(status: StripeInvoice['status']): 'success' | 'info' | 'warning' | 'danger' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      'draft': 'info',
      'open': 'warning',
      'paid': 'success',
      'uncollectible': 'danger',
      'void': 'info'
    };
    return severityMap[status || ''] || 'info';
  }

  /**
   * Format currency amount for display
   */
  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Convert from cents
  }

  /**
   * Format date from Unix timestamp
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString();
  }

  /**
   * Get customer name from customer object or ID
   */
  getCustomerName(customer: string | StripeCustomer): string {
    if (typeof customer === 'string') {
      const foundCustomer = this.customers().find(c => c.id === customer);
      return foundCustomer?.name || foundCustomer?.email || customer;
    }
    return customer.name || customer.email || customer.id;
  }

  /**
   * Mark all form controls as touched to show validation errors
   */
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

  /**
   * Create invoice for selected user
   */
  private createInvoiceForUser(formValue: any): void {
    console.log('AdminInvoiceManagementComponent: Attempting to create invoice for user.', { 
      selectedUser: this.selectedUser, 
      formValue 
    });

    if (!this.selectedUser?.stripeCustomerId) {
      this._messageService.add({
        severity: 'error',
        summary: 'Missing Customer ID',
        detail: 'The selected user does not have a Stripe Customer ID.',
        life: 5000
      });
      console.error('Create invoice failed: No Stripe Customer ID on selected user.');
      return;
    }

    const invoiceData: InvoiceFormData = {
      customerId: this.selectedUser.stripeCustomerId,
      customerName: formValue.customerName,
      customerEmail: formValue.customerEmail,
      description: formValue.description,
      daysUntilDue: formValue.daysUntilDue,
      items: formValue.items,
    };
    
    console.log('AdminInvoiceManagementComponent: Calling store.createFullInvoice with:', { invoiceData });
    this._invoiceStore.createFullInvoice(invoiceData);
  }

  /**
   * Refresh data
   */
  onRefresh(): void {
    this._invoiceStore.loadInvoices();
    this._invoiceStore.loadCustomers();
  }

  /**
   * Filter invoices by status
   */
  onStatusFilter(event: any): void {
    const status = event as StripeInvoice['status'] | null;
    this._invoiceStore.updateInvoiceFilters({ status: status || undefined });
    this._invoiceStore.loadInvoices();
  }

  /**
   * Load more invoices for pagination
   */
  onLoadMoreInvoices(): void {
    const invoices = this.invoices();
    if (invoices.length === 0) {
      return;
    }
    const lastInvoiceId = invoices[invoices.length - 1].id;
    this._invoiceStore.updateInvoiceFilters({ startingAfter: lastInvoiceId });
    this._invoiceStore.loadInvoices();
  }

  /**
   * Calculate invoice total for display
   */
  getInvoiceTotal(): string {
    let total = 0;
    for (const control of this.invoiceItems.controls) {
      const unitAmount = control.get('unitAmount')?.value || 0;
      const quantity = control.get('quantity')?.value || 1;
      total += unitAmount * quantity * 100; // Convert to cents
    }
    return this.formatAmount(total, 'usd');
  }
}


