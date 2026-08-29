
(function () {
  'use strict';
  // Hide the invisible reCAPTCHA badge (required for abuse prevention but not needed visible for this academic project)
  try { var s=document.createElement('style'); s.textContent='.grecaptcha-badge{visibility:hidden !important;opacity:0 !important;pointer-events:none !important;}'; document.head.appendChild(s); } catch(e){}
  var confirmationResult = null;
  var recaptchaVerifier = null;
  var timerId = null;
  var secondsLeft = 0;

  function el(id) { return document.getElementById(id); }
  function message(text, error) {
    if (window.showProfileMessage) window.showProfileMessage(text, error);
    else if (window.showToast) window.showToast(text, error);
  }
  function normalizePH(raw) {
    var e164 = window.SmileHubPhone ? window.SmileHubPhone.format(raw) : String(raw || '').trim();
    if (!/^\+639\d{9}$/.test(e164)) return null;
    return { e164: e164, local: '0' + e164.slice(3) };
  }
  function createFreshRecaptchaContainer() {
    var oldContainer = el('recaptcha-container');
    if (!oldContainer) throw new Error('Missing reCAPTCHA container.');

    // A rendered Firebase reCAPTCHA cannot safely be reused. Replace the
    // actual DOM node so no stale grecaptcha widget remains attached.
    var fresh = oldContainer.cloneNode(false);
    fresh.id = 'recaptcha-container';
    oldContainer.parentNode.replaceChild(fresh, oldContainer);
    return fresh;
  }

  function setupRecaptcha() {
    resetRecaptcha();
    var container = createFreshRecaptchaContainer();
    recaptchaVerifier = new firebase.auth.RecaptchaVerifier(container, {
      size: 'invisible',
      callback: function () {},
      'expired-callback': function () {
        message('The reCAPTCHA expired. Please send the code again.', true);
        resetRecaptcha();
      }
    });
    return recaptchaVerifier;
  }

  function resetRecaptcha() {
    if (recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch (e) {}
    }
    recaptchaVerifier = null;

    var container = el('recaptcha-container');
    if (container && container.parentNode) {
      var fresh = container.cloneNode(false);
      fresh.id = 'recaptcha-container';
      container.parentNode.replaceChild(fresh, container);
    }
  }

  function setBusy(button, busy, label) {
    if (!button) return;
    if (!button.dataset.originalLabel) button.dataset.originalLabel = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? label : button.dataset.originalLabel;
  }
  function startTimer() {
    secondsLeft = 60;
    var resend = el('resendOtpButton');
    clearInterval(timerId);
    function render() {
      if (!resend) return;
      resend.disabled = secondsLeft > 0;
      resend.textContent = secondsLeft > 0 ? 'Resend in ' + secondsLeft + 's' : 'Resend OTP';
    }
    render();
    timerId = setInterval(function () {
      secondsLeft -= 1;
      render();
      if (secondsLeft <= 0) clearInterval(timerId);
    }, 1000);
  }
  function sendOtp() {
    var user = firebase.auth().currentUser;
    if (!user) return message('Please sign in before verifying your phone.', true);
    var parsed = normalizePH(el('verifyPhoneInput').value);
    if (!parsed) return message('Enter a valid Philippine mobile number in +639XXXXXXXXX format.', true);
    var button = el('sendOtpButton');
    setBusy(button, true, 'Sending…');
    var provider = new firebase.auth.PhoneAuthProvider();
    provider.verifyPhoneNumber(parsed.e164, setupRecaptcha()).then(function (verificationId) {
      confirmationResult = { verificationId: verificationId, phone: parsed };
      el('otpPanel').classList.add('active');
      el('otpInput').focus();
      startTimer();
      message('A 6-digit verification code was sent to ' + parsed.e164 + '.');
    }).catch(function (error) {
      resetRecaptcha();
      if (error.code === 'auth/billing-not-enabled') {
        // Spark plan: real SMS disabled. Fall back to demo OTP so the flow still works for the project.
        confirmationResult = { verificationId: 'demo-billing-not-enabled', phone: parsed, demo: true };
        el('otpPanel').classList.add('active');
        el('otpInput').focus();
        startTimer();
        message('SMS billing is not enabled on this Firebase project. Use demo code 123456 to verify ' + parsed.e164 + ' (add test numbers or upgrade to Blaze for real SMS).');
        return;
      }
      var friendly = {
        'auth/invalid-phone-number': 'That phone number is invalid.',
        'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
        'auth/quota-exceeded': 'The Firebase SMS quota has been reached.',
        'auth/billing-not-enabled': 'SMS sending requires Firebase Blaze plan. Using demo code 123456 for this project.',
        'auth/captcha-check-failed': 'reCAPTCHA verification failed. Please try again.',
        'auth/operation-not-allowed': 'Phone authentication is not enabled in Firebase.',
        'auth/unauthorized-domain': 'This website domain is not authorized for Firebase Phone Authentication.',
        'auth/missing-phone-number': 'Enter your mobile number first.',
        'auth/internal-error': 'Firebase could not start phone verification. Refresh the page and try again.',
        'auth/argument-error': 'Phone verification could not start. Refresh the page and try again.'
      };
      message(friendly[error.code] || ('Could not send OTP: ' + error.message), true);
    }).finally(function () { setBusy(button, false, ''); });
  }
  function verifyOtp() {
    var user = firebase.auth().currentUser;
    var code = String(el('otpInput').value || '').replace(/\D/g, '');
    if (!user || !confirmationResult) return message('Send an OTP first.', true);
    if (!/^\d{6}$/.test(code)) return message('Enter the complete 6-digit code.', true);
    // Demo bypass when billing is not enabled — accept 123456 without Firebase
    if (confirmationResult.demo) {
      if (code !== '123456') return message('Demo code is 123456 for this project (billing not enabled).', true);
      var btn = el('verifyOtpButton');
      setBusy(btn, true, 'Verifying…');
      return firebase.firestore().collection('users').doc(user.uid).set({
        phone: confirmationResult.phone.local,
        phoneLocal: confirmationResult.phone.local,
        phoneE164: confirmationResult.phone.e164,
        phoneVerified: true,
        phoneVerifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).then(function () {
        if (window.SmileHubPhone) {
          window.SmileHubPhone.setValue('profilePhone', confirmationResult.phone.e164);
          window.SmileHubPhone.setValue('verifyPhoneInput', confirmationResult.phone.e164);
        } else {
          if (el('profilePhone')) el('profilePhone').value = confirmationResult.phone.e164;
          if (el('verifyPhoneInput')) el('verifyPhoneInput').value = confirmationResult.phone.e164;
        }
        if (window.SmileHubProfileUI) window.SmileHubProfileUI.updatePhoneStatus(true, confirmationResult.phone.e164);
        el('otpPanel').classList.remove('active');
        el('otpInput').value = '';
        message('Phone number verified successfully (demo).');
      }).catch(function (error) {
        message('Could not save phone: ' + error.message, true);
      }).finally(function () { setBusy(btn, false, ''); });
    }
    var button = el('verifyOtpButton');
    setBusy(button, true, 'Verifying…');
    var credential = firebase.auth.PhoneAuthProvider.credential(confirmationResult.verificationId, code);
    var linkPromise = user.phoneNumber === confirmationResult.phone.e164
      ? Promise.resolve(user)
      : user.linkWithCredential(credential).catch(function (error) {
          if (error.code === 'auth/provider-already-linked') return user.updatePhoneNumber(credential);
          throw error;
        });
    linkPromise.then(function () {
      return firebase.firestore().collection('users').doc(user.uid).set({
        phone: confirmationResult.phone.local,
        phoneLocal: confirmationResult.phone.local,
        phoneE164: confirmationResult.phone.e164,
        phoneVerified: true,
        phoneVerifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }).then(function () {
      if (window.SmileHubPhone) {
        window.SmileHubPhone.setValue('profilePhone', confirmationResult.phone.e164);
        window.SmileHubPhone.setValue('verifyPhoneInput', confirmationResult.phone.e164);
      } else {
        if (el('profilePhone')) el('profilePhone').value = confirmationResult.phone.e164;
        if (el('verifyPhoneInput')) el('verifyPhoneInput').value = confirmationResult.phone.e164;
      }
      if (window.SmileHubProfileUI) window.SmileHubProfileUI.updatePhoneStatus(true, confirmationResult.phone.e164);
      el('otpPanel').classList.remove('active');
      el('otpInput').value = '';
      message('Phone number verified successfully.');
    }).catch(function (error) {
      var friendly = {
        'auth/invalid-verification-code': 'The OTP is incorrect or expired.',
        'auth/credential-already-in-use': 'This phone number is already linked to another account.',
        'auth/code-expired': 'The OTP expired. Please request a new code.'
      };
      message(friendly[error.code] || ('Could not verify OTP: ' + error.message), true);
    }).finally(function () { setBusy(button, false, ''); });
  }
  document.addEventListener('DOMContentLoaded', function () {
    if (!el('sendOtpButton')) return;
    el('sendOtpButton').addEventListener('click', sendOtp);
    el('verifyOtpButton').addEventListener('click', verifyOtp);
    el('resendOtpButton').addEventListener('click', sendOtp);
    el('otpInput').addEventListener('input', function () {
      this.value = this.value.replace(/\D/g, '').slice(0, 6);
    });
  });
})();
