// Test payments only. Client totals are suitable for this demo, never live charges.
module.exports = function createPayments({ db, auth, secret, fetch: request = fetch }) {
  async function api(path, attributes) {
    const key = secret();
    if (!/^sk_test_[A-Za-z0-9]+$/.test(key || '')) throw new Error('Configure a PayMongo secret TEST key on the server.');
    const response = await request('https://api.paymongo.com/v1/checkout_sessions' + path, {
      method: attributes ? 'POST' : 'GET',
      headers: { Authorization: 'Basic ' + Buffer.from(key + ':').toString('base64'), 'Content-Type': 'application/json' },
      ...(attributes ? { body: JSON.stringify({ data: { attributes } }) } : {}),
      signal: AbortSignal.timeout(20000)
    });
    if (!response.ok) throw new Error('PayMongo test checkout is unavailable. Check the test key and enabled payment methods.');
    const result = (await response.json()).data;
    if (!result || result.attributes?.livemode !== false) throw new Error('Only test payments are allowed.');
    return result;
  }

  async function confirm(sessionId) {
    if (!/^cs_[A-Za-z0-9]+$/.test(sessionId || '')) throw new Error('Invalid checkout session.');
    const ref = db.collection('paymongo_sessions').doc(sessionId);
    const saved = await ref.get();
    if (!saved.exists) return false;
    const session = await api('/' + sessionId);
    const record = saved.data();
    const payment = (session.attributes.payments || []).find(p => p.attributes?.status === 'paid'
      && p.attributes.livemode === false && p.attributes.currency === 'PHP' && p.attributes.amount === record.amount);
    if (!payment) return false;
    await db.runTransaction(async tx => {
      const orderRef = db.collection('orders').doc(record.orderId);
      const order = await tx.get(orderRef);
      if (!order.exists || order.data().userId !== record.userId) throw new Error('Order does not match payment.');
      if (order.data().paymentStatus === 'paid') return;
      tx.update(orderRef, { paymentStatus: 'paid', paymentMode: 'test', paymentProvider: 'paymongo',
        paymongoPaymentId: payment.id,
        ...(order.data().status === 'Pending Payment' ? { status: 'Processing' } : {}) });
    });
    return true;
  }

  return async function payments(req, res) {
    res.set('Cache-Control', 'no-store');
    try {
      const path = req.path.replace(/^\/api\/payments/, '');
      // Webhook contents are only a hint: retrieve the session directly from
      // PayMongo with our secret before trusting any payment or amount.
      if (req.method === 'POST' && path === '/webhook') {
        const event = req.body?.data?.attributes || req.body?.data;
        if (event?.type === 'checkout_session.payment.paid') await confirm(event.data?.id);
        return res.json({ received: true });
      }
      const token = (req.headers.authorization || '').replace(/^Bearer /, '');
      let user;
      try { user = await auth.verifyIdToken(token); } catch (_) { return res.status(401).json({ error: 'Sign in to continue.' }); }
      const orderId = req.body?.orderId;
      if (typeof orderId !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(orderId)) return res.status(400).json({ error: 'Invalid order.' });
      const orderRef = db.collection('orders').doc(orderId);
      const snap = await orderRef.get();
      if (!snap.exists || snap.data().userId !== user.uid) return res.status(404).json({ error: 'Order not found.' });
      const order = snap.data();
      if (req.method === 'POST' && path === '/bank') {
        const outcome = req.body.outcome || 'status';
        if (!['status', 'success', 'failed'].includes(outcome) || order.payment !== 'Bank Transfer (Simulation)') {
          return res.status(400).json({ error: 'Invalid bank simulation.' });
        }
        let result;
        await db.runTransaction(async tx => {
          const current = (await tx.get(orderRef)).data();
          if (current.userId !== user.uid || current.payment !== 'Bank Transfer (Simulation)') throw new Error('Order changed');
          if (outcome !== 'status' && current.paymentStatus !== 'paid') {
            if (current.status !== 'Pending Payment' || !Number.isFinite(current.total) || current.total <= 0) throw new Error('Order is not payable');
            const update = { paymentMode: 'simulation', paymentProvider: 'demo-bank', paymentSimulationResult: outcome,
              paymentStatus: outcome === 'success' ? 'paid' : 'unpaid', status: outcome === 'success' ? 'Processing' : 'Pending Payment' };
            tx.update(orderRef, update);
            Object.assign(current, update);
          }
          result = { mode: 'simulation', paid: current.paymentStatus === 'paid', outcome: current.paymentSimulationResult || 'pending', total: current.total };
        });
        return res.json(result);
      }
      const sessions = db.collection('paymongo_sessions');
      if (req.method === 'POST' && path === '/status') {
        const saved = await sessions.where('orderId', '==', orderId).get();
        for (const doc of saved.docs) if (await confirm(doc.id)) return res.json({ paid: true, mode: 'test' });
        return res.json({ paid: false, mode: 'test' });
      }
      if (req.method !== 'POST' || path !== '/checkout') return res.status(404).json({ error: 'Not found.' });
      const amount = Math.round(Number(order.total) * 100);
      if (!['GCash', 'Credit Card'].includes(order.payment) || order.status !== 'Pending Payment'
          || order.paymentStatus === 'paid' || !Number.isSafeInteger(amount) || amount < 2000
          || amount > 100000000 || order.items?.some(item => Number(item.price) >= 50000)) {
        return res.status(400).json({ error: 'This order is not eligible for test checkout (minimum ₱20).' });
      }
      const existing = await sessions.where('orderId', '==', orderId).limit(1).get();
      if (!existing.empty) return res.json({ url: existing.docs[0].data().url, mode: 'test' });
      const origin = process.env.PAYMONGO_SITE_URL || 'https://smilehub-ecommerce.web.app';
      const returnUrl = origin + '/checkout.html?paymongo_order=' + encodeURIComponent(orderId);
      const session = await api('', {
        line_items: [{ name: 'TEST ONLY — SmileHub ' + orderId, amount, currency: 'PHP', quantity: 1 }],
        payment_method_types: [order.payment === 'GCash' ? 'gcash' : 'card'],
        description: 'Test payment — no real charge', reference_number: orderId,
        success_url: returnUrl, cancel_url: returnUrl + '&cancelled=1',
        send_email_receipt: false, show_line_items: true
      });
      const url = session.attributes.checkout_url;
      if (new URL(url).origin !== 'https://checkout.paymongo.com') throw new Error('Invalid checkout URL.');
      await sessions.doc(session.id).set({ orderId, userId: user.uid, amount, url });
      return res.json({ url, mode: 'test' });
    } catch (error) {
      // Never return provider payloads or credentials to the browser.
      return res.status(502).json({ error: 'Test payment could not be completed. Your order is saved; check Your Orders before trying again.' });
    }
  };
};
