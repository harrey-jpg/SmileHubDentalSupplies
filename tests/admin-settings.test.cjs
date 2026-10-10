const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/admin.js'), 'utf8');
const settings = source.slice(source.indexOf('  var settingsResetPending'), source.indexOf('  // --- STORE INFORMATION SETTINGS ---'));
function fixture(role = 'staff') {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { textContent: '', hidden: false, dataset: {}, addEventListener(event, callback) { this[event] = callback; } });
    return elements.get(id);
  };
  const state = { user: { uid: 'staff-1', email: 'staff@example.test', displayName: 'Staff Member' }, writes: 0, dark: false, saved: 'light', timers: [], role };
  const choices = ['light', 'dark'].map(value => Object.assign(element(value), { value }));
  const toggle = element('toggle');
  toggle.click = () => { state.dark = !state.dark; state.saved = state.dark ? 'dark' : 'light'; toggle.clickListener(); };
  toggle.addEventListener = (_, callback) => { toggle.clickListener = callback; };
  const auth = { get currentUser() { return state.user; }, onAuthStateChanged(callback) { state.authChanged = callback; callback(); },
    sendPasswordResetEmail(email) { state.writes++; state.email = email; return new Promise((resolve, reject) => { state.resolve = resolve; state.reject = reject; }); } };
  const context = vm.createContext({ console, Promise, setTimeout(callback) { state.timers.push(callback); return callback; }, clearTimeout() {},
    roleResolved: true, currentRole: role, renderStoreSettings() {}, renderDeliverySettings() {}, firebase: { auth: () => auth }, getCurrentUserRoleFresh: async () => state.role,
    document: { getElementById: element, querySelector: () => toggle, querySelectorAll: () => choices, body: { classList: { contains: () => state.dark } } },
    window: { firebase: { auth: () => auth }, SmileHubAuth: { getLoggedInUser: () => ({ ...state.user, name: 'Staff Member' }) } } });
  vm.runInContext(settings + '\nsettingsRoleUid = "staff-1"; setupSettings();', context);
  return { context, state, element, choices, toggle };
}
(async () => {
  for (const role of ['staff', 'admin', 'superadmin']) assert.equal(fixture(role).element('settingsPasswordReset').disabled, false);
  assert.equal(fixture('customer').element('settingsPasswordReset').disabled, true);
  const f = fixture();
  f.choices[1].checked = true; f.choices[1].change();
  assert.equal(f.state.saved, 'dark'); assert.equal(f.choices[1].checked, true);
  f.toggle.click(); assert.equal(f.choices[0].checked, true);
  const pending = f.context.sendSettingsPasswordReset();
  await new Promise(setImmediate);
  await f.context.sendSettingsPasswordReset();
  assert.equal(f.state.writes, 1); assert.equal(f.state.email, 'staff@example.test');
  assert.equal(f.element('settingsPasswordReset').disabled, true);
  f.state.timers.at(-1)(); assert.match(f.element('settingsResetFeedback').textContent, /Still sending/);
  assert.equal(f.state.writes, 1);
  f.state.resolve(); await pending;
  assert.equal(f.element('settingsResetFeedback').dataset.state, 'success'); assert.equal(f.element('settingsPasswordReset').disabled, false);
  const retry = f.context.sendSettingsPasswordReset(); await new Promise(setImmediate);
  f.state.reject({ code: 'auth/network-request-failed' }); await retry;
  assert.equal(f.element('settingsResetFeedback').dataset.state, 'error'); assert.equal(f.element('settingsPasswordReset').disabled, false);
  const throttled = f.context.sendSettingsPasswordReset(); await new Promise(setImmediate);
  f.state.reject({ code: 'auth/too-many-requests' }); await throttled;
  assert.match(f.element('settingsResetFeedback').textContent, /Wait a few minutes/);
  f.state.role = 'customer'; await f.context.sendSettingsPasswordReset();
  assert.equal(f.state.writes, 3);
  const switched = fixture();
  const oldRequest = switched.context.sendSettingsPasswordReset(); await new Promise(setImmediate);
  switched.state.user = { uid: 'other', email: 'other@example.test' }; switched.state.authChanged();
  assert.equal(switched.element('settingsPasswordReset').disabled, true);
  switched.state.resolve(); await oldRequest;
  assert.equal(switched.element('settingsResetFeedback').hidden, true);
  const missing = fixture(); missing.state.user.email = null; missing.context.renderSettings();
  assert.equal(missing.element('settingsPasswordReset').disabled, true);
  missing.state.user = null; missing.context.renderSettings();
  assert.match(missing.element('settingsAccountState').textContent, /unavailable/);
  missing.context.roleResolved = false; missing.context.renderSettings();
  assert.match(missing.element('settingsAccountState').textContent, /Loading/);
  console.log('Admin settings checks passed: roles, theme synchronization, one reset request, delayed feedback, success, failure, and account changes.');
})().catch(error => { console.error(error); process.exitCode = 1; });
