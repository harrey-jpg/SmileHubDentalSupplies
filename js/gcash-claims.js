(function (root) {
  'use strict';
  function createService(db, auth, stamp) {
    var pending = new Map();
    return {
      submit: function (id, reference) {
        if (pending.has(id)) return pending.get(id);
        reference = String(reference || '').trim();
        if (!/^[A-Za-z0-9-]{6,40}$/.test(reference)) return Promise.reject(new Error('Enter a reference of 6–40 letters, numbers or hyphens.'));
        var user = auth.currentUser;
        if (!user) return Promise.reject(new Error('Sign in again before submitting your reference.'));
        var claimRef = db.collection('gcash_payment_claims').doc(id);
        var task = db.runTransaction(async function (tx) {
          var orderSnap = await tx.get(db.collection('orders').doc(id));
          var claimSnap = await tx.get(claimRef);
          var order = orderSnap.exists && orderSnap.data();
          if (!order || order.userId !== user.uid || !auth.currentUser || auth.currentUser.uid !== user.uid) throw new Error('This order is unavailable for this account.');
          if (['GCash', 'GCash (SmileHub QR)'].indexOf(order.paymentMethod || order.payment) === -1 || order.status === 'Cancelled' || String(order.paymentStatus).toLowerCase() === 'paid' || order.gcashPaymentStatus === 'Paid') throw new Error('This order cannot accept a payment reference. Refresh its payment status.');
          var claim = claimSnap.exists && claimSnap.data();
          if (claim && claim.status !== 'Rejected') throw new Error('A reference is already submitted. Wait for staff review.');
          if (claim) tx.update(claimRef, { reference: reference, status: 'For Verification', reason: '', submittedAt: stamp() });
          else tx.set(claimRef, { orderId: id, userId: user.uid, reference: reference, status: 'For Verification', submittedAt: stamp() });
        });
        pending.set(id, task);
        task.then(function () { pending.delete(id); }, function () { pending.delete(id); });
        return task;
      },
      isSaving: function (id) { return pending.has(id); },
      pending: function (id) { return pending.get(id); }
    };
  }
  root.SmileHubGcash = { createService: createService };
  if (!root.document || !root.firebase) return;
  var db = root.firebase.firestore(), auth = root.firebase.auth();
  var service = createService(db, auth, function () { return root.firebase.firestore.FieldValue.serverTimestamp(); });
  var cleanups = [];
  root.SmileHubGcash.mount = function () {
    cleanups.splice(0).forEach(function (stop) { stop(); });
    document.querySelectorAll('[data-gcash-order]').forEach(function (host) {
      var id = host.dataset.gcashOrder, claim = null, order = null, loaded = false;
      host.innerHTML = '<h3>GCash payment</h3><p data-state role="status" aria-live="polite">Loading payment status…</p><p data-reason></p><form hidden><label>GCash reference number<input name="reference" required minlength="6" maxlength="40" pattern="[A-Za-z0-9-]{6,40}" autocomplete="off" aria-describedby="gcash-help-' + host.dataset.gcashIndex + '"></label><p class="muted" id="gcash-help-' + host.dataset.gcashIndex + '">Already transferred? Submit the reference from your GCash receipt. Staff must verify receipt of payment. Never share your PIN or OTP.</p><button class="btn btn-primary" type="submit">Submit reference</button></form><button class="btn btn-light" data-retry type="button" hidden>Retry payment status</button>';
      var form = host.querySelector('form'), input = form.elements.reference, button = form.querySelector('button');
      var state = host.querySelector('[data-state]'), reason = host.querySelector('[data-reason]'), retry = host.querySelector('[data-retry]');
      var saving = service.isSaving(id), timer, disposed = false, stops = [];
      function render() {
        var paid = order && (String(order.paymentStatus).toLowerCase() === 'paid' || claim && claim.status === 'Paid');
        var cancelled = order && order.status === 'Cancelled';
        state.textContent = saving ? 'Saving reference…' : !loaded ? 'Loading payment status…' : paid ? 'Paid — staff confirmed your payment.' : cancelled ? 'Order cancelled. Payment submission is unavailable.' : claim && claim.status === 'For Verification' ? 'For verification — wait for staff to check the transfer.' : claim && claim.status === 'Rejected' ? 'Reference rejected. Review the reason and submit a correction.' : 'Payment not confirmed. Submit a reference only after transferring.';
        reason.textContent = claim && claim.reason || '';
        form.hidden = !loaded || !!paid || !!cancelled || !!(claim && claim.status !== 'Rejected');
        input.disabled = button.disabled = saving;
        button.textContent = saving ? 'Saving…' : claim ? 'Submit corrected reference' : 'Submit reference';
      }
      function start() {
        stops.splice(0).forEach(function (stop) { stop(); });
        loaded = false; retry.hidden = true; render();
        var orderReady = false, claimReady = false;
        function error() { loaded = false; form.hidden = true; state.textContent = 'Payment status is unavailable. Check your connection and retry.'; retry.hidden = false; }
        [['orders', function (value) { order = value; orderReady = true; }], ['gcash_payment_claims', function (value) { claim = value; claimReady = true; }]].forEach(function (entry) {
          stops.push(db.collection(entry[0]).doc(id).onSnapshot({ includeMetadataChanges: true }, function (snap) {
            if (snap.metadata.hasPendingWrites) return;
            if (snap.metadata.fromCache) { if (entry[0] === 'orders') orderReady = false; else claimReady = false; error(); return; }
            entry[1](snap.exists ? snap.data() : null);
            loaded = !!order && orderReady && claimReady;
            if (orderReady && !order) { error(); return; }
            retry.hidden = loaded;
            render();
          }, error));
        });
      }
      form.addEventListener('submit', async function (event) {
        event.preventDefault(); if (saving || !loaded) return;
        saving = true; render();
        timer = setTimeout(function () { state.textContent = 'Still saving—check your connection. Do not submit again.'; }, 10000);
        try { await service.submit(id, input.value); if (!disposed) state.textContent = 'Reference submitted for staff verification. Payment is not confirmed yet.'; }
        catch (error) { if (!disposed) state.textContent = error.message + ' Your entry is kept; retry when ready.'; }
        finally { clearTimeout(timer); saving = false; if (!disposed) { input.disabled = button.disabled = false; button.textContent = claim && claim.status === 'Rejected' ? 'Submit corrected reference' : 'Submit reference'; } }
      });
      retry.addEventListener('click', start);
      start();
      if (saving) service.pending(id).then(function () { saving = false; if (!disposed) render(); }, function () { saving = false; if (!disposed) { render(); state.textContent = 'Reference could not be saved. Check its status before retrying.'; } });
      cleanups.push(function () { disposed = true; clearTimeout(timer); stops.forEach(function (stop) { stop(); }); });
    });
  };
  auth.onAuthStateChanged(function () { if (root.SmileHubGcash.mount) root.SmileHubGcash.mount(); });
  root.addEventListener('pagehide', function () { cleanups.splice(0).forEach(function (stop) { stop(); }); });
})(typeof window === 'undefined' ? globalThis : window);
