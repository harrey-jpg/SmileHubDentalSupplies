const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(receipt) {
  const records = new Map([['products/1', { stock: 5 }]]);
  if (receipt) records.set('order_inventory/order-1', receipt);
  const ref = (collection, id) => ({ id, path: collection + '/' + id });
  const snapshot = reference => ({ ref: reference, exists: records.has(reference.path), data: () => records.get(reference.path) });
  let queue = Promise.resolve();
  const db = {
    collection: name => ({ doc: id => ref(name, id) }),
    runTransaction(fn) {
      const result = queue.then(async () => {
        const writes = [];
        await fn({
          get: async reference => snapshot(reference),
          getAll: async (...refs) => refs.map(snapshot),
          update: (reference, data) => writes.push(() => records.set(reference.path, { ...records.get(reference.path), ...data })),
          set: (reference, data) => writes.push(() => records.set(reference.path, data))
        });
        writes.forEach(write => write());
      });
      queue = result.catch(() => {});
      return result;
    }
  };
  const exports = {};
  const source = fs.readFileSync(require.resolve('../functions/index.js'), 'utf8');
  vm.runInNewContext(source.slice(source.indexOf('exports.onOrderCreated =')), {
    exports, db, onDocumentCreated: (_, fn) => fn,
    logger: { info() {}, warn() {}, error() {} }
  });
  const event = items => ({ params: { orderId: 'order-1' }, data: { data: () => ({ userId: 'alice', items }) } });
  return { records, run: items => exports.onOrderCreated(event(items)) };
}

test('mobile inventory receipts prevent a second deduction, including restored receipts', async () => {
  for (const restored of [false, true]) {
    const app = setup({ userId: 'alice', restored });
    await app.run([{ productId: 1, quantity: 2 }]);
    assert.equal(app.records.get('products/1').stock, 5);
  }
});

test('web duplicate events reserve once and combine repeated product lines', async () => {
  const app = setup();
  const items = [{ productId: 1, quantity: 1 }, { productId: 1, quantity: 2 }];
  await Promise.all([app.run(items), app.run(items)]);
  assert.equal(app.records.get('products/1').stock, 2);
  const receipt = app.records.get('order_inventory/order-1');
  assert.equal(receipt.items[0].productId, 1);
  assert.equal(receipt.items[0].quantity, 3);
  assert.equal(receipt.restored, false);
});

test('receipt records only actual deductions; invalid quantities leave inventory unchanged', async () => {
  const app = setup();
  await app.run([{ productId: 1, quantity: 8 }, { productId: 2, quantity: 2 }]);
  const receipt = app.records.get('order_inventory/order-1');
  assert.equal(receipt.items.length, 1);
  assert.equal(receipt.items[0].quantity, 5);
  const invalid = setup();
  await invalid.run([{ productId: 1, quantity: -2 }]);
  assert.equal(invalid.records.get('products/1').stock, 5);
  assert.equal(invalid.records.has('order_inventory/order-1'), false);
});
