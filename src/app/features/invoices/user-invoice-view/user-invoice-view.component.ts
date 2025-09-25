import { Component, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PanelModule } from 'primeng/panel';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';

// Store and Services
import { InvoiceStore } from '../store/invoice.store';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { AuthUserService } from '../../../shared/services/auth-user.service';
import { StripeInvoice } from '../../../shared/models/stripe.interface';

/**
 * User Invoice View Component
 * Shows invoices created for the current user
 * Following NGRX012 Component Message Handling pattern
 */
@Component({
  selector: 'app-user-invoice-view',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ProgressSpinnerModule,
    PanelModule,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './user-invoice-view.component.html',
  styleUrl: './user-invoice-view.component.scss'
})
export class UserInvoiceViewComponent {
  // Dependency injection
  private readonly _invoiceStore = inject(InvoiceStore);
  private readonly _invoiceService = inject(InvoiceService);
  private readonly _authService = inject(AuthUserService);
  private readonly _messageService = inject(MessageService);

  // Store signals (direct access following NGRX009)
  readonly invoices = this._invoiceStore.invoices;
  readonly isLoading = this._invoiceStore.isLoading;
  readonly selectedInvoice = this._invoiceStore.selectedInvoice;
  readonly error = this._invoiceStore.error;

  // Computed values for user-specific invoices
  readonly userInvoices = computed(() => {
    const currentUser = this._authService.profile();
    if (!currentUser) return [];
    
    return this.invoices().filter(invoice => 
      invoice.customer === currentUser.stripeCustomerId ||
      invoice.customer_email === currentUser.email || 
      invoice.metadata?.['userId'] === currentUser.uid
    );
  });

  readonly paidInvoices = computed(() => 
    this.userInvoices().filter(invoice => invoice.status === 'paid')
  );

  readonly openInvoices = computed(() => 
    this.userInvoices().filter(invoice => invoice.status === 'open')
  );

  readonly totalOwed = computed(() => 
    this.openInvoices().reduce((sum, invoice) => sum + invoice.amount_remaining, 0)
  );

  readonly totalPaid = computed(() => 
    this.paidInvoices().reduce((sum, invoice) => sum + invoice.amount_paid, 0)
  );

  // UI state
  showInvoiceDetail = false;
  selectedColumns = [
    { field: 'number', header: 'Invoice #' },
    { field: 'description', header: 'Description' },
    { field: 'total', header: 'Amount' },
    { field: 'status', header: 'Status' },
    { field: 'created', header: 'Date' },
    { field: 'due_date', header: 'Due Date' },
    { field: 'actions', header: 'Actions' }
  ];

  constructor() {
    this.setupEffects();
    this.loadUserInvoices();
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
        this._invoiceStore.clearError();
      }
    });
  }

  /**
   * Load invoices for current user
   */
  private loadUserInvoices(): void {
    const currentUser = this._authService.profile();
    if (currentUser) {
      // In a real implementation, you would filter by user
      this._invoiceStore.loadInvoices();
    }
  }

  // UI Actions

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
   * Open invoice payment URL
   */
  onPayInvoice(invoice: StripeInvoice): void {
    if (invoice.hosted_invoice_url) {
      window.open(invoice.hosted_invoice_url, '_blank', 'noopener,noreferrer');
    } else {
      this._messageService.add({
        severity: 'warn',
        summary: 'Payment Not Available',
        detail: 'Payment link is not available for this invoice yet.',
        life: 3000
      });
    }
  }

  /**
   * Download invoice PDF
   */
  onDownloadInvoice(invoice: StripeInvoice): void {
    if (invoice.invoice_pdf) {
      window.open(invoice.invoice_pdf, '_blank', 'noopener,noreferrer');
    } else {
      this._messageService.add({
        severity: 'warn',
        summary: 'PDF Not Available',
        detail: 'PDF is not available for this invoice yet.',
        life: 3000
      });
    }
  }

  // Utility Methods

  /**
   * Get invoice status severity for UI styling
   */
  getStatusSeverity(status: StripeInvoice['status']): 'success' | 'info' | 'warning' | 'danger' {
    return this._invoiceService.getInvoiceStatusSeverity(status);
  }

  /**
   * Format currency amount for display
   */
  formatAmount(amount: number, currency: string): string {
    return this._invoiceService.formatCurrencyAmount(amount, currency);
  }

  /**
   * Format date from Unix timestamp
   */
  formatDate(timestamp: number | undefined): string {
    if (!timestamp) return 'N/A';
    return this._invoiceService.formatDate(timestamp);
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
   * Refresh invoices
   */
  onRefresh(): void {
    this.loadUserInvoices();
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

  /**
   * Check if user has any invoices
   */
  hasInvoices(): boolean {
    return this.userInvoices().length > 0;
  }

  /**
   * Check if user has any open invoices
   */
  hasOpenInvoices(): boolean {
    return this.openInvoices().length > 0;
  }
}
