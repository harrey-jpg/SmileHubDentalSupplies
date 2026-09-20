const CART_KEY = 'smilehub_simple_cart';
const WISH_KEY = 'smilehub_simple_wishlist';
const THEME_KEY = 'smilehub_theme';
const COUPON_KEY = 'smilehub_coupon';

function getAppliedCoupon() {
  return window.SmileHubStorage ? window.SmileHubStorage.get(COUPON_KEY, null) : null;
}

function setAppliedCoupon(code) {
  if (window.SmileHubStorage) window.SmileHubStorage.set(COUPON_KEY, code);
}

function couponDiscountRate(code) {
  if (!code) return 0;
  if (String(code).trim().toUpperCase() === 'SMILE10') return 0.10;
  return 0;
}

function getStoredList(key) {
  const list = window.SmileHubStorage
    ? window.SmileHubStorage.get(key, [])
    : [];

  return Array.isArray(list) ? list : [];
}

function saveStoredList(key, list) {
  const previous = getStoredList(key);
  if (window.SmileHubStorage) {
    window.SmileHubStorage.set(key, list);
  }
  if (window.SmileHubFirebaseSync && !window.SmileHubFirebaseSync.isApplyingRemote()) {
    window.SmileHubFirebaseSync.trackRemovals(key, previous, list);
    return window.SmileHubFirebaseSync.saveList(key, list);
  }
  return Promise.resolve();
}

function money(value) {
  return '₱' + Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2
  });
}

let smileHubLastToast = { message: '', at: 0 };

function showToast(message, isError, options) {
  options = options || {};
  var text = String(message || '').trim();
  if (!text) return;

  var important = Boolean(isError || options.important);
  // Default-allow: feedback is part of the purchase flow. Callers opt out
  // explicitly with { silent: true } instead of matching an allowlist.
  if (options.silent) return;

  var now = Date.now();
  if (smileHubLastToast.message === text && now - smileHubLastToast.at < 4000) return;
  smileHubLastToast = { message: text, at: now };

  var toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.className = 'site-toast';
    toast.setAttribute('role', isError ? 'alert' : 'status');
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.classList.toggle('error', Boolean(isError));
  toast.classList.add('show');
  clearTimeout(window.__smileHubToastTimer);
  window.__smileHubToastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, isError ? 4500 : 2200);
}

function customerIsLoggedIn() {
  if (!window.SmileHubAuth) return false;

  return Boolean(window.SmileHubAuth.getLoggedInUser());
}

function askUserToLogin(returnPage) {
  if (window.SmileHubAuth) {
    window.SmileHubAuth.requireLogin(returnPage || 'homepage.html');
  } else {
    location.href = 'login.html?message=signin';
  }
}

function updateCartCount() {
  let total = getStoredList(CART_KEY).reduce(function (sum, item) {
    return sum + Number(item.quantity || 0);
  }, 0);

  document.querySelectorAll('.cart-count:not(.wishlist-count)').forEach(function (element) {
    if (total > 0) {
      element.textContent = total;
      element.style.display = 'inline-grid';
      element.classList.remove('bounce');
      void element.offsetWidth;
      element.classList.add('bounce');
    } else {
      element.style.display = 'none';
    }
  });
}

function updateWishlistCount() {
  let total = getStoredList(WISH_KEY).length;

  document.querySelectorAll('.wishlist-count').forEach(function (element) {
    if (total > 0) {
      element.textContent = total;
      element.style.display = 'inline-grid';
      element.classList.remove('bounce');
      void element.offsetWidth;
      element.classList.add('bounce');
    } else {
      element.style.display = 'none';
    }
  });
}

var PENDING_ACTION_KEY = 'smilehub_pending_action';

