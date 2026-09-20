# Firebase: easiest next steps

You already enabled Email/Password, Google, and Phone.

When you are ready to publish, open a terminal inside this folder and run:

```bash
npm install -g firebase-tools
firebase login
firebase use --add
firebase deploy --only firestore:rules,firestore:indexes,hosting
```

Choose the `smilehub-ecommerce` project when Firebase asks.

To deploy the API and SmileBot backend scaffold too:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Real AI remains disabled until a server-side provider secret is configured. Do not put an AI key in frontend JavaScript.
