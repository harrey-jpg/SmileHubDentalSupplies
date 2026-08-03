var PAYMONGO_PUBLISHABLE_KEY = '';
var GOOGLE_MAPS_KEY = ''; // Set your Google Maps API key for address autocomplete

var checkoutProfile = null;

function normalizePHPhone(raw) {
  var e164 = window.SmileHubPhone ? window.SmileHubPhone.format(raw) : String(raw || '').trim();
  return /^\+639\d{9}$/.test(e164) ? e164 : null;
}

function loadCheckoutProfile() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (!user) return;
    firebase.firestore().collection('users').doc(user.uid).get().then(function(doc) {
      if (!doc.exists) return;
      var data = doc.data() || {};
      checkoutProfile = data;
      var address = data.address || {};
      var set = function(id, value) {
        var node = document.getElementById(id);
        if (!node || node.value) return;
        if ((id === 'checkoutPhone' || id === 'billingPhone') && window.SmileHubPhone) {
          window.SmileHubPhone.setValue(node, value || '');
        } else {
          node.value = value || '';
        }
      };
      set('checkoutFirstName', data.firstName);
      set('checkoutLastName', data.lastName);
      set('checkoutEmail', data.email || user.email);
      set('checkoutPhone', data.phoneE164 || data.phone || data.phoneLocal || '+63');
      set('checkoutAddress', typeof address === 'string' ? address : address.street);
      set('checkoutCity', address.city);
      set('checkoutPostal', address.postal);
      var badge = document.getElementById('checkoutPhoneVerification');
      if (badge) {
        badge.className = 'checkout-verified-note' + (data.phoneVerified ? '' : ' is-warning');
        badge.textContent = data.phoneVerified ? '✓ Verified phone number: ' + (data.phoneLocal || data.phone || '') : '● Verify your phone number below before placing an order.';
        var verifyCard = document.getElementById('checkoutPhoneVerifyCard');
        if (verifyCard) verifyCard.classList.toggle('is-complete', Boolean(data.phoneVerified));
      }
    }).catch(function(error) {
      if (window.console) console.warn('Could not load checkout profile:', error);
    });
  });
}

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
  loadCheckoutProfile();
  var buyNowMode = new URLSearchParams(location.search).get('mode') === 'buy-now';
  var buyNowItems = window.SmileHubStorage ? window.SmileHubStorage.get(BUY_NOW_KEY, []) : [];
  var cart = buyNowMode && Array.isArray(buyNowItems) && buyNowItems.length ? buyNowItems : getStoredList(CART_KEY);
  var checkoutDraft = window.SmileHubStorage ? window.SmileHubStorage.get('smilehub_checkout_draft', null) : null;
  if (checkoutDraft) {
    setTimeout(function() {
      [['checkoutFirstName','firstName'],['checkoutLastName','lastName'],['checkoutEmail','email'],['checkoutPhone','phone'],['checkoutAddress','address'],['checkoutCity','city'],['checkoutPostal','postal']].forEach(function(pair) {
        var node = document.getElementById(pair[0]);
        if (node && !node.value) node.value = checkoutDraft[pair[1]] || '';
      });
    }, 0);
  }
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

  function getOrderTotals() {
    var subtotal = cart.reduce(function(sum, item) { return sum + item.price * item.quantity; }, 0);
    var shipping = subtotal >= 3000 || subtotal === 0 ? 0 : 150;
    var tax = subtotal * 0.12;
    var discount = subtotal * couponDiscountRate(getAppliedCoupon());
    var total = subtotal + shipping + tax - discount;
    return { subtotal: subtotal, shipping: shipping, tax: tax, discount: discount, total: total };
  }

  function applyCouponFromInput() {
    var input = document.getElementById('checkoutCouponInput');
    var feedback = document.getElementById('checkoutCouponFeedback');
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
    renderSummary();
  }

  function renderSummary() {
    var items = document.getElementById('checkoutItems');
    var totals = getOrderTotals();

    items.innerHTML = cart.length ? cart.map(function(item) {
      var img = item.image || 'assets/products/default.svg';
      return '<div class="checkout-item" style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">' +
        '<img src="' + img + '" alt="' + item.name.replace(/"/g,'&quot;') + '" style="width:50px;height:50px;object-fit:contain;border-radius:6px;background:#f8f9fa">' +
        '<div style="flex:1"><strong>' + item.name + '</strong><br><small class="muted">Qty: ' + item.quantity + ' &times; ' + money(item.price) + '</small></div>' +
        '<strong>' + money(item.price * item.quantity) + '</strong></div>';
    }).join('') : '<p class="muted">Your cart is empty.</p>';

    document.getElementById('checkoutSubtotal').textContent = money(totals.subtotal);
    document.getElementById('checkoutShipping').textContent = money(totals.shipping);
    document.getElementById('checkoutTax').textContent = money(totals.tax);
    var discountRow = document.getElementById('checkoutDiscountRow');
    var discountEl = document.getElementById('checkoutDiscount');
    if (discountRow && discountEl) {
      if (totals.discount > 0) {
        discountRow.style.display = 'flex';
        discountEl.textContent = '−' + money(totals.discount);
      } else {
        discountRow.style.display = 'none';
      }
    }
    document.getElementById('checkoutTotal').textContent = money(totals.total);
  }

  var savedCoupon = getAppliedCoupon();
  var couponInput = document.getElementById('checkoutCouponInput');
  if (savedCoupon && couponInput) couponInput.value = savedCoupon;

  var applyBtn = document.getElementById('checkoutApplyCouponBtn');
  if (applyBtn) applyBtn.addEventListener('click', applyCouponFromInput);
  if (couponInput) {
    couponInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') { e.preventDefault(); applyCouponFromInput(); }
    });
  }

  renderSummary();

  // Toggle billing section when payment method changes
  var paymentRadios = document.querySelectorAll('input[name="payment"]');
  var billingSection = document.getElementById('billingSection');
  paymentRadios.forEach(function(radio) {
    radio.addEventListener('change', function() {
      billingSection.style.display = this.value === 'Credit Card' || this.value === 'GCash' ? 'block' : 'none';
      if ((this.value === 'Credit Card' || this.value === 'GCash') && sameAsShipping && sameAsShipping.checked) {
        copyShippingToBilling();
      }
    });
  });
  var selectedPayment = document.querySelector('input[name="payment"]:checked');
  if (selectedPayment && billingSection) {
    billingSection.style.display = selectedPayment.value === 'Credit Card' || selectedPayment.value === 'GCash' ? 'block' : 'none';
  }

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

    if (!firstName || !lastName || !email || !phone || !address || !postal || !city) {
      return showToast('Please fill in all required shipping fields', true);
    }
    var normalizedPhone = normalizePHPhone(phone);
    if (!normalizedPhone) {
      return showToast('Enter a valid 10-digit Philippine mobile number beginning with 9', true);
    }
    var phoneVerifiedForOrder = Boolean(
      checkoutProfile &&
      checkoutProfile.phoneVerified &&
      normalizePHPhone(checkoutProfile.phoneLocal || checkoutProfile.phone) === normalizedPhone
    );
    // OTP is recommended but no longer blocks checkout. This prevents Firebase quota/domain
    // problems from trapping customers. Orders retain the verification status for admin review.
    if (!phoneVerifiedForOrder) {
      checkoutOtpStatus('Phone is not verified yet. You may still place the order; staff can confirm it manually.', false);
    }

    // Validate billing fields for card/GCash payments.
    // When "same as shipping" is checked, copy values immediately before validation.
    if ((paymentMethod === 'Credit Card' || paymentMethod === 'GCash') &&
        document.getElementById('sameAsShipping') &&
        document.getElementById('sameAsShipping').checked) {
      copyShippingToBilling();
    }
    if (paymentMethod === 'Credit Card' || paymentMethod === 'GCash') {
      var bfName = document.getElementById('billingFirstName').value.trim();
      var blName = document.getElementById('billingLastName').value.trim();
      var bEmail = document.getElementById('billingEmail').value.trim();
      var bAddr = document.getElementById('billingAddress').value.trim();
      if (!bfName || !blName || !bEmail || !bAddr) {
        return showToast('Please fill in all billing details');
      }
    }

    var totals = getOrderTotals();
    var subtotal = totals.subtotal;
    var shipping = totals.shipping;
    var tax = totals.tax;
    var discount = totals.discount;
    var total = totals.total;

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

    var fullAddress = [address, city].filter(Boolean).join(', ') + (postal ? ' ' + postal : '');

    var order = {
      number: orderNumber,
      orderNumber: orderNumber,
      customer: firstName + ' ' + lastName,
      customerName: firstName + ' ' + lastName,
      email: email,
      userId: firebase.auth().currentUser ? firebase.auth().currentUser.uid : '',
      customerObj: { name: firstName + ' ' + lastName, email: email, phone: normalizedPhone, phoneVerified: phoneVerifiedForOrder },
      address: fullAddress,
      shippingDetails: { address: address, city: city, postal: postal, method: 'Standard' },
      billing: billingInfo,
      payment: paymentMethod,
      items: cart.map(function(item) {
        return { productId: item.id, name: item.name, price: item.price, quantity: item.quantity, image: item.image || 'assets/products/default.svg' };
      }),
      subtotal: subtotal,
      shipping: shipping,
      tax: tax,
      discount: discount,
      coupon: discount > 0 ? getAppliedCoupon() : '',
      total: total,
      status: needsQuote ? 'Pending Quotation' : (paymentMethod === 'Cash on Delivery' ? 'Pending' : 'Pending Payment'),
      date: new Date().toISOString().split('T')[0],
      notes: needsQuote ? 'Contains high-value item(s) requiring quotation' : ''
    };


    var currentUser = firebase.auth().currentUser;
    var saveProfileBox = document.getElementById('saveCheckoutProfile');
    if (currentUser && saveProfileBox && saveProfileBox.checked) {
      firebase.firestore().collection('users').doc(currentUser.uid).set({
        firstName: firstName,
        lastName: lastName,
        displayName: firstName + ' ' + lastName,
        email: email,
        phone: normalizedPhone,
        phoneE164: normalizedPhone,
        phoneLocal: '0' + normalizedPhone.slice(3),
        address: {
          street: address,
          city: city,
          postal: postal,
          barangay: checkoutProfile && checkoutProfile.address ? (checkoutProfile.address.barangay || '') : '',
          province: checkoutProfile && checkoutProfile.address ? (checkoutProfile.address.province || '') : '',
          deliveryNotes: checkoutProfile && checkoutProfile.address ? (checkoutProfile.address.deliveryNotes || '') : '',
          isDefault: true
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(function(error) {
        if (window.console) console.warn('Could not update checkout profile:', error);
      });
    }

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

      if (buyNowMode) {
        window.SmileHubStorage.remove(BUY_NOW_KEY);
      } else {
        saveStoredList(CART_KEY, []);
        cart = [];
        if (window.SmileHubFirebaseSync && window.SmileHubFirebaseSync.saveList) {
          window.SmileHubFirebaseSync.saveList(CART_KEY, []);
        }
      }
      updateCartCount();

      document.getElementById('confirmOrderNumber').textContent = order.orderNumber;
      document.getElementById('confirmEmail').textContent = email;
      var modal = document.getElementById('orderConfirmModal');
      modal.style.display = 'flex';
      modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });
    });
  });
});


