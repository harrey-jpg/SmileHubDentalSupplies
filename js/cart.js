document.addEventListener('DOMContentLoaded', function() {
  var savedCoupon = getAppliedCoupon();
  var couponInput = document.getElementById('couponInput');
  if (savedCoupon && couponInput) couponInput.value = savedCoupon;

  var applyBtn = document.getElementById('applyCouponBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', applyCouponFromInput);
  }
  var removeBtn=document.getElementById('removeCouponBtn');
  if(removeBtn) removeBtn.addEventListener('click', removeAppliedCoupon);
  if (couponInput) {
    couponInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); applyCouponFromInput(); }
    });
    couponInput.addEventListener('input', syncCouponButtons);
  }
  syncCouponButtons();

  renderCart();
  updateCartCount(); // Hide badge if empty
  refreshLiveCatalog(function() { reconcileCart(); });
});

var liveCatalog = null;
var cartNotices = {};

function refreshLiveCatalog(cb) {
  try {
    if (!window.SmileHubData || typeof SmileHubData.getProducts !== 'function') {
      if (cb) cb();
      return;
    }
    SmileHubData.getProducts(function(products) {
      liveCatalog = {};
      (products || []).forEach(function(p) {
        liveCatalog[Number(p.id)] = {
          price: Number(p.price) || 0,
          stock: Number(p.stock) || 0,
          sku: p.sku || ('SH-' + String(p.id).padStart(3, '0')),
          name: p.name || ''
        };
      });
      if (cb) cb();
    });
  } catch (e) {
    if (cb) cb();
  }
}

// Re-price rows and cap quantities against live catalog truth.
function reconcileCart() {
  if (!liveCatalog) return;
  var cart = getStoredList(CART_KEY);
  var changed = false;
  cartNotices = {};
  cart.forEach(function(item) {
    var live = liveCatalog[Number(item.id)];
    if (!live) return;
    if (Number(item.price) !== live.price) {
      item.price = live.price;
      cartNotices[item.id] = cartNotices[item.id] || {};
      cartNotices[item.id].priceUpdated = true;
      changed = true;
    }
    if (live.stock <= 0) {
      cartNotices[item.id] = cartNotices[item.id] || {};
      cartNotices[item.id].outOfStock = true;
    } else if (Number(item.quantity) > live.stock) {
      item.quantity = live.stock;
      cartNotices[item.id] = cartNotices[item.id] || {};
      cartNotices[item.id].capped = live.stock;
      changed = true;
    }
  });
  if (changed) {
    saveStoredList(CART_KEY, cart);
    updateCartCount();
    showToast('Cart updated to match live stock and prices');
  }
  renderCart();
}

function liveStockFor(id) {
  if (liveCatalog && liveCatalog[Number(id)]) return liveCatalog[Number(id)].stock;
  return null;
}

function syncCouponButtons(){
  var has=getAppliedCoupon();
  var removeBtn=document.getElementById('removeCouponBtn');
  var applyBtn=document.getElementById('applyCouponBtn');
  if(removeBtn) removeBtn.classList.toggle('hidden', !has);
  if(applyBtn) applyBtn.disabled=!!has;
}
function applyCouponFromInput() {
  var input = document.getElementById('couponInput');
  var feedback = document.getElementById('couponFeedback');
  var code = input ? input.value.trim() : '';

  if (couponDiscountRate(code) > 0) {
    setAppliedCoupon(code.toUpperCase());
    if (feedback) {
      feedback.textContent = 'Coupon applied: ' + code.toUpperCase() + ' (10% off)';
      feedback.style.color = '#1e9b61';
    }
  } else {
    setAppliedCoupon(null);
    if (feedback) {
      feedback.textContent = code ? 'Invalid coupon code.' : 'Enter a coupon code to apply.';
      feedback.style.color = '#d64545';
    }
    if (code) showToast('Invalid coupon code', true);
  }
  syncCouponButtons();
  renderCart();
}
function removeAppliedCoupon(){
  setAppliedCoupon(null);
  var input=document.getElementById('couponInput');
  var feedback=document.getElementById('couponFeedback');
  if(input) input.value='';
  if(feedback){ feedback.textContent='Coupon removed.'; feedback.style.color='#64748b'; }
  syncCouponButtons();
  renderCart();
  if(input) input.focus();
}

