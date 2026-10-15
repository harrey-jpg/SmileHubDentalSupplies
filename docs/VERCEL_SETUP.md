# Vercel hosting + PayMongo test payments

Firebase Authentication and Firestore stay in the existing Firebase project.
Vercel hosts the website and `/api/payments/checkout`, `/api/payments/status`,
and `/api/payments/webhook`. Firebase Functions and Blaze are not needed for
these three payment endpoints. PayMongo live keys and live payments are refused.

Bank Transfer (Simulation) uses `/api/payments/bank`, without contacting
PayMongo or a bank. Its sample account cannot receive transfers. Customers can
simulate failure (order stays unpaid) or success (order marked paid with
`paymentMode: simulation` and `paymentProvider: demo-bank`). This endpoint
requires the authenticated order owner and only accepts orders explicitly
created using Bank Transfer (Simulation). It cannot pay a GCash or card order.

## First deployment

1. Create a Vercel account using GitHub. Choose Hobby for a personal,
   non-commercial school demo. Hobby has usage limits; a real commercial store
   requires a plan that permits commercial use.
2. Import `harrey-jpg/SmileHubDentalSupplies` after the prepared changes are
   committed and pushed. Local changes do not automatically appear on GitHub.
3. Keep the repository root as Root Directory, Framework Preset **Other**, build
   command `npm run build`, Output Directory `public`. Node.js is set to 22.x.
4. Add the following private Environment Variables to the Vercel project:

| Name | Value |
| --- | --- |
| `PAYMONGO_SECRET_KEY` | Your regenerated `sk_test_...` secret |
| `FIREBASE_SERVICE_ACCOUNT` | Complete JSON from the existing Firebase project's service account key |
| `PAYMONGO_SITE_URL` | Your stable HTTPS Vercel production URL, e.g. `https://your-project.vercel.app` |

For the Firebase credential, use Firebase console → Project settings → Service
accounts → Firebase Admin SDK → Generate new private key. Enter the downloaded
JSON directly into the Vercel environment-variable field. Never put it in chat,
browser JavaScript, a Git commit, or the public output. This credential grants
server access to Firebase: limit Vercel project access to trusted maintainers.
The Firebase project ID must match `js/firebase-config.js`.

If the site URL is not known before the first deployment, omit PAYMONGO_SITE_URL
initially; the function falls back to Vercel's production domain (or deployment
domain). Then set the stable URL and redeploy. Environment-variable changes
apply to new deployments.

5. In Firebase Authentication → Settings → Authorized domains, add the Vercel
   hostname for sign-in providers such as Google.
6. Deploy, then add a test-mode PayMongo webhook subscribed to
   `checkout_session.payment.paid`, pointing to:
   `https://your-project.vercel.app/api/payments/webhook`.
   Use the public production deployment; deployment authentication must not
   block incoming PayMongo requests.
7. Sign in with a real Firebase test/customer account. The local emulator's
   `buyer@example.test` account exists only on your computer and will not work
   on Vercel. Place a test order and complete PayMongo's simulation. Return to
   the site and verify the result in Your Orders.

## Scope

This moves the static website and PayMongo API. Existing Firebase AI/profile
HTTP APIs and the Firestore stock trigger in `functions/index.js` are not
deployed by Vercel. Vercel does not run Firebase Firestore triggers. If these
features were already deployed on Firebase, they remain there, but the Vercel
site does not automatically proxy `/api/ai/chat` or `/api/profile` to them.
The AI/profile APIs still require a separate setup. Website order placement now
uses `/api/payments/place`, which validates catalog prices, reserves inventory,
and creates the order in one transaction. Retrying the same order ID does not
deduct stock again. `/api/payments/order-status` restores reserved stock once on
cancellation; staff reopening the order must reserve available stock again.
Quotation orders defer stock reservation. Existing mobile placement and its
inventory receipt are preserved; the Firebase trigger skips existing receipts.

The local emulator workflow is still available. Static build output contains
only frontend assets; private backend source and credentials are not served.

Checks:
```powershell
npm run build
npm run test:payments
```

References:
- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/environment-variables
- https://vercel.com/docs/plans/hobby
- https://firebase.google.com/docs/admin/setup
