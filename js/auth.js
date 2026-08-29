// Demo accounts grant their role purely from an email match on the client,
// which is not a security boundary. Keep this disabled in production so roles
// come exclusively from the Firestore users/{uid} document.
const DEMO_MODE_ENABLED = false;

const DEMO_ACCOUNTS = {
  'admin@smilehub.ph': { role: 'admin', firstName: 'Admin', lastName: 'User' },
  'staff@smilehub.ph': { role: 'staff', firstName: 'Staff', lastName: 'User' },
  'super@smilehub.ph': { role: 'superadmin', firstName: 'Super', lastName: 'Admin' },
  'customer@smilehub.ph': { role: 'customer', firstName: 'Demo', lastName: 'Customer' }
};
function demoRoleFor(email) {
  return DEMO_MODE_ENABLED ? (DEMO_ACCOUNTS[email] || {}) : {};
}
const RETURN_KEY = 'smilehub_return_page';
const AUTH_KEY = 'smilehub_logged_in_user';

const PUBLIC_PAGES = [
  'index.html',
  'homepage.html',
  'login.html',
  'register.html',
  '404.html',
  'offline.html',
  'maintenance.html'
];

const currentPage = location.pathname.split('/').pop() || 'index.html';

function storageGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}
function storageRemove(key) {
  try { localStorage.removeItem(key); } catch (e) {}
}
function sessionGet(key) {
  try { return sessionStorage.getItem(key); } catch (e) { return null; }
}
function sessionSet(key, value) {
  try { sessionStorage.setItem(key, value); } catch (e) {}
}
function sessionRemove(key) {
  try { sessionStorage.removeItem(key); } catch (e) {}
}

// window.name is readable/writable across origins during navigation, so it
// must never be trusted as a data store — values injected there flow straight
// into innerHTML sinks elsewhere. Session + localStorage are sufficient.
const SmileHubStorage = {
  get(key, fallbackValue) {
    const ss = sessionGet(key);
    if (ss !== null) {
      try { return JSON.parse(ss); } catch (e) {}
    }

    const ls = storageGet(key);
    if (ls !== null) {
      try {
        const parsedValue = JSON.parse(ls);
        sessionSet(key, ls);
        return parsedValue;
      } catch (e) {}
    }

    return fallbackValue;
  },
  set(key, value) {
    const json = JSON.stringify(value);
    sessionSet(key, json);
    storageSet(key, json);
  },
  remove(key) {
    sessionRemove(key);
    storageRemove(key);
  }
};

window.SmileHubStorage = SmileHubStorage;

function getCachedUser() {
  try {
    var cached = JSON.parse(sessionStorage.getItem(AUTH_KEY));
    if (cached) return cached;
  } catch(e) {}
  return null;
}

function cacheUser(user) {
  if (user) {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(AUTH_KEY);
  }
}

function getLoggedInUser() {
  return getCachedUser();
}

function getCurrentAccount() {
  return getCachedUser();
}

async function fetchUserProfile(uid) {
  try {
    const doc = await firebase.firestore().collection('users').doc(uid).get();
    return doc.exists ? doc.data() : null;
  } catch(e) {
    return null;
  }
}

var authReady = false;

