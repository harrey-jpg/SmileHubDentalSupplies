# SmileHub Frontend Upgrade

This build uses the uploaded `SmileHubDentalSupplies.zip` as its baseline.

## Authentication
- Preserved the original Firebase email/password and Google popup authentication.
- Added Google sign-up to the registration page using the same real Firebase provider.
- Redesigned login and registration as responsive two-panel experiences.
- Added confirm-password validation, 8-character minimum, password strength feedback, terms acceptance, loading states, accessible labels, and improved keyboard focus.
- Preserved the existing password-reset flow.

## Storefront
- Added accessible cart confirmation feedback and temporary “Added” button state.
- Kept the existing cart, wishlist, catalog, checkout, orders, profile, AI/chatbot, Firebase, and admin behavior.
- Added trust/assurance sections to product, cart, and checkout pages.
- Made newsletter forms provide frontend success feedback instead of reloading.
- Added recently-viewed product tracking in local storage for future UI use.
- Added skip links, live announcements, invalid-field styling, and stronger focus visibility.

## Verification
- All local HTML links and referenced local files were checked.
- All 14 JavaScript files pass `node --check`.
- No database schema or backend migration was introduced.
