var wishlistLive = {};
var wishlistUndoTimer = null;

function readRestockList() {
  try {
    var raw = JSON.parse(localStorage.getItem('smilehub_restock') || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch (e) {
    return [];
  }
}

function restockIds(list) {
  return list.map(function(entry) {
    return (typeof entry === 'number') ? entry : Number(entry.id);
  });
}

function toggleRestockWish(button) {
  var id = Number(button.dataset.id);
  var list = readRestockList();
  var ids = restockIds(list);
  var i = ids.indexOf(id);
  if (i >= 0) {
    list = list.filter(function(entry) {
      var entryId = (typeof entry === 'number') ? entry : Number(entry.id);
      return entryId !== id;
    });
    button.classList.remove('is-on');
    button.textContent = 'Notify me when back';
    showToast('Removed from restock alerts');
  } else {
    list.push({ id: id, name: button.dataset.name || ('Product #' + id) });
    button.classList.add('is-on');
    button.textContent = "✓ You're on the list";
    showToast("You're on the restock list — see Profile › Restock alerts");
  }
  try {
    localStorage.setItem('smilehub_restock', JSON.stringify(list));
  } catch (e) {}
}

function escHtml(value) {
  return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

function safeImageLocal(value) {
  var src = escHtml(value);
  return /^(https?:|data:|assets\/)/.test(src) ? src : 'assets/products/default.svg';
}

var HEART_FILL_SVG = '<svg class="heart-icon" width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M128 216S24 152 24 88c0-29.7 24.1-54 54-54 19.4 0 36.7 10.3 50 26.3C141.3 44.3 158.6 34 178 34c29.9 0 54 24.3 54 54 0 64-104 128-104 128Z" stroke="currentColor" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function wishlistStockChip(id) {
  if (!(Number(id) in wishlistLive)) return '';
  var stock = wishlistLive[Number(id)];
  if (stock <= 0) return ' <span class="stock out">Out of stock</span>';
  if (stock <= 5) return ' <span class="stock low">Only ' + stock + ' left</span>';
  return ' <span class="stock">' + stock + ' in stock</span>';
}

function renderWishlist() {
  var grid = document.getElementById('wishlistGrid');
  if (!grid) return;
  // Clear any pending undo bar when re-rendering from a fresh state.
  var oldUndo = document.getElementById('wishlistUndo');
  if (oldUndo) oldUndo.remove();
  clearTimeout(wishlistUndoTimer);

  var wishlist = getStoredList(WISH_KEY);
  updateWishlistCount();

  if (!wishlist.length) {
    grid.innerHTML = '<div class="card empty-state"><h3>No saved products yet</h3><p>Use the heart buttons in the catalog. Out-of-stock picks can wait on your <a href="profile.html">restock alerts</a>.</p><a class="btn btn-primary" href="products.html">Browse Products</a></div>';
    return;
  }

  grid.innerHTML = wishlist.map(function(item) {
    var id = Number(item.id);
    var name = escHtml(item.name || 'Product');
    var price = Number(item.price) || 0;
    var img = safeImageLocal(item.image);
    var stockKnown = id in wishlistLive;
    var inStock = stockKnown ? wishlistLive[id] > 0 : true;
    var actions = (stockKnown && !inStock)
      ? '<button class="btn btn-light notify-btn" data-id="' + id + '" data-name="' + name + '" type="button">Notify me when back</button>' +
        '<a class="btn btn-light" href="profile.html">Restock alerts</a>'
      : '<button class="btn btn-primary add-cart" data-id="' + id + '" data-name="' + name + '" data-price="' + price + '" data-image="' + img + '">Add to Cart</button>' +
        '<button class="btn btn-light move-cart" data-id="' + id + '">Move to Cart</button>';
    return '' +
      '<article class="card product-card" data-wish-id="' + id + '">' +
        '<button class="wish-button remove-wishlist wished" data-id="' + id + '" title="Remove from wishlist" aria-label="Remove ' + name + ' from wishlist">' + HEART_FILL_SVG + '</button>' +
        '<a class="product-image" href="product.html?id=' + id + '"><img src="' + img + '" alt="' + name + '" loading="lazy" decoding="async" width="300" height="170"></a>' +
        '<div class="product-body">' +
          '<a href="product.html?id=' + id + '"><h3>' + name + '</h3></a>' +
          '<div class="price-row"><span class="price">' + money(price) + '</span>' + wishlistStockChip(id) + '</div>' +
          '<div class="product-actions">' + actions + '</div>' +
        '</div>' +
      '</article>';
  }).join('');

  grid.querySelectorAll('.notify-btn').forEach(function(button) {
    var saved = readRestockList();
    if (restockIds(saved).indexOf(Number(button.dataset.id)) >= 0) {
      button.classList.add('is-on');
      button.textContent = "✓ You're on the list";
    }
    button.addEventListener('click', function() { toggleRestockWish(this); });
  });

  grid.querySelectorAll('.add-cart').forEach(function(button) {
    button.addEventListener('click', function() {
      var id = Number(button.dataset.id);
      if (id in wishlistLive) button.dataset.stock = wishlistLive[id];
      addToCart(button);
    });
  });

  grid.querySelectorAll('.move-cart').forEach(function(button) {
    button.addEventListener('click', function() {
      var id = Number(button.dataset.id);
      // Guests are routed through login first; removal happens after restore.
      if (!customerIsLoggedIn()) {
        var guestItem = null;
        getStoredList(WISH_KEY).forEach(function(entry) { if (Number(entry.id) === id) guestItem = entry; });
        if (guestItem) {
          var guestProxy = document.createElement('button');
          guestProxy.dataset.id = guestItem.id;
          guestProxy.dataset.name = guestItem.name || 'Product';
          guestProxy.dataset.price = guestItem.price || 0;
          guestProxy.dataset.image = guestItem.image || 'assets/products/default.svg';
          guestProxy.dataset.quantity = 1;
          addToCart(guestProxy);
        }
        return;
      }
      var list = getStoredList(WISH_KEY);
      var item = null;
      list.forEach(function(entry) { if (Number(entry.id) === id) item = entry; });
      if (!item) return;
      var proxy = document.createElement('button');
      proxy.dataset.id = item.id;
      proxy.dataset.name = item.name || 'Product';
      proxy.dataset.price = item.price || 0;
      proxy.dataset.image = item.image || 'assets/products/default.svg';
      proxy.dataset.quantity = 1;
      if (id in wishlistLive) proxy.dataset.stock = wishlistLive[id];
      var before = getStoredList(CART_KEY).length;
      addToCart(proxy);
      var after = getStoredList(CART_KEY);
      // Only remove from wishlist if the cart add actually went through
      // (guests are redirected, out-of-stock is blocked).
      var added = after.length > before || after.some(function(entry) {
        return Number(entry.id) === id;
      });
      if (added && customerIsLoggedIn()) {
        removeWishlistItem(id, true);
        showToast((item.name || 'Item') + ' moved to cart');
      }
    });
  });

  grid.querySelectorAll('.remove-wishlist').forEach(function(button) {
    button.addEventListener('click', function() {
      removeWishlistItem(Number(button.dataset.id), false);
    });
  });
}

function removeWishlistItem(id, silent) {
  var list = getStoredList(WISH_KEY);
  var removed = null;
  var kept = [];
  list.forEach(function(entry) {
    if (Number(entry.id) === id && !removed) removed = entry;
    else kept.push(entry);
  });
  if (!removed) return;
  saveStoredList(WISH_KEY, kept);
  updateWishlistCount();
  renderWishlist();

  if (silent) return;
  var grid = document.getElementById('wishlistGrid');
  var bar = document.createElement('div');
  bar.className = 'undo-bar';
  bar.id = 'wishlistUndo';
  bar.innerHTML = '<span>Removed ' + escHtml(removed.name || 'item') + '.</span>';
  var undoBtn = document.createElement('button');
  undoBtn.className = 'btn btn-light';
  undoBtn.type = 'button';
  undoBtn.textContent = 'Undo';
  undoBtn.addEventListener('click', function() {
    var current = getStoredList(WISH_KEY);
    var exists = current.some(function(entry) { return Number(entry.id) === id; });
    if (!exists) {
      current.push(removed);
      saveStoredList(WISH_KEY, current);
    }
    updateWishlistCount();
    renderWishlist();
    showToast('Restored to wishlist');
  });
  bar.appendChild(undoBtn);
  grid.parentNode.insertBefore(bar, grid);
  clearTimeout(wishlistUndoTimer);
  wishlistUndoTimer = setTimeout(function() {
    if (bar.parentNode) bar.parentNode.removeChild(bar);
  }, 5000);
}

document.addEventListener('DOMContentLoaded', function() {
  updateWishlistCount();
  renderWishlist();
  // Enrich with live stock (chips + guards) once the catalog resolves.
  try {
    if (window.SmileHubData && typeof SmileHubData.getProducts === 'function') {
      SmileHubData.getProducts(function(products) {
        (products || []).forEach(function(p) {
          wishlistLive[Number(p.id)] = Number(p.stock) || 0;
        });
        renderWishlist();
      });
    }
  } catch (e) {}
});

document.addEventListener('smilehub:data-synced', function() {
  if (typeof renderWishlist === 'function') renderWishlist();
});