firebase.auth().onAuthStateChanged(function(firebaseUser) {
  if (firebaseUser) {
    var demo = demoRoleFor(firebaseUser.email);
    cacheUser({
      uid: firebaseUser.uid,
      name: firebaseUser.email,
      email: firebaseUser.email,
      role: demo.role || 'customer',
      phone: '',
      address: '',
      firstName: demo.firstName || '',
      lastName: demo.lastName || '',
      password: ''
    });

    Promise.all([
      fetchUserProfile(firebaseUser.uid),
      firebase.firestore().collection('user_registrations').doc(firebaseUser.email).get(),
      firebase.firestore().collection('accounts').doc(firebaseUser.email).get()
    ]).then(function(results) {
      var profile = results[0];
      var regDoc = results[1];
      var accountDoc = results[2];

      var role = demo.role || 'customer';
      var firstName = demo.firstName || '';
      var lastName = demo.lastName || '';
      var name = firebaseUser.email;

      if (profile) {
        role = profile.role || role;
        firstName = profile.firstName || firstName;
        lastName = profile.lastName || lastName;
        name = profile.displayName || name;
      }

      if (!demo.role && regDoc.exists && (regDoc.data().claimed === false || !profile)) {
        var reg = regDoc.data();
        role = reg.role || role;
        firstName = reg.firstName || firstName;
        lastName = reg.lastName || lastName;
        name = reg.displayName || name;
      }

      if (!profile && !demo.role && accountDoc.exists) {
        var acct = accountDoc.data();
        role = acct.role || role;
        firstName = acct.firstName || firstName;
        lastName = acct.lastName || lastName;
        name = acct.name || name;
      }

      // Self-heal: ensure a users/{uid} profile doc exists so Firestore
      // rules (isAdmin) recognize this account. Without it, collection
      // reads like the accounts list are denied.
      if (!profile) {
        firebase.firestore().collection('users').doc(firebaseUser.uid).set({
          email: firebaseUser.email,
          role: role,
          firstName: firstName,
          lastName: lastName,
          displayName: name
        }, { merge: true }).catch(function(healError) {
          console.warn('SmileHub profile self-heal failed:', healError);
        });
      } else if (!profile.role || ['admin', 'staff', 'superadmin'].indexOf(profile.role) === -1) {
        console.info('SmileHub: users/' + firebaseUser.uid + ' exists but role is "' + profile.role + '" — update it in Firebase Console if this should be an admin.');
      }

      cacheUser({
        uid: firebaseUser.uid,
        name: name,
        email: firebaseUser.email,
        role: role,
        phone: (profile && profile.phone) || '',
        address: (profile && profile.address) || '',
        firstName: firstName,
        lastName: lastName,
        password: ''
      });
      updateAccountLink();
    }).catch(function(error) {
      console.warn('Could not resolve SmileHub profile after sign-in:', error);
    }).then(function() {
      authReady = true;
      afterAuthReady();
    });
  } else {
    if (authReady) {
      cacheUser(null);
      afterAuthReady();
    }
    setTimeout(function() {
      if (!authReady) {
        authReady = true;
        afterAuthReady();
      }
    }, 5000);
  }
});

function afterAuthReady() {
  protectPage();
  updateAccountLink();
  protectLinksForGuests();
  document.dispatchEvent(new Event('authReady'));
}

