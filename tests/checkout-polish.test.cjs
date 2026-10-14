const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '../checkout.html'), 'utf8');
const script = fs.readFileSync(path.join(__dirname, '../js/checkout.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../css/checkout-polish.css'), 'utf8');
const deliveryContext = { window: {}, Event: class {}, document: { addEventListener() {}, dispatchEvent() {}, querySelectorAll: () => [] } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/delivery-settings.js'), 'utf8'), deliveryContext);
deliveryContext.window.SmileHubDelivery.apply(deliveryContext.window.SmileHubDelivery.defaults);
const feeFunction = html.slice(html.indexOf('  function updateDeliveryFees(){'), html.indexOf('  updateDeliveryFees();'));
for (const subtotal of [0, 2999, 3000, 4500]) {
  const fields = { deliveryFeeStandard: {}, deliveryFeeExpress: {}, deliveryHint: {} };
  vm.runInNewContext(feeFunction + 'updateDeliveryFees();', {
    getCartSubtotal: () => subtotal, document: { getElementById: id => fields[id] },
    window: deliveryContext.window,
  });
  assert.equal(fields.deliveryFeeExpress.textContent, 'Unavailable in demo');
  assert.equal(fields.deliveryFeeStandard.textContent, subtotal === 0 || subtotal >= 3000 ? 'Free' : '₱150.00');
  assert(!fields.deliveryHint.textContent.includes('Express'));
  if (subtotal === 0) assert(fields.deliveryHint.textContent.includes('Add items'));
  if (subtotal >= 3000) assert(fields.deliveryHint.textContent.includes('Standard delivery is free'));
}
assert.equal((html.match(/id="closeOrderConfirm"/g) || []).length, 1);
assert(/value="Express" disabled/.test(html));
assert(html.includes('aria-describedby="confirmPaymentNote"'));
for (const id of ['confirmOrderNumber', 'confirmEmail', 'confirmPaymentNote', 'orderConfirmTitle']) assert(html.includes(`id="${id}"`));
const noteCode = script.slice(script.indexOf('            payNote.textContent = paid'), script.indexOf('          var modal ='));
for (const [flags, expected] of [
  [{ paid: true }, 'Payment marked confirmed'],
  [{ paymentMethod: 'Cash on Delivery' }, 'due on delivery'],
  [{ needsQuote: true }, 'quotation is required'],
  [{ result: { demo: true } }, 'no charge was made'],
  [{ paymentError: true }, 'could not be confirmed'],
  [{}, 'awaiting confirmation'],
]) {
  const context = { payNote: {}, paid: false, paymentMethod: 'GCash', needsQuote: false, result: {}, paymentError: false, ...flags };
  vm.runInNewContext(noteCode.replace(/\s*}\s*$/, ''), context);
  assert(context.payNote.textContent.includes(expected));
}
let focused;
const first = { focus: () => focused = 'close' }, last = { focus: () => focused = 'shopping' };
const keyCode = script.slice(script.indexOf('          function confirmationKeys('), script.indexOf('          function confirmationClick('));
let closed = false, prevented = false;
const context = { document: { activeElement: { id: 'orderConfirmTitle' } },
  modal: { querySelectorAll: () => [first, last] }, closeConfirmation: () => closed = true };
vm.runInNewContext(keyCode, context);
context.confirmationKeys({ key: 'Tab', shiftKey: true, preventDefault: () => prevented = true });
assert.equal(focused, 'shopping'); assert(prevented);
context.document.activeElement = last;
context.confirmationKeys({ key: 'Tab', shiftKey: false, preventDefault() {} }); assert.equal(focused, 'close');
context.confirmationKeys({ key: 'Escape', preventDefault() {} }); assert(closed);
assert(css.includes('grid-column: 2 / -1'));
assert(css.includes('max-height: calc(100dvh - 24px)'));
function luminance(hex) {
  const rgb = hex.match(/\w\w/g).map(x => parseInt(x, 16) / 255).map(x => x <= .04045 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4);
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
for (const selector of ['.checkout-page', '.checkout-page.dark']) {
  const block = css.slice(css.indexOf(selector + ' {')).split('}')[0];
  const tokens = Object.fromEntries([...block.matchAll(/--co-([\w-]+): (#\w{6})/g)].map(m => [m[1], m[2]]));
  for (const [fg, bg] of [['text', 'surface'], ['muted', 'surface'], ['muted', 'soft'], ['muted', 'selected'], ['accent', 'selected']]) {
    const light = [luminance(tokens[fg]), luminance(tokens[bg])].sort((a,b) => b-a);
    assert((light[0]+.05)/(light[1]+.05) >= 4.5, `${selector}: ${fg}/${bg}`);
  }
}
console.log('Checkout checks passed: shipping thresholds, unavailable Express, all payment messages, dialog IDs, Escape and focus wrapping.');
console.log('Light/dark palette contrast passes 4.5:1 for text and status colors.');
