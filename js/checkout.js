var PAYMONGO_PUBLISHABLE_KEY = '';
var GOOGLE_MAPS_KEY = ''; // Set your Google Maps API key for address autocomplete

function initMapAutocomplete() {
  var input = document.getElementById('checkoutAddress');
  if (!input || !GOOGLE_MAPS_KEY || !window.google) return;
  var autocomplete = new google.maps.places.Autocomplete(input, { types: ['address'], componentRestrictions: { country: 'PH' } });
  autocomplete.addListener('place_changed', function() {
    var place = autocomplete.getPlace();
    if (place.address_components) {
      var city = '';
      var postal = '';
      place.address_components.forEach(function(c) {
        if (c.types.indexOf('locality') > -1) city = c.long_name;
        if (c.types.indexOf('postal_code') > -1) postal = c.long_name;
      });
      if (document.getElementById('checkoutCity')) document.getElementById('checkoutCity').value = city;
      if (document.getElementById('checkoutPostal')) document.getElementById('checkoutPostal').value = postal;
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var cart = getStoredList(CART_KEY);
  var user = window.SmileHubAuth ? window.SmileHubAuth.getLoggedInUser() : null;
  var fullAccount = user ? window.SmileHubAuth.getCurrentAccount() : null;

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

  // Toggle billing section when payment method changes
  var paymentRadios = document.querySelectorAll('input[name="payment"]');
  var billingSection = document.getElementById('billingSection');
  paymentRadios.forEach(function(radio) {
    radio.addEventListener('change', function() {
      billingSection.style.display = this.value === 'Credit Card' || this.value === 'GCash' ? 'block' : 'none';
    });
  });

  // Prefill billing from shipping
  function copyShippingToBilling() {
    document.getElementById('billingFirstName').value = document.getElementById('checkoutFirstName').value;
    document.getElementById('billingLastName').value = document.getElementById('checkoutLastName').value;
    document.getElementById('billingEmail').value = document.getElementById('checkoutEmail').value;
    document.getElementById('billingPhone').value = document.getElementById('checkoutPhone').value;
    document.getElementById('billingAddress').value = document.getElementById('checkoutAddress').value;
  }
  var sameAsShipping = document.getElementById('sameAsShipping');
  if (sameAsShipping) {
    sameAsShipping.addEventListener('change', function() {
      if (this.checked) copyShippingToBilling();
    });
  }

  function processPayment(order, total, callback) {
    if (!PAYMONGO_PUBLISHABLE_KEY) {
      callback(null);
      return;
    }
    if (!window.PayMongo) {
      callback(null);
      return;
    }
    PayMongo.setPublishableKey(PAYMONGO_PUBLISHABLE_KEY);
    var amountCentavos = Math.round(total * 100);
    var description = 'Order ' + order.orderNumber + ' - SmileHub Dental Supplies';
    PayMongo.createPaymentIntent({
      amount: amountCentavos,
      currency: 'PHP',
      description: description,
      statement_descriptor: 'SMILEHUB'
    }).then(function(intent) {
      var paymentIntentId = intent.id;
      var sourceType = order.payment === 'GCash' ? 'gcash' : 'card';
      return PayMongo.createSource({
        type: sourceType,
        amount: amountCentavos,
        currency: 'PHP',
        redirect: {
          success: window.location.origin + '/checkout.html?payment=success&order=' + order.orderNumber,
          failed: window.location.origin + '/checkout.html?payment=failed&order=' + order.orderNumber
        }
      }).then(function(source) {
        return PayMongo.attachPaymentIntent(paymentIntentId, source.id);
      }).then(function() {
        return PayMongo.retrievePaymentIntent(paymentIntentId);
      }).then(function(updatedIntent) {
        if (updatedIntent.attributes.next_action && updatedIntent.attributes.next_action.type === 'redirect') {
          window.location.href = updatedIntent.attributes.next_action.redirect.url;
        } else {
          callback(null);
        }
      });
    }).catch(function() {
      callback(null);
    });
  }

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

    // Validate billing fields for card/GCash payments
    if (paymentMethod === 'Credit Card' || paymentMethod === 'GCash') {
      var bfName = document.getElementById('billingFirstName').value.trim();
      var blName = document.getElementById('billingLastName').value.trim();
      var bEmail = document.getElementById('billingEmail').value.trim();
      var bAddr = document.getElementById('billingAddress').value.trim();
      if (!bfName || !blName || !bEmail || !bAddr) {
        return showToast('Please fill in all billing details');
      }
    }

    var subtotal = cart.reduce(function(sum, item) { return sum + item.price * item.quantity; }, 0);
    var shipping = subtotal >= 3000 ? 0 : 150;
    var tax = subtotal * 0.12;
    var total = subtotal + shipping + tax;

    var needsQuote = cart.some(function(item) { return item.price >= 50000; });

    var orders = getStoredList('smilehub_orders');
    var orderNumber = 'SH-' + Date.now().toString().slice(-7);

    var billingInfo = {};
    if (paymentMethod === 'Credit Card' || paymentMethod === 'GCash') {
      billingInfo = {
        firstName: document.getElementById('billingFirstName').value.trim(),
        lastName: document.getElementById('billingLastName').value.trim(),
        email: document.getElementById('billingEmail').value.trim(),
        phone: document.getElementById('billingPhone').value.trim(),
        address: document.getElementById('billingAddress').value.trim()
      };
    }

    var order = {
      number: orderNumber,
      orderNumber: orderNumber,
      customer: firstName + ' ' + lastName,
      customerName: firstName + ' ' + lastName,
      email: email,
      customerObj: { name: firstName + ' ' + lastName, email: email, phone: phone },
      shipping: { address: address, city: city, postal: postal, method: 'Standard' },
      billing: billingInfo,
      payment: paymentMethod,
      items: cart.map(function(item) {
        return { productId: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image || 'assets/products/default.svg' };
      }),
      subtotal: subtotal,
      shipping: shipping,
      tax: tax,
      total: total,
      status: needsQuote ? 'Pending Quotation' : (paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Pending Payment'),
      date: new Date().toISOString().split('T')[0],
      notes: needsQuote ? 'Contains high-value item(s) requiring quotation' : ''
    };

    processPayment(order, total, function(paymentError) {
      order.status = needsQuote ? 'Pending Quotation' : 'Pending';
      if (!paymentError && (paymentMethod === 'Credit Card' || paymentMethod === 'GCash')) {
        if (order.paymentStatus !== 'paid') order.status = 'Pending';
      }

      orders.unshift(order);
      SmileHubStorage.set('smilehub_orders', orders);
      SmileHubData.saveOrders(orders);

      var simpleOrders = getStoredList('smilehub_simple_orders');
      simpleOrders.unshift({ number: order.number, date: order.date, total: total, status: order.status });
      saveStoredList('smilehub_simple_orders', simpleOrders);

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

      saveStoredList(CART_KEY, []);
      updateCartCount();

      document.getElementById('confirmOrderNumber').textContent = order.orderNumber;
      document.getElementById('confirmEmail').textContent = email;
      var modal = document.getElementById('orderConfirmModal');
      modal.style.display = 'flex';
      modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });
    });
  });
});
