/**
 * Stripe entity interfaces for type safety
 * Based on Stripe API documentation and MCP tool responses
 */

export interface StripeCustomer {
  id: string;
  object: 'customer';
  created: number;
  email?: string;
  name?: string;
  phone?: string;
  description?: string;
  metadata: Record<string, string>;
  default_source?: string;
  invoice_prefix?: string;
  preferred_locales?: string[];
  tax_exempt?: 'none' | 'exempt' | 'reverse';
}

export interface StripeProduct {
  id: string;
  object: 'product';
  active: boolean;
  created: number;
  description?: string;
  images: string[];
  name: string;
  metadata: Record<string, string>;
  package_dimensions?: {
    height: number;
    length: number;
    weight: number;
    width: number;
  };
  shippable?: boolean;
  statement_descriptor?: string;
  tax_code?: string;
  unit_label?: string;
  updated: number;
  url?: string;
}

export interface StripePrice {
  id: string;
  object: 'price';
  active: boolean;
  billing_scheme: 'per_unit' | 'tiered';
  created: number;
  currency: string;
  metadata: Record<string, string>;
  nickname?: string;
  product: string | StripeProduct;
  recurring?: {
    aggregate_usage?: 'sum' | 'last_during_period' | 'last_ever' | 'max';
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count: number;
    trial_period_days?: number;
    usage_type?: 'licensed' | 'metered';
  };
  tax_behavior?: 'exclusive' | 'inclusive' | 'unspecified';
  tiers_mode?: 'graduated' | 'volume';
  transform_quantity?: {
    divide_by: number;
    round: 'up' | 'down';
  };
  type: 'one_time' | 'recurring';
  unit_amount?: number;
  unit_amount_decimal?: string;
}

export interface StripeInvoiceItem {
  id: string;
  object: 'invoiceitem';
  amount: number;
  currency: string;
  customer: string;
  date: number;
  description?: string;
  discountable: boolean;
  invoice?: string;
  metadata: Record<string, string>;
  period: {
    end: number;
    start: number;
  };
  price?: StripePrice;
  proration: boolean;
  quantity: number;
  subscription?: string;
  tax_rates: string[];
  unit_amount?: number;
  unit_amount_decimal?: string;
}

export interface StripeInvoice {
  id: string;
  object: 'invoice';
  account_country?: string;
  account_name?: string;
  account_tax_ids?: string[];
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  application_fee_amount?: number;
  attempt_count: number;
  attempted: boolean;
  auto_advance?: boolean;
  billing_reason?: string;
  charge?: string;
  collection_method: 'charge_automatically' | 'send_invoice';
  created: number;
  currency: string;
  custom_fields?: Array<{
    name: string;
    value: string;
  }>;
  customer: string | StripeCustomer;
  customer_address?: {
    city?: string;
    country?: string;
    line1?: string;
    line2?: string;
    postal_code?: string;
    state?: string;
  };
  customer_email?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_shipping?: {
    address: {
      city?: string;
      country?: string;
      line1?: string;
      line2?: string;
      postal_code?: string;
      state?: string;
    };
    name: string;
    phone?: string;
  };
  customer_tax_exempt?: 'none' | 'exempt' | 'reverse';
  customer_tax_ids?: Array<{
    type: string;
    value: string;
  }>;
  default_payment_method?: string;
  default_source?: string;
  default_tax_rates: string[];
  description?: string;
  discount?: {
    coupon: {
      id: string;
      percent_off?: number;
      amount_off?: number;
    };
    customer?: string;
    end?: number;
    start: number;
    subscription?: string;
  };
  discounts: string[];
  due_date?: number;
  ending_balance?: number;
  footer?: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  last_finalization_error?: {
    code: string;
    message: string;
    type: string;
  };
  lines: {
    object: 'list';
    data: StripeInvoiceItem[];
    has_more: boolean;
    total_count: number;
    url: string;
  };
  livemode: boolean;
  metadata: Record<string, string>;
  next_payment_attempt?: number;
  number?: string;
  on_behalf_of?: string;
  paid: boolean;
  payment_intent?: string;
  payment_settings: {
    payment_method_options?: Record<string, unknown>;
    payment_method_types?: string[];
  };
  period_end: number;
  period_start: number;
  post_payment_credit_notes_amount: number;
  pre_payment_credit_notes_amount: number;
  quote?: string;
  receipt_number?: string;
  starting_balance: number;
  statement_descriptor?: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';
  status_transitions: {
    finalized_at?: number;
    marked_uncollectible_at?: number;
    paid_at?: number;
    voided_at?: number;
  };
  subscription?: string;
  subtotal: number;
  tax?: number;
  total: number;
  total_discount_amounts: Array<{
    amount: number;
    discount: string;
  }>;
  total_tax_amounts: Array<{
    amount: number;
    inclusive: boolean;
    tax_rate: string;
  }>;
  transfer_data?: {
    amount?: number;
    destination: string;
  };
  webhooks_delivered_at?: number;
}

