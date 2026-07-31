document.addEventListener('DOMContentLoaded', function() {
  var savedCoupon = getAppliedCoupon();
  var couponInput = document.getElementById('couponInput');
  if (savedCoupon && couponInput) couponInput.value = savedCoupon;

  var applyBtn = document.getElementById('applyCouponBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', applyCouponFromInput);
  }
  if (couponInput) {
    couponInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); applyCouponFromInput(); }
    });
  }

  renderCart();
  updateCartCount(); // Hide badge if empty
});

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
    showToast('Coupon applied: ' + code.toUpperCase());
  } else {
    setAppliedCoupon(null);
    if (feedback) {
      feedback.textContent = code ? 'Invalid coupon code.' : 'Enter a coupon code to apply.';
      feedback.style.color = '#d64545';
    }
    if (code) showToast('Invalid coupon code', true);
  }
  renderCart();
}

function renderCart() {
  const cart = getStoredList(CART_KEY);
  const body = document.getElementById('cartBody');
  const empty = document.getElementById('emptyCart');
  if (!body) return;

  body.innerHTML = '';
  if (!cart.length) {
    empty.classList.remove('hidden');
  } else {
    empty.classList.add('hidden');
    cart.forEach(function(item) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><div class="cart-product"><img src="${item.image}" alt=""><div><strong>${item.name}</strong><br><small class="muted">Product ID: ${item.id}</small></div></div></td>
        <td>${money(item.price)}</td>
        <td><div class="quantity-control"><button data-action="minus">−</button><span>${item.quantity}</span><button data-action="plus">+</button></div></td>
        <td>${money(item.price * item.quantity)}</td>
        <td><button class="btn btn-danger" data-action="remove">Remove</button></td>`;
      row.querySelector('[data-action="minus"]').onclick = function() { changeQuantity(item.id, -1); };
      row.querySelector('[data-action="plus"]').onclick = function() { changeQuantity(item.id, 1); };
      row.querySelector('[data-action="remove"]').onclick = function() { removeItem(item.id); };
      body.appendChild(row);
    });
  }
  updateSummary(cart);
  updateCartCount(); // Update badge after changes
}

function changeQuantity(id, amount) {
  const cart = getStoredList(CART_KEY);
  const item = cart.find(function(product) { return product.id === id; });
  if (item) item.quantity = Math.max(1, item.quantity + amount);
  saveStoredList(CART_KEY, cart);
  updateCartCount();
  renderCart();
}

function removeItem(id) {
  const cart = getStoredList(CART_KEY).filter(function(item) { return item.id !== id; });
  saveStoredList(CART_KEY, cart);
  updateCartCount();
  renderCart();
}

function updateSummary(cart) {
  const subtotal = cart.reduce(function(sum, item) { return sum + item.price * item.quantity; }, 0);
  const shipping = subtotal >= 3000 || subtotal === 0 ? 0 : 150;
  const tax = subtotal * 0.12;
  const discount = subtotal * couponDiscountRate(getAppliedCoupon());
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
}