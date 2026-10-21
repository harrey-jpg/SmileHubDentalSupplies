(function () {
  'use strict';
  var LISTS = { smilehub_simple_cart: 'carts', smilehub_simple_wishlist: 'wishlists' };
  var applyingRemote = false, uid = null, stops = [], queue = Promise.resolve();
  var changes = {}, pending = {}, latest = {}, generation = 0;
  function writeLocal(key, items) {
    applyingRemote = true;
    try { if (window.SmileHubStorage) window.SmileHubStorage.set(key, items); }
    finally { applyingRemote = false; }
  }
  function notify() {
    if (window.updateCartCount) window.updateCartCount();
    if (window.updateWishlistCount) window.updateWishlistCount();
    document.dispatchEvent(new CustomEvent('smilehub:data-synced', { detail: { uid: uid } }));
  }
  function trackRemovals(key, previous, next) {
    if (!LISTS[key]) return;
    previous = Array.isArray(previous) ? previous : [];
    next = Array.isArray(next) ? next : [];
    changes[key] = {
      removed: previous.filter(function(item) { return !next.some(function(value) { return String(value.id) === String(item.id); }); }).map(function(item) { return String(item.id); }),
      updated: next.filter(function(item) { var old = previous.find(function(value) { return String(value.id) === String(item.id); }); return !old || JSON.stringify(old) !== JSON.stringify(item); })
    };
  }
  function saveList(key, items, clear) {
    if (applyingRemote || !LISTS[key] || !uid) return Promise.resolve();
    var owner = uid, epoch = generation;
    var diff = changes[key] || { removed: [], updated: items };
    delete changes[key];
    pending[key] = (pending[key] || 0) + 1;
    var work = queue.then(function() {
      if (uid !== owner || generation !== epoch) return;
      var ref = firebase.firestore().collection(LISTS[key]).doc(owner);
      return firebase.firestore().runTransaction(function(transaction) {
        return transaction.get(ref).then(function(snapshot) {
          var data = snapshot.exists ? snapshot.data() : {};
          var remote = Array.isArray(data.items) ? data.items : [];
          var changedIds = diff.updated.map(function(item) { return String(item.id); });
          var merged = clear ? [] : remote.filter(function(item) { return diff.removed.indexOf(String(item.id)) < 0 && changedIds.indexOf(String(item.id)) < 0; }).concat(diff.updated);
          transaction.set(ref, { userId: owner, items: merged, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
        });
      });
    }).catch(function(error) {
      if (uid === owner && window.showToast) window.showToast('Shopping list could not sync. Please try again.', true);
      throw error;
    }).finally(function() {
      if (uid !== owner || generation !== epoch) return;
      pending[key]--;
      if (!pending[key] && latest[key]) { writeLocal(key, latest[key]); notify(); }
    });
    queue = work.catch(function() {});
    return work;
  }
  function clearList(key) {
    writeLocal(key, []);
    return saveList(key, [], true);
  }
  function syncAll(user) {
    var nextUid = user ? user.uid : null;
    if (nextUid === uid) return;
    stops.forEach(function(stop) { stop(); }); stops = [];
    generation++; uid = nextUid; pending = {}; latest = {}; changes = {};
    Object.keys(LISTS).forEach(function(key) {
      // Cloud state is authoritative; stale browser lists never overwrite it.
      writeLocal(key, []);
      if (!uid) return;
      var owner = uid, epoch = generation;
      stops.push(firebase.firestore().collection(LISTS[key]).doc(owner).onSnapshot(function(snapshot) {
        if (uid !== owner || generation !== epoch) return;
        latest[key] = snapshot.exists && Array.isArray(snapshot.data().items) ? snapshot.data().items : [];
        if (!pending[key]) { writeLocal(key, latest[key]); notify(); }
      }, function(error) {
        console.warn('Shopping list sync unavailable', error);
        if (window.showToast) window.showToast('Could not load your saved shopping lists.', true);
      }));
    });
    notify();
  }
  firebase.auth().onAuthStateChanged(syncAll);
  window.SmileHubFirebaseSync = { saveList: saveList, clearList: clearList, syncAll: syncAll, trackRemovals: trackRemovals, isApplyingRemote: function() { return applyingRemote; } };
})();
