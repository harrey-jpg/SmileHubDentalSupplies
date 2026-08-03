(function () {
  'use strict';

  var flows = {};
  var cooldowns = {};
  var recaptchaSerial = 0;

  function byId(id) { return document.getElementById(id); }
  function digits(value) { return String(value || '').replace(/\D/g, ''); }

  function normalizePH(value) {
    if (window.SmileHubPhone && typeof window.SmileHubPhone.format === 'function') {
      var formatted = window.SmileHubPhone.format(value);
      return /^\+639\d{9}$/.test(formatted) ? formatted : null;
    }
    var raw = digits(value);
    if (raw.indexOf('63') === 0) raw = raw.slice(2);
    if (raw.indexOf('0') === 0) raw = raw.slice(1);
    return /^9\d{9}$/.test(raw) ? '+63' + raw : null;
  }

  function maskedPhone(phone) {
    if (!phone || !/^\+639\d{9}$/.test(phone)) return 'your number';
    var local = phone.slice(3);
    return '(+63) ' + local.slice(0, 3) + ' *** ' + local.slice(-4);
  }

  function friendlyFirebaseError(error) {
    var code = error && error.code ? error.code : '';
    var map = {
      'auth/invalid-phone-number': 'Enter a valid 10-digit Philippine mobile number beginning with 9.',
      'auth/missing-phone-number': 'Enter your mobile number first.',
      'auth/captcha-check-failed': 'The security check failed. Please try Send OTP again.',
      'auth/invalid-app-credential': 'The security check expired. Please try Send OTP again.',
      'auth/too-many-requests': 'Too many verification attempts. Please wait before trying again.',
      'auth/quota-exceeded': 'The Firebase SMS quota has been reached.',
      'auth/unauthorized-domain': 'This website domain is not authorized for Firebase Phone Authentication.',
      'auth/operation-not-allowed': 'Firebase rejected Phone Authentication. Check Phone provider, SMS region policy, and project configuration.',
      'auth/network-request-failed': 'Network error. Check your connection and try again.',
      'auth/internal-error': 'Firebase could not start phone verification. Please try again.',
      'auth/argument-error': 'Phone verification could not start because the page configuration is incomplete.',
      'auth/invalid-verification-code': 'The verification code is incorrect.',
      'auth/code-expired': 'The verification code expired. Request a new one.',
      'auth/session-expired': 'The verification session expired. Request a new code.',
      'auth/credential-already-in-use': 'This phone number is already linked to another account.',
      'auth/provider-already-linked': 'A phone number is already linked to this account.',
      'auth/requires-recent-login': 'For security, sign out and sign in again before changing the verified phone number.'
    };
    var message = map[code] || (error && error.message ? error.message : 'Phone verification failed.');
    return code ? message + ' (' + code + ')' : message;
  }

  function setText(id, text, isError) {
    var node = byId(id);
    if (!node) return;
    node.textContent = text || '';
    node.classList.toggle('is-error', Boolean(isError));
  }

  function setStatus(flow, text, isError) {
    setText(flow.ids.status, text, isError);
    setText(flow.ids.modalStatus, text, isError);
  }

  function setBusy(button, busy, busyText) {
    if (!button) return;
    if (!button.dataset.originalLabel) button.dataset.originalLabel = button.textContent;
    button.disabled = busy;
    button.textContent = busy ? busyText : button.dataset.originalLabel;
  }

  function clearVerifier(flow) {
    if (flow.verifier) {
      try { flow.verifier.clear(); } catch (_) {}
    }
    flow.verifier = null;
    var host = byId(flow.ids.recaptcha);
    if (host) {
      while (host.firstChild) host.removeChild(host.firstChild);
    }
  }

  function createVerifier(flow) {
    clearVerifier(flow);
    var host = byId(flow.ids.recaptcha);
    if (!host) throw new Error('Missing reCAPTCHA host.');
    var child = document.createElement('div');
    child.id = flow.name + '-recaptcha-' + (++recaptchaSerial);
    host.appendChild(child);

    flow.verifier = new firebase.auth.RecaptchaVerifier(child.id, {
      size: 'invisible',
      callback: function () {},
      'expired-callback': function () {
        setStatus(flow, 'The security check expired. Click Send OTP again.', true);
        clearVerifier(flow);
      }
    });
    return flow.verifier;
  }

  function openModal(flow) {
    var modal = byId(flow.ids.modal);
    if (!modal) return;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('otp-modal-open');
    var masked = byId(flow.ids.masked);
    if (masked) masked.textContent = maskedPhone(flow.phone);
    clearOtpInputs(flow);
    var first = getOtpInputs(flow)[0];
    if (first) setTimeout(function () { first.focus(); }, 30);
  }

  function closeModal(flow) {
    var modal = byId(flow.ids.modal);
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('otp-modal-open');
    setText(flow.ids.modalStatus, '');
  }

  function getOtpInputs(flow) {
    var group = byId(flow.ids.digits);
    return group ? Array.prototype.slice.call(group.querySelectorAll('input')) : [];
  }

  function syncHiddenCode(flow) {
    var code = getOtpInputs(flow).map(function (input) { return digits(input.value).slice(0, 1); }).join('');
    var hidden = byId(flow.ids.code);
    if (hidden) hidden.value = code;
    return code;
  }

  function clearOtpInputs(flow) {
    getOtpInputs(flow).forEach(function (input) { input.value = ''; });
    var hidden = byId(flow.ids.code);
    if (hidden) hidden.value = '';
  }

  function initOtpInputs(flow) {
    var inputs = getOtpInputs(flow);
    inputs.forEach(function (input, index) {
      input.addEventListener('input', function () {
        var value = digits(this.value);
        if (value.length > 1) {
          value.slice(0, inputs.length).split('').forEach(function (digit, offset) {
            if (inputs[index + offset]) inputs[index + offset].value = digit;
          });
        } else {
          this.value = value.slice(0, 1);
        }
        syncHiddenCode(flow);
        var nextIndex = Math.min(index + Math.max(value.length, 1), inputs.length - 1);
        if (value && inputs[nextIndex] && nextIndex !== index) inputs[nextIndex].focus();
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Backspace' && !this.value && index > 0) {
          inputs[index - 1].focus();
          inputs[index - 1].value = '';
          syncHiddenCode(flow);
        }
        if (event.key === 'ArrowLeft' && index > 0) inputs[index - 1].focus();
        if (event.key === 'ArrowRight' && index < inputs.length - 1) inputs[index + 1].focus();
      });
      input.addEventListener('paste', function (event) {
        var pasted = digits((event.clipboardData || window.clipboardData).getData('text')).slice(0, 6);
        if (!pasted) return;
        event.preventDefault();
        pasted.split('').forEach(function (digit, i) {
          if (inputs[i]) inputs[i].value = digit;
        });
        syncHiddenCode(flow);
        var target = inputs[Math.min(pasted.length, inputs.length) - 1];
        if (target) target.focus();
      });
    });
  }

  function beginCooldown(flow) {
    clearInterval(cooldowns[flow.name]);
    var remaining = 60;
    var button = byId(flow.ids.resend);
    if (!button) return;

    function render() {
      button.disabled = remaining > 0;
      button.textContent = remaining > 0 ? 'Resend in ' + remaining + 's' : 'Resend OTP';
    }
    render();
    cooldowns[flow.name] = setInterval(function () {
      remaining -= 1;
      render();
      if (remaining <= 0) clearInterval(cooldowns[flow.name]);
    }, 1000);
  }

  async function sendOtp(flow) {
    var user = firebase.auth().currentUser;
    if (!user) return setStatus(flow, 'Please sign in again before verifying your phone.', true);

    var input = byId(flow.ids.phone);
    var phone = normalizePH(input && input.value);
    if (!phone) return setStatus(flow, 'Enter 10 digits beginning with 9 after the (+63) prefix.', true);

    var sendButton = byId(flow.ids.send);
    var resendButton = byId(flow.ids.resend);
    setBusy(sendButton, true, 'Sending…');
    if (resendButton && !resendButton.disabled) setBusy(resendButton, true, 'Sending…');
    setStatus(flow, 'Preparing secure verification…');

    try {
      var provider = new firebase.auth.PhoneAuthProvider();
      flow.verificationId = await provider.verifyPhoneNumber(phone, createVerifier(flow));
      flow.phone = phone;
      openModal(flow);
      beginCooldown(flow);
      setStatus(flow, 'Code sent. Enter the 6-digit verification code.', false);
    } catch (error) {
      console.error('[SmileHub OTP][' + flow.name + '] send failed:', error);
      clearVerifier(flow);
      setStatus(flow, friendlyFirebaseError(error), true);
    } finally {
      setBusy(sendButton, false, '');
      if (resendButton && resendButton.dataset.originalLabel) setBusy(resendButton, false, '');
    }
  }

  async function verifyOtp(flow) {
    var user = firebase.auth().currentUser;
    var code = syncHiddenCode(flow);
    if (!user || !flow.verificationId) return setStatus(flow, 'Send an OTP first.', true);
    if (!/^\d{6}$/.test(code)) return setStatus(flow, 'Enter the complete 6-digit code.', true);

    var verifyButton = byId(flow.ids.verify);
    setBusy(verifyButton, true, 'Verifying…');

    try {
      var credential = firebase.auth.PhoneAuthProvider.credential(flow.verificationId, code);
      var providers = user.providerData || [];
      var hasPhone = providers.some(function (item) { return item.providerId === 'phone'; });

      if (user.phoneNumber === flow.phone) {
        // Already verified.
      } else if (hasPhone) {
        await user.updatePhoneNumber(credential);
      } else {
        await user.linkWithCredential(credential);
      }

      var local = '0' + flow.phone.slice(3);
      await firebase.firestore().collection('users').doc(user.uid).set({
        phone: local,
        phoneLocal: local,
        phoneE164: flow.phone,
        phoneVerified: true,
        phoneVerifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      ['profilePhone', 'verifyPhoneInput', 'checkoutPhone', 'billingPhone'].forEach(function (id) {
        if (!byId(id)) return;
        if (window.SmileHubPhone) window.SmileHubPhone.setValue(id, flow.phone);
        else byId(id).value = flow.phone.slice(3);
      });

      if (window.SmileHubProfileUI && window.SmileHubProfileUI.updatePhoneStatus) {
        window.SmileHubProfileUI.updatePhoneStatus(true, flow.phone);
      }
      var badge = byId('checkoutPhoneVerification');
      if (badge) {
        badge.className = 'checkout-verified-note';
        badge.textContent = '✓ Verified phone number: (+63) ' + flow.phone.slice(3);
      }
      var card = byId('checkoutPhoneVerifyCard');
      if (card) card.classList.add('is-complete');

      setStatus(flow, 'Phone number verified successfully.', false);
      clearOtpInputs(flow);
      clearVerifier(flow);
      setTimeout(function () { closeModal(flow); }, 700);
    } catch (error) {
      console.error('[SmileHub OTP][' + flow.name + '] verification failed:', error);
      setStatus(flow, friendlyFirebaseError(error), true);
    } finally {
      setBusy(verifyButton, false, '');
    }
  }

  function register(config) {
    if (!byId(config.ids.send)) return;
    var flow = {
      name: config.name,
      ids: config.ids,
      verifier: null,
      verificationId: null,
      phone: null
    };
    flows[config.name] = flow;

    byId(flow.ids.send).addEventListener('click', function () { sendOtp(flow); });
    if (byId(flow.ids.resend)) byId(flow.ids.resend).addEventListener('click', function () { sendOtp(flow); });
    if (byId(flow.ids.verify)) byId(flow.ids.verify).addEventListener('click', function () { verifyOtp(flow); });

    var modal = byId(flow.ids.modal);
    if (modal) {
      modal.querySelectorAll('[data-otp-close]').forEach(function (button) {
        button.addEventListener('click', function () { closeModal(flow); });
      });
    }

    initOtpInputs(flow);
  }

  document.addEventListener('DOMContentLoaded', function () {
    register({
      name: 'profile',
      ids: {
        phone: 'profilePhone',
        send: 'sendOtpButton',
        resend: 'resendOtpButton',
        code: 'otpInput',
        verify: 'verifyOtpButton',
        recaptcha: 'recaptcha-container',
        status: 'profileOtpStatus',
        modalStatus: 'profileOtpModalStatus',
        modal: 'profileOtpModal',
        masked: 'profileOtpMaskedNumber',
        digits: 'profileOtpDigits'
      }
    });

    register({
      name: 'checkout',
      ids: {
        phone: 'checkoutPhone',
        send: 'checkoutSendOtp',
        resend: 'checkoutResendOtp',
        code: 'checkoutOtpCode',
        verify: 'checkoutVerifyOtp',
        recaptcha: 'checkoutRecaptcha',
        status: 'checkoutOtpStatus',
        modalStatus: 'checkoutOtpModalStatus',
        modal: 'checkoutOtpModal',
        masked: 'checkoutOtpMaskedNumber',
        digits: 'checkoutOtpDigits'
      }
    });
  });

  window.SmileHubVerification = {
    normalizePH: normalizePH,
    friendlyFirebaseError: friendlyFirebaseError
  };
})();