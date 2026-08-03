# SmileHub v6.5 Consolidated Polish

Implemented:
- Email Verification directly above Phone Verification with matching cards.
- Unified phone verification status IDs and verified-state UI.
- Shopee-style phone editing flow with cancel and OTP re-verification.
- OTP modal flow preserved; Firebase test numbers use the configured fixed code and receive no SMS.
- Friendly Firebase billing error instead of raw technical message.
- Dark-mode contrast fixes for profile, verification, address, map, password, modal, inputs, and text.
- Profile photo Firestore/local persistence retained.
- Current-location reverse-geocoding retained for Profile and Checkout.
- Normal checkout clears local and Firebase cart; Buy Now preserves the cart.
- Routine cart/wishlist toasts suppressed; important errors and confirmations remain.
- Buy Now visibility strengthened on product cards and product pages.
- Floating buttons separated on desktop and mobile.

QA:
- 21 JavaScript files passed `node --check`.
- No duplicate HTML IDs.
- No missing local script, stylesheet, page, or image references.

External limitations:
- Firebase fictional test numbers never receive SMS; use the configured fixed 6-digit code.
- Real SMS requires Firebase billing/region/quota support.
- Real AI requires a deployed backend provider.
