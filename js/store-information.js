(function () {
  'use strict';
  var defaults = {
    supportEmail: 'support@smilehub.ph',
    supportPhone: '+63 917 555 0142',
    businessHours: 'Monday to Saturday, 8:00 AM–6:00 PM'
  };
  var current = Object.assign({}, defaults);
  function validate(data) {
    var email = String(data.supportEmail || '').trim();
    var phone = String(data.supportPhone || '').trim();
    var hours = String(data.businessHours || '').trim();
    var errors = {};
    if (email.length > 254 || !/^[a-z\d_+%-]+(?:\.[a-z\d_+%-]+)*@(?:[a-z\d](?:[a-z\d-]*[a-z\d])?\.)+[a-z]{2,}$/i.test(email)) errors.supportEmail = 'Enter a valid support email address.';
    if (phone.length > 40 || !/^\+?[\d\s().-]+$/.test(phone) || !/^\d{10,15}$/.test(phone.replace(/\D/g, ''))) errors.supportPhone = 'Enter a phone number with 10–15 digits, including the country code.';
    if (!hours || hours.length > 120) errors.businessHours = 'Enter business hours using 120 characters or fewer.';
    return { data: { supportEmail: email, supportPhone: phone, businessHours: hours }, errors: errors };
  }
  function normalize(data) {
    var checked = validate(Object.assign({}, defaults, data || {}));
    Object.keys(checked.errors).forEach(function(key) { checked.data[key] = defaults[key]; });
    return checked.data;
  }
  function reference() { return firebase.firestore().collection('cms').doc('store-information'); }
  async function get() {
    var snapshot = await reference().get({ source: 'server' });
    return normalize(snapshot.exists ? snapshot.data() : defaults);
  }
  async function save(data) {
    var checked = validate(data);
    if (Object.keys(checked.errors).length) throw new Error('Invalid store information');
    await reference().set(checked.data, { merge: true });
    return checked.data;
  }
  function apply(data) {
    current = normalize(data);
    document.querySelectorAll('[data-store-email]').forEach(function(link) {
      link.setAttribute('href', 'mailto:' + encodeURIComponent(current.supportEmail));
      (link.querySelector('[data-store-email-text]') || link).textContent = current.supportEmail;
    });
    document.querySelectorAll('[data-store-phone]').forEach(function(link) {
      link.setAttribute('href', 'tel:' + current.supportPhone.replace(/[^+\d]/g, ''));
      (link.querySelector('[data-store-phone-text]') || link).textContent = current.supportPhone;
    });
    document.querySelectorAll('[data-store-hours]').forEach(function(element) { element.textContent = current.businessHours; });
  }
  window.SmileHubStoreInformation = { defaults: defaults, get: get, save: save, validate: validate, apply: apply,
    supportAnswer: function() { return 'Use the Contact page form, email ' + current.supportEmail + ', or call ' + current.supportPhone + '. Support hours: ' + current.businessHours + '.'; },
    supportEmail: function() { return current.supportEmail; } };
  document.addEventListener('DOMContentLoaded', function() {
    if (!document.querySelector('[data-store-email], [data-store-phone], [data-store-hours], #faqList')) return;
    get().then(function(data) {
      apply(data);
      document.dispatchEvent(new Event('storeInformationReady'));
    }).catch(function() { /* Keep the existing contact details when the public read is unavailable. */ });
  });
})();
