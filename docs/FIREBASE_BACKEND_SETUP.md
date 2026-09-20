# SmileHub Firebase backend setup

## Included
- Firebase Authentication (email/password, Google, and real SMS OTP)
- Cloud Firestore user profiles, addresses, products, orders, reviews, and CMS rules
- Firebase Hosting configuration
- Cloud Functions API scaffold and protected AI endpoint placeholder
- Local Firebase Emulator configuration

## Required console setup
1. Open the Firebase project `smilehub-ecommerce`.
2. Authentication → Sign-in method:
   - Enable Email/Password
   - Enable Google
   - Enable Phone
3. Authentication → Settings → Authorized domains:
   - Add your production domain
   - `localhost` is normally available for local testing
4. Create/enable Cloud Firestore.
5. Add billing to the Firebase project if required for real SMS delivery and Cloud Functions deployment.
6. Deploy:
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use smilehub-ecommerce
   firebase deploy --only firestore:rules,firestore:indexes,hosting,functions
   ```

## Local testing
```bash
cd functions
npm install
cd ..
firebase emulators:start
```

## Phone verification behavior
- Philippine mobile numbers must be 11 digits and start with `09`.
- The browser converts them to E.164 format (`+63...`) for Firebase.
- OTP verification is required before checkout, not before browsing or signing in.
- A verified number is linked to the signed-in Firebase account.
- Profile and delivery details are saved in `users/{uid}` and auto-filled at checkout.

## Test phone numbers
For development, configure fictional phone numbers and fixed OTP codes in Firebase Console → Authentication → Sign-in method → Phone. This avoids consuming SMS quota.
