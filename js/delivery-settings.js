(function() {
  'use strict';
  var defaults = { standardFee: 150, freeShippingThreshold: 3000 };
  var current = Object.assign({}, defaults);
  var status = 'loading';
  var pending = null;
  function validate(data) {
    var errors = {}, values = {};
    ['standardFee', 'freeShippingThreshold'].forEach(function(key) {
      var raw = String(data[key] == null ? '' : data[key]).trim();
      var number = Number(raw);
      if (!/^\d+(?:\.\d{1,2})?$/.test(raw) || !Number.isSafeInteger(Math.round(number * 100)) || number < 0 || (key === 'freeShippingThreshold' && number === 0)) errors[key] = key === 'standardFee' ? 'Enter a fee of ₱0 or more, with up to two decimal places.' : 'Enter a threshold greater than ₱0, with up to two decimal places.';
      values[key] = number;
    });
    return { data: values, errors: errors };
  }
  function amount(value) { return '₱' + Number(value).toLocaleString('en-PH', { minimumFractionDigits: Number.isInteger(Number(value)) ? 0 : 2, maximumFractionDigits: 2 }); }
  function calculate(subtotal, settings) {
    settings = settings || current;
    var cents = Math.max(0, Math.round(Number(subtotal || 0) * 100));
    var threshold = Math.round(settings.freeShippingThreshold * 100);
    var shipping = cents === 0 || cents >= threshold ? 0 : settings.standardFee;
    return { shipping: shipping, remaining: shipping === 0 ? 0 : (threshold - cents) / 100, progress: cents === 0 ? 0 : shipping === 0 ? 100 : Math.min(100, cents / threshold * 100) };
  }
  function promotion() { return current.standardFee === 0 ? 'Free standard shipping' : 'Free standard shipping at ' + amount(current.freeShippingThreshold) + ' and above'; }
  function answer() { return status !== 'ready' ? 'Current delivery pricing is unavailable. Check delivery settings at checkout before placing your order.' : 'Standard delivery costs ' + amount(current.standardFee) + ', with free shipping at ' + amount(current.freeShippingThreshold) + ' and above. Metro Manila deliveries usually arrive within 1–3 business days; provincial deliveries may take 3–7 business days.'; }
  function notify() {
    document.querySelectorAll('[data-delivery-message]').forEach(function(element) {
      if (element.dataset.deliveryCustom === 'true') return;
      var kind = element.dataset.deliveryMessage;
      element.textContent = status !== 'ready' ? (kind === 'fee' || kind === 'threshold' ? '—' : 'Delivery pricing available at checkout') : kind === 'fee' ? amount(current.standardFee) : kind === 'threshold' ? amount(current.freeShippingThreshold) : kind === 'above' ? amount(current.freeShippingThreshold) + ' and above' : kind === 'below' ? 'Below ' + amount(current.freeShippingThreshold) : promotion();
    });
    document.querySelectorAll('[data-delivery-retry]').forEach(function(button) { button.hidden = status !== 'error'; button.disabled = status === 'loading'; });
    document.dispatchEvent(new Event('deliverySettingsChanged'));
  }
  async function get() {
    var doc = await firebase.firestore().collection('cms').doc('delivery').get({ source: 'server' });
    var checked = validate(doc.exists ? doc.data() : defaults);
    if (Object.keys(checked.errors).length) throw new Error('Delivery pricing is invalid');
    return checked.data;
  }
  function apply(data) { current = Object.assign({}, data); status = 'ready'; notify(); }
  async function save(data) {
    var checked = validate(data);
    if (Object.keys(checked.errors).length) throw new Error('Invalid delivery settings');
    await firebase.firestore().collection('cms').doc('delivery').set(checked.data, { merge: true });
    apply(checked.data);
    return checked.data;
  }
  function refresh() {
    if (pending) return pending;
    status = 'loading'; notify();
    pending = get().then(function(data) { apply(data); return data; }).catch(function(error) { status = 'error'; notify(); throw error; }).finally(function() { pending = null; });
    return pending;
  }
  window.SmileHubDelivery = { defaults: defaults, validate: validate, calculate: calculate, get: get, save: save, refresh: refresh, apply: apply, settings: function() { return Object.assign({}, current); }, status: function() { return status; }, promotion: promotion, answer: answer };
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('[data-delivery-retry]').forEach(function(button) { button.addEventListener('click', function() { refresh().catch(function() {}); }); });
    if (!document.body.classList.contains('admin-body')) refresh().catch(function() {});
  });
})();
