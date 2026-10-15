const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const context = {};
vm.runInNewContext(fs.readFileSync(require.resolve('../js/gcash-claims.js'), 'utf8'), context);
function setup(overrides = {}, claim) {
  const records = new Map([['orders/real-doc-id', { userId: 'alice', paymentMethod: 'GCash', status: 'Pending Payment', paymentStatus: 'unpaid', ...overrides }]]);
  if (claim) records.set('gcash_payment_claims/real-doc-id', claim);
  const auth = { currentUser: { uid: 'alice' } };
  let writes = 0, reject, release, queue = Promise.resolve();
  const db = {
    collection: name => ({ doc: id => ({ path: name + '/' + id }) }),
    runTransaction(fn) {
      const task = queue.then(async () => {
        if (release) await release;
        if (reject) throw new Error(reject);
        const changes = [];
        await fn({
          get: async ref => ({ exists: records.has(ref.path), data: () => records.get(ref.path) }),
          set: (ref, data) => changes.push([ref.path, data]),
          update: (ref, data) => changes.push([ref.path, { ...records.get(ref.path), ...data }])
        });
        changes.forEach(([path, data]) => { writes++; records.set(path, data); });
      });
      queue = task.catch(() => {});
      return task;
    }
  };
  return { service: context.SmileHubGcash.createService(db, auth, () => 123), records, auth, writes: () => writes,
    fail: message => { reject = message; }, delay: () => { let done; release = new Promise(resolve => { done = resolve; }); return done; } };
}
test('reference submission writes one claim against the actual document id, never marks an order paid', async () => {
  const app = setup();
  await app.service.submit('real-doc-id', ' ABC-123456 ');
  const claim = app.records.get('gcash_payment_claims/real-doc-id');
  assert.equal(claim.reference, 'ABC-123456'); assert.equal(claim.orderId, 'real-doc-id');
  assert.equal(claim.status, 'For Verification'); assert.equal(app.records.get('notifications/gcash-submitted-real-doc-id-ABC-123456').type, 'payment_submitted'); assert.equal(claim.userId, 'alice');
  assert.equal(app.records.get('orders/real-doc-id').paymentStatus, 'unpaid');
  assert.equal(app.writes(), 2);
});
test('duplicate clicks and delayed responses keep a single in-flight write', async () => {
  const app = setup(), done = app.delay();
  const first = app.service.submit('real-doc-id', '12345678');
  assert.equal(app.service.submit('real-doc-id', '87654321'), first);
  assert.equal(app.service.isSaving('real-doc-id'), true); assert.equal(app.writes(), 0);
  done(); await first; assert.equal(app.writes(), 2); assert.equal(app.service.isSaving('real-doc-id'), false);
  await assert.rejects(app.service.submit('real-doc-id', '87654321'), /already submitted/);
});
test('rejected references can be corrected without overwriting staff review history', async () => {
  const app = setup({}, { userId: 'alice', status: 'Rejected', reference: '123456', reason: 'Wrong reference', reviewedBy: 'staff' });
  await app.service.submit('real-doc-id', '654321');
  const claim = app.records.get('gcash_payment_claims/real-doc-id');
  assert.equal(claim.reason, ''); assert.equal(claim.status, 'For Verification'); assert.equal(claim.reviewedBy, 'staff');
});
test('paid, cancelled, other-account and non-GCash orders cannot accept claims', async () => {
  for (const override of [{ paymentStatus: 'paid' }, { gcashPaymentStatus: 'Paid' }, { status: 'Cancelled' }, { userId: 'bob' }, { paymentMethod: 'Credit Card' }]) {
    const app = setup(override); await assert.rejects(app.service.submit('real-doc-id', '12345678')); assert.equal(app.writes(), 0);
  }
  for (const status of ['Paid', 'For Verification']) {
    const app = setup({}, { status }); await assert.rejects(app.service.submit('real-doc-id', '12345678')); assert.equal(app.writes(), 0);
  }
});
test('invalid input, sign-out and rejected writes preserve confirmed state and permit retry', async () => {
  const app = setup();
  for (const reference of ['', '123', '<script>', 'x'.repeat(41)]) await assert.rejects(app.service.submit('real-doc-id', reference));
  app.auth.currentUser = null; await assert.rejects(app.service.submit('real-doc-id', '12345678'));
  app.auth.currentUser = { uid: 'alice' }; app.fail('Permission denied');
  await assert.rejects(app.service.submit('real-doc-id', '12345678'), /Permission denied/);
  assert.equal(app.service.isSaving('real-doc-id'), false); assert.equal(app.writes(), 0);
  app.fail(''); await app.service.submit('real-doc-id', '12345678'); assert.equal(app.writes(), 2);
});
