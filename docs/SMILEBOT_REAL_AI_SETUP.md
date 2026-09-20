# SmileBot Real AI Setup

SmileBot now uses a secure Firebase Cloud Function and the OpenAI Responses API. The API key is never stored in browser JavaScript.

## Requirements

- Firebase project connected to this folder
- Firebase Blaze plan (required to deploy Cloud Functions)
- An OpenAI API key with API billing enabled

## One-time setup

Open Command Prompt inside this project folder.

1. Install the Cloud Function dependencies:

```bash
cd functions
npm install
cd ..
```

2. Save the OpenAI API key as a Firebase secret:

```bash
firebase functions:secrets:set OPENAI_API_KEY
```

Paste the API key when Firebase asks for it. Do not place the key in any HTML or JavaScript file.

3. Deploy the API Function:

```bash
firebase deploy --only functions:api
```

4. Deploy Hosting so `/api/ai/chat` points to the Function:

```bash
firebase deploy --only hosting
```

## Test

Open:

```text
https://smilehub-ecommerce.web.app/api/health
```

It should return JSON showing `ok: true`.

Then open SmileBot and try:

```text
helo
```

It should reply naturally using the real AI. When the Function or API key is unavailable, SmileBot safely uses its built-in help instead.

## Security

- Never commit or share the OpenAI API key.
- The key is stored in Firebase Secret Manager.
- The Function limits message/history/context sizes.
- Product context is read server-side from Firestore.
- The AI cannot directly place orders, process payments, issue refunds, or change account data.
