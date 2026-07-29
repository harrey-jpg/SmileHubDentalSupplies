const CART_KEY = 'smilehub_simple_cart';
const WISH_KEY = 'smilehub_simple_wishlist';
const THEME_KEY = 'smilehub_theme';

function getStoredList(key) {
  const list = window.SmileHubStorage
    ? window.SmileHubStorage.get(key, [])
    : [];

  return Array.isArray(list) ? list : [];
}

function saveStoredList(key, list) {
  if (window.SmileHubStorage) {
    window.SmileHubStorage.set(key, list);
  }
}

function money(value) {
  return '₱' + Number(value).toLocaleString('en-PH', {
    minimumFractionDigits: 2
  });
}

function showToast(message) {
  const oldToast = document.querySelector('.toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(function () {
    toast.remove();
  }, 2200);
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

  // Only target elements with JUST the cart-count class (not wishlist-count)
  document.querySelectorAll('.cart-count:not(.wishlist-count)').forEach(function (element) {
    if (total > 0) {
      element.textContent = total;
      element.style.display = 'inline-grid';
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

  // Target elements with wishlist-count class
  document.querySelectorAll('.wishlist-count').forEach(function (element) {
    if (total > 0) {
      element.textContent = total;
      element.style.display = 'inline-grid';
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
  showToast(product.name + ' added to cart');
}

// Toggle wishlist (add or remove)
function toggleWishlist(button) {
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
    showToast(product.name + ' removed from wishlist');
  } else {
    // Add to wishlist
    wishlist.push(product);
    saveStoredList(WISH_KEY, wishlist);
    updateWishlistCount();
    button.textContent = '♥'; // Filled heart
    button.classList.add('wished');
    showToast(product.name + ' added to wishlist');
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