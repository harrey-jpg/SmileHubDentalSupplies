
(function () {
  'use strict';

  var LISTS = {
    smilehub_simple_cart: 'carts',
    smilehub_simple_wishlist: 'wishlists'
  };
  var applyingRemote = false;
  var lastUid = null;
  var initialized = {};

  function clearedMarkerKey(key, uid) {
    return 'smilehub_sync_cleared:' + uid + ':' + key;
  }

  function isExplicitlyCleared(key, uid) {
    try { return localStorage.getItem(clearedMarkerKey(key, uid)) === '1'; }
    catch (_) { return false; }
  }

  function markExplicitlyCleared(key, uid, cleared) {
    try {
      var marker = clearedMarkerKey(key, uid);
      if (cleared) localStorage.setItem(marker, '1');
      else localStorage.removeItem(marker);
    } catch (_) {}
  }

  function localList(key) {
    try {
      var value = window.SmileHubStorage ? window.SmileHubStorage.get(key, []) : [];
      return Array.isArray(value) ? value : [];
    } catch (_) { return []; }
  }

  function docFor(key, uid) {
    return firebase.firestore().collection(LISTS[key]).doc(uid);
  }

  function writeLocal(key, items) {
    applyingRemote = true;
    try { if (window.SmileHubStorage) window.SmileHubStorage.set(key, Array.isArray(items) ? items : []); }
    finally { applyingRemote = false; }
  }

  function saveList(key, list) {
    if (applyingRemote || !LISTS[key]) return Promise.resolve();
    var user = firebase.auth().currentUser;
    if (!user) return Promise.resolve();
    var items = Array.isArray(list) ? list : [];
    if (items.length > 0) markExplicitlyCleared(key, user.uid, false);
    return docFor(key, user.uid).set({
      userId: user.uid,
      items: items,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(function (error) {
      console.warn('SmileHub sync could not save ' + key + ':', error);
    });
  }

  function loadList(key, uid) {
    return docFor(key, uid).get().then(function (doc) {
      var remote = doc.exists && Array.isArray(doc.data().items) ? doc.data().items : null;
      var local = localList(key);
      // An explicit clear (for example, after checkout) is authoritative.
      // This prevents stale Firestore items from coming back on another page.
      var chosen;
      if (isExplicitlyCleared(key, uid)) {
        chosen = [];
      } else {
        // On first sign-in, use remote only when the browser has no current list.
        // Never merge removed items back into a non-empty local list.
        chosen = (remote && local.length === 0) ? remote : local;
      }
      writeLocal(key, chosen);
      initialized[key] = true;
      return saveList(key, chosen).then(function () { return { key: key, items: chosen }; });
    }).catch(function (error) {
      console.warn('SmileHub sync could not load ' + key + ':', error);
      return { key: key, items: localList(key) };
    });
  }

  function clearList(key) {
    if (!LISTS[key]) return Promise.resolve();
    var user = firebase.auth().currentUser;
    writeLocal(key, []);
    if (!user) return Promise.resolve();
    markExplicitlyCleared(key, user.uid, true);
    return docFor(key, user.uid).set({
      userId: user.uid,
      items: [],
      clearedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }).catch(function (error) {
      console.warn('SmileHub sync could not clear ' + key + ':', error);
      throw error;
    });
  }

  function syncAll(user) {
    if (!user || lastUid === user.uid) return;
    lastUid = user.uid;
    Promise.all(Object.keys(LISTS).map(function (key) { return loadList(key, user.uid); }))
      .then(function (results) {
        if (window.updateCartCount) window.updateCartCount();
        if (window.updateWishlistCount) window.updateWishlistCount();
        document.dispatchEvent(new CustomEvent('smilehub:data-synced', {
          detail: { uid: user.uid, lists: results }
        }));
      });
  }

  firebase.auth().onAuthStateChanged(function (user) {
    if (user) syncAll(user);
    else { lastUid = null; initialized = {}; }
  });

  window.SmileHubFirebaseSync = {
    saveList: saveList,
    clearList: clearList,
    syncAll: syncAll,
    isApplyingRemote: function () { return applyingRemote; }
  };
})();
