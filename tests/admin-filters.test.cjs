const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('js/admin.js', 'utf8');
const slice = (start, end) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)));

test('Order date filters use timestamps and exclude missing, invalid and future dates', () => {
  const context = vm.createContext({});
  vm.runInContext(slice('  function orderTime(', '  function orderStatusClass(') + slice('  function orderMatchesDate(', '  function syncOrdersBulkBar('), context);
  const now = new Date();
  const timestamp = { createdAt: { toDate: () => now } };
  assert.equal(context.orderMatchesDate(timestamp, 'today'), true);
  for (const period of ['today', 'week', 'month']) {
    assert.equal(context.orderMatchesDate({}, period), false);
    assert.equal(context.orderMatchesDate({ date: 'invalid' }, period), false);
  }
  assert.equal(context.orderMatchesDate({}, 'all'), true);
  assert.equal(context.orderMatchesDate({ sortTs: now.getTime() + 86400000 }, 'week'), false);
});

test('Product search trims whitespace and tolerates missing fields while combining filters', () => {
  const fields = { adminCategoryFilter: { value: 'Instruments' }, adminStockFilter: { value: 'low' } };
  const context = vm.createContext({ filter: '  mirror  ', adminSearch: { value: '  mirror  ' },
    products: [{ id: 1, name: 'Mirror', sku: null, category: 'Instruments', stock: 2 }, { id: 2, name: null, stock: 0 }],
    minOf: () => 5, document: { getElementById: id => fields[id] } });
  vm.runInContext(slice('    const searchTerm =', '    const countEl =') + '\nresult=filtered.map(p=>p.id);', context);
  assert.deepEqual(Array.from(context.result), [1]);
});

test('Customer Orders and Spent sorting counts a repeated email only once per order', () => {
  const fields = { accountSort: { value: 'orders' }, accountSearch: { value: '  example.test  ' } };
  const context = vm.createContext({ accounts: [{ name: 'Alice', email: 'alice@example.test', role: 'customer' }, { name: 'Bob', email: 'bob@example.test', role: 'customer' }],
    document: { getElementById: id => fields[id] }, getOrders: () => [
      { email: 'alice@example.test', customerEmail: 'alice@example.test', total: 20 },
      { email: 'bob@example.test', total: 15 }, { email: 'bob@example.test', total: 15 }
    ] });
  const code = slice("    var search = ((document.getElementById('accountSearch')", "    var sub=document.getElementById('customersSub')");
  vm.runInContext(code + '\nresult=filtered.map(a=>({email:a.email,orders:accStats(a).orders,spent:accStats(a).spent}));', context);
  assert.equal(context.result[0].email, 'bob@example.test');
  assert.equal(context.result[1].orders, 1);
  assert.equal(context.result[1].spent, 20);
  fields.accountSort.value = 'spent';
  vm.runInContext(code + '\nresult=filtered.map(a=>a.email);', context);
  assert.deepEqual(Array.from(context.result), ['bob@example.test', 'alice@example.test']);
});

test('Message topic options are populated, escaped, deduplicated and keep the current selection', () => {
  const select = { value: 'Technical Support', innerHTML: '' };
  const context = vm.createContext({ messagesCache: [{ topic: 'Technical Support' }, { topic: 'Product Inquiry' }, { topic: 'Technical Support' }, { topic: '<test>' }],
    document: { getElementById: () => select }, escapeHtml: value => value.replace(/</g, '&lt;').replace(/>/g, '&gt;') });
  vm.runInContext(slice('  function syncMessageTopicFilter(', '  function renderMessages('), context);
  context.syncMessageTopicFilter();
  assert.equal(select.value, 'Technical Support');
  assert.equal((select.innerHTML.match(/value="Technical Support"/g) || []).length, 1);
  assert(select.innerHTML.includes('Product Inquiry'));
  assert(select.innerHTML.includes('&lt;test&gt;'));
  context.messagesCache = [{ topic: 'Product Inquiry' }];
  context.syncMessageTopicFilter();
  assert.equal(select.value, 'all');
});

test('Customer name, role and status sorts combine with the active filters', () => {
  const fields = { accountSort: { value: 'name' }, accountRoleFilter: { value: 'all' }, accountStatusFilter: { value: 'all' } };
  const context = vm.createContext({ accounts: [
    { name: 'Zoe', email: 'zoe@test', role: 'superadmin', status: 'active' },
    { name: 'Bob', email: 'bob@test', role: 'staff', status: 'suspended' },
    { name: 'Alice', email: 'alice@test', role: 'customer', status: 'active' }
  ], document: { getElementById: id => fields[id] }, getOrders: () => [] });
  const code = slice("    var search = ((document.getElementById('accountSearch')", "    var sub=document.getElementById('customersSub')") + '\nresult=filtered.map(a=>a.name);';
  for (const [sort, expected] of [['name', ['Alice', 'Bob', 'Zoe']], ['role', ['Alice', 'Bob', 'Zoe']], ['status', ['Alice', 'Zoe', 'Bob']]]) {
    fields.accountSort.value = sort;
    vm.runInContext(code, context);
    assert.deepEqual(Array.from(context.result), expected);
  }
  fields.accountRoleFilter.value = 'staff';
  fields.accountStatusFilter.value = 'active';
  vm.runInContext(code, context);
  assert.equal(context.result.length, 0);
  fields.accountStatusFilter.value = 'suspended';
  vm.runInContext(code, context);
  assert.deepEqual(Array.from(context.result), ['Bob']);
});

test('Order search, status and date filters combine and keep newest-first ordering', () => {
  const now = Date.now();
  const fields = { ordersBody: {}, orderStatusFilter: { value: 'Processing' }, orderSearch: { value: '  alice  ' }, orderDateFilter: { value: 'today' } };
  const context = vm.createContext({ document: { getElementById: id => fields[id] }, filter: 'all',
    getOrders: () => [
      { number: 'old', customer: 'Alice', status: 'Processing', sortTs: now - 1000 },
      { number: 'new', email: 'alice@test', status: 'Processing', sortTs: now },
      { number: 'cancelled', customer: 'Alice', status: 'Cancelled', sortTs: now },
      { number: 'other', customer: 'Bob', status: 'Processing', sortTs: now }
    ] });
  vm.runInContext(slice('  function orderTime(', '  function orderStatusClass(') + slice('  function orderMatchesDate(', '  function syncOrdersBulkBar('), context);
  const start = source.indexOf('    const orders = getOrders();', source.indexOf('  function renderOrders('));
  const end = source.indexOf("    var fc = document.getElementById('orderFilterCount')", start);
  vm.runInContext(source.slice(start, end) + '\nresult=filtered.map(o=>o.number);', context);
  assert.deepEqual(Array.from(context.result), ['new', 'old']);
});
