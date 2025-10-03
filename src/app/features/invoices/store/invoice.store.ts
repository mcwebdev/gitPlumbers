import { computed, inject } from '@angular/core';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { signalStore, withProps, withState, withComputed, withMethods, withHooks, patchState } from '@ngrx/signals';
import { pipe, switchMap, tap, catchError, of, from } from 'rxjs';
import { InvoiceService } from '../../../shared/services/invoice.service';
import {
  StripeCustomer,
  StripeProduct,
  StripePrice,
  StripeInvoice,
  StripePaymentLink,
  StripeCoupon,
  CreateCustomerRequest,
  CreateProductRequest,
  CreatePriceRequest,
  CreateInvoiceRequest,
  CreateInvoiceItemRequest,
  CreatePaymentLinkRequest,
  CreateCouponRequest,
  InvoiceListFilters,
  CustomerListFilters,
  InvoiceFormData,
} from '../../../shared/models/stripe.interface';

/**
 * Invoice state interface
 */
interface InvoiceState {
  // Loading states
  isLoading: boolean;
  isCreatingInvoice: boolean;
  isCreatingCustomer: boolean;
  isCreatingProduct: boolean;
  isCreatingPrice: boolean;
  isCreatingPaymentLink: boolean;
  isFinalizing: boolean;

  // Data
  invoices: StripeInvoice[];
  customers: StripeCustomer[];
  products: StripeProduct[];
  prices: StripePrice[];
  coupons: StripeCoupon[];
  selectedInvoice: StripeInvoice | null;
  selectedCustomer: StripeCustomer | null;

  // Filters and pagination
  invoiceFilters: InvoiceListFilters;
  customerFilters: CustomerListFilters;
  hasMoreInvoices: boolean;
  hasMoreCustomers: boolean;

  // Error handling
  error: string | null;
  lastOperation: string | null;

  // UI state
  showInvoiceForm: boolean;
  showCustomerForm: boolean;
  editingInvoice: StripeInvoice | null;
}

/**
 * Initial state
 */
const initialState: InvoiceState = {
  // Loading states
  isLoading: false,
  isCreatingInvoice: false,
  isCreatingCustomer: false,
  isCreatingProduct: false,
  isCreatingPrice: false,
  isCreatingPaymentLink: false,
  isFinalizing: false,

  // Data
  invoices: [],
  customers: [],
  products: [],
  prices: [],
  coupons: [],
  selectedInvoice: null,
  selectedCustomer: null,

  // Filters and pagination
  invoiceFilters: { limit: 10 },
  customerFilters: { limit: 10 },
  hasMoreInvoices: false,
  hasMoreCustomers: false,

  // Error handling
  error: null,
  lastOperation: null,

  // UI state
  showInvoiceForm: false,
  showCustomerForm: false,
  editingInvoice: null,
};

/**
 * NgRx SignalStore for invoice management
 * Following NGRX architecture rules:
 * - Uses withProps for service injection
 * - Handles all state management operations
 * - No external state mutation allowed
 * - Components handle UI concerns, store handles business logic
 */
