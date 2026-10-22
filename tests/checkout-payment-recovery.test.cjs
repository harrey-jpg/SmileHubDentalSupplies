const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/checkout.js', 'utf8');
const code = source.slice(source.indexOf("document.addEventListener('DOMContentLoaded', function() {"), source.indexOf('var GOOGLE_MAPS_KEY'));
const tick = () => new Promise(setImmediate);
function fixture(request) {
  const nodes = {};
  for (const id of ['paymentReturnPanel', 'paymentReturnTitle', 'paymentReturnNotice', 'paymentReturnRetry', 'paymentReturnOrder']) {
    nodes[id] = { hidden: true, focus() {}, addEventListener(name, fn) { this[name] = fn; } };
  }
  let ready;
  const location = { search: '?paymongo_order=SH-existing' };
  vm.runInNewContext(code, { URLSearchParams, URL, window: { location },
    document: { addEventListener(name, fn) { ready = fn; }, getElementById: id => nodes[id], querySelector: () => ({}) },
    firebase: { auth: () => ({ onAuthStateChanged: fn => fn({ uid: 'customer' }) }) }, paymongoRequest: request });
  ready();
  return { nodes, retry: nodes.paymentReturnRetry, location };
}
(async () => {
  const calls = [];
  let fail = true, paid = false;
  const f = fixture(async action => {
    calls.push(action);
    if (fail) throw new Error('Offline');
    return action === 'status' ? { paid } : { mode: 'test', url: 'https://checkout.paymongo.com/test' };
  });
  await tick();
  assert.equal(f.retry.textContent, 'Check payment status');
  fail = false;
  await f.retry.click();
  assert.deepEqual(calls, ['status', 'status']); // A recovery check must not start payment.
  assert.equal(f.retry.textContent, 'Retry payment');
  paid = true;
  await f.retry.click();
  assert(f.retry.hidden);
  assert.equal(calls.includes('checkout'), false); // Payment completed since the last check.
  assert.equal(f.location.href, undefined);

  let release;
  const actions = [];
  const g = fixture(async action => {
    actions.push(action);
    if (actions.length === 1) return { paid: false };
    if (action === 'status') return new Promise(resolve => { release = resolve; });
    return { mode: 'test', url: 'https://checkout.paymongo.com/test' };
  });
  await tick();
  const pending = g.retry.click();
  await g.retry.click();
  assert.equal(actions.length, 2);
  release({ paid: false });
  await pending;
  assert.deepEqual(actions, ['status', 'status', 'checkout']);
  assert.equal(g.location.href, 'https://checkout.paymongo.com/test');
  console.log('Payment recovery: status failures, late confirmation, duplicate clicks, and saved-order retry passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
