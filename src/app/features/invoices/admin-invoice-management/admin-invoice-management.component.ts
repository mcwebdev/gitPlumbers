import { Component, inject, OnInit, signal, AfterViewInit } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TitleCasePipe } from '@angular/common';

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
import { PanelModule } from 'primeng/panel';
import { DividerModule } from 'primeng/divider';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { MenuModule } from 'primeng/menu';
import { FormsModule } from '@angular/forms';

// Store and Services
import { InvoiceStore } from '../store/invoice.store';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { AuthUserService } from '../../../shared/services/auth-user.service';
import { UserService } from '../../../shared/services/user.service';
import { UserProfile } from '../../../shared/services/auth-user.service';
import {
  StripeInvoice,
  StripeCustomer,
  InvoiceFormData,
  CreateCustomerRequest,
} from '../../../shared/models/stripe.interface';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

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
  PanelModule,
  DividerModule,
  AutoCompleteModule,
  MenuModule,
];

@Component({
  selector: 'app-admin-invoice-management',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, RouterModule, TitleCasePipe, LoadingSpinnerComponent, ...primeNgModules],
  providers: [MessageService, ConfirmationService],
  templateUrl: './admin-invoice-management.component.html',
  styleUrl: './admin-invoice-management.component.scss'
})
export class AdminInvoiceManagementComponent implements OnInit, AfterViewInit {
  // Dependency injection
  private readonly _invoiceStore = inject(InvoiceStore);
  private readonly _invoiceService = inject(InvoiceService);
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
  readonly selectedInvoice = this._invoiceStore.selectedInvoice;
  
