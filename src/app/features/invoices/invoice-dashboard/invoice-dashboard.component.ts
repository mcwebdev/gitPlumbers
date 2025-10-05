import { Component, inject, effect, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { FormsModule } from '@angular/forms';

// Store and Services
import { InvoiceStore } from '../store/invoice.store';
// InvoiceService removed - using MCP tools directly
import {
  StripeInvoice,
  StripeCustomer,
  InvoiceFormData,
} from '../../../shared/models/stripe.interface';
import { AuthUserService } from '../../../shared/services/auth-user.service';
import { computed } from '@angular/core';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

/**
 * Invoice Dashboard Component
 * Following NGRX012 Component Message Handling:
 * - Components handle UI concerns (toast notifications)
 * - Uses MessageService for user feedback
 * - Stores handle business state only
 */
@Component({
  selector: 'app-invoice-dashboard',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    FormsModule,
    RouterModule,
    TitleCasePipe,
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
    LoadingSpinnerComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './invoice-dashboard.component.html',
  styleUrl: './invoice-dashboard.component.scss'
})
export class InvoiceDashboardComponent {
  // Dependency injection
  private readonly _invoiceStore = inject(InvoiceStore);
  // _invoiceService removed - using MCP tools directly
  private readonly _messageService = inject(MessageService);
  private readonly _confirmationService = inject(ConfirmationService);
  private readonly _authService = inject(AuthUserService);
  private cdr = inject(ChangeDetectorRef);

  // Store signals (direct access following NGRX009)
  readonly invoices = this._invoiceStore.invoices;
  readonly customers = this._invoiceStore.customers;
  readonly products = this._invoiceStore.products;
  readonly prices = this._invoiceStore.prices;
  readonly selectedInvoice = this._invoiceStore.selectedInvoice;
  readonly isLoading = this._invoiceStore.isAnyLoading;
  readonly showInvoiceForm = this._invoiceStore.showInvoiceForm;
  readonly showCustomerForm = this._invoiceStore.showCustomerForm;
  readonly editingInvoice = this._invoiceStore.editingInvoice;
  readonly error = this._invoiceStore.error;
  readonly invoiceStats = this._invoiceStore.invoiceStats;
  readonly paidInvoices = this._invoiceStore.paidInvoices;
  readonly openInvoices = this._invoiceStore.openInvoices;
  readonly draftInvoices = this._invoiceStore.draftInvoices;

  readonly userInvoices = computed(() => {
    const currentUser = this._authService.profile();
    if (!currentUser) return [];
    
    return this.invoices().filter(invoice => 
      invoice.customer_email === currentUser.email || 
      invoice.metadata?.['userId'] === currentUser.uid
    );
  });

  // UI state
  selectedColumns = [
    { field: 'number', header: 'Invoice #' },
    { field: 'customer', header: 'Customer' },
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

  constructor() {
    this.setupEffects();
    this._invoiceStore.loadInvoices();
  }

  /**
   * Setup effects for handling store state changes
   * Following NGRX014 Component Effect Cleanup
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
        // Clear error after showing
        this._invoiceStore.clearError();
      }
    });

    // Handle success messages based on last operation
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
  }

  // UI Actions

  /**
   * View invoice details
   */
  onViewInvoice(invoice: StripeInvoice): void {
    this._invoiceStore.selectInvoice(invoice);
    // Could open a detail dialog or navigate to detail page
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
      message: `Are you sure you want to finalize invoice ${invoice.number || invoice.id}? This action cannot be undone.`,
      header: 'Confirm Finalization',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this._invoiceStore.finalizeInvoice(invoice.id);
      }
    });
  }

  /**
   * Create payment link for invoice
   */

  canOpenPayment(invoice: StripeInvoice): boolean {
    if (!invoice) {
      console.warn('InvoiceDashboardComponent: canOpenPayment called without invoice');
      return false;
    }

    const hostedUrl = invoice.hosted_invoice_url || invoice.invoice_pdf;
    const reasons: string[] = [];
    if (invoice.status !== 'open') {
      reasons.push('status=' + (invoice.status ?? 'unknown'));
    }
    if (!hostedUrl) {
      reasons.push('missing hosted URL');
    }

    const canPay = reasons.length === 0;
    console.debug('InvoiceDashboardComponent: canOpenPayment check', {
      invoiceId: invoice.id,
      status: invoice.status,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
      invoicePdf: invoice.invoice_pdf,
      result: canPay,
      blockers: reasons,
    });

    return canPay;
  }

  onCreatePaymentLink(invoice: StripeInvoice): void {
    console.log('InvoiceDashboardComponent: onCreatePaymentLink click', { invoiceId: invoice.id, status: invoice.status, hostedUrl: invoice.hosted_invoice_url, invoicePdf: invoice.invoice_pdf });
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
        detail: 'This invoice does not have an online payment URL yet. Please contact support.',
        life: 4000,
      });
      return;
    }

    if (typeof window !== 'undefined') {
      window.open(hostedUrl, '_blank', 'noopener');
    } else {
      console.log('InvoiceDashboardComponent: Payment URL', hostedUrl);
    }
    this._messageService.add({
      severity: 'info',
      summary: 'Payment Page Opened',
      detail: 'A new tab was opened with your Stripe payment page.',
      life: 3000,
    });
  }

  // Form Actions

  /**
   * Cancel form and hide dialog
   */
  onCancelForm(): void {
    this._invoiceStore.setShowInvoiceForm(false);
    this._invoiceStore.setShowCustomerForm(false);
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
   * Filter invoices by status
   */
  onStatusFilter(event: any): void {
    const status = event as StripeInvoice['status'] | null;
    this._invoiceStore.updateInvoiceFilters({ status: status || undefined });
    this._invoiceStore.loadInvoices();
  }

  onRefresh(): void {
    this._invoiceStore.loadInvoices();
  }
}

