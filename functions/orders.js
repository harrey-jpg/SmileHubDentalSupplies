// Shared by Vercel and the local payment emulator. All stock writes are atomic.
module.exports = function orderService(db) {
  const methods = ['GCash', 'Credit Card', 'Bank Transfer (Simulation)', 'Cash on Delivery'];
  function stockStatus(product, stock) {
    return { stock, status: stock === 0 ? 'Out of Stock' : stock <= 10 ? 'Low Stock' : 'Active' };
  }
  function quantities(items) {
    if (!Array.isArray(items) || !items.length || items.length > 100) throw new Error('Invalid order items');
    const result = new Map();
    for (const item of items) {
      const id = String(item.productId), quantity = Number(item.quantity);
      if (!/^\d{1,12}$/.test(id) || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 999) throw new Error('Invalid order quantity');
      result.set(id, (result.get(id) || 0) + quantity);
      if (result.get(id) > 999) throw new Error('Invalid combined quantity');
    }
    return result;
  }
  async function place(input, user) {
    if (!input || !/^SH-[A-Za-z0-9_-]{1,90}$/.test(input.number || '') || !methods.includes(input.payment)) throw new Error('Invalid order');
    const counts = quantities(input.items), orderRef = db.collection('orders').doc(input.number);
    let saved;
    await db.runTransaction(async tx => {
      const existing = await tx.get(orderRef);
      if (existing.exists) {
        if (existing.data().userId !== user.uid || !existing.data().inventoryManaged) throw new Error('Order number already used');
        saved = existing.data(); return;
      }
      const profile = await tx.get(db.collection('users').doc(user.uid));
      if (profile.exists && profile.data().status === 'suspended') throw new Error('Account suspended');
      const delivery = await tx.get(db.collection('cms').doc('delivery'));
      const settings = delivery.exists ? delivery.data() : { standardFee: 150, freeShippingThreshold: 3000 };
      if (![settings.standardFee, settings.freeShippingThreshold].every(v => Number.isFinite(v) && v >= 0)) throw new Error('Invalid delivery pricing');
      const refs = [...counts.keys()].map(id => db.collection('products').doc(id));
      const products = await tx.getAll(...refs);
      let subtotal = 0;
      const items = products.map((snap, index) => {
        const product = snap.data(), id = refs[index].id, quantity = counts.get(id);
        if (!snap.exists || !Number.isFinite(product.price) || product.price < 0 || !Number.isSafeInteger(product.stock) || product.stock < quantity) throw new Error('An item is unavailable or has insufficient stock');
        subtotal += Math.round(product.price * 100) * quantity;
        return { productId: Number(id), name: String(product.name || 'Product').slice(0, 200), price: product.price, quantity, image: String(product.image || '').slice(0, 500) };
      });
      const discount = input.coupon === 'SMILE10' ? Math.round(subtotal * .1) : 0;
      const tax = Math.round((subtotal - discount) * .12);
      const shipping = subtotal >= Math.round(settings.freeShippingThreshold * 100) ? 0 : Math.round(settings.standardFee * 100);
      const total = subtotal + shipping + tax - discount;
      if (!Number.isSafeInteger(total) || total <= 0 || !Number.isFinite(Number(input.total)) || Math.abs(total - Math.round(Number(input.total) * 100)) > 1) throw new Error('Pricing changed. Review the cart before placing this order.');
      const quote = items.some(item => item.price >= 50000);
      saved = { ...input, userId: user.uid, orderNumber: input.number, items, inventoryManaged: true,
        paymentStatus: 'unpaid', paymentMode: input.payment === 'Bank Transfer (Simulation)' ? 'simulation' : ['GCash', 'Credit Card'].includes(input.payment) ? 'test' : 'offline',
        status: quote ? 'Pending Quotation' : input.payment === 'Cash on Delivery' ? 'Pending' : 'Pending Payment',
        subtotal: subtotal / 100, shipping: shipping / 100, tax: tax / 100, discount: discount / 100, total: total / 100 };
      // These fields must only originate from the server, never a browser draft.
      for (const key of ['paymentProvider', 'paymongoPaymentId', 'paymentSimulationResult', 'paymentLastOutcome', 'returnRequest', 'docId']) delete saved[key];
      if (!quote) products.forEach((snap, i) => tx.update(refs[i], stockStatus(snap.data(), snap.data().stock - items[i].quantity)));
      tx.set(db.collection('order_inventory').doc(input.number), { userId: user.uid, items: quote ? [] : items.map(item => ({ productId: item.productId, quantity: item.quantity })), restored: false });
      tx.set(orderRef, saved);
    });
    return saved;
  }
  async function changeStatus(orderId, status, user) {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(orderId || '')) throw new Error('Invalid order');
    const ref = db.collection('orders').doc(orderId);
    await db.runTransaction(async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error('Order not found');
      const order = snap.data();
      const profile = await tx.get(db.collection('users').doc(user.uid));
      const staff = profile.exists && ['staff', 'admin', 'superadmin'].includes(profile.data().role);
      if (profile.exists && profile.data().status === 'suspended') throw new Error('Account suspended');
      const pending = ['Pending', 'Pending Payment', 'Pending Quotation'];
      if (!staff && !(order.userId === user.uid && status === 'Cancelled' && (pending.includes(order.status) || order.status === 'Cancelled'))) throw new Error('This status change is not allowed');
      if (!['Pending', 'Pending Payment', 'Pending Quotation', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned', 'Refunded'].includes(status)) throw new Error('Invalid status');
      if (order.status === status) return;
      const receiptRef = db.collection('order_inventory').doc(orderId), receipt = await tx.get(receiptRef);
      const inventory = receipt.exists ? receipt.data() : null;
      const restore = inventory && !inventory.restored && status === 'Cancelled';
      const approveQuote = inventory && !inventory.items.length && order.status === 'Pending Quotation'
        && ['Pending', 'Pending Payment', 'Processing'].includes(status);
      const reserve = approveQuote || (inventory && inventory.restored && order.status === 'Cancelled' && status !== 'Cancelled');
      if (restore || reserve) {
        const counts = approveQuote ? quantities(order.items) : inventory.items.length ? quantities(inventory.items) : new Map();
        const refs = [...counts.keys()].map(id => db.collection('products').doc(id));
        const products = refs.length ? await tx.getAll(...refs) : [];
        products.forEach((product, i) => {
          if (!product.exists || !Number.isSafeInteger(product.data().stock)) throw new Error('Cannot update stock for this item');
          const stock = product.data().stock + (restore ? 1 : -1) * counts.get(refs[i].id);
          if (!Number.isSafeInteger(stock) || stock < 0) throw new Error('Insufficient stock to reopen order');
          tx.update(refs[i], stockStatus(product.data(), stock));
        });
        tx.update(receiptRef, { restored: Boolean(restore), ...(approveQuote ? { items: [...counts].map(([id, quantity]) => ({ productId: Number(id), quantity })) } : {}) });
      }
      tx.update(ref, { status });
    });
    return { ok: true };
  }
  return { place, changeStatus };
};
