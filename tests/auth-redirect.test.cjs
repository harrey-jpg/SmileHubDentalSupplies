const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/auth.js'), 'utf8');
function functions(start, end) {
  return source.slice(source.indexOf('function ' + start + '('), source.indexOf('function ' + end + '('));
}
function setup(role = 'customer') {
  const values = new Map();
  const listeners = new Set();
  const state = { user: { uid: 'new-user', role }, pending: null, cart: [], wish: [] };
  const auth = { currentUser: state.user, signOut() {
    this.currentUser = null;
    context.protectPage(); // Firebase emits sign-out before logout navigation completes.
    return Promise.resolve();
  } };
  const context = vm.createContext({
    Promise, console, RETURN_KEY: 'return', PENDING_TOAST_KEY: 'toast',
    resolvedAuthUid: 'new-user', intentionalLogout: false, currentPage: 'admin.html',
    PUBLIC_PAGES: ['homepage.html', 'login.html'], DEMO_MODE_ENABLED: false,
    location: { href: '', search: '', replace(url) { this.href = url; } },
    firebase: { auth: () => auth },
    getCachedUser: () => state.user,
    cacheUser: user => { state.user = user; },
    consumePendingAction: () => { const pending = state.pending; state.pending = null; return pending; },
    restoreCartItem: item => { state.cart.push(item); return true; },
    getStoredList: () => state.wish, saveStoredList: (_, items) => { state.wish = items; },
    SmileHubStorage: { get: (key, fallback) => values.has(key) ? values.get(key) : fallback,
      set: (key, value) => values.set(key, value), remove: key => values.delete(key) },
    sessionStorage: { setItem() {}, removeItem() {} }, localStorage: { removeItem() {} },
    document: { addEventListener: (_, fn) => listeners.add(fn), removeEventListener: (_, fn) => listeners.delete(fn) },
  });
  vm.runInContext(functions('redirectAfterLogin', 'setFieldState') + functions('logoutUser', 'showAuthMessage'), context);
  return { context, state, values, auth, ready() { [...listeners].forEach(fn => fn()); } };
}
(async () => {
  let test = setup();
  test.values.set('return', 'admin.html?tab=orders');
  await test.context.redirectAfterLogin();
  assert.equal(test.context.location.href, 'homepage.html');
  assert(!test.values.has('return'));
  for (const role of ['admin', 'staff', 'superadmin']) {
    test = setup(role); test.values.set('return', 'admin.html?tab=orders');
    await test.context.redirectAfterLogin(); assert.equal(test.context.location.href, 'admin.html?tab=orders');
  }
  test = setup(); test.values.set('return', 'orders.html?status=pending');
  await test.context.redirectAfterLogin(); assert.equal(test.context.location.href, 'orders.html?status=pending');
  test = setup('admin'); test.context.resolvedAuthUid = null; test.values.set('return', 'admin.html');
  const delayed = test.context.redirectAfterLogin();
  await Promise.resolve(); assert.equal(test.context.location.href, '');
  test.context.resolvedAuthUid = 'new-user'; test.ready(); await delayed;
  assert.equal(test.context.location.href, 'admin.html');
  test = setup(); test.context.resolvedAuthUid = null;
  const stale = test.context.redirectAfterLogin();
  test.auth.currentUser = { uid: 'another-user' }; test.ready(); await stale;
  assert.equal(test.context.location.href, '');
  test = setup('admin'); test.values.set('return', 'admin.html');
  test.context.logoutUser(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(test.context.location.href, 'homepage.html'); assert(!test.values.has('return'));
  for (const type of ['buy', 'cart', 'wish']) {
    test = setup(); const item = { id: 1, name: 'Mirror' };
    test.state.pending = { type, item }; test.values.set('return', 'product.html?id=1');
    await test.context.redirectAfterLogin();
    assert(!test.values.has('return'));
    if (type === 'buy') {
      assert.equal(test.context.location.href, 'checkout.html?mode=buy-now');
      assert.equal(test.values.get('smilehub_buy_now')[0], item);
    } else {
      assert.equal(test.context.location.href, 'product.html?id=1');
      assert.equal(type === 'cart' ? test.state.cart.length : test.state.wish.length, 1);
    }
  }
  assert(source.includes('return redirectAfterLogin();'));
  assert(!source.includes('setTimeout(redirectAfterLogin, 300)'));
  console.log('Auth redirect regression checks passed: roles, delayed resolution, changed account, logout race, saved destinations, and guest actions.');
})().catch(error => { console.error(error); process.exitCode = 1; });
