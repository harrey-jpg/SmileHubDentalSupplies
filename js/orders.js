document.addEventListener('DOMContentLoaded', function() {
  var table = document.getElementById('ordersBody');
  if (!table) return;
  if (new URLSearchParams(location.search).get('success')) showToast('Payment successful. Order created.');

  SmileHubData.getOrders(function(orders) {
    var filtered = orders.filter(function(o) {
      var user = getCachedUser();
      var orderEmail = o.email || (o.customer && o.customer.email) || '';
      var orderName = o.customer || o.customerName || '';
      return user && (orderEmail === user.email || orderName === user.name);
    });
    if (filtered.length === 0) {
      table.innerHTML = '<tr><td colspan="5" class="text-center muted" style="padding:40px;">No orders yet.</td></tr>';
      return;
    }
    table.innerHTML = filtered.map(function(order) {
      return '<tr><td>' + (order.number || order.orderNumber) + '</td><td>' + (order.date || '') + '</td><td>' + money(order.total || 0) + '</td><td><span class="status processing">' + (order.status || 'Pending') + '</span></td><td><button class="btn btn-light" onclick="window.print()">Invoice</button></td></tr>';
    }).join('');
  });
});