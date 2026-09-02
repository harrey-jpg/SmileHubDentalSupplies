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
      return '<tr><td><strong>' + escapeHtml(num) + '</strong></td><td>' + escapeHtml(order.date || '') + '</td><td>' + money(order.total || 0) + '</td><td><span class="status ' + cls + '">' + escapeHtml(order.status || 'Pending') + '</span></td><td style="display:flex;gap:6px;flex-wrap:wrap;"><button class="btn btn-light view-order" data-number="' + escapeHtml(num) + '" style="padding:4px 10px;font-size:0.8rem;">View</button><button class="btn btn-light" onclick="window.print()" style="padding:4px 10px;font-size:0.8rem;">Invoice</button></td></tr>';
    }).join('');
    table.querySelectorAll('.view-order').forEach(function(btn){
      btn.addEventListener('click', function(){ viewOrder(this.dataset.number); });
    });
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
      '<div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end;"><button class="btn btn-light" onclick="window.print()">Print Invoice</button><button class="btn btn-light" onclick="document.getElementById(\'orderModal\').style.display=\'none\'">Close</button></div>';
  }

  window.viewOrder = viewOrder;
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