  // Local UI state signals
  readonly availableUsers = signal<UserOption[]>([]);
  selectedUser: UserOption | null = null;
  showInvoiceDetail = false;

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
  }

  ngOnInit(): void {
    // Forms initialization only
  }

  ngAfterViewInit(): void {
    // ONLY run on client-side, skip SSR completely
    if (typeof window === 'undefined') return;

    // Wait for next tick to ensure hydration is done
    setTimeout(() => {
      this._invoiceStore.loadCustomers();
      this._invoiceStore.loadInvoices();
      this.loadUsers();
    }, 100);
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
   * Load available users for invoice creation
   */
  private loadUsers(): void {
    console.log('loadUsers: Starting...');
    this._userService.listUsers().subscribe({
      next: (users) => {
        console.log('loadUsers: Got users:', users);
        const userOptions = users.map(user => ({
          ...user,
          id: user.uid,
          name: user.displayName || user.email || user.uid,
          email: user.email,
          displayName: user.displayName
        } as UserOption));
        console.log('loadUsers: Setting availableUsers to:', userOptions);
        this.availableUsers.set(userOptions);
        console.log('loadUsers: availableUsers() signal now contains:', this.availableUsers());
      },
      error: (error) => {
        console.error('loadUsers: Error:', error);
      }
    });
  }

  // UI Actions

  /**
   * Show create invoice form
   */
  onCreateInvoice(): void {
    console.log('AdminInvoiceManagementComponent: onCreateInvoice method called.');
    console.log('availableUsers() contains:', this.availableUsers());
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
    this.showInvoiceDetail = true;
  }

  /**
   * Close invoice detail dialog
   */
  onCloseInvoiceDetail(): void {
    this.showInvoiceDetail = false;
    this._invoiceStore.selectInvoice(null);
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
  async onSubmitInvoice(): Promise<void> {
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
    await this.createInvoiceForUser(formValue);
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

  /**
   * Handle dialog visibility changes (for X button clicks)
   */
  onDialogVisibilityChange(visible: boolean, dialogType: 'invoice' | 'customer'): void {
    if (!visible) {
      if (dialogType === 'invoice') {
        this._invoiceStore.setShowInvoiceForm(false);
      } else {
        this._invoiceStore.setShowCustomerForm(false);
      }
      this.selectedUser = null;
    }
  }

  // User Selection

  /**
   * Handle user selection
   */
  async onUserSelect(event: any): Promise<void> {
    const user: UserOption = this.selectedUser || event.value;

    // If user doesn't have a Stripe customer ID, create one
    if (!user.stripeCustomerId) {
      const customerData: CreateCustomerRequest = {
        name: user.name ?? user.displayName,
        email: user.email,
        description: `Customer for user ${user.uid}`,
        metadata: { userId: user.uid },
      };

      // Create customer and update user document
      try {
        this._messageService.add({
          severity: 'info',
          summary: 'Creating Stripe Customer',
          detail: 'Creating customer record...',
          life: 3000,
        });

        const createdCustomer = await this._invoiceService.createCustomer(customerData);
        
        if (createdCustomer && createdCustomer.id) {
          // Update the user document with the new customer ID
          await this._authService.updateUserProfileById(user.uid, {
            stripeCustomerId: createdCustomer.id
          });
          
          // Update the user object
          user.stripeCustomerId = createdCustomer.id;
          
          this._messageService.add({
            severity: 'success',
            summary: 'Customer Created',
            detail: 'Stripe customer created successfully.',
            life: 3000,
          });
        }
      } catch (error) {
        console.error('Failed to create customer:', error);
        this._messageService.add({
          severity: 'error',
          summary: 'Customer Creation Failed',
          detail: 'Failed to create Stripe customer.',
          life: 5000,
        });
      }
    }

    this.selectedUser = user;

    this.invoiceForm.patchValue({
      userId: user.uid,
      customerName: user.name ?? user.displayName,
      customerEmail: user.email,
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
  formatDate(timestamp: number | undefined): string {
    if (!timestamp) return 'N/A';
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
  private async createInvoiceForUser(formValue: any): Promise<void> {
    console.log('AdminInvoiceManagementComponent: Attempting to create invoice for user.', { 
      selectedUser: this.selectedUser, 
      formValue 
    });

    let customerId = this.selectedUser?.stripeCustomerId;

    // If user doesn't have a Stripe customer ID, create one
    if (!customerId) {
      this._messageService.add({
        severity: 'info',
        summary: 'Creating Customer',
        detail: 'Creating Stripe customer for user...',
        life: 3000,
      });

      try {
        const customerData: CreateCustomerRequest = {
          name: this.selectedUser?.name ?? this.selectedUser?.displayName ?? formValue.customerName,
          email: this.selectedUser?.email ?? formValue.customerEmail,
          description: `Customer for user ${this.selectedUser?.uid}`,
          metadata: { userId: this.selectedUser?.uid || '' },
        };

        // Create customer directly using the service
        const createdCustomer = await this._invoiceService.createCustomer(customerData);
        
        if (createdCustomer && createdCustomer.id && this.selectedUser) {
          // Update the user document with the new customer ID
          await this._authService.updateUserProfileById(this.selectedUser.uid, {
            stripeCustomerId: createdCustomer.id
          });
          
          // Update the local selectedUser object
          this.selectedUser.stripeCustomerId = createdCustomer.id;
          customerId = createdCustomer.id;
          
          // Also update the store's customer list
          this._invoiceStore.loadCustomers();
        }

        if (!customerId) {
          this._messageService.add({
            severity: 'error',
            summary: 'Customer Creation Failed',
            detail: 'Failed to create Stripe customer. Please try again.',
            life: 5000,
          });
          return;
        }

        this._messageService.add({
          severity: 'success',
          summary: 'Customer Created',
          detail: 'Stripe customer created successfully.',
          life: 3000,
        });
      } catch (error) {
        console.error('Failed to create Stripe customer:', error);
        this._messageService.add({
          severity: 'error',
          summary: 'Customer Creation Failed',
          detail: 'Failed to create Stripe customer. Please try again.',
          life: 5000,
        });
        return;
      }
    }

    const invoiceData: InvoiceFormData = {
      customerId: customerId,
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
    this.loadUsers();
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

  /**
   * Check if invoice is overdue
   */
  isOverdue(invoice: StripeInvoice): boolean {
    if (!invoice.due_date || invoice.status === 'paid') return false;
    return invoice.due_date < Math.floor(Date.now() / 1000);
  }

  /**
   * Get days until due or overdue
   */
  getDaysUntilDue(invoice: StripeInvoice): string {
    if (!invoice.due_date || invoice.status === 'paid') return '';

    const now = Math.floor(Date.now() / 1000);
    const daysDiff = Math.ceil((invoice.due_date - now) / 86400);

    if (daysDiff < 0) {
      return `${Math.abs(daysDiff)} days overdue`;
    } else if (daysDiff === 0) {
      return 'Due today';
    } else {
      return `Due in ${daysDiff} days`;
    }
  }

  /**
   * Get invoice line items summary
   */
  getInvoiceItemsSummary(invoice: StripeInvoice): string {
    const items = invoice.lines.data;
    if (items.length === 1) {
      return items[0].description || 'Service';
    } else if (items.length > 1) {
      return `${items.length} items`;
    }
    return 'No items';
  }
}


