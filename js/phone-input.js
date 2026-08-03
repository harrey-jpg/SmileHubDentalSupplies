(function () {
  'use strict';

  var IDS = ['profilePhone', 'verifyPhoneInput', 'checkoutPhone', 'billingPhone'];

  function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function subscriberDigits(value) {
    var digits = digitsOnly(value);
    if (digits.indexOf('0063') === 0) digits = digits.slice(4);
    else if (digits.indexOf('63') === 0) digits = digits.slice(2);
    else if (digits.indexOf('0') === 0) digits = digits.slice(1);
    return digits.slice(0, 10);
  }

  function format(value) {
    var sub = subscriberDigits(value);
    return sub ? '+63' + sub : '';
  }

  function isValid(value) {
    return /^\+639\d{9}$/.test(format(value));
  }

  function toLocal(value) {
    var e164 = format(value);
    return isValid(e164) ? '0' + e164.slice(3) : '';
  }

  function setSubscriberValue(input, value) {
    input.value = subscriberDigits(value);
    input.dispatchEvent(new CustomEvent('phphonechange', {
      bubbles: true,
      detail: { e164: format(input.value), valid: isValid(input.value) }
    }));
  }

  function wrap(input) {
    if (input.closest('.ph-phone-field')) return;
    var wrapper = document.createElement('div');
    wrapper.className = 'ph-phone-field';
    var prefix = document.createElement('span');
    prefix.className = 'ph-phone-prefix';
    prefix.textContent = '(+63)';
    prefix.setAttribute('aria-hidden', 'true');
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(prefix);
    wrapper.appendChild(input);
  }

  function bind(input) {
    if (!input || input.dataset.phBound === 'true') return;
    input.dataset.phBound = 'true';
    wrap(input);

    input.type = 'tel';
    input.inputMode = 'numeric';
    input.autocomplete = 'tel-national';
    input.maxLength = 10;
    input.placeholder = '9XXXXXXXXX';
    input.pattern = '9\\d{9}';
    input.title = 'Enter 10 digits starting with 9';

    input.value = subscriberDigits(input.value);

    input.addEventListener('keydown', function (event) {
      if (event.ctrlKey || event.metaKey || event.altKey ||
          ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End','Enter'].indexOf(event.key) >= 0) return;
      if (event.key.length === 1 && !/\d/.test(event.key)) event.preventDefault();
    });

    input.addEventListener('input', function () {
      var sub = subscriberDigits(input.value);
      if (sub && sub.charAt(0) !== '9') sub = '';
      input.value = sub;
      input.setCustomValidity(!sub || /^9\d{9}$/.test(sub) ? '' : 'Enter 10 digits starting with 9.');
      input.dispatchEvent(new CustomEvent('phphonechange', {
        bubbles: true,
        detail: { e164: format(sub), valid: isValid(sub) }
      }));
    });

    input.addEventListener('paste', function (event) {
      event.preventDefault();
      var text = (event.clipboardData || window.clipboardData).getData('text');
      setSubscriberValue(input, text);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    input.addEventListener('blur', function () {
      var sub = subscriberDigits(input.value);
      input.setCustomValidity(!sub || /^9\d{9}$/.test(sub) ? '' : 'Enter 10 digits starting with 9.');
    });
  }

  function bindAll() {
    IDS.forEach(function (id) { bind(document.getElementById(id)); });
  }

  window.SmileHubPhone = {
    format: format,
    isValid: isValid,
    toLocal: toLocal,
    subscriberDigits: subscriberDigits,
    setValue: function (inputOrId, value) {
      var input = typeof inputOrId === 'string' ? document.getElementById(inputOrId) : inputOrId;
      if (input) setSubscriberValue(input, value);
    },
    bind: bind,
    bindAll: bindAll
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindAll);
  else bindAll();
})();
