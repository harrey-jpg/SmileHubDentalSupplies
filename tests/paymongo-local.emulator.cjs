// Run through firebase emulators:exec with firebase.paymongo-local.json.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
async function run() {
  assert.equal(process.env.GCLOUD_PROJECT, 'demo-smilehub-local');
  assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:18081');
  execFileSync(process.execPath, ['scripts/seed-paymongo-local.cjs'], { stdio: 'inherit' });
  const admin = require('../functions/node_modules/firebase-admin');
  admin.initializeApp({ projectId: 'demo-smilehub-local' });
  await admin.firestore().collection('orders').doc('LOCAL-CHECK').set({
    userId: 'local-test-buyer', total: 100, payment: 'GCash', paymentStatus: 'unpaid', status: 'Pending Payment'
  });
  const signIn = await fetch('http://127.0.0.1:19099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'buyer@example.test', password: 'SmilehubTest123!', returnSecureToken: true })
  });
  assert.equal(signIn.status, 200);
  const { idToken } = await signIn.json();
  const endpoint = 'http://127.0.0.1:5500/api/payments/status';
  const unauthorized = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(unauthorized.status, 401, 'Hosting must route to the local payment function');
  const status = await fetch(endpoint, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + idToken },
    body: JSON.stringify({ orderId: 'LOCAL-CHECK' }) });
  assert.equal(status.status, 200);
  assert.deepEqual(await status.json(), { paid: false, mode: 'test' });
  assert.equal((await fetch('http://127.0.0.1:5500/functions/local/.secret.local')).status, 404);
  assert.equal((await fetch('http://127.0.0.1:5500/homepage.html')).status, 200);
  await admin.app().delete();
  console.log('Local emulator integration passed: demo login, order storage, hosting rewrite, authenticated status, secret exclusion.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
