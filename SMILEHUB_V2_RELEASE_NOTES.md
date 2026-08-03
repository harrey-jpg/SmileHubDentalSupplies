# SmileHub v2 Consolidated Release

## Preserved
- Firebase Email/Password, Google, and Phone authentication
- Existing product catalog, cart, wishlist, checkout, profile, orders, comparison, reviews, admin tools, category system, notifications, returns, and premium pages
- Landing-page redirects after sign-in and sign-out
- Existing Firebase project configuration

## Release hardening added
- Strict Philippine mobile validation: exactly 11 digits beginning with `09`
- Six-digit OTP input constraints and one-time-code autocomplete
- Duplicate form-submit protection
- Global offline status notice
- Broken-image fallback and lazy image decoding
- Safer external links
- Reduced-motion accessibility support
- Firebase rejection feedback for network and permission problems
- Secure SmileBot browser integration: no provider API keys in frontend code
- SmileBot uses `/api/ai/chat` and falls back to the built-in SmileHub knowledge base until the server-side provider is configured

## Automated checks completed
- JavaScript syntax validation for all project and Cloud Function JavaScript files
- Local HTML page, script, stylesheet, image, and link reference audit
- Duplicate HTML ID audit

## Firebase actions still required
1. Keep Email/Password, Google, and Phone providers enabled.
2. Create or keep Firestore enabled.
3. Deploy `firestore.rules` and `firestore.indexes.json`.
4. Deploy Hosting and Functions when ready.
5. Configure the AI provider secret only on the server. Never place it in `js/chatbot.js`.

The project cannot prove live SMS delivery, Google popup behavior, Firestore permissions, or deployed Cloud Function behavior through static checks alone. Those depend on the Firebase console, authorized domains, billing/quota, deployed rules, and the device/browser.