function savePendingAction(type, button) {
  try {
    var qty = Math.floor(Number((button.dataset && button.dataset.quantity) || 1));
    if (!Number.isFinite(qty) || qty < 1) qty = 1;
    SmileHubStorage.set(PENDING_ACTION_KEY, {
      type: type,
      item: {
        id: Number(button.dataset.id),
        name: button.dataset.name || 'Product',
        price: Number(button.dataset.price || 0),
        image: button.dataset.image || 'assets/products/default.svg',
        quantity: Math.min(qty, 999)
      },
      returnPage: location.pathname.split('/').pop() + location.search
    });
  } catch (e) {}
}

function addToCart(button) {
  if (!customerIsLoggedIn()) {
    savePendingAction('cart', button);
    askUserToLogin(location.pathname.split('/').pop() + location.search);
    return;
  }

  if (button.dataset.stock !== undefined && Number(button.dataset.stock) <= 0) {
    showToast('Sorry, this item is out of stock.', true);
    return;
  }

  var qty = Math.floor(Number(button.dataset.quantity || 1));
  if (!Number.isFinite(qty) || qty < 1) qty = 1;
  qty = Math.min(qty, 999);

  const product = {
    id: Number(button.dataset.id),
    name: button.dataset.name,
    price: Number(button.dataset.price),
    image: button.dataset.image,
    quantity: qty
  };

  const cart = getStoredList(CART_KEY);
  const existingProduct = cart.find(function (item) {
    return item.id === product.id;
  });

  if (existingProduct) {
    existingProduct.quantity += product.quantity;
  } else {
    cart.push(product);
  }

  saveStoredList(CART_KEY, cart);
  updateCartCount();
  showToast((product.name || 'Item') + ' added to cart');
  if (button) {
    var original = button.innerHTML;
    button.innerHTML = '✓ Added';
    button.disabled = true;
    setTimeout(function () { button.innerHTML = original; button.disabled = false; }, 900);
  }
}


const BUY_NOW_KEY = 'smilehub_buy_now';

function buyNow(button) {
  if (!customerIsLoggedIn()) {
    savePendingAction('buy', button);
    askUserToLogin(location.pathname.split('/').pop() + location.search);
    return;
  }
  if (button.dataset.stock !== undefined && Number(button.dataset.stock) <= 0) {
    showToast('Sorry, this item is out of stock.', true);
    return;
  }
  var buyQty = Math.floor(Number(button.dataset.quantity || 1));
  if (!Number.isFinite(buyQty) || buyQty < 1) buyQty = 1;
  buyQty = Math.min(buyQty, 999);
  const item = {
    id: Number(button.dataset.id),
    name: button.dataset.name || 'Product',
    price: Number(button.dataset.price || 0),
    image: button.dataset.image || 'assets/products/default.svg',
    quantity: buyQty
  };
  if (!item.id || !item.price) {
    showToast('This product is not ready for checkout.', true);
    return;
  }
  SmileHubStorage.set(BUY_NOW_KEY, [item]);
  location.href = 'checkout.html?mode=buy-now';
}
window.buyNow = buyNow;

var HEART_PATH = 'M128 216S24 152 24 88c0-29.7 24.1-54 54-54 19.4 0 36.7 10.3 50 26.3C141.3 44.3 158.6 34 178 34c29.9 0 54 24.3 54 54 0 64-104 128-104 128Z';

