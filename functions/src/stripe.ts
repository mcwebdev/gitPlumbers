import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { getFirestore } from 'firebase-admin/firestore';
import Stripe from 'stripe';
import cors = require('cors');
import * as logger from 'firebase-functions/logger';

const corsHandler = cors({ origin: true });

// Secrets
const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');

const db = getFirestore();

// Add this at the top after imports
interface CreateCustomerData {
  name: string;
  email: string;
}

interface CreateProductData {
  name: string;
  description?: string;
}

interface CreatePriceData {
  product: string;
  unit_amount: number;
  currency: string;
}

interface CreateInvoiceData {
  customer: string;
  description?: string;
  days_until_due?: number;
}

interface AddInvoiceItemData {
  customer: string;
  price_data: {
    currency: string;
    product: string;
    unit_amount: number;
  };
  invoice: string;
  quantity?: number;
}

interface FinalizeInvoiceData {
  invoice: string;
}

// HTTP Request: List Invoices
export const listStripeInvoices = onRequest({ secrets: [STRIPE_SECRET_KEY] }, (req, res) => {
  corsHandler(req, res, async () => {
    logger.info('listStripeInvoices: Received request', { body: req.body });
    try {
      const { customer, limit = 10, starting_after } = req.body;
      const stripeKey = STRIPE_SECRET_KEY.value();
      logger.info(`CONFIRMATION LOG: Using Stripe key ending in '...${stripeKey.slice(-4)}'`);

      const stripe = new Stripe(stripeKey);
      const invoices = await stripe.invoices.list({
        customer: customer as string | undefined,
        limit: Number(limit),
        starting_after: starting_after as string | undefined,
      });

      if (invoices.data.length > 0) {
        logger.info(`listStripeInvoices: First invoice livemode: ${invoices.data[0].livemode}. If false, you are in Stripe TEST mode.`);
      }
      logger.info(`listStripeInvoices: Found ${invoices.data.length} invoices from Stripe.`);
      res.status(200).json(invoices.data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('listStripeInvoices: Error listing invoices', { error: message });
      res.status(500).send(`Failed to list invoices: ${message}`);
    }
  });
});

// HTTP Request: List Customers
export const listStripeCustomers = onRequest({ secrets: [STRIPE_SECRET_KEY] }, (req, res) => {
  corsHandler(req, res, async () => {
    logger.info('listStripeCustomers: Received request', { body: req.body });
    try {
      const { email, limit = 10 } = req.body;
      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      const customers = await stripe.customers.list({
        email: email as string | undefined,
        limit: Number(limit),
      });
      logger.info(`listStripeCustomers: Found ${customers.data.length} customers from Stripe.`);
      res.status(200).json(customers.data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('listStripeCustomers: Error listing customers', { error: message });
      res.status(500).send(`Failed to list customers: ${message}`);
    }
  });
});

// HTTP Request: Retrieve Single Customer
export const retrieveStripeCustomer = onRequest({ secrets: [STRIPE_SECRET_KEY] }, (req, res) => {
  corsHandler(req, res, async () => {
    logger.info('retrieveStripeCustomer: Received request', { body: req.body });
    try {
      const { customerId } = req.body;
      if (!customerId) {
        logger.warn('retrieveStripeCustomer: Bad request - Customer ID is required.');
        res.status(400).send('Customer ID is required');
        return;
      }
      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      const customer = await stripe.customers.retrieve(customerId as string);
      if (customer.deleted) {
        logger.info(`retrieveStripeCustomer: Customer ${customerId} was deleted.`);
        res.status(404).send('Customer not found or deleted');
        return;
      }
      logger.info(`retrieveStripeCustomer: Retrieved customer ${customerId}.`);
      res.status(200).json(customer);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      if (message.includes('No such customer')) {
        logger.warn(`retrieveStripeCustomer: Customer not found - ${message}`);
        res.status(404).send(`Customer not found: ${message}`);
      } else {
        logger.error('retrieveStripeCustomer: Error retrieving customer', { error: message });
        res.status(500).send(`Failed to retrieve customer: ${message}`);
      }
    }
  });
});

// HTTP Request: List Products
export const listStripeProducts = onRequest({ secrets: [STRIPE_SECRET_KEY] }, (req, res) => {
  corsHandler(req, res, async () => {
    logger.info('listStripeProducts: Received request', { body: req.body });
    try {
      const { limit = 100 } = req.body;
      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      const products = await stripe.products.list({ limit: Number(limit) });
      logger.info(`listStripeProducts: Found ${products.data.length} products from Stripe.`);
      res.status(200).json(products.data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('listStripeProducts: Error listing products', { error: message });
      res.status(500).send(`Failed to list products: ${message}`);
    }
  });
});

// HTTP Request: List Prices
export const listStripePrices = onRequest({ secrets: [STRIPE_SECRET_KEY] }, (req, res) => {
  corsHandler(req, res, async () => {
    logger.info('listStripePrices: Received request', { body: req.body });
    try {
      const { product, limit = 100 } = req.body;
      if (!product) {
        logger.warn('listStripePrices: Bad request - Product ID is required.');
        res.status(400).send('Product ID is required');
        return;
      }
      const stripe = new Stripe(STRIPE_SECRET_KEY.value());
      const prices = await stripe.prices.list({
        product: product as string,
        limit: Number(limit),
      });
      logger.info(`listStripePrices: Found ${prices.data.length} prices for product ${product}.`);
      res.status(200).json(prices.data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('listStripePrices: Error listing prices', { error: message });
      res.status(500).send(`Failed to list prices: ${message}`);
    }
  });
});

export const cleanupAllInvoicesDryRun = onRequest({ secrets: [STRIPE_SECRET_KEY] }, async (req, res) => {
  logger.info('cleanupAllInvoicesDryRun: Received request');
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const invoicesToDelete: string[] = [];
    const invoicesToVoid: string[] = [];
    const invoicesThatCannotBeRemoved: { id: string, status: string }[] = [];

    let hasMore = true;
    let startingAfter: string | undefined = undefined;

    while (hasMore) {
      const invoices: Stripe.ApiList<Stripe.Invoice> = await stripe.invoices.list({
        limit: 100,
        starting_after: startingAfter,
      });

      if (invoices.data.length === 0) {
        hasMore = false;
        break;
      }

      for (const invoice of invoices.data) {
        if (!invoice.id || !invoice.status) {
          logger.warn('Skipping invoice with missing ID or status.', { invoice });
          continue;
        }

        if (invoice.status === 'draft') {
          invoicesToDelete.push(invoice.id);
        } else if (invoice.status === 'open') {
          invoicesToVoid.push(invoice.id);
        } else {
          invoicesThatCannotBeRemoved.push({ id: invoice.id, status: invoice.status });
        }
      }

      startingAfter = invoices.data[invoices.data.length - 1].id;
      hasMore = invoices.has_more;
    }

    logger.info('--- INVOICE CLEANUP DRY RUN ---');
    logger.info(`Found ${invoicesToDelete.length} DRAFT invoices to DELETE:`, invoicesToDelete);
    logger.info(`Found ${invoicesToVoid.length} OPEN invoices to VOID:`, invoicesToVoid);
    logger.info(`Found ${invoicesThatCannotBeRemoved.length} invoices that CANNOT BE REMOVED (paid, voided, etc.):`, invoicesThatCannotBeRemoved);
    
    res.status(200).json({
      summary: 'Dry run complete. Check logs for details.',
      invoicesToDelete,
      invoicesToVoid,
      invoicesThatCannotBeRemoved,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('cleanupAllInvoicesDryRun: Error during dry run', { error: message });
    res.status(500).send(`Failed to perform dry run: ${message}`);
  }
});


// Callable: Create Customer
export const createStripeCustomer = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');

  const data = request.data as CreateCustomerData;
  const { name, email } = data;
  if (!name) throw new HttpsError('invalid-argument', 'Name is required');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError('invalid-argument', 'Valid email is required');

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const customer = await stripe.customers.create({ name, email });

    await db.collection('customers').doc(customer.id).set({
      stripeCustomerId: customer.id,
      name,
      email,
      createdAt: customer.created,
      userId: request.auth.uid,
    });

    return { success: true, customer };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpsError('internal', `Failed to create customer: ${message}`);
  }
});

// Callable: Create Product
export const createStripeProduct = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');

  const data = request.data as CreateProductData;
  const { name, description } = data;
  if (!name) throw new HttpsError('invalid-argument', 'Name is required');

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const product = await stripe.products.create({ name, description });
    return { success: true, product };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpsError('internal', `Failed to create product: ${message}`);
  }
});

