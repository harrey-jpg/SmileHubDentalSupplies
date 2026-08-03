
(function () {
  'use strict';
  var cooldownUntil = 0;

  function byId(id) { return document.getElementById(id); }
  function setMessage(text, error) {
    var node = byId('emailVerificationMessage');
    if (!node) return;
    node.textContent = text || '';
    node.style.color = error ? '#b42318' : '';
  }

  function hasGoogleProvider(user) {
    return (user.providerData || []).some(function (provider) {
      return provider.providerId === 'google.com';
    });
  }

  async function refreshStatus(showConfirmation) {
    var user = firebase.auth().currentUser;
    var badge = byId('emailVerificationBadge');
    var button = byId('resendEmailVerificationBtn');
    var help = byId('emailVerificationHelp');
    if (!user || !badge || !button) return;

    try { await user.reload(); } catch (_) {}
    user = firebase.auth().currentUser || user;

    var providerVerified = hasGoogleProvider(user);
    var verified = Boolean(user.emailVerified || providerVerified);
    badge.textContent = verified ? '✓ Email verified' : '● Email not verified';
    badge.className = 'verification-badge ' + (verified ? 'is-verified' : 'is-pending');
    button.hidden = verified || providerVerified;
    if (help) {
      help.textContent = providerVerified
        ? 'Verified through Google.'
        : verified
          ? 'Your email address is verified.'
          : 'Open the verification email, click the link, then return to this tab. Status refreshes automatically.';
    }
    if (showConfirmation) setMessage(verified ? 'Email verification confirmed.' : 'Still waiting for email verification.', !verified);
  }

  async function resend() {
    var user = firebase.auth().currentUser;
    var button = byId('resendEmailVerificationBtn');
    if (!user || !button) return;
    if (Date.now() < cooldownUntil) return;

    button.disabled = true;
    button.textContent = 'Sending…';
    try {
      await user.sendEmailVerification({
        url: location.origin + '/profile.html'
      });
      cooldownUntil = Date.now() + 60000;
      setMessage('Verification email sent. Check Inbox and Spam.');
      var remaining = 60;
      var timer = setInterval(function () {
        remaining -= 1;
        button.textContent = remaining > 0 ? 'Resend in ' + remaining + 's' : 'Resend verification email';
        button.disabled = remaining > 0;
        if (remaining <= 0) clearInterval(timer);
      }, 1000);
    } catch (error) {
      console.error('[SmileHub email verification]', error);
      var map = {
        'auth/too-many-requests': 'Too many verification emails were requested. Please wait.',
        'auth/requires-recent-login': 'Sign out and sign in again before requesting another verification email.',
        'auth/network-request-failed': 'Network error. Check your connection and try again.'
      };
      setMessage(map[error.code] || ('Could not send verification email: ' + (error.message || error.code)), true);
      button.disabled = false;
      button.textContent = 'Resend verification email';
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var button = byId('resendEmailVerificationBtn');
    if (!button) return;
    button.addEventListener('click', resend);
    firebase.auth().onAuthStateChanged(function () { refreshStatus(false); });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refreshStatus(false);
    });
    window.addEventListener('focus', function () { refreshStatus(false); });
  });
})();