function heartMarkup(wished) {
  return '<svg class="heart-icon" width="18" height="18" viewBox="0 0 256 256" fill="' + (wished ? 'currentColor' : 'none') + '" aria-hidden="true"><path d="' + HEART_PATH + '" stroke="currentColor" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

function paintHeart(button, wished) {
  // Labeled buttons (e.g. detail wishlist) keep their text — swap the heart fill only.
  var existing = button.querySelector('.heart-icon');
  if (existing && button.querySelector('span')) {
    existing.setAttribute('fill', wished ? 'currentColor' : 'none');
    button.classList.toggle('wished', wished);
    return;
  }
  button.innerHTML = heartMarkup(wished);
  button.classList.toggle('wished', wished);
}

// Toggle wishlist (add or remove)
function toggleWishlist(button) {
  if (!customerIsLoggedIn()) {
    savePendingAction('wish', button);
    askUserToLogin(location.pathname.split('/').pop() + location.search);
    return;
  }

  const wishlist = getStoredList(WISH_KEY);
  const productId = Number(button.dataset.id);
  
  // Check if product is already in wishlist
  const existingIndex = wishlist.findIndex(function (item) {
    return item.id === productId;
  });

  const product = {
    id: productId,
    name: button.dataset.name,
    price: Number(button.dataset.price),
    image: button.dataset.image
  };

  if (existingIndex !== -1) {
    // Remove from wishlist (unwish)
    wishlist.splice(existingIndex, 1);
    saveStoredList(WISH_KEY, wishlist);
    updateWishlistCount();
    paintHeart(button, false);
    showToast('Removed from wishlist');

  } else {
    // Add to wishlist
    wishlist.push(product);
    saveStoredList(WISH_KEY, wishlist);
    updateWishlistCount();
    paintHeart(button, true);
    showToast((product.name || 'Item') + ' saved to wishlist');

  }
}

// Keep old function for backward compatibility
function addToWishlist(button) {
  toggleWishlist(button);
}

function syncThemeButton(button) {
  var dark = document.body.classList.contains('dark');
  button.setAttribute('aria-pressed', dark ? 'true' : 'false');
  button.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
  button.title = dark ? 'Light mode' : 'Dark mode';
}

// Backports the accessible header pattern to every page (many still ship the
// stale fork): search role/label, nav id, menu ARIA + Escape/focus-return,
// current-page marking, theme pressed-state, role-aware mobile account link,
// and honest guest hints on gated header actions.
function upgradeHeaderChrome() {
  var page = (location.pathname.split('/').pop() || 'index.html').replace(/[^a-z0-9]/gi, '');
  var searchForm = document.querySelector('.search-bar');
  if (searchForm) {
    searchForm.setAttribute('role', 'search');
    var searchInput = searchForm.querySelector('input');
    if (searchInput) {
      if (!searchInput.id) searchInput.id = 'siteSearch-' + page;
      if (!searchInput.getAttribute('aria-label') && !document.querySelector('label[for="' + searchInput.id + '"]')) {
        searchInput.setAttribute('aria-label', searchInput.placeholder || 'Search dental products');
      }
    }
  }

  var menuButton = document.querySelector('.menu-button');
  var navList = document.querySelector('.nav-list');
  if (navList && !navList.id) navList.id = 'siteNav';
  if (menuButton && navList) {
    if (!menuButton.hasAttribute('aria-expanded')) menuButton.setAttribute('aria-expanded', 'false');
    if (!menuButton.hasAttribute('aria-label')) menuButton.setAttribute('aria-label', 'Toggle navigation menu');
    menuButton.setAttribute('aria-controls', navList.id);
    menuButton.addEventListener('click', function () {
      navList.classList.toggle('open');
      var open = navList.classList.contains('open');
      menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        var firstLink = navList.querySelector('a');
        if (firstLink) firstLink.focus();
      } else {
        menuButton.focus();
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && navList.classList.contains('open')) {
        navList.classList.remove('open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.focus();
      }
    });
  }

  var current = (location.pathname.split('/').pop() || 'index.html').split('?')[0];
  document.querySelectorAll('.nav-list a').forEach(function (link) {
    var href = (link.getAttribute('href') || '').split('?')[0].split('/').pop();
    if (href && href === current) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  // Role-aware mobile bottom-bar account link (guest → login, customer →
  // profile, staff → dashboard), matching updateAccountLink().
  try {
    var user = window.SmileHubAuth ? window.SmileHubAuth.getLoggedInUser() : null;
    document.querySelectorAll('.sh-mobile-nav a').forEach(function (link) {
      var href = link.getAttribute('href') || '';
      if (href.indexOf('profile.html') === -1) return;
      if (!user) link.setAttribute('href', 'login.html');
      else if (['admin', 'staff', 'superadmin'].indexOf(user.role) !== -1) link.setAttribute('href', 'admin.html');
    });
  } catch (e) {}

  // Honest guest hints: gated actions say so before the click dies at login.
  if (!customerIsLoggedIn()) {
    document.querySelectorAll('.header-actions a[href="wishlist.html"], .header-actions a[href="cart.html"]').forEach(function (link) {
      link.title = 'Sign in required';
      link.setAttribute('aria-describedby', 'guestHint');
    });
    if (!document.getElementById('guestHint')) {
      var hint = document.createElement('span');
      hint.id = 'guestHint';
      hint.className = 'sr-only';
      hint.textContent = 'Sign in required to use this feature.';
      document.body.appendChild(hint);
    }
  }
}

function setupPageActions() {
  // ONLY attach listeners to .add-cart buttons that are NOT in the catalog grid
  // This prevents duplicates with catalog.js
  document.querySelectorAll('.add-cart:not(.catalog-btn)').forEach(function (button) {
    // Remove any existing listeners by cloning
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    newButton.addEventListener('click', function () {
      addToCart(this);
    });
  });

  // ONLY attach listeners to .add-wishlist buttons that are NOT in the catalog grid
  document.querySelectorAll('.add-wishlist:not(.catalog-btn)').forEach(function (button) {
    // Remove any existing listeners by cloning
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Check if product is already in wishlist and update heart state
    const wishlist = getStoredList(WISH_KEY);
    const productId = Number(newButton.dataset.id);
    const isWished = wishlist.some(function (item) {
      return item.id === productId;
    });
    
    paintHeart(newButton, isWished);

    newButton.addEventListener('click', function () {
      toggleWishlist(this);
    });
  });

  upgradeHeaderChrome();

  const themeButton = document.querySelector('.theme-button');
  const savedTheme = window.SmileHubStorage
    ? window.SmileHubStorage.get(THEME_KEY, 'light')
    : 'light';

  if (savedTheme === 'dark') document.body.classList.add('dark');

  if (themeButton) {
    syncThemeButton(themeButton);
    themeButton.addEventListener('click', function () {
      document.body.classList.toggle('dark');
      const theme = document.body.classList.contains('dark') ? 'dark' : 'light';
      if (window.SmileHubStorage) window.SmileHubStorage.set(THEME_KEY, theme);
      syncThemeButton(themeButton);
    });
  }

  // Newsletter submits are owned exclusively by frontend-enhancements.js
  // (validating handler with live-region announcement). No fallback here —
  // a second listener would double-toast and double-reset the form.

  updateCartCount();
  updateWishlistCount();
}

document.addEventListener('DOMContentLoaded', setupPageActions);

function togglePassword(btn) {
  var wrap = btn.closest('.password-wrap');
  var input = wrap ? wrap.querySelector('input') : btn.previousElementSibling;
  if (!input) return;
  var show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  btn.setAttribute('aria-pressed', show ? 'true' : 'false');
  var open = btn.querySelector('.eye-open');
  var closed = btn.querySelector('.eye-closed');
  if (open && closed) {
    open.classList.toggle('hidden', show);
    closed.classList.toggle('hidden', !show);
  }
  input.focus();
}
document.addEventListener('DOMContentLoaded', function () {
  document.documentElement.setAttribute('data-smilehub-build', '5.0');
  var footer = document.querySelector('.footer-bottom, footer .container');
  if (footer && !document.getElementById('buildMarker')) {
    var marker = document.createElement('small');
    marker.id = 'buildMarker';
    marker.className = 'muted';
    marker.textContent = 'SmileHub build 5.0';
    footer.appendChild(marker);
  }
});
