const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
const orders = fs.readFileSync('js/orders.js', 'utf8');
const context = {}; vm.runInNewContext(orders.slice(0, orders.indexOf("document.addEventListener")), context);
const order = { number: 'SH-TEST', docId: 'actual-document', status: 'Pending Payment', paymentStatus: 'unpaid', paymentMode: 'test', payment: 'GCash' };
assert.equal(context.orderPaymentRetryUrl(order), 'checkout.html?paymongo_order=actual-document');
assert.equal(context.orderPaymentRetryUrl({ ...order, payment: 'Bank Transfer (Simulation)' }), 'checkout.html?bank_order=actual-document');
for (const change of [{ paymentStatus: 'paid' }, { status: 'Cancelled' }, { status: 'Delivered' }, { paymentMode: undefined }, { payment: 'Cash on Delivery' }]) {
  assert.equal(context.orderPaymentRetryUrl({ ...order, ...change }), null);
}
let onReady, shortcut, clicked = false, focused = false;
const notice = {};
vm.runInNewContext(fs.readFileSync('js/bank-simulation.js', 'utf8'), {
  URLSearchParams, window: { location: { search: '' } },
  document: { addEventListener: (_event, cb) => { onReady = cb; },
    getElementById: id => id === 'chooseBankFailureTest' ? { addEventListener: (_event, cb) => { shortcut = cb; } } : notice,
    querySelector: () => ({ click() { clicked = true; }, focus() { focused = true; } }) }
});
onReady(); shortcut();
assert(clicked && focused);
assert(notice.textContent.includes('Simulate failed transfer'));
console.log('Payment test access passed: one-click bank selection, unpaid-only retry, saved document IDs, completed/cancelled order protection.');
