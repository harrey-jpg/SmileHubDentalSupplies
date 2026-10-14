# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vanilla HTML, CSS, and JavaScript served as static pages on GitHub Pages, backed by Firebase (Auth, Firestore, Cloud Storage, and Cloud Functions for the SmileBot chatbot). No build step or framework.

## Users

Primary users are dental clinic owners and practice managers who reorder consumables, instruments, disposables, and equipment for their practice in the Philippines. Secondary audiences demonstrated by the catalog and content are dental practitioners (dentists and auxiliaries) and dental students buying starter kits and school-required equipment.

## Product Purpose

SmileHub Dental Supplies is a working, end-to-end dental supplies e-commerce store. It demonstrates a complete purchasing flow — browse a categorized catalog, compare and wishlist products, add to cart, check out across payment methods, track orders, and request returns — alongside a full admin back office. It is built and presented as a complete full-stack product demo (school defense).

## Positioning

The product is positioned as a complete, functional full-stack e-commerce system rather than a static brochure: every screen from catalog to admin dashboard shows live, working behavior wired to a real backend (Firebase) including order lifecycle, notifications, and an in-store AI chatbot (SmileBot).

## Operating Context

- Philippine market: prices in PHP, delivery to local addresses, GCash/card/COD payment methods, Quezon City-based contact (support@smilehub.ph, +63 917 555 0142).
- Demo accounts used to demonstrate each role: `customer@smilehub.ph`, `admin@smilehub.ph`, `staff@smilehub.ph`, `super@smilehub.ph` (password scheme documented in README).
- Phone verification runs on the Firebase free tier; a demo OTP (`123456`) bypass is present so the flow works without billing enabled.
- Site is deployed on GitHub Pages at `https://harrey-jpg.github.io/SmileHubDentalSupplies/`.

## Capabilities and Constraints

### Capabilities

- Catalog of 32 products across 10 categories (Oral Care, Instruments, PPE, Restorative, Disposables, Impression, Orthodontics, Rotary, Equipment, Cosmetic), each with SKU, brand, pricing, stock, specs, and status.
- Product detail with specs, related products, add-to-cart and Buy Now.
- Compare and wishlist flows.
- Cart with coupon support (e.g. `SMILE10`) and live totals.
- Checkout with shipping calculation, order number generation, and multi-method payment (GCash, card, COD).
- Customer account: profile (editable fields, photo upload via Cloud Storage), address book, phone verification.
- Orders with status lifecycle (Pending → Processing → Shipped → Delivered / Cancelled), printable invoice, and reorder.
- Returns flow with printable tracking.
- Notifications page reflecting order/stock events.
- SmileBot AI chatbot (product search, compare, cart actions via chat) — client-side router leaning on Cloud Functions when billing allows.
- Admin dashboard: KPIs, orders management, product management (add/edit/stock), customer management, messages inbox (wired to `contact_messages`), audit trail with search/filters/export, reports, and CMS content editing.
- Company pages: blog, brands, FAQ, contact (form writes to Firestore), policies, careers, privacy, terms.
- Dark mode and fully responsive layout.

### Constraints

- Vanilla HTML/CSS/JS on GitHub Pages — no framework, no build step; all pages are standalone `.html` files.
- Firebase free tier (Spark): demo OTP bypass must remain usable, real SMS/email quota is not available, and some AI/email features fall back to client-side behavior.
- Account deletion is tombstone-based (`deleted_accounts`) so audit history and foreign-key integrity survive.
- Demo accounts must keep working for the defense.

## Brand Commitments

- Name: SmileHub Dental Supplies.
- Logo and placeholder assets in `assets/` (`assets/logo.svg`, `assets/products/`).
- Teal/blue visual identity: primary `#0f8f8f`, primary dark `#096d70`, accent amber `#ffb84d`, ink `#12343b`, soft sky background `#eefafa` / `#e9f7fb`, borders `#dcebea` (classic palette uses blue `#1261a0`/teal `#0f9d9a`). Dark mode variant maps surfaces to deep navy/ink tones.
- Body type is a system sans stack (Arial/Helvetica/sans-serif); SKU labels use monospace (Consolas).
- Voice: helpful, trust-oriented, clinic-focused copy ("Your Trusted Dental Supply Partner").

## Evidence on Hand

- Real product data (32 items with SKU, brand, PHP price, stock, category) in `js/firestore-data.js`.
- Demo order fixtures with real delivery addresses in the admin module.
- Demo retail/testimonial copy exists across marketing surfaces; these are demonstration content, not verified customer claims, and must not be presented as real testimonials.
- Firebase config, rules, and indexes committed to the repo.

## Product Principles

- Working behavior over mockups: every user-visible flow reaches a real backend and produces a real result for the demo.
- The demo must run end-to-end on the free Firebase tier without billing surprises.
- Preserve the incumbent brand identity and vanilla stack unless a redesign is explicitly requested.
- Role-based access (customer / staff / admin / superadmin) drives what each screen exposes.
- Nothing is claimed as real (customers, capacity, external services) unless it is verified.

## Accessibility & Inclusion

- Dark mode is provided for all major surfaces.
- No product-specific accessibility standard has been established; contrast, keyboard navigation, and screen-reader behavior are not yet verified against a stated level.