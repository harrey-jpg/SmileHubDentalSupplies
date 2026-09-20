var PAYMONGO_PUBLISHABLE_KEY = '';
var GOOGLE_MAPS_KEY = ''; // Set your Google Maps API key for address autocomplete

var checkoutProfile = null;

function normalizePHPhone(raw) {
  var e164 = window.SmileHubPhone ? window.SmileHubPhone.format(raw) : String(raw || '').trim();
  return /^\+639\d{9}$/.test(e164) ? e164 : null;
}

function checkoutVal(id){
  var n=document.getElementById(id); if(!n) return '';
  var v=(n.value||'').trim();
  if(v==='__other__'){ var o=document.getElementById(id+'Other')||document.getElementById(id+'_other'); return o? (o.value||'').trim() : ''; }
  return v;
}
function checkoutSet(id, value){
  var n=document.getElementById(id); if(!n) return;
  value=value||'';
  if(n.tagName==='SELECT'){
    var has=[].slice.call(n.options).some(function(o){return o.value===value;});
    if(has){ n.value=value; return; }
    if(!value){ n.value=''; return; }
    var other=document.getElementById(id+'Other')||document.getElementById(id+'_other');
    if(other && [].slice.call(n.options).some(function(o){return o.value==='__other__';})){ n.value='__other__'; other.value=value; other.classList.remove('hidden'); return; }
    n.setAttribute('data-saved', value);
    n.value='';
    return;
  }
  if ((id === 'checkoutPhone' || id === 'billingPhone') && window.SmileHubPhone) {
    window.SmileHubPhone.setValue(n, value);
    return;
  }
  n.value=value;
}