function handleGoogleLogin() {
  var button = document.getElementById('googleSignInBtn');
  var originalLabel = button ? button.innerHTML : '';

  function setGoogleButtonBusy(isBusy) {
    if (!button) return;
    button.disabled = isBusy;
    button.setAttribute('aria-busy', isBusy ? 'true' : 'false');
    if (isBusy) {
      button.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Connecting to Google...';
    } else {
      button.innerHTML = originalLabel;
    }
  }

  function cacheFirebaseGoogleUser(user, role, profile) {
    var displayName = (profile && profile.displayName) || user.displayName || user.email || 'SmileHub Customer';
    var nameParts = displayName.trim().split(/\s+/);
    var firstName = (profile && profile.firstName) || nameParts[0] || '';
    var lastName = (profile && profile.lastName) || nameParts.slice(1).join(' ') || '';

    cacheUser({
      uid: user.uid,
      name: displayName,
      email: user.email || '',
      role: role || (profile && profile.role) || 'customer',
      phone: (profile && profile.phone) || '',
      address: (profile && profile.address) || '',
      firstName: firstName,
      lastName: lastName,
      password: ''
    });

    return {
      displayName: displayName,
      firstName: firstName,
      lastName: lastName
    };
  }

  function syncGoogleProfile(user) {
    var fallback = cacheFirebaseGoogleUser(user, 'customer', null);

    // Authentication must not fail just because optional Firestore profile
    // reads or writes are unavailable. Profile syncing is best-effort only.
    return Promise.all([
      fetchUserProfile(user.uid),
      firebase.firestore().collection('accounts').doc(user.email).get().catch(function() { return null; })
    ]).then(function(results) {
      var profile = results[0];
      var accountDoc = results[1];
      var existingRole = accountDoc && accountDoc.exists
        ? (accountDoc.data().role || 'customer')
        : 'customer';

      if (profile) {
        cacheFirebaseGoogleUser(user, profile.role || existingRole, profile);
        return;
      }

      cacheFirebaseGoogleUser(user, existingRole, null);

      var userProfile = {
        firstName: fallback.firstName,
        lastName: fallback.lastName,
        displayName: fallback.displayName,
        email: user.email || '',
        role: existingRole,
        phone: '',
        address: ''
      };

      var accountProfile = {
        firstName: fallback.firstName,
        lastName: fallback.lastName,
        name: fallback.displayName,
        email: user.email || '',
        phone: '',
        address: '',
        role: existingRole,
        status: 'active'
      };

      return Promise.all([
        firebase.firestore().collection('users').doc(user.uid).set(userProfile, { merge: true }).catch(function() {}),
        user.email
          ? firebase.firestore().collection('accounts').doc(user.email).set(accountProfile, { merge: true }).catch(function() {})
          : Promise.resolve()
      ]);
    }).catch(function() {
      // The Firebase Auth session is valid even when Firestore is offline or
      // blocked by rules, so keep the user signed in.
    });
  }

  function completeGoogleSignIn(result) {
    var user = result && result.user ? result.user : firebase.auth().currentUser;
    if (!user) throw { code: 'auth/no-user', message: 'Google did not return a user account.' };

    cacheFirebaseGoogleUser(user, 'customer', null);
    showAuthMessage('Google sign-in successful. Redirecting...');

    return syncGoogleProfile(user).then(function() {
      redirectAfterLogin();
    });
  }

  function showGoogleError(error) {
    setGoogleButtonBusy(false);
    if (!error) {
      showAuthMessage('Google sign-in failed. Please try again.', true);
      return;
    }
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
      showAuthMessage('Google sign-in was cancelled.', true);
      return;
    }

    var messages = {
      'auth/account-exists-with-different-credential': 'An account already exists with this email using another sign-in method.',
      'auth/unauthorized-domain': 'Google sign-in is not authorized for this website domain. Add this domain in Firebase Authentication settings.',
      'auth/operation-not-allowed': 'Google sign-in is not enabled in Firebase Authentication.',
      'auth/network-request-failed': 'Network error. Check your connection and try again.',
      'auth/popup-blocked': 'Your browser blocked the Google window. Allow pop-ups and try again.',
      'auth/web-storage-unsupported': 'Your browser is blocking storage required for Google sign-in.',
      'auth/internal-error': 'Google sign-in encountered a temporary Firebase error. Please try again.'
    };

    showAuthMessage(messages[error.code] || ('Google sign-in failed' + (error.message ? ': ' + error.message : '.')), true);
    console.error('SmileHub Google sign-in error:', error);
  }

  if (location.protocol === 'file:') {
    showAuthMessage('Google sign-in requires the website to run through http:// or https://, not by opening the HTML file directly.', true);
    return;
  }

  setGoogleButtonBusy(true);
  showAuthMessage('Opening Google sign-in...');

  var provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });

  firebase.auth().signInWithPopup(provider)
    .then(completeGoogleSignIn)
    .catch(function(error) {
      if (error && (error.code === 'auth/popup-blocked' || error.code === 'auth/operation-not-supported-in-this-environment')) {
        showAuthMessage('Redirecting to Google sign-in...');
        return firebase.auth().signInWithRedirect(provider);
      }
      showGoogleError(error);
    });
}
function redirectAfterLogin() {
  // Send users back to the page they were on when login was requested.
  // Only relative .html paths are accepted to prevent open redirects.
  var returnPage = SmileHubStorage.get(RETURN_KEY, null);
  SmileHubStorage.remove(RETURN_KEY);
  if (typeof returnPage === 'string' && returnPage) {
    var pathOnly = returnPage.split('?')[0].split('#')[0].split('/').pop();
    var isSafe = /^[A-Za-z0-9._-]+\.html$/.test(pathOnly)
      && returnPage.indexOf('//') === -1
      && !returnPage.startsWith('/');
    if (isSafe) {
      location.href = returnPage;
      return;
    }
  }
  // Admin users can open the dashboard from the account/navigation controls.
  location.href = 'homepage.html';
}

