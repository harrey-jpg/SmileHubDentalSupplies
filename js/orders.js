document.addEventListener('DOMContentLoaded', function() {
  var table = document.getElementById('ordersBody');
  if (!table) return;
  if (new URLSearchParams(location.search).get('success')) showToast('Payment successful. Order created.');

  var searchInput = document.getElementById('ordersSearch');
  var statusFilter = document.getElementById('ordersStatusFilter');
  var clearBtn = document.getElementById('ordersClearFilter');
  var noMatchClear = document.getElementById('ordersNoMatchClear');
  var emptyEl = document.getElementById('ordersEmpty');
  var noMatchEl = document.getElementById('ordersNoMatch');
  var invoiceModal = document.getElementById('invoiceModal');
  var invoiceBody = document.getElementById('invoiceBody');
  var invoiceClose = document.getElementById('invoiceClose');
  var invoiceClose2 = document.getElementById('invoiceClose2');
  var invoicePrint = document.getElementById('invoicePrint');
  var returnModal = document.getElementById('returnModal');
  var returnClose = document.getElementById('returnClose');
  var returnClose2 = document.getElementById('returnClose2');
  var returnSubmit = document.getElementById('returnSubmit');
  var returnReason = document.getElementById('returnReason');
  var returnNote = document.getElementById('returnNote');
  var returnOrderInfo = document.getElementById('returnOrderInfo');
  var pendingReturnOrderId = null;

  var allOrders = [];
  var currentInvoiceOrder = null;
  var CART_KEY_NAME = (typeof CART_KEY !== 'undefined' ? CART_KEY : 'smilehub_simple_cart');
  var HIDDEN_KEY = 'smilehub_hidden_orders';
  var PENDING_KEY = 'smilehub_pending_order_updates';
  function getPending(){ try{ var raw=localStorage.getItem(PENDING_KEY); var arr=raw?JSON.parse(raw):[]; return Array.isArray(arr)?arr:[]; }catch(e){ return []; } }
  function setPending(arr){ try{ localStorage.setItem(PENDING_KEY, JSON.stringify(arr)); }catch(e){} }
  function addPending(id, patch){
    var pending=getPending();
    var idx=pending.findIndex(function(p){ return String(p.id)===String(id); });
    var entry={ id:String(id), patch:patch, at:Date.now() };
    if(idx!==-1) pending[idx]=entry; else pending.push(entry);
    setPending(pending);
  }
  function applyPending(orders){
    var pending=getPending(); if(!pending.length) return orders;
    var now=Date.now();
    pending=pending.filter(function(p){ return now - p.at < 7*24*60*60*1000; });
    var map={}; pending.forEach(function(p){ map[String(p.id)]=p.patch; });
    orders.forEach(function(o){
      var id=String(o.number||o.orderNumber);
      var patch=map[id];
      if(patch){
        if(patch.status) o.status=patch.status;
        if(patch.returnRequest) o.returnRequest=patch.returnRequest;
      }
    });
    // prune where server already matches
    var stillPending=pending.filter(function(p){
      var o=orders.find(function(x){ return String(x.number||x.orderNumber)===String(p.id); });
      if(!o) return true;
      if(p.patch.status && String(o.status)===String(p.patch.status)) return false;
      if(p.patch.returnRequest && o.returnRequest && String(o.returnRequest.status)===String(p.patch.returnRequest.status)) return false;
      return true;
    });
    if(stillPending.length!==pending.length) setPending(stillPending);
    else if(pending.length!==getPending().length) setPending(pending);
    return orders;
  }
  function showRowError(orderId, msg){
    var row=document.querySelector('[data-order="' + (typeof CSS!=='undefined'&&CSS.escape?CSS.escape(orderId):orderId) + '"]');
    if(!row) return;
    var existing=row.querySelector('.row-error');
    if(existing) existing.remove();
    var err=document.createElement('div');
    err.className='row-error muted';
    err.style.cssText='color:var(--danger);font-size:.82rem;margin-top:4px';
    err.textContent=msg;
    var cell=row.querySelector('td:last-child');
    if(cell) cell.appendChild(err);
    setTimeout(function(){ if(err.parentNode) err.remove(); }, 5000);
  }

  function getHidden() {
    try { var raw = localStorage.getItem(HIDDEN_KEY); var arr = raw ? JSON.parse(raw) : []; return Array.isArray(arr) ? arr : []; } catch(e){ return []; }
  }
  function isHidden(num) {
    var hidden = getHidden();
    return hidden.indexOf(String(num)) !== -1;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  }

  function statusClass(status) {
    var s = String(status || '').toLowerCase();
    if (s === 'delivered') return 'delivered';
    if (s === 'shipped') return 'delivered';
    if (s === 'processing' || s === 'pending' || s === 'pending payment' || s === 'pending quotation') return 'processing';
    if (s === 'cancelled') return 'low';
    return 'processing';
  }

  function timelineSteps(status) {
    var steps = [
      { label: 'Order Placed', desc: 'Payment and order information received.' },
      { label: 'Processing', desc: 'Products are being prepared.' },
      { label: 'Shipped', desc: 'Order is on the way.' },
      { label: 'Delivered', desc: 'Order delivered successfully.' }
    ];
    var order = ['pending','pending payment','pending quotation','processing','shipped','delivered'];
    var idx = order.indexOf(String(status||'').toLowerCase());
    if (idx === -1) idx = 0;
    if (idx <= 2) idx = 0;
    else if (idx === 3) idx = 1;
    else if (idx === 4) idx = 2;
    else idx = 3;
    if (String(status||'').toLowerCase() === 'cancelled') idx = -1;
    return steps.map(function(step, i) {
      var cls = idx === -1 ? '' : (i < idx ? 'is-done' : (i === idx ? 'is-current' : ''));
      return '<div class="timeline-step ' + cls + '"><strong>' + escapeHtml(step.label) + '</strong><p class="muted">' + escapeHtml(step.desc) + '</p></div>';
    }).join('');
  }

  function formatItems(items) {
    if (!Array.isArray(items) || !items.length) return '<p class="muted">No item details.</p>';
    return '<div class="order-items">' + items.map(function(it) {
      var name = escapeHtml(it.name || 'Product');
      var qty = Number(it.quantity || 1);
      var price = Number(it.price || 0);
      return '<div class="order-item"><span>' + name + ' <small>× ' + qty + '</small></span><span>' + money(price * qty) + '</span></div>';
    }).join('') + '</div>';
  }

  function setLoading() {
    table.innerHTML = '<tr><td colspan="6" class="text-center muted" style="padding:40px;">Loading orders…</td></tr>';
    if (emptyEl) emptyEl.classList.add('hidden');
    if (noMatchEl) noMatchEl.classList.add('hidden');
  }

  function setError(msg) {
    table.innerHTML = '<tr><td colspan="6" class="text-center muted" style="padding:40px;">' + escapeHtml(msg) + ' <button class="btn btn-light btn-sm" id="ordersRetry" type="button" style="margin-left:8px">Retry</button></td></tr>';
    var retryBtn = document.getElementById('ordersRetry');
    if (retryBtn) retryBtn.addEventListener('click', function(){ setLoading(); loadOrders(); });
    if (emptyEl) emptyEl.classList.add('hidden');
    if (noMatchEl) noMatchEl.classList.add('hidden');
  }

  function render() {
    var q = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var statusVal = statusFilter ? statusFilter.value : '';
    var filtered = allOrders.filter(function(o) {
      if (isHidden(o.number || o.orderNumber)) return false;
      var num = String(o.number || o.orderNumber || '').toLowerCase();
      var status = String(o.status || '').toLowerCase();
      var matchSearch = !q || num.indexOf(q) !== -1;
      var matchStatus = !statusVal || status === statusVal.toLowerCase();
      return matchSearch && matchStatus;
    });

    if (allOrders.filter(function(o){ return !isHidden(o.number||o.orderNumber); }).length === 0) {
      table.innerHTML = '';
      if (emptyEl) emptyEl.classList.remove('hidden');
      if (noMatchEl) noMatchEl.classList.add('hidden');
      return;
    }
    if (filtered.length === 0) {
      table.innerHTML = '';
      if (emptyEl) emptyEl.classList.add('hidden');
      if (noMatchEl) noMatchEl.classList.remove('hidden');
      return;
    }
    if (emptyEl) emptyEl.classList.add('hidden');
    if (noMatchEl) noMatchEl.classList.add('hidden');

    table.innerHTML = filtered.map(function(order) {
      var num = escapeHtml(order.number || order.orderNumber || '');
      var date = escapeHtml(order.date || '');
      var total = money(order.total || 0);
      var status = escapeHtml(order.status || 'Pending');
      var cls = statusClass(order.status);
      var itemsCount = Array.isArray(order.items) ? order.items.length : 0;
      var id = escapeHtml(order.number || order.orderNumber || '');
      var canCancel = ['pending','pending payment','pending quotation'].indexOf(String(order.status||'').toLowerCase()) !== -1;
      var canReturn = false, returnDisabled = false, returnLabel = 'Return';
      if(String(order.status||'').toLowerCase() === 'delivered' && !order.returnRequest){
        try{
          var orderTime = order.sortTs || (order.date ? Date.parse(order.date) : Date.now());
          var diffDays = (Date.now() - orderTime) / (1000*60*60*24);
          if(diffDays <= 7) canReturn = true;
          else { canReturn = false; returnDisabled = true; returnLabel = 'Return (past 7 days)'; }
        }catch(e){ canReturn = false; }
      } else if(order.returnRequest){
        canReturn = false; returnDisabled = true; returnLabel = 'Return requested';
      }
      var actions = '<div style="display:flex;gap:6px;flex-wrap:wrap">'
        + '<button class="btn btn-light btn-sm order-view" data-order="' + id + '" type="button">View</button>'
        + '<button class="btn btn-light btn-sm order-reorder" data-order="' + id + '" type="button">Reorder</button>'
        + '<button class="btn btn-light btn-sm order-invoice" data-order="' + id + '" type="button">Invoice</button>';
      if(canCancel) actions += '<button class="btn btn-light btn-sm order-cancel" data-order="' + id + '" type="button" style="color:var(--danger);border-color:var(--danger)">Cancel</button>';
      if(canReturn) actions += '<button class="btn btn-light btn-sm order-return" data-order="' + id + '" type="button">Return</button>';
      else if(returnDisabled) actions += '<button class="btn btn-light btn-sm order-return" data-order="' + id + '" type="button" disabled title="Return window closed or already requested">' + escapeHtml(returnLabel) + '</button>';
      actions += '<button class="btn btn-light btn-sm order-remove" data-order="' + id + '" type="button" style="color:var(--muted);border-color:var(--border)">Hide</button></div>';
      return '<tr class="order-row" data-order="' + id + '"><td>' + num + '</td><td>' + date + '</td><td>' + itemsCount + ' items</td><td>' + total + '</td><td><span class="status ' + cls + '">' + status + '</span></td><td>' + actions + '</td></tr>' +
        '<tr class="order-expand hidden" data-expand="' + id + '"><td colspan="6"><div class="order-details"><div class="order-details-grid"><div><h3 style="margin:0 0 8px">Items</h3>' + formatItems(order.items) + '<p class="muted" style="margin-top:8px">Ship to: ' + escapeHtml(order.address || '') + '</p></div><div><h3 style="margin:0 0 8px">Tracking</h3><div class="order-timeline">' + timelineSteps(order.status) + '</div></div></div></div></td></tr>';
    }).join('');
  }

  function reorder(orderId) {
    var order = allOrders.find(function(o) { return String(o.number || o.orderNumber) === String(orderId); });
    if (!order || !Array.isArray(order.items) || !order.items.length) return showToast('No items to reorder', true);
    var cart = getStoredList(CART_KEY_NAME);
    order.items.forEach(function(it) {
      var existing = cart.find(function(c) { return String(c.id) === String(it.productId || it.id) || c.name === it.name; });
      if (existing) existing.quantity = Number(existing.quantity || 1) + Number(it.quantity || 1);
      else cart.push({ id: it.productId || it.id || Date.now(), name: it.name, price: Number(it.price||0), quantity: Number(it.quantity||1), image: it.image || 'assets/products/default.svg' });
    });
    saveStoredList(CART_KEY_NAME, cart);
    if (typeof updateCartCount === 'function') updateCartCount();
    // toast with View Cart action
    showToast('Items from ' + orderId + ' added to cart');
    setTimeout(function(){
      var toastEl = document.getElementById('siteToast');
      if(toastEl && toastEl.textContent.indexOf(orderId)!==-1){
        toastEl.innerHTML = escapeHtml('Items from ' + orderId + ' added to cart') + ' <a href="cart.html" style="color:#fff;text-decoration:underline;margin-left:8px">View Cart</a>';
        toastEl.classList.add('show');
      }
    }, 100);
  }

  function removeOrder(orderId){
    if(!confirm('Remove order ' + orderId + ' from this device? This will not delete admin records.')) return;
    var hidden = getHidden();
    if(hidden.indexOf(String(orderId))===-1){ hidden.push(String(orderId)); localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden)); }
    var localOrders = [];
    try{ localOrders = JSON.parse(localStorage.getItem('smilehub_orders')||'[]'); }catch(e){}
    if(Array.isArray(localOrders)){
      var filteredLocal = localOrders.filter(function(o){ return String(o.number||o.orderNumber)!==String(orderId); });
      if(filteredLocal.length!==localOrders.length) localStorage.setItem('smilehub_orders', JSON.stringify(filteredLocal));
    }
    showToast('Order ' + orderId + ' hidden on this device');
    render();
  }

  function cancelOrder(orderId){
    var order = allOrders.find(function(o){ return String(o.number||o.orderNumber)===String(orderId); });
    if(!order) return showToast('Order not found', true);
    var st = String(order.status||'').toLowerCase();
    if(['pending','pending payment','pending quotation'].indexOf(st)===-1) return showToast('Only pending orders can be cancelled', true);
    if(!confirm('Cancel order ' + orderId + '? This will update its status to Cancelled.')) return;
    var docId = order.docId || order.number || order.orderNumber;
    var btn = document.querySelector('.order-cancel[data-order="' + (typeof CSS!=='undefined'&&CSS.escape?CSS.escape(orderId):orderId) + '"]');
    if(btn) btn.disabled=true;
    var originalStatus = order.status;
    order.status = 'Cancelled';
    addPending(orderId, { status: 'Cancelled' });
    render();
    try{
      var localOrders2 = JSON.parse(localStorage.getItem('smilehub_orders')||'[]');
      var idxLocal = -1;
      for(var i=0;i<localOrders2.length;i++){ if(String(localOrders2[i].number||localOrders2[i].orderNumber)===String(orderId)){ idxLocal=i; break; } }
      if(idxLocal!==-1){ localOrders2[idxLocal].status='Cancelled'; localStorage.setItem('smilehub_orders', JSON.stringify(localOrders2)); }
    }catch(e){}
    var user = firebase.auth().currentUser;
    if(!user){
      showToast('Order ' + orderId + ' cancelled (offline — will sync when online)');
      if(btn) btn.disabled=false;
      return;
    }
    var payload = { status: 'Cancelled', updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    db.collection('orders').doc(String(docId)).update(payload).then(function(){
      showToast('Order ' + orderId + ' cancelled');
    }).catch(function(err){
      showRowError(orderId, 'Could not cancel: ' + (err.message||'offline — will retry'));
      showToast('Could not cancel: ' + (err.message||'offline — will retry'), true);
      if(btn) btn.disabled=false;
    });
  }

  function openReturnModal(orderId){
    var order = allOrders.find(function(o){ return String(o.number||o.orderNumber)===String(orderId); });
    if(!order) return;
    if(order.returnRequest) return showToast('Return already requested for ' + orderId, true);
    var orderTime = order.sortTs || (order.date ? Date.parse(order.date) : Date.now());
    var diffDays = (Date.now() - orderTime) / (1000*60*60*24);
    if(diffDays > 7) return showToast('Return window closed (7 days)', true);
    pendingReturnOrderId = orderId;
    if(returnOrderInfo) returnOrderInfo.textContent = 'Order ' + orderId + ' — ' + (order.date||'') + ' • ' + money(order.total||0);
    if(returnReason) returnReason.value='';
    if(returnNote) returnNote.value='';
    returnModal.classList.add('open');
    returnModal.setAttribute('aria-hidden','false');
    if(returnReason) returnReason.focus();
  }
  function closeReturnModal(){
    if(returnModal) returnModal.classList.remove('open');
    if(returnModal) returnModal.setAttribute('aria-hidden','true');
    pendingReturnOrderId=null;
  }
  function submitReturn(){
    if(!pendingReturnOrderId) return;
    var order = allOrders.find(function(o){ return String(o.number||o.orderNumber)===String(pendingReturnOrderId); });
    if(!order) return showToast('Order not found', true);
    var reason = returnReason ? returnReason.value.trim() : '';
    var note = returnNote ? returnNote.value.trim() : '';
    if(!reason) return showToast('Please select a reason', true);
    var freshStatus = String(order.status||'').toLowerCase();
    if(freshStatus !== 'delivered') return showToast('Only delivered orders can be returned', true);
    if(order.returnRequest) return showToast('Return already requested', true);
    var btn = returnSubmit;
    if(btn) btn.disabled=true;
    var payload = { returnRequest: { reason: reason, note: note, requestedAt: firebase.firestore.FieldValue.serverTimestamp(), status: 'requested' }, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    var docId = order.docId || order.number || order.orderNumber;
    order.returnRequest = { reason: reason, note: note, requestedAt: new Date().toISOString(), status: 'requested' };
    addPending(pendingReturnOrderId, { returnRequest: order.returnRequest });
    render();
    try{
      var localOrders4 = JSON.parse(localStorage.getItem('smilehub_orders')||'[]');
      for(var k=0;k<localOrders4.length;k++){ if(String(localOrders4[k].number||localOrders4[k].orderNumber)===String(pendingReturnOrderId)){ localOrders4[k].returnRequest = order.returnRequest; localStorage.setItem('smilehub_orders', JSON.stringify(localOrders4)); break; } }
    }catch(e){}
    var user2 = firebase.auth().currentUser;
    if(!user2){
      showToast('Return requested (offline — will sync when online)');
      closeReturnModal();
      if(btn) btn.disabled=false;
      return;
    }
    db.collection('orders').doc(String(docId)).update(payload).then(function(){
      showToast('Return requested for ' + pendingReturnOrderId);
      closeReturnModal();
      if(btn) btn.disabled=false;
    }).catch(function(err){
      showRowError(pendingReturnOrderId, 'Could not submit return: ' + (err.message||'offline — will retry'));
      showToast('Could not submit return: ' + (err.message||'offline — will retry'), true);
      if(btn) btn.disabled=false;
    });
  }

  function openInvoice(orderId) {
    var order = allOrders.find(function(o) { return String(o.number || o.orderNumber) === String(orderId); });
    if (!order) return;
    currentInvoiceOrder = order;
    var itemsRows = (order.items || []).map(function(it) {
      return '<tr><td>' + escapeHtml(it.name || 'Product') + '</td><td>' + escapeHtml(String(it.quantity || 1)) + '</td><td>' + money(it.price || 0) + '</td><td>' + money((it.price||0)*(it.quantity||1)) + '</td></tr>';
    }).join('');
    invoiceBody.innerHTML = '<p><strong>Order:</strong> ' + escapeHtml(order.number || order.orderNumber) + ' &nbsp; <strong>Date:</strong> ' + escapeHtml(order.date || '') + ' &nbsp; <strong>Status:</strong> ' + escapeHtml(order.status || '') + '</p>' +
      '<p><strong>Ship to:</strong> ' + escapeHtml(order.address || '') + '</p>' +
      '<table class="invoice-table"><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>' + itemsRows + '</tbody><tfoot><tr><td colspan="3" style="text-align:right"><strong>Total</strong></td><td><strong>' + money(order.total||0) + '</strong></td></tr></tfoot></table>' +
      '<p class="muted" style="margin-top:12px">Thank you for shopping with SmileHub Dental Supplies.</p>';
    invoiceModal.classList.add('open');
    invoiceModal.setAttribute('aria-hidden', 'false');
    invoicePrint.focus();
  }

  function closeInvoice() {
    invoiceModal.classList.remove('open');
    invoiceModal.setAttribute('aria-hidden', 'true');
    currentInvoiceOrder = null;
  }

  if (invoiceClose) invoiceClose.addEventListener('click', closeInvoice);
  if (invoiceClose2) invoiceClose2.addEventListener('click', closeInvoice);
  if (invoiceModal) invoiceModal.addEventListener('click', function(e) { if (e.target === invoiceModal) closeInvoice(); });
  if (invoicePrint) invoicePrint.addEventListener('click', function() {
    var printContent = invoiceBody.innerHTML;
    var w = window.open('', '_blank');
    if (!w) return window.print();
    w.document.write('<!doctype html><title>Invoice ' + escapeHtml(currentInvoiceOrder ? currentInvoiceOrder.number : '') + '</title><style>body{font-family:system-ui,sans-serif;padding:24px;color:#1e293b}table{width:100%;border-collapse:collapse}th,td{padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#f1f5f9}</style>' + printContent);
    w.document.close();
    w.focus();
    w.print();
  });
  document.addEventListener('keydown', function(e) { if (e.key === 'Escape' && invoiceModal.classList.contains('open')) closeInvoice(); });

  if (searchInput) searchInput.addEventListener('input', render);
  if (statusFilter) statusFilter.addEventListener('change', render);
  if (clearBtn) clearBtn.addEventListener('click', function() { if (searchInput) searchInput.value=''; if (statusFilter) statusFilter.value=''; render(); searchInput && searchInput.focus(); });
  if (noMatchClear) noMatchClear.addEventListener('click', function() { if (searchInput) searchInput.value=''; if (statusFilter) statusFilter.value=''; render(); });

  table.addEventListener('click', function(e) {
    var viewBtn = e.target.closest('.order-view');
    if (viewBtn) {
      var id = viewBtn.getAttribute('data-order');
      var escId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/[^a-zA-Z0-9-_]/g, '\\$&');
      var exp = table.querySelector('[data-expand="' + escId + '"]');
      var row = table.querySelector('[data-order="' + escId + '"]');
      if (exp) { exp.classList.toggle('hidden'); if (row) row.classList.toggle('is-expanded'); }
      return;
    }
    var reorderBtn = e.target.closest('.order-reorder');
    if (reorderBtn) { reorder(reorderBtn.getAttribute('data-order')); return; }
    var invoiceBtn = e.target.closest('.order-invoice');
    if (invoiceBtn) { openInvoice(invoiceBtn.getAttribute('data-order')); return; }
    var cancelBtn = e.target.closest('.order-cancel');
    if (cancelBtn) { cancelOrder(cancelBtn.getAttribute('data-order')); return; }
    var returnBtn = e.target.closest('.order-return');
    if (returnBtn && !returnBtn.disabled) { openReturnModal(returnBtn.getAttribute('data-order')); return; }
    var removeBtn = e.target.closest('.order-remove');
    if (removeBtn) { removeOrder(removeBtn.getAttribute('data-order')); return; }
  });
  if (returnClose) returnClose.addEventListener('click', closeReturnModal);
  if (returnClose2) returnClose2.addEventListener('click', closeReturnModal);
  if (returnModal) returnModal.addEventListener('click', function(e){ if(e.target===returnModal) closeReturnModal(); });
  if (returnSubmit) returnSubmit.addEventListener('click', submitReturn);
  document.addEventListener('keydown', function(e){ if(e.key==='Escape' && returnModal && returnModal.classList.contains('open')) closeReturnModal(); });

  function loadOrders(){
    setLoading();
    var timeout = setTimeout(function(){
      setError('Loading is taking longer than expected. Check your connection.');
    }, 8000);
    try{
      SmileHubData.getOrders(function(orders) {
        clearTimeout(timeout);
        var user = typeof getCachedUser === 'function' ? getCachedUser() : null;
        var filtered = orders.filter(function(o) {
          var orderEmail = o.email || (o.customerObj && o.customerObj.email) || '';
          var orderName = o.customerName || o.customer || '';
          return !user || (orderEmail === user.email || (!orderEmail && orderName === user.name));
        }).filter(function(o, index, list) {
          var number = o.number || o.orderNumber;
          return list.findIndex(function(other) { return (other.number || other.orderNumber) === number; }) === index;
        });
        filtered.sort(function(a,b) {
          var ta = a.sortTs || (a.date ? Date.parse(a.date) : 0) || 0;
          var tb = b.sortTs || (b.date ? Date.parse(b.date) : 0) || 0;
          return tb - ta;
        });
        allOrders = applyPending(filtered);
        if (!user && allOrders.length === 0) {
          if (emptyEl) {
            emptyEl.querySelector('h2').textContent = 'No orders yet';
            var pEl = emptyEl.querySelector('p');
            if(pEl) pEl.textContent = 'Sign in to view your orders, or place an order to see it here.';
          }
        }
        render();
      });
    } catch(err){
      clearTimeout(timeout);
      setError('Could not load orders. Please try again.');
    }
  }

  setLoading();
  loadOrders();
});
