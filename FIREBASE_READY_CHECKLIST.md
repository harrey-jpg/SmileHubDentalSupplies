# SmileHub Firebase checklist

The website is configured for Firebase project `smilehub-ecommerce`.

## Already connected in the code
- Email/password authentication
- Google authentication
- Phone OTP verification
- Firestore user profiles and saved addresses
- Checkout profile autofill
- Firestore orders
- Firestore products
- Cross-device cart and wishlist synchronization

## One-time Firebase Console setup
1. Authentication providers: Email/Password, Google, and Phone must be enabled.
2. Firestore Database must exist.
3. Add your hosting domain under Authentication > Settings > Authorized domains.
4. Deploy `firestore.rules` before testing cart, wishlist, profiles, or orders.
5. Real phone OTP is limited by your Firebase SMS quota. Use Firebase test phone numbers during development.

## Deploy from the project folder
```bash
npm install -g firebase-tools
firebase login
firebase use smilehub-ecommerce
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

Never put service-account keys, AI keys, or payment secret keys in browser JavaScript.
