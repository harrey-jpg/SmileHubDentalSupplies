# PayMongo test checkout

This integration accepts `sk_test_` keys only and rejects live sessions/payments.
No secret or publishable key belongs in browser JavaScript.

## Local testing without Blaze (recommended)

No Firebase billing account, deployed functions, or cloud secret is required.
Java and Node.js must be installed (both are available on this computer).

In a terminal in the project folder:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/start-paymongo-local.ps1
```

Paste your replacement test key into the hidden prompt. The launcher saves it
only in ignored `functions/local/.secret.local`. To replace the key, delete
that file and restart the launcher. Never share or commit that file.

Keep that terminal running. Once all emulators have started, open a second
terminal in the same project and run:

```powershell
node scripts/seed-paymongo-local.cjs
```

Open http://127.0.0.1:5500/login.html and sign in with the local-only demo account:
`buyer@example.test` / `SmilehubTest123!`. Products and a test delivery address
are seeded locally. Your real Firebase accounts and orders are separate.

Add a product and check out with GCash or Credit Card. PayMongo must return to
http://127.0.0.1:5500 after the simulation. The return page retrieves the payment
from PayMongo and updates your local order. No public webhook is needed for this
flow; if you close the PayMongo tab, reopen the return link for the saved order
(`checkout.html?paymongo_order=ORDER_NUMBER`) to check it.

Keep using the exact local address above. Other ports and the public website
continue to use the production Firebase configuration. Emulators use the
isolated `demo-smilehub-local` project and listen only on your computer.
Stop with Ctrl+C. Local accounts/orders reset on restart; run the seed command
again. Internet is needed for PayMongo and frontend CDN files.
The launcher copies public website files into `.cache/paymongo-site` before
startup. Restart it to refresh that copy after editing the website. Backend
code and the private key stay outside the local web server's public folder.

This local option is accessible on your computer, not on your public website.

## Deploy online (requires Blaze)

From the project folder in your own terminal, run:

```powershell
firebase functions:secrets:set PAYMONGO_SECRET_KEY --project smilehub-ecommerce
```

Paste your regenerated Secret Test Key into Firebase's private prompt. Do not
paste it into chat or commit it. A public key is not needed for hosted checkout.

Install the existing backend dependencies if needed:

```powershell
npm --prefix functions install
firebase deploy --only functions:payments,hosting --project smilehub-ecommerce
```

Firebase Functions deployment requires the Firebase Blaze plan. PayMongo test
payments do not charge money, but Firebase hosting/functions can incur usage
costs under that plan. Do not upgrade billing without the account owner's choice.

The default return URL uses https://smilehub-ecommerce.web.app. For a different
domain, set `PAYMONGO_SITE_URL=https://your-domain` in
`functions/.env.smilehub-ecommerce` before deployment.

In PayMongo Settings → Webhooks, create a **test mode** endpoint:

`https://smilehub-ecommerce.web.app/api/payments/webhook`

Subscribe to `checkout_session.payment.paid`. The handler uses the event only
to identify a locally recorded session, then retrieves its payment directly
from PayMongo using the test secret before changing the order. It does not trust
payment status, totals, ownership, or payment IDs supplied in webhook bodies.

## Try it

Sign in, add an item and select GCash or Credit Card. Place an order of at least
₱20 that does not need a quotation. It opens PayMongo's test checkout after the
order saves. Use PayMongo's simulated payment controls or official test card
details, never a real transfer. Complete the simulation and return to the store.
The confirmation banner and Your Orders show the result; backend records include
`paymentMode: test`. Cancellation leaves the order unpaid. Webhooks confirm
payments even when the customer closes the tab. Return-page status checks also
reconcile the payment directly with PayMongo.

If checkout cannot open, the order remains saved and unpaid; do not place a
duplicate order to retry. Use the confirmation's check/retry link, or the retry
button after returning from PayMongo. Session reuse protects sequential checkout retries.
Concurrent requests can still create multiple test sessions: this demo is
intentionally unsuitable for real charges. Existing order creation still
reserves stock, including for pending/cancelled test orders.

Backend tests: `node tests/paymongo.test.cjs`.

References:
- https://docs.paymongo.com/docs/payment-channels-testing
- https://docs.paymongo.com/reference/create-a-checkout
- https://docs.paymongo.com/reference/checkout-session-resource
