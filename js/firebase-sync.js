
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

  // Tombstones remember locally removed items so a stale cloud copy
  // can never bring them back (even if a sync write failed or the
  // user signs out and back in). Re-adding an item clears its tombstone.
  function tombstoneKey(key, uid) {
    return 'smilehub_tombstones:' + uid + ':' + key;
  }

  function getTombstones(key, uid) {
    try {
      var raw = JSON.parse(localStorage.getItem(tombstoneKey(key, uid)) || '[]');
      return Array.isArray(raw) ? raw.map(String) : [];
    } catch (_) { return []; }
  }

  function setTombstones(key, uid, ids) {
    try { localStorage.setItem(tombstoneKey(key, uid), JSON.stringify(ids.slice(-200))); } catch (_) {}
  }

  function trackRemovals(key, previous, next) {
    var user = firebase.auth().currentUser;
    if (!user || !LISTS[key]) return;
    var nextIds = {};
    (Array.isArray(next) ? next : []).forEach(function (item) { nextIds[String(item && item.id)] = true; });
    var tombs = getTombstones(key, user.uid);
    var changed = false;
    (Array.isArray(previous) ? previous : []).forEach(function (item) {
      var id = String(item && item.id);
      if (!(id in nextIds) && tombs.indexOf(id) === -1) { tombs.push(id); changed = true; }
    });
    var kept = tombs.filter(function (id) { return !nextIds[id]; });
    if (kept.length !== tombs.length) { tombs = kept; changed = true; }
    if (changed) setTombstones(key, user.uid, tombs);
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
      var tombs = getTombstones(key, uid);
      function withoutTombstones(items) {
        return (items || []).filter(function (item) {
          return tombs.indexOf(String(item && item.id)) === -1;
        });
      }
      if (remote) remote = withoutTombstones(remote);
      // An explicit clear (for example, after checkout) is authoritative.
      // This prevents stale Firestore items from coming back on another page.
      var chosen;
      if (isExplicitlyCleared(key, uid)) {
        chosen = [];
      } else {
        // On first sign-in, use remote only when the browser has no current list.
        // Never merge removed items back into a non-empty local list.
        chosen = (remote && local.length === 0) ? remote : local;
        chosen = withoutTombstones(chosen);
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
    trackRemovals: trackRemovals,
    isApplyingRemote: function () { return applyingRemote; }
  };
})();
