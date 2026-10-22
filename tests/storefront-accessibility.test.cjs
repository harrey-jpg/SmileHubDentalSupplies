const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function field(id, attributes = {}, label = null) {
  return { id, name: 'q', placeholder: 'Search products', attributes: { ...attributes }, label,
    getAttribute(name) { return this.attributes[name] ?? null; },
    hasAttribute(name) { return name in this.attributes; },
    setAttribute(name, value) { this.attributes[name] = value; },
    removeAttribute(name) { delete this.attributes[name]; },
    closest() { return null; }, addEventListener() {} };
}
const fields = [field('search', { 'aria-label': 'Search dental products' }),
  field('quantity', { 'aria-labelledby': 'quantityLabel' }),
  field('email', {}, { textContent: 'Email address' }), field('unlabelled')];
const forms = fs.readFileSync('js/frontend-enhancements.js', 'utf8');
const formFunction = forms.slice(forms.indexOf('  function enhanceForms()'), forms.indexOf('  function enhanceButtons()'));
vm.runInNewContext(formFunction + '\nenhanceForms();', { document: {
  querySelectorAll: () => fields,
  querySelector: selector => fields.find(f => selector === `label[for="${f.id}"]`)?.label || null
} });
assert.equal(fields[0].getAttribute('aria-label'), 'Search dental products');
assert.equal(fields[1].getAttribute('aria-label'), null);
assert.equal(fields[1].getAttribute('aria-labelledby'), 'quantityLabel');
assert.equal(fields[2].getAttribute('aria-label'), null);
assert.equal(fields[3].getAttribute('aria-label'), 'Search products');

const premium = fs.readFileSync('js/premium.js', 'utf8');
const accessibility = premium.slice(premium.indexOf('  function addAccessibility()'), premium.indexOf('  function mobileNav()'));
function skipLinkCase(id, existing) {
  const main = { id, attributes: {}, hasAttribute(n) { return n in this.attributes; }, setAttribute(n, v) { this.attributes[n] = v; } };
  const links = existing ? [{ className: 'skip-link', textContent: 'Skip to main content', getAttribute: () => '#' + id }] : [];
  const document = { createElement: () => ({}), body: { prepend: link => links.unshift(link) } };
  vm.runInNewContext(accessibility + '\naddAccessibility();', { document,
    $: selector => selector === 'main' ? main : null,
    $$: selector => selector === 'a[href^="#"]' ? links : [] });
  assert.equal(links.length, 1);
  assert.equal(main.attributes.tabindex, '-1');
  if (!existing) assert.equal(links[0].href, '#' + main.id);
  return main;
}
skipLinkCase('mainContent', true);
skipLinkCase('custom-content', false);
assert.equal(skipLinkCase('', false).id, 'main-content');
console.log('Storefront accessibility: authored labels, label references, fallback labels, and skip-link destinations passed.');
