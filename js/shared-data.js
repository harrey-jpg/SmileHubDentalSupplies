(function() {
  'use strict';
  var reviews = {}, reviewStops = {}, notificationStop = null, profileStop = null, owner = null;
  function stamp() { return firebase.firestore.FieldValue.serverTimestamp(); }
  function normalizeProfile(data) {
    var result = Object.assign({}, data);
    var name = String(data.fullName || data.displayName || '').trim().split(/\s+/);
    if (!result.firstName) result.firstName = name[0] || '';
    if (!result.lastName) result.lastName = name.slice(1).join(' ');
    var digits = String(data.phoneE164 || data.phone || data.mobile || '').replace(/\D/g, '');
    result.phoneE164 = /^09\d{9}$/.test(digits) ? '+63' + digits.slice(1) : /^639\d{9}$/.test(digits) ? '+' + digits : data.phoneE164 || data.phone || data.mobile || '';
    return result;
  }
  function withAddress(user, data) {
    return firebase.firestore().collection('users').doc(user.uid).collection('addresses').get().then(function(snapshot) {
      var all = snapshot.docs.map(function(doc) { return Object.assign({ addressId: doc.id }, doc.data()); });
      var address = all.find(function(value) { return value.isDefault; }) || all[0];
      var result = normalizeProfile(data);
      if (address) result.address = Object.assign({}, address, { postal: address.postalCode || address.postal || '', province: address.province || '' });
      return result;
    });
  }
  function saveAddress(user, address, profile) {
    var col = firebase.firestore().collection('users').doc(user.uid).collection('addresses');
    return col.get().then(function(snapshot) {
      var existing = snapshot.docs.find(function(doc) { return doc.data().isDefault; });
      var ref = existing ? existing.ref : col.doc('web-default');
      var batch = firebase.firestore().batch();
      if (address.isDefault) snapshot.docs.forEach(function(doc) { if (doc.id !== ref.id) batch.set(doc.ref, { isDefault: false, updatedAt: stamp() }, { merge: true }); });
      batch.set(ref, Object.assign({}, address, {
        addressId: ref.id, label: 'Home', recipient: [profile && profile.firstName, profile && profile.lastName].filter(Boolean).join(' ') || user.displayName || 'Customer',
        phone: profile && (profile.phoneE164 || profile.phone || profile.mobile) || '', postalCode: address.postal,
        fullAddress: [address.street, address.barangay, address.city, address.province, address.postal].filter(Boolean).join(', '), updatedAt: stamp()
      }), { merge: true });
      return batch.commit();
    });
  }
  function reviewsFor(id) { return reviews[Number(id)] || []; }
  function watchReviews(id, receive) {
    if (reviewStops[id]) reviewStops[id]();
    reviewStops[id] = firebase.firestore().collection('reviews').where('productId', '==', Number(id)).onSnapshot(function(snapshot) {
      reviews[id] = snapshot.docs.map(function(doc) { var data = doc.data(); return Object.assign({ id: doc.id }, data, { text: data.comment || data.text || '' }); });
      receive(reviews[id]);
    }, function(error) { console.warn('Review sync unavailable', error); });
  }
  async function addReview(id, rating, comment) {
    var user = firebase.auth().currentUser;
    if (!user) throw new Error('Please sign in to review this product.');
    if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.trim().length < 3) throw new Error('Enter a rating and a short review.');
    var existing = await firebase.firestore().collection('reviews').where('productId', '==', Number(id)).where('userId', '==', user.uid).get();
    if (!existing.empty) throw new Error('You already reviewed this product.');
    await firebase.firestore().collection('reviews').add({ productId: Number(id), userId: user.uid, userName: user.displayName || 'SmileHub Customer', rating: rating, comment: comment.trim(), orderId: '', createdAt: stamp(), updatedAt: stamp() });
  }
  function saveNotification(note) {
    var user = firebase.auth().currentUser;
    if (!user) return;
    firebase.firestore().collection('notifications').doc(note.id).set(Object.assign({}, note, { userId: user.uid, type: note.kind || 'order', createdAt: stamp() }), { merge: true }).catch(function(error) { console.warn('Notification save failed', error); });
  }
  function markNotificationsRead(ids) {
    if (!owner || !ids.length) return;
    var batch = firebase.firestore().batch();
    ids.slice(0, 100).forEach(function(id) { batch.update(firebase.firestore().collection('notifications').doc(String(id)), { read: true, updatedAt: stamp() }); });
    batch.commit().catch(function(error) { console.warn('Notification read update failed', error); });
  }
  firebase.auth().onAuthStateChanged(function(user) {
    if (notificationStop) notificationStop();
    if (profileStop) profileStop();
    owner = user ? user.uid : null;
    if (window.CustomerNotify) window.CustomerNotify.replaceShared([]);
    if (!user) return;
    var uid = user.uid;
    notificationStop = firebase.firestore().collection('notifications').where('userId', '==', uid).onSnapshot(function(snapshot) {
      if (owner !== uid) return;
      var notes = snapshot.docs.map(function(doc) {
        var value = doc.data();
        var date = value.createdAt && value.createdAt.toDate ? value.createdAt.toDate().toISOString() : value.date || '';
        return Object.assign({}, value, { id: doc.id, date: date, kind: value.kind || value.type || 'order' });
      }).sort(function(a, b) { return String(b.date).localeCompare(String(a.date)); });
      if (window.CustomerNotify) window.CustomerNotify.replaceShared(notes);
    }, function(error) { console.warn('Notification sync unavailable', error); });
    var profileForm = document.getElementById('profileInformationForm') || document.getElementById('profileFirstName');
    if (profileForm) profileStop = firebase.firestore().collection('users').doc(uid).onSnapshot(function(snapshot) {
      if (owner !== uid) return;
      var host = document.getElementById('sharedPaymentMethods');
      if (!host) {
        host = document.createElement('section'); host.id = 'sharedPaymentMethods';
        var parent = profileForm.closest('form') || profileForm.parentElement;
        parent.insertAdjacentElement('afterend', host);
      }
      host.replaceChildren();
      var title = document.createElement('h3'); title.textContent = 'Saved payment methods'; host.appendChild(title);
      var methods = snapshot.exists && snapshot.data().savedPaymentMethods || [];
      methods.forEach(function(method) { var row = document.createElement('p'); row.textContent = method.title + ' — ' + method.subtitle; host.appendChild(row); });
      if (!methods.length) { var empty = document.createElement('p'); empty.textContent = 'No saved payment methods.'; host.appendChild(empty); }
    }, function(error) { console.warn('Payment method sync unavailable', error); });
  });
  window.SmileHubSharedData = { normalizeProfile: normalizeProfile, withAddress: withAddress, saveAddress: saveAddress, reviewsFor: reviewsFor, watchReviews: watchReviews, addReview: addReview, saveNotification: saveNotification, markNotificationsRead: markNotificationsRead };
})();
