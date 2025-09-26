import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import {
  StripeCustomer,
  StripeProduct,
  StripePrice,
  StripeInvoice,
  StripeInvoiceItem,
  CreateCustomerRequest,
  CreateProductRequest,
  CreatePriceRequest,
  CreateInvoiceRequest,
  CreateInvoiceItemRequest,
  InvoiceListFilters,
  CustomerListFilters,
  CreatePaymentLinkRequest,
  StripePaymentLink,
  InvoiceFormData,
  InvoiceItemFormData,
} from '../models/stripe.interface';
// CHANGE: Import from @angular/fire/functions instead of firebase/functions
import { Functions, httpsCallable } from '@angular/fire/functions';

// Add response interfaces
interface CreateCustomerResponse {
  success: boolean;
  customer: StripeCustomer;
}

interface CreateProductResponse {
  success: boolean;
  product: StripeProduct;
}

interface CreatePriceResponse {
  success: boolean;
  price: StripePrice;
}

interface CreateInvoiceResponse {
  success: boolean;
  invoice: StripeInvoice;
}

interface AddInvoiceItemResponse {
  success: boolean;
}

interface FinalizeInvoiceResponse {
  success: boolean;
  invoice: StripeInvoice;
}

// For list responses, assuming they return arrays directly
interface ListInvoicesResponse {
  data: StripeInvoice[];
}

interface ListCustomersResponse {
  data: StripeCustomer[];
}

interface ListProductsResponse {
  data: StripeProduct[];
}

interface ListPricesResponse {
  data: StripePrice[];
}

@Injectable({ providedIn: 'root' })
export class InvoiceService {

  private readonly functions = inject(Functions);
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'https://us-central1-gitplumbers-35d92.cloudfunctions.net';

  // Validation helper
  private validateRequired(value: any, field: string): void {
    if (!value) {
      throw new Error(`${field} is required`);
    }
  }