export interface StripePaymentLink {
  id: string;
  object: 'payment_link';
  active: boolean;
  after_completion: {
    hosted_confirmation?: {
      custom_message?: string;
    };
    redirect?: {
      url: string;
    };
    type: 'hosted_confirmation' | 'redirect';
  };
  allow_promotion_codes: boolean;
  application_fee_amount?: number;
  application_fee_percent?: number;
  automatic_tax: {
    enabled: boolean;
  };
  billing_address_collection: 'auto' | 'required';
  created: number;
  currency: string;
  line_items: {
    object: 'list';
    data: Array<{
      id: string;
      object: 'item';
      adjustable_quantity?: {
        enabled: boolean;
        maximum?: number;
        minimum?: number;
      };
      price: StripePrice;
      quantity: number;
    }>;
    has_more: boolean;
    total_count: number;
    url: string;
  };
  livemode: boolean;
  metadata: Record<string, string>;
  on_behalf_of?: string;
  payment_method_collection: 'always' | 'if_required';
  payment_method_types?: string[];
  phone_number_collection: {
    enabled: boolean;
  };
  shipping_address_collection?: {
    allowed_countries: string[];
  };
  shipping_options: Array<{
    shipping_rate: string;
  }>;
  submit_type?: 'auto' | 'book' | 'donate' | 'pay';
  subscription_data?: {
    trial_period_days?: number;
  };
  tax_id_collection: {
    enabled: boolean;
  };
  transfer_data?: {
    amount?: number;
    destination: string;
  };
  url: string;
}

export interface StripeCoupon {
  id: string;
  object: 'coupon';
  amount_off?: number;
  created: number;
  currency?: string;
  duration: 'forever' | 'once' | 'repeating';
  duration_in_months?: number;
  livemode: boolean;
  max_redemptions?: number;
  metadata: Record<string, string>;
  name?: string;
  percent_off?: number;
  redeem_by?: number;
  times_redeemed: number;
  valid: boolean;
}

// Request/Response types for MCP operations
export interface CreateCustomerRequest {
  name: string;
  email?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreatePriceRequest {
  product: string;
  unit_amount: number;
  currency: string;
  recurring?: {
    interval: 'day' | 'week' | 'month' | 'year';
    interval_count?: number;
  };
  metadata?: Record<string, string>;
}

export interface CreateInvoiceRequest {
  customer: string;
  description?: string;
  metadata?: Record<string, string>;
  days_until_due?: number;
  auto_advance?: boolean;
  collection_method?: 'charge_automatically' | 'send_invoice';
}

export interface CreateInvoiceItemRequest {
  customer: string;
  price_data: {
    currency: string;
    product: string;
    unit_amount: number;
  };
  invoice: string;
  quantity?: number;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreatePaymentLinkRequest {
  price: string;
  quantity: number;
  metadata?: Record<string, string>;
}

export interface CreateCouponRequest {
  name: string;
  percent_off?: number;
  amount_off?: number;
  currency?: string;
  duration: 'forever' | 'once' | 'repeating';
  duration_in_months?: number;
  metadata?: Record<string, string>;
}

// Local application interfaces
export interface InvoiceFormData {
  customerId?: string;
  customerName: string;
  customerEmail: string;
  description: string;
  daysUntilDue: number;
  items: InvoiceItemFormData[];
  metadata?: Record<string, string>;
}

export interface InvoiceItemFormData {
  productName: string;
  description: string;
  unitAmount: number;
  quantity: number;
  currency: string;
}

export interface InvoiceListFilters {
  customerId?: string;
  status?: StripeInvoice['status'];
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}

export interface CustomerListFilters {
  email?: string;
  limit?: number;
  startingAfter?: string;
  endingBefore?: string;
}
