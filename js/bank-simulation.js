document.addEventListener('DOMContentLoaded', function() {
  var shortcut = document.getElementById('chooseBankFailureTest');
  if (shortcut) shortcut.addEventListener('click', function() {
    var method = document.querySelector('input[name="payment"][value="Bank Transfer (Simulation)"]');
    method.click();
    document.getElementById('paymentTestSelection').textContent = 'Bank simulation selected. Continue to Review, place the order, then choose Simulate failed transfer.';
    method.focus();
  });
  var orderId = new URLSearchParams(window.location.search).get('bank_order');
  if (!orderId) return;
  var title = document.getElementById('paymentReturnTitle');
  var notice = document.getElementById('paymentReturnNotice');
  var details = document.getElementById('bankSimulationDetails');
  var success = document.getElementById('bankSimulateSuccess');
  var failure = document.getElementById('bankSimulateFailure');
  document.getElementById('paymentReturnPanel').hidden = false;
  document.querySelector('.page-title').hidden = true;
  document.querySelector('.checkout-layout').hidden = true;
  document.getElementById('paymentReturnLabel').textContent = 'BANK TRANSFER';
  document.getElementById('paymentReturnOrder').textContent = orderId;
  title.textContent = 'Loading bank transfer…';
  title.focus();
  function display(data) {
    details.hidden = false;
    document.getElementById('bankSimulationAmount').textContent = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(data.total);
    title.textContent = data.paid ? 'Transfer successful' : data.outcome === 'failed' ? 'Transfer failed' : 'Try a bank transfer';
    notice.textContent = data.paid ? 'Payment confirmed. View your order below.'
      : data.outcome === 'failed' ? 'The simulated transfer failed. Your order is unpaid. You can try the simulation again.'
      : 'Choose a result below to try the payment experience. This is a simulation; no bank is contacted.';
    success.hidden = failure.hidden = data.paid;
  }
  async function simulate(outcome) {
    success.disabled = failure.disabled = true;
    notice.textContent = 'Updating the simulation…';
    try { display(await paymongoRequest('bank', orderId, outcome)); }
    catch (error) { notice.textContent = error.message; }
    finally { success.disabled = failure.disabled = false; }
  }
  success.addEventListener('click', function() { simulate('success'); });
  failure.addEventListener('click', function() { simulate('failed'); });
  var loaded = false;
  firebase.auth().onAuthStateChanged(function(user) {
    if (!user) { notice.textContent = 'Sign in to view the bank simulation for this order.'; return; }
    if (loaded) return;
    loaded = true;
    simulate('status');
  });
});