// Callable: Create Price
export const createStripePrice = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');

  const data = request.data as CreatePriceData;
  const { product, unit_amount, currency } = data;
  if (!product || !unit_amount || !currency) throw new HttpsError('invalid-argument', 'Product ID, unit amount, and currency required');

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const price = await stripe.prices.create({ product, unit_amount, currency });
    return { success: true, price };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpsError('internal', `Failed to create price: ${message}`);
  }
});

// Callable: Create Invoice
export const createStripeInvoice = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');

  const data = request.data as CreateInvoiceData;
  const { customer, description, days_until_due } = data;
  if (!customer) throw new HttpsError('invalid-argument', 'Customer ID required');

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const invoice = await stripe.invoices.create({ customer, description, collection_method: 'send_invoice', days_until_due });

    await db.collection('invoices').doc(invoice.id!).set({
      stripeInvoiceId: invoice.id,
      customerId: customer,
      status: invoice.status,
      amount: invoice.amount_due,
      createdAt: invoice.created,
      userId: request.auth.uid,
    });

    return { success: true, invoice };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpsError('internal', `Failed to create invoice: ${message}`);
  }
});

// Callable: Add Invoice Item
export const addStripeInvoiceItem = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');

  const data = request.data as AddInvoiceItemData;
  const { customer, price_data, invoice, quantity = 1 } = data;
  if (!customer || !price_data || !invoice) throw new HttpsError('invalid-argument', 'Customer, price_data, and invoice ID required');

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    await stripe.invoiceItems.create({
      customer,
      price_data,
      invoice,
      quantity
    });

    const updatedInvoice = await stripe.invoices.retrieve(invoice);
    await db.collection('invoices').doc(invoice).update({
      amount: updatedInvoice.amount_due,
      status: updatedInvoice.status,
    });

    return { success: true, updatedInvoice };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpsError('internal', `Failed to add invoice item: ${message}`);
  }
});

