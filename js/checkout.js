document.addEventListener('DOMContentLoaded', function() {
  var cart = getStoredList(CART_KEY);
  var user = window.SmileHubAuth ? window.SmileHubAuth.getLoggedInUser() : null;
  var fullAccount = user ? window.SmileHubAuth.getCurrentAccount() : null;

  // Prefill from logged-in user
  if (fullAccount) {
    var nameParts = (fullAccount.name || '').split(' ');
    var firstName = document.getElementById('checkoutFirstName');
    var lastName = document.getElementById('checkoutLastName');
    var email = document.getElementById('checkoutEmail');
    if (firstName) firstName.value = nameParts[0] || '';
    if (lastName) lastName.value = nameParts.slice(1).join(' ') || '';
    if (email) email.value = fullAccount.email || '';
  }

  function renderSummary() {
    var items = document.getElementById('checkoutItems');
    var subtotal = cart.reduce(function(sum, item) { return sum + item.price * item.quantity; }, 0);
    var shipping = subtotal >= 3000 || subtotal === 0 ? 0 : 150;
    var tax = subtotal * 0.12;
    var total = subtotal + shipping + tax;

    items.innerHTML = cart.length ? cart.map(function(item) {
      var img = item.image || 'assets/products/default.svg';
      return '<div class="checkout-item" style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">' +
        '<img src="' + img + '" alt="' + item.name.replace(/"/g,'&quot;') + '" style="width:50px;height:50px;object-fit:contain;border-radius:6px;background:#f8f9fa">' +
        '<div style="flex:1"><strong>' + item.name + '</strong><br><small class="muted">Qty: ' + item.quantity + ' &times; ' + money(item.price) + '</small></div>' +
        '<strong>' + money(item.price * item.quantity) + '</strong></div>';
    }).join('') : '<p class="muted">Your cart is empty.</p>';

    document.getElementById('checkoutSubtotal').textContent = money(subtotal);
    document.getElementById('checkoutShipping').textContent = money(shipping);
    document.getElementById('checkoutTax').textContent = money(tax);
    document.getElementById('checkoutTotal').textContent = money(total);
  }

  renderSummary();

  document.getElementById('checkoutForm').addEventListener('submit', function(event) {
    event.preventDefault();
    if (!cart.length) return showToast('Add products before checking out');

    var firstName = document.getElementById('checkoutFirstName').value.trim();
    var lastName = document.getElementById('checkoutLastName').value.trim();
    var email = document.getElementById('checkoutEmail').value.trim();
    var phone = document.getElementById('checkoutPhone').value.trim();
    var address = document.getElementById('checkoutAddress').value.trim();
    var postal = document.getElementById('checkoutPostal').value.trim();
    var city = document.getElementById('checkoutCity').value.trim();
    var payment = document.querySelector('input[name="payment"]:checked');
    var paymentMethod = payment ? payment.value : 'GCash';

    if (!firstName || !lastName || !email || !address) {
      return showToast('Please fill in all required fields');
    }

    var subtotal = cart.reduce(function(sum, item) { return sum + item.price * item.quantity; }, 0);
    var shipping = subtotal >= 3000 ? 0 : 150;
    var tax = subtotal * 0.12;
    var total = subtotal + shipping + tax;

    // Check for equipment/items over 50000 that need quotation
    var needsQuote = cart.some(function(item) { return item.price >= 50000; });

    var orders = getStoredList('smilehub_orders');
    var orderNumber = 'SH-' + Date.now().toString().slice(-7);
    var order = {
      number: orderNumber,
      orderNumber: orderNumber,
      customer: firstName + ' ' + lastName,
      customerName: firstName + ' ' + lastName,
      email: email,
      customerObj: { name: firstName + ' ' + lastName, email: email, phone: phone },
      shipping: { address: address, city: city, postal: postal, method: 'Standard' },
      payment: paymentMethod,
      items: cart.map(function(item) {
        return { productId: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image || 'assets/products/default.svg' };
      }),
      subtotal: subtotal,
      shipping: shipping,
      tax: tax,
      total: total,
      status: needsQuote ? 'Pending Quotation' : 'Pending',
      date: new Date().toISOString().split('T')[0],
      notes: needsQuote ? 'Contains high-value item(s) requiring quotation' : ''
    };
    orders.unshift(order);
    SmileHubStorage.set('smilehub_orders', orders);
    SmileHubData.saveOrders(orders);

    // Also save to simple orders for backward compatibility
    var simpleOrders = getStoredList('smilehub_simple_orders');
    simpleOrders.unshift({ number: order.number, date: order.date, total: total, status: order.status });
    saveStoredList('smilehub_simple_orders', simpleOrders);

    // Subtract stock for each purchased item
    SmileHubData.getProducts(function(products) {
      cart.forEach(function(item) {
        var product = products.find(function(p) { return String(p.id) === String(item.id); });
        if (product) {
          product.stock = Math.max(0, product.stock - item.quantity);
          product.status = product.stock === 0 ? 'Out of Stock' : product.stock <= 10 ? 'Low Stock' : 'Active';
        }
      });
      SmileHubData.saveProducts(products);
    });

    // Clear cart
    saveStoredList(CART_KEY, []);
    updateCartCount();

    // Show confirmation modal
    document.getElementById('confirmOrderNumber').textContent = order.orderNumber;
    document.getElementById('confirmEmail').textContent = email;
    var modal = document.getElementById('orderConfirmModal');
    modal.style.display = 'flex';
    modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });
  });
});
