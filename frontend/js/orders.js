document.addEventListener('DOMContentLoaded', () => {
  const table = document.getElementById('ordersBody');
  const orders = getStoredList('smilehub_simple_orders');
  if (new URLSearchParams(location.search).get('success')) showToast('Payment successful. Order created.');
  if (!orders.length) return;
  table.innerHTML = orders.map(order => `<tr><td>${order.number}</td><td>${order.date}</td><td>${money(order.total)}</td><td><span class="status processing">${order.status}</span></td><td><button class="btn btn-light" onclick="window.print()">Invoice</button></td></tr>`).join('');
});
