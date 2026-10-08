const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '../compare.html'), 'utf8');
const script = html.match(/<script>\s*(document.addEventListener\('DOMContentLoaded',[\s\S]*?)<\/script>/)[1];
const elements = new Map();
function element(id) {
  if (!elements.has(id)) {
    const classes = new Set();
    elements.set(id, { innerHTML: '', textContent: '', checked: false, disabled: false,
      classList: { add: x => classes.add(x), remove: x => classes.delete(x),
        contains: x => classes.has(x), toggle(x, force) { if (force) classes.add(x); else classes.delete(x); } },
      listeners: {}, addEventListener(type, fn) { this.listeners[type] = fn; }, focus() {} });
  }
  return elements.get(id);
}
const storage = new Map();
const windowListeners = {};
vm.runInNewContext(script, {
  document: { addEventListener(type, fn) { fn(); }, getElementById: element },
  localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  window: { addEventListener: (type, fn) => windowListeners[type] = fn, showToast() {} },
  location: { search: '' }, URLSearchParams, console,
});
const filter = element('compareDifferences');
const table = element('comparisonTable');
function show(items, reviews = []) {
  storage.set('smilehub_compare', JSON.stringify(items));
  storage.set('smilehub_reviews', JSON.stringify(reviews));
  windowListeners.storage({ key: 'smilehub_compare' });
}
function rows() { return (table.innerHTML.match(/class="compare-grid-row /g) || []).length; }
const a = { id: 1, name: 'Mirror', price: 100, brand: 'A', category: 'Tools', stock: 10 };
const b = { ...a, id: 2, name: 'Second mirror' };
assert(filter.disabled);
assert(element('compareEmpty').classList.contains('hidden') === false);
show([a]); assert(filter.disabled); assert.equal(rows(), 4);
show([a, b]); assert(!filter.disabled); assert.equal(rows(), 4);
filter.checked = true; filter.listeners.change();
assert.equal(rows(), 0); assert(!element('compareIdentical').classList.contains('hidden'));
assert(table.innerHTML.includes('Mirror')); // Headers remain visible.
show([a, { ...b, price: 200 }]); assert.equal(rows(), 1);
assert(table.innerHTML.includes('value-cell price'));
assert(!table.innerHTML.includes('<span class="value-cell'));
show([{ id: 1, name: 'A' }, { id: 2, name: 'B' }]); assert.equal(rows(), 0);
show([a, { ...b, stock: 20 }]); assert.equal(rows(), 0); // Same stock status.
show([a, { ...b, stock: 3 }]); assert.equal(rows(), 1);
show([a, b], [{ productId: 1, rating: 4 }, { productId: 2, rating: 4 }]); assert.equal(rows(), 0);
show([a, b], [{ productId: 1, rating: 4 }, { productId: 2, rating: 4 }, { productId: 2, rating: 4 }]); assert.equal(rows(), 1);
show([b, a]); assert(filter.checked); assert.equal(rows(), 0);
show([a]); assert(filter.checked); assert(filter.disabled); assert.equal(rows(), 4);
show([a, b, { ...a, id: 3 }, { ...a, id: 4 }]); assert.equal(rows(), 0);
element('showAllCompare').listeners.click(); assert(!filter.checked); assert.equal(rows(), 4);
show([]); assert(filter.disabled); assert(element('comparisonTable').classList.contains('hidden'));
console.log('Comparison filter checks passed: empty, 1/2/4 products, missing values, stock, ratings, persistence, and reset.');
function luminance(hex) {
  const rgb = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
const css = fs.readFileSync(require('node:path').join(__dirname, '../css/compare.css'), 'utf8');
for (const selector of ['.compare-page', '.compare-page.dark']) {
  const block = css.slice(css.indexOf(selector + ' {')).split('}')[0];
  const tokens = Object.fromEntries([...block.matchAll(/--compare-([\w-]+): (#\w{6})/g)].map(m => [m[1], m[2]]));
  for (const [fg, bg] of [['text', 'surface'], ['muted', 'surface'], ['muted', 'alt'], ['accent', 'alt'], ['success', 'success-bg'], ['danger', 'danger-bg']]) {
    const values = [luminance(tokens[fg]), luminance(tokens[bg])].sort((a,b) => b-a);
    assert((values[0]+.05)/(values[1]+.05) >= 4.5, `${selector}: ${fg}/${bg} contrast`);
  }
}
console.log('Light and dark text, accent, and status contrast checks passed (4.5:1 minimum).');
