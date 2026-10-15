const admin = require('firebase-admin');
const createPayments = require('../../functions/paymongo');
let payments;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const action = req.query?.action;
  if (!['checkout', 'status', 'webhook'].includes(action)) return res.status(404).json({ error: 'Not found.' });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST.' });
  try {
    if (!payments) {
      const credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');
      if (!credentials.project_id || !credentials.client_email || !credentials.private_key) throw new Error('Missing Firebase credentials');
      const origin = process.env.PAYMONGO_SITE_URL
        || (process.env.VERCEL_PROJECT_PRODUCTION_URL && 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL)
        || (process.env.VERCEL_URL && 'https://' + process.env.VERCEL_URL);
      if (!origin || new URL(origin).protocol !== 'https:') throw new Error('Missing HTTPS return address');
      process.env.PAYMONGO_SITE_URL = new URL(origin).origin;
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(credentials), projectId: credentials.project_id });
      payments = createPayments({ db: admin.firestore(), auth: admin.auth(), secret: () => process.env.PAYMONGO_SECRET_KEY });
    }
    // Adapt Vercel's Node helpers to the existing payment handler.
    req.path = '/api/payments/' + action;
    res.set = (name, value) => { res.setHeader(name, value); return res; };
    return await payments(req, res);
  } catch (_) {
    return res.status(503).json({ error: 'Test payments are not configured yet. Please contact the store administrator.' });
  }
};
