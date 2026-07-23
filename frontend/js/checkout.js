document.addEventListener('DOMContentLoaded', () => {
  const cart = getStoredList(CART_KEY);
  const items = document.getElementById('checkoutItems');
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal >= 3000 || subtotal === 0 ? 0 : 150;
  const tax = subtotal * 0.12;

  items.innerHTML = cart.length ? cart.map(item => `<div class="summary-row"><span>${item.name} × ${item.quantity}</span><strong>${money(item.price * item.quantity)}</strong></div>`).join('') : '<p class="muted">Your cart is empty.</p>';
  document.getElementById('checkoutSubtotal').textContent = money(subtotal);
  document.getElementById('checkoutShipping').textContent = money(shipping);
  document.getElementById('checkoutTax').textContent = money(tax);
  document.getElementById('checkoutTotal').textContent = money(subtotal + shipping + tax);

  document.getElementById('checkoutForm').addEventListener('submit', event => {
    event.preventDefault();
    if (!cart.length) return showToast('Add products before checking out');
    const orders = getStoredList('smilehub_simple_orders');
    orders.unshift({number:'SH-' + Date.now().toString().slice(-7), date:new Date().toLocaleDateString(), total:subtotal + shipping + tax, status:'Processing'});
    saveStoredList('smilehub_simple_orders', orders);
    saveStoredList(CART_KEY, []);
    location.href = 'orders.html?success=1';
  });
});