// Callable: Delete Invoice
export const deleteStripeInvoice = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');

  const data = request.data as { invoiceId: string };
  const { invoiceId } = data;
  if (!invoiceId) throw new HttpsError('invalid-argument', 'Invoice ID required');

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());

    // First, get the invoice to check its status
    const invoice = await stripe.invoices.retrieve(invoiceId);

    // If it's a draft, we can delete it directly
    if (invoice.status === 'draft') {
      const deleted = await stripe.invoices.del(invoiceId);
      return { success: true, deleted: deleted.deleted };
    }

    // For non-draft invoices, void them instead
    // Voiding marks the invoice as uncollectible and closes it
    const voided = await stripe.invoices.voidInvoice(invoiceId);
    return { success: true, deleted: true, voided: true, invoice: voided };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpsError('internal', `Failed to delete invoice: ${message}`);
  }
});

// Callable: Finalize and Send Invoice
export const finalizeAndSendStripeInvoice = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Authentication required');

  const data = request.data as FinalizeInvoiceData;
  const { invoice } = data;
  if (!invoice) throw new HttpsError('invalid-argument', 'Invoice ID required');

  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    const finalized = await stripe.invoices.finalizeInvoice(invoice);
    const sent = await stripe.invoices.sendInvoice(finalized.id!);

    await db.collection('invoices').doc(sent.id!).update({
      status: sent.status,
      pdf: sent.hosted_invoice_url,
    });

    return { success: true, invoice: sent };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new HttpsError('internal', `Failed to finalize/send invoice: ${message}`);
  }
});

