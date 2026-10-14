const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const shared = fs.readFileSync(path.join(__dirname, '../js/store-information.js'), 'utf8');
const admin = fs.readFileSync(path.join(__dirname, '../js/admin.js'), 'utf8');
const store = admin.slice(admin.indexOf('  // --- STORE INFORMATION SETTINGS ---'), admin.indexOf('  // --- DELIVERY SETTINGS ---'));
const next = () => new Promise(setImmediate);
test('Store information: public values, validation, acknowledgement, permissions, and retries', async () => {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { value: '', hidden: false, dataset: {}, attributes: {}, textContent: '',
      setAttribute(key, value) { this.attributes[key] = value; }, removeAttribute(key) { delete this.attributes[key]; },
      focus() { this.focused = true; }, addEventListener() {}, querySelector() { return null; } });
    return elements.get(id);
  };
  const state = { user: { uid: 'admin-1' }, role: 'admin', writes: 0, timers: [], audit: 0, exists: false };
  const reference = {
    async get(options) { assert.equal(options.source, 'server'); if (state.readError) throw state.readError; return { exists: state.exists, data: () => state.data }; },
    set(data, options) { state.writes++; state.payload = data; assert.equal(options.merge, true); return new Promise((resolve, reject) => { state.resolve = resolve; state.reject = reject; }); }
  };
  const context = vm.createContext({ console, Promise, Event: class {}, encodeURIComponent,
    setTimeout(callback) { state.timers.push(callback); return callback; }, clearTimeout() {},
    firebase: { firestore: () => ({ collection(name) { assert.equal(name, 'cms'); return { doc(id) { assert.equal(id, 'store-information'); return reference; } }; } }) },
    window: {}, document: { getElementById: element, addEventListener() {}, querySelectorAll(selector) {
      return selector === '[data-store-email]' ? [element('emailLink')] : selector === '[data-store-phone]' ? [element('phoneLink')] : selector === '[data-store-hours]' ? [element('hours')]: [];
    } }, settingsAuthUser: () => state.user, settingsRoleUid: 'admin-1', roleResolved: true, currentRole: 'admin',
    getCurrentUserRoleFresh: async () => state.role, addAuditLog() { state.audit++; } });
  vm.runInContext(shared + '\n' + store, context);
  const api = context.window.SmileHubStoreInformation;
  const defaults = await api.get(); assert.equal(defaults.supportEmail, 'support@smilehub.ph'); assert.equal(state.writes, 0);
  const valid = { supportEmail: ' help+clinic@example.test ', supportPhone: '+63 912 345 6789', businessHours: 'Monday–Friday, 9 AM–5 PM' };
  const clean = api.validate(valid).data;
  assert.equal(Object.keys(api.validate(valid).errors).length, 0);
  for (const invalid of ['invalid', 'help@example.test?bcc=someone@else.test', 'help@example.test\r\nBcc:other@example.test']) assert.ok(api.validate({ ...valid, supportEmail: invalid }).errors.supportEmail);
  assert.ok(api.validate({ ...valid, supportPhone: '123' }).errors.supportPhone);
  assert.ok(api.validate({ ...valid, businessHours: '' }).errors.businessHours);
  api.apply(clean);
  assert.equal(element('emailLink').attributes.href, 'mailto:help%2Bclinic%40example.test');
  assert.equal(element('phoneLink').attributes.href, 'tel:+639123456789');
  assert.equal(element('hours').textContent, clean.businessHours);
  assert.match(api.supportAnswer(), /help\+clinic@example.test/);
  state.exists = true; state.data = { ...valid, supportEmail: 'unsafe' };
  assert.equal((await api.get()).supportEmail, defaults.supportEmail);
  state.readError = new Error('offline'); await context.loadStoreInformation();
  assert.equal(context.storeInformationState, 'error'); assert.equal(element('settingsStoreFields').disabled, true);
  state.readError = null; state.data = clean; await context.loadStoreInformation();
  assert.equal(context.storeInformationState, 'ready'); assert.equal(element('settingsSupportEmail').value, clean.supportEmail);
  const event = { preventDefault() {} };
  element('settingsSupportEmail').value = 'bad'; await context.saveStoreInformation(event);
  assert.equal(state.writes, 0); assert.equal(element('settingsSupportEmail').focused, true);
  element('settingsSupportEmail').value = clean.supportEmail;
  const pending = context.saveStoreInformation(event); await next();
  await context.saveStoreInformation(event); assert.equal(state.writes, 1);
  assert.equal(element('settingsStoreFields').disabled, true); assert.equal(state.audit, 0);
  state.timers.at(-1)(); assert.match(element('settingsStoreFeedback').textContent, /Still saving/); assert.equal(state.writes, 1);
  state.resolve(); await pending;
  assert.equal(element('settingsStoreFeedback').dataset.state, 'success'); assert.equal(state.audit, 1);
  const failure = context.saveStoreInformation(event); await next();
  state.reject({ code: 'permission-denied' }); await failure;
  assert.match(element('settingsStoreFeedback').textContent, /permission/); assert.equal(element('settingsSupportEmail').value, clean.supportEmail);
  assert.equal(element('settingsStoreFields').disabled, false);
  const retry = context.saveStoreInformation(event); await next(); state.resolve(); await retry; assert.equal(state.writes, 3);
  state.role = 'staff'; await context.saveStoreInformation(event); assert.equal(state.writes, 3);
  context.currentRole = 'staff'; context.renderStoreSettings(); assert.equal(element('settingsStoreCard').hidden, true);
  for (const role of ['admin', 'superadmin']) { context.currentRole = role; context.renderStoreSettings(); assert.equal(element('settingsStoreCard').hidden, false); }
  state.user = { uid: 'other-account' }; context.renderStoreSettings(); assert.equal(element('settingsStoreFields').disabled, true);
});
