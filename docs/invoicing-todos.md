# Invoicing System TODOs

Comprehensive backlog compiled from the current repo state (`functions/src/stripe.ts`, admin/user invoice dashboards, store/service layers) and from observed failures during manual testing.

## 1. Core Invoice Flow (blocking)
- [ ] **Fix draft visibility**: user dashboard should only render invoices where `status === 'open'` (or `paid`). Drafts must remain admin-only until finalized.
- [ ] **Guarantee line-item creation**: double-check `addStripeInvoiceItem` end-to-end (callable + UI) so every invoice gets non-zero items before finalization. Log Stripe ID, amount, and Firestore write success; fail loudly if any item insert is rejected.
- [ ] **Revisit finalize step**: choose a single consistent UX:
  - Either auto-finalize immediately after items are created, **or** keep the explicit admin button but block leaving the form until it succeeds.
  - Ensure finalization transitions Stripe to `open`, not `paid`, and persists hosted URLs/amounts in Firestore.
- [ ] **Enable pay button when actionable**: front end should enable “Pay Invoice” only when the Firestore doc has `status === 'open'` and a `hosted_invoice_url`.
- [ ] **Validate Stripe responses**: after finalize/send, assert `amount_due > 0`; if zero, surface an actionable error rather than silently storing a “paid” invoice.

## 2. Backend Reliability & Data Integrity
- [ ] Add `initializeApp()` at the top of `functions/src/stripe.ts` to ensure Admin SDK is ready in all environments.
- [ ] Normalize Firestore invoice schema:
  - Use consistent field names (`amountDue`, `amountPaid`, `hostedInvoiceUrl`, `invoicePdf`, `stripeCreatedAt`, `updatedAt`).
  - Store timestamps as Firestore `Timestamp` or ISO strings, not mixed seconds/ms.
- [ ] Convert all Firestore `update()` calls that can hit non-existent docs to `set(..., { merge: true })`.
- [ ] Include idempotency keys on every Stripe “create” call (customers, products, prices, invoices, invoice items) to avoid duplicates during retries.
- [ ] Retry-safe webhook: ensure invoice updates are idempotent and tolerate out-of-order/events (check `event.created` before overwriting newer data).

## 3. Security Hardening
- [ ] Remove all secret logging (e.g., `...${stripeKey.slice(-4)}`); never log user emails/PII in request bodies.
- [ ] Harden every HTTP endpoint:
  - Restrict methods to POST, short-circuit OPTIONS, tighten CORS to known origins.
  - Require Firebase Auth/Admin claim (or App Check) before listing/cleaning invoices.
- [ ] Add `secrets: [...]` to `stripeWebhook` and enforce POST-only access.
- [ ] Validate payloads with a schema helper (e.g., Zod) before calling Stripe.

## 4. Frontend Adjustments
- [ ] User dashboard: filter to current user’s invoices only (matching metadata `userId` or `customer_email`).
- [ ] Add clear UI messaging for drafts (“Pending admin finalization”) instead of showing a disabled pay button if drafts must stay visible.
- [ ] Clean up debug logging once diagnostics are complete; keep at most a single `logger.debug` guarded by an env flag.
- [ ] Remove the unused payment-link flow (store+service code) or finish it end-to-end; currently the button no longer triggers the callable but dead code remains.

## 5. Testing & Observability
- [ ] Write an integration test plan: create invoice ? add items ? finalize ? pay in Stripe test mode ? confirm webhook updates UI.
- [ ] Add structured logging (severity, invoiceId, userId) and consider routing critical failures to an alerting channel.
- [ ] Document manual QA steps (and expected Stripe dashboard screenshots) so regressions are obvious.

## 6. Deployment Checklist
- [ ] Run `npm run build` (root + `functions/`) before every deploy; enforce via CI if possible.
- [ ] After function redeploy, smoke-test both admin and user dashboards against Stripe test data.
- [ ] Keep this TODO updated—check items off or expand as new gaps are discovered.

This list should stay alongside the code until every checkbox is complete. Update it whenever behaviour changes.
