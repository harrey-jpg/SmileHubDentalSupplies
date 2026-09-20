// catalog.js - Reads from Firestore

// --- GET PRODUCTS FROM FIRESTORE ---
var catalogProducts = [];

var PRODUCTS_CACHE_KEY = 'smilehub_products_cache_v2';

function getCatalogProducts(callback) {
  var cached = SmileHubStorage.get(PRODUCTS_CACHE_KEY, null);
  var cachedMeta = SmileHubStorage.get('smilehub_products_meta', null);

  function useCached() {
    if (cached && cached.length > 0) {
      catalogProducts = cached;
      if (callback) callback(cached);
      return true;
    }
    return false;
  }

  SmileHubData.getProductsMeta(function(meta) {
    if (meta && cached && cached.length > 0 && cachedMeta && cachedMeta.version === meta.version) {
      catalogProducts = cached;
      if (callback) callback(cached);
      return;
    }
    // Meta unavailable (e.g. offline): fall back to the cached copy.
    if (!meta && useCached()) return;

    SmileHubData.getProducts(function(data) {
      catalogProducts = data;
      SmileHubStorage.set(PRODUCTS_CACHE_KEY, data);
      if (meta) SmileHubStorage.set('smilehub_products_meta', meta);
      if (callback) callback(data);
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  const search = document.getElementById('catalogSearch');
  const category = document.getElementById('categoryFilter');
  const brand = document.getElementById('brandFilter');
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');
  const inStockOnly = document.getElementById('inStockOnly');
  const sort = document.getElementById('sortProducts');
  const grid = document.getElementById('productGrid');
  const count = document.getElementById('productCount');
  
  if (!grid) return;

  var catalogLoaded = false;
  var catalogTimer = null;
  var catalogAttempts = 0;
  function renderCatalogSkeletons() {
    grid.innerHTML = Array.from({ length: 6 }, function() {
      return '<article class="card product-card" aria-hidden="true"><div class="product-image"><div class="skeleton catalog-skel-img"></div></div><div class="product-body"><div class="skeleton skeleton-text skeleton-title"></div><div class="skeleton skeleton-text skeleton-desc"></div><div class="skeleton skeleton-text skeleton-price"></div></div></article>';
    }).join('');
  }
  function showCatalogError() {
    catalogLoaded = true;
    grid.innerHTML = '<div class="card empty-state"><h3>Couldn\'t load products</h3><p>Check your connection and try again. Your filters are kept.</p><button class="btn btn-primary" type="button" id="catalogRetry">Retry</button></div>';
    if (count) count.textContent = 'Products unavailable';
    var retry = document.getElementById('catalogRetry');
    if (retry) retry.addEventListener('click', attemptCatalogLoad);
  }
  function attemptCatalogLoad() {
    catalogLoaded = false;
    catalogAttempts++;
    renderCatalogSkeletons();
    if (count) count.textContent = catalogAttempts > 1 ? 'Retrying… (attempt ' + catalogAttempts + ')' : 'Loading products…';
    clearTimeout(catalogTimer);
    catalogTimer = setTimeout(function() {
      if (!catalogLoaded) showCatalogError();
    }, 10000);
    try {
      getCatalogProducts(function(products) {
        catalogLoaded = true;
        clearTimeout(catalogTimer);
        initCatalog(products);
      });
    } catch (e) {
      clearTimeout(catalogTimer);
      showCatalogError();
    }
  }
  renderCatalogSkeletons();
  attemptCatalogLoad();

  var catalogUiBound = false;

  function initCatalog(products) {

  // Populate brand dropdown (cleared first so retries never duplicate options)
  if (brand) {
    brand.querySelectorAll('option:not([value="all"])').forEach(function(o) { o.remove(); });
    var brands = {};
    products.forEach(function(p) { if (p.brand) brands[p.brand] = true; });
    Object.keys(brands).sort().forEach(function(b) {
      var opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      brand.appendChild(opt);
    });
  }

  var HEART_SVG = '<svg class="heart-icon" width="18" height="18" viewBox="0 0 256 256" fill="none" aria-hidden="true"><path d="M128 216S24 152 24 88c0-29.7 24.1-54 54-54 19.4 0 36.7 10.3 50 26.3C141.3 44.3 158.6 34 178 34c29.9 0 54 24.3 54 54 0 64-104 128-104 128Z" stroke="currentColor" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var BOLT_SVG = '<svg width="16" height="16" viewBox="0 0 256 256" fill="none" aria-hidden="true"><path d="M144 24 48 144h64l-8 88 96-120h-64l8-88Z" stroke="currentColor" stroke-width="20" stroke-linejoin="round"/></svg>';

  function setWishState(btn, wished) {
    if (typeof paintHeart === 'function') { paintHeart(btn, wished); return; }
    btn.classList.toggle('wished', wished);
    var svg = btn.querySelector('.heart-icon');
    if (svg) svg.setAttribute('fill', wished ? 'currentColor' : 'none');
  }

  function buildProductCards() {
    grid.innerHTML = '';
    if (products.length === 0) {
      grid.innerHTML = '<div class="card empty-state"><h3>No products available</h3><p>New stock is on the way. Please check back soon.</p></div>';
      return;
    }
    products.forEach(function(p) {
      var card = document.createElement('article');
      card.className = 'card product-card';
      card.dataset.name = p.name;
      card.dataset.category = p.category || 'General';
      card.dataset.price = p.price || 0;
      card.dataset.brand = (p.brand || '').toLowerCase();
      card.dataset.stock = p.stock || 0;
      card.dataset.search = (p.name + ' ' + (p.brand || '') + ' ' + (p.category || '') + ' ' + (p.sku || '')).toLowerCase();
      
      var stockCount = Number(p.stock) || 0;
      var inStock = stockCount > 0;
      var statusText = !inStock ? 'Out of stock' : (stockCount <= 5 ? 'Only ' + stockCount + ' left' : stockCount + ' in stock');
      var statusClass = !inStock ? 'stock out' : (stockCount <= 5 ? 'stock low' : 'stock');
      var buyDisabled = inStock ? '' : ' disabled title="Out of stock"';

      card.innerHTML =
        '<button class="wish-button add-wishlist catalog-btn" data-id="' + p.id + '" data-name="' + p.name.replace(/"/g,'&quot;') + '" data-price="' + p.price + '" data-image="' + (p.image || 'assets/products/default.svg') + '" title="Add to wishlist" aria-label="Add ' + p.name.replace(/"/g,'&quot;') + ' to wishlist">' + HEART_SVG + '</button>' +
        '<a class="product-image" href="product.html?id=' + p.id + '" data-category="' + (p.category || 'General') + '"><img src="' + (p.image || 'assets/products/default.svg') + '" alt="' + ((p.brand || 'SmileHub') + ' ' + p.name).replace(/"/g,'&quot;') + '" loading="lazy" decoding="async" width="300" height="170"></a>' +
        '<div class="product-body">' +
          '<div class="product-category">' + (p.category || 'General') + '</div>' +
          '<a href="product.html?id=' + p.id + '"><h3>' + p.name + '</h3></a>' +
          '<div class="product-brand">' + (p.brand || 'SmileHub') + ' &middot; ' + (p.sku || 'SH-' + String(p.id).padStart(3, '0')) + '</div>' +
          '<div class="price-row"><span class="price">' + money(p.price || 0) + '</span> <span class="' + statusClass + '">' + statusText + '</span></div>' +
          '<div class="product-actions">' +
            '<button class="btn btn-primary add-cart catalog-btn" data-id="' + p.id + '" data-name="' + p.name.replace(/"/g,'&quot;') + '" data-price="' + p.price + '" data-image="' + (p.image || 'assets/products/default.svg') + '" data-stock="' + stockCount + '"' + buyDisabled + '>Add to Cart</button>' +
            '<button class="btn buy-now catalog-btn btn-quiet" data-id="' + p.id + '" data-name="' + p.name.replace(/"/g,'&quot;') + '" data-price="' + p.price + '" data-image="' + (p.image || 'assets/products/default.svg') + '" data-stock="' + stockCount + '"' + buyDisabled + '>' + BOLT_SVG + ' Buy Now</button>' +
            '<a class="btn btn-light" href="product.html?id=' + p.id + '">View</a>' +
          '</div>' +
        '</div>';
      grid.appendChild(card);
    });
    attachEventListeners();
  }

  function bindOnce(button, handler) {
    if (button.dataset.bound) return;
    button.dataset.bound = 'true';
    button.addEventListener('click', handler);
  }

  function attachEventListeners() {
    document.querySelectorAll('.add-cart.catalog-btn').forEach(function(button) {
      bindOnce(button, function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof addToCart === 'function') addToCart(this);
      });
    });
    document.querySelectorAll('.buy-now.catalog-btn').forEach(function(button) {
      bindOnce(button, function(e) {
        e.preventDefault(); e.stopPropagation(); buyNow(this);
      });
    });
    document.querySelectorAll('.add-wishlist.catalog-btn').forEach(function(button) {
      bindOnce(button, function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof toggleWishlist === 'function') { toggleWishlist(this); updateWishlistStates(); }
        else if (typeof addToWishlist === 'function') { addToWishlist(this); updateWishlistStates(); }
      });
    });
    updateWishlistStates();
  }

  function updateWishlistStates() {
    var wishlist = getStoredList(WISH_KEY);
    document.querySelectorAll('.add-wishlist.catalog-btn').forEach(function(btn) {
      var id = Number(btn.dataset.id);
      var wished = wishlist.some(function(item) { return item.id === id; });
      setWishState(btn, wished);
      btn.setAttribute('aria-pressed', wished ? 'true' : 'false');
    });
  }

  buildProductCards();

  // URL params (normalized, with safe fallback to "all")
  var params = new URLSearchParams(location.search);
  if (search && params.get('q')) {
    search.value = params.get('q');
    var headerSearch = document.querySelector('.search-bar input[name="q"]');
    if (headerSearch) headerSearch.value = params.get('q');
  }
  function matchOption(select, raw) {
    if (!select || !raw) return 'all';
    var norm = raw.toLowerCase().replace(/[-_]+/g, ' ').trim();
    var found = Array.prototype.filter.call(select.options, function(o) {
      return o.value.toLowerCase() === norm;
    })[0];
    return found ? found.value : 'all';
  }
  if (category && params.get('category')) category.value = matchOption(category, params.get('category'));
  if (brand && params.get('brand')) brand.value = matchOption(brand, params.get('brand'));

  var priceNotice = document.getElementById('priceNotice');
  var noResults = document.getElementById('noResults');

  function debounce(fn, ms) {
    var t;
    return function() {
      clearTimeout(t);
      var args = arguments, self = this;
      t = setTimeout(function() { fn.apply(self, args); }, ms);
    };
  }

  function filterProducts() {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));
    var term = (search ? search.value : '').toLowerCase();
    var selectedCategory = category ? category.value : 'all';
    var selectedBrand = brand ? brand.value : 'all';
    var minPrice = priceMin ? parseFloat(priceMin.value) || 0 : 0;
    var maxPrice = priceMax ? parseFloat(priceMax.value) || Infinity : Infinity;
    if (priceNotice) {
      var swapped = minPrice > maxPrice;
      if (swapped) {
        var tmp = minPrice; minPrice = maxPrice; maxPrice = tmp;
      }
      priceNotice.textContent = swapped ? 'Min price was higher than max — values swapped.' : '';
      priceNotice.classList.toggle('hidden', !swapped);
    } else if (minPrice > maxPrice) {
      var tmp2 = minPrice; minPrice = maxPrice; maxPrice = tmp2;
    }
    var hideOut = inStockOnly ? inStockOnly.checked : false;

    var visibleCount = 0;
    cards.forEach(function(card) {
      var match = true;
      if (term && !card.dataset.search.includes(term)) match = false;
      if (match && selectedCategory !== 'all' && card.dataset.category !== selectedCategory) match = false;
      if (match && selectedBrand !== 'all' && card.dataset.brand !== selectedBrand.toLowerCase()) match = false;
      if (match) {
        var price = Number(card.dataset.price);
        if (price < minPrice || price > maxPrice) match = false;
      }
      if (match && hideOut && Number(card.dataset.stock) <= 0) match = false;
      card.classList.toggle('hidden', !match);
      if (match) visibleCount++;
    });

    var visibleCards = cards.filter(function(c) { return !c.classList.contains('hidden'); });
    if (sort) {
      if (sort.value === 'price-low') visibleCards.sort(function(a,b) { return Number(a.dataset.price) - Number(b.dataset.price); });
      else if (sort.value === 'price-high') visibleCards.sort(function(a,b) { return Number(b.dataset.price) - Number(a.dataset.price); });
      else if (sort.value === 'name') visibleCards.sort(function(a,b) { return a.dataset.name.localeCompare(b.dataset.name); });
    }
    visibleCards.forEach(function(c) { grid.appendChild(c); });
    attachEventListeners();
    if (count) count.textContent = visibleCount + ' product' + (visibleCount !== 1 ? 's' : '') + ' found';
    noResults.classList.toggle('hidden', visibleCount !== 0);
  }

  function clearAllFilters() {
    if (search) search.value = '';
    if (category) category.value = 'all';
    if (brand) brand.value = 'all';
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';
    if (inStockOnly) inStockOnly.checked = false;
    if (sort) sort.value = 'default';
    try {
      history.replaceState(null, '', location.pathname);
    } catch (e) {}
    filterProducts();
    if (search) search.focus();
  }

  var filterSoon = debounce(filterProducts, 150);

  if (!catalogUiBound) {
    catalogUiBound = true;
    document.querySelectorAll('.clear-filters-btn').forEach(function(btn) {
      btn.addEventListener('click', clearAllFilters);
    });

    search && search.addEventListener('input', filterSoon);
    category && category.addEventListener('change', filterProducts);
    brand && brand.addEventListener('change', filterProducts);
    priceMin && priceMin.addEventListener('input', filterSoon);
    priceMax && priceMax.addEventListener('input', filterSoon);
    inStockOnly && inStockOnly.addEventListener('change', filterProducts);
    sort && sort.addEventListener('change', filterProducts);

    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) updateWishlistStates();
    });
  }
  filterProducts();
  }
});