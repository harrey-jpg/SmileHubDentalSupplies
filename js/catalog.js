// catalog.js - Reads from Firestore

// --- GET PRODUCTS FROM FIRESTORE ---
var catalogProducts = [];

function getCatalogProducts(callback) {
  var cached = SmileHubStorage.get('smilehub_products_cache', null);
  if (cached && cached.length > 0) {
    catalogProducts = cached;
    if (callback) callback(cached);
  }
  SmileHubData.getProducts(function(data) {
    catalogProducts = data;
    SmileHubStorage.set('smilehub_products_cache', data);
    if (callback) callback(data);
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

  getCatalogProducts(function(products) {
    initCatalog(products);
  });

  function initCatalog(products) {

  // Populate brand dropdown
  if (brand) {
    var brands = {};
    products.forEach(function(p) { if (p.brand) brands[p.brand] = true; });
    Object.keys(brands).sort().forEach(function(b) {
      var opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      brand.appendChild(opt);
    });
  }

  function buildProductCards() {
    grid.innerHTML = '';
    if (products.length === 0) {
      grid.innerHTML = '<div class="card empty-state"><h3>No products found</h3><p>Please add products in the admin dashboard.</p></div>';
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
      
      var statusText = p.stock > 0 ? p.stock + ' in stock' : 'Out of stock';
      var statusClass = p.stock > 0 ? 'stock' : 'stock out';
      
      card.innerHTML =
        '<button class="wish-button add-wishlist catalog-btn" data-id="' + p.id + '" data-name="' + p.name.replace(/"/g,'&quot;') + '" data-price="' + p.price + '" data-image="' + (p.image || 'assets/products/default.svg') + '" title="Add to wishlist">♡</button>' +
        '<a class="product-image" href="product.html?id=' + p.id + '" data-category="' + (p.category || 'General') + '"><img src="' + (p.image || 'assets/products/default.svg') + '" alt="' + p.name.replace(/"/g,'&quot;') + '"></a>' +
        '<div class="product-body">' +
          '<div class="product-category">' + (p.category || 'General') + '</div>' +
          '<a href="product.html?id=' + p.id + '"><h3>' + p.name + '</h3></a>' +
          '<div class="product-brand">' + (p.brand || 'SmileHub') + ' &middot; ' + (p.sku || 'SH-' + String(p.id).padStart(3, '0')) + '</div>' +
          '<div class="price-row"><span class="price">' + money(p.price || 0) + '</span> <span class="' + statusClass + '">' + statusText + '</span></div>' +
          '<div class="product-actions">' +
            '<button class="btn btn-primary add-cart catalog-btn" data-id="' + p.id + '" data-name="' + p.name.replace(/"/g,'&quot;') + '" data-price="' + p.price + '" data-image="' + (p.image || 'assets/products/default.svg') + '">Add to Cart</button>' +
            '<a class="btn btn-light" href="product.html?id=' + p.id + '">View</a>' +
          '</div>' +
        '</div>';
      grid.appendChild(card);
    });
    attachEventListeners();
  }

  function attachEventListeners() {
    document.querySelectorAll('.add-cart.catalog-btn').forEach(function(button) {
      var newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      newButton.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (typeof addToCart === 'function') addToCart(this);
      });
    });
    document.querySelectorAll('.add-wishlist.catalog-btn').forEach(function(button) {
      var newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);
      newButton.addEventListener('click', function(e) {
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
      btn.textContent = wishlist.some(function(item) { return item.id === id; }) ? '\u2665' : '\u2661';
      btn.classList.toggle('wished', wishlist.some(function(item) { return item.id === id; }));
    });
  }

  buildProductCards();

  // URL params
  var params = new URLSearchParams(location.search);
  if (search && params.get('q')) search.value = params.get('q');
  if (category && params.get('category')) category.value = params.get('category');
  if (brand && params.get('brand')) { brand.value = params.get('brand'); }

  function filterProducts() {
    var cards = Array.prototype.slice.call(grid.querySelectorAll('.product-card'));
    var term = (search ? search.value : '').toLowerCase();
    var selectedCategory = category ? category.value : 'all';
    var selectedBrand = brand ? brand.value : 'all';
    var minPrice = priceMin ? parseFloat(priceMin.value) || 0 : 0;
    var maxPrice = priceMax ? parseFloat(priceMax.value) || Infinity : Infinity;
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
  }

  search && search.addEventListener('input', filterProducts);
  category && category.addEventListener('change', filterProducts);
  brand && brand.addEventListener('change', filterProducts);
  priceMin && priceMin.addEventListener('input', filterProducts);
  priceMax && priceMax.addEventListener('input', filterProducts);
  inStockOnly && inStockOnly.addEventListener('change', filterProducts);
  sort && sort.addEventListener('change', filterProducts);
  filterProducts();

  document.addEventListener('visibilitychange', function() {
    if (!document.hidden) updateWishlistStates();
  });
  }
});