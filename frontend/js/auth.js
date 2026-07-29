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
  var fbUser = firebase.auth().currentUser;
  if (!fbUser) return null;
  return {
    uid: fbUser.uid,
    name: fbUser.email,
    email: fbUser.email,
    role: 'customer',
    phone: '',
    address: '',
    firstName: '',
    lastName: '',
    password: ''
  };
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
    authReady = true;
    afterAuthReady();
    fetchUserProfile(firebaseUser.uid).then(function(profile) {
      if (profile) {
        var demo = DEMO_ACCOUNTS[firebaseUser.email] || {};
        cacheUser({
          uid: firebaseUser.uid,
          name: profile.displayName || firebaseUser.email,
          email: firebaseUser.email,
          role: profile.role || demo.role || 'customer',
          phone: profile.phone || '',
          address: profile.address || '',
          firstName: profile.firstName || demo.firstName || '',
          lastName: profile.lastName || demo.lastName || '',
          password: ''
        });
        updateAccountLink();
      }
    }).catch(function() {});
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
    }, 3000);
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

  firebase.auth().signInWithEmailAndPassword(email, password).then(function() {
    showAuthMessage('Login successful! Redirecting...');

    setTimeout(function() {
      var fbUser = firebase.auth().currentUser;
      if (!fbUser) { location.href = 'homepage.html'; return; }

      fetchUserProfile(fbUser.uid).then(function(profile) {
        var role = (profile && profile.role) || (DEMO_ACCOUNTS[email] && DEMO_ACCOUNTS[email].role) || 'customer';
        var firstName = (profile && profile.firstName) || (DEMO_ACCOUNTS[email] && DEMO_ACCOUNTS[email].firstName) || '';
        var lastName = (profile && profile.lastName) || (DEMO_ACCOUNTS[email] && DEMO_ACCOUNTS[email].lastName) || '';
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
    }, 1200);
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

  if (!firstName) { showAuthMessage('First name is required.', true); return; }
  if (!lastName) { showAuthMessage('Last name is required.', true); return; }
  if (!email) { showAuthMessage('Email is required.', true); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showAuthMessage('Enter a valid email address.', true); return; }
  if (!password) { showAuthMessage('Password is required.', true); return; }
  if (password.length < 6) { showAuthMessage('Password must be at least 6 characters.', true); return; }

  firebase.auth().createUserWithEmailAndPassword(email, password).then(function() {
    showAuthMessage('Account created! Redirecting to products...');
    cacheUser({
      uid: firebase.auth().currentUser.uid,
      name: email,
      email: email,
      role: 'customer',
      phone: '',
      address: '',
      firstName: firstName,
      lastName: lastName,
      password: ''
    });
    setTimeout(function() {
      location.href = 'products.html';
    }, 1200);
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
  firebase.auth().signOut().then(function() {
    cacheUser(null);
    SmileHubStorage.remove(RETURN_KEY);
    SmileHubStorage.remove('smilehub_simple_cart');
    SmileHubStorage.remove('smilehub_simple_wishlist');
    location.href = 'homepage.html';
  }).catch(function() {
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
  var loginLinks = document.querySelectorAll('a[href="login.html"]');
  if (!user) return;
  loginLinks.forEach(function(link) {
    if (link.id === 'logoutButton' || link.classList.contains('logout-link')) return;
    if (['admin', 'staff', 'superadmin'].includes(user.role)) {
      link.href = 'admin.html';
      link.innerHTML = '⚙ <span class="text-label">Dashboard</span>';
    } else {
      link.href = 'profile.html';
      link.innerHTML = '👤 <span class="text-label">Profile</span>';
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

window.SmileHubAuth = {
  getLoggedInUser: getLoggedInUser,
  getCurrentAccount: getCurrentAccount,
  requireLogin: requireLogin,
  logoutUser: logoutUser,
  showMessage: showAuthMessage
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
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) { e.preventDefault(); });
    loginForm.querySelector('button').addEventListener('click', handleLogin);
  }

  var registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
});