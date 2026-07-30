const DEMO_ACCOUNTS = {
  'admin@smilehub.ph': { role: 'admin', firstName: 'Admin', lastName: 'User' },
  'staff@smilehub.ph': { role: 'staff', firstName: 'Staff', lastName: 'User' },
  'super@smilehub.ph': { role: 'superadmin', firstName: 'Super', lastName: 'Admin' },
  'customer@smilehub.ph': { role: 'customer', firstName: 'Demo', lastName: 'Customer' }
};
const RETURN_KEY = 'smilehub_return_page';
const AUTH_KEY = 'smilehub_logged_in_user';
const WINDOW_STATE_PREFIX = 'SMILEHUB_STATE:';

const PUBLIC_PAGES = [
  'index.html',
  'homepage.html',
  'login.html',
  'register.html'
];

const currentPage = location.pathname.split('/').pop() || 'index.html';

function readWindowState() {
  if (!window.name.startsWith(WINDOW_STATE_PREFIX)) return {};
  try {
    return JSON.parse(window.name.slice(WINDOW_STATE_PREFIX.length)) || {};
  } catch (error) {
    return {};
  }
}

function writeWindowState(state) {
  window.name = WINDOW_STATE_PREFIX + JSON.stringify(state);
}

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

const SmileHubStorage = {
  get(key, fallbackValue) {
    const windowState = readWindowState();
    if (Object.prototype.hasOwnProperty.call(windowState, key)) {
      return windowState[key];
    }

    const ss = sessionGet(key);
    if (ss !== null) {
      try {
        const parsedValue = JSON.parse(ss);
        windowState[key] = parsedValue;
        writeWindowState(windowState);
        return parsedValue;
      } catch (e) {}
    }

    const ls = storageGet(key);
    if (ls !== null) {
      try {
        const parsedValue = JSON.parse(ls);
        windowState[key] = parsedValue;
        writeWindowState(windowState);
        sessionSet(key, ls);
        return parsedValue;
      } catch (e) {}
    }

    return fallbackValue;
  },
  set(key, value) {
    const windowState = readWindowState();
    windowState[key] = value;
    writeWindowState(windowState);

    const json = JSON.stringify(value);
    sessionSet(key, json);
    storageSet(key, json);
  },
  remove(key) {
    const windowState = readWindowState();
    windowState[key] = null;
    writeWindowState(windowState);

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
    var demo = DEMO_ACCOUNTS[firebaseUser.email] || {};
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
      firebase.firestore().collection('user_registrations').doc(firebaseUser.email).get()
    ]).then(function(results) {
      var profile = results[0];
      var regDoc = results[1];

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
    }).catch(function() {}).then(function() {
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

function handleLogin(event) {
  event.preventDefault();
  var email = document.getElementById('loginEmail').value.trim().toLowerCase();
  var password = document.getElementById('loginPassword').value;

  firebase.auth().signOut().catch(function() {}).then(function() {
    return firebase.auth().signInWithEmailAndPassword(email, password);
  }).then(function() {
    showAuthMessage('Login successful! Redirecting...');

    setTimeout(function() {
      var fbUser = firebase.auth().currentUser;
      if (!fbUser) { location.href = 'homepage.html'; return; }

      fetchUserProfile(fbUser.uid).then(function(profile) {
        var demo = DEMO_ACCOUNTS[email] || {};
        var role = demo.role || (profile && profile.role) || 'customer';
        var firstName = (profile && profile.firstName) || demo.firstName || '';
        var lastName = (profile && profile.lastName) || demo.lastName || '';
        cacheUser({
          uid: fbUser.uid,
          name: (profile && profile.displayName) || fbUser.email,
          email: fbUser.email,
          role: role,
          phone: (profile && profile.phone) || '',
          address: (profile && profile.address) || '',
          firstName: firstName,
          lastName: lastName,
          password: ''
        });

        if (['admin', 'staff', 'superadmin'].includes(role)) {
          location.href = 'admin.html';
          return;
        }
        var returnPage = SmileHubStorage.get(RETURN_KEY, 'homepage.html');
        SmileHubStorage.remove(RETURN_KEY);
        if (String(returnPage).startsWith('admin.html')) {
          location.href = 'homepage.html';
        } else {
          location.href = returnPage || 'homepage.html';
        }
      }).catch(function() {
        location.href = 'homepage.html';
      });
    }, 300);
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
  if (password.length < 6) { showAuthMessage('Password must be at least 6 characters.', true); return; }

  firebase.auth().createUserWithEmailAndPassword(email, password).then(function() {
    var uid = firebase.auth().currentUser.uid;
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
          location.href = role === 'customer' ? 'products.html' : 'admin.html';
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
  SmileHubStorage.remove('smilehub_simple_cart');
  SmileHubStorage.remove('smilehub_simple_wishlist');
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

  if (user && DEMO_ACCOUNTS[user.email]) {
    var hardcodedRole = DEMO_ACCOUNTS[user.email].role;
    if (user.role !== hardcodedRole) {
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
  return firebase.firestore().collection('accounts').get().then(function(snapshot) {
    var accounts = [];
    snapshot.forEach(function(doc) { accounts.push(doc.data()); });
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

  var registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
});