# GitHub Pages Mirror — SmileHub Dental Supplies

**Canonical hosting:** Firebase Hosting (`firebase.json: public "."`).  
**Mirror:** GitHub Pages at `https://harrey-jpg.github.io/SmileHubDentalSupplies/homepage.html`

Pages is a **read-only static mirror**. Firebase remains the source of truth for deploys, auth, and server-joined features.

## Setup

1. **Repo → Settings → Pages**
   - **Source:** `main` branch, `/` (root)
   - Keep the default `https://harrey-jpg.github.io/SmileHubDentalSupplies/` URL — no custom domain needed.
2. **This repo already ships `.nojekyll`** at the root so Pages serves every file verbatim (no Jekyll filtering of underscore-prefixed assets, no surprise 404s). Firebase ignores this file.
3. **Firebase Console → Authentication → Settings → Authorized domains**
   - Add `harrey-jpg.github.io` (required for Google sign-in on the mirror; Firestore reads are origin-agnostic and need no change).

## What works where

| Feature | Firebase (canonical) | GitHub Pages (mirror) |
|---|---|---|
| Static pages, products, cart, wishlist, orders, profile, checkout (demo) | ✅ | ✅ |
| Auth sign-in / sign-out | ✅ | ✅ **after allowlisting** the Pages hostname above |
| Firestore reads/writes where rules allow | ✅ | ✅ |
| Live chatbot (`/api/ai/chat` via `functions` rewrite) | ✅ | ❌ 404 — no Functions rewrite on Pages (fix deferred per owner) |

## Chatbot — intentionally deferred

Per the current scope the chatbot is **unchanged**. On the Pages mirror the widget will fail to reach `/api/ai/chat`. A future change will add a timeout guard that hides the widget and shows a notice card linking to `faq.html` / `contact.html` instead of hardcoding a Functions URL.

## Notes

- **Relative assets:** the site uses relative links (`homepage.html`, `css/…`, `js/…`, `assets/…`) so it works at the `/SmileHubDentalSupplies/` subpath without any path rewriting.
- **`docs/` folder:** deploy-ignored on Firebase (`firebase.json`) but visible on the mirror — harmless.
- **`.nojekyll`:** deploy-ignored on Firebase, required on Pages.

## Verification

- Open `https://harrey-jpg.github.io/SmileHubDentalSupplies/homepage.html` → products and images load, navigation works.
- Sign in on the mirror → succeeds only after the allowlist step above.
- `https://harrey-jpg.github.io/SmileHubDentalSupplies/data/assets/ph-locations.json` → 200 on Pages (mirrors Firebase).
