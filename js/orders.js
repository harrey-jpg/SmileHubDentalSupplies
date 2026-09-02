document.addEventListener('DOMContentLoaded', function() {
  var table = document.getElementById('ordersBody');
  if (!table) return;
  if (new URLSearchParams(location.search).get('success')) showToast('Payment successful. Order created.');

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  }

  var cachedOrders = null;

  function renderWithOrders(orders){
    var user = getCachedUser();
    if (!user) {
      table.innerHTML = '<tr><td colspan="5" class="text-center muted" style="padding:32px;">Loading orders...</td></tr>';
      return;
    }
    var filtered = orders.filter(function(o) {
      var orderUserId = o.userId || o.uid || o.customerId || '';
      if (orderUserId && user.uid && orderUserId === user.uid) return true;
      var orderEmail = o.email || o.customerEmail || o.customer_email || (o.customerObj && o.customerObj.email) || '';
      if (orderEmail && orderEmail.toLowerCase() === String(user.email||'').toLowerCase()) return true;
      var orderName = o.customerName || o.customer || '';
      return !orderEmail && orderName === user.name;
    }).filter(function(o, index, list) {
      var number = o.number || o.orderNumber;
      return list.findIndex(function(other) { return (other.number || other.orderNumber) === number; }) === index;
    });
    if (filtered.length === 0) {
      table.innerHTML = '<tr><td colspan="5" class="text-center muted" style="padding:40px;">No orders yet.</td></tr>';
      return;
    }
    table.innerHTML = filtered.map(function(order) {
      var num = order.number || order.orderNumber || '';
      var cls = (order.status === 'Delivered' ? 'delivered' : order.status === 'Cancelled' ? 'low' : 'processing');
      return '<tr><td><strong>' + escapeHtml(num) + '</strong></td><td>' + escapeHtml(order.date || '') + '</td><td>' + money(order.total || 0) + '</td><td><span class="status ' + cls + '">' + escapeHtml(order.status || 'Pending') + '</span></td><td><div class="order-actions" style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;"><button class="btn btn-light view-order" data-number="' + escapeHtml(num) + '" style="padding:6px 6px;font-size:0.78rem;min-height:32px;">View</button><button class="btn btn-light invoice-btn" data-number="' + escapeHtml(num) + '" style="padding:6px 6px;font-size:0.78rem;min-height:32px;">Invoice</button></div></td></tr>';
    }).join('');
    table.querySelectorAll('.view-order').forEach(function(btn){
      btn.addEventListener('click', function(){ viewOrder(this.dataset.number); });
    });
    table.querySelectorAll('.invoice-btn').forEach(function(btn){
      btn.addEventListener('click', function(){ printInvoice(this.dataset.number); });
    });
  }

  function printInvoice(number){
    if (!cachedOrders) return;
    var order = cachedOrders.find(function(o){ return (o.number || o.orderNumber) === number; });
    if (!order) { showToast('Order not found', true); return; }
    var itemsHtml = order.items ? order.items.map(function(item){
      return '<tr><td>' + escapeHtml(item.name||'Item') + '</td><td style="text-align:center;">' + escapeHtml(item.quantity||1) + '</td><td style="text-align:right;">' + money(item.price||0) + '</td><td style="text-align:right;">' + money((item.quantity||1)*(item.price||0)) + '</td></tr>';
    }).join('') : '';
    var win = window.open('', '_blank');
    win.document.write(
      '<html><head><title>Invoice - ' + escapeHtml(order.number || order.orderNumber) + '</title>' +
      '<style>' +
      'body{font-family:Inter,Arial,sans-serif;padding:40px;color:#0f2436;max-width:760px;margin:auto;background:#fff;}' +
      '.header{text-align:center;border-bottom:3px solid #1261a0;padding-bottom:18px;margin-bottom:22px;}' +
      '.header h1{margin:0;color:#1261a0;font-size:1.8rem;letter-spacing:0.02em;} .header p{margin:4px 0 0;color:#5a6d80;font-size:0.9rem;}' +
      '.meta{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;}' +
      '.meta div{padding:10px 14px;background:#f4f7fa;border-radius:10px;font-size:0.9rem;} .meta strong{display:block;font-size:0.72rem;color:#6b7a8c;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:2px;}' +
      'table{width:100%;border-collapse:collapse;margin:14px 0 8px;}' +
      'th{padding:10px 12px;text-align:left;border-bottom:2px solid #1261a0;font-size:0.78rem;text-transform:uppercase;color:#5a6d80;letter-spacing:0.04em;}' +
      'td{padding:10px 12px;border-bottom:1px solid #e6edf2;font-size:0.9rem;}' +
      '.total-row td{border-top:2px solid #0f2436;font-weight:800;font-size:1rem;background:#f8fafc;}' +
      '.footer{text-align:center;margin-top:28px;padding-top:16px;border-top:1px solid #e6edf2;color:#6b7a8c;font-size:0.82rem;}' +
      '.badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:0.75rem;font-weight:700;background:#e0f2fe;color:#075985;}' +
      '@media print{body{padding:16px;} .no-print{display:none;}}' +
      '</style></head><body>' +
      '<div class="header"><h1>SmileHub Dental Supplies</h1><p>Official Invoice</p></div>' +
      '<div class="meta">' +
        '<div><strong>Invoice / Order #</strong>' + escapeHtml(order.number || order.orderNumber) + '</div>' +
        '<div><strong>Date</strong>' + escapeHtml(order.date || '') + '</div>' +
        '<div><strong>Customer</strong>' + escapeHtml(order.customer||order.customerName||'') + '<br><span style="color:#5a6d80;">' + escapeHtml(order.email||order.customerEmail||'') + '</span></div>' +
        '<div><strong>Status</strong><span class="badge">' + escapeHtml(order.status||'Pending') + '</span></div>' +
        '<div style="grid-column:span 2;"><strong>Shipping Address</strong>' + escapeHtml(order.address||'') + '</div>' +
      '</div>' +
      '<table><thead><tr><th>Item</th><th style="text-align:center;">Qty</th><th style="text-align:right;">Price</th><th style="text-align:right;">Total</th></tr></thead><tbody>' + itemsHtml +
      '<tr class="total-row"><td colspan="3" style="text-align:right;">Grand Total</td><td style="text-align:right;">' + money(order.total||0) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="footer">Thank you for choosing SmileHub Dental Supplies!<br>support@smilehub.ph • +63 917 555 0142 • Quezon City, Philippines</div>' +
      '<div style="text-align:center;margin-top:18px;" class="no-print"><button onclick="window.print()" style="padding:10px 22px;border-radius:8px;border:1px solid #1261a0;background:#1261a0;color:#fff;cursor:pointer;font-weight:700;">Print</button> <button onclick="window.close()" style="padding:10px 22px;border-radius:8px;border:1px solid #dce5ec;background:#fff;cursor:pointer;">Close</button></div>' +
      '</body></html>'
    );
    win.document.close();
  }

  function viewOrder(number){
    if (!cachedOrders) return;
    var order = cachedOrders.find(function(o){ return (o.number || o.orderNumber) === number; });
    if (!order) { showToast('Order not found', true); return; }
    var modal = document.getElementById('orderModal');
    var title = document.getElementById('orderModalTitle');
    var content = document.getElementById('orderModalContent');
    if (!modal || !title || !content) return;
    modal.style.display = 'flex';
    title.textContent = 'Order ' + (order.number || order.orderNumber);
    var itemsHtml = order.items ? order.items.map(function(item){
      return '<tr><td>' + escapeHtml(item.name||'Item') + '</td><td>' + escapeHtml(item.quantity||1) + '</td><td>' + money(item.price||0) + '</td><td>' + money((item.quantity||1)*(item.price||0)) + '</td></tr>';
    }).join('') : '';
    var cls = order.status === 'Delivered' ? 'delivered' : order.status === 'Cancelled' ? 'low' : 'processing';
    var orderNum = order.number || order.orderNumber || '';
    content.innerHTML =
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">' +
        '<div><strong>Customer:</strong> ' + escapeHtml(order.customer||order.customerName||'') + '</div>' +
        '<div><strong>Email:</strong> ' + escapeHtml(order.email||order.customerEmail||'') + '</div>' +
        '<div><strong>Date:</strong> ' + escapeHtml(order.date||'') + '</div>' +
        '<div><strong>Status:</strong> <span class="status ' + cls + '">' + escapeHtml(order.status||'Pending') + '</span></div>' +
        '<div style="grid-column:span 2;"><strong>Address:</strong><br>' + escapeHtml(order.address||'') + '</div>' +
      '</div>' +
      '<h3 style="margin:12px 0 8px;">Items</h3>' +
      '<div class="table-wrap" style="box-shadow:none;border:1px solid var(--border);"><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>' + itemsHtml + '<tr><td colspan="3" style="text-align:right;"><strong>Total:</strong></td><td><strong>' + money(order.total||0) + '</strong></td></tr></tbody></table></div>' +
      '<div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;"><button class="btn btn-light" onclick="printInvoice(\'' + escapeHtml(orderNum) + '\')">Print Invoice</button><button class="btn btn-light" onclick="document.getElementById(\'orderModal\').style.display=\'none\'">Close</button></div>';
  }

  // Reorder: add this order's items to cart (overrides frontend-suite demo toast)
  table.addEventListener('click', function(e){
    if (!e.target.classList.contains('reorder-btn')) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    var row = e.target.closest('tr');
    var num = row && row.querySelector('.view-order') ? row.querySelector('.view-order').dataset.number : null;
    if (!num) num = e.target.dataset.number;
    var order = cachedOrders && cachedOrders.find(function(o){ return (o.number||o.orderNumber)===num; });
    if (!order || !order.items || !order.items.length) { showToast('No items to reorder', true); return; }
    // Resolve product ids via catalog if possible, otherwise use name-based fallback
    SmileHubData.getProducts(function(products){
      var cart = getStoredList(CART_KEY);
      order.items.forEach(function(it){
        var name = it.name || '';
        var qty = Number(it.quantity||1);
        var price = Number(it.price||0);
        // Try to find real product id by name
        var prod = products.find(function(p){ return String(p.name).toLowerCase() === String(name).toLowerCase(); });
        var id = prod ? prod.id : ('reorder-' + name.replace(/\W+/g,'-').toLowerCase());
        var existing = cart.find(function(c){ return String(c.id)===String(id); });
        if (existing) existing.quantity += qty;
        else cart.push({ id: id, name: name, price: price, quantity: qty, image: prod ? prod.image : 'assets/products/default.svg' });
      });
      saveStoredList(CART_KEY, cart);
      updateCartCount();
      showToast('Items added to cart — view cart to checkout', false, true);
    });
  });

  window.viewOrder = viewOrder;
  window.printInvoice = printInvoice;
  document.addEventListener('click', function(e){
    var modal = document.getElementById('orderModal');
    if (modal && e.target === modal) modal.style.display = 'none';
  });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape') {
      var modal = document.getElementById('orderModal');
      if (modal) modal.style.display = 'none';
    }
  });

  SmileHubData.getOrders(function(orders) {
    cachedOrders = orders;
    renderWithOrders(orders);
  });
  document.addEventListener('authReady', function(){
    if (cachedOrders) renderWithOrders(cachedOrders);
    else SmileHubData.getOrders(function(o){ cachedOrders=o; renderWithOrders(o); });
  });
});
