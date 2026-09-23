/* SmileHub customer notifications — local-smart engine (Phase 1).
   - Bell + badge + dropdown injected into .header-actions on storefront pages.
   - Order-status diffs on orders load; back-in-stock hits on product renders.
   - Preferences (Orders/Stock/Deals) actually enforced. No fake seeds.
   Skips admin pages (body.admin-body). Depends on js/common.js showToast. */
(function() {
  if (document.body && document.body.classList.contains('admin-body')) return;

  var LIST_KEY = 'smilehub_notifications';
  var SEEN_KEY = 'smilehub_notif_seen_orders';
  var RESTOCK_KEY = 'smilehub_restock';
  var MAX_ITEMS = 100;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  function readList() {
    try {
      var raw = JSON.parse(localStorage.getItem(LIST_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) { return []; }
  }

  function writeList(items) {
    try { localStorage.setItem(LIST_KEY, JSON.stringify(items.slice(0, MAX_ITEMS))); } catch (e) {}
    syncBadge();
    try { document.dispatchEvent(new CustomEvent('customer-notify-updated')); } catch (e) {}
  }

  function prefOn(kind) {
    var map = { order: 'pref_notifyOrders', stock: 'pref_notifyStock', deal: 'pref_notifyDeals' };
    var key = map[kind] || null;
    if (!key) return true;
    try { return localStorage.getItem(key) !== 'false'; } catch (e) { return true; }
  }

  function add(kind, title, message, opts) {
    opts = opts || {};
    if (!prefOn(kind)) return null;
    var items = readList();
    var note = {
      id: Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36),
      kind: kind,
      title: String(title || '').slice(0, 120),
      message: String(message || '').slice(0, 500),
      date: new Date().toISOString(),
      read: false
    };
    items.unshift(note);
    writeList(items);
    if (!opts.silent && typeof window.showToast === 'function') {
      try { window.showToast(note.title + ' — ' + note.message); } catch (e) {}
    }
    return note;
  }

  function markRead(id) {
    var items = readList();
    var changed = false;
    items.forEach(function(n) { if (String(n.id) === String(id) && !n.read) { n.read = true; changed = true; } });
    if (changed) writeList(items);
  }

  function markAllRead() {
    var items = readList();
    items.forEach(function(n) { n.read = true; });
    writeList(items);
  }

  function unreadCount() {
    return readList().filter(function(n) { return !n.read; }).length;
  }

  var STATUS_LABELS = {
    Pending: 'pending', Processing: 'being prepared', Shipped: 'on its way',
    Delivered: 'delivered', Cancelled: 'cancelled', Returned: 'returned',
    Refunded: 'refunded'
  };

  function readSeen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}') || {}; } catch (e) { return {}; }
  }

  function checkOrderStatuses(orders) {
    var seen = readSeen();
    var firstRun = Object.keys(seen).length === 0;
    var next = {};
    (orders || []).forEach(function(o) {
      var num = o.number || o.orderNumber;
      if (!num) return;
      var status = o.status || 'Pending';
      next[num] = status;
      if (firstRun || !seen[num]) return; // seed silently, never backfill history
      if (seen[num] !== status) {
        var label = STATUS_LABELS[status] || status.toLowerCase();
        add('order', 'Order ' + num + ' ' + label,
          status === 'Delivered' ? 'Enjoy your products — leave a review to help others.'
          : status === 'Cancelled' ? 'This order was cancelled. Contact support with questions.'
          : 'Status changed from ' + (seen[num] || 'unknown') + ' to ' + status + '.');
      }
    });
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch (e) {}
  }

  function restockIds() {
    try {
      var raw = JSON.parse(localStorage.getItem(RESTOCK_KEY) || '[]');
      return (Array.isArray(raw) ? raw : []).map(function(e) {
        return (typeof e === 'number') ? e : Number(e.id);
      }).filter(function(n) { return Number.isFinite(n); });
    } catch (e) { return []; }
  }

  function checkRestock(products) {
    var ids = restockIds();
    if (!ids.length) return;
    var hits = [];
    (products || []).forEach(function(p) {
      if (ids.indexOf(Number(p.id)) !== -1 && Number(p.stock) > 0) hits.push(p);
    });
    if (!hits.length) return;
    var remaining = ids.filter(function(watchedId) {
      return !hits.some(function(p) { return Number(p.id) === watchedId; });
    });
    try { localStorage.setItem(RESTOCK_KEY, JSON.stringify(remaining)); } catch (e) {}
    hits.forEach(function(p) {
      add('stock', 'Back in stock: ' + (p.name || ('Product #' + p.id)),
        'Only ' + p.stock + ' available — order soon.');
    });
  }

  function syncBadge() {
    var badge = document.getElementById('customerBellCount');
    if (!badge) return;
    var n = unreadCount();
    badge.textContent = n > 99 ? '99+' : String(n);
    badge.style.display = n > 0 ? 'inline-grid' : 'none';
  }

  function renderDropdownItems() {
    var items = readList().slice(0, 7);
    if (!items.length) {
      return '<div style="padding:26px 16px;text-align:center;color:var(--muted);font-size:0.9rem;">No notifications yet.<br><span style="font-size:0.82rem;">Order updates and restock alerts will appear here.</span></div>';
    }
    return items.map(function(n) {
      var when = '';
      try { when = new Date(n.date).toLocaleString(); } catch (e) {}
      return '<a class="cust-notif-item' + (n.read ? '' : ' unread') + '" href="notifications.html" data-notif-id="' + esc(n.id) + '">' +
        '<span style="min-width:0;flex:1;"><span style="display:block;font-size:0.88rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(n.title) + '</span>' +
        '<span style="display:block;font-size:0.82rem;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(n.message) + '</span>' +
        '<span class="muted" style="font-size:0.75rem;">' + esc(when) + '</span></span></a>';
    }).join('');
  }

  function injectBell() {
    if (document.getElementById('customerBell')) return;
    var actions = document.querySelector('.header-actions');
    if (!actions) return;
    // Bell sits left of login (icon + badge only); login stays rightmost before Menu.
    // The login link href is rewritten on sign-in (login → profile/admin),
    // so anchor on any of its variants, falling back to menu-button/append.
    var anchor = actions.querySelector('a[href="login.html"], a[href="profile.html"], a[href="admin.html"]')
      || actions.querySelector('.menu-button')
      || null;
    var bell = document.createElement('div');
    bell.className = 'cust-bell-wrap';
    bell.innerHTML =
      '<a class="icon-link" id="customerBell" href="notifications.html" aria-label="Notifications" aria-expanded="false">' +
      '<svg width="18" height="18" viewBox="0 0 256 256" fill="none" aria-hidden="true"><path d="M128 32a72 72 0 0 0-72 72c0 84-36 96-36 96h216s-36-12-36-96a72 72 0 0 0-72-72Z" stroke="currentColor" stroke-width="20" stroke-linejoin="round"/><path d="M104 224a24 24 0 0 0 48 0" stroke="currentColor" stroke-width="20" stroke-linecap="round"/></svg>' +
      '<span class="notif-count" id="customerBellCount" style="display:none;">0</span>' +
      '</a>' +
      '<div class="cust-notif-dropdown hidden" id="customerNotifDropdown" role="dialog" aria-label="Recent notifications" hidden>' +
      '<div class="cust-notif-head"><strong>Notifications</strong><a class="dash-link" href="notifications.html">View all</a></div>' +
      '<div class="cust-notif-list" id="customerNotifList"></div>' +
      '</div>';
    actions.insertBefore(bell, anchor);
    var link = bell.querySelector('#customerBell');
    var panel = bell.querySelector('#customerNotifDropdown');
    var list = bell.querySelector('#customerNotifList');
    function close() {
      panel.classList.add('hidden');
      panel.hidden = true;
      link.setAttribute('aria-expanded', 'false');
    }
    link.addEventListener('click', function(e) {
      if (window.innerWidth > 900) {
        e.preventDefault();
        var open = panel.classList.contains('hidden');
        if (open) {
          list.innerHTML = renderDropdownItems();
          panel.classList.remove('hidden');
          panel.hidden = false;
          link.setAttribute('aria-expanded', 'true');
        } else {
          close();
        }
      }
    });
    list.addEventListener('click', function(e) {
      var item = e.target.closest ? e.target.closest('[data-notif-id]') : null;
      if (item) markRead(item.dataset.notifId);
    });
    document.addEventListener('click', function(e) {
      if (!panel.classList.contains('hidden') && !bell.contains(e.target)) close();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && !panel.classList.contains('hidden')) {
        close();
        link.focus();
      }
    });
    document.addEventListener('customer-notify-updated', function() {
      if (!panel.classList.contains('hidden')) list.innerHTML = renderDropdownItems();
    });
    syncBadge();
  }

  document.addEventListener('DOMContentLoaded', injectBell);

  window.CustomerNotify = {
    getAll: readList,
    add: add,
    markRead: markRead,
    markAllRead: markAllRead,
    unreadCount: unreadCount,
    checkOrderStatuses: checkOrderStatuses,
    checkRestock: checkRestock,
    syncBadge: syncBadge,
    prefOn: prefOn
  };
})();