function loadCheckoutProfile() {
  firebase.auth().onAuthStateChanged(function(user) {
    if (!user) return;
    firebase.firestore().collection('users').doc(user.uid).get().then(function(doc) {
      if (!doc.exists) return;
      var data = doc.data() || {};
      checkoutProfile = data;
      var address = data.address || {};
      var set = function(id, value) { checkoutSet(id, value); };
      set('checkoutFirstName', data.firstName);
      set('checkoutLastName', data.lastName);
      set('checkoutEmail', data.email || user.email);
      set('checkoutPhone', data.phoneE164 || data.phone || data.phoneLocal || '+63');
      set('checkoutAddress', typeof address === 'string' ? address : address.street);
      set('checkoutProvince', address.province);
      set('checkoutCity', address.city);
      set('checkoutBarangay', address.barangay);
      set('checkoutPostal', address.postal);
      if(window.PHAddress && window.PHAddress.prefill) window.PHAddress.prefill('checkout', address);
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

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  }

  function getOrderTotals() {
    var subtotal = cart.reduce(function(sum, item) { return sum + item.price * item.quantity; }, 0);
    var shipping = subtotal >= 3000 || subtotal === 0 ? 0 : 150;
    var discount = subtotal * couponDiscountRate(getAppliedCoupon());
    // VAT applies to the discounted amount actually paid.
    var tax = (subtotal - discount) * 0.12;
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

  function renderExpressBanner() {
    var items = document.getElementById('checkoutItems');
    if (!items || !items.parentNode) return;
    var existing = document.getElementById('expressBanner');
    if (existing) existing.parentNode.removeChild(existing);
    if (!buyNowMode) return;
    var savedCart = getStoredList(CART_KEY);
    var savedCount = savedCart.reduce(function(sum, entry) { return sum + (Number(entry.quantity) || 0); }, 0);
    var bar = document.createElement('div');
    bar.className = 'checkout-note';
    bar.id = 'expressBanner';
    bar.setAttribute('role', 'status');
    var label = 'Express checkout — ' + cart.length + (cart.length === 1 ? ' item' : ' items') + ', skipping the cart. ' +
      (savedCount > 0
        ? 'Your cart (' + savedCount + (savedCount === 1 ? ' item' : ' items') + ') is saved and untouched.'
        : 'Your cart is untouched.');
    var strong = document.createElement('strong');
    strong.textContent = 'Buy Now express';
    var span = document.createElement('span');
    span.textContent = label;
    bar.appendChild(strong);
    bar.appendChild(span);
    if (savedCount > 0) {
      var link = document.createElement('a');
      link.href = 'checkout.html';
      link.textContent = 'Switch to cart checkout';
      link.style.fontWeight = '700';
      bar.appendChild(link);
    }
    items.parentNode.insertBefore(bar, items);
  }

  function renderSummary() {
    var items = document.getElementById('checkoutItems');
    var totals = getOrderTotals();
    renderExpressBanner();

    items.innerHTML = cart.length ? cart.map(function(item) {
      var img = item.image || 'assets/products/default.svg';
      return '<div class="checkout-item" style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--border)">' +
        '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(item.name) + '" style="width:50px;height:50px;object-fit:contain;border-radius:6px;background:#f8f9fa">' +
        '<div style="flex:1"><strong>' + escapeHtml(item.name) + '</strong><br><small class="muted">Qty: ' + Number(item.quantity) + ' &times; ' + money(item.price) + '</small></div>' +
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
    var streetSrc=document.getElementById('checkoutAddress');
    var streetDst=document.getElementById('billingStreet')||document.getElementById('billingAddress');
    if(streetSrc && streetDst) streetDst.value=streetSrc.value;
    [['checkoutProvince','billingProvince'],['checkoutCity','billingCity'],['checkoutBarangay','billingBarangay'],['checkoutPostal','billingPostal']].forEach(function(pair){
      var src=document.getElementById(pair[0]), dst=document.getElementById(pair[1]);
      if(!src||!dst) return;
      var srcOther=document.getElementById(pair[0]+'Other')||document.getElementById(pair[0]+'_other');
      var dstOther=document.getElementById(pair[1]+'Other')||document.getElementById(pair[1]+'_other');
      var val=src.value;
      if(val==='__other__' && srcOther){
        dst.value='__other__';
        if(dstOther){ dstOther.value=srcOther.value; dstOther.classList.remove('hidden'); }
      } else {
        dst.value=val;
        if(dstOther) dstOther.classList.add('hidden');
        // trigger change to populate dependent selects
        try{ dst.dispatchEvent(new Event('change',{bubbles:true})); }catch(e){}
      }
    });
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
          // Report the redirect instead of navigating immediately: the caller must
          // persist the order first, otherwise the navigation loses it entirely.
          callback(null, { status: 'redirect', url: updatedIntent.attributes.next_action.redirect.url });
        } else if (updatedIntent.attributes.status === 'succeeded') {
          callback(null, { status: 'paid' });
        } else {
          callback(null, { status: 'unpaid' });
        }
      });
    }).catch(function() {
      callback(null);
    });
  }

  document.getElementById('checkoutForm').addEventListener('submit', function(event) {
    event.preventDefault();
    var form = this;
    if (form.dataset.submitting === '1') return;
    if (!cart.length) return showToast('Add products before checking out');

    var firstName = document.getElementById('checkoutFirstName').value.trim();
    var lastName = document.getElementById('checkoutLastName').value.trim();
    var email = document.getElementById('checkoutEmail').value.trim();
    var phone = document.getElementById('checkoutPhone').value.trim();
    var address = checkoutVal('checkoutAddress');
    var postal = checkoutVal('checkoutPostal');
    var city = checkoutVal('checkoutCity');
    var province = checkoutVal('checkoutProvince');
    var barangay = checkoutVal('checkoutBarangay');
    var payment = document.querySelector('input[name="payment"]:checked');
    var paymentMethod = payment ? payment.value : 'GCash';

    if (!firstName || !lastName || !email || !phone || !address || !postal || !city || !province || !barangay) {
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
      var otpStatus = document.getElementById('checkoutOtpStatus');
      if (otpStatus) otpStatus.textContent = 'Phone is not verified yet. You may still place the order; staff can confirm it manually.';
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
      var sameAsShippingEl=document.getElementById('sameAsShipping');
      var isSame=sameAsShippingEl && sameAsShippingEl.checked;
      var bStreetEl2=document.getElementById('billingStreet')||document.getElementById('billingAddress');
      var bStreet2=bStreetEl2 ? bStreetEl2.value.trim() : '';
      var bProv2=checkoutVal('billingProvince');
      var bCity2=checkoutVal('billingCity');
      var bBrgy2=checkoutVal('billingBarangay');
      var bPostal2=checkoutVal('billingPostal');
      if (!bfName || !blName || !bEmail || (!isSame && (!bStreet2 || !bProv2 || !bCity2 || !bBrgy2 || !bPostal2))) {
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
      var billingStreetEl=document.getElementById('billingStreet')||document.getElementById('billingAddress');
      var billingProv=checkoutVal('billingProvince');
      var billingCityVal=checkoutVal('billingCity');
      var billingBrgy=checkoutVal('billingBarangay');
      var billingPostalVal=checkoutVal('billingPostal');
      var billingStreetVal=billingStreetEl ? billingStreetEl.value.trim() : '';
      var billingFull=[billingStreetVal, billingBrgy, billingCityVal, billingProv].filter(Boolean).join(', ') + (billingPostalVal ? ' '+billingPostalVal : '');
      billingInfo = {
        firstName: document.getElementById('billingFirstName').value.trim(),
        lastName: document.getElementById('billingLastName').value.trim(),
        email: document.getElementById('billingEmail').value.trim(),
        phone: document.getElementById('billingPhone').value.trim(),
        address: billingFull || (document.getElementById('billingAddress') ? document.getElementById('billingAddress').value.trim() : ''),
        street: billingStreetVal,
        province: billingProv,
        city: billingCityVal,
        barangay: billingBrgy,
        postal: billingPostalVal
      };
    }

    var fullAddress = [address, barangay, city, province].filter(Boolean).join(', ') + (postal ? ' ' + postal : '');
    var order = {
      number: orderNumber,
      orderNumber: orderNumber,
      customer: firstName + ' ' + lastName,
      customerName: firstName + ' ' + lastName,
      email: email,
      userId: firebase.auth().currentUser ? firebase.auth().currentUser.uid : '',
      customerObj: { name: firstName + ' ' + lastName, email: email, phone: normalizedPhone, phoneVerified: phoneVerifiedForOrder },
      address: fullAddress,
      shippingDetails: { address: address, barangay: barangay, city: city, province: province, postal: postal, method: (document.querySelector('input[name="shippingMethod"]:checked')||{}).value || 'Standard' },
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
          barangay: barangay,
          province: province,
          deliveryNotes: checkoutProfile && checkoutProfile.address ? (checkoutProfile.address.deliveryNotes || '') : '',
          isDefault: true
        },
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true }).catch(function(error) {
        if (window.console) console.warn('Could not update checkout profile:', error);
      });
    }

    form.dataset.submitting = '1';
    var submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) { submitBtn.disabled = true; submitBtn.dataset.originalLabel = submitBtn.textContent; submitBtn.textContent = 'Processing…'; }

    processPayment(order, total, function(paymentError, result) {
      result = result || {};
      var paid = !paymentError && (paymentMethod === 'Credit Card' || paymentMethod === 'GCash') && result.status === 'paid';
      order.paymentStatus = paid ? 'paid' : 'unpaid';
      order.status = needsQuote ? 'Pending Quotation' : (paid ? 'Processing' : 'Pending');

      // Persist only the new order to Firestore. Rewriting the full local
      // history would be rejected by the security rules (owners may not
      // overwrite existing orders) and silently lose every later order.
      orders.unshift(order);
      SmileHubStorage.set('smilehub_orders', orders);
      SmileHubData.saveOrder(order);

      var simpleOrders = getStoredList('smilehub_simple_orders');
      simpleOrders.unshift({ number: order.number, date: order.date, total: total, status: order.status });
      saveStoredList('smilehub_simple_orders', simpleOrders);

      // Stock is decremented server-side by the onOrderCreated Cloud Function,
      // so inventory stays accurate regardless of who placed the order.

      if (buyNowMode) {
        window.SmileHubStorage.remove(BUY_NOW_KEY);
      } else {
        // Clear locally first, then mark the Firebase cart as explicitly cleared.
        // The persistent clear marker prevents stale remote items from returning
        // while the Firestore write is still in flight.
        if (window.SmileHubStorage) window.SmileHubStorage.set(CART_KEY, []);
        cart = [];
        if (window.SmileHubFirebaseSync && window.SmileHubFirebaseSync.clearList) {
          window.SmileHubFirebaseSync.clearList(CART_KEY).catch(function(error) {
            console.warn('Cart was cleared locally but Firestore clear failed:', error);
          });
        } else {
          saveStoredList(CART_KEY, []);
        }
      }
      updateCartCount();

      // Payment provider needs the customer to authorize on their site.
      // Everything is already saved, so navigating away is safe now.
      if (result.status === 'redirect' && result.url) {
        window.location.href = result.url;
        return;
      }

      document.getElementById('confirmOrderNumber').textContent = order.orderNumber;
      document.getElementById('confirmEmail').textContent = email;
      var modal = document.getElementById('orderConfirmModal');
      modal.style.display = 'flex';
      modal.addEventListener('click', function(e) { if (e.target === modal) modal.style.display = 'none'; });

      form.dataset.submitting = '';
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.dataset.originalLabel || 'Place Order'; }
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