  calculateInvoiceTotals(invoices: StripeInvoice[]): { count: number; totalAmount: number; paidAmount: number; outstandingAmount: number } {
    if (!Array.isArray(invoices)) {
      console.warn('calculateInvoiceTotals received non-array input, returning zeroed stats.', invoices);
      return { count: 0, totalAmount: 0, paidAmount: 0, outstandingAmount: 0 };
    }

    return {
      count: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.total, 0),
      paidAmount: invoices.reduce((sum, inv) => sum + inv.amount_paid, 0),
      outstandingAmount: invoices.reduce((sum, inv) => sum + inv.amount_remaining, 0)
    };
  }

  transformInvoiceListFilters(filters: InvoiceListFilters): { customer?: string; limit?: number; startingAfter?: string } {
    // For now, simple transform; add validation
    return {
      customer: filters.customerId,
      limit: filters.limit || 10,
      startingAfter: filters.startingAfter,
    };
  }

  transformCustomerListFilters(filters: CustomerListFilters): { email?: string; limit?: number } {
    return {
      email: filters.email,
      limit: filters.limit || 10
    };
  }

  transformCustomerData(data: CreateCustomerRequest): CreateCustomerRequest {
    this.validateRequired(data.name, 'name');
    return data;
  }

  transformProductData(data: CreateProductRequest): CreateProductRequest {
    this.validateRequired(data.name, 'name');
    return data;
  }

  transformPriceData(data: CreatePriceRequest): CreatePriceRequest {
    this.validateRequired(data.product, 'product');
    this.validateRequired(data.unit_amount, 'unit_amount');
    this.validateRequired(data.currency, 'currency');
    return data;
  }

  transformInvoiceData(data: CreateInvoiceRequest): CreateInvoiceRequest {
    this.validateRequired(data.customer, 'customer');
    return data;
  }

  transformInvoiceItemData(data: CreateInvoiceItemRequest): CreateInvoiceItemRequest {
    this.validateRequired(data.customer, 'customer');
    this.validateRequired(data.price, 'price');
    this.validateRequired(data.invoice, 'invoice');
    return data;
  }

  transformPaymentLinkData(data: CreatePaymentLinkRequest): CreatePaymentLinkRequest {
    this.validateRequired(data.price, 'price');
    this.validateRequired(data.quantity, 'quantity');
    return data;
  }

  // TODO: Implement actual API calls to backend for Stripe operations

  async listInvoices(params: { customer?: string; limit?: number; starting_after?: string }): Promise<StripeInvoice[]> {
    console.log('InvoiceService: listInvoices called with:', params);
    try {
      const url = `${this.baseUrl}/listStripeInvoices`;
      const result = await lastValueFrom(this.http.post<StripeInvoice[]>(url, params));
      console.log('InvoiceService: listInvoices received:', result);
      return result;
    } catch (error: any) {
      console.error('InvoiceService: Failed to list invoices', error);
      throw new Error(`Failed to load invoices: ${error.message}`);
    }
  }

  async listCustomers(params: { email?: string; limit?: number }): Promise<StripeCustomer[]> {
    console.log('InvoiceService: listCustomers called with:', params);
    try {
      const url = `${this.baseUrl}/listStripeCustomers`;
      const result = await lastValueFrom(this.http.post<StripeCustomer[]>(url, params));
      console.log('InvoiceService: listCustomers received:', result);
      return result;
    } catch (error: any) {
      console.error('InvoiceService: Failed to list customers', error);
      throw new Error(`Failed to load customers: ${error.message}`);
    }
  }

  async listProducts(params: { limit?: number }): Promise<StripeProduct[]> {
    console.log('InvoiceService: listProducts called with:', params);
    try {
      const url = `${this.baseUrl}/listStripeProducts`;
      const result = await lastValueFrom(this.http.post<StripeProduct[]>(url, params));
      console.log('InvoiceService: listProducts received:', result);
      return result;
    } catch (error: any) {
      console.error('InvoiceService: Failed to list products', error);
      throw new Error(`Failed to load products: ${error.message}`);
    }
  }

  async listPrices(params: { product?: string; limit?: number }): Promise<StripePrice[]> {
    console.log('InvoiceService: listPrices called with:', params);
    if (!params.product) {
      console.warn('InvoiceService: listPrices called without a product. Returning empty array.');
      return [];
    }
    try {
      const url = `${this.baseUrl}/listStripePrices`;
      const result = await lastValueFrom(this.http.post<StripePrice[]>(url, params));
      console.log('InvoiceService: listPrices received:', result);
      return result;
    } catch (error: any) {
      console.error('InvoiceService: Failed to list prices', error);
      throw new Error(`Failed to load prices: ${error.message}`);
    }
  }

  async createFullInvoice(formData: InvoiceFormData): Promise<StripeInvoice> {
    console.log('InvoiceService: Starting full invoice creation', { formData });
    
    if (!formData.customerId) {
      throw new Error('Customer ID is required to create a full invoice.');
    }
    const customerId = formData.customerId;
    
    // 2. Create Products and Prices for each invoice item
    const priceIds = await Promise.all(
      formData.items.map(async (item: InvoiceItemFormData) => {
        // Create Product
        const product = await this.createProduct({ name: item.productName, description: item.description });
        console.log('InvoiceService: Created product', { product });
        
        // Create Price
        const price = await this.createPrice({
          product: product.id,
          unit_amount: item.unitAmount * 100, // Convert to cents
          currency: item.currency
        });
        console.log('InvoiceService: Created price', { price });
        
        return { priceId: price.id, quantity: item.quantity };
      })
    );
      
    // 3. Create the initial draft invoice
    const draftInvoice = await this.createInvoice({
      customer: customerId,
      description: formData.description,
      days_until_due: formData.daysUntilDue,
    });
    console.log('InvoiceService: Created draft invoice', { draftInvoice });
    
    // 4. Add items to the invoice
    for (const item of priceIds) {
      await this.createInvoiceItem({
        customer: customerId,
        invoice: draftInvoice.id,
        price: item.priceId,
        quantity: item.quantity,
      });
    }
    console.log('InvoiceService: Added all items to invoice');
      
    // 5. Finalize the invoice
    const finalizedInvoice = await this.finalizeInvoice({ invoice: draftInvoice.id });
    console.log('InvoiceService: Finalized invoice', { finalizedInvoice });
    
    return finalizedInvoice;
  }

  async createCustomer(params: { name: string; email?: string; description?: string; metadata?: Record<string, string> }): Promise<StripeCustomer> {
    const createCustomerCallable = httpsCallable<{ name: string; email?: string; description?: string; metadata?: Record<string, string> }, CreateCustomerResponse>(this.functions, 'createStripeCustomer');
    try {
      const result = await createCustomerCallable(params);
      return result.data.customer;
    } catch (error: any) {
      throw new Error(`Failed to create customer: ${error.message}`);
    }
  }

  async createProduct(params: { name: string; description?: string }): Promise<StripeProduct> {
    const createProductCallable = httpsCallable<{ name: string; description?: string }, CreateProductResponse>(this.functions, 'createStripeProduct');
    try {
      const result = await createProductCallable(params);
      return result.data.product;
    } catch (error: any) {
      throw new Error(`Failed to create product: ${error.message}`);
    }
  }

  async createPrice(params: { product: string; unit_amount: number; currency: string; recurring?: { interval: string; interval_count?: number } }): Promise<StripePrice> {
    const createPriceCallable = httpsCallable<typeof params, CreatePriceResponse>(this.functions, 'createStripePrice');
    try {
      const result = await createPriceCallable(params);
      return result.data.price;
    } catch (error: any) {
      throw new Error(`Failed to create price: ${error.message}`);
    }
  }

  async createInvoice(params: { customer: string; description?: string; days_until_due?: number }): Promise<StripeInvoice> {
    const createInvoiceCallable = httpsCallable<typeof params, CreateInvoiceResponse>(this.functions, 'createStripeInvoice');
    try {
      const result = await createInvoiceCallable(params);
      return result.data.invoice;
    } catch (error: any) {
      throw new Error(`Failed to create invoice: ${error.message}`);
    }
  }

  async createInvoiceItem(params: { customer: string; price: string; invoice: string; quantity?: number }): Promise<StripeInvoice> {
    const addItemCallable = httpsCallable<typeof params, { success: boolean, updatedInvoice: StripeInvoice }>(this.functions, 'addStripeInvoiceItem');
    try {
      const result = await addItemCallable(params);
      if (!result.data.success || !result.data.updatedInvoice) {
        throw new Error('Backend failed to add item or return updated invoice.');
      }
      return result.data.updatedInvoice;
    } catch (error: any) {
      throw new Error(`Failed to add invoice item: ${error.message}`);
    }
  }

  async finalizeInvoice(params: { invoice: string }): Promise<StripeInvoice> {
    const finalizeCallable = httpsCallable<typeof params, FinalizeInvoiceResponse>(this.functions, 'finalizeAndSendStripeInvoice');
    try {
      const result = await finalizeCallable(params);
      return result.data.invoice;
    } catch (error: any) {
      throw new Error(`Failed to finalize invoice: ${error.message}`);
    }
  }

  async createPaymentLink(params: { price: string; quantity: number }): Promise<StripePaymentLink> {
    // Assuming there's a callable for this, but in stripe.ts it's not there. Add if needed.
    throw new Error('Not implemented');
  }

  getInvoiceStatusSeverity(status: string): 'success' | 'info' | 'warning' | 'danger' {
    const severityMap: Record<string, 'success' | 'info' | 'warning' | 'danger'> = {
      'draft': 'info',
      'open': 'warning',
      'paid': 'success',
      'uncollectible': 'danger',
      'void': 'info'
    };
    return severityMap[status] || 'info';
  }

  formatCurrencyAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100); // Assuming amount is in minor units
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

}
