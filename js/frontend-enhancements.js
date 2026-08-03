
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  function announce(message) {
    var region = document.getElementById('siteLiveRegion');
    if (!region) {
      region = document.createElement('div');
      region.id = 'siteLiveRegion';
      region.className = 'sr-only';
      region.setAttribute('aria-live', 'polite');
      region.setAttribute('aria-atomic', 'true');
      document.body.appendChild(region);
    }
    region.textContent = '';
    setTimeout(function () { region.textContent = message; }, 20);
  }

  function enhanceForms() {
    document.querySelectorAll('input, select, textarea').forEach(function (field) {
      if (!field.id) return;
      var label = document.querySelector('label[for="' + field.id + '"]');
      if (!label) {
        var parentLabel = field.closest('label');
        if (!parentLabel) field.setAttribute('aria-label', field.name || field.placeholder || field.id);
      }
      field.addEventListener('invalid', function () {
        field.setAttribute('aria-invalid', 'true');
      });
      field.addEventListener('input', function () {
        field.removeAttribute('aria-invalid');
      });
    });
  }

  function enhanceButtons() {
    document.addEventListener('click', function (event) {
      var button = event.target.closest('.add-cart');
      if (!button) return;
      if (window.customerIsLoggedIn && !window.customerIsLoggedIn()) return;
      var old = button.innerHTML;
      setTimeout(function () {
        if (button.disabled) return;
        button.classList.add('is-added');
        button.innerHTML = '<span aria-hidden="true">✓</span> Added';
        announce((button.dataset.name || 'Product') + ' added to cart');
        setTimeout(function () {
          button.classList.remove('is-added');
          button.innerHTML = old;
        }, 1600);
      }, 80);
    });
  }

  function setupPasswordStrength() {
    var input = document.getElementById('registerPassword');
    var meter = document.getElementById('passwordStrengthBar');
    var text = document.getElementById('passwordStrengthText');
    var confirm = document.getElementById('registerConfirmPassword');
    if (!input || !meter || !text) return;

    function scorePassword(value) {
      var score = 0;
      if (value.length >= 8) score++;
      if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
      if (/\d/.test(value)) score++;
      if (/[^A-Za-z0-9]/.test(value)) score++;
      return score;
    }

    function update() {
      var score = scorePassword(input.value);
      var labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
      meter.style.width = (score * 25) + '%';
      meter.dataset.score = String(score);
      text.textContent = input.value ? labels[score] : 'Use 8+ characters with a number and symbol.';
      if (confirm && confirm.value) validateConfirm();
    }

    function validateConfirm() {
      if (!confirm) return;
      if (confirm.value && confirm.value !== input.value) {
        confirm.setCustomValidity('Passwords do not match.');
        confirm.setAttribute('aria-invalid', 'true');
      } else {
        confirm.setCustomValidity('');
        confirm.removeAttribute('aria-invalid');
      }
    }

    input.addEventListener('input', update);
    if (confirm) confirm.addEventListener('input', validateConfirm);
    update();
  }

  function setupAuthLoading() {
    ['loginForm', 'registerForm'].forEach(function (id) {
      var form = document.getElementById(id);
      if (!form) return;
      form.addEventListener('submit', function () {
        if (!form.checkValidity()) return;
        var submit = form.querySelector('button[type="submit"]');
        if (!submit) return;
        var original = submit.textContent;
        submit.disabled = true;
        submit.dataset.originalText = original;
        submit.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Please wait…';
        setTimeout(function () {
          if (submit.disabled) {
            submit.disabled = false;
            submit.textContent = submit.dataset.originalText || original;
          }
        }, 9000);
      });
    });
  }

  function setupRecentlyViewed() {
    if (!/product\.html$/i.test(location.pathname)) return;
    var params = new URLSearchParams(location.search);
    var id = params.get('id');
    if (!id) return;
    var items = [];
    try { items = JSON.parse(localStorage.getItem('smilehub_recently_viewed') || '[]'); } catch (e) {}
    items = items.filter(function (item) { return String(item.id) !== String(id); });
    items.unshift({ id: id, viewedAt: Date.now() });
    localStorage.setItem('smilehub_recently_viewed', JSON.stringify(items.slice(0, 8)));
  }

  function setupNewsletter() {
    document.querySelectorAll('.newsletter-form').forEach(function (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var email = form.querySelector('input[type="email"]');
        if (!email || !email.checkValidity()) {
          if (email) email.reportValidity();
          return;
        }
        if (window.showToast) window.showToast('Thanks! You are subscribed to SmileHub updates.');
        announce('Newsletter subscription successful');
        form.reset();
      });
    });
  }

  function setupSkipLink() {
    if (document.querySelector('.skip-link')) return;
    var main = document.querySelector('main');
    if (!main) return;
    if (!main.id) main.id = 'mainContent';
    var link = document.createElement('a');
    link.href = '#' + main.id;
    link.className = 'skip-link';
    link.textContent = 'Skip to main content';
    document.body.insertBefore(link, document.body.firstChild);
  }

  ready(function () {
    enhanceForms();
    enhanceButtons();
    setupPasswordStrength();
    setupAuthLoading();
    setupRecentlyViewed();
    setupNewsletter();
    setupSkipLink();
  });
})();
