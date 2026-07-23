/*
  Simple frontend login system for the class demo.
  It uses browser storage only. Real security will be added with the backend.
*/

const AUTH_KEY = 'smilehub_logged_in_user';
const ACCOUNTS_KEY = 'smilehub_accounts';
const RETURN_KEY = 'smilehub_return_page';
const WINDOW_STATE_PREFIX = 'SMILEHUB_STATE:';

const PUBLIC_PAGES = [
  'index.html',
  'homepage.html',
  'login.html',
  'register.html'
];

const currentPage = location.pathname.split('/').pop() || 'index.html';

/*
  window.name is used as a fallback when the pages are opened directly
  from a folder. Some browsers do not share localStorage properly between
  separate file:// pages.
*/
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

const SmileHubStorage = {
  get(key, fallbackValue) {
    const windowState = readWindowState();

    if (Object.prototype.hasOwnProperty.call(windowState, key)) {
      return windowState[key];
    }

    try {
      const savedValue = localStorage.getItem(key);
      if (savedValue !== null) {
        const parsedValue = JSON.parse(savedValue);
        windowState[key] = parsedValue;
        writeWindowState(windowState);
        return parsedValue;
      }
    } catch (error) {
      // The window.name fallback will still work in the same browser tab.
    }

    return fallbackValue;
  },

  set(key, value) {
    const windowState = readWindowState();
    windowState[key] = value;
    writeWindowState(windowState);

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      // Ignore storage errors because window.name already saved the value.
    }
  },

  remove(key) {
    const windowState = readWindowState();
    // Keep a null marker so another file:// page cannot restore stale data.
    windowState[key] = null;
    writeWindowState(windowState);

    try {
      localStorage.removeItem(key);
    } catch (error) {
      // Nothing else is needed.
    }
  }
};

window.SmileHubStorage = SmileHubStorage;

function defaultAccounts() {
  return [
    {
      firstName: 'SmileHub',
      lastName: 'Customer',
      name: 'SmileHub Customer',
      email: 'customer@smilehub.ph',
      password: 'demo123',
      phone: '0917 123 4567',
      address: '123 Sample Street, Quezon City, Metro Manila',
      role: 'customer'
    },
    {
      firstName: 'SmileHub',
      lastName: 'Admin',
      name: 'SmileHub Admin',
      email: 'admin@smilehub.ph',
      password: 'admin123',
      phone: '',
      address: '',
      role: 'admin'
    }
  ];
}

function getAccounts() {
  let accounts = SmileHubStorage.get(ACCOUNTS_KEY, null);

  if (!Array.isArray(accounts)) {
    const oldUsers = SmileHubStorage.get('smilehub_registered_users', []);
    accounts = defaultAccounts();

    if (Array.isArray(oldUsers)) {
      oldUsers.forEach(function (user) {
        if (!accounts.some(function (account) { return account.email === user.email; })) {
          accounts.push(user);
        }
      });
    }

    SmileHubStorage.set(ACCOUNTS_KEY, accounts);
  }

  return accounts;
}

function saveAccounts(accounts) {
  SmileHubStorage.set(ACCOUNTS_KEY, accounts);
}

function getLoggedInUser() {
  return SmileHubStorage.get(AUTH_KEY, null);
}

function saveLoggedInUser(user) {
  SmileHubStorage.set(AUTH_KEY, user);
}

function getCurrentAccount() {
  const user = getLoggedInUser();
  if (!user) return null;

  return getAccounts().find(function (account) {
    return account.email === user.email;
  }) || null;
}

function logoutUser() {
  SmileHubStorage.remove(AUTH_KEY);
  SmileHubStorage.remove(RETURN_KEY);
  SmileHubStorage.remove('smilehub_simple_cart');
  SmileHubStorage.remove('smilehub_simple_wishlist');
  location.href = 'homepage.html';
}

function requireLogin(returnPage) {
  if (getLoggedInUser()) return true;

  SmileHubStorage.set(RETURN_KEY, returnPage || currentPage + location.search);
  location.href = 'login.html?message=signin';
  return false;
}

function protectPage() {
  const user = getLoggedInUser();

  if (!PUBLIC_PAGES.includes(currentPage) && !user) {
    SmileHubStorage.set(RETURN_KEY, currentPage + location.search);
    location.replace('login.html?message=signin');
    return;
  }

  if (currentPage === 'admin.html' && (!user || user.role !== 'admin')) {
    location.replace('homepage.html?message=admin-only');
  }

  if (currentPage === 'profile.html' && user && user.role !== 'customer') {
    location.replace('admin.html');
  }
}

