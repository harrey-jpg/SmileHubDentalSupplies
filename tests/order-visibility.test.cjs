const assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const context = { window: {} };
vm.runInNewContext(fs.readFileSync('js/order-payment.js', 'utf8'), context);
const p = context.window.SmileHubOrderPayment;
assert.equal(p.describe({ paymentStatus: 'paid', paymentMode: 'test', payment: 'GCash' }).label, 'Test payment confirmed');
assert.equal(p.describe({ paymentStatus: 'paid', payment: 'Bank Transfer (Simulation)' }).label, 'Simulated payment confirmed');
assert.equal(p.describe({ paymentStatus: 'unpaid', paymentSimulationResult: 'failed' }).label, 'Payment failed — unpaid');
assert.equal(p.describe({ paymentStatus: 'paid', paymentSimulationResult: 'failed' }).tone, 'paid');
assert.equal(p.describe({ payment: 'Cash on Delivery' }).label, 'Due on delivery');
assert.equal(p.describe({ status: 'Delivered' }).label, 'Payment pending', 'Delivery must not imply payment');
assert(p.describe({ paymentMode: 'simulation' }).note.includes('no real money'));
assert(p.belongsTo({ userId: 'owner', email: 'sample@example.test' }, { uid: 'owner', email: 'account@example.test' }));
assert(!p.belongsTo({ userId: 'other', email: 'same@example.test' }, { uid: 'owner', email: 'same@example.test' }));
assert(!p.belongsTo({ userId: 'owner' }, null));
assert(p.belongsTo({ email: 'Buyer@Example.test' }, { uid: 'owner', email: 'buyer@example.test' }));
assert(!p.html({ payment: '<img src=x onerror=alert(1)>', paymongoPaymentId: '<script>x</script>' }, true).includes('<script>'));
assert(p.html({ payment: '<img>' }).includes('&lt;img&gt;'));
for (const file of ['orders.html', 'admin.html']) {
  const source = fs.readFileSync(file, 'utf8');
  assert(source.includes('js/order-payment.js'));
  assert(source.includes('css/order-payment.css'));
}
console.log('Order visibility passed: payment modes, failed/unpaid states, delivery separation, owner matching, escaped references, customer/admin integration.');
