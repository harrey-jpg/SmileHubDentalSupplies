document.addEventListener('DOMContentLoaded', function() {
  var table = document.getElementById('ordersBody');
  if (!table) return;
  if (new URLSearchParams(location.search).get('success')) showToast('Payment successful. Order created.');

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c];
    });
  }

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
      return '<tr><td>' + escapeHtml(order.number || order.orderNumber) + '</td><td>' + escapeHtml(order.date || '') + '</td><td>' + money(order.total || 0) + '</td><td><span class="status processing">' + escapeHtml(order.status || 'Pending') + '</span></td><td><button class="btn btn-light" onclick="window.print()">Invoice</button></td></tr>';
    }).join('');
  }
  var cachedOrders = null;
  SmileHubData.getOrders(function(orders) {
    cachedOrders = orders;
    renderWithOrders(orders);
  });
  // Re-render once Firebase profile (and correct uid/email) is ready — prevents flash of "No orders yet"
  document.addEventListener('authReady', function(){
    if (cachedOrders) renderWithOrders(cachedOrders);
    else SmileHubData.getOrders(function(o){ cachedOrders=o; renderWithOrders(o); });
  });
});