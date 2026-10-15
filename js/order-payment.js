(function() {
  function describe(order) {
    var paid = String(order.paymentStatus || '').toLowerCase() === 'paid';
    var simulation = order.paymentMode === 'simulation' || order.payment === 'Bank Transfer (Simulation)';
    var test = simulation || order.paymentMode === 'test' || Boolean(order.paymongoPaymentId);
    var failed = !paid && (order.paymentSimulationResult === 'failed' || order.paymentLastOutcome === 'failed' || ['failed', 'rejected'].indexOf(String(order.paymentStatus || '').toLowerCase()) !== -1);
    var label = paid ? (simulation ? 'Simulated payment confirmed' : test ? 'Test payment confirmed' : 'Payment confirmed')
      : failed ? 'Payment failed — unpaid' : order.payment === 'Cash on Delivery' ? 'Due on delivery' : 'Payment pending';
    return { label: label, tone: paid ? 'paid' : failed ? 'failed' : 'pending', method: order.payment || 'Not recorded',
      note: test ? 'Demo only — no real money transferred.' : 'Payment status is separate from delivery status.',
      reference: order.paymongoPaymentId || (simulation ? order.number || order.orderNumber || '' : '') };
  }
  function escape(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]; }); }
  function html(order, detailed) {
    var p = describe(order);
    return '<div class="order-payment-summary"><strong class="order-payment-state is-' + p.tone + '">' + escape(p.label) + '</strong><small>' + escape(p.method) + '</small>'
      + (detailed ? '<small>' + escape(p.note) + '</small>' + (p.reference ? '<small>Reference: ' + escape(p.reference) + '</small>' : '') : '') + '</div>';
  }
  function belongsTo(order, user) {
    if (!user) return false;
    if (order.userId) return Boolean(user.uid) && order.userId === user.uid;
    var email = order.email || order.customerEmail || (order.customerObj && order.customerObj.email);
    return Boolean(email && user.email) && String(email).toLowerCase() === String(user.email).toLowerCase();
  }
  window.SmileHubOrderPayment = { describe: describe, html: html, belongsTo: belongsTo };
})();
