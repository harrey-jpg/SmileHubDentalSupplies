const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('contact.html', 'utf8');
const timestamp = { serverTimestamp: true };
for (const name of ['record', 'msg']) {
  const record = { name: 'Test user', date: '2026-10-22T12:00:00Z', message: 'Test message' };
  const expression = html.match(new RegExp('\\.add\\((Object\\.assign\\(\\{\\}, ' + name + ', \\{ createdAt: firebase\\.firestore\\.FieldValue\\.serverTimestamp\\(\\) \\}\\))\\)'));
  assert(expression, name + ' must include a timestamp when sent');
  const sent = vm.runInNewContext(expression[1], { [name]: record, firebase: { firestore: { FieldValue: { serverTimestamp: () => timestamp } } } });
  assert.equal(sent.createdAt, timestamp);
  assert.equal(record.createdAt, undefined, 'Local offline records must not contain server timestamp sentinels');
}
const source = fs.readFileSync('js/admin.js', 'utf8');
const rows = [
  { id: 'legacy', data: () => ({ name: 'Legacy', date: '2026-10-21T12:00:00Z' }) },
  { id: 'modern', data: () => ({ name: 'Modern', date: '2026-10-22T12:00:00Z', createdAt: { toDate: () => new Date('2026-10-22T12:00:00Z') } }) },
  { id: 'timestamp-only', data: () => ({ name: 'Older', createdAt: { toDate: () => new Date('2026-10-20T12:00:00Z') } }) }
];
let rendered = false;
const context = vm.createContext({ Promise, Map, Date, console, messagesCache: [],
  firebase: { firestore: () => ({ collection: () => ({ orderBy(field) { return { limit(n) { assert.equal(n, 100); return { get: async () => ({ forEach: fn => rows.filter(row => row.data()[field]).forEach(fn) }) }; } }; } }) }) },
  renderMessages() { rendered = true; }, document: { getElementById: () => null }, describeLoadError: () => 'error', maybeShowBlockedBanner() {} });
vm.runInContext(source.slice(source.indexOf('  function fetchMessages('), source.indexOf('  function updateMessageStats(')), context);
(async () => {
  const results = await new Promise(resolve => context.fetchMessages(resolve));
  assert.deepEqual(Array.from(results, row => row._id), ['modern', 'legacy', 'timestamp-only']);
  assert(results.every(row => row._time));
  assert(rendered);
  console.log('Contact messages: new/offline payload timestamps, legacy inbox visibility, deduplication, and newest-first sorting passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