function renderCart(focus) {
  const cart = getStoredList(CART_KEY);
  const body = document.getElementById('cartBody');
  const unavailBox = document.getElementById('cartUnavail');
  const unavailBody = document.getElementById('cartUnavailBody');
  const empty = document.getElementById('emptyCart');
  if (!body) return;

  body.innerHTML = '';
  if (unavailBody) unavailBody.innerHTML = '';
  var unavailCount = 0;
  if (!cart.length) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    cart.forEach(function(item) {
      const live = liveCatalog ? liveCatalog[Number(item.id)] : null;
      const stock = live ? live.stock : null;
      const noStock = stock !== null && stock <= 0;
      if (noStock) {
        unavailCount++;
        if (unavailBody) unavailBody.appendChild(buildCartRow(item, live, true));
      } else {
        body.appendChild(buildCartRow(item, live, false));
      }
    });
    guardCheckout(cart);
    if (focus && focus.id !== undefined) {
      var scope = body.querySelector('tr[data-row-id="' + focus.id + '"]') ||
        (unavailBody && unavailBody.querySelector('tr[data-row-id="' + focus.id + '"]'));
      var anchor = (scope && scope.querySelector('[data-action="' + (focus.action || 'minus') + '"]')) ||
        body.querySelector('[data-action="remove"]');
      if (anchor) {
        anchor.focus();
      } else {
        var heading = empty.querySelector('h2');
        if (heading && !empty.classList.contains('hidden')) {
          heading.setAttribute('tabindex', '-1');
          heading.focus();
        }
      }
    }
  }
  if (unavailBox) unavailBox.classList.toggle('hidden', unavailCount === 0);
  updateSummary(cart);
  updateCartCount(); // Update badge after changes
}

function buildCartRow(item, live, dimmed) {
  const safeName = String(item.name == null ? '' : item.name).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
  });
  const sku = live ? live.sku : ('SH-' + String(Number(item.id)).padStart(3, '0'));
  const stock = live ? live.stock : null;
  const notice = cartNotices[item.id] || {};
  const atCap = stock !== null && stock > 0 && Number(item.quantity) >= stock;
  const noStock = stock !== null && stock <= 0;
  const flags = (notice.priceUpdated ? ' <span class="row-flag">Price updated</span>' : '') +
    (notice.capped ? ' <span class="row-flag">Only ' + notice.capped + ' available</span>' : '') +
    (noStock || notice.outOfStock ? ' <span class="row-flag flag-out">Out of stock</span>' : '');
  const row = document.createElement('tr');
  row.dataset.rowId = item.id;
  const qtyCtl = dimmed
    ? '<span role="status">' + Number(item.quantity) + ' (unavailable)</span>'
    : '<div class="quantity-control"><button data-action="minus" aria-label="Decrease quantity for ' + safeName + '">&#8722;</button><span role="status" aria-label="Quantity for ' + safeName + '">' + item.quantity + '</span><button data-action="plus" aria-label="Increase quantity for ' + safeName + '"' + (atCap || noStock ? ' disabled' : '') + '>+</button></div>';
  const notifyBtn = dimmed
    ? '<button class="btn btn-light notify-btn" data-restock="' + item.id + '" data-id="' + item.id + '" data-name="' + safeName + '" type="button">Notify me when back</button>'
    : '';
  row.innerHTML =
    '<td data-label="Product"><div class="cart-product"><img src="' + safeImage(item.image) + '" alt="' + safeName + '"><div><strong>' + safeName + '</strong><br><small class="muted">' + sku + '</small>' + flags + '</div></div></td>' +
    '<td data-label="Price">' + money(item.price) + '</td>' +
    '<td data-label="Quantity">' + qtyCtl + '</td>' +
    '<td data-label="Total">' + money(item.price * item.quantity) + '</td>' +
    '<td data-label="Action"><div class="row-actions">' + notifyBtn +
    '<button class="btn btn-light btn-sm" data-action="save" aria-label="Move ' + safeName + ' to wishlist">Save for later</button>' +
    '<button class="btn btn-danger btn-sm" data-action="remove" aria-label="Remove ' + safeName + ' from cart">Remove</button></div></td>';
  if (!dimmed) {
    row.querySelector('[data-action="minus"]').onclick = function() { changeQuantity(item.id, -1); };
    row.querySelector('[data-action="plus"]').onclick = function() { changeQuantity(item.id, 1); };
  }
  row.querySelector('[data-action="save"]').onclick = function() { saveForLater(item.id); };
  row.querySelector('[data-action="remove"]').onclick = function() { removeItem(item.id); };
  var nb = row.querySelector('[data-restock]');
  if (nb) {
    if (cartRestockIds().indexOf(Number(item.id)) >= 0) {
      nb.classList.add('is-on');
      nb.textContent = "\u2713 You're on the list";
    }
    nb.onclick = function() { toggleRestockCart(nb); };
  }
  return row;
}