function showAuthMessage(text, isError) {
  let box = document.getElementById('authMessage');

  if (!box) {
    box = document.createElement('div');
    box.id = 'authMessage';
    box.className = 'auth-message';
    const main = document.querySelector('main');
    if (main) main.prepend(box);
  }

  box.textContent = text;
  box.classList.remove('hidden');
  box.classList.toggle('error', Boolean(isError));
}

function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;

  const account = getAccounts().find(function (savedAccount) {
    return savedAccount.email.toLowerCase() === email && savedAccount.password === password;
  });

  if (!account) {
    showAuthMessage('Incorrect email or password.', true);
    return;
  }

  saveLoggedInUser({
    name: account.name,
    email: account.email,
    role: account.role
  });

  if (account.role === 'admin') {
    location.href = 'admin.html';
    return;
  }

  const returnPage = SmileHubStorage.get(RETURN_KEY, 'products.html');
  SmileHubStorage.remove(RETURN_KEY);

  if (String(returnPage).startsWith('admin.html')) {
    location.href = 'products.html';
  } else {
    location.href = returnPage || 'products.html';
  }
}

function handleRegister(event) {
  event.preventDefault();

  const firstName = document.getElementById('registerFirstName').value.trim();
  const lastName = document.getElementById('registerLastName').value.trim();
  const email = document.getElementById('registerEmail').value.trim().toLowerCase();
  const password = document.getElementById('registerPassword').value;
  const accounts = getAccounts();

  const emailExists = accounts.some(function (account) {
    return account.email.toLowerCase() === email;
  });

  if (emailExists) {
    showAuthMessage('That email is already registered.', true);
    return;
  }

  const newAccount = {
    firstName: firstName,
    lastName: lastName,
    name: firstName + ' ' + lastName,
    email: email,
    password: password,
    phone: '',
    address: '',
    role: 'customer'
  };

  accounts.push(newAccount);
  saveAccounts(accounts);
  saveLoggedInUser({ name: newAccount.name, email: email, role: 'customer' });
  location.href = 'products.html';
}

function protectLinksForGuests() {
  if (getLoggedInUser()) return;

  document.querySelectorAll('a[href]').forEach(function (link) {
    const href = link.getAttribute('href');

    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    const pageName = href.split('?')[0].split('#')[0].split('/').pop();

    if (pageName && pageName.endsWith('.html') && !PUBLIC_PAGES.includes(pageName)) {
      link.addEventListener('click', function (event) {
        event.preventDefault();
        requireLogin(href);
      });
    }
  });

  document.querySelectorAll('form[action]').forEach(function (form) {
    const action = form.getAttribute('action');
    const pageName = action ? action.split('?')[0].split('/').pop() : '';

    if (pageName && !PUBLIC_PAGES.includes(pageName)) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        const query = new URLSearchParams(new FormData(form)).toString();
        requireLogin(action + (query ? '?' + query : ''));
      });
    }
  });
}

function updateAccountLink() {
  const user = getLoggedInUser();
  const loginLinks = document.querySelectorAll('a[href="login.html"]');

  if (!user) return;

  loginLinks.forEach(function (link) {
    if (link.id === 'logoutButton' || link.classList.contains('logout-link')) return;

    if (user.role === 'admin') {
      link.href = 'admin.html';
      link.innerHTML = '⚙ <span class="text-label">Admin</span>';
    } else {
      link.href = 'profile.html';
      link.innerHTML = '👤 <span class="text-label">Profile</span>';
    }
  });
}

protectPage();

window.SmileHubAuth = {
  getLoggedInUser: getLoggedInUser,
  getCurrentAccount: getCurrentAccount,
  getAccounts: getAccounts,
  saveAccounts: saveAccounts,
  saveLoggedInUser: saveLoggedInUser,
  requireLogin: requireLogin,
  logoutUser: logoutUser,
  showMessage: showAuthMessage
};

document.addEventListener('DOMContentLoaded', function () {
  getAccounts();

  const message = new URLSearchParams(location.search).get('message');

  if (message === 'signin') {
    showAuthMessage('Please sign in before using that feature.');
  }

  if (message === 'admin-only') {
    showAuthMessage('The admin dashboard is only available to an admin account.', true);
  }

  updateAccountLink();
  protectLinksForGuests();

  const logoutButton = document.getElementById('logoutButton');
  if (logoutButton) {
    logoutButton.addEventListener('click', function (event) {
      event.preventDefault();
      logoutUser();
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const registerForm = document.getElementById('registerForm');
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
});
