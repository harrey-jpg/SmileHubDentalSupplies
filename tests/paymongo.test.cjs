const assert = require('node:assert/strict');
const createPayments = require('../functions/paymongo');

async function run() {
  const records = new Map([
    ['orders/ORDER-1', { userId: 'buyer', total: 100, payment: 'GCash', status: 'Pending Payment', paymentStatus: 'unpaid', items: [] }]
  ]);
  const doc = key => ({
    id: key.split('/')[1],
    get: async () => ({ exists: records.has(key), data: () => records.get(key) }),
    set: async data => records.set(key, data)
  });
  const db = {
    collection: name => ({ doc: id => doc(name + '/' + id), where: (_field, _op, value) => {
      const query = { limit: () => query, get: async () => {
        const docs = [...records].filter(([key, data]) => key.startsWith(name + '/') && data.orderId === value)
          .map(([key, data]) => ({ id: key.split('/')[1], data: () => data }));
        return { empty: !docs.length, docs };
      } }; return query;
    } }),
    runTransaction: async callback => callback({ get: ref => ref.get(), update: (ref, data) => ref.set({ ...records.get('orders/' + ref.id), ...data }) })
  };
  let key = 'sk_test_placeholder', mode = false, paid = false, failed = false, amount = 10000, calls = 0;
  const handler = createPayments({ db, auth: { verifyIdToken: async token => {
    if (token !== 'valid') throw Error(); return { uid: 'buyer' };
  } }, secret: () => key, fetch: async (_url, options) => {
    calls++;
    assert(options.headers.Authorization.startsWith('Basic '));
    if (options.body) {
      const attrs = JSON.parse(options.body).data.attributes;
      assert.equal(attrs.line_items[0].amount, 10000);
      assert.deepEqual(attrs.payment_method_types, ['gcash']);
    }
    return { ok: true, json: async () => ({ data: { id: 'cs_test', attributes: {
      livemode: mode, checkout_url: 'https://checkout.paymongo.com/test', payment_intent: { attributes: { last_payment_error: failed ? { code: 'test-decline' } : null } },
      payments: paid ? [{ id: 'pay_test', attributes: { status: 'paid', livemode: mode, amount, currency: 'PHP' } }] : []
    } } }) };
  } });
  async function request(path, body = { orderId: 'ORDER-1' }, token = 'valid') {
    const res = { code: 200, set() {}, status(code) { this.code = code; return this; }, json(data) { this.body = data; return this; } };
    await handler({ method: 'POST', path: '/api/payments/' + path, headers: { authorization: 'Bearer ' + token }, body }, res);
    return res;
  }
  assert.equal((await request('checkout', undefined, 'invalid')).code, 401);
  for (const role of ['admin', 'staff', 'superadmin']) {
    records.set('users/buyer', { role });
    for (const action of ['checkout', 'bank']) assert.equal((await request(action)).code, 403);
    assert.equal(calls, 0);
  }
  records.set('users/buyer', { role: 'customer' });
  assert.equal((await request('checkout', { orderId: '../escape' })).code, 400);
  key = 'sk_live_placeholder';
  assert.equal((await request('checkout')).code, 502); assert.equal(calls, 0);
  key = 'sk_test_placeholder'; mode = true;
  assert.equal((await request('checkout')).code, 502);
  mode = false;
  assert.equal((await request('checkout')).body.mode, 'test');
  const before = calls;
  await request('checkout'); assert.equal(calls, before, 'Reuse existing session on retries');
  assert.equal((await request('status')).body.paid, false);
  failed = true;
  assert.equal((await request('status')).body.outcome, 'failed');
  assert.equal(records.get('orders/ORDER-1').paymentLastOutcome, 'failed');
  failed = false;
  paid = true; amount = 1;
  assert.equal((await request('status')).body.paid, false, 'Reject wrong payment amount');
  amount = 10000; mode = true;
  assert.equal((await request('status')).code, 502, 'Reject live payments');
  mode = false;
  await request('webhook', { data: { attributes: { type: 'checkout_session.payment.paid', data: { id: 'cs_test' } } } }, '');
  assert.equal(records.get('orders/ORDER-1').paymentStatus, 'paid');
  assert.equal(records.get('orders/ORDER-1').paymentMode, 'test');
  assert.equal(records.get('orders/ORDER-1').status, 'Processing');
  assert.equal((await request('status')).body.paid, true);
  records.set('orders/ORDER-1', { userId: 'buyer', total: 100, payment: 'Bank Transfer (Simulation)', paymentStatus: 'unpaid', status: 'Pending Payment' });
  const bankCalls = calls;
  assert.equal((await request('bank')).body.outcome, 'pending');
  assert.equal((await request('bank', { orderId: 'ORDER-1', outcome: 'failed' })).body.paid, false);
  assert.equal(records.get('orders/ORDER-1').status, 'Pending Payment');
  assert.equal((await request('bank', { orderId: 'ORDER-1', outcome: 'success' })).body.paid, true);
  assert.equal(records.get('orders/ORDER-1').paymentMode, 'simulation');
  assert.equal((await request('bank', { orderId: 'ORDER-1', outcome: 'failed' })).body.paid, true, 'Never undo a completed simulation');
  assert.equal(calls, bankCalls, 'Bank simulation must never contact PayMongo or a bank');
  records.set('orders/ORDER-1', { userId: 'buyer', total: 100, payment: 'Credit Card', status: 'Pending Payment' });
  assert.equal((await request('bank', { orderId: 'ORDER-1', outcome: 'success' })).code, 400, 'Cannot simulate payment for another method');
  console.log('PayMongo checks passed: authentication, test-only keys/sessions, session reuse, amount verification, webhook reconciliation.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