function saveForLater(id) {
  const cart = getStoredList(CART_KEY);
  const idx = cart.findIndex(function(product) { return product.id === id; });
  if (idx < 0) return;
  const item = cart[idx];
  try {
    const wish = getStoredList(WISH_KEY);
    if (!wish.some(function(w) { return Number(w.id) === Number(id); })) {
      wish.push({ id: item.id, name: item.name, price: item.price, image: item.image });
      saveStoredList(WISH_KEY, wish);
    }
  } catch (e) {}
  if (typeof updateWishlistCount === 'function') updateWishlistCount();
  cart.splice(idx, 1);
  saveStoredList(CART_KEY, cart);
  updateCartCount();
  renderCart();
  showToast('Moved to your wishlist.');
}

function cartRestockIds() {
  try {
    var raw = JSON.parse(localStorage.getItem('smilehub_restock') || '[]');
    return (Array.isArray(raw) ? raw : []).map(function(entry) {
      return (typeof entry === 'number') ? entry : Number(entry.id);
    });
  } catch (e) {
    return [];
  }
}

function toggleRestockCart(button) {
  var id = Number(button.getAttribute('data-id'));
  var name = button.getAttribute('data-name') || ('Product #' + id);
  var raw = [];
  try {
    raw = JSON.parse(localStorage.getItem('smilehub_restock') || '[]');
    if (!Array.isArray(raw)) raw = [];
  } catch (e) {
    raw = [];
  }
  var ids = raw.map(function(entry) { return (typeof entry === 'number') ? entry : Number(entry.id); });
  var i = ids.indexOf(id);
  if (i >= 0) {
    raw = raw.filter(function(entry) {
      var entryId = (typeof entry === 'number') ? entry : Number(entry.id);
      return entryId !== id;
    });
    showToast('Removed from restock alerts');
  } else {
    raw.push({ id: id, name: name });
    showToast("You're on the restock list \u2014 see Profile \u203A Restock alerts");
  }
  try {
    localStorage.setItem('smilehub_restock', JSON.stringify(raw));
  } catch (e) {}
  renderCart();
  var nb = document.querySelector('[data-restock="' + id + '"]');
  if (nb) nb.focus();
}

function changeQuantity(id, amount) {
  const cart = getStoredList(CART_KEY);
  const item = cart.find(function(product) { return product.id === id; });
  if (!item) return;
  var next = Math.max(1, Number(item.quantity) + amount);
  var cap = liveStockFor(id);
  if (cap !== null && cap <= 0) {
    showToast('Sorry, this item is out of stock.', true);
    return;
  }
  if (cap !== null && next > cap) {
    next = cap;
    showToast('Only ' + cap + ' available');
  }
  item.quantity = Math.min(next, 999);
  saveStoredList(CART_KEY, cart);
  updateCartCount();
  renderCart({ id: id, action: amount > 0 ? 'plus' : 'minus' });
}

// Blocks checkout while any row exceeds live stock (or is out of stock).
function guardCheckout(cart) {
  document.querySelectorAll('a[href="checkout.html"]').forEach(function(proceed) {
    if (proceed.dataset.guarded) return;
    proceed.dataset.guarded = 'true';
    proceed.addEventListener('click', function(e) {
      var list = getStoredList(CART_KEY);
      var blocked = list.some(function(item) {
        var live = liveCatalog ? liveCatalog[Number(item.id)] : null;
        return live && (live.stock <= 0 || Number(item.quantity) > live.stock);
      });
      if (blocked) {
        e.preventDefault();
        reconcileCart();
        showToast('Some items exceed live stock — cart adjusted. Review and try again.', true);
      }
    });
  });
}