export const InvoiceStore = signalStore(
  { providedIn: 'root' },
  
  // Service injection via withProps (NGRX002)
  withProps(() => ({
    _invoiceService: inject(InvoiceService),
  })),

  // State definition
  withState(initialState),

  // Computed values
  withComputed((store) => ({
    // Invoice computations
    paidInvoices: computed(() => 
      store.invoices().filter(invoice => invoice.status === 'paid')
    ),
    openInvoices: computed(() => 
      store.invoices().filter(invoice => invoice.status === 'open')
    ),
    draftInvoices: computed(() => 
      store.invoices().filter(invoice => invoice.status === 'draft')
    ),
    totalInvoiceAmount: computed(() => 
      store.invoices().reduce((sum, invoice) => sum + invoice.total, 0)
    ),
    totalPaidAmount: computed(() => 
      store.invoices().reduce((sum, invoice) => sum + invoice.amount_paid, 0)
    ),
    totalOutstandingAmount: computed(() => 
      store.invoices().reduce((sum, invoice) => sum + invoice.amount_remaining, 0)
    ),

    // Customer computations
    activeCustomers: computed(() => 
      store.customers().filter(customer => customer.email)
    ),
    
    // UI state computations
    hasInvoices: computed(() => store.invoices().length > 0),
    hasCustomers: computed(() => store.customers().length > 0),
    isAnyLoading: computed(() => 
      store.isLoading() || 
      store.isCreatingInvoice() || 
      store.isCreatingCustomer() || 
      store.isCreatingProduct() || 
      store.isCreatingPrice() || 
      store.isCreatingPaymentLink() ||
      store.isFinalizing()
    ),

    // Form state
    canCreateInvoice: computed(() =>
      store.customers().length > 0 && !store.isCreatingInvoice()
    ),

    // Statistics for dashboard
    invoiceStats: computed(() => {
      const invoices = store.invoices();
      return store._invoiceService.calculateInvoiceTotals(invoices);
    }),
  })),

  // Methods for state operations
  withMethods((store) => ({
    // UI state management
    selectInvoice(invoice: StripeInvoice | null): void {
      patchState(store, { selectedInvoice: invoice });
    },

    selectCustomer(customer: StripeCustomer | null): void {
      patchState(store, { selectedCustomer: customer });
    },

    editInvoice(invoice: StripeInvoice): void {
      patchState(store, { 
        editingInvoice: invoice,
        showInvoiceForm: true,
        error: null 
      });
    },

    clearError(): void {
      patchState(store, { error: null });
    },

    setShowInvoiceForm(visible: boolean): void {
      patchState(store, { showInvoiceForm: visible });
    },

    setShowCustomerForm(visible: boolean): void {
      patchState(store, { showCustomerForm: visible });
    },

    // Filter management
    updateInvoiceFilters(filters: Partial<InvoiceListFilters>): void {
      patchState(store, { 
        invoiceFilters: { ...store.invoiceFilters(), ...filters }
      });
    },

    updateCustomerFilters(filters: Partial<CustomerListFilters>): void {
      patchState(store, { 
        customerFilters: { ...store.customerFilters(), ...filters }
      });
    },

    // Load data operations using rxMethod
    loadInvoices: rxMethod<InvoiceListFilters | void>(
      pipe(
        tap(() => patchState(store, { 
          isLoading: true, 
          error: null,
          lastOperation: 'Loading invoices'
        })),
        switchMap((filters) => {
          const finalFilters = filters || store.invoiceFilters();
          const transformedFilters = store._invoiceService.transformInvoiceListFilters(finalFilters);
          
          // Use Stripe MCP tool to list invoices
          return from(
            store._invoiceService.listInvoices({
              customer: transformedFilters.customer,
              limit: transformedFilters.limit,
              starting_after: transformedFilters.startingAfter,
            })
          ).pipe(
            tap((newInvoices) => {
              const currentInvoices = transformedFilters.startingAfter ? store.invoices() : [];
              patchState(store, { 
                invoices: [...currentInvoices, ...newInvoices],
                isLoading: false,
                hasMoreInvoices: newInvoices.length === (transformedFilters.limit || 10),
                lastOperation: 'Invoices loaded successfully'
              });
            }),
            catchError((error) => {
              patchState(store, { 
                invoices: [],
                isLoading: false,
                error: `Failed to load invoices: ${error.message || 'Unknown error'}`,
                lastOperation: 'Failed to load invoices'
              });
              return of([]);
            })
          );
        })
      )
    ),

    loadCustomers: rxMethod<CustomerListFilters | void>(
      pipe(
        tap(() => patchState(store, { 
          isLoading: true, 
          error: null,
          lastOperation: 'Loading customers'
        })),
        switchMap((filters) => {
          const finalFilters = filters || store.customerFilters();
          const transformedFilters = store._invoiceService.transformCustomerListFilters(finalFilters);
          
          // Use Stripe MCP tool to list customers
          return from(
            store._invoiceService.listCustomers({
              email: transformedFilters.email,
              limit: transformedFilters.limit
            })
          ).pipe(
            tap((customers) => {
              patchState(store, { 
                customers,
                isLoading: false,
                hasMoreCustomers: customers.length === (transformedFilters.limit || 10),
                lastOperation: 'Customers loaded successfully'
              });
            }),
            catchError((error) => {
              patchState(store, { 
                customers: [],
                isLoading: false,
                error: `Failed to load customers: ${error.message || 'Unknown error'}`,
                lastOperation: 'Failed to load customers'
              });
              return of([]);
            })
          );
        })
      )
    ),

    loadProducts: rxMethod<void>(
      pipe(
        tap(() => patchState(store, { 
          isLoading: true, 
          error: null,
          lastOperation: 'Loading products'
        })),
        switchMap(() => {
          // Use Stripe MCP tool to list products
          return from(
            store._invoiceService.listProducts({
              limit: 100
            })
          ).pipe(
            tap((products) => {
              patchState(store, { 
                products,
                isLoading: false,
                lastOperation: 'Products loaded successfully'
              });
            }),
            catchError((error) => {
              patchState(store, { 
                products: [],
                isLoading: false,
                error: `Failed to load products: ${error.message || 'Unknown error'}`,
                lastOperation: 'Failed to load products'
              });
              return of([]);
            })
          );
        })
      )
    ),

    loadPrices: rxMethod<string | void>(
      pipe(
        tap(() => patchState(store, { 
          isLoading: true, 
          error: null,
          lastOperation: 'Loading prices'
        })),
        switchMap((productId) => {
          if (!productId) {
            patchState(store, { prices: [], isLoading: false });
            return of([]);
          }
          // Use Stripe MCP tool to list prices
          return from(
            store._invoiceService.listPrices({
              product: productId,
              limit: 100
            })
          ).pipe(
            tap((prices) => {
              patchState(store, { 
                prices,
                isLoading: false,
                lastOperation: 'Prices loaded successfully'
              });
            }),
            catchError((error) => {
              patchState(store, { 
                prices: [],
                isLoading: false,
                error: `Failed to load prices: ${error.message || 'Unknown error'}`,
                lastOperation: 'Failed to load prices'
              });
              return of([]);
            })
          );
        })
      )
    ),

    // Create operations
    createCustomer: rxMethod<CreateCustomerRequest>(
      pipe(
        tap(() => patchState(store, { 
          isCreatingCustomer: true, 
          error: null,
          lastOperation: 'Creating customer'
        })),
        switchMap((customerData) => {
          const transformedData = store._invoiceService.transformCustomerData(customerData);
          
          // Use Stripe MCP tool to create customer
          const requestPayload = {
            name: transformedData.name,
            email: transformedData.email,
            description: transformedData.description,
            metadata: transformedData.metadata,
          };

          return from(
            store._invoiceService.createCustomer(requestPayload)
          ).pipe(
          
            tap((customer) => {
              patchState(store, { 
                customers: [...store.customers(), customer],
                isCreatingCustomer: false,
                showCustomerForm: false,
                lastOperation: `Customer "${customer.name}" created successfully`
              });
            }),
            catchError((error) => {
              patchState(store, { 
                isCreatingCustomer: false,
                error: `Failed to create customer: ${error.message || 'Unknown error'}`,
                lastOperation: 'Failed to create customer'
              });
              return of(null);
            })
          );
        })
      )
    ),

    createProduct: rxMethod<CreateProductRequest>(
      pipe(
        tap(() => patchState(store, { 
          isCreatingProduct: true, 
          error: null,
          lastOperation: 'Creating product'
        })),
        switchMap((productData) => {
          const transformedData = store._invoiceService.transformProductData(productData);
          
          // Use Stripe MCP tool to create product
          return from(
            store._invoiceService.createProduct({
              name: transformedData.name,
              description: transformedData.description
            })
          ).pipe(
            tap((product) => {
              patchState(store, { 
                products: [...store.products(), product],
                isCreatingProduct: false,
                lastOperation: `Product "${product.name}" created successfully`
              });
            }),
            catchError((error) => {
              patchState(store, { 
                isCreatingProduct: false,
                error: `Failed to create product: ${error.message || 'Unknown error'}`,
                lastOperation: 'Failed to create product'
              });
              return of(null);
            })
          );
        })
      )
    ),

    createPrice: rxMethod<CreatePriceRequest>(
      pipe(
        tap(() => patchState(store, { 
          isCreatingPrice: true, 
          error: null,
          lastOperation: 'Creating price'
        })),
        switchMap((priceData) => {
          const transformedData = store._invoiceService.transformPriceData(priceData);
          
          // Use Stripe MCP tool to create price
          return from(
            store._invoiceService.createPrice({
              product: transformedData.product,
              unit_amount: transformedData.unit_amount,
              currency: transformedData.currency,
              recurring: transformedData.recurring
            })
          ).pipe(
            tap((price) => {
              patchState(store, { 
                prices: [...store.prices(), price],
                isCreatingPrice: false,
                lastOperation: 'Price created successfully'
              });
            }),
            catchError((error) => {
              patchState(store, { 
                isCreatingPrice: false,
                error: `Failed to create price: ${error.message || 'Unknown error'}`,
                lastOperation: 'Failed to create price'
              });
              return of(null);
            })
          );
        })
      )
    ),

    createInvoice: rxMethod<CreateInvoiceRequest>(
      pipe(
        tap(() => patchState(store, { 
          isCreatingInvoice: true, 
          error: null,
          lastOperation: 'Creating invoice'
        })),
        switchMap((invoiceData) => {
          const transformedData = store._invoiceService.transformInvoiceData(invoiceData);
          
          // Use Stripe MCP tool to create invoice
          return from(
            store._invoiceService.createInvoice({
              customer: transformedData.customer,
              description: transformedData.description,
              days_until_due: transformedData.days_until_due
            })
          ).pipe(
            tap((invoice) => {
              patchState(store, { 
                invoices: [...store.invoices(), invoice],
                isCreatingInvoice: false,
                showInvoiceForm: false,
                editingInvoice: null,
                lastOperation: `Invoice ${invoice.number || invoice.id} created successfully`
              });
            }),
            catchError((error) => {
              patchState(store, { 
                isCreatingInvoice: false,
                error: `Failed to create invoice: ${error.message || 'Unknown error'}`,
                lastOperation: 'Failed to create invoice'
              });
              return of(null);
            })
          );
        })
      )
    ),

    addInvoiceItem: rxMethod<CreateInvoiceItemRequest>(
      pipe(
        tap(() => patchState(store, { 
          isLoading: true, 
          error: null,
          lastOperation: 'Adding invoice item'
        })),
        switchMap((itemData) => {
          const transformedData = store._invoiceService.transformInvoiceItemData(itemData);
          
          // Use Stripe MCP tool to create invoice item
          return from(
            store._invoiceService.createInvoiceItem({
              customer: transformedData.customer,
              price_data: transformedData.price_data,
              invoice: transformedData.invoice,
              quantity: transformedData.quantity
            })
          ).pipe(
            tap((updatedInvoice) => {
              const updatedInvoices = store.invoices().map(inv => 
                inv.id === updatedInvoice.id ? updatedInvoice : inv
              );
              patchState(store, { 
                invoices: updatedInvoices,
                selectedInvoice: updatedInvoice,
                isLoading: false,
                lastOperation: 'Invoice item added successfully'
              });
            }),
            catchError((error) => {
              patchState(store, { 
                isLoading: false,
                error: `Failed to add invoice item: ${error.message || 'Unknown error'}`,
                lastOperation: 'Failed to add invoice item'
              });
              return of(null);
            })
          );
        })
      )
    ),

    finalizeInvoice: rxMethod<string>(
      pipe(
        tap(() => patchState(store, { 
          isFinalizing: true, 
          error: null,
          lastOperation: 'Finalizing invoice'
        })),
        switchMap((invoiceId) => {
          // Use Stripe MCP tool to finalize invoice
          return from(
            store._invoiceService.finalizeInvoice({
              invoice: invoiceId
            })
          ).pipe(
            tap((finalizedInvoice) => {
              const updatedInvoices = store.invoices().map(inv => 
                inv.id === finalizedInvoice.id ? finalizedInvoice : inv
              );
              patchState(store, { 
                invoices: updatedInvoices,
                selectedInvoice: finalizedInvoice,
                isFinalizing: false,
                lastOperation: `Invoice ${finalizedInvoice.number || finalizedInvoice.id} finalized successfully`
              });
            }),
            catchError((error) => {
              patchState(store, { 
                isFinalizing: false,
                error: `Failed to finalize invoice: ${error.message || 'Unknown error'}`,
                lastOperation: 'Failed to finalize invoice'
              });
              return of(null);
            })
          );
        })
      )
    ),

    createPaymentLink: rxMethod<CreatePaymentLinkRequest>(
      pipe(
        tap(() => patchState(store, { 
          isCreatingPaymentLink: true, 
          error: null,
          lastOperation: 'Creating payment link'
        })),
        switchMap((linkData) => {
          const transformedData = store._invoiceService.transformPaymentLinkData(linkData);
          
          // Use Stripe MCP tool to create payment link
          return from(
            store._invoiceService.createPaymentLink({
              price: transformedData.price,
              quantity: transformedData.quantity
            })
          ).pipe(
            tap((paymentLink) => {
              patchState(store, { 
                isCreatingPaymentLink: false,
                lastOperation: 'Payment link created successfully'
              });
              
              // Return the payment link for component to handle (e.g., copy to clipboard, open in new tab)
              return paymentLink;
            }),
            catchError((error) => {
              patchState(store, { 
                isCreatingPaymentLink: false,
                error: `Failed to create payment link: ${error.message || 'Unknown error'}`,
                lastOperation: 'Failed to create payment link'
              });
              return of(null);
            })
          );
        })
      )
    ),

    createFullInvoice: rxMethod<InvoiceFormData>(
      pipe(
        tap(() => patchState(store, { 
          isCreatingInvoice: true, 
          error: null,
          lastOperation: 'Starting full invoice creation'
        })),
        switchMap(formData => from(store._invoiceService.createFullInvoice(formData)).pipe(
          tap(invoice => {
            patchState(store, {
              invoices: [...store.invoices(), invoice],
              isCreatingInvoice: false,
              showInvoiceForm: false,
              lastOperation: `Full invoice ${invoice.id} created successfully.`
            });
          }),
          catchError(error => {
            patchState(store, {
              isCreatingInvoice: false,
              error: `Full invoice creation failed: ${error.message}`,
              lastOperation: 'Full invoice creation failed'
            });
            return of(null);
          })
        ))
      )
    ),
  })),

  // Lifecycle hooks
  withHooks({
    onInit(store): void {
      // Load initial data when store is initialized
      store.loadCustomers();
      store.loadInvoices();
      store.loadProducts();
    },

    onDestroy(): void {
      // Cleanup if needed (rxMethod handles subscription cleanup automatically)
    },
  })
);
