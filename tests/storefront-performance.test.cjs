const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const suite = fs.readFileSync('js/frontend-suite.js', 'utf8');
const images = [
  { header: true, attributes: {} },
  { attributes: { loading: 'eager' } },
  { attributes: { loading: 'lazy' } },
  { attributes: {} }
].map(i => ({ ...i, loading: i.attributes.loading, closest() { return this.header; }, hasAttribute(k) { return k in this.attributes; } }));
const start = suite.indexOf("    document.querySelectorAll('img')");
const end = suite.indexOf("    document.querySelectorAll('button", start);
vm.runInNewContext(suite.slice(start, end), { document: { querySelectorAll: () => images } });
assert.deepEqual(images.map(i => i.loading), ['eager', 'eager', 'lazy', 'lazy']);
for (const [file, id] of [['homepage.html', 'Dental equipment illustration'], ['product.html', 'detailImage']]) {
  const tag = fs.readFileSync(file, 'utf8').split('\n').find(line => line.includes(id) && line.includes('<img'));
  assert(tag.includes('loading="eager"') && tag.includes('fetchpriority="high"'));
}
const source = fs.readFileSync('js/product.js', 'utf8');
let metaReads = 0, productReads = 0;
const list = [{ id: 1, category: 'Instruments', stock: 5 }];
const values = new Map();
const grid = { setAttribute() {}, querySelectorAll: () => [] };
const context = vm.createContext({
  SmileHubStorage: { get: key => values.get(key), set: (key, value) => values.set(key, value) },
  SmileHubData: { getProductsMeta(cb) { metaReads++; cb({ version: 1 }); }, getProducts(cb) { productReads++; cb(list); } },
  document: { getElementById: id => id === 'relatedGrid' ? grid : { classList: { remove() {}, add() {} } } }
});
vm.runInContext(source.slice(0, source.indexOf('var STAR_PATH')) + source.slice(source.indexOf('function escHtml('), source.indexOf('function clampQty(')), context);
context.getProductDetails(1, () => context.renderRelatedRail('Instruments', 1));
assert.equal(metaReads, 1);
assert.equal(productReads, 1);
assert.equal(grid.innerHTML, '');
context.cachedProductList = [];
context.renderRelatedRail('Instruments', 1);
assert.equal(metaReads, 2); // Standalone rail still loads its data.
console.log('Performance: explicit image priority preserved; product and related rail share one catalog load.');
