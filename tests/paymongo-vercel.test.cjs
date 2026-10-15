const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'api/payments/[action].js'), 'utf8');
async function run() {
  const env = {};
  let initialized = 0, captured;
  const admin = { apps: [], credential: { cert: value => value },
    initializeApp: () => { initialized++; admin.apps.push({}); }, firestore: () => ({}), auth: () => ({}) };
  const module = { exports: {} };
  vm.runInNewContext(source, { module, process: { env }, URL, require: name => {
    if (name === 'firebase-admin') return admin;
    if (name === '../../functions/paymongo') return options => async (req, res) => {
      captured = { path: req.path, key: options.secret() };
      res.set('Cache-Control', 'no-store');
      return res.json({ mode: 'test' });
    };
    throw Error('Unexpected dependency');
  } });
  const request = async (action, method = 'POST') => {
    const res = { code: 200, headers: {}, setHeader(name, value) { this.headers[name] = value; },
      status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    await module.exports({ query: { action }, method }, res); return res;
  };
  assert.equal((await request('unknown')).code, 404);
  assert.equal((await request('checkout', 'GET')).code, 405);
  assert.equal((await request('checkout')).code, 503);
  assert.equal(initialized, 0);
  env.FIREBASE_SERVICE_ACCOUNT = JSON.stringify({ project_id: 'demo-unit-test', client_email: 'test@example.test', private_key: 'placeholder' });
  env.VERCEL_PROJECT_PRODUCTION_URL = 'smilehub.example.test';
  env.PAYMONGO_SECRET_KEY = 'sk_test_placeholder';
  for (const action of ['checkout', 'status', 'webhook']) {
    const res = await request(action);
    assert.equal(res.code, 200);
    assert.equal(res.headers['Cache-Control'], 'no-store');
    assert.equal(captured.path, '/api/payments/' + action);
    assert.equal(captured.key, env.PAYMONGO_SECRET_KEY);
  }
  assert.equal(initialized, 1);
  assert.equal(env.PAYMONGO_SITE_URL, 'https://smilehub.example.test');
  const config = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
  assert.equal(config.outputDirectory, 'public');
  assert(fs.existsSync(path.join(root, 'public/checkout.html')));
  assert(!fs.existsSync(path.join(root, 'public/functions')));
  assert(!fs.existsSync(path.join(root, 'public/.secret.local')));
  console.log('Vercel checks passed: payment routes, safe missing-config errors, credentials initialization, return domain, private/public separation.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