function handleLogin(event) {
  event.preventDefault();
  var email = document.getElementById('loginEmail').value.trim().toLowerCase();
  var password = document.getElementById('loginPassword').value;

  var currentUser = firebase.auth().currentUser;
  var alreadySignedIn = currentUser && currentUser.email && currentUser.email.toLowerCase() === email;
  var prepare = alreadySignedIn
    ? Promise.resolve()
    : firebase.auth().signOut().catch(function() {});

  prepare.then(function() {
    return firebase.auth().signInWithEmailAndPassword(email, password);
  }).then(function() {
    showAuthMessage('Login successful! Redirecting...');
    setTimeout(redirectAfterLogin, 300);
  }).catch(function(error) {
    var message = 'Login failed. Please try again.';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      message = 'Incorrect email or password.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Enter a valid email address.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many attempts. Please try again later.';
    }
    showAuthMessage(message, true);
  });
}

function handleRegister(event) {
  event.preventDefault();

  var firstName = document.getElementById('registerFirstName').value.trim();
  var lastName = document.getElementById('registerLastName').value.trim();
  var email = document.getElementById('registerEmail').value.trim().toLowerCase();
  var password = document.getElementById('registerPassword').value;
  var accountTypeSelect = document.getElementById('registerAccountType');
  var selectedRole = accountTypeSelect ? accountTypeSelect.value : 'customer';

  if (!firstName) { showAuthMessage('First name is required.', true); return; }
  if (!lastName) { showAuthMessage('Last name is required.', true); return; }
  if (!email) { showAuthMessage('Email is required.', true); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthMessage('Enter a valid email address.', true); return; }
  if (!password) { showAuthMessage('Password is required.', true); return; }
  if (password.length < 8) { showAuthMessage('Password must be at least 8 characters.', true); return; }

  var confirmPassword = document.getElementById('registerConfirmPassword');
  if (confirmPassword && confirmPassword.value !== password) {
    showAuthMessage('Passwords do not match.', true);
    confirmPassword.focus();
    return;
  }

  var terms = document.getElementById('registerTerms');
  if (terms && !terms.checked) {
    showAuthMessage('Please accept the Terms and Privacy Policy.', true);
    terms.focus();
    return;
  }

  firebase.auth().createUserWithEmailAndPassword(email, password).then(function() {
    var createdUser = firebase.auth().currentUser;
    var uid = createdUser.uid;
    // Best-effort email verification. Account creation must still succeed if
    // email delivery is temporarily unavailable.
    createdUser.sendEmailVerification({
      url: location.origin + '/profile.html'
    }).catch(function(error) {
      console.warn('Could not send verification email automatically:', error);
    });
    showAuthMessage('Account created! Setting up profile...');

    return firebase.firestore().collection('user_registrations').doc(email).get().then(function(doc) {
      var role = selectedRole;
      var reg = doc.exists && doc.data().claimed === false ? doc.data() : null;

      if (reg) {
        role = reg.role;
        firstName = reg.firstName || firstName;
        lastName = reg.lastName || lastName;
      }

      return firebase.firestore().collection('users').doc(uid).set({
        firstName: firstName,
        lastName: lastName,
        displayName: firstName + ' ' + lastName,
        email: email,
        role: role,
        phone: '',
        address: ''
      }).then(function() {
        if (reg) {
          return firebase.firestore().collection('user_registrations').doc(email).update({
            claimed: true,
            claimedUid: uid,
            claimedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      }).then(function() {
        return firebase.firestore().collection('accounts').doc(email).set({
          firstName: firstName,
          lastName: lastName,
          name: firstName + ' ' + lastName,
          email: email,
          phone: '',
          address: '',
          role: role,
          status: 'active'
        });
      }).then(function() {
        cacheUser({
          uid: uid,
          name: firstName + ' ' + lastName,
          email: email,
          role: role,
          phone: '',
          address: '',
          firstName: firstName,
          lastName: lastName,
          password: ''
        });
        showAuthMessage('Welcome, ' + firstName + '! Redirecting...');
        setTimeout(function() {
          location.href = 'homepage.html';
        }, 1200);
      });
    });
  }).catch(function(error) {
    var message = 'Registration failed.';
    if (error.code === 'auth/email-already-in-use') {
      message = 'That email is already registered.';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password is too weak.';
    }
    showAuthMessage(message, true);
  });
}

function logoutUser() {
  cacheUser(null);
  SmileHubStorage.remove(RETURN_KEY);
  // Keep the Firebase cart and wishlist so they return on the next sign-in.
  // Remove only this browser's cached copies.
  try { localStorage.removeItem('smilehub_simple_cart'); sessionStorage.removeItem('smilehub_simple_cart'); } catch (e) {}
  try { localStorage.removeItem('smilehub_simple_wishlist'); sessionStorage.removeItem('smilehub_simple_wishlist'); } catch (e) {}
  firebase.auth().signOut().catch(function() {}).then(function() {
    location.href = 'homepage.html';
  });
}

function requireLogin(returnPage) {
  var user = getCachedUser();
  if (user) return true;
  SmileHubStorage.set(RETURN_KEY, returnPage || currentPage + location.search);
  location.href = 'login.html?message=signin';
  return false;
}

function protectPage() {
  var user = getCachedUser();

  if (!PUBLIC_PAGES.includes(currentPage) && !user) {
    SmileHubStorage.set(RETURN_KEY, currentPage + location.search);
    location.replace('login.html?message=signin');
    return;
  }

  if (user && DEMO_MODE_ENABLED) {
    var hardcodedRole = DEMO_ACCOUNTS[user.email] && DEMO_ACCOUNTS[user.email].role;
    if (hardcodedRole && user.role !== hardcodedRole) {
      user.role = hardcodedRole;
      cacheUser(user);
    }
  }

  var adminRoles = ['admin', 'staff', 'superadmin'];
  if (currentPage === 'admin.html' && (!user || !adminRoles.includes(user.role))) {
    location.replace('homepage.html?message=admin-only');
  }

  if (currentPage === 'profile.html' && user && user.role === 'customer') return;
  if (currentPage === 'profile.html' && user) {
    location.replace('admin.html');
  }
}

function showAuthMessage(text, isError) {
  var box = document.getElementById('authMessage');
  if (!box) {
    box = document.createElement('div');
    box.id = 'authMessage';
    box.className = 'auth-message';
    var main = document.querySelector('main');
    if (main) main.prepend(box);
  }
  box.textContent = text;
  box.classList.remove('hidden');
  box.classList.toggle('error', Boolean(isError));
}

function updateAccountLink() {
  var user = getCachedUser();
  if (!user) return;

  var loginLinks = document.querySelectorAll('a[href*="login"], a.icon-link');
  var filtered = [];
  loginLinks.forEach(function(link) {
    if (link.id === 'logoutButton' || link.classList.contains('logout-link')) return;
    if (link.href && link.href.indexOf('login') !== -1) filtered.push(link);
  });
  filtered.forEach(function(link) {
    if (['admin', 'staff', 'superadmin'].includes(user.role)) {
      link.href = 'admin.html';
      link.innerHTML = '&#9881; <span class="text-label">Dashboard</span>';
    } else {
      link.href = 'profile.html';
      link.innerHTML = '&#128100; <span class="text-label">Profile</span>';
    }
  });
}

function protectLinksForGuests() {
  if (getCachedUser()) return;
  document.querySelectorAll('a[href]').forEach(function(link) {
    var href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    var pageName = href.split('?')[0].split('#')[0].split('/').pop();
    if (pageName && pageName.endsWith('.html') && !PUBLIC_PAGES.includes(pageName)) {
      link.addEventListener('click', function(event) {
        event.preventDefault();
        requireLogin(href);
      });
    }
  });
  document.querySelectorAll('form[action]').forEach(function(form) {
    var action = form.getAttribute('action');
    var pageName = action ? action.split('?')[0].split('/').pop() : '';
    if (pageName && !PUBLIC_PAGES.includes(pageName)) {
      form.addEventListener('submit', function(event) {
        event.preventDefault();
        var query = new URLSearchParams(new FormData(form)).toString();
        requireLogin(action + (query ? '?' + query : ''));
      });
    }
  });
}

function getAccounts() {
  return Promise.all([
    firebase.firestore().collection('accounts').get(),
    firebase.firestore().collection('users').get(),
    firebase.firestore().collection('deleted_accounts').get().catch(function() { return { forEach: function() {} }; })
  ]).then(function(results) {
    var deletedSet = {};
    var deletedSnap = results[2];
    if (deletedSnap && deletedSnap.forEach) {
      deletedSnap.forEach(function(doc) {
        deletedSet[String(doc.id).toLowerCase()] = true;
        var d = doc.data();
        if (d && d.email) deletedSet[String(d.email).toLowerCase()] = true;
      });
    }
    var byEmail = {};
    // Base records from the accounts collection — skip tombstoned emails.
    results[0].forEach(function(doc) {
      var a = doc.data();
      if (!a || !a.email) return;
      var em = String(a.email).toLowerCase();
      if (deletedSet[em] || deletedSet[String(doc.id).toLowerCase()]) return;
      byEmail[em] = a;
    });
    // Merge in user profiles (mobile sign-ups only write here) — skip tombstoned.
    results[1].forEach(function(doc) {
      var u = doc.data();
      var email = String(u.email || '').toLowerCase();
      if (!email || deletedSet[email]) return;
      var name = u.displayName || [u.firstName, u.lastName].filter(Boolean).join(' ') || email;
      if (!byEmail[email]) {
        byEmail[email] = {
          name: name,
          email: email,
          role: u.role || 'customer',
          status: 'active',
          firstName: u.firstName || '',
          lastName: u.lastName || ''
        };
      } else {
        var existing = byEmail[email];
        if (!existing.name || existing.name === email) existing.name = name;
        if (u.role && (!existing.role || existing.role === 'customer')) existing.role = u.role;
      }
    });

    var accounts = Object.keys(byEmail).map(function(email) { return byEmail[email]; });
    if (accounts.length === 0) {
      accounts = [
        { name: 'Demo Customer', email: 'customer@smilehub.ph', role: 'customer', status: 'active', firstName: 'Demo', lastName: 'Customer' },
        { name: 'Admin User', email: 'admin@smilehub.ph', role: 'admin', status: 'active', firstName: 'Admin', lastName: 'User' },
        { name: 'Staff User', email: 'staff@smilehub.ph', role: 'staff', status: 'active', firstName: 'Staff', lastName: 'User' },
        { name: 'Super Admin', email: 'super@smilehub.ph', role: 'superadmin', status: 'active', firstName: 'Super', lastName: 'Admin' }
      ];
      var batch = firebase.firestore().batch();
      accounts.forEach(function(a) { batch.set(firebase.firestore().collection('accounts').doc(a.email), a); });
      return batch.commit().then(function() { return accounts; });
    }
    return accounts;
  });
}

function saveAccounts(accounts) {
  var batch = firebase.firestore().batch();
  accounts.forEach(function(a) { batch.set(firebase.firestore().collection('accounts').doc(a.email), a); });
  return batch.commit();
}

window.SmileHubAuth = {
  getLoggedInUser: getLoggedInUser,
  getCurrentAccount: getCurrentAccount,
  requireLogin: requireLogin,
  logoutUser: logoutUser,
  showMessage: showAuthMessage,
  getAccounts: getAccounts,
  saveAccounts: saveAccounts
};

document.addEventListener('DOMContentLoaded', function() {
  if (getCachedUser()) updateAccountLink();

  var message = new URLSearchParams(location.search).get('message');
  if (message === 'signin') {
    showAuthMessage('Please sign in before using that feature.');
  }
  if (message === 'admin-only') {
    showAuthMessage('The admin dashboard is restricted to admin, staff, and super admin accounts.', true);
  }

  var logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', function(event) {
      event.preventDefault();
      logoutUser();
    });
  }

  var loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  var googleBtn = document.getElementById('googleSignInBtn');
  if (googleBtn) googleBtn.addEventListener('click', handleGoogleLogin);

  var registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);

  // Forgot password toggle
  var forgotLink = document.getElementById('forgotPasswordLink');
  var forgotSection = document.getElementById('forgotPasswordSection');
  var loginCard = document.getElementById('loginForm');
  var backLink = document.getElementById('backToLoginLink');
  var resetBtn = document.getElementById('sendResetBtn');
  var resetEmail = document.getElementById('resetEmail');
  var resetMessage = document.getElementById('resetMessage');

  if (forgotLink && forgotSection && loginCard) {
    forgotLink.addEventListener('click', function() {
      loginCard.style.display = 'none';
      forgotSection.style.display = 'block';
      resetMessage.style.display = 'none';
      resetMessage.textContent = '';
      resetMessage.className = 'auth-message';
      resetEmail.value = '';
    });
  }

  if (backLink && forgotSection && loginCard) {
    backLink.addEventListener('click', function() {
      forgotSection.style.display = 'none';
      loginCard.style.display = 'block';
      resetMessage.style.display = 'none';
      resetMessage.textContent = '';
      resetMessage.className = 'auth-message';
      resetEmail.value = '';
    });
  }

  if (resetBtn && resetEmail && resetMessage) {
    resetBtn.addEventListener('click', function() {
      var email = resetEmail.value.trim();
      if (!email) {
        resetMessage.textContent = 'Enter your email address.';
        resetMessage.style.display = 'block';
        resetMessage.className = 'auth-message error';
        return;
      }
      resetBtn.disabled = true;
      resetBtn.textContent = 'Sending...';
      firebase.auth().sendPasswordResetEmail(email).then(function() {
        resetMessage.textContent = 'Reset link sent! Check your email (including spam).';
        resetMessage.style.display = 'block';
        resetMessage.className = 'auth-message';
        resetBtn.textContent = 'Send Reset Link';
        resetBtn.disabled = false;
      }).catch(function(error) {
        var msg = 'Failed to send reset email.';
        if (error.code === 'auth/user-not-found') msg = 'No account found with that email.';
        else if (error.code === 'auth/invalid-email') msg = 'Enter a valid email address.';
        else if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Try again later.';
        resetMessage.textContent = msg;
        resetMessage.style.display = 'block';
        resetMessage.className = 'auth-message error';
        resetBtn.textContent = 'Send Reset Link';
        resetBtn.disabled = false;
      });
    });
  }
});