const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const source = read('js/firebase-config.js');
for (const [hostname, port, local] of [['127.0.0.1', '5500', true], ['localhost', '5500', true],
  ['127.0.0.1', '5000', false], ['smilehub-ecommerce.web.app', '', false], ['example.com', '5500', false]]) {
  const calls = [];
  const firebase = { initializeApp: config => calls.push(config.projectId),
    auth: () => ({ useEmulator: host => calls.push(host) }),
    firestore: () => ({ useEmulator: (host, port) => calls.push(host + ':' + port) }) };
  vm.runInNewContext(source, { firebase, location: { hostname, port } });
  assert.equal(calls[0], local ? 'demo-smilehub-local' : 'smilehub-ecommerce');
  assert.equal(calls.length, local ? 3 : 1);
  if (local) assert.deepEqual(calls.slice(1), ['http://127.0.0.1:19099', '127.0.0.1:18081']);
}
const config = JSON.parse(read('firebase.paymongo-local.json'));
assert.equal(config.functions.source, 'functions/local');
assert.equal(config.hosting.public, '.cache/paymongo-site');
for (const emulator of Object.values(config.emulators)) if (emulator.port) assert.equal(emulator.host, '127.0.0.1');
assert.equal(config.emulators.hosting.port, 5500);
assert(config.hosting.ignore.includes('functions/**'));
assert(config.hosting.ignore.includes('**/.*'));
assert(read('.gitignore').includes('.secret.local'));
console.log('Local PayMongo checks passed: isolated project, localhost-only routing, emulator ports, secret exclusions.');
