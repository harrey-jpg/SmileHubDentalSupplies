var categoryImages = {
  'Oral Care': 'assets/products/oral-care.svg',
  'Instruments': 'assets/products/instrument.svg',
  'PPE': 'assets/products/ppe.svg',
  'Restorative': 'assets/products/restorative.svg',
  'Disposables': 'assets/products/disposable.svg',
  'Impression': 'assets/products/impression.svg',
  'Orthodontics': 'assets/products/orthodontic.svg',
  'Rotary': 'assets/products/rotary.svg',
  'Equipment': 'assets/products/equipment.svg',
  'Cosmetic': 'assets/products/cosmetic.svg'
};

var cachedProductList = [];

var PRODUCTS_CACHE_KEY = 'smilehub_products_cache_v2';

function getProducts(callback) {
  var cached = SmileHubStorage.get(PRODUCTS_CACHE_KEY, null);
  var cachedMeta = SmileHubStorage.get('smilehub_products_meta', null);

  function useCached() {
    if (cached && cached.length > 0) {
      cachedProductList = cached;
      if (callback) callback(cached);
      return true;
    }
    return false;
  }

  SmileHubData.getProductsMeta(function(meta) {
    if (meta && cached && cached.length > 0 && cachedMeta && cachedMeta.version === meta.version) {
      cachedProductList = cached;
      if (callback) callback(cached);
      return;
    }
    // Meta unavailable (e.g. offline): fall back to the cached copy.
    if (!meta && useCached()) return;

    SmileHubData.getProducts(function(data) {
      cachedProductList = data;
      SmileHubStorage.set(PRODUCTS_CACHE_KEY, data);
      if (meta) SmileHubStorage.set('smilehub_products_meta', meta);
      if (callback) callback(data);
    });
  });
}

function getProduct(id, callback) {
  getProducts(function(products) {
    var found = products.find(function(p) { return p.id === id; }) || null;
    if (callback) callback(found);
  });
}

function getProductDetails(id, callback) {
  getProduct(id, function(product) {
    if (!product) {
      if (callback) callback(null);
      return;
    }
    if (callback) callback({
      name: product.name,
      brand: product.brand || 'SmileHub',
      category: product.category || 'General',
      price: product.price || 0,
      stock: product.stock || 0,
      sku: product.sku || 'SH-' + String(id).padStart(3, '0'),
      image: product.image || categoryImages[product.category] || 'assets/products/default.svg',
      description: product.description || 'No description available.',
      specs: product.specs || ['No specifications available.']
    });
  });
}

var STAR_PATH = 'M128 32l30 62 68 10-49 48 12 68-61-32-61 32 12-68-49-48 68-10Z';

function renderStars(el, rating) {
  if (!el) return;
  var full = Math.round(Number(rating) || 5);
  var html = '';
  for (var i = 0; i < 5; i++) {
    var fill = i < full ? 'currentColor' : 'none';
    html += '<svg width="16" height="16" viewBox="0 0 256 256" aria-hidden="true"><path d="' + STAR_PATH + '" fill="' + fill + '" stroke="currentColor" stroke-width="14" stroke-linejoin="round"/></svg>';
  }
  el.innerHTML = html;
}

function clampQty(value, max) {
  var n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 1) return 1;
  if (max > 0 && n > max) return max;
  return Math.min(n, 999);
}

var detailTabsBound = false;

function bindOnceDetail(el, type, fn) {
  if (!el || el.dataset['bound' + type]) return;
  el.dataset['bound' + type] = 'true';
  el.addEventListener(type, fn);
}

function paintWishlist(button, wished) {
  if (!button) return;
  button.classList.toggle('wished', wished);
  button.setAttribute('aria-pressed', wished ? 'true' : 'false');
}

function storedReviewsFor(productId) {
  try {
    var all = JSON.parse(localStorage.getItem('smilehub_reviews') || '[]');
    return all.filter(function(r) { return r && r.productId === productId; });
  } catch (e) {
    return [];
  }
}

