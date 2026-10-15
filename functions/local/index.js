const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
if (!process.env.FUNCTIONS_EMULATOR || !process.env.GCLOUD_PROJECT?.startsWith('demo-')) {
  throw new Error('This backend is for local emulators only.');
}
admin.initializeApp();
const key = defineSecret('PAYMONGO_SECRET_KEY');
process.env.PAYMONGO_SITE_URL = 'http://127.0.0.1:5500';
exports.payments = onRequest({ region: 'asia-southeast1', secrets: [key] }, require('../paymongo')({
  db: admin.firestore(), auth: admin.auth(), secret: () => key.value()
}));
