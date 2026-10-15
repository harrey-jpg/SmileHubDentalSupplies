const assert = require('node:assert/strict');
const create = require('../functions/orders');
const records = new Map([
  ['products/1', { name: 'Test product', price: 100, stock: 5, status: 'Active' }],
  ['users/buyer', { role: 'customer', status: 'active' }], ['users/admin', { role: 'admin', status: 'active' }]
]);
const ref = path => ({ path, id: path.split('/')[1] });
const snapshot = reference => ({ exists: records.has(reference.path), ref: reference, data: () => records.has(reference.path) ? { ...records.get(reference.path) } : undefined });
let queue = Promise.resolve();
const db = { collection: name => ({ doc: id => ref(name + '/' + id) }), runTransaction(callback) {
  const operation = queue.then(async () => {
    const writes = [];
    const result = await callback({ get: async reference => snapshot(reference), getAll: async (...refs) => refs.map(snapshot),
      set: (reference, data) => writes.push(() => records.set(reference.path, data)),
      update: (reference, data) => writes.push(() => records.set(reference.path, { ...records.get(reference.path), ...data })) });
    writes.forEach(write => write()); return result;
  }); queue = operation.catch(() => {}); return operation;
} };
async function run() {
  const service = create(db), buyer = { uid: 'buyer' }, admin = { uid: 'admin' };
  const input = { number: 'SH-inventory', userId: 'spoof', payment: 'Bank Transfer (Simulation)', paymentStatus: 'paid', total: 374, items: [{ productId: 1, quantity: 2 }] };
  const results = await Promise.all([service.place(input, buyer), service.place(input, buyer)]);
  assert.equal(records.get('products/1').stock, 3, 'Retry reserves stock once');
  assert.equal(results[0].userId, 'buyer'); assert.equal(results[0].paymentStatus, 'unpaid');
  await assert.rejects(service.place({ ...input, number: 'SH-invalid', total: 1 }, buyer));
  await assert.rejects(service.place({ ...input, number: 'SH-negative', items: [{ productId: 1, quantity: -1 }] }, buyer));
  await assert.rejects(service.place({ ...input, number: 'SH-overstock', total: 822, items: [{ productId: 1, quantity: 6 }] }, buyer));
  assert.equal(records.get('products/1').stock, 3);
  await assert.rejects(service.changeStatus('SH-inventory', 'Shipped', buyer));
  await Promise.all([service.changeStatus('SH-inventory', 'Cancelled', buyer), service.changeStatus('SH-inventory', 'Cancelled', buyer)]);
  assert.equal(records.get('products/1').stock, 5, 'Cancellation restores once');
  await service.changeStatus('SH-inventory', 'Pending Payment', admin);
  assert.equal(records.get('products/1').stock, 3, 'Admin undo reserves again');
  await service.changeStatus('SH-inventory', 'Shipped', admin);
  await assert.rejects(service.changeStatus('SH-inventory', 'Cancelled', buyer));
  const suspended = { uid: 'suspended' }; records.set('users/suspended', { status: 'suspended' });
  await assert.rejects(service.place({ ...input, number: 'SH-suspended' }, suspended));
  const races = await Promise.allSettled(['SH-race-a', 'SH-race-b'].map(number => service.place({ ...input, number }, buyer)));
  assert.equal(races.filter(result => result.status === 'fulfilled').length, 1, 'Concurrent buyers cannot oversell');
  assert.equal(records.get('products/1').stock, 1);
  records.set('products/2', { name: 'Quotation item', price: 50000, stock: 2, status: 'Active' });
  await service.place({ ...input, number: 'SH-quote', total: 56000, items: [{ productId: 2, quantity: 1 }] }, buyer);
  assert.equal(records.get('products/2').stock, 2);
  await service.changeStatus('SH-quote', 'Processing', admin);
  assert.equal(records.get('products/2').stock, 1, 'Quote approval reserves stock');
  await service.changeStatus('SH-quote', 'Cancelled', admin);
  assert.equal(records.get('products/2').stock, 2);
  console.log('Vercel inventory passed: atomic placement, pricing, ownership, overselling protection, retry deduplication, cancellation/undo, staff permissions.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
