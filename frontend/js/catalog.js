// catalog.js - Reads from localStorage (same as admin)

// Category to image mapping
const categoryImages = {
  'Oral Care': 'assets/products/oral-care.svg',
  'Instruments': 'assets/products/instrument.svg',
  'PPE': 'assets/products/ppe.svg',
  'Restorative': 'assets/products/restorative.svg',
  'Disposables': 'assets/products/disposable.svg',
  'Impression': 'assets/products/impression.svg',
  'Orthodontics': 'assets/products/orthodontic.svg',
  'Rotary': 'assets/products/instrument.svg',
  'Equipment': 'assets/products/equipment.svg',
  'Cosmetic': 'assets/products/restorative.svg'
};

// Default products (fallback)
const defaultProducts = [
  { id: 1, name: 'ProClean Soft Toothbrush 4-Pack', brand: 'SmilePro', category: 'Oral Care', price: 189, stock: 86, image: 'assets/products/oral-care.svg', sku: 'SH-OC-001' },
  { id: 2, name: 'SonicWave Electric Toothbrush', brand: 'Dentiva', category: 'Oral Care', price: 1299, stock: 24, image: 'assets/products/oral-care.svg', sku: 'SH-OC-002' },
  { id: 3, name: 'MintShield Fluoride Toothpaste 150g', brand: 'Oracare', category: 'Oral Care', price: 159, stock: 120, image: 'assets/products/oral-care.svg', sku: 'SH-OC-003' },
  { id: 4, name: 'FreshGuard Antibacterial Mouthwash 500mL', brand: 'Oracare', category: 'Oral Care', price: 249, stock: 67, image: 'assets/products/oral-care.svg', sku: 'SH-OC-004' },
  { id: 5, name: 'GlideEase Dental Floss 50m', brand: 'SmilePro', category: 'Oral Care', price: 99, stock: 144, image: 'assets/products/oral-care.svg', sku: 'SH-OC-005' },
  { id: 6, name: 'Stainless Dental Mirror No. 5', brand: 'Clinix', category: 'Instruments', price: 185, stock: 58, image: 'assets/products/instrument.svg', sku: 'SH-IN-006' },
  { id: 7, name: 'Double-Ended Explorer 17/23', brand: 'Clinix', category: 'Instruments', price: 295, stock: 37, image: 'assets/products/instrument.svg', sku: 'SH-IN-007' },
  { id: 8, name: 'Universal Scaler U15/30', brand: 'Clinix', category: 'Instruments', price: 449, stock: 29, image: 'assets/products/instrument.svg', sku: 'SH-IN-008' },
  { id: 9, name: 'Premium Extraction Forceps No. 150', brand: 'SurgiDent', category: 'Instruments', price: 1899, stock: 11, image: 'assets/products/instrument.svg', sku: 'SH-IN-009' },
  { id: 10, name: 'Nitrile Examination Gloves 100s', brand: 'SafeTouch', category: 'PPE', price: 399, stock: 78, image: 'assets/products/ppe.svg', sku: 'SH-PP-010' },
  { id: 11, name: 'Level 3 Surgical Face Masks 50s', brand: 'SafeTouch', category: 'PPE', price: 279, stock: 94, image: 'assets/products/ppe.svg', sku: 'SH-PP-011' },
  { id: 12, name: 'Full-Coverage Face Shield 10s', brand: 'MediGuard', category: 'PPE', price: 349, stock: 43, image: 'assets/products/ppe.svg', sku: 'SH-PP-012' },
  { id: 13, name: 'NanoFill Composite Resin A2', brand: 'Restora', category: 'Restorative', price: 899, stock: 32, image: 'assets/products/restorative.svg', sku: 'SH-RS-013' },
  { id: 14, name: 'Universal Bonding Agent 5mL', brand: 'Restora', category: 'Restorative', price: 1249, stock: 21, image: 'assets/products/restorative.svg', sku: 'SH-RS-014' },
  { id: 15, name: 'Phosphoric Acid Etchant Gel 3-Pack', brand: 'Restora', category: 'Restorative', price: 329, stock: 49, image: 'assets/products/restorative.svg', sku: 'SH-RS-015' },
  { id: 16, name: 'Glass Ionomer Luting Cement Kit', brand: 'CemDent', category: 'Restorative', price: 1399, stock: 18, image: 'assets/products/restorative.svg', sku: 'SH-RS-016' },
  { id: 17, name: 'Disposable Dental Bibs 125s', brand: 'ClinicEssentials', category: 'Disposables', price: 449, stock: 70, image: 'assets/products/disposable.svg', sku: 'SH-DI-017' },
  { id: 18, name: 'Self-Sealing Sterilization Pouches 200s', brand: 'SteriliSafe', category: 'Disposables', price: 699, stock: 34, image: 'assets/products/disposable.svg', sku: 'SH-DI-018' },
  { id: 19, name: 'Disposable Dental Syringes 100s', brand: 'ClinicEssentials', category: 'Disposables', price: 549, stock: 55, image: 'assets/products/disposable.svg', sku: 'SH-DI-019' },
  { id: 20, name: 'Absorbent Cotton Rolls 1000s', brand: 'ClinicEssentials', category: 'Disposables', price: 799, stock: 46, image: 'assets/products/disposable.svg', sku: 'SH-DI-020' },
  { id: 21, name: 'Fine Microbrush Applicators 100s', brand: 'MicroTip', category: 'Disposables', price: 199, stock: 105, image: 'assets/products/disposable.svg', sku: 'SH-DI-021' },
  { id: 22, name: 'Flexible Saliva Ejectors 100s', brand: 'ClinicEssentials', category: 'Disposables', price: 219, stock: 88, image: 'assets/products/disposable.svg', sku: 'SH-DI-022' },
  { id: 23, name: 'Premium Alginate Impression Material', brand: 'Impressa', category: 'Impression', price: 499, stock: 40, image: 'assets/products/impression.svg', sku: 'SH-IM-023' },
  { id: 24, name: 'VPS Putty Impression Material Kit', brand: 'Impressa', category: 'Impression', price: 2499, stock: 14, image: 'assets/products/impression.svg', sku: 'SH-IM-024' },
  { id: 25, name: 'Orthodontic Relief Wax 10-Pack', brand: 'OrthoEase', category: 'Orthodontics', price: 299, stock: 73, image: 'assets/products/orthodontic.svg', sku: 'SH-OR-025' },
  { id: 26, name: 'Elastic Chain Assortment 15ft', brand: 'OrthoEase', category: 'Orthodontics', price: 749, stock: 27, image: 'assets/products/orthodontic.svg', sku: 'SH-OR-026' },
  { id: 27, name: 'Diamond Dental Bur Set 30pcs', brand: 'BurMaster', category: 'Rotary', price: 1199, stock: 19, image: 'assets/products/instrument.svg', sku: 'SH-RO-027' },
  { id: 28, name: 'LED Curing Light 1200mW', brand: 'LumaDent', category: 'Equipment', price: 3299, stock: 12, image: 'assets/products/equipment.svg', sku: 'SH-EQ-028' },
  { id: 29, name: 'Ultrasonic Scaler with 5 Tips', brand: 'ProSonic', category: 'Equipment', price: 6999, stock: 7, image: 'assets/products/equipment.svg', sku: 'SH-EQ-029' },
  { id: 30, name: 'Class B Autoclave 18L Demo Unit', brand: 'SteriliTech', category: 'Equipment', price: 89999, stock: 2, image: 'assets/products/equipment.svg', sku: 'SH-EQ-030' },
  { id: 31, name: 'Ergonomic Dental Chair Demo Package', brand: 'ChairPro', category: 'Equipment', price: 189999, stock: 1, image: 'assets/products/equipment.svg', sku: 'SH-EQ-031' },
  { id: 32, name: 'Professional Teeth Whitening Kit', brand: 'BrightDent', category: 'Cosmetic', price: 2899, stock: 16, image: 'assets/products/restorative.svg', sku: 'SH-CO-032' }
];

// --- GET PRODUCTS FROM LOCALSTORAGE (SAME AS ADMIN) ---
function getCatalogProducts() {
  let products = [];
  
  // Try to get from localStorage
  try {
    const saved = localStorage.getItem('smilehub_products');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        products = parsed;
      }
    }
  } catch (e) {}
  
  // If no data, use defaults
  if (products.length === 0) {
    products = defaultProducts;
  }
  
  return products;
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

  var products = getCatalogProducts();

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
  else if (brand && params.get('brand')) { brand.value = params.get('brand'); }

  function filterProducts() {
    var cards = [...grid.querySelectorAll('.product-card')];
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
});