function removeItem(id) {
  const list = getStoredList(CART_KEY);
  const idx = list.findIndex(function(item) { return item.id === id; });
  if (idx < 0) return;
  lastRemoved = { item: list[idx], index: idx };
  const cart = list.filter(function(item) { return item.id !== id; });
  saveStoredList(CART_KEY, cart);
  updateCartCount();
  renderCart({ id: id, action: 'remove' });
  showUndoBar();
}

var lastRemoved = null;
var undoTimer = null;

function showUndoBar() {
  clearTimeout(undoTimer);
  var old = document.getElementById('cartUndo');
  if (old && old.parentNode) old.parentNode.removeChild(old);
  if (!lastRemoved) return;
  var bar = document.createElement('div');
  bar.className = 'undo-bar';
  bar.id = 'cartUndo';
  bar.setAttribute('role', 'status');
  var label = document.createElement('span');
  label.textContent = 'Removed ' + (lastRemoved.item.name || 'item') + '.';
  var btn = document.createElement('button');
  btn.className = 'btn btn-light btn-sm';
  btn.type = 'button';
  btn.textContent = 'Undo';
  btn.addEventListener('click', undoRemove);
  bar.appendChild(label);
  bar.appendChild(btn);
  var layout = document.querySelector('.cart-layout');
  if (layout && layout.parentNode) layout.parentNode.insertBefore(bar, layout);
  else document.body.appendChild(bar);
  undoTimer = setTimeout(function() {
    lastRemoved = null;
    var gone = document.getElementById('cartUndo');
    if (gone && gone.parentNode) gone.parentNode.removeChild(gone);
  }, 8000);
}

function undoRemove() {
  clearTimeout(undoTimer);
  if (!lastRemoved) return;
  const cart = getStoredList(CART_KEY);
  cart.splice(Math.min(lastRemoved.index, cart.length), 0, lastRemoved.item);
  var id = lastRemoved.item.id;
  lastRemoved = null;
  var bar = document.getElementById('cartUndo');
  if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
  saveStoredList(CART_KEY, cart);
  updateCartCount();
  renderCart();
  var anchor = document.querySelector('tr[data-row-id="' + id + '"] [data-action="remove"]');
  if (anchor) anchor.focus();
}

function safeImage(value) {
  var src = String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
  });
  // Only allow relative asset paths and data URLs into the img src.
  return /^(https?:|data:|assets\/)/.test(src) ? src : 'assets/products/default.svg';
}

function updateSummary(cart) {
  const subtotal = cart.reduce(function(sum, item) { return sum + item.price * item.quantity; }, 0);
  const shipping = subtotal >= 3000 || subtotal === 0 ? 0 : 150;
  const discount = subtotal * couponDiscountRate(getAppliedCoupon());
  // VAT applies to the discounted amount actually paid (matches checkout).
  const tax = (subtotal - discount) * 0.12;
  const total = subtotal + shipping + tax - discount;
  document.getElementById('cartSubtotal').textContent = money(subtotal);
  document.getElementById('cartShipping').textContent = money(shipping);
  document.getElementById('cartTax').textContent = money(tax);
  const discountRow = document.getElementById('cartDiscountRow');
  const discountEl = document.getElementById('cartDiscount');
  if (discountRow && discountEl) {
    if (discount > 0) {
      discountRow.style.display = 'flex';
      discountEl.textContent = '−' + money(discount);
    } else {
      discountRow.style.display = 'none';
    }
  }
  document.getElementById('cartTotal').textContent = money(total);
  var progressText = document.getElementById('shipProgressText');
  var progressBar = document.getElementById('shipProgressBar');
  if (progressText && progressBar) {
    if (subtotal <= 0) {
      progressText.textContent = 'Add items to unlock free shipping.';
      progressBar.style.width = '0%';
    } else if (subtotal >= 3000) {
      progressText.textContent = 'Free shipping unlocked!';
      progressBar.style.width = '100%';
    } else {
      progressText.textContent = money(3000 - subtotal) + ' away from free shipping.';
      progressBar.style.width = Math.min(100, subtotal / 3000 * 100) + '%';
    }
  }
}
document.addEventListener('smilehub:data-synced', function () {
  if (typeof renderCart === 'function') renderCart();
});
