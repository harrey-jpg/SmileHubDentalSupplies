const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const product = fs.readFileSync('js/product.js', 'utf8');
function node(hidden = false) {
  const classes = new Set(hidden ? ['hidden'] : []);
  return { attributes: {}, classList: { add(...names) { names.forEach(n => classes.add(n)); }, remove(...names) { names.forEach(n => classes.delete(n)); }, contains: n => classes.has(n) },
    setAttribute(k, v) { this.attributes[k] = v; }, removeAttribute(k) { delete this.attributes[k]; } };
}
const detail = node(true), tabs = node(true), notFound = node();
detail.setAttribute('aria-hidden', 'true'); tabs.setAttribute('aria-hidden', 'true');
const fields = {};
const context = vm.createContext({ detail, tabs, notFound, detailLoaded: false, loadTimer: null, clearTimeout() {},
  document: { getElementById(id) { return fields[id] ||= {}; } } });
const missing = product.slice(product.indexOf('  function showNotFound()'), product.indexOf('  function showLoadError()'));
const loaded = product.slice(product.indexOf('  function onDetails(product)'), product.indexOf('    paintHeaderRating(id);')) + '\n}';
vm.runInContext(missing + loaded, context);
context.onDetails({ name: 'Late response' });
assert(!detail.classList.contains('hidden'));
assert(!tabs.classList.contains('hidden'));
assert(notFound.classList.contains('hidden'));
assert.equal(detail.attributes['aria-hidden'], undefined);
assert.equal(detail.attributes['aria-busy'], 'false');
fields.notFoundTitle = { textContent: "Couldn't load this product" };
context.onDetails(null);
assert.equal(fields.notFoundTitle.textContent, 'Product not found');
assert(detail.classList.contains('hidden'));

const cart = fs.readFileSync('js/cart.js', 'utf8');
let list = [], focused = false, prevented = false, reconciled = false;
const link = { dataset: {}, setAttribute(k, v) { this[k] = v; }, addEventListener(name, fn) { this[name] = fn; } };
const c = vm.createContext({ CART_KEY: 'cart', liveCatalog: { 1: { stock: 0 } },
  document: { querySelectorAll: () => [link], querySelector: () => ({ focus() { focused = true; } }) },
  getStoredList: () => list, showToast() {}, reconcileCart() { reconciled = true; } });
vm.runInContext(cart.slice(cart.indexOf('function guardCheckout('), cart.indexOf('function removeItem(')), c);
c.guardCheckout(list);
link.click({ preventDefault() { prevented = true; } });
assert(prevented && focused);
assert.equal(link['aria-disabled'], 'true');
list = [{ id: 1, quantity: 1 }]; c.guardCheckout(list);
assert.equal(link['aria-disabled'], 'false');
prevented = false;
link.click({ preventDefault() { prevented = true; } });
assert(prevented && reconciled);
console.log('Storefront recovery: late product success, missing products, empty-cart checkout, and unavailable stock passed.');
