
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function digitsOnly(input, max) {
    if (!input) return;
    input.setAttribute('inputmode', 'numeric');
    input.setAttribute('autocomplete', 'tel');
    if (max) input.setAttribute('maxlength', String(max));
    input.addEventListener('input', function () {
      var next = input.value.replace(/\D/g, '');
      if (max) next = next.slice(0, max);
      if (input.value !== next) input.value = next;
      input.setCustomValidity('');
    });
  }

  function hardenPhoneFields() {
    document.querySelectorAll('input[type="tel"], input[id*="Phone"], input[name*="phone" i]').forEach(function (input) {
      // Shopee-style PH fields are managed by phone-input.js. Do not overwrite
      // their 10-digit subscriber validation with the old 09XXXXXXXXX rule.
      if (input.dataset.phBound === 'true' || input.closest('.ph-phone-field')) return;
      digitsOnly(input, 11);
      input.setAttribute('pattern', '09[0-9]{9}');
      input.setAttribute('title', 'Enter an 11-digit Philippine mobile number beginning with 09.');
      input.addEventListener('blur', function () {
        if (input.value && !/^09\d{9}$/.test(input.value)) {
          input.setCustomValidity('Enter exactly 11 digits beginning with 09.');
        } else {
          input.setCustomValidity('');
        }
      });
    });

    var otp = document.getElementById('otpInput');
    if (otp) {
      digitsOnly(otp, 6);
      otp.setAttribute('pattern', '[0-9]{6}');
      otp.setAttribute('autocomplete', 'one-time-code');
    }
  }

  function preventDuplicateSubmits() {
    document.querySelectorAll('form').forEach(function (form) {
      form.addEventListener('submit', function () {
        if (!form.checkValidity()) return;
        var submit = form.querySelector('button[type="submit"], input[type="submit"]');
        if (!submit || submit.dataset.allowRepeat === 'true') return;
        submit.dataset.originalText = submit.dataset.originalText || submit.textContent || submit.value;
        submit.setAttribute('aria-busy', 'true');
        setTimeout(function () {
          submit.removeAttribute('aria-busy');
        }, 8000);
      });
    });
  }

  function imageFallbacks() {
    document.querySelectorAll('img').forEach(function (img) {
      img.loading = img.loading || 'lazy';
      img.decoding = 'async';
      img.addEventListener('error', function () {
        if (img.dataset.fallbackApplied) return;
        img.dataset.fallbackApplied = 'true';
        img.src = 'assets/products/default.svg';
        img.alt = img.alt || 'Product image unavailable';
      });
    });
  }

  function accessibleDialogs() {
    document.querySelectorAll('[class*="modal"], .chatbot-panel, .mini-cart-drawer').forEach(function (node) {
      if (!node.getAttribute('role')) node.setAttribute('role', 'dialog');
      node.setAttribute('aria-modal', 'true');
    });
  }

  function externalLinkSafety() {
    document.querySelectorAll('a[target="_blank"]').forEach(function (link) {
      var rel = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      rel.add('noreferrer');
      link.setAttribute('rel', Array.from(rel).join(' '));
    });
  }

  function onlineStatus() {
    var id = 'networkStatusBanner';
    function render() {
      var old = document.getElementById(id);
      if (navigator.onLine) {
        if (old) old.remove();
        return;
      }
      if (old) return;
      var banner = document.createElement('div');
      banner.id = id;
      banner.className = 'network-status-banner';
      banner.setAttribute('role', 'status');
      banner.textContent = 'You are offline. Saved changes will retry when your connection returns.';
      document.body.prepend(banner);
    }
    window.addEventListener('online', render);
    window.addEventListener('offline', render);
    render();
  }

  function firebaseErrorGuard() {
    window.addEventListener('unhandledrejection', function (event) {
      var reason = event.reason || {};
      var code = String(reason.code || '');
      if (!code.startsWith('auth/') && !code.startsWith('firestore/')) return;
      console.error('SmileHub Firebase error:', reason);
      if (window.showToast) {
        var msg = code === 'auth/network-request-failed'
          ? 'Connection problem. Check your internet and try again.'
          : code === 'firestore/permission-denied'
            ? 'This action is not allowed by the current database rules.'
            : 'Something went wrong. Please try again.';
        window.showToast(msg, true);
      }
    });
  }

  ready(function () {
    hardenPhoneFields();
    preventDuplicateSubmits();
    imageFallbacks();
    accessibleDialogs();
    externalLinkSafety();
    onlineStatus();
    firebaseErrorGuard();
  });
})();
