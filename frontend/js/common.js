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

  const user = window.SmileHubAuth.getLoggedInUser();
  return Boolean(user && user.role === 'customer');
}

function askUserToLogin(returnPage) {
  if (window.SmileHubAuth) {
    window.SmileHubAuth.requireLogin(returnPage || 'products.html');
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

  document.querySelectorAll('.cart-count').forEach(function (element) {
    element.textContent = total;
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

function addToWishlist(button) {
  if (!customerIsLoggedIn()) {
    askUserToLogin(location.pathname.split('/').pop() + location.search);
    return;
  }

  const wishlist = getStoredList(WISH_KEY);
  const product = {
    id: Number(button.dataset.id),
    name: button.dataset.name,
    price: Number(button.dataset.price),
    image: button.dataset.image
  };

  const alreadySaved = wishlist.some(function (item) {
    return item.id === product.id;
  });

  if (!alreadySaved) wishlist.push(product);

  saveStoredList(WISH_KEY, wishlist);
  showToast(product.name + ' saved to wishlist');
}

function setupPageActions() {
  const signedInUser = window.SmileHubAuth
    ? window.SmileHubAuth.getLoggedInUser()
    : null;

  // Remove cart data created by the older version before login was required.
  if (!signedInUser) {
    saveStoredList(CART_KEY, []);
    saveStoredList(WISH_KEY, []);
  }

  document.querySelectorAll('.add-cart').forEach(function (button) {
    button.addEventListener('click', function () {
      addToCart(button);
    });
  });

  document.querySelectorAll('.add-wishlist').forEach(function (button) {
    button.addEventListener('click', function () {
      addToWishlist(button);
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
}

document.addEventListener('DOMContentLoaded', setupPageActions);
