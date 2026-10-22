const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const common = fs.readFileSync('js/common.js', 'utf8');
for (const name of ['addToCart', 'buyNow']) {
  const start = common.indexOf('function ' + name + '(');
  const next = common.indexOf('\nfunction ', start + 1);
  const code = common.slice(start, next === -1 ? undefined : next);
  let guarded = 0;
  const context = vm.createContext({ window: { SmileHubAuth: { redirectStaffToDashboard() { guarded++; return true; } } } });
  vm.runInContext(code, context);
  context[name]({ dataset: {} }); // No storage or shopping dependencies may be reached.
  assert.equal(guarded, 1);
}
const rules = fs.readFileSync('firestore.rules', 'utf8').split('match /orders/{id}')[1].split('allow get:')[0];
assert(rules.includes("userDoc().data.get('role', 'customer') == 'customer'"));
console.log('Customer-only access: cart/buy-now guard and direct-order rule restriction passed.');
