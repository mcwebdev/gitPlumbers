import { Component, inject, effect, computed, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { PanelModule } from 'primeng/panel';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { PaginatorModule } from 'primeng/paginator';
import { DividerModule } from 'primeng/divider';

// Store and Services
import { InvoiceStore } from '../store/invoice.store';
import { InvoiceService } from '../../../shared/services/invoice.service';
import { AuthUserService } from '../../../shared/services/auth-user.service';
import { StripeInvoice } from '../../../shared/models/stripe.interface';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

/**
 * User Invoice View Component
 * Shows invoices created for the current user
 * Following NGRX012 Component Message Handling pattern
 */
@Component({
  selector: 'app-user-invoice-view',
  standalone: true,
  imports: [
    RouterModule,
    FormsModule,
    TitleCasePipe,
    CardModule,
    ButtonModule,
    TableModule,
    TagModule,
    TooltipModule,
    ToastModule,
    PanelModule,
    DialogModule,
    InputTextModule,
    SelectModule,
    PaginatorModule,
    DividerModule,
    LoadingSpinnerComponent,
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

  // Filtered and sorted invoices for both desktop and mobile
  readonly filteredInvoices = computed(() => {
    let invoices = this.userInvoices();

    // Apply search filter
    const searchTerm = this.searchTerm();
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      invoices = invoices.filter(invoice => 
        (invoice.number?.toLowerCase().includes(searchLower)) ||
        (invoice.description?.toLowerCase().includes(searchLower)) ||
        (this.getInvoiceItemsSummary(invoice).toLowerCase().includes(searchLower)) ||
        (invoice.customer_email?.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    const selectedStatus = this.selectedStatus();
    if (selectedStatus !== 'all') {
      invoices = invoices.filter(invoice => invoice.status === selectedStatus);
    }

    // Apply sorting
    const selectedSort = this.selectedSort();
    const sortOrder = this.sortOrder();
    
    invoices = [...invoices].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (selectedSort) {
        case 'created':
          aValue = a.created;
          bValue = b.created;
          break;
        case 'due_date':
          aValue = a.due_date || 0;
          bValue = b.due_date || 0;
          break;
        case 'total':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'number':
          aValue = a.number || a.id;
          bValue = b.number || b.id;
          break;
        default:
          aValue = a.created;
          bValue = b.created;
      }

      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      else if (aValue > bValue) comparison = 1;

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return invoices;
  });


  // UI state for inline detail view
  readonly showInvoiceDetail = signal(false);
  readonly selectedInvoiceDetail = signal<StripeInvoice | null>(null);

  selectedColumns = [
    { field: 'number', header: 'Invoice #' },
    { field: 'description', header: 'Description' },
    { field: 'total', header: 'Amount' },
    { field: 'status', header: 'Status' },
    { field: 'created', header: 'Date' },
    { field: 'due_date', header: 'Due Date' },
    { field: 'actions', header: 'Actions' }
  ];

  // Filter and sort state (using signals for reactivity)
  readonly searchTerm = signal('');
  readonly selectedStatus = signal<string>('all');
  readonly selectedSort = signal<string>('created');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');

  // Filter and sort options
  statusFilterOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Open', value: 'open' },
    { label: 'Paid', value: 'paid' },
    { label: 'Draft', value: 'draft' },
    { label: 'Uncollectible', value: 'uncollectible' },
    { label: 'Void', value: 'void' }
  ];

  sortOptions = [
    { label: 'Date Created', value: 'created' },
    { label: 'Due Date', value: 'due_date' },
    { label: 'Amount', value: 'total' },
    { label: 'Status', value: 'status' },
    { label: 'Invoice Number', value: 'number' }
  ];

  // Getter/setter properties for ngModel compatibility
  get searchTermValue(): string {
    return this.searchTerm();
  }
  
  set searchTermValue(value: string) {
    this.searchTerm.set(value);
  }

  get selectedStatusValue(): string {
    return this.selectedStatus();
  }
  
  set selectedStatusValue(value: string) {
    this.selectedStatus.set(value);
  }

  get selectedSortValue(): string {
    return this.selectedSort();
  }
  
  set selectedSortValue(value: string) {
    this.selectedSort.set(value);
  }

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
   * View invoice details inline
   */
  onViewInvoice(invoice: StripeInvoice): void {
    this.selectedInvoiceDetail.set(invoice);
    this.showInvoiceDetail.set(true);
  }

  /**
   * Close invoice detail inline view
   */
  onCloseInvoiceDetail(): void {
    this.showInvoiceDetail.set(false);
    this.selectedInvoiceDetail.set(null);
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

  // Mobile filter, sort, and pagination methods

  /**
   * Handle search input change
   */
  onSearchChange(): void {
    // Search filtering handled automatically by computed property
  }

  /**
   * Handle status filter change
   */
  onStatusFilterChange(): void {
    // Status filtering handled automatically by computed property
  }

  /**
   * Handle sort change
   */
  onSortChange(): void {
    // Sorting handled automatically by computed property
  }

  /**
   * Toggle sort order between asc and desc
   */
  toggleSortOrder(): void {
    const currentOrder = this.sortOrder();
    this.sortOrder.set(currentOrder === 'asc' ? 'desc' : 'asc');
  }


  /**
   * Check if there are active filters
   */
  hasActiveFilters(): boolean {
    return this.searchTerm().trim() !== '' || this.selectedStatus() !== 'all';
  }

  /**
   * Clear all filters and sorting
   */
  clearAllFilters(): void {
    this.searchTerm.set('');
    this.selectedStatus.set('all');
    this.selectedSort.set('created');
    this.sortOrder.set('desc');
  }
}
