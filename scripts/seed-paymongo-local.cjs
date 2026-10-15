// Isolated local demo only. Never use production credentials or project IDs.
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:18081';
process.env.FIREBASE_AUTH_EMULATOR_HOST = '127.0.0.1:19099';
const admin = require('../functions/node_modules/firebase-admin');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
admin.initializeApp({ projectId: 'demo-smilehub-local' });
async function seed() {
  const auth = admin.auth(), db = admin.firestore();
  const uid = 'local-test-buyer';
  const account = { email: 'buyer@example.test', password: 'SmilehubTest123!', displayName: 'Test Buyer', emailVerified: true };
  try { await auth.getUser(uid); await auth.updateUser(uid, account); }
  catch (error) { if (error.code !== 'auth/user-not-found') throw error; await auth.createUser({ uid, ...account }); }
  await db.collection('users').doc(uid).set({ email: account.email, firstName: 'Test', lastName: 'Buyer',
    name: 'Test Buyer', role: 'customer', status: 'active', phone: '+639171234567', phoneLocal: '09171234567', phoneVerified: true,
    address: { street: '123 Test Street', barangay: 'Ermita', city: 'Manila', province: 'Metro Manila', postal: '1000' } });
  const source = fs.readFileSync(path.join(__dirname, '../js/firestore-data.js'), 'utf8');
  const start = source.indexOf('var defaultProducts = [');
  const end = source.indexOf('];', start) + 2;
  const context = {}; vm.runInNewContext(source.slice(start, end), context);
  const batch = db.batch();
  for (const product of context.defaultProducts) batch.set(db.collection('products').doc(String(product.id)), JSON.parse(JSON.stringify(product)));
  batch.set(db.collection('cms').doc('delivery'), { standardFee: 150, freeShippingThreshold: 3000 });
  await batch.commit();
  console.log('Local test store ready: http://127.0.0.1:5500/login.html');
  console.log('Demo login: buyer@example.test / SmilehubTest123! (local emulator only)');
  await admin.app().delete();
}
seed().catch(error => { console.error(error.message); process.exitCode = 1; });
