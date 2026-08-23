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

function getNotificationPreferences() {
  var defaults = { importantOnly: true, cart: false, wishlist: false, routine: false };
  try {
    var saved = window.SmileHubStorage
      ? window.SmileHubStorage.get('smilehub_notification_preferences', defaults)
      : defaults;
    return Object.assign({}, defaults, saved || {});
  } catch (_) {
    return defaults;
  }
}

function isImportantToast(message, isError, options) {
  if (isError) return true;
  if (options && options.important) return true;
  var text = String(message || '').toLowerCase();
  return /(order placed|payment successful|verified|verification email|password changed|logged out|login successful|profile information saved|delivery address saved|could not|failed|error)/.test(text);
}

function showToast(message, isError, options) {
  options = options || {};
  var text = String(message || '').trim();
  if (!text) return;

  var important = Boolean(isError || options.important);
  var allowed = important || /(verified|verification|signed in|logged in|logged out|order (placed|submitted|confirmed)|profile saved|address saved|password reset)/i.test(text);
  if (!allowed) return;

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
  let total = 0;

  if (customerIsLoggedIn()) {
    total = getStoredList(CART_KEY).reduce(function (sum, item) {
      return sum + Number(item.quantity || 0);
    }, 0);
  }

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
  let total = 0;

  if (customerIsLoggedIn()) {
    total = getStoredList(WISH_KEY).length;
  }

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

function addToCart(button) {
  if (!customerIsLoggedIn()) {
    askUserToLogin(location.pathname.split('/').pop() + location.search);
    return;
  }

  const product = {
    id: Number(button.dataset.id),
    name: button.dataset.name,
    price: Number(button.dataset.price),
    image: button.dataset.image,
    quantity: Number(button.dataset.quantity || 1)
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
  if (button) {
    var original = button.textContent;
    button.textContent = '✓ Added';
    button.disabled = true;
    setTimeout(function () { button.textContent = original; button.disabled = false; }, 900);
  }
}


const BUY_NOW_KEY = 'smilehub_buy_now';

function buyNow(button) {
  if (!customerIsLoggedIn()) {
    askUserToLogin(location.pathname.split('/').pop() + location.search);
    return;
  }
  const item = {
    id: Number(button.dataset.id),
    name: button.dataset.name || 'Product',
    price: Number(button.dataset.price || 0),
    image: button.dataset.image || 'assets/products/default.svg',
    quantity: Math.max(1, Number(button.dataset.quantity || 1))
  };
  if (!item.id || !item.price) {
    showToast('This product is not ready for checkout.', true);
    return;
  }
  SmileHubStorage.set(BUY_NOW_KEY, [item]);
  location.href = 'checkout.html?mode=buy-now';
}
window.buyNow = buyNow;

// Toggle wishlist (add or remove)
function toggleWishlist(button) {
  if (!customerIsLoggedIn()) {
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
    button.textContent = '♡'; // Empty heart
    button.classList.remove('wished');

  } else {
    // Add to wishlist
    wishlist.push(product);
    saveStoredList(WISH_KEY, wishlist);
    updateWishlistCount();
    button.textContent = '♥'; // Filled heart
    button.classList.add('wished');

  }
}

// Keep old function for backward compatibility
function addToWishlist(button) {
  toggleWishlist(button);
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
    
    if (isWished) {
      newButton.textContent = '♥';
      newButton.classList.add('wished');
    } else {
      newButton.textContent = '♡';
      newButton.classList.remove('wished');
    }

    newButton.addEventListener('click', function () {
      toggleWishlist(this);
    });
  });

  const menuButton = document.querySelector('.menu-button');
  const navList = document.querySelector('.nav-list');

  if (menuButton && navList) {
    menuButton.addEventListener('click', function () {
      navList.classList.toggle('open');
    });
  }

  const themeButton = document.querySelector('.theme-button');
  const savedTheme = window.SmileHubStorage
    ? window.SmileHubStorage.get(THEME_KEY, 'light')
    : 'light';

  if (savedTheme === 'dark') document.body.classList.add('dark');

  if (themeButton) {
    themeButton.addEventListener('click', function () {
      document.body.classList.toggle('dark');
      const theme = document.body.classList.contains('dark') ? 'dark' : 'light';
      if (window.SmileHubStorage) window.SmileHubStorage.set(THEME_KEY, theme);
    });
  }

  document.querySelectorAll('.newsletter-form, .demo-form').forEach(function (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      showToast('Form submitted successfully');
      form.reset();
    });
  });

  updateCartCount();
  updateWishlistCount();
}

document.addEventListener('DOMContentLoaded', setupPageActions);

function togglePassword(btn) {
  var wrap = btn.closest('.password-wrap');
  var input = wrap ? wrap.querySelector('input') : btn.previousElementSibling;
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.textContent = '🙈';
  } else {
    input.type = 'password';
    btn.textContent = '👁';
  }
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