document.addEventListener('DOMContentLoaded', function () {
  var locate = document.getElementById('useCurrentLocation');
  var frame = document.getElementById('addressMapFrame');
  var status = document.getElementById('addressMapStatus');
  var openMaps = document.getElementById('openAddressInMaps');
  var address = document.getElementById('checkoutAddress');
  var city = document.getElementById('checkoutCity');
  var postal = document.getElementById('checkoutPostal');

  function setMap(lat, lng) {
    if (frame) {
      var d = 0.01;
      frame.src = 'https://www.openstreetmap.org/export/embed.html?bbox=' +
        encodeURIComponent((lng-d)+','+(lat-d)+','+(lng+d)+','+(lat+d)) +
        '&layer=mapnik&marker=' + encodeURIComponent(lat+','+lng);
    }
    if (openMaps) openMaps.href = 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng);
    if (window.SmileHubStorage) window.SmileHubStorage.set('smilehub_checkout_coords', { lat: lat, lng: lng });
  }

  function firstPart(obj, keys) {
    for (var i = 0; i < keys.length; i++) if (obj && obj[keys[i]]) return obj[keys[i]];
    return '';
  }

  async function reverseGeocode(lat, lng) {
    var url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=' +
      encodeURIComponent(lat) + '&lon=' + encodeURIComponent(lng);
    var response = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!response.ok) throw new Error('Address lookup failed');
    return response.json();
  }

  if (locate) locate.addEventListener('click', function () {
    if (!navigator.geolocation) {
      if (status) status.textContent = 'Location is not supported by this browser.';
      return;
    }
    locate.disabled = true;
    locate.textContent = 'Finding address…';
    if (status) status.textContent = 'Getting your current location…';

    navigator.geolocation.getCurrentPosition(async function (position) {
      var lat = position.coords.latitude;
      var lng = position.coords.longitude;
      setMap(lat, lng);
      try {
        var result = await reverseGeocode(lat, lng);
        var a = result.address || {};
        var road = firstPart(a, ['road','pedestrian','footway','residential','path']);
        var house = firstPart(a, ['house_number']);
        var barangay = firstPart(a, ['quarter','suburb','neighbourhood','village']);
        var cityValue = firstPart(a, ['city','town','municipality','city_district','county']);
        var province = firstPart(a, ['state','region']);
        var postalValue = firstPart(a, ['postcode']);
        var streetParts = [house, road, barangay, province].filter(Boolean);

        if (address) address.value = streetParts.join(', ') || result.display_name || '';
        if (city) city.value = cityValue;
        if (postal) postal.value = postalValue;
        if (status) status.textContent = 'Address filled from your current location. Please review it before checkout.';
        if (openMaps) openMaps.href = 'https://www.google.com/maps?q=' + encodeURIComponent(lat + ',' + lng);
      } catch (error) {
        if (status) status.textContent = 'Location found, but automatic address lookup failed. Please review the map and type the address manually.';
      } finally {
        locate.disabled = false;
        locate.textContent = 'Use current location';
      }
    }, function (error) {
      var message = error && error.code === 1
        ? 'Location permission was denied. Allow location access in the browser, then try again.'
        : 'Could not get your location. Enter the address manually.';
      if (status) status.textContent = message;
      locate.disabled = false;
      locate.textContent = 'Use current location';
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });

  if (address && openMaps) address.addEventListener('input', function () {
    if (address.value.trim()) openMaps.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(address.value.trim());
  });
});