// Webhook Handler
export const stripeWebhook = onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    res.status(400).send('Missing stripe-signature header');
    return;
  }
  let event;
  try {
    const stripe = new Stripe(STRIPE_SECRET_KEY.value());
    event = stripe.webhooks.constructEvent(req.rawBody, sig as string | string[], STRIPE_WEBHOOK_SECRET.value());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(400).send(`Webhook Error: ${message}`);
    return;
  }

  // Handle invoice events (all selected events start with 'invoice.')
  if (event.type.startsWith('invoice.')) {
    const invoice = event.data.object as Stripe.Invoice;
    if (!invoice.id) {
      console.error('Received invoice event without ID:', event.type);
      res.json({ received: true });
      return;
    }

    // Base update for all invoice events
    await db.collection('invoices').doc(invoice.id).update({
      status: invoice.status,
      amount_paid: invoice.amount_paid,
      updatedAt: event.created,
    });

    // Specific handling for each event (add custom logic here, e.g., notifications)
    switch (event.type) {
      case 'invoice.created':
        // Occurs whenever a new invoice is created. (e.g., send initial notification)
        console.log(`New invoice created: ${invoice.id}`);
        // TODO: Add email notification to customer
        break;
      case 'invoice.deleted':
        // Occurs whenever a draft invoice is deleted.
        console.log(`Invoice deleted: ${invoice.id}`);
        // TODO: Remove from Firestore if needed
        break;
      case 'invoice.finalization_failed':
        // Occurs whenever a draft invoice cannot be finalized.
        console.log(`Invoice finalization failed: ${invoice.id}`);
        // TODO: Notify admin
        break;
      case 'invoice.finalized':
        // Occurs whenever a draft invoice is finalized and updated to be an open invoice.
        console.log(`Invoice finalized: ${invoice.id}`);
        break;
      case 'invoice.marked_uncollectible':
        // Occurs whenever an invoice is marked uncollectible.
        console.log(`Invoice marked uncollectible: ${invoice.id}`);
        break;
      case 'invoice.overdue':
        // Occurs X number of days after an invoice becomes due—where X is determined by Automations.
        console.log(`Invoice overdue: ${invoice.id}`);
        // TODO: Send reminder email
        break;
      case 'invoice.paid':
        // Occurs when an invoice transitions to paid with a non-zero amount_overpaid.
        // Also covers 'invoice.payment_succeeded'
        console.log(`Invoice paid: ${invoice.id}`);
        // TODO: Send confirmation email and update user dashboard
        break;
      case 'invoice.payment_action_required':
        // Occurs whenever an invoice payment attempt requires further user action to complete.
        console.log(`Payment action required for invoice: ${invoice.id}`);
        // TODO: Notify customer
        break;
      case 'invoice.payment_failed':
        // Occurs whenever an invoice payment attempt fails.
        console.log(`Payment failed for invoice: ${invoice.id}`);
        // TODO: Notify customer and admin
        break;
      case 'invoice.sent':
        // Occurs whenever an invoice email is sent out.
        console.log(`Invoice sent: ${invoice.id}`);
        break;
      case 'invoice.upcoming':
        // Occurs X number of days before a subscription is scheduled to create an invoice.
        console.log(`Upcoming invoice: ${invoice.id}`);
        break;
      case 'invoice.updated':
        // Occurs whenever an invoice changes (e.g., the invoice amount).
        console.log(`Invoice updated: ${invoice.id}`);
        break;
      case 'invoice.voided':
        // Occurs whenever an invoice is voided.
        console.log(`Invoice voided: ${invoice.id}`);
        break;
      case 'invoice.will_be_due':
        // Occurs X number of days before an invoice becomes due—where X is determined by Automations.
        console.log(`Invoice will be due soon: ${invoice.id}`);
        // TODO: Send pre-due reminder
        break;
      default:
        console.log(`Unhandled invoice event: ${event.type} for ${invoice.id}`);
    }
  }

  res.json({ received: true });
});