function paintHeaderRating(productId) {
  var starsEl = document.getElementById('detailStars');
  var textEl = document.getElementById('detailRatingText');
  var noteEl = document.getElementById('detailSampleNote');
  var mine = storedReviewsFor(productId);
  if (!starsEl || !textEl) return;
  if (!mine.length) {
    starsEl.innerHTML = '';
    starsEl.setAttribute('aria-label', 'No verified reviews yet');
    textEl.textContent = 'No verified reviews yet — be the first';
    if (noteEl) noteEl.classList.add('hidden');
    return;
  }
  var sum = mine.reduce(function(s, r) { return s + (Number(r.rating) || 5); }, 0);
  var avg = sum / mine.length;
  renderStars(starsEl, avg);
  starsEl.setAttribute('aria-label', 'Rated ' + avg.toFixed(1) + ' out of 5 from verified reviews');
  textEl.textContent = avg.toFixed(1) + ' rating • ' + mine.length + ' verified review' + (mine.length === 1 ? '' : 's');
  if (noteEl) noteEl.classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', function() {
  document.querySelectorAll('#reviewsTab .stars-svg').forEach(function(el) { renderStars(el, 5); });

  var params = new URLSearchParams(location.search);
  var rawId = params.get('id');
  var id = Number(rawId);
  if (!Number.isInteger(id) || id < 1) id = 1;

  var detail = document.getElementById('productDetail');
  var notFound = document.getElementById('productNotFound');
  var tabs = document.getElementById('productTabs');
  var stickyBar = document.getElementById('stickyBuyNowBar');

  var detailLoaded = false;
  var loadTimer = null;
  function showNotFound() {
    detailLoaded = true;
    clearTimeout(loadTimer);
    if (detail) { detail.classList.add('hidden'); detail.setAttribute('aria-hidden', 'true'); }
    if (tabs) { tabs.classList.add('hidden'); tabs.setAttribute('aria-hidden', 'true'); }
    if (stickyBar) stickyBar.classList.add('hidden');
    var action = document.getElementById('notFoundAction');
    if (action) {
      action.textContent = 'Browse the catalog';
      action.href = 'products.html';
      action.onclick = null;
    }
    if (notFound) { notFound.classList.remove('hidden'); notFound.removeAttribute('aria-hidden'); }
    document.getElementById('detailName') && (document.title = 'Product Not Found | SmileHub Dental Supplies');
  }

  function showLoadError() {
    var title = document.getElementById('notFoundTitle');
    var text = document.getElementById('notFoundText');
    var action = document.getElementById('notFoundAction');
    if (title) title.textContent = "Couldn't load this product";
    if (text) text.textContent = 'Check your connection and try again. Nothing was lost.';
    if (action) {
      action.textContent = 'Retry';
      action.href = location.pathname + location.search;
      action.onclick = function(e) {
        if (e) e.preventDefault();
        retryDetails();
      };
    }
    detailLoaded = true;
    if (detail) { detail.classList.add('hidden'); detail.setAttribute('aria-hidden', 'true'); }
    if (tabs) { tabs.classList.add('hidden'); tabs.setAttribute('aria-hidden', 'true'); }
    if (stickyBar) stickyBar.classList.add('hidden');
    if (notFound) { notFound.classList.remove('hidden'); notFound.removeAttribute('aria-hidden'); }
  }

  function retryDetails() {
    detailLoaded = false;
    if (notFound) notFound.classList.add('hidden');
    if (detail) { detail.classList.remove('hidden'); detail.classList.add('is-loading'); detail.setAttribute('aria-busy', 'true'); }
    if (tabs) { tabs.classList.remove('hidden'); tabs.removeAttribute('aria-hidden'); }
    clearTimeout(loadTimer);
    loadTimer = setTimeout(function() {
      if (!detailLoaded) showLoadError();
    }, 10000);
    try {
      getProductDetails(id, onDetails);
    } catch (e) {
      showLoadError();
    }
  }

  loadTimer = setTimeout(function() {
    if (!detailLoaded) showLoadError();
  }, 10000);

  function onDetails(product) {
    detailLoaded = true;
    clearTimeout(loadTimer);
    if (!product) {
      showNotFound();
      return;
    }

    if (detail) { detail.classList.remove('is-loading'); detail.setAttribute('aria-busy', 'false'); }
    paintHeaderRating(id);

    document.getElementById('detailName').textContent = product.name;
    document.getElementById('detailBrand').textContent = product.brand || 'SmileHub';
    document.getElementById('detailCategory').textContent = product.category || 'General';
    document.getElementById('detailPrice').textContent = money(product.price);
    document.getElementById('detailSku').textContent = product.sku || 'N/A';
    document.getElementById('detailDescription').textContent = product.description || 'No description available.';
    var descTab = document.getElementById('descriptionTabText');
    if (descTab) descTab.textContent = product.description || 'No description available.';

    var img = document.getElementById('detailImage');
    if (img) {
      img.src = product.image || 'assets/products/default.svg';
      img.alt = (product.brand ? product.brand + ' ' : '') + product.name;
    }
    var chip = document.getElementById('detailGalleryChip');
    if (chip) chip.textContent = product.category || 'General';

    var stockEl = document.getElementById('detailStock');
    var stock = Number(product.stock) || 0;
    if (stockEl) {
      stockEl.classList.remove('is-in', 'is-low', 'is-out');
      if (stock <= 0) {
        stockEl.classList.add('is-out');
        stockEl.textContent = 'Out of stock';
      } else if (stock <= 5) {
        stockEl.classList.add('is-low');
        stockEl.textContent = 'Only ' + stock + ' left in stock';
      } else {
        stockEl.classList.add('is-in');
        stockEl.textContent = stock + ' pieces available';
      }
    }

    if (product.specs && product.specs.length > 0) {
      document.getElementById('detailSpecs').innerHTML = product.specs.map(function(spec) {
        return '<li>' + spec + '</li>';
      }).join('');
    } else {
      document.getElementById('detailSpecs').innerHTML = '<li>No specifications available.</li>';
    }

    var qtyInput = document.getElementById('detailQuantity');
    var qtyHelp = document.getElementById('qtyHelp');
    function currentQty() { return clampQty(qtyInput ? qtyInput.value : 1, stock); }
    function syncQtyDisplay() {
      if (!qtyInput) return;
      qtyInput.value = currentQty();
      qtyInput.max = stock > 0 ? stock : 1;
      if (qtyHelp) {
        qtyHelp.textContent = stock > 0 && stock <= 5
          ? 'Only ' + stock + ' available — quantity limited to stock.'
          : '';
      }
    }
    if (qtyInput) {
      syncQtyDisplay();
      bindOnceDetail(qtyInput, 'input', syncQtyDisplay);
      bindOnceDetail(qtyInput, 'blur', syncQtyDisplay);
      var minus = document.getElementById('qtyMinus');
      var plus = document.getElementById('qtyPlus');
      bindOnceDetail(minus, 'click', function() { qtyInput.value = currentQty() - 1; syncQtyDisplay(); });
      bindOnceDetail(plus, 'click', function() { qtyInput.value = currentQty() + 1; syncQtyDisplay(); });
    }

    var outOfStock = stock <= 0;
    var cartButton = document.getElementById('detailAddCart');
    Object.assign(cartButton.dataset, { id: id, name: product.name, price: product.price, image: product.image, stock: stock });
    cartButton.disabled = outOfStock;
    cartButton.title = outOfStock ? 'Out of stock' : '';
    bindOnceDetail(cartButton, 'click', function() {
      cartButton.dataset.quantity = currentQty();
      addToCart(cartButton);
    });

    var buyButton = document.getElementById('detailBuyNow');
    var stickyBuyButton = document.getElementById('stickyBuyNowButton');
    var stickyBuyName = document.getElementById('stickyBuyNowName');

    function prepareBuyButton(button) {
      if (!button) return;
      Object.assign(button.dataset, { id: id, name: product.name, price: product.price, image: product.image, stock: stock });
      button.disabled = outOfStock;
      button.title = outOfStock ? 'Out of stock' : '';
      bindOnceDetail(button, 'click', function() {
        button.dataset.quantity = currentQty();
        buyNow(button);
      });
    }

    prepareBuyButton(buyButton);
    prepareBuyButton(stickyBuyButton);
    if (stickyBar) stickyBar.classList.toggle('hidden', outOfStock);
    if (stickyBuyName) stickyBuyName.textContent = product.name;

    var wishButton = document.getElementById('detailWishlist');
    Object.assign(wishButton.dataset, { id: id, name: product.name, price: product.price, image: product.image });

    var wishlist = getStoredList(WISH_KEY);
    paintWishlist(wishButton, wishlist.some(function(item) { return item.id === id; }));

    bindOnceDetail(wishButton, 'click', function() {
      toggleWishlist(wishButton);
      var list = getStoredList(WISH_KEY);
      paintWishlist(wishButton, list.some(function(item) { return item.id === id; }));
    });

    initTabs();
    initReviewForm(id);
  }

  function getStoredReviews() {
    try {
      var all = JSON.parse(localStorage.getItem('smilehub_reviews') || '[]');
      return Array.isArray(all) ? all : [];
    } catch (e) {
      return [];
    }
  }

  function saveStoredReviews(reviews) {
    try {
      localStorage.setItem('smilehub_reviews', JSON.stringify(reviews.slice(0, 100)));
    } catch (e) {}
  }

  function renderOwnReviews(productId) {
    var box = document.getElementById('myReviews');
    if (!box) return;
    var mine = getStoredReviews().filter(function(r) { return r && r.productId === productId; }).slice(0, 3);
    box.innerHTML = mine.map(function(r) {
      var text = String(r.text || '').replace(/[<>]/g, '');
      return '<p class="my-review"><strong>You</strong> <span class="muted"> • ' + escAttr(r.rating || 5) + ' stars • submitted for moderation</span><br>' + text + '</p>';
    }).join('');
  }

  function escAttr(v) {
    return String(v).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function initReviewForm(productId) {
    renderOwnReviews(productId);
    var reviewForm = document.getElementById('reviewForm');
    if (!reviewForm || reviewForm.dataset.bound) return;
    reviewForm.dataset.bound = 'true';
    reviewForm.addEventListener('submit', function(e) {
      e.preventDefault();
      var ta = document.getElementById('reviewText');
      var err = document.getElementById('reviewError');
      var ratingEl = document.getElementById('reviewRating');
      var text = (ta.value || '').trim();
      if (text.length < 4) {
        if (err) { err.textContent = 'Please write a few words (min 4 characters).'; err.classList.add('show'); }
        ta.focus();
        return;
      }
      if (err) { err.textContent = ''; err.classList.remove('show'); }
      var reviews = getStoredReviews();
      reviews.unshift({
        id: 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        productId: productId,
        text: text,
        rating: ratingEl ? ratingEl.value : '5',
        date: new Date().toISOString(),
        status: 'pending'
      });
      saveStoredReviews(reviews);
      ta.value = '';
      renderOwnReviews(productId);
      paintHeaderRating(productId);
      if (typeof showToast === 'function') showToast('Review submitted for moderation.');
    });
  }

  try {
    getProductDetails(id, onDetails);
  } catch (e) {
    clearTimeout(loadTimer);
    showLoadError();
  }

  function initTabs() {
    var buttons = Array.prototype.slice.call(document.querySelectorAll('#productTabs .tab-button'));
    if (!buttons.length) return;

    function activate(button, focus) {
      buttons.forEach(function(item) {
        var selected = item === button;
        item.classList.toggle('active', selected);
        item.setAttribute('aria-selected', selected ? 'true' : 'false');
        item.tabIndex = selected ? 0 : -1;
        var panel = document.getElementById(item.dataset.tab);
        if (panel) panel.classList.toggle('hidden', !selected);
        if (selected && focus) item.focus();
      });
      try {
        history.replaceState(null, '', '#' + button.dataset.tab);
      } catch (e) {}
    }

    if (!detailTabsBound) {
      detailTabsBound = true;
      buttons.forEach(function(button, index) {
        button.addEventListener('click', function() { activate(button, false); });
        button.addEventListener('keydown', function(e) {
          var next = null;
          if (e.key === 'ArrowRight') next = buttons[(index + 1) % buttons.length];
          else if (e.key === 'ArrowLeft') next = buttons[(index - 1 + buttons.length) % buttons.length];
          else if (e.key === 'Home') next = buttons[0];
          else if (e.key === 'End') next = buttons[buttons.length - 1];
          if (next) { e.preventDefault(); activate(next, true); }
        });
      });
    }

    var hash = (location.hash || '').replace('#', '');
    var fromHash = buttons.filter(function(b) { return b.dataset.tab === hash; })[0];
    activate(fromHash || buttons[0], false);
  }
});
