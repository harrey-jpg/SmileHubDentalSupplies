const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const storage = new Map();
let products = [{ id: 1, name: 'Test product', price: 100, stock: 4 }];
let meta = { version: 1 };
let productReads = 0;
let metaReads = 0;
let failProductRead = false;

const db = {
  collection(name) {
    return {
      orderBy() {
        return {
          get() {
            productReads++;
            return failProductRead
              ? Promise.reject(Object.assign(new Error('offline'), { code: 'unavailable' }))
              : Promise.resolve({ forEach(callback) { products.forEach((item, index) => callback({ id: String(index + 1), data: () => ({ ...item }) })); } });
          }
        };
      },
      doc() {
        return {
          get() {
            metaReads++;
            return Promise.resolve({ exists: Boolean(meta), data: () => meta });
          },
          delete() { return Promise.resolve(); }
        };
      }
    };
  },
  batch() {
    return { set() {}, commit() { return Promise.resolve(); } };
  }
};

function firestore() { return db; }
firestore.FieldValue = { increment: value => value, serverTimestamp: () => ({}) };
const context = vm.createContext({
  firebase: { firestore, auth: () => ({ currentUser: null }) },
  window: {},
  console: { warn() {} },
  sessionStorage: { getItem() { return null; }, setItem() {} },
  localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} }
});
context.window.SmileHubStorage = {
  get(key, fallback) { return storage.has(key) ? storage.get(key) : fallback; },
  set(key, value) { storage.set(key, value); },
  remove(key) { storage.delete(key); }
};
vm.runInContext(fs.readFileSync('js/firestore-data.js', 'utf8'), context);

function getProducts(options) {
  return new Promise(resolve => context.SmileHubData.getProducts((items, error) => resolve({ items, error }), options));
}

function getMeta() {
  return new Promise(resolve => context.SmileHubData.getProductsMeta(resolve));
}

async function run() {
  const [first, concurrent] = await Promise.all([getProducts(), getProducts()]);
  assert.equal(productReads, 1, 'concurrent product requests share one Firestore read');
  assert.equal(first.items[0].price, 100);
  assert.equal(concurrent.items[0].price, 100);

  first.items[0].price = 1;
  const cached = await getProducts();
  assert.equal(productReads, 1, 'fresh product data is reused from cache');
  assert.equal(cached.items[0].price, 100, 'callers cannot mutate the cached copy');

  products = [{ id: 1, name: 'Test product', price: 125, stock: 3 }];
  const refreshed = await getProducts({ forceRefresh: true });
  assert.equal(productReads, 2, 'forceRefresh bypasses a fresh cache');
  assert.equal(refreshed.items[0].price, 125);

  assert.equal((await getMeta()).version, 1);
  assert.equal((await getMeta()).version, 1);
  assert.equal(metaReads, 1, 'metadata reads are cached for the same interval');

  const cachedAt = storage.get('smilehub_products_cache_at_v1');
  failProductRead = true;
  const offline = await getProducts({ forceRefresh: true });
  assert.equal(offline.error.code, 'unavailable');
  assert.equal(offline.items[0].price, 125, 'failed refresh preserves last-known product data');
  assert.equal(storage.get('smilehub_products_cache_at_v1'), cachedAt, 'failed refresh does not mark stale data as fresh');

  failProductRead = false;
  await new Promise(resolve => context.SmileHubData.saveProducts([{ id: 1, price: 130, stock: 3 }], resolve));
  assert.equal(storage.has('smilehub_products_cache_v2'), false, 'successful product writes invalidate cached data');
  assert.equal(storage.has('smilehub_products_meta_at_v1'), false, 'successful product writes invalidate cached metadata');

  console.log('Product cache: request deduplication, freshness, forced refresh, offline fallback, and invalidation passed.');
}

run().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
