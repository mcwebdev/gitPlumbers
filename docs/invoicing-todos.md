# Invoicing Feature TODOs

This document lists all remaining tasks and improvements needed to fully implement the invoicing system where admins can create/send invoices to users (customers), and users can view them on their dashboard. Based on a review of changed files (functions/src/stripe.ts, src/app/shared/services/invoice.service.ts, functions/src/index.ts, and related components/stores).

## High-Priority TODOs (Required for Basic Functionality)
1. **Implement User Dashboard Invoice Display**:
   - In `src/app/features/dashboard/user-dashboard.component.ts` and `.html`: Add logic to fetch and display invoices for the current user.
     - Use `InvoiceStore.loadInvoices()` with filters for the user's Stripe customer ID (from auth profile).
     - Display list of invoices with status, amount, due date, and payment links.
     - Handle real-time updates (e.g., via Firestore subscriptions) for when webhooks update invoice status.

2. **Link Users to Stripe Customers**:
   - Ensure every user has a Stripe customer ID stored in their profile (Firestore or auth metadata).
     - On user signup or first invoice, automatically create a Stripe customer and save the ID.
     - Update `onUserSelect` in admin component to handle this if not already.

3. **Implement createPaymentLink**:
   - In `invoice.service.ts`: Add callable to `createStripePaymentLink` (add matching function in stripe.ts if missing).
     - In admin component: Generate and display/share payment links for open invoices.

4. **Filter Invoices by User/Customer**:
   - In `InvoiceStore`: Add methods to load invoices filtered by customer ID for user-specific views.
     - Update `loadInvoices` to accept customer ID and use it in the callable params.

5. **Handle Invoice Items Properly**:
   - In admin form submission (`onSubmitInvoice`): After creating invoice, loop through form items and call `createInvoiceItem` for each.
     - Update `createInvoiceItem` to return the updated invoice and handle multiple items.

## Medium-Priority TODOs (For Better UX and Reliability)
1. **Webhook Enhancements** (from stripe.ts comments):
   - `invoice.created`: Send initial notification/email to customer.
   - `invoice.deleted`: Remove invoice from Firestore.
   - `invoice.finalization_failed`: Notify admin of failure.
   - `invoice.paid` / `invoice.payment_succeeded`: Send confirmation email, update user dashboard.
   - `invoice.payment_failed`: Notify customer/admin, perhaps retry logic.
   - `invoice.overdue` / `invoice.will_be_due`: Send reminder emails.
   - Add email sending (integrate with SendGrid or Firebase email triggers).

2. **Error Handling and Logging**:
   - In all service methods: Add more specific error messages and logging to Firebase.
   - In components: Show user-friendly errors (e.g., if customer creation fails during invoice process).

3. **Testing**:
   - Test full flow: Admin creates invoice → Finalizes/sends → Webhook updates on payment → User sees updated status.
   - Use Stripe test mode: Create test customers/invoices, simulate payments via Stripe CLI or dashboard.
   - Check Firestore security rules for invoices collection (ensure users can only read their own).

4. **Security**:
   - Add auth checks in Cloud Functions (e.g., ensure only admins can call createInvoice).
   - Validate metadata (e.g., userId) in webhooks to prevent tampering.

## Low-Priority TODOs (Nice-to-Haves)
1. **Recurring Invoices/Subcriptions**: If needed, add support for recurring prices.
2. **PDF Generation**: Generate/download invoice PDFs from Stripe.
3. **Analytics**: Track invoice metrics in admin dashboard.
4. **Internationalization**: Support multiple currencies in forms.

## Status Check
- **Admin Can Create Invoice**: Mostly yes (form exists, callables wired), but needs multi-item support and customer linking.
- **User Sees Invoice on Dashboard**: No—dashboard doesn't query/display invoices yet.
- **Webhook Updates**: Yes, basic status updates work; expand for notifications.

Track progress by checking off items as completed. If new TODOs arise, add them here.
