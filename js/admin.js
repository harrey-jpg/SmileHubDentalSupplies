// admin.js - Full Functional Admin Dashboard

document.addEventListener('DOMContentLoaded', function() {
  // --- DATA STORE ---
  let products = [];
  var accounts = [];
  
  // Category to image mapping
  const categoryImages = {
    'Oral Care': 'assets/products/oral-care.svg',
    'Instruments': 'assets/products/instrument.svg',
    'PPE': 'assets/products/ppe.svg',
    'Restorative': 'assets/products/restorative.svg',
    'Disposables': 'assets/products/disposable.svg',
    'Impression': 'assets/products/impression.svg',
    'Orthodontics': 'assets/products/orthodontic.svg',
    'Rotary': 'assets/products/instrument.svg',
    'Equipment': 'assets/products/equipment.svg',
    'Cosmetic': 'assets/products/restorative.svg'
  };

  // Default products data stored in firestore-data.js

  // --- LOAD PRODUCTS ---
  var _loadingProducts = false;

  function loadProducts(callback) {
    if (!_loadingProducts) {
      _loadingProducts = true;
      SmileHubData.getProducts(function(data) {
        products = normalizeProducts(data);
        _loadingProducts = false;
        if (callback) callback(products);
      });
    }
    return products || [];
  }

  function saveProducts(data, callback) {
    products = data;
    SmileHubData.saveProducts(data, callback);
  }

  products = [];

  // --- DOM REFS ---
  const formBox = document.getElementById('productFormBox');
  const productModal = document.getElementById('productModal');
  const productsBody = document.getElementById('adminProductsBody');
  const adminSearch = document.getElementById('adminSearch');
  const productForm = document.getElementById('productFormBox');

  // --- TOAST ---
  function showToast(msg, isError, isSuccess) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = msg;
    if (isError) { toast.style.background = '#d64545'; toast.style.color = 'white'; }
    else if (isSuccess) { toast.style.background = '#1e9b61'; toast.style.color = 'white'; }
    else { toast.style.background = '#102c43'; toast.style.color = 'white'; }
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  // CSV: quote + guard formula injection (=+-@) + flatten newlines
  function csvCell(v) {
    var s = String(v == null ? '' : v).replace(/[\r\n]+/g, ' ');
    if (/^[=+\-@\t]/.test(s)) s = "'" + s;
    return '"' + s.replace(/"/g, '""') + '"';
  }

  function deepClone(o) {
    try {
      if (typeof structuredClone === 'function') return structuredClone(o);
    } catch (e) {}
    return JSON.parse(JSON.stringify(o));
  }

  function minOf(p) {
    var m = Number(p && p.minStock);
    return (Number.isInteger(m) && m >= 0) ? m : 10;
  }

  function stockStatus(stock, min) {
    return stock === 0 ? 'Out of Stock' : stock <= min ? 'Low Stock' : 'Active';
  }

  function normalizeProducts(list) {
    (list || []).forEach(function(p) {
      if (!Number.isInteger(Number(p.minStock)) || Number(p.minStock) < 0) p.minStock = 10;
      else p.minStock = Number(p.minStock);
      p.status = p.stock === 0 ? 'Out of Stock' : p.stock <= p.minStock ? 'Low Stock' : 'Active';
    });
    return list;
  }

  // --- IMAGE PREVIEW ---
  function setupImagePreview() {
    const catSelect = document.getElementById('productCategory');
    const imgSelect = document.getElementById('productImageSelect');
    const customInput = document.getElementById('customImageInput');
    const preview = document.getElementById('previewImg');

    function update(src) { if (preview) preview.src = src; }

    if (preview && !preview.dataset.fallbackBound) {
      preview.dataset.fallbackBound = '1';
      preview.addEventListener('error', function() {
        var fallback = (catSelect && categoryImages[catSelect.value]) || 'assets/products/default.svg';
        if (preview.src !== fallback && !preview.src.endsWith(fallback)) preview.src = fallback;
      });
    }

    if (catSelect) {
      catSelect.addEventListener('change', function() {
        const path = categoryImages[this.value] || 'assets/products/default.svg';
        if (imgSelect) {
          for (let i = 0; i < imgSelect.options.length; i++) {
            if (imgSelect.options[i].value === path) {
              imgSelect.selectedIndex = i;
              break;
            }
          }
        }
        update(path);
        if (customInput) customInput.value = '';
      });
    }

    if (imgSelect) {
      imgSelect.addEventListener('change', function() {
        update(this.value);
        if (customInput) customInput.value = '';
      });
    }

    if (customInput) {
      customInput.addEventListener('input', function() {
        var v = this.value.trim();
        if (!v) return;
        if (!/^(assets\/|https?:\/\/|data:image\/)/i.test(v) || v.length > 500 || /[\s<>"']/.test(v)) {
          showToast('Image must be an assets/ path or https:// URL.', true);
          return;
        }
        update(v);
        if (imgSelect) imgSelect.value = '';
      });
    }
  }

  // --- NAVIGATION FUNCTION ---
  function normalizeNavTarget(t){ return t === '#inventory' ? '#products' : t; }
  function focusSectionHeading(sectionEl) {
    if (!sectionEl) return;
    if (!sectionEl.hasAttribute('tabindex')) sectionEl.setAttribute('tabindex', '-1');
    try { sectionEl.focus({ preventScroll: true }); } catch (e) { try { sectionEl.focus(); } catch (e2) {} }
  }
  function markActiveNav(sectionId) {
    sectionId = normalizeNavTarget(sectionId);
    document.querySelectorAll('.admin-menu a').forEach(function(link) {
      var isActive = link.getAttribute('href') === sectionId;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  var lastFocusedElement = null;
  function openAdminModal(modal) {
    if (!modal) return;
    try { lastFocusedElement = document.activeElement; } catch (e) { lastFocusedElement = null; }
    try { window.__lastAdminFocus = lastFocusedElement; } catch (e) {}
    modal.style.display = 'flex';
    var focusTarget = modal.querySelector('input, select, textarea, button');
    if (focusTarget) {
      try { focusTarget.focus({ preventScroll: true }); } catch (e) { try { focusTarget.focus(); } catch (e2) {} }
    }
  }
  function closeAdminModal(modal) {
    if (!modal) return;
    modal.style.display = 'none';
    if (lastFocusedElement && document.contains(lastFocusedElement)) {
      try { lastFocusedElement.focus({ preventScroll: true }); } catch (e) { try { lastFocusedElement.focus(); } catch (e2) {} }
    }
    lastFocusedElement = null;
  }
  // Focus trap for modals and notification dropdown
  document.addEventListener('keydown', function(e){
    if(e.key !== 'Tab') return;
    var openModal = Array.from(document.querySelectorAll('.modal-backdrop')).find(function(m){ return m.style.display === 'flex' || (m.style.display !== 'none' && !m.classList.contains('hidden') && m.offsetParent !== null); });
    var dropdown = document.getElementById('notifDropdown');
    var trapEl = openModal || (dropdown && !dropdown.classList.contains('hidden') && dropdown.style.display !== 'none' ? dropdown : null);
    if(!trapEl) return;
    var focusable = Array.from(trapEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter(function(el){ return !el.disabled && el.offsetParent !== null; });
    if(!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if(e.shiftKey){
      if(document.activeElement === first){ e.preventDefault(); last.focus(); }
    } else {
      if(document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });
  // Authored confirm (replaces native confirm for destructives) — impact + optional type-to-confirm
  var confirmResolver = null;
  function showAuthoredConfirm(opts){
    opts = opts || {};
    return new Promise(function(resolve){
      var modal = document.getElementById('confirmModal');
      if(!modal){ resolve(window.confirm((opts.message||'') + '\n' + (opts.impact||''))); return; }
      var eyebrow = document.getElementById('confirmEyebrow');
      var title = document.getElementById('confirmTitle');
      var msg = document.getElementById('confirmMessage');
      var impact = document.getElementById('confirmImpact');
      var wrap = document.getElementById('confirmInputWrap');
      var kwEl = document.getElementById('confirmKeyword');
      var input = document.getElementById('confirmInput');
      var okBtn = modal.querySelector('[data-confirm-ok]');
      var cancelBtn = modal.querySelector('[data-confirm-cancel]');
      var closeBtn = modal.querySelector('[data-confirm-close]');
      if(eyebrow) eyebrow.textContent = opts.eyebrow || 'Confirm action';
      if(title) title.textContent = opts.title || 'Are you sure?';
      if(msg) msg.textContent = opts.message || '';
      if(impact) impact.textContent = opts.impact || '';
      var keyword = opts.keyword || '';
      if(wrap && kwEl && input){
        if(keyword){
          wrap.classList.remove('hidden');
          kwEl.textContent = keyword;
          input.value = '';
          input.placeholder = keyword;
          if(okBtn) okBtn.disabled = true;
        } else {
          wrap.classList.add('hidden');
          if(okBtn) okBtn.disabled = false;
        }
      } else {
        if(okBtn) okBtn.disabled = false;
      }
      if(okBtn) okBtn.textContent = opts.confirmLabel || 'Confirm';
      if(cancelBtn) cancelBtn.textContent = opts.cancelLabel || 'Cancel';
      confirmResolver = resolve;
      openAdminModal(modal);
      setTimeout(function(){
        if(keyword && input) try{ input.focus(); }catch(e){}
        else if(okBtn) try{ okBtn.focus(); }catch(e){}
      }, 30);
      function cleanup(val){
        var m = document.getElementById('confirmModal');
        if(m) closeAdminModal(m);
        if(input) input.removeEventListener('input', onInput);
        if(okBtn) okBtn.removeEventListener('click', onOk);
        if(cancelBtn) cancelBtn.removeEventListener('click', onCancel);
        if(closeBtn) closeBtn.removeEventListener('click', onCancel);
        modal.removeEventListener('click', onBackdrop);
        document.removeEventListener('keydown', onKey);
        var r = confirmResolver; confirmResolver = null;
        if(r) r(val);
      }
      function onInput(){
        if(!keyword || !okBtn || !input) return;
        okBtn.disabled = input.value.trim() !== keyword;
      }
      function onOk(){ cleanup(true); }
      function onCancel(){ cleanup(false); }
      function onBackdrop(e){ if(e.target === modal) cleanup(false); }
      function onKey(e){ if(e.key === 'Escape') cleanup(false); }
      if(input) input.addEventListener('input', onInput);
      if(okBtn) okBtn.addEventListener('click', onOk);
      if(cancelBtn) cancelBtn.addEventListener('click', onCancel);
      if(closeBtn) closeBtn.addEventListener('click', onCancel);
      modal.addEventListener('click', onBackdrop);
      document.addEventListener('keydown', onKey);
    });
  }
  // Soft-delete undo toast (actionable, auto-dismiss)
  function showUndoToast(message, onUndo, ms){
    ms = ms || 7000;
    var old = document.querySelector('.toast.toast-undo');
    if(old) old.remove();
    var toast = document.createElement('div');
    toast.className = 'toast toast-undo';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    var span = document.createElement('span');
    span.textContent = message;
    span.style.flex = '1';
    var btn = document.createElement('button');
    btn.className = 'btn btn-light';
    btn.type = 'button';
    btn.textContent = 'Undo';
    btn.style.padding = '6px 12px';
    btn.style.fontSize = '0.85rem';
    btn.addEventListener('click', function(){
      try { onUndo(); } catch(e){}
      toast.remove();
    });
    toast.appendChild(span);
    toast.appendChild(btn);
    document.body.appendChild(toast);
    var timer = setTimeout(function(){ toast.remove(); }, ms);
    toast.addEventListener('mouseenter', function(){ clearTimeout(timer); });
    toast.addEventListener('mouseleave', function(){ timer = setTimeout(function(){ toast.remove(); }, 2000); });
  }
  function navigateTo(sectionId) {
    sectionId = normalizeNavTarget(sectionId);
    if (roleResolved && currentRole && !isSectionAllowed(sectionId, currentRole)) {
      showToast('You do not have access to that section.', true);
      sectionId = '#dashboard';
    }
    document.querySelectorAll('.admin-section, #dashboard').forEach(function(s) {
      s.style.display = 'none';
    });

    const target = document.querySelector(sectionId);
    if (target) {
      target.style.display = 'block';
      target.querySelectorAll('.admin-section').forEach(function(s) {
        s.style.display = '';
      });
      focusSectionHeading(target);
    }

    markActiveNav(sectionId);

    if (sectionId === '#products') {
      renderProducts();
    }
    if (sectionId === '#orders') {
      const filter = document.getElementById('orderStatusFilter')?.value || 'all';
      renderOrders(filter);
    }
    if (sectionId === '#dashboard') {
      updateDashboard();
    }
    if (sectionId === '#customers') {
      renderAccounts();
    }
    if (sectionId === '#reports') {
      var period = (document.getElementById('reportPeriod') || {}).value || 'all';
      renderReports(period);
    }
    if (sectionId === '#notifications') {
      renderNotificationTemplates();
    }
    if (sectionId === '#audit') {
      if (getAuditLogs().length === 0) {
        fetchAuditLogs(renderAuditLogs);
      } else {
        renderAuditLogs();
      }
    }
    if (sectionId === '#messages') {
      fetchMessages();
    }
  }

  // --- RENDER PRODUCTS (merged with inventory — single source) ---
  var selectedProductIds = new Set();
  function getSelectedProducts() {
    return products.filter(function(p) { return selectedProductIds.has(p.id); });
  }
  function syncBulkBar() {
    var bar = document.getElementById('productsBulkBar');
    var countEl = document.getElementById('productsBulkCount');
    var selAll = document.getElementById('selectAllProducts');
    if (countEl) countEl.textContent = selectedProductIds.size + ' selected';
    if (bar) {
      var show = selectedProductIds.size !== 0;
      bar.classList.toggle('hidden', !show);
      bar.classList.toggle('floating', show);
      bar.style.display = show ? 'flex' : 'none';
    }
    if (selAll) {
      var visibleIds = Array.prototype.slice.call(document.querySelectorAll('.product-select')).map(function(c){ return parseInt(c.dataset.id); });
      var allChecked = visibleIds.length > 0 && visibleIds.every(function(id){ return selectedProductIds.has(id); });
      selAll.checked = allChecked;
      selAll.indeterminate = !allChecked && visibleIds.some(function(id){ return selectedProductIds.has(id); });
    }
    try { refreshBulkPreview(); } catch(e) {}
  }
  function renderProducts(filter) {
    if (!productsBody) return;

    const searchTerm = (filter || adminSearch?.value || '').toLowerCase();
    const catSelect = document.getElementById('adminCategoryFilter');
    const selectedCat = catSelect ? catSelect.value : 'all';
    const stockSelect = document.getElementById('adminStockFilter');
    const selectedStock = stockSelect ? stockSelect.value : 'all';
    const filtered = products.filter(function(p) {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
             p.sku.toLowerCase().includes(searchTerm) ||
             p.category.toLowerCase().includes(searchTerm);
      if (!matchesSearch || (selectedCat !== 'all' && p.category !== selectedCat)) return false;
      if (selectedStock === 'in') return p.stock > minOf(p);
      if (selectedStock === 'low') return p.stock > 0 && p.stock <= minOf(p);
      if (selectedStock === 'out') return p.stock === 0;
      return true;
    });

    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = 'Showing ' + filtered.length + ' of ' + products.length + ' products';

    if (filtered.length === 0) {
      productsBody.innerHTML = products.length === 0
        ? `<tr><td colspan="10" class="text-center muted" style="padding:40px;">No products yet — add your first product to start selling.</td></tr>`
        : `<tr><td colspan="10" class="text-center muted" style="padding:40px;">No products match — try a different search or filter.</td></tr>`;
      updateKPIs();
      syncBulkBar();
      return;
    }

    var canManageProducts = !roleResolved || !currentRole || isProductAdminRole(currentRole);
    productsBody.innerHTML = filtered.map(function(p) {
      const statusClass = p.status === 'Active' ? 'delivered' : p.status === 'Low Stock' ? 'low' : 'out-of-stock';
      const checked = selectedProductIds.has(p.id) ? ' checked' : '';
      return `
        <tr data-product="${escapeHtml(p.name)}">
          <td><input type="checkbox" class="product-select" data-id="${p.id}" aria-label="Select ${escapeHtml(p.name)}"${checked}></td>
          <td><img class="prod-thumb" src="${escapeHtml(p.image || 'assets/products/default.svg')}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.onerror=null;this.src='assets/products/default.svg';"></td>
          <td><span class="sku-muted">${escapeHtml(p.sku)}</span></td>
          <td><strong>${escapeHtml(p.name)}</strong></td>
          <td><span class="chip-cat">${escapeHtml(p.category)}</span></td>
          <td class="price-strong">₱${Number(p.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
          <td><input type="number" class="stock-input" data-id="${p.id}" value="${p.stock}" min="0" step="1" aria-label="Stock for ${escapeHtml(p.name)}" style="width:72px;padding:6px;border:1px solid var(--border);border-radius:6px;font-variant-numeric:tabular-nums;"></td>
          <td><input type="number" class="min-input" data-id="${p.id}" value="${minOf(p)}" min="0" step="1" aria-label="Reorder point for ${escapeHtml(p.name)}" style="width:62px;padding:6px;border:1px solid var(--border);border-radius:6px;font-variant-numeric:tabular-nums;"></td>
          <td><span class="status ${statusClass}">${escapeHtml(p.status)}</span></td>
          <td>
            <div class="row-actions" style="flex-wrap:nowrap;">
              <button class="icon-btn row-btn update-stock" data-id="${p.id}" title="Update stock for ${escapeHtml(p.name)}" aria-label="Update stock for ${escapeHtml(p.name)}" style="padding:4px 8px;font-size:0.75rem;">Update</button>
              ${canManageProducts ? `<button class="icon-btn row-btn edit-product" data-id="${p.id}" title="Edit ${escapeHtml(p.name)}" aria-label="Edit ${escapeHtml(p.name)}"><svg aria-hidden="true" class="dash-icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" viewBox="0 0 24 24"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg></button>
              <button class="icon-btn row-btn row-btn-danger delete-product" data-id="${p.id}" title="Delete ${escapeHtml(p.name)}" aria-label="Delete ${escapeHtml(p.name)}"><svg aria-hidden="true" class="dash-icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.product-select').forEach(function(cb){
      var row = cb.closest('tr');
      if (row) row.classList.toggle('row-selected', cb.checked);
      cb.addEventListener('change', function(){
        var id = parseInt(this.dataset.id);
        if (this.checked) selectedProductIds.add(id); else selectedProductIds.delete(id);
        var tr = this.closest('tr');
        if (tr) tr.classList.toggle('row-selected', this.checked);
        syncBulkBar();
      });
    });

    document.querySelectorAll('.edit-product').forEach(function(btn) {
      btn.addEventListener('click', function() { 
        editProduct(parseInt(this.dataset.id)); 
      });
    });
    document.querySelectorAll('.delete-product').forEach(function(btn) {
      btn.addEventListener('click', function() { 
        deleteProduct(parseInt(this.dataset.id)); 
      });
    });

    // Per-row stock/min update (same as inventory inline edit)
    document.querySelectorAll('#adminProductsBody .update-stock').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const id = parseInt(this.dataset.id);
        const input = document.querySelector('#adminProductsBody .stock-input[data-id="' + id + '"]');
        const minInput = document.querySelector('#adminProductsBody .min-input[data-id="' + id + '"]');
        if (input) {
          const val = parseInt(input.value);
          const minVal = minInput ? parseInt(minInput.value) : NaN;
          if (!isNaN(val) && val >= 0 && (!minInput || (!isNaN(minVal) && minVal >= 0))) {
            const product = products.find(function(p) { return p.id === id; });
            if (product) {
              const old = product.stock;
              const oldMin = minOf(product);
              product.stock = val;
              if (minInput) product.minStock = minVal;
              product.status = stockStatus(val, minOf(product));
              saveProducts(products);
              try { invalidateBulkUndo(); } catch (e) {}
              renderProducts();
              updateDashboard();
              addAuditLog('Updated stock for "' + product.name + '" (' + old + ' → ' + val + ', min ' + oldMin + ' → ' + minOf(product) + ')');
              showToast('Stock updated: ' + product.name + ' (' + old + ' → ' + val + ')', false, true);
            }
          } else {
            showToast('Enter valid stock and threshold numbers', true);
          }
        }
      });
    });
    document.querySelectorAll('#adminProductsBody .stock-input, #adminProductsBody .min-input').forEach(function(input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          const id = parseInt(this.dataset.id);
          const stockEl = document.querySelector('#adminProductsBody .stock-input[data-id="' + id + '"]');
          const minEl = document.querySelector('#adminProductsBody .min-input[data-id="' + id + '"]');
          const val = stockEl ? parseInt(stockEl.value) : NaN;
          const minVal = minEl ? parseInt(minEl.value) : NaN;
          if (!isNaN(val) && val >= 0 && (!minEl || (!isNaN(minVal) && minVal >= 0))) {
            const product = products.find(function(p) { return p.id === id; });
            if (product) {
              const old = product.stock;
              product.stock = val;
              if (minEl) product.minStock = minVal;
              product.status = stockStatus(val, minOf(product));
              saveProducts(products);
              try { invalidateBulkUndo(); } catch (e) {}
              renderProducts();
              updateDashboard();
              addAuditLog('Updated stock for "' + product.name + '" (' + old + ' → ' + val + ')');
              showToast('Stock updated: ' + product.name + ' (' + old + ' → ' + val + ')', false, true);
            }
          }
        }
      });
    });

    syncBulkBar();
    updateInventoryStats();
    updateKPIs();
  }

  // --- CRUD OPERATIONS ---
  function addProduct(data) {
    const newId = products.length > 0 ? Math.max(...products.map(function(p) { return p.id; })) + 1 : 1;
    const image = data.image || categoryImages[data.category] || 'assets/products/default.svg';
    const stock = typeof data.stock === 'number' ? data.stock : 0;
    const minStock = (typeof data.minStock === 'number' && data.minStock >= 0) ? data.minStock : 10;
    const newProduct = {
      id: newId,
      sku: data.sku || 'SH-' + String(newId).padStart(3, '0'),
      name: data.name,
      brand: data.brand || '',
      category: data.category,
      price: parseFloat(data.price),
      stock: stock,
      minStock: minStock,
      status: stockStatus(stock, minStock),
      image: image,
      description: data.description || '',
      specs: data.specs ? data.specs.split(',').map(function(s) { return s.trim(); }) : []
    };
    products.push(newProduct);
    saveProducts(products);
    try { invalidateBulkUndo(); } catch (e) {}
    renderProducts();
    updateDashboard();
    addAuditLog('Added product "' + newProduct.name + '" (' + newProduct.sku + ') with ' + stock + ' units');
    showToast('"' + newProduct.name + '" added with ' + stock + ' units', false, true);
    resetForm();
  }

  function editProduct(id) {
    if (roleResolved && currentRole && !isProductAdminRole(currentRole)) {
      showToast('Only admins can edit product details. You can still update stock inline.', true);
      return;
    }
    const product = products.find(function(p) { return p.id === id; });
    if (!product) { showToast('Product not found', true); return; }

    const form = document.getElementById('adminProductForm');
    if (form) {
      form.querySelector('[name="productId"]').value = product.id;
      form.querySelector('[name="name"]').value = product.name;
      form.querySelector('[name="brand"]').value = product.brand || '';
      form.querySelector('[name="category"]').value = product.category;
      form.querySelector('[name="price"]').value = product.price;
      form.querySelector('[name="stock"]').value = product.stock;
      form.querySelector('[name="minStock"]').value = minOf(product);
      form.querySelector('[name="sku"]').value = product.sku || '';
      form.querySelector('[name="description"]').value = product.description || '';
      form.querySelector('[name="specs"]').value = product.specs ? product.specs.join(', ') : '';
      
      const imgSelect = document.getElementById('productImageSelect');
      const customInput = document.getElementById('customImageInput');
      const preview = document.getElementById('previewImg');
      
      if (imgSelect) {
        let found = false;
        for (let i = 0; i < imgSelect.options.length; i++) {
          if (imgSelect.options[i].value === product.image) {
            imgSelect.selectedIndex = i;
            found = true;
            break;
          }
        }
        if (!found && product.image) {
          imgSelect.value = '';
          if (customInput) customInput.value = product.image;
          if (preview) preview.src = product.image;
        } else {
          if (customInput) customInput.value = '';
          if (preview) preview.src = product.image;
        }
      }
      
      if (productModal) openAdminModal(productModal);
      var title = document.getElementById('productModalTitle');
      if (title) title.textContent = 'Edit Product';
      var eyebrow = document.getElementById('productModalEyebrow');
      if (eyebrow) eyebrow.textContent = 'Edit product';
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = 'Update Product';
      showToast('Editing: ' + product.name, false, false);
    }
  }

  function updateProduct(id, data) {
    if (roleResolved && currentRole && !isProductAdminRole(currentRole)) {
      showToast('Only admins can save product details.', true);
      return;
    }
    const index = products.findIndex(function(p) { return p.id === id; });
    if (index === -1) { showToast('Product not found', true); return; }

    const image = data.image || categoryImages[data.category] || 'assets/products/default.svg';
    const oldName = products[index].name;
    
    products[index].name = data.name;
    products[index].brand = data.brand || '';
    products[index].category = data.category;
    products[index].price = parseFloat(data.price);
    products[index].image = image;
    products[index].sku = data.sku || products[index].sku;
    products[index].description = data.description || '';
    products[index].specs = data.specs ? data.specs.split(',').map(function(s) { return s.trim(); }) : [];
    if (typeof data.stock === 'number') {
      products[index].stock = data.stock;
    }
    if (typeof data.minStock === 'number' && data.minStock >= 0) {
      products[index].minStock = data.minStock;
    }
    products[index].status = stockStatus(products[index].stock, minOf(products[index]));
    
    saveProducts(products);
    try { invalidateBulkUndo(); } catch (e) {}
    renderProducts();
    updateDashboard();
    addAuditLog('Updated product "' + products[index].name + '"');
    showToast('Product "' + oldName + '" updated!', false, true);
    resetForm();
  }

  var lastProductDeleteSnapshot = null;
  var lastProductDeleteId = null;
  function deleteProduct(id) {
    if (roleResolved && currentRole && !isProductAdminRole(currentRole)) {
      showToast('Only admins can delete products.', true);
      return;
    }
    const product = products.find(function(p) { return p.id === id; });
    if (!product) return;
    var impact = 'Removes it from the store. Stock: ' + product.stock + ' units · ' + product.category + ' · This can be undone for 7 seconds.';
    showAuthoredConfirm({
      eyebrow: 'Delete product',
      title: 'Delete "' + product.name + '"?',
      message: 'Delete "' + product.name + '" (' + product.sku + ')?',
      impact: impact,
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel'
    }).then(function(ok){
      if (!ok) return;
      lastProductDeleteSnapshot = deepClone(products);
      lastProductDeleteId = id;
      var deleted = deepClone(product);
      products = products.filter(function(p) { return p.id !== id; });
      saveProducts(products);
      try { invalidateBulkUndo(); } catch (e) {}
      try { db.collection('products').doc(String(id)).delete().catch(function() {}); } catch(e){}
      renderProducts();
      updateDashboard();
      addAuditLog('Deleted product "' + deleted.name + '"');
      showUndoToast('Product "' + deleted.name + '" deleted', function(){
        if (!lastProductDeleteSnapshot) return;
        products = deepClone(lastProductDeleteSnapshot);
        saveProducts(products);
        try { db.collection('products').doc(String(lastProductDeleteId)).set(deleted).catch(function(){}); } catch(e){}
        renderProducts();
        updateDashboard();
        addAuditLog('Restored product "' + deleted.name + '" (undo delete)');
        showToast('Product restored', false, true);
        lastProductDeleteSnapshot = null;
        lastProductDeleteId = null;
      }, 7000);
    });
  }

  function resetForm() {
    // NOTE: the <form> is #productFormBox; #adminProductForm is the inner <div>.
    var form = document.getElementById('productFormBox') || document.getElementById('adminProductForm');
    if (form) {
      if (typeof form.reset === 'function') {
        try { form.reset(); } catch (e) {}
      } else {
        form.querySelectorAll('input, select, textarea').forEach(function(el) {
          if (el.type === 'checkbox' || el.type === 'radio') el.checked = false;
          else if (el.name !== 'productId') el.value = '';
        });
      }
      var pid = form.querySelector('[name="productId"]');
      if (pid) pid.value = '';
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = 'Save Product';
    }
    var title = document.getElementById('productModalTitle');
    if (title) title.textContent = 'Add Product';
    var eyebrow = document.getElementById('productModalEyebrow');
    if (eyebrow) eyebrow.textContent = 'New product';
    if (productModal) closeAdminModal(productModal);
  }

  // --- UPDATE DASHBOARD ---
  function updateDashboard() {
    updateKPIs();
    renderRecentOrders();
    renderInventoryAlerts();
    renderCharts();
  }

  function syncWelcome() {
    var nameEl = document.getElementById('adminUsername');
    var welcomeEl = document.getElementById('welcomeName');
    if (nameEl && welcomeEl) {
      var first = (nameEl.textContent || 'Admin').trim().split(' ')[0];
      welcomeEl.textContent = first || 'Admin';
    }
    var greet = document.getElementById('greetEyebrow');
    if (greet) {
      var h = new Date().getHours();
      greet.textContent = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    }
  }

  function updateKPIs() {
    const total = products.length;
    const low = products.filter(function(p) { return p.stock > 0 && p.stock <= minOf(p); }).length;
    const out = products.filter(function(p) { return p.stock === 0; }).length;
    const inventoryValue = products.reduce(function(sum, p) { return sum + (p.price * p.stock); }, 0);
    const totalStock = products.reduce(function(sum, p) { return sum + p.stock; }, 0);

    const orders = getOrders();
    const todayStr = new Date().toDateString();
    const todayValid = orders.filter(function(o) {
      var ts = orderTime(o);
      return ts && new Date(ts).toDateString() === todayStr && isActiveOrder(o.status);
    });
    // "Collected" means confirmed revenue — exclude Pending (uncollected).
    const todaySales = todayValid.filter(function(o) { return o.status !== 'Pending'; })
      .reduce(function(sum, o) { return sum + (Number(o.total) || 0); }, 0);

    const pending = orders.filter(function(o) { return o.status === 'Pending' || o.status === 'Processing' || o.status === 'Shipped'; });
    const pendingCountLabel = pending.length;
    const pendingValue = pending.reduce(function(sum, o) { return sum + (Number(o.total) || 0); }, 0);

    const nowTs = Date.now();
    const in30 = orders.filter(function(o) { return orderTime(o) >= nowTs - 30 * 86400000 && isActiveOrder(o.status) && o.status !== 'Pending'; });
    const collected = in30.reduce(function(sum, o) { return sum + (Number(o.total) || 0); }, 0);
    const prev30 = orders.filter(function(o) {
      var t = orderTime(o);
      return t >= nowTs - 60 * 86400000 && t < nowTs - 30 * 86400000 && isActiveOrder(o.status);
    });
    const prevRev = prev30.reduce(function(sum, o) { return sum + (Number(o.total) || 0); }, 0);
    const delivered30 = orders.filter(function(o) {
      return o.status === 'Delivered' && orderTime(o) >= nowTs - 30 * 86400000;
    }).length;

    setText('kpiTodayOrders', String(todayValid.length).padStart(2, '0'));
    setText('kpiTodaySales', '₱' + todaySales.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' collected');
    setText('kpiPendingNow', String(pendingCountLabel).padStart(2, '0'));
    setText('kpiPendingSub', pendingCountLabel + ' in the queue');
    setText('kpiTotalProducts', String(total).padStart(2, '0'));
    setText('kpiTotalRevenue', '₱' + inventoryValue.toLocaleString('en-PH', {maximumFractionDigits: 0}) + ' inventory value');
    setText('kpiLowStock', String(low).padStart(2, '0'));
    setText('kpiLowStockDetail', low + ' low • ' + out + ' out of stock');

    setText('mCollected', '₱' + collected.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
    setText('mCollectedSub', in30.length + ' payments taken');
    var badge = document.getElementById('mCollectedBadge');
    if (badge) {
      if (prevRev > 0) {
        var pct = Math.round(((collected - prevRev) / prevRev) * 100);
        badge.textContent = (pct >= 0 ? '+' : '−') + Math.abs(pct) + '%';
        badge.classList.remove('hidden', 'down');
        if (pct < 0) badge.classList.add('down');
      } else {
        badge.classList.add('hidden');
      }
    }
    setText('mDelivered', String(delivered30));
    setText('mPendingValue', '₱' + pendingValue.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2}));

    var bell = document.getElementById('dashBellCount');
    if (bell) {
      bell.textContent = pending.length > 99 ? '99+' : String(pending.length);
      bell.classList.toggle('hidden', pending.length === 0);
    }

    syncWelcome();
    var sub = document.getElementById('adminDateSubtitle');
    if (sub) {
      sub.textContent = (!orders.length && ordersLoadError)
        ? 'Couldn\'t load orders (' + ordersLoadError + ') — sign in over localhost or hosting as staff.'
        : 'Today at a glance, and how the last 30 days have gone.';
    }
    updateInventoryStats();
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function renderRecentOrders() {
    var body = document.getElementById('dashRecentOrders');
    if (!body) return;
    var orders = getOrders();
    if (!orders || orders.length === 0) {
      body.innerHTML = '<tr><td colspan="4" class="text-center muted">No orders yet</td></tr>';
      return;
    }
    var sorted = orders.slice().sort(function(a, b) { return orderTime(b) - orderTime(a); });
    var recent = sorted.slice(0, 5);

    body.innerHTML = recent.map(function(o) {
      var cls = orderStatusClass(o.status);
      var icon = orderStatusIcon(o.status);
      var rr = o.returnRequest && o.returnRequest.status === 'requested' ? ' <span class="status return-requested">↩ Return requested</span>' : '';
      return '<tr>' +
        '<td><strong>' + escapeHtml(o.number) + '</strong></td>' +
        '<td>' + escapeHtml(o.customer) + '</td>' +
        '<td>₱' + Number(o.total).toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</td>' +
        '<td><span class="status ' + cls + '">' + icon + ' ' + escapeHtml(o.status) + '</span>' + rr + '</td>' +
        '</tr>';
    }).join('');
  }

  function renderInventoryAlerts() {
    const container = document.getElementById('dashInventoryAlerts');
    if (!container) return;
    const alerts = products.filter(function(p) { return p.stock <= minOf(p); }).sort(function(a, b) { return a.stock - b.stock; });

    if (alerts.length === 0) {
      container.innerHTML = '<p class="muted dash-empty">All items well-stocked</p>';
      return;
    }

    container.innerHTML = alerts.slice(0, 6).map(function(p) {
      const label = p.stock === 0 ? 'Out of stock' : p.stock + ' left (min ' + minOf(p) + ')';
      const cls = p.stock === 0 ? 'low' : p.stock <= 5 ? 'low' : 'processing';
      return '<div class="inventory-alert-item" data-product="' + escapeHtml(p.name) + '" role="button" tabindex="0" title="Open in inventory">' +
        '<span class="status ' + cls + '">' + escapeHtml(label) + '</span><span>' + escapeHtml(p.name) + '</span>' +
        '</div>';
    }).join('');
  }

  // --- CHARTS ---
  let chartStockStatus = null;
  let chartSales = null;

  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.body).getPropertyValue(name);
      v = (v || '').trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }

  function orderTime(o) {
    if (o.sortTs) return o.sortTs;
    if (o.createdAt && typeof o.createdAt.toDate === 'function') {
      try { return o.createdAt.toDate().getTime(); } catch (e) {}
    }
    var t = o.date ? Date.parse(o.date) : NaN;
    return isNaN(t) ? 0 : t;
  }

  function orderStatusClass(status) {
    if (status === 'Delivered') return 'delivered';
    if (status === 'Returned') return 'returned';
    if (status === 'Refunded') return 'refunded';
    if (status === 'Shipped') return 'shipped';
    if (status === 'Cancelled') return 'low';
    return 'processing';
  }
  function orderStatusIcon(status) {
    if (status === 'Delivered') return '<svg class="status-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor"/><path d="M8.5 12.5l2.7 2.7 5.3-5.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    if (status === 'Returned') return '<svg class="status-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 10l-3 3 3 3" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 6a6 6 0 1 0 4.2 1.8" stroke="currentColor" stroke-linecap="round"/></svg>';
    if (status === 'Refunded') return '<svg class="status-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor"/><path d="M12 8v8M9 10.5a3 3 0 1 0 3-2.5V8M15 13.5a3 3 0 1 1-3 2.5V16" stroke="currentColor" stroke-linecap="round"/></svg>';
    if (status === 'Shipped') return '<svg class="status-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2.5" y="7.5" width="13" height="8.5" rx="1.6" stroke="currentColor"/><path d="M15.5 10h3.2l2.8 3v3h-6" stroke="currentColor" stroke-linejoin="round"/><circle cx="7" cy="18" r="1.6" stroke="currentColor" fill="none"/><circle cx="17" cy="18" r="1.6" stroke="currentColor" fill="none"/></svg>';
    if (status === 'Cancelled') return '<svg class="status-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor"/><path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" stroke-linecap="round"/></svg>';
    if (status === 'Processing') return '<svg class="status-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3.5" y="6.5" width="17" height="11" rx="1.8" stroke="currentColor"/><path d="M3.5 8l8.5 5 8.5-5" stroke="currentColor" stroke-linejoin="round"/><path d="M12 13.5v4" stroke="currentColor" stroke-linecap="round"/></svg>';
    return '<svg class="status-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  function isTerminalStatus(status) {
    return ['Delivered','Cancelled','Returned','Refunded'].indexOf(status) !== -1;
  }
  function isActiveOrder(status) {
    return ['Cancelled','Returned','Refunded'].indexOf(status) === -1;
  }

  function renderCharts() {
    var teal = cssVar('--teal', '#047857');
    var blue = cssVar('--blue', '#005F8A');
    var success = cssVar('--success', '#047857');
    var warning = cssVar('--warning', '#D97706');
    var danger = cssVar('--danger', '#DC2626');
    var muted = cssVar('--muted', '#475569');
    var isDark = document.body.classList.contains('dark');
    var gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';

    if (typeof Chart !== 'undefined') {
      try {
        Chart.defaults.font.family = '"DM Sans", -apple-system, "Segoe UI", sans-serif';
        Chart.defaults.color = muted;
      } catch (e) {}
    }

    renderSalesChart({ blue: blue, teal: teal, muted: muted, gridColor: gridColor, isDark: isDark, track: isDark ? 'rgba(148,163,184,0.28)' : '#E8E8EB', peak: isDark ? '#F1F5F9' : '#1B1B1F' });

    const inStock = products.filter(function(p) { return p.stock > minOf(p); }).length;
    const lowStock = products.filter(function(p) { return p.stock > 0 && p.stock <= minOf(p); }).length;
    const outStock = products.filter(function(p) { return p.stock === 0; }).length;

    // Category value data
    var catMap = {};
    products.forEach(function(p) {
      if (!catMap[p.category]) catMap[p.category] = 0;
      catMap[p.category] += p.price * p.stock;
    });
    var categories = Object.keys(catMap).sort(function(a, b) { return catMap[b] - catMap[a]; }).slice(0, 6);
    var catValues = categories.map(function(c) { return catMap[c]; });
    renderCategoryBars(categories, catValues, blue);

    if (typeof Chart === 'undefined') return;

    // Destroy old charts
    if (chartStockStatus) { chartStockStatus.destroy(); chartStockStatus = null; }

    var ctx1 = document.getElementById('chartStockStatus');
    if (ctx1) {
      chartStockStatus = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: ['In Stock', 'Low Stock', 'Out of Stock'],
          datasets: [{
            data: [inStock, lowStock, outStock],
            backgroundColor: [success, warning, danger],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } }
          },
          cutout: '65%'
        }
      });
    }
  }

  function renderCategoryBars(categories, values, color) {
    var wrap = document.getElementById('catBars');
    if (!wrap) return;
    if (!categories.length) {
      wrap.innerHTML = '<p class="muted dash-empty">No inventory yet.</p>';
      return;
    }
    var max = Math.max.apply(null, values.concat([1]));
    wrap.innerHTML = categories.map(function(c, i) {
      var pct = Math.max(2, Math.round((values[i] / max) * 100));
      var val = '₱' + Number(values[i]).toLocaleString('en-PH', {maximumFractionDigits: 0});
      return '<div class="cat-row"><span class="cat-name">' + escapeHtml(c) + '</span>' +
        '<span class="cat-track"><span class="cat-fill" style="width:' + pct + '%;background:' + color + '"></span></span>' +
        '<span class="cat-val">' + escapeHtml(val) + '</span></div>';
    }).join('');
  }

  function renderSalesChart(theme) {
    var canvas = document.getElementById('salesChartReal');
    var empty = document.getElementById('salesChartEmpty');
    if (!canvas) return;
    if (typeof Chart === 'undefined') return;
    if (chartSales) { chartSales.destroy(); chartSales = null; }

    var now = new Date();
    var months = [];
    var totals = [0, 0, 0, 0, 0, 0];
    for (var i = 5; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(d.toLocaleDateString('en-PH', { month: 'short' }));
    }
    var orders = getOrders() || [];
    var hasData = false;
    orders.forEach(function(o) {
      if (!isActiveOrder(o.status)) return;
      var t = orderTime(o);
      var dt = new Date(t);
      var diff = (now.getFullYear() - dt.getFullYear()) * 12 + (now.getMonth() - dt.getMonth());
      if (diff >= 0 && diff < 6) {
        var idx = 5 - diff;
        totals[idx] += Number(o.total) || 0;
        if (Number(o.total) > 0) hasData = true;
      }
    });

    if (empty) empty.classList.toggle('hidden', hasData);
    canvas.style.display = hasData ? '' : 'none';
    var periodTotalEl = document.getElementById('salesPeriodTotal');
    var periodTotal = totals.reduce(function(s, v) { return s + (Number(v) || 0); }, 0);
    if (periodTotalEl) {
      periodTotalEl.textContent = hasData
        ? '₱' + periodTotal.toLocaleString('en-PH', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' · last 6 months'
        : '';
    }
    if (!hasData) return;

    var peakIdx = totals.indexOf(Math.max.apply(null, totals));
    var track = theme.track || '#E8E8EB';
    var peak = theme.peak || '#1B1B1F';
    var hoverBar = theme.isDark ? 'rgba(148,163,184,0.55)' : '#D4D4D8';

    chartSales = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Revenue (₱)',
          data: totals,
          backgroundColor: totals.map(function(v, i) { return i === peakIdx ? peak : track; }),
          hoverBackgroundColor: totals.map(function(v, i) { return i === peakIdx ? peak : hoverBar; }),
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 44
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            displayColors: false,
            callbacks: {
              label: function(c) { return ' ₱' + Number(c.parsed.y).toLocaleString('en-PH', {minimumFractionDigits: 2}); }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: function(v) { return '₱' + (v >= 1000 ? (v/1000).toFixed(v >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k' : v); }, font: { size: 10 }, maxTicksLimit: 6 },
            grid: { color: theme.gridColor },
            border: { display: false }
          },
          x: { ticks: { font: { size: 11 } }, grid: { display: false }, border: { display: false } }
        }
      }
    });
  }

  function updateInventoryStats() {
    const totalStock = products.reduce(function(sum, p) { return sum + p.stock; }, 0);
    const low = products.filter(function(p) { return p.stock > 0 && p.stock <= minOf(p); }).length;
    const out = products.filter(function(p) { return p.stock === 0; }).length;
    const value = products.reduce(function(sum, p) { return sum + (p.price * p.stock); }, 0);

    const el1 = document.getElementById('totalStockCount');
    const el2 = document.getElementById('lowStockCount');
    const el3 = document.getElementById('outOfStockCount');
    const el4 = document.getElementById('inventoryValue');
    if (el1) el1.textContent = totalStock;
    if (el2) el2.textContent = low;
    if (el3) el3.textContent = out;
    if (el4) el4.textContent = '₱' + value.toLocaleString();
  }

  function showLowStock() {
    const items = products.filter(function(p) { return p.stock > 0 && p.stock <= minOf(p); });
    if (items.length === 0) { showToast('No low stock items', false, true); return; }
    window.navigateTo('#products');
    setTimeout(function(){
      document.querySelectorAll('#adminProductsBody tr').forEach(function(row) {
        const name = row.querySelector('td:nth-child(4)')?.textContent || row.dataset.product || '';
        const isLow = items.some(function(p) { return name.includes(p.name); });
        row.classList.toggle('row-flash', isLow);
        if (isLow) setTimeout(function(){ row.classList.remove('row-flash'); }, 4500);
      });
    }, 200);
    showToast(items.length + ' low stock items highlighted in Products', false, false);
  }

  // --- BULK STOCK (selection-based — Products & inventory merged) ---
  var lastBulkSnapshot = null;
  function bulkImpactForIds(ids, type, qty) {
    var list = products.filter(function(p){ return ids.has(p.id); });
    var unitsDelta = 0;
    var valueDelta = 0;
    list.forEach(function(p) {
      var next = p.stock;
      if (type === 'set') next = qty;
      else if (type === 'add') next = p.stock + qty;
      else if (type === 'subtract') next = Math.max(0, p.stock - qty);
      unitsDelta += (next - p.stock);
      valueDelta += ((next - p.stock) * (Number(p.price) || 0));
    });
    return { count: list.length, unitsDelta: unitsDelta, valueDelta: valueDelta };
  }
  // Backward compat for callers that still pass category
  function invalidateBulkUndo() {
    lastBulkSnapshot = null;
    var ub = document.getElementById('bulkUndoBtn');
    if (ub) ub.classList.add('hidden');
  }
  function refreshBulkPreview() {
    var preview = document.getElementById('bulkPreview');
    if (!preview) return;
    var typeEl = document.getElementById('productsBulkType');
    var qtyEl = document.getElementById('productsBulkQty');
    if (!typeEl || !qtyEl) return;
    var qty = Number(qtyEl.value);
    if (!Number.isInteger(qty) || qty < 0) { preview.textContent = 'Enter a whole quantity (0 or more) to preview.'; return; }
    if (typeof selectedProductIds === 'undefined' || selectedProductIds.size === 0) {
      preview.textContent = 'Tick products to preview · ' + products.length + ' total · ' + qty + ' units per action';
      return;
    }
    var impact = bulkImpactForIds(selectedProductIds, typeEl.value, qty);
    var sign = impact.valueDelta >= 0 ? '+' : '−';
    preview.textContent = impact.count + ' selected · units ' +
      (impact.unitsDelta >= 0 ? '+' : '') + impact.unitsDelta +
      ' · value ' + sign + '₱' + Math.abs(impact.valueDelta).toLocaleString('en-PH', {maximumFractionDigits: 0});
  }
  function setupBulkStock() {
    var applyBtn = document.getElementById('productsBulkApply') || document.getElementById('bulkApplyBtn');
    var undoBtn = document.getElementById('bulkUndoBtn');
    var exportBtn = document.getElementById('productsBulkExport');
    var selAll = document.getElementById('selectAllProducts');
    var typeEl = document.getElementById('productsBulkType');
    var qtyEl = document.getElementById('productsBulkQty');
    ['productsBulkType','productsBulkQty'].forEach(function(id){
      var el=document.getElementById(id); if(el){ el.addEventListener('input', refreshBulkPreview); el.addEventListener('change', refreshBulkPreview); }
    });
    refreshBulkPreview();
    try { window.refreshBulkPreview = refreshBulkPreview; } catch (e) {}
    if (selAll) {
      selAll.addEventListener('change', function(){
        var cbs = document.querySelectorAll('.product-select');
        cbs.forEach(function(cb){
          cb.checked = selAll.checked;
          var id=parseInt(cb.dataset.id); if(selAll.checked) selectedProductIds.add(id); else selectedProductIds.delete(id);
          var tr=cb.closest('tr'); if(tr) tr.classList.toggle('row-selected', cb.checked);
        });
        syncBulkBar();
      });
    }
    if (exportBtn) {
      exportBtn.addEventListener('click', function(){
        var rows = selectedProductIds.size ? getSelectedProducts() : products;
        if (!rows.length) { showToast('No products to export', true); return; }
        var csv = 'SKU,Product,Category,Price,Stock,Min,Status\n' + rows.map(function(p){
          return [csvCell(p.sku), csvCell(p.name), csvCell(p.category), p.price, p.stock, minOf(p), csvCell(p.status)].join(',');
        }).join('\n');
        var blob=new Blob(["\uFEFF" + csv],{type:'text/csv;charset=utf-8'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='smilehub-products-' + new Date().toISOString().slice(0,10)+'.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
        addAuditLog('Exported ' + rows.length + ' products to CSV');
      });
    }
    if (undoBtn) {
      undoBtn.addEventListener('click', function() {
        if (!lastBulkSnapshot) return;
        var restore = deepClone(lastBulkSnapshot);
        var btn = undoBtn;
        btn.disabled = true;
        try {
          saveProducts(restore, function() {
            products = deepClone(restore);
            lastBulkSnapshot = null;
            btn.classList.add('hidden');
            btn.disabled = false;
            renderProducts();
            updateDashboard();
            refreshBulkPreview();
            syncBulkBar();
            addAuditLog('Undid last bulk stock update');
            showToast('Bulk update undone', false, true);
          });
        } catch (e) {
          btn.disabled = false;
          showToast('Undo failed — try again', true);
        }
      });
    }
    if (applyBtn) {
      applyBtn.addEventListener('click', function(){
        var tEl = document.getElementById('productsBulkType');
        var qEl = document.getElementById('productsBulkQty');
        if (!tEl || !qEl) { showToast('Bulk form broken — reload', true); return; }
        var type=tEl.value; var qty=Number(qEl.value);
        if (!Number.isInteger(qty) || qty < 0) { showToast('Enter a whole quantity (0 or more).', true); return; }
        if (qty > 10000) { showToast('Quantity looks too large (max 10,000).', true); return; }
        if (selectedProductIds.size === 0) { showToast('Tick at least one product', true); return; }
        var impact = bulkImpactForIds(selectedProductIds, type, qty);
        if (applyBtn.disabled) return;
        var destructive = type === 'set' || impact.count >= 20;
        var detail = 'Apply ' + type + ' ' + qty + ' to ' + impact.count + ' selected products?';
        if (!window.confirm(detail + '\nUnits change: ' + impact.unitsDelta + '\nThis can be undone with Undo.')) return;
        if (destructive && impact.count >= 20) {
          if (!window.confirm('This affects ' + impact.count + ' products. Confirm again.')) return;
        }
        lastBulkSnapshot = deepClone(products);
        applyBtn.disabled = true;
        try {
          getSelectedProducts().forEach(function(p){
            if (type === 'set') p.stock = qty;
            else if (type === 'add') p.stock += qty;
            else if (type === 'subtract') p.stock = Math.max(0, p.stock - qty);
            p.status = stockStatus(p.stock, minOf(p));
          });
          saveProducts(products);
          renderProducts();
          updateDashboard();
          refreshBulkPreview();
          if (undoBtn) undoBtn.classList.remove('hidden');
          addAuditLog('Bulk stock update: ' + type + ' ' + qty + ' for ' + impact.count + ' products (selection)');
          showToast('Updated ' + impact.count + ' products — use Undo to revert', false, true);
        } finally {
          applyBtn.disabled = false;
        }
      });
    }
    // Legacy form submit (if still present for any fallback)
    var legacyForm = document.getElementById('bulkStockForm');
    if (legacyForm) legacyForm.addEventListener('submit', function(e){ e.preventDefault(); if(applyBtn) applyBtn.click(); });
  }

  // --- ORDERS (inspired layout: filters + selection bar + right rail) ---
  var ordersCache = [];
  var selectedOrderIds = new Set();
  // Load-error flags distinguish PERMISSION-DENIED from genuinely-empty.
  var ordersLoadError = null;
  var accountsLoadError = null;

  function getOrders() {
    return ordersCache;
  }

  function fetchOrders(callback) {
    ordersLoadError = null;
    try {
      SmileHubData.getOrders(function(data, err) {
        ordersCache = data || [];
        if (err) ordersLoadError = (err && (err.code || err.message)) || 'load failed';
        if (callback) callback(ordersCache);
      });
    } catch (e) {
      ordersLoadError = (e && (e.code || e.message)) || 'load failed';
      if (callback) callback(ordersCache);
    }
  }

  function saveOrders(data) {
    ordersCache = data;
    SmileHubData.saveOrders(data);
  }

  function orderMatchesDate(order, dateVal) {
    if (!dateVal || dateVal === 'all') return true;
    var t = order.sortTs || (order.date ? Date.parse(order.date) : Date.now());
    if (isNaN(t)) return true;
    var d = new Date(t);
    var now = new Date();
    if (dateVal === 'today') return d.toDateString() === now.toDateString();
    if (dateVal === 'week') { var w = new Date(now); w.setDate(w.getDate()-7); return d >= w; }
    if (dateVal === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    return true;
  }
  function syncOrdersBulkBar(visibleIds) {
    var bar = document.getElementById('ordersBulkBar');
    var countEl = document.getElementById('ordersBulkCount');
    var selAll = document.getElementById('orderSelectAll');
    if (countEl) countEl.textContent = selectedOrderIds.size + ' selected';
    if (bar) {
      var show = selectedOrderIds.size > 0;
      bar.classList.toggle('hidden', !show);
      bar.classList.toggle('floating', show);
      bar.style.display = show ? 'flex' : 'none';
    }
    if (selAll) {
      var allChecked = visibleIds && visibleIds.length && visibleIds.every(function(id){ return selectedOrderIds.has(id); });
      selAll.checked = !!allChecked;
      selAll.indeterminate = !allChecked && visibleIds && visibleIds.some(function(id){ return selectedOrderIds.has(id); });
    }
  }
  function renderOrdersRail(filtered) {
    // Status bars
    var bars = document.getElementById('ordersStatusBars');
    var sub = document.getElementById('ordersStatusSub');
    if (bars) {
      var total = filtered.length || 0;
      var statuses = ['Pending','Processing','Shipped','Delivered','Cancelled','Returned','Refunded'];
      var colors = { Pending:'#f0a320', Processing:'#1261a0', Shipped:'#0f9d9a', Delivered:'#1e9b61', Cancelled:'#d64545', Returned:'#D97706', Refunded:'#7C3AED' };
      if (total === 0) {
        bars.innerHTML = '<p class="muted" style="padding:10px 0;">No orders in this view.</p>';
        if (sub) sub.textContent = '';
      } else {
        var counts = {}; statuses.forEach(function(s){ counts[s]=0; }); filtered.forEach(function(o){ counts[o.status] = (counts[o.status]||0)+1; });
        if (sub) sub.textContent = total + ' orders';
        bars.innerHTML = statuses.map(function(s){
          var c = counts[s]||0; var pct = total ? Math.round((c/total)*100) : 0;
          return '<div style="display:grid;gap:4px;"><div style="display:flex;justify-content:space-between;font-size:0.82rem;"><span style="display:flex;align-items:center;gap:6px;"><span style="width:8px;height:8px;border-radius:999px;background:' + (colors[s]||'#6b7a8c') + '"></span>' + s + '</span><span class="muted">' + c + ' · ' + pct + '%</span></div><div class="status-bar-track"><span class="status-bar-fill" style="width:' + pct + '%;background:' + (colors[s]||'#6b7a8c') + '"></span></div></div>';
        }).join('');
      }
    }
    // Overview this month (from filtered or all)
    var ov = document.getElementById('ordersOverview');
    if (ov) {
      var now = new Date();
      var monthRows = filtered.filter(function(o){ var t=o.sortTs || Date.parse(o.date); if(isNaN(t)) return false; var d=new Date(t); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); });
      var rev = monthRows.reduce(function(s,o){ return s + (Number(o.total)||0); }, 0);
      var avg = monthRows.length ? rev / monthRows.length : 0;
      var items = monthRows.reduce(function(s,o){ return s + (o.items ? o.items.reduce(function(a,i){ return a + (i.quantity||1); },0) : 0); }, 0);
      var pending = monthRows.filter(function(o){ return o.status==='Pending'; }).length;
      ov.innerHTML = '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
        '<div><div class="muted" style="font-size:0.75rem;">Avg order</div><strong>₱' + avg.toLocaleString('en-PH',{minimumFractionDigits:2}) + '</strong></div>' +
        '<div><div class="muted" style="font-size:0.75rem;">Total revenue</div><strong>₱' + rev.toLocaleString('en-PH',{minimumFractionDigits:2}) + '</strong></div>' +
        '<div><div class="muted" style="font-size:0.75rem;">Items / order</div><strong>' + (monthRows.length ? (items/monthRows.length).toFixed(1) : '—') + '</strong></div>' +
        '<div><div class="muted" style="font-size:0.75rem;">Pending</div><strong>' + pending + '</strong></div>' +
        '</div>';
    }
    // Top sellers this month
    var topEl = document.getElementById('ordersTopSellers');
    if (topEl) {
      var now2 = new Date();
      var monthFiltered = filtered.filter(function(o){ var t=o.sortTs || Date.parse(o.date); if(isNaN(t)) return false; var d=new Date(t); return d.getMonth()===now2.getMonth() && d.getFullYear()===now2.getFullYear(); });
      var map = {};
      monthFiltered.forEach(function(o){ (o.items||[]).forEach(function(it){ var n=it.name||'Unknown'; if(!map[n]) map[n]={units:0,revenue:0}; map[n].units += it.quantity||1; map[n].revenue += (it.quantity||1)*(it.price||0); }); });
      var sorted = Object.keys(map).sort(function(a,b){ return map[b].units - map[a].units; }).slice(0,5);
      if (!sorted.length) topEl.innerHTML = '<p class="muted" style="padding:8px 0;">No sales this month.</p>';
      else topEl.innerHTML = sorted.map(function(n){ var p=map[n]; return '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);"><span style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;">' + escapeHtml(n) + '</span><span class="muted">' + p.units + ' sold</span></div>'; }).join('');
    }
  }
  function ordersToCsv(list) {
    var head = 'Order #,Customer,Email,Date,Status,Total,Items';
    var rows = list.map(function(o){
      var items = (o.items||[]).map(function(it){ return (it.name||'') + ' x' + (it.quantity||1); }).join('; ');
      return [csvCell(o.number), csvCell(o.customer), csvCell(o.email), csvCell(o.date), csvCell(o.status), (o.total||0), csvCell(items)].join(',');
    });
    return head + '\n' + rows.join('\n');
  }

  function renderOrders(filter) {
    const body = document.getElementById('ordersBody');
    if (!body) return;
    const orders = getOrders();
    var statusVal = (document.getElementById('orderStatusFilter') || {}).value || filter || 'all';
    var q = ((document.getElementById('orderSearch') || {}).value || '').toLowerCase().trim();
    var dateVal = (document.getElementById('orderDateFilter') || {}).value || 'all';
    let filtered = orders.filter(function(o){
      if (statusVal !== 'all' && o.status !== statusVal) return false;
      if (!orderMatchesDate(o, dateVal)) return false;
      if (q) {
        var hay = [o.number||'', o.customer||'', o.email||''].join(' ').toLowerCase();
        if (hay.indexOf(q)===-1) return false;
      }
      return true;
    });
    filtered.sort(function(a, b) {
      var ta = a.sortTs || (new Date(a.date).getTime() || 0);
      var tb = b.sortTs || (new Date(b.date).getTime() || 0);
      return tb - ta;
    });

    var fc = document.getElementById('orderFilterCount');
    if (fc) fc.textContent = filtered.length + ' of ' + orders.length;

    if (filtered.length === 0) {
      if (orders.length === 0 && ordersLoadError) {
        body.innerHTML = '<tr><td colspan="8" class="text-center muted" style="padding:40px;">Couldn\'t load orders (' + escapeHtml(ordersLoadError) + '). Sign in over localhost or hosting as staff, then Refresh.</td></tr>';
      } else {
        body.innerHTML = orders.length === 0
          ? `<tr><td colspan="8" class="text-center muted" style="padding:40px;">No orders yet — new store orders will appear here.</td></tr>`
          : `<tr><td colspan="8" class="text-center muted" style="padding:40px;">No orders match — try a different search or filter.</td></tr>`;
      }
      updateOrderStats(orders);
      syncOrdersBulkBar([]);
      renderOrdersRail(filtered);
      return;
    }

    body.innerHTML = filtered.map(function(order) {
      const cls = orderStatusClass(order.status);
      const icon = orderStatusIcon(order.status);
      const count = order.items ? order.items.reduce(function(s, i) { return s + (i.quantity || 1); }, 0) : 0;
      const safeNumber = escapeHtml(order.number);
      const safeCustomer = escapeHtml(order.customer);
      const safeDate = escapeHtml(order.date);
      const safeStatus = escapeHtml(order.status);
      var returnBadge = order.returnRequest && order.returnRequest.status === 'requested' ? ' <span class="status return-requested">↩ Requested</span>' : order.returnRequest && order.returnRequest.status === 'approved' ? ' <span class="status returned">↩ Approved</span>' : order.returnRequest && order.returnRequest.status === 'rejected' ? ' <span class="status low">↩ Rejected</span>' : '';
      const checked = selectedOrderIds.has(order.number) ? ' checked' : '';
      return `
        <tr>
          <td><input type="checkbox" class="order-select" data-number="${safeNumber}" aria-label="Select order ${safeNumber}"${checked}></td>
          <td><strong>${safeNumber}</strong></td>
          <td>${safeCustomer}</td>
          <td>${safeDate}</td>
          <td>₱${Number(order.total).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
          <td>${count} items</td>
          <td><span class="status ${cls}">${icon} ${safeStatus}</span>${returnBadge}</td>
          <td>
            <button class="btn btn-light view-order" data-number="${safeNumber}" style="padding:4px 10px;font-size:0.8rem;">View</button>
            <select class="order-status-update" data-number="${safeNumber}" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.8rem;" aria-label="Change status for order ${safeNumber}">
              <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
              <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
              <option value="Returned" ${order.status === 'Returned' ? 'selected' : ''}>Returned</option>
              <option value="Refunded" ${order.status === 'Refunded' ? 'selected' : ''}>Refunded</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.view-order').forEach(function(btn) {
      btn.addEventListener('click', function() { viewOrder(this.dataset.number); });
    });
    document.querySelectorAll('.order-status-update').forEach(function(sel) {
      sel.addEventListener('change', function() {
        updateOrderStatus(this.dataset.number, this.value, this);
      });
    });
    document.querySelectorAll('.order-select').forEach(function(cb){
      var tr = cb.closest('tr');
      if (tr) tr.classList.toggle('row-selected', cb.checked);
      cb.addEventListener('change', function(){
        var n=this.dataset.number;
        if(this.checked) selectedOrderIds.add(n); else selectedOrderIds.delete(n);
        var t = this.closest('tr');
        if (t) t.classList.toggle('row-selected', this.checked);
        syncOrdersBulkBar(filtered.map(function(o){ return o.number; }));
      });
    });
    syncOrdersBulkBar(filtered.map(function(o){ return o.number; }));
    // Paint already-selected rows after sync (for re-render)
    document.querySelectorAll('.order-select').forEach(function(cb){
      var t=cb.closest('tr'); if(t) t.classList.toggle('row-selected', selectedOrderIds.has(cb.dataset.number));
    });
    renderOrdersRail(getOrders());
    updateOrderStats(orders);
  }

  function orderErrorMessage(error) {
    var code = (error && error.code) || '';
    if (code === 'permission-denied' || code === 'PERMISSION_DENIED') {
      return 'You do not have permission to change this order. Ask a Super Admin to check Firestore rules.';
    }
    if (code === 'unavailable' || code === 'failed-precondition') {
      return 'Network issue — status not saved. Check connection and try again.';
    }
    if (code === 'not-found') {
      return 'Order document not found — it may have been deleted. Refresh orders.';
    }
    return 'Status not saved (' + (code || (error && error.message) || 'unknown error') + '). Try again.';
  }

  function saveErrorMessage(action, error) {
    var code = (error && error.code) || '';
    if (code === 'permission-denied' || code === 'PERMISSION_DENIED') {
      return 'Could not ' + action + ' — you do not have permission. Ask a Super Admin for access.';
    }
    if (code === 'unavailable' || code === 'failed-precondition' || code === 'deadline-exceeded') {
      return 'Could not ' + action + ' — network issue. Check your connection and try again.';
    }
    if (code === 'auth/email-already-in-use') {
      return 'Could not ' + action + ' — that email is already registered.';
    }
    return 'Could not ' + action + ' — try again' + (code ? ' (' + code + ')' : '') + '.';
  }

  function refreshOrderViews() {
    var f = (document.getElementById('orderStatusFilter') || {}).value || 'all';
    renderOrders(f);
    try { updateDashboard(); } catch (e) {}
    try { renderOrdersRail(getOrders()); } catch(e){}
    try { renderAccounts(); } catch(e){}
  }
  function updateOrderStatus(number, status, selectEl, opts) {
    opts = opts || {};
    var quiet = !!opts.quiet;
    const orders = getOrders();
    const idx = orders.findIndex(function(o) { return o.number === number; });
    if (idx === -1) {
      const filterMiss = document.getElementById('orderStatusFilter')?.value || 'all';
      renderOrders(filterMiss);
      return quiet ? Promise.resolve({ ok:false, reason:'not found' }) : undefined;
    }
    const old = orders[idx].status;
    if (old === status) return quiet ? Promise.resolve({ ok:true }) : undefined;
    if (!quiet && isTerminalStatus(status)) {
      if (!window.confirm('Change order ' + number + ' from ' + old + ' to ' + status + '?\nThis is a terminal state. Continue?')) {
        if (selectEl) selectEl.value = old;
        return quiet ? Promise.resolve({ ok:false, reason:'cancelled' }) : undefined;
      }
    }
    if (typeof db === 'undefined' || !db.collection) {
      if (selectEl) { selectEl.value = old; selectEl.disabled = false; }
      if (!quiet) showToast('Order service unavailable — try again after reload', true);
      return quiet ? Promise.resolve({ ok:false, error:'no db' }) : undefined;
    }
    if (selectEl) selectEl.disabled = true;
    orders[idx].status = status;

    // Surgical update: write ONLY this order's document. Rewriting the whole
    // list fails whenever any single order is not writable.
    const refId = orders[idx].docId || orders[idx].number;
    var updatePromise;
    try {
      updatePromise = db.collection('orders').doc(refId).update({
        status: status,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    } catch (syncErr) {
      console.error('Order status update failed:', syncErr);
      orders[idx].status = old;
      if (selectEl) { selectEl.value = old; selectEl.disabled = false; }
      if (!quiet) {
        const filterSync = document.getElementById('orderStatusFilter')?.value || 'all';
        renderOrders(filterSync);
        showToast(orderErrorMessage(syncErr), true);
      }
      return quiet ? Promise.resolve({ ok:false, error:syncErr }) : undefined;
    }
    var p = updatePromise.then(function() {
      if (!quiet) {
        addAuditLog('Changed order ' + number + ' from ' + old + ' to ' + status);
        showToast('Order ' + number + ': ' + old + ' → ' + status, false, true);
        refreshOrderViews();
        closeOrderModal();
      } else {
        if (selectEl) selectEl.disabled = false;
      }
      return { ok:true };
    }).catch(function(error) {
      console.error('Order status update failed:', error);
      orders[idx].status = old;
      if (selectEl) { selectEl.value = old; selectEl.disabled = false; }
      if (!quiet) {
        const filter = document.getElementById('orderStatusFilter')?.value || 'all';
        renderOrders(filter);
        showToast(orderErrorMessage(error), true);
      }
      return { ok:false, error:error };
    });
    if (quiet) return p;
  }

  function viewOrder(number) {
    const orders = getOrders();
    const order = orders.find(function(o) { return o.number === number; });
    if (!order) { showToast('Order not found', true); return; }

    const modal = document.getElementById('orderModal');
    const title = document.getElementById('orderModalTitle');
    const content = document.getElementById('orderModalContent');
    if (!modal || !title || !content) return;

    openAdminModal(modal);
    title.textContent = 'Order ' + order.number;

    // Add print button next to close (modal-close or legacy btn)
    var closeBtn = modal.querySelector('.modal-close') || modal.querySelector('.btn-light');
    if (closeBtn && !document.getElementById('printSlipBtn')) {
      var printBtn = document.createElement('button');
      printBtn.className = 'btn btn-secondary';
      printBtn.id = 'printSlipBtn';
      printBtn.textContent = 'Print Slip';
      printBtn.style.marginRight = '8px';
      printBtn.type = 'button';
      printBtn.onclick = function() { printOrderSlip(order.number); };
      closeBtn.parentNode.insertBefore(printBtn, closeBtn);
    }

    const itemsHtml = order.items ? order.items.map(function(item) {
      return `<tr><td>${escapeHtml(item.name)}</td><td>${item.quantity || 1}</td><td>₱${Number(item.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td><td>₱${Number((item.quantity || 1) * item.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td></tr>`;
    }).join('') : '';

    const cls = orderStatusClass(order.status);
    const icon = orderStatusIcon(order.status);
    // Return request block
    var returnBlock = '';
    if (order.returnRequest) {
      var rr = order.returnRequest;
      var rrStatus = rr.status || 'requested';
      var rrReason = escapeHtml(rr.reason || '—');
      var rrNote = escapeHtml(rr.note || '—');
      var rrTime = '';
      try {
        if (rr.requestedAt) {
          if (typeof rr.requestedAt === 'string') rrTime = new Date(rr.requestedAt).toLocaleString();
          else if (rr.requestedAt.toDate) rrTime = rr.requestedAt.toDate().toLocaleString();
          else if (rr.requestedAt.seconds) rrTime = new Date(rr.requestedAt.seconds*1000).toLocaleString();
        }
      } catch(e) {}
      var rrStatusCls = rrStatus === 'requested' ? 'return-requested' : rrStatus === 'approved' ? 'returned' : rrStatus === 'refunded' ? 'refunded' : 'low';
      var rrStatusIcon = '';
      var canAct = false;
      try { var r = getCurrentUserRole ? getCurrentUserRole() : null; canAct = r === 'admin' || r === 'superadmin'; } catch(e){ canAct=false; }
      var actionsHtml = '';
      if (rrStatus === 'requested' && canAct) {
        actionsHtml = '<div class="modal-foot" style="justify-content:flex-start;">' +
          '<button class="btn btn-primary" data-return-action="approve" data-number="' + escapeHtml(order.number) + '" type="button">Approve &amp; Restock</button>' +
          '<button class="btn btn-light" data-return-action="reject" data-number="' + escapeHtml(order.number) + '" type="button">Reject</button>' +
          '</div>';
      } else if (rrStatus === 'approved' && canAct) {
        actionsHtml = '<div class="modal-foot" style="justify-content:flex-start;">' +
          '<button class="btn btn-primary" data-return-action="refund" data-number="' + escapeHtml(order.number) + '" type="button">Mark Refunded</button>' +
          '</div>';
      }
      returnBlock = '<div class="card" style="margin-top:16px;padding:14px;background:var(--sky);border:1px solid var(--border);border-radius:12px;">' +
        '<h3 style="margin:0 0 8px;font-size:1rem;">Return Request <span class="status ' + rrStatusCls + '">' + rrStatusIcon + ' ' + escapeHtml(rrStatus) + '</span></h3>' +
        '<div style="display:grid;gap:6px;font-size:0.9rem;">' +
        '<div><strong>Reason:</strong> ' + rrReason + '</div>' +
        '<div><strong>Note:</strong> ' + rrNote + '</div>' +
        (rrTime ? '<div><strong>Requested:</strong> ' + escapeHtml(rrTime) + '</div>' : '') +
        '</div>' + actionsHtml + '</div>';
    } else if (String(order.status||'').toLowerCase() === 'delivered') {
      try {
        var t = order.sortTs || (order.date ? Date.parse(order.date) : Date.now());
        var days = (Date.now() - t) / (86400000);
        if (days > 7) {
          returnBlock = '<p class="muted" style="margin-top:12px;">Return window closed (7 days after delivery).</p>';
        }
      } catch(e){}
    }

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">
        <div><strong>Customer:</strong> ${escapeHtml(order.customer)}</div>
        <div><strong>Email:</strong> ${escapeHtml(order.email || 'N/A')}</div>
        <div><strong>Date:</strong> ${escapeHtml(order.date)}</div>
        <div><strong>Status:</strong> <span class="status ${cls}">${icon} ${escapeHtml(order.status)}</span></div>
        <div style="grid-column:span 2;"><strong>Address:</strong><br>${escapeHtml(order.address || 'N/A')}</div>
      </div>
      <h3>Items</h3>
      <div class="table-wrap"><table><thead><tr><th scope="col">Product</th><th scope="col">Qty</th><th scope="col">Price</th><th scope="col">Total</th></tr></thead><tbody>${itemsHtml}<tr><td colspan="3" style="text-align:right;"><strong>Total:</strong></td><td><strong>₱${Number(order.total).toLocaleString('en-PH', {minimumFractionDigits: 2})}</strong></td></tr></tbody></table></div>
      ${returnBlock}
    `;
    // Wire return actions inside modal
    try {
      content.querySelectorAll('[data-return-action="approve"]').forEach(function(btn){
        btn.addEventListener('click', function(){ handleReturnApprove(this.dataset.number); });
      });
      content.querySelectorAll('[data-return-action="reject"]').forEach(function(btn){
        btn.addEventListener('click', function(){ handleReturnReject(this.dataset.number); });
      });
      content.querySelectorAll('[data-return-action="refund"]').forEach(function(btn){
        btn.addEventListener('click', function(){ handleReturnRefund(this.dataset.number); });
      });
    } catch(e){}
  }

  function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) closeAdminModal(modal);
  }

  function restockOrderItems(order) {
    var restocked = 0;
    (order.items || []).forEach(function(it){
      var pid = it.productId || it.id;
      var qty = Number(it.quantity || it.qty || 1);
      var prod = null;
      if (pid != null) prod = products.find(function(p){ return String(p.id) === String(pid); });
      if (!prod && it.name) prod = products.find(function(p){ return p.name === it.name; });
      if (prod && qty > 0) {
        prod.stock = (Number(prod.stock)||0) + qty;
        prod.status = stockStatus(prod.stock, minOf(prod));
        restocked += qty;
      }
    });
    if (restocked > 0) {
      try { saveProducts(products); } catch(e){}
      try { renderProducts(); } catch(e){}
      try { updateDashboard(); } catch(e){}
    }
    return restocked;
  }
  function handleReturnApprove(number) {
    var orders = getOrders();
    var idx = orders.findIndex(function(o){ return o.number === number; });
    if (idx === -1) { showToast('Order not found', true); return; }
    var order = orders[idx];
    if (!order.returnRequest || order.returnRequest.status !== 'requested') { showToast('No pending return request', true); return; }
    try { var r=getCurrentUserRole ? getCurrentUserRole() : null; if (r!=='admin' && r!=='superadmin'){ showToast('Only admins can approve returns', true); return; } } catch(e){}
    if (!window.confirm('Approve return for order ' + number + '?\nItems will be restocked automatically. Continue?')) return;
    var restocked = restockOrderItems(order);
    order.returnRequest.status = 'approved';
    order.returnRequest.approvedAt = new Date().toISOString();
    try { order.returnRequest.approvedBy = (window.SmileHubAuth && window.SmileHubAuth.getLoggedInUser() || {}).email || ''; } catch(e){}
    order.status = 'Returned';
    var refId = order.docId || order.number;
    var payload = { status: 'Returned', returnRequest: order.returnRequest, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    // Ensure restocked flag
    order.returnRequest.restocked = restocked > 0;
    try { db.collection('orders').doc(String(refId)).update(payload).then(function(){
      addAuditLog('Approved return for order ' + number + (restocked? ' — restocked ' + restocked + ' units' : ''));
      showToast('Return approved — order ' + number + ' marked Returned' + (restocked? ' and ' + restocked + ' units restocked' : ''), false, true);
      refreshOrderViews();
      closeOrderModal();
    }).catch(function(err){
      showToast(saveErrorMessage('approve return', err), true);
      refreshOrderViews();
    }); } catch(e){ showToast(saveErrorMessage('approve return', e), true); }
    refreshOrderViews();
    if (typeof viewOrder === 'function') setTimeout(function(){ viewOrder(number); }, 350);
  }
  function handleReturnReject(number) {
    var orders = getOrders();
    var idx = orders.findIndex(function(o){ return o.number === number; });
    if (idx === -1) { showToast('Order not found', true); return; }
    var order = orders[idx];
    if (!order.returnRequest || order.returnRequest.status !== 'requested') { showToast('No pending return request', true); return; }
    try { var r=getCurrentUserRole ? getCurrentUserRole() : null; if (r!=='admin' && r!=='superadmin'){ showToast('Only admins can reject returns', true); return; } } catch(e){}
    var reason = window.prompt('Reject return for order ' + number + ' — enter reason (optional):') || '';
    // allow empty reason but confirm
    if (!window.confirm('Reject this return request?')) return;
    order.returnRequest.status = 'rejected';
    order.returnRequest.rejectedAt = new Date().toISOString();
    order.returnRequest.adminNote = reason;
    var refId = order.docId || order.number;
    var payload = { returnRequest: order.returnRequest, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try { db.collection('orders').doc(String(refId)).update(payload).then(function(){
      addAuditLog('Rejected return for order ' + number);
      showToast('Return rejected for order ' + number, false, true);
      refreshOrderViews();
      closeOrderModal();
    }).catch(function(err){ showToast(saveErrorMessage('reject return', err), true); refreshOrderViews(); }); } catch(e){ showToast(saveErrorMessage('reject return', e), true); }
    refreshOrderViews();
    if (typeof viewOrder === 'function') setTimeout(function(){ viewOrder(number); }, 350);
  }
  function handleReturnRefund(number) {
    var orders = getOrders();
    var idx = orders.findIndex(function(o){ return o.number === number; });
    if (idx === -1) { showToast('Order not found', true); return; }
    var order = orders[idx];
    if (!order.returnRequest || order.returnRequest.status !== 'approved') { showToast('Order must be approved before refund', true); return; }
    try { var r=getCurrentUserRole ? getCurrentUserRole() : null; if (r!=='admin' && r!=='superadmin'){ showToast('Only admins can mark refunds', true); return; } } catch(e){}
    if (!window.confirm('Mark order ' + number + ' as Refunded?\nThis records the refund as completed.')) return;
    order.returnRequest.status = 'refunded';
    order.returnRequest.refundedAt = new Date().toISOString();
    order.status = 'Refunded';
    var refId = order.docId || order.number;
    var payload = { status: 'Refunded', returnRequest: order.returnRequest, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    try { db.collection('orders').doc(String(refId)).update(payload).then(function(){
      addAuditLog('Marked order ' + number + ' as Refunded');
      showToast('Order ' + number + ' marked Refunded', false, true);
      refreshOrderViews();
      closeOrderModal();
    }).catch(function(err){ showToast(saveErrorMessage('mark refunded', err), true); refreshOrderViews(); }); } catch(e){ showToast(saveErrorMessage('mark refunded', e), true); }
    refreshOrderViews();
    if (typeof viewOrder === 'function') setTimeout(function(){ viewOrder(number); }, 350);
  }

  function filterOrders() {
    const filter = document.getElementById('orderStatusFilter')?.value || 'all';
    renderOrders(filter);
  }

  function refreshOrders() {
    const filter = (document.getElementById('orderStatusFilter') || {}).value || 'all';
    renderOrders(filter);
    showToast('Refreshed', false, false);
  }

  function updateOrderStats(orders) {
    const total = orders.length;
    const pending = orders.filter(function(o) { return o.status === 'Pending'; }).length;
    const processing = orders.filter(function(o) { return o.status === 'Processing' || o.status === 'Shipped'; }).length;
    const todayStr = new Date().toDateString();
    const deliveredTodayCount = orders.filter(function(o) {
      if (o.status !== 'Delivered') return false;
      var ts = orderTime(o);
      return ts && new Date(ts).toDateString() === todayStr;
    }).length;

    const el1 = document.getElementById('totalOrders');
    const el2 = document.getElementById('pendingOrders');
    const el3 = document.getElementById('processingOrders');
    const el4 = document.getElementById('deliveredToday');
    if (el1) el1.textContent = total;
    if (el2) el2.textContent = pending;
    if (el3) el3.textContent = processing;
    if (el4) el4.textContent = deliveredTodayCount;
  }

  // --- MAKE DASHBOARD CLICKABLE ---
  function makeDashboardClickable() {
    document.querySelectorAll('.kpi-card.clickable, .stat-plain[data-target]').forEach(function(card) {
      card.addEventListener('click', function(e) {
        if (e && e.preventDefault && card.tagName === 'A') e.preventDefault();
        const target = this.dataset.target;
        if (target) navigateTo(target);
      });
    });
    var alertsContainer = document.getElementById('dashInventoryAlerts');
    if (alertsContainer) {
      alertsContainer.addEventListener('click', function(e) {
        var item = e.target.closest('.inventory-alert-item');
        if (!item) return;
        var name = item.dataset.product;
        navigateTo('#products');
        setTimeout(function() {
          document.querySelectorAll('#adminProductsBody tr').forEach(function(row) {
            var rowName = row.querySelector('td:nth-child(4)')?.textContent || row.dataset.product || '';
            if (rowName.includes(name)) {
              row.classList.add('row-flash');
              setTimeout(function() { row.classList.remove('row-flash'); }, 5000);
            }
          });
        }, 300);
      });
      alertsContainer.addEventListener('keydown', function(e) {
        if (e.key !== 'Enter' && e.key !== ' ') return;
        var item = e.target.closest ? e.target.closest('.inventory-alert-item') : null;
        if (!item) return;
        e.preventDefault();
        item.click();
      });
    }
    document.querySelectorAll('.theme-button').forEach(function(btn) {
      if (btn.dataset.dashChartsBound) return;
      btn.dataset.dashChartsBound = '1';
      btn.addEventListener('click', function() {
        setTimeout(function() { try { renderCharts(); } catch (e) {} }, 80);
      });
    });
  }

  // --- SIDEBAR NAVIGATION ---
  function setupSidebarNavigation() {
    document.querySelectorAll('.admin-menu a').forEach(function(link) {
      link.addEventListener('click', function(e) {
        const target = this.getAttribute('href');
        if (!target.startsWith('#')) return; // Allow external links
        
        e.preventDefault();
        document.querySelectorAll('.admin-menu a').forEach(function(l) {
          l.classList.remove('active');
        });
        this.classList.add('active');
        
        navigateTo(target);
      });
    });
  }

  // --- FORM SUBMIT HANDLER ---
  function setupFormSubmit() {
    if (!productForm) return;
    
    productForm.addEventListener('submit', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const form = productForm;
      if (!form) return;
      
      const formData = new FormData(form);
      
      // Get image from select or custom input (allowlist: assets/, https:, data:image/)
      const imgSelect = document.getElementById('productImageSelect');
      const customInput = document.getElementById('customImageInput');
      let image = imgSelect ? imgSelect.value : '';
      if (customInput && customInput.value.trim()) {
        image = customInput.value.trim();
      }
      if (image && !/^(assets\/|https?:\/\/|data:image\/)/i.test(image)) {
        showToast('Image must be an assets/ path or https:// URL.', true);
        return;
      }
      if (image && (image.length > 500 || /[\s<>"']/.test(image))) {
        showToast('That image URL looks invalid.', true);
        return;
      }

      const stockVal = parseInt(formData.get('stock'), 10);
      const minVal = parseInt(formData.get('minStock'), 10);
      const priceVal = parseFloat(formData.get('price'));
      const productData = {
        name: String(formData.get('name') || '').trim(),
        brand: String(formData.get('brand') || '').trim(),
        category: formData.get('category') || '',
        price: formData.get('price') || 0,
        sku: String(formData.get('sku') || '').trim(),
        stock: isNaN(stockVal) ? 0 : stockVal,
        minStock: isNaN(minVal) ? 10 : Math.max(0, minVal),
        image: image,
        description: String(formData.get('description') || ''),
        specs: String(formData.get('specs') || '')
      };

      // Validate required fields (strict: reject NaN/non-numeric price)
      if (!productData.name) {
        showToast('Product name is required.', true);
        return;
      }
      if (!productData.category) {
        showToast('Category is required.', true);
        return;
      }
      if (!(priceVal > 0) || !isFinite(priceVal) || priceVal > 9999999) {
        showToast('Enter a valid price (0–9,999,999).', true);
        return;
      }
      productData.price = priceVal;
      if (productData.stock < 0 || productData.stock > 999999) {
        showToast('Stock must be 0–999999.', true);
        return;
      }

      // Duplicate SKU guard (block: SKUs must be unique)
      const productId = formData.get('productId');
      const editingId = productId ? parseInt(productId, 10) : null;
      if (productData.sku) {
        var dupe = products.find(function(p) {
          return String(p.sku).toLowerCase() === productData.sku.toLowerCase() && p.id !== editingId;
        });
        if (dupe) { showToast('SKU "' + productData.sku + '" is already used by "' + dupe.name + '".', true); return; }
      }
      
      if (editingId) {
        // Update existing product
        updateProduct(editingId, productData);
      } else {
        // Add new product
        addProduct(productData);
      }
    });
  }

  // --- ROLE-BASED ACCESS ---
  function getCurrentUserRole() {
    try {
      const user = window.SmileHubAuth && window.SmileHubAuth.getLoggedInUser();
      return user ? user.role : null;
    } catch(e) { return null; }
  }
  async function getCurrentUserRoleFresh() {
    try {
      const fbUser = firebase.auth().currentUser;
      if (fbUser) {
        const snap = await firebase.firestore().collection('users').doc(fbUser.uid).get();
        if (snap.exists) {
          const r = snap.data().role;
          if (r) {
            // Keep cache in sync so other pages see the correct role without extra fetch
            try {
              const cached = window.SmileHubAuth && window.SmileHubAuth.getLoggedInUser();
              if (cached && cached.role !== r) {
                cached.role = r;
                sessionStorage.setItem('smilehub_logged_in_user', JSON.stringify(cached));
              }
            } catch(e){}
            return r;
          }
        }
      }
    } catch(e){}
    return getCurrentUserRole();
  }
  var currentRole = null;
  var roleResolved = false;
  function isProductAdminRole(role) {
    return role === 'admin' || role === 'superadmin';
  }
  function isSectionAllowed(sectionId, role) {
    if (!role) return false;
    if (sectionId === '#inventory') sectionId = '#products';
    var target = document.querySelector(sectionId);
    if (!target) return false;
    var allowed = (target.getAttribute('data-role') || 'all').split(',');
    return allowed.indexOf(role) !== -1 || allowed.indexOf('all') !== -1;
  }
  function getCachedRoleTTL(){
    return null;
  }
  function setCachedRoleTTL(role){
    return;
  }
  function paintRole(role){
    currentRole = role;
    roleResolved = true;
    try { localStorage.removeItem('smilehub_role_cache'); } catch (e) {}
    var user = window.SmileHubAuth && window.SmileHubAuth.getLoggedInUser();
    if (user) {
      var av=document.getElementById('adminAvatar'), nm=document.getElementById('adminUsername'), rb=document.getElementById('adminRoleBadge');
      if (av) av.textContent = (user.name || 'A').charAt(0).toUpperCase();
      if (nm) nm.textContent = user.name;
      try { syncWelcome(); } catch (e) {}
      if (rb) { var lb={admin:'Admin',staff:'Staff',superadmin:'Super Admin',customer:'Customer'}; rb.textContent=lb[role]||role; }
    }
    document.querySelectorAll('.admin-menu a[data-role]').forEach(function(link){
      var allowed=link.getAttribute('data-role').split(',');
      link.style.display = (!allowed.includes(role) && !allowed.includes('all')) ? 'none' : '';
    });
    gateSectionsByRole(role);
    document.querySelectorAll('[data-role-btn]').forEach(function(el){
      var allowed=el.getAttribute('data-role-btn').split(',');
      el.style.display = (!allowed.includes(role)) ? 'none' : '';
    });
    enforceVisibleSection(role);
  }
  // Role gating owns sidebar links + action buttons, but for content
  // sections it may only HIDE disallowed ones — showing is owned solely by
  // navigateTo()/init, otherwise every role paint re-floods all pages.
  function gateSectionsByRole(role) {
    document.querySelectorAll('main section[data-role]').forEach(function(sec){
      var allowed=(sec.getAttribute('data-role') || 'all').split(',');
      if (!allowed.includes(role) && !allowed.includes('all')) sec.style.display = 'none';
    });
  }
  function enforceVisibleSection(role) {
    try {
      var visible = Array.prototype.filter.call(
        document.querySelectorAll('main section[data-role]'),
        function(s) { return s.style.display !== 'none'; }
      );
      var ok = visible.some(function(s) {
        var allowed=(s.getAttribute('data-role') || 'all').split(',');
        return allowed.includes(role) || allowed.includes('all');
      });
      if (!ok && typeof navigateTo === 'function') navigateTo('#dashboard');
    } catch (e) {}
  }
  function denyAdminAccess(reason) {
    var layout = document.querySelector('.admin-layout');
    if (layout) layout.style.visibility = 'hidden';
    showToast(reason || 'Access denied.', true);
    setTimeout(function() { window.location.replace('homepage.html?message=admin-only'); }, 900);
  }
  async function applyRoleVisibility() {
    try { localStorage.removeItem('smilehub_role_cache'); } catch (e) {}
    const role = await getCurrentUserRoleFresh();
    roleResolved = true;
    var allowedRoles = ['admin', 'staff', 'superadmin'];
    if (!role || allowedRoles.indexOf(role) === -1) {
      denyAdminAccess(!role ? 'Please sign in with a staff account.' : 'Your account does not have admin access.');
      return null;
    }
    // Layout has no adminLoading gate on main — paint directly.
    paintRole(role);

    // Update top bar with user info
    const user = window.SmileHubAuth && window.SmileHubAuth.getLoggedInUser();
    if (user) {
      const avatarEl = document.getElementById('adminAvatar');
      const nameEl = document.getElementById('adminUsername');
      const roleEl = document.getElementById('adminRoleBadge');
      if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
      if (nameEl) nameEl.textContent = user.name;
      try { syncWelcome(); } catch (e) {}
      if (roleEl) {
        const labels = { admin: 'Admin', staff: 'Staff', superadmin: 'Super Admin', customer: 'Customer' };
        roleEl.textContent = labels[role] || role;
      }
    }

    // Show/hide sidebar nav items based on data-role
    document.querySelectorAll('.admin-menu a[data-role]').forEach(function(link) {
      const allowedRoles = link.getAttribute('data-role').split(',');
      if (!allowedRoles.includes(role) && !allowedRoles.includes('all')) {
        link.style.display = 'none';
      } else {
        link.style.display = '';
      }
    });

    // Hide disallowed sections based on data-role (never show: navigateTo owns that)
    gateSectionsByRole(role);

    // Show/hide elements based on data-role-btn
    document.querySelectorAll('[data-role-btn]').forEach(function(el) {
      const allowedRoles = el.getAttribute('data-role-btn').split(',');
      if (!allowedRoles.includes(role)) {
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
    });
    enforceVisibleSection(role);
    return role;
  }

  // --- CMS ---
  function getDefaultCms() {
    return {
      heroHeadline: 'Your Trusted Dental Supply Partner',
      heroSubtitle: 'Quality dental products for clinics, dentists, and students across the Philippines.',
      heroCta: 'Shop Now',
      promoText: 'Free shipping on orders over ₱3,000',
      promoBtn: 'View Deals',
      storeTagline: 'SmileHub Dental Supplies',
      faqs: [
        { q: 'What payment methods do you accept?', a: 'We accept GCash, bank transfer, and cash on delivery within Metro Manila.' },
        { q: 'How long does shipping take?', a: 'Metro Manila orders arrive within 1-3 business days. Provincial orders may take 3-7 business days.' },
        { q: 'Can I return a product?', a: 'Yes, unopened items can be returned within 7 days of delivery. Contact support to initiate a return.' }
      ]
    };
  }

  var cmsCache = null;

  function loadCms() {
    return cmsCache || getDefaultCms();
  }

  function fetchCms(callback) {
    SmileHubData.getCms(function(data) {
      cmsCache = data;
      if (callback) callback(data);
    });
  }

  function saveCms(data) {
    cmsCache = data;
    SmileHubData.saveCms(data);
  }
  var cmsDirty = false;
  var cmsLastSavedText = (function(){ try { return localStorage.getItem('smilehub_cms_last_saved') || ''; } catch(e){ return ''; } })();
  function markCmsDirty(){
    cmsDirty = true;
    var dot=document.getElementById('cmsSaveDot');
    if(dot) dot.classList.remove('hidden');
  }
  function clearCmsDirty(){
    cmsDirty = false;
    var dot=document.getElementById('cmsSaveDot');
    if(dot) dot.classList.add('hidden');
    try {
      cmsLastSavedText = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
      localStorage.setItem('smilehub_cms_last_saved', cmsLastSavedText);
    } catch(e){}
    updateCmsHeader();
  }
  function updateCmsHeader(){
    var countEl=document.getElementById('cmsFaqCount');
    var sub=document.getElementById('cmsSub');
    var data=loadCms();
    if(countEl) countEl.textContent=data.faqs.length + ' question' + (data.faqs.length!==1?'s':'');
    if(sub){
      var base=data.faqs.length + ' questions • live storefront copy — changes apply on reload';
      if(cmsLastSavedText) base+=' • saved ' + cmsLastSavedText;
      sub.textContent=base;
    }
  }

  function renderCms() {
    var data = loadCms();
    var headline = document.getElementById('cmsHeroHeadline');
    var subtitle = document.getElementById('cmsHeroSubtitle');
    var cta = document.getElementById('cmsHeroCta');
    var promoText = document.getElementById('cmsPromoText');
    var promoBtn = document.getElementById('cmsPromoBtn');
    var tagline = document.getElementById('cmsStoreTagline');
    if (headline) headline.value = data.heroHeadline;
    if (subtitle) subtitle.value = data.heroSubtitle;
    if (cta) cta.value = data.heroCta;
    if (promoText) promoText.value = data.promoText;
    if (promoBtn) promoBtn.value = data.promoBtn;
    if (tagline) tagline.value = data.storeTagline;

    updateCmsHeader();
    var list = document.getElementById('cmsFaqList');
    if (!list) return;
    if (data.faqs.length === 0) {
      list.innerHTML = '<p class="muted" style="text-align:center;padding:20px;">No FAQs yet. Click "+ Add FAQ" to add one.</p>';
      return;
    }
    list.innerHTML = data.faqs.map(function(faq, i) {
      return '<div class="faq-card">' +
        '<div class="faq-fields">' +
          '<input class="faq-question" data-index="' + i + '" value="' + escapeHtml(faq.q || '').replace(/\n/g, '&#10;') + '" placeholder="Question" aria-label="FAQ question ' + (i + 1) + '" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;">' +
          '<textarea class="faq-answer" data-index="' + i + '" placeholder="Answer" aria-label="FAQ answer ' + (i + 1) + '" rows="2" style="padding:8px 12px;border:1px solid var(--border);border-radius:8px;">' + escapeHtml(faq.a || '') + '</textarea>' +
        '</div>' +
        '<div class="faq-actions">' +
          '<button class="icon-btn row-btn faq-up" data-index="' + i + '" aria-label="Move up" title="Move up"' + (i===0?' disabled':'') + '><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5"/><path d="M7 8l5-5 5 5"/></svg></button>' +
          '<button class="icon-btn row-btn faq-down" data-index="' + i + '" aria-label="Move down" title="Move down"' + (i===data.faqs.length-1?' disabled':'') + '><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M17 16l-5 5-5-5"/></svg></button>' +
          '<button class="icon-btn row-btn row-btn-danger delete-faq" data-index="' + i + '" aria-label="Remove" title="Remove"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg></button>' +
        '</div>' +
      '</div>';
    }).join('');

    list.querySelectorAll('.faq-up').forEach(function(btn){
      btn.addEventListener('click', function(){
        var idx=parseInt(this.dataset.index);
        if(idx===0) return;
        var d=loadCms();
        var tmp=d.faqs[idx]; d.faqs[idx]=d.faqs[idx-1]; d.faqs[idx-1]=tmp;
        saveCms(d); markCmsDirty(); renderCms();
      });
    });
    list.querySelectorAll('.faq-down').forEach(function(btn){
      btn.addEventListener('click', function(){
        var idx=parseInt(this.dataset.index);
        var d=loadCms();
        if(idx>=d.faqs.length-1) return;
        var tmp=d.faqs[idx]; d.faqs[idx]=d.faqs[idx+1]; d.faqs[idx+1]=tmp;
        saveCms(d); markCmsDirty(); renderCms();
      });
    });
    list.querySelectorAll('.delete-faq').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        var data = loadCms();
        data.faqs.splice(idx, 1);
        saveCms(data); markCmsDirty(); renderCms();
        showToast('FAQ removed', false, false);
      });
    });

    var cmsFaqTimer = null;
    list.querySelectorAll('.faq-question, .faq-answer').forEach(function(el) {
      el.addEventListener('input', function() {
        var data = loadCms();
        var questions = list.querySelectorAll('.faq-question');
        var answers = list.querySelectorAll('.faq-answer');
        questions.forEach(function(q, i) {
          if (data.faqs[i]) { data.faqs[i].q = q.value.slice(0, 300); }
        });
        answers.forEach(function(a, i) {
          if (data.faqs[i]) { data.faqs[i].a = a.value.slice(0, 2000); }
        });
        markCmsDirty();
        if (cmsFaqTimer) clearTimeout(cmsFaqTimer);
        cmsFaqTimer = setTimeout(function() { saveCms(data); }, 800);
      });
    });
  }

  function setupCms() {
    var addBtn = document.getElementById('addFaqBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        var data = loadCms();
        data.faqs.push({ q: 'New question', a: 'New answer' });
        saveCms(data); markCmsDirty(); renderCms();
        showToast('New FAQ added', false, true);
      });
    }
    // Mark dirty on hero/promo edits
    ['cmsHeroHeadline','cmsHeroSubtitle','cmsHeroCta','cmsPromoText','cmsPromoBtn','cmsStoreTagline'].forEach(function(id){
      var el=document.getElementById(id);
      if(el) el.addEventListener('input', markCmsDirty);
    });

    function saveCmsFromForm() {
      var data = loadCms();
      var headline = document.getElementById('cmsHeroHeadline');
      var subtitle = document.getElementById('cmsHeroSubtitle');
      var cta = document.getElementById('cmsHeroCta');
      var promoText = document.getElementById('cmsPromoText');
      var promoBtn = document.getElementById('cmsPromoBtn');
      var tagline = document.getElementById('cmsStoreTagline');
      if (headline) data.heroHeadline = headline.value.slice(0, 160);
      if (subtitle) data.heroSubtitle = subtitle.value.slice(0, 500);
      if (cta) data.heroCta = cta.value.slice(0, 60);
      if (promoText) data.promoText = promoText.value.slice(0, 160);
      if (promoBtn) data.promoBtn = promoBtn.value.slice(0, 60);
      if (tagline) data.storeTagline = tagline.value.slice(0, 160);

      // Collect FAQ data
      var questions = document.querySelectorAll('.faq-question');
      var answers = document.querySelectorAll('.faq-answer');
      questions.forEach(function(q, i) {
        if (data.faqs[i]) data.faqs[i].q = q.value.slice(0, 300);
      });
      answers.forEach(function(a, i) {
        if (data.faqs[i]) data.faqs[i].a = a.value.slice(0, 2000);
      });

      saveCms(data); clearCmsDirty(); addAuditLog('Updated CMS content');
      showToast('CMS changes saved! Reload homepage to see updates.', false, true);
    }

    var saveBtns = document.querySelectorAll('#saveCmsBtn, #saveCmsBtn2');
    saveBtns.forEach(function(btn) {
      btn.addEventListener('click', saveCmsFromForm);
    });
  }

  // --- ACCOUNT MANAGEMENT ---
  function renderAccounts() {
    var body = document.getElementById('accountsBody');
    if (!body) return;

    if (accounts.length === 0) {
      body.innerHTML = accountsLoadError
        ? '<tr><td colspan="7" class="text-center muted" style="padding:40px;">Couldn\'t load accounts (' + escapeHtml(accountsLoadError) + '). Sign in over localhost or hosting as an admin, then reopen Customers.</td></tr>'
        : '<tr><td colspan="7" class="text-center muted" style="padding:40px;">No accounts found.</td></tr>';
      updateAccountStats(accounts);
      var sub0=document.getElementById('customersSub'); if(sub0) sub0.textContent = accountsLoadError ? 'Couldn\'t load accounts' : 'No accounts yet';
      var cnt0=document.getElementById('accountFilterCount'); if(cnt0) cnt0.textContent='0 of 0';
      return;
    }

    var search = (document.getElementById('accountSearch') || {}).value || '';
    var roleFilter = (document.getElementById('accountRoleFilter') || {}).value || 'all';
    var statusFilter = (document.getElementById('accountStatusFilter') || {}).value || 'all';
    var sortVal = (document.getElementById('accountSort') || {}).value || 'name';
    // Build per-customer stats from orders (email + name fallback)
    var statsByEmail = {};
    try {
      getOrders().forEach(function(o){
        var keys=[];
        if(o.email && o.email.indexOf('@')>-1) keys.push(String(o.email).toLowerCase());
        if(o.customerEmail && o.customerEmail.indexOf('@')>-1) keys.push(String(o.customerEmail).toLowerCase());
        if(o.customer) keys.push('name:'+String(o.customer).toLowerCase());
        if(!keys.length && o.customer) keys.push(String(o.customer).toLowerCase());
        keys.forEach(function(k){
          if(!statsByEmail[k]) statsByEmail[k]={orders:0,spent:0};
          statsByEmail[k].orders+=1;
          statsByEmail[k].spent+= Number(o.total)||0;
        });
      });
    } catch(e){}
    function accStats(a){
      var em=String(a.email||'').toLowerCase();
      var s=statsByEmail[em];
      if(s) return s;
      var nm='name:'+String(a.name||'').toLowerCase();
      return statsByEmail[nm] || {orders:0,spent:0};
    }

    var filtered = accounts.filter(function(a) {
      var hay=(a.name+' '+a.email).toLowerCase();
      var matchesSearch=!search || hay.indexOf(search.toLowerCase())!==-1;
      var roleMatch=roleFilter==='all' || a.role===roleFilter;
      var statusVal=a.status==='suspended'?'suspended':'active';
      var statusMatch=statusFilter==='all' || statusVal===statusFilter;
      return matchesSearch && roleMatch && statusMatch;
    });
    filtered.sort(function(a,b){
      if(sortVal==='role'){
        var order={customer:0,staff:1,admin:2,superadmin:3};
        var diff=(order[a.role]||0)-(order[b.role]||0);
        if(diff!==0) return diff;
        return a.name.localeCompare(b.name);
      }
      if(sortVal==='status'){
        var av=a.status==='suspended'?1:0, bv=b.status==='suspended'?1:0;
        if(av!==bv) return av-bv;
        return a.name.localeCompare(b.name);
      }
      if(sortVal==='orders'){
        var ao=accStats(a).orders, bo=accStats(b).orders;
        if(bo!==ao) return bo-ao;
        return a.name.localeCompare(b.name);
      }
      if(sortVal==='spent'){
        var as=accStats(a).spent, bs=accStats(b).spent;
        if(bs!==as) return bs-as;
        return a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
    var sub=document.getElementById('customersSub');
    if(sub) sub.textContent=filtered.length+' of '+accounts.length+' accounts' + (search||roleFilter!=='all'||statusFilter!=='all' ? ' • filtered' : '');
    var countEl=document.getElementById('accountFilterCount');
    if(countEl) countEl.textContent=filtered.length+' of '+accounts.length;

    var currentUser = window.SmileHubAuth ? window.SmileHubAuth.getLoggedInUser() : null;
    var isSuper = currentUser && currentUser.role === 'superadmin';

    body.innerHTML = filtered.map(function(a) {
      var roleLabels = { customer: 'Customer', staff: 'Staff', admin: 'Admin', superadmin: 'Super Admin' };
      var roleClass = a.role === 'superadmin' ? 'role-superadmin' : a.role === 'admin' ? 'role-admin' : a.role === 'staff' ? 'role-staff' : 'role-customer';
      var statusText = a.status === 'suspended' ? 'Suspended' : 'Active';
      var statusClass = a.status === 'suspended' ? 'low' : 'delivered';
      var st = accStats(a);
      var initials = (a.name || a.email || '?').trim().charAt(0).toUpperCase();
      var phone = a.phone || a.phoneLocal || a.phoneE164 || a.phoneNumber || '';
      var phoneDisplay = phone ? escapeHtml(phone) : '<span class="muted">—</span>';
      var spentDisplay = '₱' + Number(st.spent||0).toLocaleString('en-PH',{minimumFractionDigits:2});

      var roleOptions = ['customer', 'staff', 'admin', 'superadmin'].map(function(r) {
        return '<option value="' + r + '" ' + (a.role === r ? 'selected' : '') + '>' + roleLabels[r] + '</option>';
      }).join('');

      return '<tr>' +
        '<td><div class="customer-cell"><span class="customer-avatar" aria-hidden="true">' + escapeHtml(initials) + '</span><span><strong>' + escapeHtml(a.name) + '</strong><br><span class="muted" style="font-size:0.82rem;">' + escapeHtml(a.email) + '</span></span></div></td>' +
        '<td>' + phoneDisplay + '</td>' +
        '<td style="font-variant-numeric: tabular-nums;">' + st.orders + '</td>' +
        '<td style="font-variant-numeric: tabular-nums;">' + spentDisplay + '</td>' +
        '<td>' + (isSuper
          ? '<select class="acc-role-select" data-email="' + a.email + '" style="padding:4px 8px;border-radius:6px;border:1px solid var(--border);font-size:0.8rem;">' + roleOptions + '</select>'
          : '<span class="status ' + roleClass + '">' + (roleLabels[a.role] || a.role) + '</span>') +
        '</td>' +
        '<td><span class="status ' + statusClass + '">' + statusText + '</span></td>' +
        '<td style="white-space:nowrap;">' +
          (a.email !== (currentUser ? currentUser.email : '')
            ? '<button class="btn btn-light acc-toggle-status" data-email="' + a.email + '" data-status="' + (a.status === 'suspended' ? 'active' : 'suspended') + '" style="padding:4px 10px;font-size:0.78rem;">' + (a.status === 'suspended' ? 'Activate' : 'Suspend') + '</button> '
            : '') +
          (isSuper && a.email !== (currentUser ? currentUser.email : '')
            ? '<button class="btn btn-danger acc-delete" data-email="' + a.email + '" style="padding:4px 10px;font-size:0.78rem;">Delete</button> '
            : '') +
          '<button class="btn btn-light" onclick="navigator.clipboard.writeText(\'' + a.email + '\')" style="padding:4px 8px;font-size:0.78rem;" title="Copy email">Copy</button>' +
        '</td></tr>';
    }).join('') || '<tr><td colspan="7" class="text-center muted" style="padding:40px;">No matching accounts.</td></tr>';

    // Role change handlers (superadmin only)
    body.querySelectorAll('.acc-role-select').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var email = this.dataset.email;
        var newRole = this.value;
        var idx = accounts.findIndex(function(a) { return a.email === email; });
        if (idx > -1) {
          var oldRole = accounts[idx].role;
          accounts[idx].role = newRole;
          window.SmileHubAuth.saveAccounts(accounts).then(renderAccounts).catch(function(error) { console.error('Account update failed:', error); showToast(saveErrorMessage('update accounts', error), true); });
          addAuditLog('Changed role for ' + email + ': ' + oldRole + ' → ' + newRole);
          showToast('Role updated for ' + email, false, true);
        }
      });
    });

    // Toggle status handlers
    body.querySelectorAll('.acc-toggle-status').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var email = this.dataset.email;
        var newStatus = this.dataset.status;
        var idx = accounts.findIndex(function(a) { return a.email === email; });
        if (idx > -1) {
          accounts[idx].status = newStatus;
          window.SmileHubAuth.saveAccounts(accounts).then(renderAccounts).catch(function(error) { console.error('Account update failed:', error); showToast(saveErrorMessage('update accounts', error), true); });
          addAuditLog((newStatus === 'suspended' ? 'Suspended' : 'Activated') + ' account: ' + email);
          showToast(email + ' ' + (newStatus === 'suspended' ? 'suspended' : 'activated'), false, true);
        }
      });
    });

    // Delete account handler (superadmin only)
    body.querySelectorAll('.acc-delete').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var email = this.dataset.email;
        var acc = accounts.find(function(a){ return a.email===email; });
        var displayName = acc ? acc.name : email;
        showAuthoredConfirm({
          eyebrow: 'Delete account',
          title: 'Delete "' + displayName + '"?',
          message: 'Delete account "' + email + '"?',
          impact: 'Permanently deletes the account and tombstones the email to prevent re-creation. This cannot be undone after 10 seconds.',
          keyword: 'DELETE',
          confirmLabel: 'Delete',
          cancelLabel: 'Cancel'
        }).then(function(ok){
          if (!ok) return;
        var idx = accounts.findIndex(function(a) { return a.email === email; });
        if (idx > -1) {
          var name = accounts[idx].name;
          accounts.splice(idx, 1);
          window.SmileHubAuth.saveAccounts(accounts).then(renderAccounts).catch(function(error) { console.error('Account update failed:', error); showToast(saveErrorMessage('update accounts', error), true); });
          var lowerEmail = email.toLowerCase();
          // Tombstone so getAccounts() never re-merges this email from users.
          firebase.firestore().collection('deleted_accounts').doc(lowerEmail).set({
            email: lowerEmail,
            originalEmail: email,
            deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
            deletedBy: (window.SmileHubAuth.getLoggedInUser() || {}).email || ''
          }).catch(function() {});
          // Remove the Firestore doc too, otherwise getAccounts() restores it on reload.
          firebase.firestore().collection('accounts').doc(email).delete()
            .catch(function(error) { console.warn('Could not delete account from Firestore:', error); });
          firebase.firestore().collection('accounts').doc(lowerEmail).delete().catch(function() {});
          // Also delete matching users/{uid} profile(s) — getAccounts() merges
          // users collection, so a lingering users doc resurrects the account.
          firebase.firestore().collection('users').where('email', '==', email).get()
            .then(function(snap) {
              snap.forEach(function(doc) {
                doc.ref.delete().catch(function() {});
              });
              if (snap.empty && email !== lowerEmail) {
                return firebase.firestore().collection('users').where('email', '==', lowerEmail).get();
              }
            })
            .then(function(snap2) {
              if (snap2 && !snap2.empty) {
                snap2.forEach(function(doc) { doc.ref.delete().catch(function() {}); });
              }
            })
            .catch(function() {});
          // Also clean up any pending invitation.
          firebase.firestore().collection('user_registrations').doc(email).delete().catch(function() {});
          firebase.firestore().collection('user_registrations').doc(lowerEmail).delete().catch(function() {});
          addAuditLog('Deleted account: ' + email + ' (' + name + ')');
          showToast('Account deleted: ' + email, false, false);
        }
        });
      });
    });

    updateAccountStats(accounts);
  }

  function updateAccountStats(accounts) {
    var total = accounts.length;
    var customers = accounts.filter(function(a) { return a.role === 'customer'; }).length;
    var staff = accounts.filter(function(a) { return a.role === 'staff'; }).length;
    var admins = accounts.filter(function(a) { return a.role === 'admin' || a.role === 'superadmin'; }).length;

    var el1 = document.getElementById('accTotal');
    var el2 = document.getElementById('accCustomers');
    var el3 = document.getElementById('accStaff');
    var el4 = document.getElementById('accAdmins');
    if (el1) el1.textContent = total;
    if (el2) el2.textContent = customers;
    if (el3) el3.textContent = staff;
    if (el4) el4.textContent = admins;
  }

  function setupAccountSearch() {
    var search = document.getElementById('accountSearch');
    var filter = document.getElementById('accountRoleFilter');
    var statusF = document.getElementById('accountStatusFilter');
    var sortSel = document.getElementById('accountSort');
    var exportBtn = document.getElementById('customersExportBtn');
    if (search) search.addEventListener('input', renderAccounts);
    if (filter) filter.addEventListener('change', renderAccounts);
    if (statusF) statusF.addEventListener('change', renderAccounts);
    if (sortSel) sortSel.addEventListener('change', renderAccounts);
    if (exportBtn) exportBtn.addEventListener('click', function(){
      var rows = accounts.filter(function(a){
        var searchVal=(document.getElementById('accountSearch')||{}).value||'';
        var roleVal=(document.getElementById('accountRoleFilter')||{}).value||'all';
        var statusVal=(document.getElementById('accountStatusFilter')||{}).value||'all';
        var hay=(a.name+' '+a.email).toLowerCase();
        if(searchVal && hay.indexOf(searchVal.toLowerCase())===-1) return false;
        if(roleVal!=='all' && a.role!==roleVal) return false;
        var s=a.status==='suspended'?'suspended':'active';
        if(statusVal!=='all' && s!==statusVal) return false;
        return true;
      });
      if(!rows.length){ showToast('No accounts to export', true); return; }
      var csv='Name,Email,Phone,Role,Status,Orders,Total Spent\n' + rows.map(function(a){
        var phone=a.phone||a.phoneLocal||a.phoneE164||'';
        // compute stats for this account
        var em=String(a.email||'').toLowerCase();
        var found=null;
        try {
          var orders=getOrders();
          var ordersCount=0, spent=0;
          orders.forEach(function(o){
            var emailMatch=false;
            if(o.email && String(o.email).toLowerCase()===em) emailMatch=true;
            else if(o.customer && String(o.customer).toLowerCase()===String(a.name).toLowerCase()) emailMatch=true;
            if(emailMatch){ ordersCount++; spent+=Number(o.total)||0; }
          });
          found={orders:ordersCount, spent:spent};
        } catch(e){ found={orders:0,spent:0}; }
        return [csvCell(a.name), csvCell(a.email), csvCell(phone), csvCell(a.role), csvCell(a.status || 'active'), found.orders, found.spent].join(',');
      }).join('\n');
      var blob=new Blob(["\uFEFF" + csv],{type:'text/csv;charset=utf-8'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='smilehub-customers-' + new Date().toISOString().slice(0,10)+'.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(url); }, 1000); addAuditLog('Exported ' + rows.length + ' accounts to CSV'); showToast('Accounts exported', false, true);
    });

    // Create account form toggle
    var showBtn = document.getElementById('showCreateAccountForm');
    var form = document.getElementById('createAccountForm');
    var cancelBtn = document.getElementById('cancelCreateAccount');
    if (showBtn && form) {
      showBtn.addEventListener('click', function() {
        var willShow = !form.classList.contains('show');
        form.classList.toggle('show');
        if (willShow) {
          var first = document.getElementById('createAccFirstName');
          if (first) try { first.focus(); } catch(e){}
        } else {
          form.classList.remove('was-validated');
          form.querySelectorAll('[aria-invalid]').forEach(function(el){ el.removeAttribute('aria-invalid'); });
        }
      });
    }
    if (cancelBtn && form) {
      cancelBtn.addEventListener('click', function() {
        form.classList.remove('show');
        form.classList.remove('was-validated');
        form.querySelectorAll('[aria-invalid]').forEach(function(el){ el.removeAttribute('aria-invalid'); });
        // keep draft: do not reset values, just hide
        try { showBtn.focus(); } catch(e){}
      });
    }
    // Clear aria-invalid on input
    if (form) {
      form.querySelectorAll('input, select').forEach(function(el){
        el.addEventListener('input', function(){ this.removeAttribute('aria-invalid'); });
        el.addEventListener('change', function(){ this.removeAttribute('aria-invalid'); });
      });
    }

    // Create account submit
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        form.classList.add('was-validated');
        if (!form.checkValidity()) {
          var firstInvalid = form.querySelector(':invalid');
          if (firstInvalid) {
            firstInvalid.setAttribute('aria-invalid','true');
            try { firstInvalid.focus(); } catch(e2){}
          }
          showToast('Please fix the highlighted fields', true);
          return;
        }
        form.querySelectorAll('[aria-invalid]').forEach(function(el){ el.removeAttribute('aria-invalid'); });
        var firstName = document.getElementById('createAccFirstName').value.trim();
        var lastName = document.getElementById('createAccLastName').value.trim();
        var email = document.getElementById('createAccEmail').value.trim().toLowerCase();
        var password = document.getElementById('createAccPassword').value;
        var phoneVal = (document.getElementById('createAccPhone') && document.getElementById('createAccPhone').value.trim()) || '';
        var role = document.getElementById('createAccRole').value;

        if (password.length < 6) {
          var pwInput=document.getElementById('createAccPassword');
          if(pwInput) pwInput.setAttribute('aria-invalid','true');
          showToast('Password must be at least 6 characters', true);
          return;
        }

        if (accounts.some(function(a) { return a.email === email; })) {
          showToast('Email already registered', true);
          return;
        }

        showToast('Creating account...');

        // Use a secondary app so creating the new Auth user doesn't sign out the current admin
        var secondaryApp;
        try { secondaryApp = firebase.app('Secondary'); } catch (e) { secondaryApp = firebase.initializeApp(firebaseConfig, 'Secondary'); }

        // Allow re-creating a previously deleted email — clear its tombstone first
        firebase.firestore().collection('deleted_accounts').doc(email.toLowerCase()).delete().catch(function() {});
        firebase.firestore().collection('deleted_accounts').doc(email).delete().catch(function() {});

        secondaryApp.auth().createUserWithEmailAndPassword(email, password).then(function(cred) {
          var newUid = cred.user.uid;
          var displayName = firstName + ' ' + lastName;
          // Firestore rules require an unclaimed invitation for elevated roles:
          // 1) create invitation with claimed:false, 2) create users/{uid} (invitedRole check), 3) mark claimed:true
          return firebase.firestore().collection('user_registrations').doc(email).set({
            firstName: firstName,
            lastName: lastName,
            displayName: displayName,
            email: email,
            role: role,
            claimed: false
          }).catch(function() {}).then(function() {
            return firebase.firestore().collection('users').doc(newUid).set({
              firstName: firstName,
              lastName: lastName,
              displayName: displayName,
              fullName: displayName,
              email: email,
              role: role,
              phone: phoneVal,
              address: ''
            });
          }).then(function() {
            return Promise.all([
              firebase.firestore().collection('accounts').doc(email).set({
                firstName: firstName,
                lastName: lastName,
                name: displayName,
                email: email,
                phone: phoneVal,
                address: '',
                role: role,
                status: 'active'
              }),
              firebase.firestore().collection('user_registrations').doc(email).update({
                claimed: true,
                claimedUid: newUid,
                claimedAt: firebase.firestore.FieldValue.serverTimestamp()
              }).catch(function() {
                return firebase.firestore().collection('user_registrations').doc(email).set({
                  firstName: firstName,
                  lastName: lastName,
                  displayName: displayName,
                  email: email,
                  role: role,
                  claimed: true,
                  claimedUid: newUid,
                  claimedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, {merge:true}).catch(function(){});
              })
            ]);
          }).then(function() {
            return secondaryApp.auth().signOut();
          }).then(function() {
            var newAccount = {
              firstName: firstName,
              lastName: lastName,
              name: displayName,
              email: email,
              phone: phoneVal,
              address: '',
              role: role,
              status: 'active'
            };
            accounts.push(newAccount);
            // Keep the merged list in sync (best-effort)
            return window.SmileHubAuth.saveAccounts(accounts).catch(function() {});
          }).then(function() {
            form.classList.remove('show');
            form.classList.remove('was-validated');
            form.querySelectorAll('[aria-invalid]').forEach(function(el){ el.removeAttribute('aria-invalid'); });
            form.reset();
            renderAccounts();
            addAuditLog('Created account: ' + email + ' (' + role + ')');
            showToast('Account created — ' + email + ' can log in now!', false, true);
          });
        }).catch(function(error) {
          if (error && error.code === 'auth/email-already-in-use') {
            // Auth user already exists (previous attempt partially succeeded) — fix Firestore via invitation flow
            showToast('Auth already exists — repairing Firestore for ' + email + '...', false, false);
            var displayName2 = firstName + ' ' + lastName;
            return firebase.firestore().collection('users').where('email','==',email).get().catch(function(){ return { empty:true, forEach:function(){} }; }).then(function(snap){
              var existingUid = null;
              if (snap && snap.forEach) snap.forEach(function(doc){ existingUid = doc.id; });
              // 1) Ensure invitation exists with claimed:false so users create/update can claim elevated role
              return firebase.firestore().collection('user_registrations').doc(email).set({
                firstName:firstName,lastName:lastName,displayName:displayName2,email:email,role:role,claimed:false
              }).catch(function(){}).then(function(){
                if (existingUid) {
                  // Role cannot be changed via update (rule blocks it) — delete and recreate
                  return firebase.firestore().collection('users').doc(existingUid).delete().catch(function(){}).then(function(){
                    return firebase.firestore().collection('users').doc(existingUid).set({
                      firstName:firstName,lastName:lastName,displayName:displayName2,fullName:displayName2,email:email,role:role,phone:'',address:''
                    });
                  });
                } else {
                  // No users doc yet — the next login's self-heal will create it, but create a placeholder
                  // Find uid via Auth is not possible from client, so just ensure invitation + accounts
                  return Promise.resolve();
                }
              }).then(function(){
                return Promise.all([
                  firebase.firestore().collection('accounts').doc(email).set({
                    firstName:firstName,lastName:lastName,name:displayName2,email:email,phone:'',address:'',role:role,status:'active'
                  }),
                  firebase.firestore().collection('user_registrations').doc(email).update({
                    claimed:true, claimedAt: firebase.firestore.FieldValue.serverTimestamp()
                  }).catch(function(){
                    return firebase.firestore().collection('user_registrations').doc(email).set({
                      firstName:firstName,lastName:lastName,displayName:displayName2,email:email,role:role,claimed:true,claimedAt:firebase.firestore.FieldValue.serverTimestamp()
                    }, {merge:true}).catch(function(){});
                  })
                ]);
              }).then(function(){
                // Clear tombstone so getAccounts() shows it again
                return firebase.firestore().collection('deleted_accounts').doc(email.toLowerCase()).delete().catch(function(){});
              });
            }).then(function(){
              var newAccount2 = { firstName:firstName,lastName:lastName,name:displayName2,email:email,phone:'',address:'',role:role,status:'active' };
              if (!accounts.some(function(a){ return a.email===email; })) accounts.push(newAccount2);
              return window.SmileHubAuth.saveAccounts(accounts).catch(function(){});
            }).then(function(){
              form.classList.remove('show'); form.reset(); renderAccounts();
              addAuditLog('Repaired account: ' + email + ' (' + role + ')');
              showToast('Account repaired — ' + email + ' can log in now! Have them refresh and log in again.', false, true);
            });
          }
          var msg = error && error.message ? error.message : String(error);
          if (error && error.code === 'auth/weak-password') msg = 'Password is too weak.';
          else if (error && error.code === 'auth/invalid-email') msg = 'Invalid email address.';
          showToast(msg, true);
        });
      });
    }
  }

  // --- REPORTS ---
  var reportChartInstance = null;
  var reportStackedInstance = null;
  var reportLineInstance = null;
  var reportOrdersBarInstance = null;
  var reportTrendGranularity = 'monthly';

  function renderReports(period) {
    period = period || 'all';
    var orders = getOrders();

    // Date filter (orderTime-safe: covers createdAt-only mobile orders)
    var now = new Date();
    var filtered = orders.filter(function(o) {
      if (period === 'all') return true;
      var ts = orderTime(o);
      if (!ts) return false;
      var d = new Date(ts);
      if (period === 'today') return d.toDateString() === now.toDateString();
      if (period === 'week') {
        var weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
        return d >= weekAgo;
      }
      if (period === 'month') {
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });

    // Stats (revenue excludes Cancelled/Returned/Refunded)
    var totalOrders = filtered.length;
    var revenueRows = filtered.filter(function(o) { return isActiveOrder(o.status); });
    var totalRevenue = revenueRows.reduce(function(sum, o) { return sum + (Number(o.total) || 0); }, 0);
    var totalItems = filtered.reduce(function(sum, o) {
      return sum + (o.items ? o.items.reduce(function(s, i) { return s + (Number(i.quantity) || 1); }, 0) : 0);
    }, 0);
    var avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    setText('reportTotalOrders', totalOrders);
    setText('reportRevenue', '₱' + totalRevenue.toLocaleString('en-PH', {minimumFractionDigits: 2}));
    setText('reportAvgOrder', '₱' + avgOrder.toLocaleString('en-PH', {minimumFractionDigits: 2}));
    setText('reportItemsSold', totalItems);

    // Product breakdown (orders = distinct orders containing the product)
    var productMap = {};
    var seenPerProduct = {};
    filtered.forEach(function(o) {
      if (o.items) {
        o.items.forEach(function(item) {
          var name = item.name || 'Unknown';
          if (!productMap[name]) { productMap[name] = { orders: 0, units: 0, revenue: 0 }; seenPerProduct[name] = {}; }
          var qty = Number(item.quantity) || 1;
          productMap[name].units += qty;
          productMap[name].revenue += qty * (Number(item.price) || 0);
          if (o.number && !seenPerProduct[name][o.number]) {
            seenPerProduct[name][o.number] = true;
            productMap[name].orders += 1;
          }
        });
      }
    });

    var body = document.getElementById('reportProductBody');
    if (body) {
      var sorted = Object.keys(productMap).sort(function(a, b) { return productMap[b].revenue - productMap[a].revenue; });
      if (sorted.length === 0) {
        body.innerHTML = '<tr><td colspan="4" class="text-center muted" style="padding:30px;">No sales data yet</td></tr>';
      } else {
        body.innerHTML = sorted.map(function(name) {
          var p = productMap[name];
          return '<tr><td><strong>' + escapeHtml(name) + '</strong></td><td>' + p.orders + '</td><td>' + p.units + '</td><td>₱' + p.revenue.toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</td></tr>';
        }).join('');
      }
    }

    // Orders by status chart
    var statusCounts = {};
    filtered.forEach(function(o) {
      var s = o.status || 'Pending';
      statusCounts[s] = (statusCounts[s] || 0) + 1;
    });
    var statusLabels = Object.keys(statusCounts);
    var statusData = statusLabels.map(function(s) { return statusCounts[s]; });
    var statusColors = {
      'Pending': '#f0a320', 'Processing': '#1261a0', 'Shipped': '#0f9d9a',
      'Delivered': '#1e9b61', 'Cancelled': '#d64545', 'Returned': '#D97706', 'Refunded': '#7C3AED'
    };
    var colors = statusLabels.map(function(s) { return statusColors[s] || '#6b7a8c'; });

    var ctx = document.getElementById('reportStatusChart');
    if (ctx && typeof Chart !== 'undefined') {
      if (reportChartInstance) { reportChartInstance.destroy(); reportChartInstance = null; }
      reportChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: statusLabels,
          datasets: [{ data: statusData, backgroundColor: colors, borderWidth: 0 }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10, font: { size: 10 } } } },
          cutout: '60%'
        }
      });
    }

    // Payment summary (cancelled/returned/refunded excluded from revenue)
    var summary = document.getElementById('reportPaymentSummary');
    if (summary) {
      var validRows = filtered.filter(function(o) { return isActiveOrder(o.status); });
      var totalVal = validRows.reduce(function(s, o) { return s + (Number(o.total) || 0); }, 0);
      var pendingVal = filtered.filter(function(o) { return o.status === 'Pending' || o.status === 'Processing'; }).reduce(function(s, o) { return s + (Number(o.total) || 0); }, 0);
      var completedVal = filtered.filter(function(o) { return o.status === 'Delivered'; }).reduce(function(s, o) { return s + (Number(o.total) || 0); }, 0);
      summary.innerHTML =
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span>Total Revenue (excl. cancelled)</span><strong>₱' + totalVal.toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span>Pending / Processing</span><strong style="color:#f0a320;">₱' + pendingVal.toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>Fulfilled (Delivered)</span><strong style="color:#1e9b61;">₱' + completedVal.toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid var(--border);margin-top:4px;"><span>Orders Count</span><strong>' + filtered.length + '</strong></div>';
    }
    // Reports header sub + scope disclosure
    var repSub = document.getElementById('reportsSub');
    var scopeNote = document.getElementById('reportsScopeNote');
    var labelForSub = (document.getElementById('reportPeriod')||{}).options ? (document.getElementById('reportPeriod').options[document.getElementById('reportPeriod').selectedIndex]||{}).text || period : period;
    var granForSub = reportTrendGranularity === 'annually' ? 'Annually' : 'Monthly';
    if (repSub) {
      if (!orders.length && ordersLoadError) {
        repSub.textContent = 'Couldn\'t load orders (' + ordersLoadError + ') — sign in over localhost or hosting as staff.';
      } else {
        repSub.textContent = labelForSub + ' • ' + granForSub + ' • ' + filtered.length + ' orders • ₱' + totalVal.toLocaleString('en-PH',{minimumFractionDigits:2}) + ' live';
      }
    }
    if (scopeNote) {
      scopeNote.textContent = 'Period: ' + labelForSub + ' • Granularity: ' + granForSub + ' • Export adds monthly breakdown + top 10 customers';
    }
    // Inspiration: 4-card grid — real-time, theme-aware
    try {
      var isDarkReports = document.body.classList.contains('dark');
      var gridColorReports = isDarkReports ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
      var mutedReports = (function(){ try { return getComputedStyle(document.body).getPropertyValue('--muted').trim() || '#475569'; } catch(e){ return '#475569'; } })();
      if (typeof Chart !== 'undefined') { try { Chart.defaults.font.family = '"DM Sans", -apple-system, "Segoe UI", sans-serif'; Chart.defaults.color = mutedReports; } catch(e){} }
      // Collected vs Pending stacked (last 6 months)
      (function(){
        var canvas = document.getElementById('reportStackedBar');
        var empty = document.getElementById('reportStackedEmpty');
        if (!canvas) return;
        if (reportStackedInstance) { reportStackedInstance.destroy(); reportStackedInstance=null; }
        var now = new Date();
        var labels=[], collected=[], pending=[];
        for(var i=5;i>=0;i--){
          var d=new Date(now.getFullYear(), now.getMonth()-i, 1);
          labels.push(d.toLocaleDateString('en-PH',{month:'short'}));
          collected.push(0); pending.push(0);
        }
        var hasData=false;
        filtered.forEach(function(o){
          if (!isActiveOrder(o.status) && o.status!=='Pending') return;
          var t=orderTime(o); var dt=new Date(t);
          var diff=(now.getFullYear()-dt.getFullYear())*12 + (now.getMonth()-dt.getMonth());
          if(diff>=0 && diff<6){
            var idx=5-diff;
            var val=Number(o.total)||0;
            if(o.status==='Pending') pending[idx]+=val; else collected[idx]+=val;
            if(val>0) hasData=true;
          }
        });
        if(empty) empty.classList.toggle('hidden', hasData);
        canvas.style.display = hasData ? '' : 'none';
        var legend = canvas.parentElement ? canvas.parentElement.nextElementSibling : null;
        // legend is the colored dots row after canvas wrapper — keep visible only with data
        if (legend && legend.style) legend.style.display = hasData ? 'flex' : 'none';
        if(!hasData) return;
        var tealLight = isDarkReports ? '#38bdf8' : '#0ea5e9';
        var amber = isDarkReports ? '#fbbf24' : '#f59e0b';
        reportStackedInstance = new Chart(canvas, {
          type:'bar',
          data:{ labels: labels, datasets:[
            { label:'Collected', data: collected, backgroundColor: tealLight, borderRadius: 6, stack:'s' },
            { label:'Pending', data: pending, backgroundColor: amber, borderRadius: 6, stack:'s' }
          ]},
          options:{
            responsive:true, maintainAspectRatio:false,
            interaction:{ mode:'index', intersect:false },
            plugins:{
              legend:{ display:false },
              tooltip:{ callbacks:{ label:function(c){ return ' ' + c.dataset.label + ': ₱' + Number(c.parsed.y).toLocaleString('en-PH',{minimumFractionDigits:2}); } } }
            },
            scales:{
              x:{ stacked:true, grid:{ display:false }, border:{ display:false }, ticks:{ font:{size:11} } },
              y:{ stacked:true, beginAtZero:true, grid:{ color:gridColorReports }, border:{ display:false }, ticks:{ callback:function(v){ return '₱'+(v>=1000?(v/1000).toFixed(0)+'k':v); }, font:{size:10}, maxTicksLimit:5 } }
            }
          }
        });
      })();
      // Revenue line — Monthly vs Annually
      (function(){
        var canvas=document.getElementById('reportRevenueLine');
        var empty=document.getElementById('reportLineEmpty');
        if(!canvas) return;
        if(reportLineInstance){ reportLineInstance.destroy(); reportLineInstance=null; }
        var hasData=false;
        var labels=[], data=[];
        var now=new Date();
        if(reportTrendGranularity==='annually'){
          for(var y=4;y>=0;y--){
            var yr=now.getFullYear()-y;
            labels.push(String(yr));
            var sum=0;
            filtered.forEach(function(o){
              var dt=new Date(orderTime(o));
              if(dt.getFullYear()===yr && isActiveOrder(o.status)){ sum+=Number(o.total)||0; if(sum>0) hasData=true; }
            });
            data.push(sum);
            if(sum>0) hasData=true;
          }
        } else {
          for(var i=5;i>=0;i--){
            var d=new Date(now.getFullYear(), now.getMonth()-i, 1);
            labels.push(d.toLocaleDateString('en-PH',{month:'short'}));
            data.push(0);
          }
          filtered.forEach(function(o){
            if(!isActiveOrder(o.status)) return;
            var t=orderTime(o); var dt=new Date(t);
            var diff=(now.getFullYear()-dt.getFullYear())*12 + (now.getMonth()-dt.getMonth());
            if(diff>=0 && diff<6){ data[5-diff]+=Number(o.total)||0; if(Number(o.total)>0) hasData=true; }
          });
        }
        if(empty) empty.classList.toggle('hidden', hasData);
        canvas.style.display = hasData ? '' : 'none';
        if(!hasData) return;
        var lineColor = isDarkReports ? '#e2e8f0' : '#1e293b';
        var fillColor = isDarkReports ? 'rgba(226,232,240,0.08)' : 'rgba(30,41,59,0.06)';
        reportLineInstance = new Chart(canvas, {
          type:'line',
          data:{ labels: labels, datasets:[{ label:'Revenue', data: data, borderColor: lineColor, backgroundColor: fillColor, fill:true, tension:0.35, borderWidth:2, pointRadius:3, pointHoverRadius:5 }]},
          options:{
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:function(c){ return ' ₱' + Number(c.parsed.y).toLocaleString('en-PH',{minimumFractionDigits:2}); } } } },
            scales:{
              x:{ grid:{ display:false }, border:{ display:false }, ticks:{ font:{size:11} } },
              y:{ beginAtZero:true, grid:{ color:gridColorReports }, border:{ display:false }, ticks:{ callback:function(v){ return '₱'+(v>=1000?(v/1000).toFixed(0)+'k':v); }, font:{size:10}, maxTicksLimit:5 } }
            }
          }
        });
      })();
      // New Orders by Month bars
      (function(){
        var canvas=document.getElementById('reportOrdersBar');
        var empty=document.getElementById('reportOrdersBarEmpty');
        if(!canvas) return;
        if(reportOrdersBarInstance){ reportOrdersBarInstance.destroy(); reportOrdersBarInstance=null; }
        var now=new Date();
        var labels=[], counts=[0,0,0,0,0,0];
        for(var i=5;i>=0;i--){ var d=new Date(now.getFullYear(), now.getMonth()-i, 1); labels.push(d.toLocaleDateString('en-PH',{month:'short'})); }
        var hasData=false;
        filtered.forEach(function(o){
          var t=orderTime(o); var dt=new Date(t);
          var diff=(now.getFullYear()-dt.getFullYear())*12 + (now.getMonth()-dt.getMonth());
          if(diff>=0 && diff<6){ counts[5-diff]+=1; hasData=true; }
        });
        if(empty) empty.classList.toggle('hidden', hasData);
        canvas.style.display = hasData ? '' : 'none';
        if(!hasData) return;
        var peakIdx = counts.indexOf(Math.max.apply(null, counts));
        var track = isDarkReports ? 'rgba(148,163,184,0.28)' : '#E8E8EB';
        var peak = isDarkReports ? '#f1f5f9' : '#1e293b';
        reportOrdersBarInstance = new Chart(canvas, {
          type:'bar',
          data:{ labels: labels, datasets:[{ data: counts, backgroundColor: counts.map(function(v,i){ return i===peakIdx?peak:track; }), borderRadius:8, maxBarThickness:36 }]},
          options:{
            responsive:true, maintainAspectRatio:false,
            plugins:{ legend:{ display:false }, tooltip:{ callbacks:{ label:function(c){ return ' ' + c.parsed.y + ' orders'; } } } },
            scales:{
              y:{ beginAtZero:true, ticks:{ stepSize:1, precision:0, font:{size:10} }, grid:{ color:gridColorReports }, border:{ display:false } },
              x:{ grid:{ display:false }, border:{ display:false }, ticks:{ font:{size:11} } }
            }
          }
        });
      })();
      // Top Customers (Orders + Revenue + Share)
      (function(){
        var body=document.getElementById('reportTopCustomersBody');
        var sub=document.getElementById('reportTopCustomersSub');
        if(!body) return;
        var map={};
        var totalRev=0;
        filtered.forEach(function(o){
          if(!o.customer && !o.email) return;
          // Group by email when available to avoid merging same-name customers.
          var k=String(o.email||o.customer||'Unknown').toLowerCase().trim();
          var label=(o.customer||o.email||'Unknown').trim();
          if(!map[k]) map[k]={ customer:label, orders:0, revenue:0 };
          map[k].orders+=1;
          map[k].revenue+= Number(o.total)||0;
          totalRev+= Number(o.total)||0;
        });
        var sorted=Object.keys(map).sort(function(a,b){ return map[b].revenue - map[a].revenue; }).slice(0,5);
        if(sub) sub.textContent = sorted.length ? sorted.length + ' customers' : '';
        if(!sorted.length){
          body.innerHTML='<tr><td colspan="4" class="text-center muted" style="padding:24px;">No customers yet</td></tr>';
          return;
        }
        body.innerHTML = sorted.map(function(k){
          var m=map[k];
          var share = totalRev ? Math.round((m.revenue/totalRev)*100) : 0;
          return '<tr><td><strong>' + escapeHtml(m.customer) + '</strong></td><td>' + m.orders + '</td><td>₱' + m.revenue.toLocaleString('en-PH',{minimumFractionDigits:2}) + '</td><td><span style="display:inline-flex;align-items:center;gap:8px;white-space:nowrap;">' + share + '%<span style="display:inline-block;width:60px;height:6px;border-radius:999px;background:var(--muted-light);overflow:hidden;vertical-align:middle;"><span style="display:block;height:100%;width:' + share + '%;background:var(--blue);border-radius:999px;"></span></span></span></td></tr>';
        }).join('');
      })();
    } catch(e){ console.warn('Reports inspiration render failed', e); }
  }

  function printReport() {
    var period = document.getElementById('reportPeriod');
    var label = period ? period.options[period.selectedIndex].text : 'All Time';
    var section = document.getElementById('reports');
    if (!section) return;
    var win = window.open('', '_blank');
    if (!win) { showToast('Allow popups to print the report.', true); return; }
    function rowText(tr) {
      return Array.prototype.map.call(tr.querySelectorAll('th,td'), function(c) { return c.textContent.trim(); }).join(' | ');
    }
    var lines = ['SmileHub Sales Report — ' + label + ' — Generated ' + new Date().toLocaleString()];
    lines.push('Totals: Orders ' + ((document.getElementById('reportTotalOrders') || {}).textContent || '') +
      ', Revenue ' + ((document.getElementById('reportRevenue') || {}).textContent || '') +
      ', Avg ' + ((document.getElementById('reportAvgOrder') || {}).textContent || '') +
      ', Units ' + ((document.getElementById('reportItemsSold') || {}).textContent || ''));
    Array.prototype.forEach.call(section.querySelectorAll('#reportProductBody tr'), function(tr) { lines.push(' - ' + rowText(tr)); });
    var escLines = lines.map(function(l) { return escapeHtml(l); }).join('<br>');
    win.document.write('<html><head><title>Sales Report - ' + escapeHtml(label) + '</title>' +
      '<style>body{font-family:"DM Sans",system-ui,sans-serif;padding:30px;color:#203047;}' +
      'h2{margin:0 0 4px;}.muted{color:#6b7a8c;font-size:0.9rem;}' +
      '@media print{body{padding:0;}}</style></head><body>' +
      '<h1>Sales Report</h1><p class="muted">' + escapeHtml(label) + ' · Generated ' + escapeHtml(new Date().toLocaleString()) + '</p>' +
      '<div>' + escLines + '</div>' +
      '</body></html>');
    win.document.close();
    setTimeout(function() { try { win.print(); } catch (e) {} }, 500);
  }

  // --- PRINT ORDER SLIP (escaped, popup-safe) ---
  function printOrderSlip(orderNumber) {
    var orders = getOrders();
    var order = orders.find(function(o) { return o.number === orderNumber; });
    if (!order) { showToast('Order not found', true); return; }

    var itemsHtml = order.items ? order.items.map(function(item) {
      var qty = Number(item.quantity) || 1;
      return '<tr><td>' + escapeHtml(item.name || 'Item') + '</td><td>' + qty + '</td><td>₱' + Number(item.price).toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</td><td>₱' + Number(qty * item.price).toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</td></tr>';
    }).join('') : '';

    var win = window.open('', '_blank');
    if (!win) { showToast('Allow popups to print the slip.', true); return; }
    win.document.write('<html><head><title>Order Slip - ' + escapeHtml(order.number) + '</title>' +
      '<style>' +
      'body{font-family:"DM Sans",system-ui,sans-serif;padding:40px;color:#203047;max-width:700px;margin:auto;}' +
      '.header{text-align:center;border-bottom:2px solid #1261a0;padding-bottom:20px;margin-bottom:24px;}' +
      '.header h1{margin:0;color:#1261a0;}.header p{margin:4px 0 0;color:#6b7a8c;}' +
      '.info{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;}' +
      '.info div{padding:8px 12px;background:#f4f7fa;border-radius:8px;}' +
      '.info strong{display:block;font-size:0.8rem;color:#6b7a8c;text-transform:uppercase;}' +
      'table{width:100%;border-collapse:collapse;margin:16px 0;}' +
      'th{padding:10px 12px;text-align:left;border-bottom:2px solid #1261a0;font-size:0.8rem;text-transform:uppercase;color:#6b7a8c;}' +
      'td{padding:10px 12px;border-bottom:1px solid #dce5ec;}' +
      '.total-row td{border-top:2px solid #203047;font-weight:700;font-size:1.1rem;}' +
      '.footer{text-align:center;margin-top:32px;padding-top:16px;border-top:1px solid #dce5ec;color:#6b7a8c;font-size:0.85rem;}' +
      '@media print{body{padding:20px;}button{display:none;}}' +
      '</style></head><body>' +
      '<div class="header"><h1>SmileHub Dental Supplies</h1><p>Order Slip</p></div>' +
      '<div class="info">' +
      '<div><strong>Order #</strong>' + escapeHtml(order.number) + '</div>' +
      '<div><strong>Date</strong>' + escapeHtml(order.date) + '</div>' +
      '<div><strong>Customer</strong>' + escapeHtml(order.customer) + '</div>' +
      '<div><strong>Status</strong>' + escapeHtml(order.status) + '</div>' +
      '<div style="grid-column:span 2;"><strong>Shipping Address</strong>' + escapeHtml(order.address || 'N/A') + '</div>' +
      '</div>' +
      '<table><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>' + itemsHtml +
      '<tr class="total-row"><td colspan="3" style="text-align:right;">Total</td><td>₱' + Number(order.total).toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="footer">Thank you for your business! &middot; SmileHub Dental Supplies</div>' +
      '<div style="text-align:center;margin-top:16px;"><button onclick="window.print()" style="padding:10px 24px;border:1px solid #1261a0;border-radius:8px;background:#1261a0;color:white;cursor:pointer;">Print</button></div>' +
      '</body></html>');
    win.document.close();
  }

  // --- AUDIT TRAIL ---
  var auditLogsCache = [];

  function addAuditLog(action) {
    try {
      var user = window.SmileHubAuth ? window.SmileHubAuth.getLoggedInUser() : null;
      var name = user ? user.name : 'Unknown';
      var entry = {
        time: new Date().toLocaleString(),
        admin: name,
        action: action,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      };
      auditLogsCache.unshift(entry);
      if (auditLogsCache.length > 200) auditLogsCache = auditLogsCache.slice(0, 200);
      firebase.firestore().collection('audit_logs').add(entry).catch(function() {});
      var auditSection = document.getElementById('audit');
      if (auditSection && auditSection.style.display !== 'none') {
        renderAuditLogs();
      }
    } catch(e) {}
  }

  function getAuditLogs() {
    return auditLogsCache;
  }

  function fetchAuditLogs(callback) {
    firebase.firestore().collection('audit_logs').orderBy('timestamp', 'desc').limit(200).get().then(function(snapshot) {
      auditLogsCache = [];
      snapshot.forEach(function(doc) {
        var d = doc.data();
        if (d && d.action) auditLogsCache.push(d);
      });
      // Empty means empty — never seed fake entries into the real log.
      if (callback) callback(auditLogsCache);
    }).catch(function() {
      if (callback) callback(auditLogsCache || []);
    });
  }

  function getAuditCategory(action) {
    var a = (action || '').toLowerCase();
    if (a.indexOf('stock') !== -1 || a.indexOf('inventory') !== -1 || a.indexOf('bulk') !== -1) return 'stock';
    if (a.indexOf('order') !== -1 || a.indexOf('shipped') !== -1 || a.indexOf('delivered') !== -1 || a.indexOf('pending') !== -1) return 'order';
    if (a.indexOf('product') !== -1) return 'product';
    if (a.indexOf('account') !== -1 || a.indexOf('role') !== -1 || a.indexOf('suspended') !== -1 || a.indexOf('activated') !== -1 || a.indexOf('pre-registered') !== -1) return 'account';
    if (a.indexOf('cms') !== -1 || a.indexOf('promotion') !== -1 || a.indexOf('faq') !== -1) return 'cms';
    return 'other';
  }
  function getAuditIcon(cat) {
    return '';
  }
  function getAuditBadge(cat) {
    var colors = {
      stock: 'background:#fff3cd;color:#8a6d00;border:1px solid #ffe69c;',
      order: 'background:#e0f2fe;color:#075985;border:1px solid #bae6fd;',
      product: 'background:#e8f5e9;color:#1b5e20;border:1px solid #a5d6a7;',
      account: 'background:#f3e8ff;color:#6b21a8;border:1px solid #d8b4fe;',
      cms: 'background:#fef3c7;color:#92400e;border:1px solid #fde68a;',
      other: 'background:var(--sky);color:var(--muted);border:1px solid var(--border);'
    };
    return colors[cat] || colors.other;
  }
  function populateAuditAdminFilter() {
    var sel = document.getElementById('auditAdminFilter');
    if (!sel) return;
    var admins = {};
    getAuditLogs().forEach(function(l) { if (l.admin) admins[l.admin] = true; });
    var current = sel.value;
    var opts = '<option value="all">All Admins</option>' + Object.keys(admins).sort().map(function(a) {
      return '<option value="' + escapeHtml(a) + '">' + escapeHtml(a) + '</option>';
    }).join('');
    sel.innerHTML = opts;
    if (admins[current] || current === 'all') sel.value = current;
  }
  function renderAuditLogs() {
    var body = document.getElementById('auditBody');
    if (!body) return;
    var logs = getAuditLogs();
    populateAuditAdminFilter();
    // Read filters
    var q = (document.getElementById('auditSearch') || {}).value || '';
    q = q.toLowerCase().trim();
    var adminF = (document.getElementById('auditAdminFilter') || {}).value || 'all';
    var catF = (document.getElementById('auditActionFilter') || {}).value || 'all';
    var dateF = (document.getElementById('auditDateFilter') || {}).value || 'all';
    var now = new Date();
    var filtered = logs.filter(function(log) {
      if (q && (log.action || '').toLowerCase().indexOf(q) === -1 && (log.admin || '').toLowerCase().indexOf(q) === -1 && (log.time || '').toLowerCase().indexOf(q) === -1) return false;
      if (adminF !== 'all' && log.admin !== adminF) return false;
      var cat = getAuditCategory(log.action);
      if (catF !== 'all' && cat !== catF) return false;
      if (dateF !== 'all') {
        var d = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate() : (log.time ? new Date(log.time) : null);
        if (!d || isNaN(d.getTime())) {
          // fallback: try parse time string
          d = new Date(log.time);
        }
        if (!d || isNaN(d.getTime())) return false;
        if (dateF === 'today' && d.toDateString() !== now.toDateString()) return false;
        if (dateF === 'week') { var w = new Date(now); w.setDate(w.getDate()-7); if (d < w) return false; }
        if (dateF === 'month' && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
      }
      return true;
    });
    var countEl = document.getElementById('auditCount');
    if (countEl) countEl.textContent = filtered.length + ' of ' + logs.length + ' entries';
    var headerSub = document.getElementById('auditHeaderSub');
    if (headerSub) headerSub.textContent = logs.length + ' entries • ' + filtered.length + ' matching' + (q || adminF!=='all' || catF!=='all' || dateF!=='all' ? ' • filtered' : '');
    if (logs.length === 0) {
      body.innerHTML = '<tr><td colspan="3" class="text-center muted" style="padding:40px;">No audit entries yet.</td></tr>';
      return;
    }
    if (filtered.length === 0) {
      body.innerHTML = '<tr><td colspan="3" class="text-center muted" style="padding:32px;">No results — try a different search or filter.</td></tr>';
      return;
    }
    body.innerHTML = filtered.map(function(log) {
      var cat = getAuditCategory(log.action);
      var badge = getAuditBadge(cat);
      var label = cat.charAt(0).toUpperCase() + cat.slice(1);
      return '<tr>' +
        '<td style="white-space:nowrap;font-size:0.85rem;color:var(--muted);">' + escapeHtml(log.time || '') + '</td>' +
        '<td><span style="display:inline-flex;align-items:center;gap:6px;"><span aria-hidden="true" style="width:26px;height:26px;border-radius:50%;background:var(--sky);display:inline-flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;">' + escapeHtml((log.admin || '?').charAt(0).toUpperCase()) + '</span>' + escapeHtml(log.admin || '') + '</span></td>' +
        '<td><span style="display:inline-flex;align-items:center;gap:8px;flex-wrap:wrap;"><span style="display:inline-flex;align-items:center;gap:5px;padding:3px 8px;border-radius:999px;font-size:0.7rem;font-weight:700;letter-spacing:0.03em;text-transform:uppercase;' + badge + '">' + escapeHtml(label) + '</span><span>' + escapeHtml(log.action || '') + '</span></span></td>' +
        '</tr>';
    }).join('');
  }

  // --- MESSAGES INBOX ---
  var messagesCache = [];
  // --- NOTIFICATION DROPDOWN (bell → recent activity, capped 7) ---
  function formatNotifTime(log){
    var d = log.timestamp && log.timestamp.toDate ? log.timestamp.toDate() : (log.time ? new Date(log.time) : null);
    if(!d || isNaN(d.getTime())) return '';
    var diff = Date.now() - d.getTime();
    var m = Math.floor(diff/60000);
    if(m < 1) return 'just now';
    if(m < 60) return m + 'm ago';
    var h = Math.floor(m/60);
    if(h < 24) return h + 'h ago';
    var days = Math.floor(h/24);
    if(days < 7) return days + 'd ago';
    return d.toLocaleDateString();
  }
  function renderNotifDropdown(){
    var listEl = document.getElementById('notifDropdownList');
    var countEl = document.getElementById('notifDropdownCount');
    var pendingEl = document.getElementById('notifDropdownPending');
    if(!listEl) return;
    var logs = getAuditLogs() || [];
    var pending = 0;
    try { pending = getOrders().filter(function(o){ return o.status==='Pending'; }).length; } catch(e){}
    if(pendingEl){
      pendingEl.textContent = pending + ' pending order' + (pending===1?'':'s') + ' need' + (pending===1?'s':'' ) + ' attention →';
      pendingEl.style.display = pending ? '' : 'none';
    }
    if(countEl){
      var total = logs.length;
      countEl.textContent = total ? total + ' entries • ' + pending + ' pending' : pending + ' pending • no activity yet';
    }
    if(!logs.length){
      listEl.innerHTML = '<div style="padding:28px 16px;text-align:center;color:var(--muted);font-size:0.9rem;">No recent activity yet.<br><span style="font-size:0.82rem;">Actions you take will appear here.</span></div>';
      return;
    }
    var slice = logs.slice(0,7);
    listEl.innerHTML = slice.map(function(log){
      var cat = getAuditCategory(log.action);
      var icon = getAuditIcon(cat);
      var time = formatNotifTime(log);
      return '<div class="notif-dropdown-item"><span class="notif-dropdown-icon ' + cat + '">' + icon + '</span><span style="min-width:0;flex:1;"><span style="display:block;font-size:0.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escapeHtml(log.action||'') + '</span><span class="muted" style="font-size:0.78rem;">' + escapeHtml(log.admin||'') + (time ? ' • ' + escapeHtml(time) : '') + '</span></span></div>';
    }).join('');
  }
  function setNotifDropdownOpen(open){
    var wrap = document.getElementById('notifDropdown');
    var btn = document.getElementById('notifBellBtn');
    if(!wrap || !btn) return;
    var willOpen = typeof open === 'boolean' ? open : wrap.classList.contains('hidden');
    if(willOpen){
      if(!getAuditLogs().length){
        fetchAuditLogs(function(){ renderNotifDropdown(); });
      } else {
        renderNotifDropdown();
      }
      wrap.classList.remove('hidden');
      wrap.style.display = 'block';
      btn.setAttribute('aria-expanded','true');
    } else {
      wrap.classList.add('hidden');
      wrap.style.display = 'none';
      btn.setAttribute('aria-expanded','false');
    }
  }
  function closeNotifDropdown(returnFocus){
    setNotifDropdownOpen(false);
    if(returnFocus){
      var btn=document.getElementById('notifBellBtn');
      if(btn) try{ btn.focus(); }catch(e){}
    }
  }

  var lastMsgDeleteSnapshot = null;
  function fetchMessages(callback) {
    firebase.firestore().collection('contact_messages').orderBy('createdAt','desc').limit(100).get().then(function(snap){
      messagesCache = [];
      snap.forEach(function(doc){
        var d = doc.data(); d._id = doc.id;
        if (d.createdAt && d.createdAt.toDate) d._time = d.createdAt.toDate().toLocaleString();
        else d._time = d.createdAt ? String(d.createdAt) : '';
        messagesCache.push(d);
      });
      if (callback) callback(messagesCache);
      renderMessages();
    }).catch(function(err){
      console.warn('Could not load messages:', err);
      var body = document.getElementById('messagesBody');
      if (body) body.innerHTML = '<tr><td colspan="7" class="text-center muted" style="padding:32px;">Could not load — check Firestore rules/permissions.</td></tr>';
      if (callback) callback([]);
    });
  }
  function updateMessageStats(list){
    var total = messagesCache.length;
    var n = messagesCache.filter(function(m){ return (m.status||'new')==='new'; }).length;
    var r = messagesCache.filter(function(m){ return m.status==='read'; }).length;
    var rep = messagesCache.filter(function(m){ return m.status==='replied'; }).length;
    var el1=document.getElementById('msgTotal'), el2=document.getElementById('msgNew'), el3=document.getElementById('msgRead'), el4=document.getElementById('msgReplied');
    if(el1) el1.textContent=total; if(el2) el2.textContent=n; if(el3) el3.textContent=r; if(el4) el4.textContent=rep;
    var headerSub=document.getElementById('messagesHeaderSub');
    if(headerSub) headerSub.textContent = n + ' unread • ' + total + ' total' + (n? ' • needs reply' : '');
  }
  function renderMessages(){
    var body=document.getElementById('messagesBody'); if(!body) return;
    var q=((document.getElementById('msgSearch')||{}).value||'').toLowerCase().trim();
    var statusF=(document.getElementById('msgStatusFilter')||{}).value||'all';
    var topicF=(document.getElementById('msgTopicFilter')||{}).value||'all';
    var filtered=messagesCache.filter(function(m){
      if(statusF!=='all' && (m.status||'new')!==statusF) return false;
      if(topicF!=='all' && m.topic!==topicF) return false;
      if(q){
        var hay=[m.name,m.email,m.topic,m.message].join(' ').toLowerCase();
        if(hay.indexOf(q)===-1) return false;
      }
      return true;
    });
    updateMessageStats();
    var countEl=document.getElementById('msgCount'); if(countEl) countEl.textContent=filtered.length+' of '+messagesCache.length;
    if(messagesCache.length===0){ body.innerHTML='<tr><td colspan="7" class="text-center muted" style="padding:32px;">No messages yet — contact form submissions will appear here.</td></tr>'; return; }
    if(filtered.length===0){ body.innerHTML='<tr><td colspan="7" class="text-center muted" style="padding:32px;">No matching messages.</td></tr>'; return; }
    body.innerHTML=filtered.map(function(m){
      var st=m.status||'new';
      var badge = st==='new' ? 'background:#fff3cd;color:#8a6d00;border:1px solid #ffe69c;' : st==='replied' ? 'background:#e8f5e9;color:#1b5e20;border:1px solid #a5d6a7;' : 'background:#e0f2fe;color:#075985;border:1px solid #bae6fd;';
      var rawMsg = String(m.message || '');
      var snippet = rawMsg.length > 80 ? rawMsg.slice(0, 80) + '…' : rawMsg;
      var email = String(m.email || '');
      var safeMailto = /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/.test(email) ? 'mailto:' + email : '#';
      return '<tr>'+
        '<td style="white-space:nowrap;font-size:0.82rem;color:var(--muted);">'+escapeHtml(m._time||'')+'</td>'+
        '<td><strong>'+escapeHtml(m.name||'')+'</strong></td>'+
        '<td><a href="'+escapeHtml(safeMailto)+'">'+escapeHtml(email)+'</a></td>'+
        '<td><span class="chip-cat">'+escapeHtml(m.topic||'')+'</span></td>'+
        '<td style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="'+escapeHtml(rawMsg)+'">'+escapeHtml(snippet)+'</td>'+
        '<td><span style="padding:3px 8px;border-radius:999px;font-size:0.7rem;font-weight:700;text-transform:uppercase;'+badge+'">'+escapeHtml(st)+'</span></td>'+
        '<td style="white-space:nowrap;display:flex;gap:6px;flex-wrap:wrap;">'+
          '<button class="btn btn-light msg-view" data-id="'+escapeHtml(m._id)+'" style="padding:4px 8px;font-size:0.78rem;">View</button>'+
          '<a class="btn btn-primary" href="'+escapeHtml(safeMailto)+'?subject=Re:%20'+encodeURIComponent(m.topic||'')+'&body='+encodeURIComponent('Hi '+(m.name||'')+',\n\nThank you for contacting SmileHub.\n\n')+'" style="padding:4px 8px;font-size:0.78rem;text-decoration:none;">Reply</a>'+
          (st!=='replied' ? '<button class="btn btn-light msg-replied" data-id="'+escapeHtml(m._id)+'" style="padding:4px 8px;font-size:0.78rem;">Mark Replied</button>' : '')+
          (st==='new' ? '<button class="btn btn-light msg-read" data-id="'+escapeHtml(m._id)+'" style="padding:4px 8px;font-size:0.78rem;">Mark Read</button>' : '')+
          '<button class="btn btn-danger msg-del" data-id="'+escapeHtml(m._id)+'" style="padding:4px 8px;font-size:0.78rem;">Delete</button>'+
        '</td></tr>';
    }).join('');
    body.querySelectorAll('.msg-view').forEach(function(btn){
      btn.addEventListener('click', function(){ openMessage(this.dataset.id); });
    });
    body.querySelectorAll('.msg-read').forEach(function(btn){
      btn.addEventListener('click', function(){ updateMsgStatus(this.dataset.id,'read'); });
    });
    body.querySelectorAll('.msg-replied').forEach(function(btn){
      btn.addEventListener('click', function(){ updateMsgStatus(this.dataset.id,'replied'); });
    });
    body.querySelectorAll('.msg-del').forEach(function(btn){
      btn.addEventListener('click', function(){
        var id=this.dataset.id;
        var msgObj = messagesCache.find(function(m){ return m._id===id; });
        showAuthoredConfirm({
          eyebrow: 'Delete message',
          title: 'Delete this message?',
          message: 'Delete this message' + (msgObj && msgObj.name ? ' from ' + msgObj.name : '') + '?',
          impact: 'Removes it from the inbox. You can undo for 7 seconds.',
          confirmLabel: 'Delete',
          cancelLabel: 'Cancel'
        }).then(function(ok){
          if (!ok) return;
          lastMsgDeleteSnapshot = msgObj ? deepClone(msgObj) : { _id: id };
          firebase.firestore().collection('contact_messages').doc(id).delete().then(function(){
            messagesCache=messagesCache.filter(function(m){ return m._id!==id; });
            renderMessages();
            showUndoToast('Message deleted', function(){
              if (!lastMsgDeleteSnapshot) return;
              var m = lastMsgDeleteSnapshot;
              try { firebase.firestore().collection('contact_messages').doc(id).set({ name:m.name, email:m.email, topic:m.topic, message:m.message, status:m.status||'new', createdAt: m.createdAt || firebase.firestore.FieldValue.serverTimestamp() }).catch(function(){}); } catch(e){}
              messagesCache.push(m);
              renderMessages();
              showToast('Message restored', false, true);
              lastMsgDeleteSnapshot = null;
            }, 7000);
          }).catch(function(e){ showToast(saveErrorMessage('delete that message', e), true); });
        });
      });
    });
    // Auto-mark as read when viewed via mailto reply? No, manual
  }
  function updateMsgStatus(id, status){
    firebase.firestore().collection('contact_messages').doc(id).update({status:status}).then(function(){
      var m=messagesCache.find(function(x){ return x._id===id; }); if(m) m.status=status;
      renderMessages(); addAuditLog('Marked message '+id+' as '+status); showToast('Marked as '+status, false, true);
    }).catch(function(e){ showToast(saveErrorMessage('update that message', e), true); });
  }
  function openMessage(id){
    var m=messagesCache.find(function(x){ return x._id===id; }); if(!m) return;
    var modal=document.getElementById('msgModal'), content=document.getElementById('msgModalContent'), title=document.getElementById('msgModalTitle');
    if(!modal||!content) return;
    if(title) title.textContent=m.topic ? m.topic+' — '+(m.name||'') : 'Message';
    var msgEmail = String(m.email || '');
    var msgSafeMailto = /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/.test(msgEmail) ? 'mailto:' + msgEmail : '#';
    content.innerHTML=
      '<div style="display:grid;gap:10px;">'+
        '<div><strong>From:</strong> '+escapeHtml(m.name||'')+' &lt;'+escapeHtml(msgEmail)+'&gt;</div>'+
        '<div><strong>Topic:</strong> '+escapeHtml(m.topic||'')+'</div>'+
        '<div><strong>Time:</strong> '+escapeHtml(m._time||'')+'</div>'+
        '<div><strong>Status:</strong> '+escapeHtml(m.status||'new')+'</div>'+
        '<div style="padding:12px;background:var(--sky);border-radius:8px;white-space:pre-wrap;">'+escapeHtml(m.message||'')+'</div>'+
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">'+
          '<a class="btn btn-primary" href="'+escapeHtml(msgSafeMailto)+'?subject=Re:%20'+encodeURIComponent(m.topic||'')+'&body='+encodeURIComponent('Hi '+(m.name||'')+',\n\n')+'">Reply via Email</a>'+
          '<button class="btn btn-light" id="msgModalRead">Mark Read</button>'+
          '<button class="btn btn-light" id="msgModalReplied">Mark Replied</button>'+
        '</div>'+
      '</div>';
    modal.style.display='flex';
    if (title) { if (!title.hasAttribute('tabindex')) title.setAttribute('tabindex', '-1'); try { title.focus({ preventScroll: true }); } catch (e) {} }
    var r=document.getElementById('msgModalRead'); if(r) r.onclick=function(){ updateMsgStatus(id,'read'); modal.style.display='none'; };
    var rp=document.getElementById('msgModalReplied'); if(rp) rp.onclick=function(){ updateMsgStatus(id,'replied'); modal.style.display='none'; };
    // Auto-mark new as read when opened
    if((m.status||'new')==='new') updateMsgStatus(id,'read');
  }

  // --- NOTIFICATION TEMPLATES ---
  var defaultTemplates = [
    { key: 'order_confirmation', label: 'Order Confirmation', subject: 'Order Confirmed - {{order_number}}', body: 'Hi {{customer}},\n\nYour order {{order_number}} has been confirmed.\nTotal: {{total}}\nWe will notify you once it ships.\n\nThanks,\nSmileHub Dental Supplies' },
    { key: 'payment_received', label: 'Payment Received', subject: 'Payment Received - {{order_number}}', body: 'Hi {{customer}},\n\nWe have received your payment for order {{order_number}}.\nAmount: {{total}}\nYour order is now being processed.\n\nThanks,\nSmileHub Dental Supplies' },
    { key: 'order_shipped', label: 'Order Shipped', subject: 'Your Order Has Shipped - {{order_number}}', body: 'Hi {{customer}},\n\nYour order {{order_number}} is on its way!\nShipping to: {{address}}\n\nTrack your delivery and enjoy your purchase.\n\nThanks,\nSmileHub Dental Supplies' },
    { key: 'order_delivered', label: 'Order Delivered', subject: 'Order Delivered - {{order_number}}', body: 'Hi {{customer}},\n\nYour order {{order_number}} has been delivered.\nWe hope you love your products!\n\nLeave a review and help other customers.\n\nThanks,\nSmileHub Dental Supplies' }
  ];

  function loadTemplates() {
    var saved = null;
    try { var d = localStorage.getItem('smilehub_notif_templates'); if (d) saved = JSON.parse(d); } catch(e) {}
    if (!saved || !saved.length) {
      saved = JSON.parse(JSON.stringify(defaultTemplates));
      localStorage.setItem('smilehub_notif_templates', JSON.stringify(saved));
    }
    return saved;
  }

  function saveTemplates(data) {
    localStorage.setItem('smilehub_notif_templates', JSON.stringify(data));
  }

  function renderNotificationTemplates() {
    var container = document.getElementById('notifTemplates');
    if (!container) return;
    var templates = loadTemplates();

    function samplePreview(text){
      return String(text||'')
        .replace(/\{\{customer\}\}/g, 'Juan Dela Cruz')
        .replace(/\{\{order_number\}\}/g, 'SH-2026001')
        .replace(/\{\{total\}\}/g, '₱2,743.20')
        .replace(/\{\{address\}\}/g, '123 Sample St, Quezon City');
    }
    function escPreview(text) {
      return escapeHtml(samplePreview(text)).replace(/\n/g, '<br>');
    }
    container.innerHTML = '<p class="muted" style="margin:0 0 12px;font-size:0.85rem;">Templates are local drafts only — copy them into your mailer when notifying customers.</p>' +
      templates.map(function(t, i) {
      var previewSubject = escPreview(t.subject);
      var previewBody = escPreview(t.body);
      return '<div class="card form-card notif-card" style="margin-bottom:14px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<span class="cms-icon" aria-hidden="true"><svg class="dash-icon" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" viewBox="0 0 24 24"><path d="M18 8a6 6 0 1 0-12 0c0 7-3 8-3 8h18s-3-1-3-8"/><path d="M10.3 21a2 2 0 0 0 3.4 0"/></svg></span>' +
            '<h3 style="margin:0;">' + escapeHtml(t.label) + '</h3>' +
          '</div>' +
          '<button class="icon-btn row-btn reset-template" data-index="' + i + '" aria-label="Reset ' + escapeHtml(t.label) + '" title="Reset"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v6h-6"/></svg></button>' +
        '</div>' +
        '<div class="form-group"><label for="notif-subject-' + i + '">Subject</label><input id="notif-subject-' + i + '" class="notif-subject" data-index="' + i + '" value="' + escapeHtml(t.subject || '') + '" maxlength="160" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;"></div>' +
        '<div class="form-group"><label for="notif-body-' + i + '">Body</label><textarea id="notif-body-' + i + '" class="notif-body" data-index="' + i + '" rows="4" maxlength="2000" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;">' + escapeHtml(t.body || '') + '</textarea></div>' +
        '<div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0;"><span class="chip-cat">{{customer}}</span><span class="chip-cat">{{order_number}}</span><span class="chip-cat">{{total}}</span><span class="chip-cat">{{address}}</span></div>' +
        '<div class="notif-preview" id="notifPreview-' + i + '"><div style="font-weight:700;margin-bottom:4px;">Preview</div><div><strong>Subject:</strong> ' + previewSubject + '</div><div style="margin-top:6px;white-space:pre-wrap;">' + previewBody + '</div></div>' +
        '</div>';
    }).join('');

    function updateNotifPreview(idx){
      var subjEl = container.querySelector('.notif-subject[data-index="' + idx + '"]');
      var bodyEl = container.querySelector('.notif-body[data-index="' + idx + '"]');
      var preview = document.getElementById('notifPreview-' + idx);
      if(!subjEl || !bodyEl || !preview) return;
      var ps = escPreview(subjEl.value.slice(0, 160));
      var pb = escPreview(bodyEl.value.slice(0, 2000));
      preview.innerHTML = '<div style="font-weight:700;margin-bottom:4px;">Preview</div><div><strong>Subject:</strong> ' + ps + '</div><div style="margin-top:6px;white-space:pre-wrap;">' + pb + '</div>';
    }

    container.querySelectorAll('.notif-subject, .notif-body').forEach(function(el) {
      el.addEventListener('input', function() {
        var templates = loadTemplates();
        var idx = parseInt(this.dataset.index);
        var subjects = container.querySelectorAll('.notif-subject');
        var bodies = container.querySelectorAll('.notif-body');
        subjects.forEach(function(s, i) { if (templates[i]) templates[i].subject = s.value; });
        bodies.forEach(function(b, i) { if (templates[i]) templates[i].body = b.value; });
        saveTemplates(templates);
        updateNotifPreview(idx);
      });
    });

    container.querySelectorAll('.reset-template').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        var templates = loadTemplates();
        templates[idx] = JSON.parse(JSON.stringify(defaultTemplates[idx]));
        saveTemplates(templates);
        renderNotificationTemplates();
        showToast('Template reset to default', false, false);
      });
    });

    var saveBtn = document.getElementById('saveNotifBtn');
    if (saveBtn) {
      saveBtn.onclick = function() {
        showToast('Templates saved!', false, true);
      };
    }
  }

  // --- INIT ---
  function init() {
    applyRoleVisibility();

    // Hide all sections first
    document.querySelectorAll('.admin-section, #dashboard').forEach(function(s) {
      s.style.display = 'none';
    });
    
    // Show dashboard by default
    const dash = document.getElementById('dashboard');
    if (dash) {
      dash.style.display = 'block';
      dash.querySelectorAll('.admin-section').forEach(function(s) { s.style.display = ''; });
    }
    
    // Set active sidebar link
    document.querySelectorAll('.admin-menu a').forEach(function(link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#dashboard') {
        link.classList.add('active');
      }
    });
    
    try {
      if (window.location && window.location.protocol === 'file:') {
        var fb = document.getElementById('fileOriginBanner');
        if (fb) fb.hidden = false;
      }
    } catch (e) {}
    setupImagePreview();
    setupSidebarNavigation();
    setupFormSubmit();
    setupBulkStock();
    var dashAdd = document.getElementById('dashAddProduct');
    if (dashAdd && !dashAdd.dataset.bound) {
      dashAdd.dataset.bound = '1';
      dashAdd.addEventListener('click', function() {
        openNewProductModal();
      });
    }
    var productsLoaded = false;
    var ordersLoaded = false;
    function tryRenderDashboard() {
      if (productsLoaded && ordersLoaded) {
        updateDashboard();
      }
    }
    loadProducts(function() {
      normalizeProducts(products);
      renderProducts();
      try { if (window.refreshBulkPreview) window.refreshBulkPreview(); } catch (e) {}
      makeDashboardClickable();
      productsLoaded = true;
      tryRenderDashboard();
    });
    fetchOrders(function(data) {
      renderOrders('all');
      ordersLoaded = true;
      tryRenderDashboard();
      renderRecentOrders();
    });
    // Real-time orders sync — keeps Reports + Order by Status + KPIs + Customers live
    try {
      if (typeof db !== 'undefined' && db.collection && db.collection('orders').onSnapshot) {
        db.collection('orders').onSnapshot(function(snap){
          var live = [];
          snap.forEach(function(doc){ var d=doc.data()||{}; d.docId=doc.id; if(!d.number) d.number=doc.id; live.push(d); });
          if (!live.length && ordersCache.length) return;
          ordersCache = live;
          ordersLoadError = null;
          try { renderOrders((document.getElementById('orderStatusFilter')||{}).value||'all'); } catch(e){}
          try { updateDashboard(); } catch(e){}
          try { renderOrdersRail(getOrders()); } catch(e){}
          try { renderAccounts(); } catch(e){}
          try {
            var repSec=document.getElementById('reports');
            if(repSec && repSec.style.display!=='none' && repSec.offsetParent!==null){
              var per=(document.getElementById('reportPeriod')||{}).value||'all';
              renderReports(per);
            }
          } catch(e){}
        }, function(err){
          ordersLoadError = (err && (err.code || err.message)) || 'permission denied';
          console.warn('Orders live sync denied:', err);
        });
      }
    } catch(e){}
    // Orders inspired wiring: search/date/selection/bulk/rail already in renderOrders but wire inputs here
    (function(){
      var orderSearch = document.getElementById('orderSearch');
      if (orderSearch) orderSearch.addEventListener('input', function(){ renderOrders('all'); });
      var orderDateFilter = document.getElementById('orderDateFilter');
      if (orderDateFilter) orderDateFilter.addEventListener('change', function(){ renderOrders('all'); });
      var orderStatusFilterEl = document.getElementById('orderStatusFilter');
      if (orderStatusFilterEl) orderStatusFilterEl.addEventListener('change', function(){ renderOrders('all'); });
      // Keep global aliases in sync
      window.filterOrders = function(){ renderOrders('all'); };
      window.refreshOrders = function(){
        var f=(document.getElementById('orderStatusFilter')||{}).value||'all';
        if (window.SmileHubAdmin && window.SmileHubAdmin.refreshOrders) window.SmileHubAdmin.refreshOrders(f);
        else { fetchOrders(function(){ renderOrders(f); }); }
      };
      var selAll = document.getElementById('orderSelectAll');
      if (selAll) selAll.addEventListener('change', function(){
        var cbs=document.querySelectorAll('.order-select');
        cbs.forEach(function(cb){ cb.checked=selAll.checked; var n=cb.dataset.number; if(selAll.checked) selectedOrderIds.add(n); else selectedOrderIds.delete(n); var tr=cb.closest('tr'); if(tr) tr.classList.toggle('row-selected', cb.checked); });
        var vis = Array.prototype.slice.call(cbs).map(function(cb){ return cb.dataset.number; });
        syncOrdersBulkBar(vis);
      });
      var bulkApply = document.getElementById('ordersBulkApply');
      if (bulkApply) bulkApply.addEventListener('click', function(){
        var status=document.getElementById('ordersBulkStatus') ? document.getElementById('ordersBulkStatus').value : '';
        if (!status) { showToast('Choose a status to apply', true); return; }
        if (selectedOrderIds.size===0){ showToast('Tick at least one order', true); return; }
        var isTerm = isTerminalStatus(status);
        var targets = Array.from(selectedOrderIds);
        var doBulk = function(){
          var promises = targets.map(function(num){
            var selEl = document.querySelector('.order-status-update[data-number="'+num+'"]');
            return updateOrderStatus(num, status, selEl, {quiet:true});
          });
          Promise.all(promises.map(function(p){ return p && p.then ? p.catch(function(){ return {ok:false}; }) : Promise.resolve({ok:false}); })).then(function(results){
            var okCount = 0; results.forEach(function(r){ if(r && r.ok) okCount++; });
            var fail = results.length - okCount;
            selectedOrderIds.clear();
            syncOrdersBulkBar([]);
            refreshOrderViews();
            var detail = targets.join(', ');
            addAuditLog('Bulk status change: ' + okCount + ' orders to ' + status + ' (' + detail + ')' + (fail ? ' — ' + fail + ' failed' : ''));
            if (fail) showToast('Bulk update: ' + okCount + ' updated, ' + fail + ' failed — review and retry', true);
            else showToast('Bulk update: ' + okCount + ' orders → ' + status, false, true);
          });
        };
        if (isTerm) {
          var needKeyword = targets.length >= 20;
          showAuthoredConfirm({
            eyebrow: 'Bulk status change',
            title: 'Change ' + targets.length + ' orders to ' + status + '?',
            message: 'Change ' + targets.length + ' orders to ' + status + '?',
            impact: 'Terminal state — affects ' + targets.length + ' orders (' + targets.slice(0,3).join(', ') + (targets.length>3 ? ', …' : '') + ').' + (needKeyword ? ' Type CONFIRM to proceed.' : ''),
            keyword: needKeyword ? 'CONFIRM' : '',
            confirmLabel: 'Change',
            cancelLabel: 'Cancel'
          }).then(function(ok){ if (!ok) return; doBulk(); });
        } else {
          doBulk();
        }
      });
      var bulkClear = document.getElementById('ordersBulkClear');
      if (bulkClear) bulkClear.addEventListener('click', function(){ selectedOrderIds.clear(); syncOrdersBulkBar([]); document.querySelectorAll('.order-select').forEach(function(cb){ cb.checked=false; var tr=cb.closest('tr'); if(tr) tr.classList.remove('row-selected'); }); var sa=document.getElementById('orderSelectAll'); if(sa){ sa.checked=false; sa.indeterminate=false; } });
      var bulkPrint = document.getElementById('ordersBulkPrint');
      if (bulkPrint) bulkPrint.addEventListener('click', function(){
        if(selectedOrderIds.size===0){ showToast('Tick orders to print', true); return; }
        selectedOrderIds.forEach(function(num){ try{ printOrderSlip(num); }catch(e){} });
      });
      function downloadCsv(csv, filename) {
        var blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
      }
      var bulkExport = document.getElementById('ordersBulkExport');
      if (bulkExport) bulkExport.addEventListener('click', function(){
        var list = selectedOrderIds.size ? getOrders().filter(function(o){ return selectedOrderIds.has(o.number); }) : getOrders();
        if(!list.length){ showToast('No orders to export', true); return; }
        var csv=ordersToCsv(list); downloadCsv(csv, 'smilehub-orders-' + new Date().toISOString().slice(0,10)+'.csv'); addAuditLog('Exported ' + list.length + ' orders to CSV'); showToast('Orders exported', false, true);
      });
      var topExport = document.getElementById('ordersExportBtn');
      if (topExport) topExport.addEventListener('click', function(){ var be=document.getElementById('ordersBulkExport'); if(be) be.click(); else { var csv=ordersToCsv(getOrders()); downloadCsv(csv, 'smilehub-orders-' + new Date().toISOString().slice(0,10)+'.csv'); } });
    })();
    // Reports wiring — period, trend toggle, download (live via onSnapshot)
    (function(){
      var rp=document.getElementById('reportPeriod');
      if(rp) rp.addEventListener('change', function(){ renderReports(this.value); });
      var tt=document.getElementById('reportTrendToggle');
      if(tt) tt.addEventListener('change', function(){ reportTrendGranularity=this.value; renderReports((document.getElementById('reportPeriod')||{}).value||'all'); });
        var dl=document.getElementById('downloadReportBtn');
      if(dl) dl.addEventListener('click', function(){
        var period=(document.getElementById('reportPeriod')||{}).value||'all';
        var now=new Date();
        var filtered=getOrders().filter(function(o){
          if(period==='all') return true;
          var ts=orderTime(o);
          if(!ts) return false;
          var d=new Date(ts);
          if(period==='today') return d.toDateString()===now.toDateString();
          if(period==='week'){ var w=new Date(now); w.setDate(w.getDate()-7); return d>=w; }
          if(period==='month') return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
          return true;
        });
        if(!filtered.length){ showToast('No data to download for this period', true); return; }
        var csv='Period,'+period+'\nGenerated,'+new Date().toLocaleString()+'\n\nOrder #,Customer,Date,Status,Total,Items\n' + filtered.map(function(o){
          var items=(o.items||[]).map(function(it){ return (it.name||'')+' x'+(it.quantity||1); }).join('; ');
          return [csvCell(o.number), csvCell(o.customer), csvCell(o.date), csvCell(o.status), (o.total||0), csvCell(items)].join(',');
        }).join('\n');
        // Add monthly summary
        var months={}; filtered.forEach(function(o){ var ts=orderTime(o); if(!ts) return; var dt=new Date(ts); var key=dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0'); if(!months[key]) months[key]={collected:0, pending:0, count:0}; var v=Number(o.total)||0; if(o.status==='Pending') months[key].pending+=v; else if(isActiveOrder(o.status)) months[key].collected+=v; months[key].count+=1; });
        csv+='\n\nMonth,Collected,Pending,Orders\n' + Object.keys(months).sort().map(function(k){ var m=months[k]; return k+','+m.collected+','+m.pending+','+m.count; }).join('\n');
        // Top customers (group by email when available to avoid same-name merges)
        var map={}; filtered.forEach(function(o){ var key=String(o.email||o.customer||'Unknown').toLowerCase(); if(!map[key]) map[key]={label:(o.customer||o.email||'Unknown'), orders:0,revenue:0}; map[key].orders+=1; map[key].revenue+=Number(o.total)||0; });
        var top=Object.keys(map).sort(function(a,b){ return map[b].revenue - map[a].revenue; }).slice(0,10);
        csv+='\n\nTop Customers,Orders,Revenue\n' + top.map(function(k){ var m=map[k]; return [csvCell(m.label), m.orders, m.revenue].join(','); }).join('\n');
        downloadCsv(csv, 'smilehub-sales-report-' + period + '-' + new Date().toISOString().slice(0,10)+'.csv'); addAuditLog('Downloaded sales report ('+period+', '+filtered.length+' orders)'); showToast('Report downloaded', false, true);
      });
    })();
    // Notification bell dropdown wiring
    (function(){
      var btn=document.getElementById('notifBellBtn');
      var dropdown=document.getElementById('notifDropdown');
      if(!btn || !dropdown) return;
      function close(returnFocus){ setNotifDropdownOpen(false); if(returnFocus){ try{ btn.focus(); }catch(e){} } }
      btn.addEventListener('click', function(e){
        e.preventDefault(); e.stopPropagation();
        var isOpen = !dropdown.classList.contains('hidden');
        if(isOpen) close(false);
        else setNotifDropdownOpen(true);
      });
      var closeBtn = dropdown.querySelector('[data-notif-close]');
      if(closeBtn) closeBtn.addEventListener('click', function(){ closeNotifDropdown(true); });
      var viewAll = dropdown.querySelector('[data-notif-view-all]');
      if(viewAll) viewAll.addEventListener('click', function(){ close(false); window.navigateTo('#audit'); });
      var pendingBtn = document.getElementById('notifDropdownPending');
      if(pendingBtn) pendingBtn.addEventListener('click', function(){ close(false); window.navigateTo('#orders'); });
      document.addEventListener('click', function(e){
        if(!dropdown.classList.contains('hidden') && !dropdown.contains(e.target) && !btn.contains(e.target)){
          close(false);
        }
      });
      document.addEventListener('keydown', function(e){
        if(e.key==='Escape' && !dropdown.classList.contains('hidden')){
          closeNotifDropdown(true);
        }
      });
      document.querySelectorAll('.admin-menu a').forEach(function(link){
        link.addEventListener('click', function(){ close(false); });
      });
    })();
    fetchCms(function() {
      renderCms();
      setupCms();
    });
    // Re-apply role-gated UI once the Firebase profile (and correct role) is loaded
    document.addEventListener('authReady', function() {
      applyRoleVisibility();
      // Re-fetch with the resolved role: accounts AND orders (orders were
      // first fetched pre-auth with a stale cached role).
      fetchOrders(function() {
        renderOrders((document.getElementById('orderStatusFilter') || {}).value || 'all');
        renderRecentOrders();
        updateDashboard();
      });
      if (window.SmileHubAuth) {
        accountsLoadError = null;
        window.SmileHubAuth.getAccounts().then(function(a) { accounts = a; renderAccounts(); }).catch(function(err){
          accountsLoadError = (err && (err.code || err.message)) || 'permission denied';
          renderAccounts();
        });
      }
    });
    fetchAuditLogs();
    setupAccountSearch();
    if (window.SmileHubAuth) {
      accountsLoadError = null;
      window.SmileHubAuth.getAccounts().then(function(a) {
        accounts = a;
        renderAccounts();
      }).catch(function(error) {
        accountsLoadError = (error && (error.code || error.message)) || 'permission denied';
        console.warn('Could not load accounts (check users/{uid} role doc / Firestore rules):', error);
        renderAccounts();
      });
    } else {
      renderAccounts();
    }
    renderNotificationTemplates();

    // Messages inbox filters
    var msgSearch = document.getElementById('msgSearch');
    var msgStatusFilter = document.getElementById('msgStatusFilter');
    var msgTopicFilter = document.getElementById('msgTopicFilter');
    var refreshMessagesBtn = document.getElementById('refreshMessagesBtn');
    if (msgSearch) msgSearch.addEventListener('input', renderMessages);
    if (msgStatusFilter) msgStatusFilter.addEventListener('change', renderMessages);
    if (msgTopicFilter) msgTopicFilter.addEventListener('change', renderMessages);
    if (refreshMessagesBtn) refreshMessagesBtn.addEventListener('click', function(){ fetchMessages(); showToast('Messages refreshed', false, false); });
    // Close msg modal on backdrop click
    var msgModal = document.getElementById('msgModal');
    if (msgModal) msgModal.addEventListener('click', function(e){ if(e.target===msgModal) msgModal.style.display='none'; });

    // Report period filter
    var periodSelect = document.getElementById('reportPeriod');
    if (periodSelect) {
      periodSelect.addEventListener('change', function() { renderReports(this.value); });
    }

    // Print report
    var printBtn = document.getElementById('printReportBtn');
    if (printBtn) {
      printBtn.addEventListener('click', printReport);
    }

    // Audit filters
    var auditSearch = document.getElementById('auditSearch');
    var auditAdminFilter = document.getElementById('auditAdminFilter');
    var auditActionFilter = document.getElementById('auditActionFilter');
    var auditDateFilter = document.getElementById('auditDateFilter');
    var auditClearFilters = document.getElementById('auditClearFilters');
    if (auditSearch) auditSearch.addEventListener('input', renderAuditLogs);
    if (auditAdminFilter) auditAdminFilter.addEventListener('change', renderAuditLogs);
    if (auditActionFilter) auditActionFilter.addEventListener('change', renderAuditLogs);
    if (auditDateFilter) auditDateFilter.addEventListener('change', renderAuditLogs);
    if (auditClearFilters) auditClearFilters.addEventListener('click', function() {
      if (auditSearch) auditSearch.value = '';
      if (auditAdminFilter) auditAdminFilter.value = 'all';
      if (auditActionFilter) auditActionFilter.value = 'all';
      if (auditDateFilter) auditDateFilter.value = 'all';
      renderAuditLogs();
    });
    var exportAuditBtn = document.getElementById('exportAuditBtn');
    if (exportAuditBtn) exportAuditBtn.addEventListener('click', function() {
      var logs = getAuditLogs();
      if (!logs.length) { showToast('No logs to export', true); return; }
      var csv = 'Time,Admin,Action\n' + logs.map(function(l) {
        return [csvCell(l.time), csvCell(l.admin), csvCell(l.action)].join(',');
      }).join('\n');
      downloadCsv(csv, 'smilehub-audit-' + new Date().toISOString().slice(0,10) + '.csv');
      showToast('Audit log exported', false, true);
    });

    // Clear audit log — requires export + typed confirmation + undo snapshot
    var auditLastSnapshot = null;
    var clearAuditBtn = document.getElementById('clearAuditBtn');
    if (clearAuditBtn) {
      clearAuditBtn.addEventListener('click', function() {
        var count = getAuditLogs().length;
        if (!count) { showToast('No audit entries to clear', true); return; }
        var impact = 'Permanently deletes ' + count + ' entries. This destroys compliance evidence and cannot be recovered after 10 seconds. Export first to keep a copy.';
        showAuthoredConfirm({
          eyebrow: 'Clear audit trail',
          title: 'Clear ' + count + ' audit entries?',
          message: 'Clear all audit log entries?',
          impact: impact,
          keyword: 'CLEAR',
          confirmLabel: 'Clear log',
          cancelLabel: 'Cancel'
        }).then(function(ok){
          if (!ok) return;
          // Security rules forbid audit delete — attempt it honestly and only
          // clear the local view when Firestore confirms.
          showToast('Clearing audit log…');
          firebase.firestore().collection('audit_logs').get().then(function(snap) {
            if (snap.empty) {
              auditLogsCache = [];
              renderAuditLogs();
              showToast('Audit log is already empty', false, false);
              return null;
            }
            var batch = firebase.firestore().batch();
            snap.forEach(function(doc) { batch.delete(doc.ref); });
            return batch.commit();
          }).then(function(res) {
            if (res === null) return;
            auditLastSnapshot = [];
            auditLogsCache = [];
            try { localStorage.removeItem('smilehub_audit_log'); } catch (e) {}
            renderAuditLogs();
            showToast('Audit log cleared in Firestore', false, true);
          }).catch(function(err) {
            showToast('Clear blocked by security rules — export instead. (' + ((err && (err.code || err.message)) || 'permission denied') + ')', true);
          });
        });
      });
    }

    // Hide chatbot
    const wrapper = document.getElementById('chatbotWrapper');
    if (wrapper) wrapper.style.display = 'none';

    // Show/Hide form — product modal is now opened directly; the
    // section-header button was removed, so showFormBtn is always null.
    // Kept branch deleted to avoid dead code.

    // Search
    if (adminSearch) {
      adminSearch.addEventListener('input', function() {
        renderProducts(this.value);
      });
    }

    // Category filter
    var catFilter = document.getElementById('adminCategoryFilter');
    if (catFilter) {
      catFilter.addEventListener('change', function() { renderProducts(); });
    }

    // Stock status filter
    var stockFilter = document.getElementById('adminStockFilter');
    if (stockFilter) {
      stockFilter.addEventListener('change', function() { renderProducts(); });
    }

    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
      if (e.key !== 'Escape') return;
      var pModal = document.getElementById('productModal');
      if (pModal && pModal.style.display !== 'none' && pModal.style.display !== '') { resetForm(); return; }
      var oModal = document.getElementById('orderModal');
      if (oModal && oModal.style.display !== 'none' && oModal.style.display !== '') { closeOrderModal(); return; }
      var mModal = document.getElementById('msgModal');
      if (mModal && mModal.style.display !== 'none' && mModal.style.display !== '') mModal.style.display = 'none';
    });

    // Modal close - order modal
    document.addEventListener('click', function(e) {
      var modal = document.getElementById('orderModal');
      if (modal && e.target === modal) closeOrderModal();
      var pModal = document.getElementById('productModal');
      if (pModal && e.target === pModal) resetForm();
    });

  }

    function openNewProductModal() {
      if (roleResolved && currentRole && !isProductAdminRole(currentRole)) {
        showToast('Only admins can add products.', true);
        return;
      }
      navigateTo('#products');
      var modal = document.getElementById('productModal');
      if (!modal) return;
      if (modal.style.display === 'flex') { resetForm(); return; }
      openAdminModal(modal);
      var form = document.getElementById('productFormBox') || document.getElementById('adminProductForm');
      if (form) {
        if (typeof form.reset === 'function') { try { form.reset(); } catch (e) {} }
        var pidField = form.querySelector('[name="productId"]');
        if (pidField) pidField.value = '';
        var btn = form.querySelector('button[type="submit"]');
        if (btn) btn.textContent = 'Save Product';
        var preview = document.getElementById('previewImg');
        if (preview) preview.src = safeImageSrc('assets/products/oral-care.svg');
        var custom = document.getElementById('customImageInput');
        if (custom) custom.value = '';
        var imgSelect = document.getElementById('productImageSelect');
        if (imgSelect) imgSelect.value = 'assets/products/oral-care.svg';
      }
      var title = document.getElementById('productModalTitle');
      if (title) title.textContent = 'Add Product';
      var eyebrow = document.getElementById('productModalEyebrow');
      if (eyebrow) eyebrow.textContent = 'New product';
    }
    function safeImageSrc(src) {
      if (!src) return 'assets/products/default.svg';
      var v = String(src).trim();
      if (/^(assets\/|https?:\/\/|data:image\/)/i.test(v) && v.length <= 500 && !/[\s<>"']/.test(v)) return v;
      return 'assets/products/default.svg';
    }
    // Bridge so global onclick handlers (defined below, outside this
    // closure) can reach internal functions and data.
    window.SmileHubAdmin = {
      getProducts: function() { return products; },
      navigateTo: function(sectionId) { navigateTo(sectionId); },
      canManageProducts: function() { return !roleResolved || !currentRole || isProductAdminRole(currentRole); },
      openProductModal: function() { openNewProductModal(); },
      toast: function(msg, isError, isSuccess) { showToast(msg, isError, isSuccess); },
      filterOrders: function(filter) { renderOrders(filter); },
      refreshOrders: function(filter) {
        fetchOrders(function() {
          renderOrders(filter);
          showToast('Orders refreshed.', false, false);
        });
      }
    };

  init();
});

// --- GLOBAL FUNCTIONS (role-enforced) ---
window.navigateTo = function(sectionId) {
  if (sectionId === '#inventory') sectionId = '#products';
  try {
    if (window.SmileHubAdmin && window.SmileHubAdmin.navigateTo) {
      window.SmileHubAdmin.navigateTo(sectionId);
      return;
    }
  } catch (e) {}
  document.querySelectorAll('.admin-section, #dashboard').forEach(function(s) {
    s.style.display = 'none';
  });
  const target = document.querySelector(sectionId);
  if (target) {
    target.style.display = 'block';
    target.querySelectorAll('.admin-section').forEach(function(s) { s.style.display = ''; });
    var heading = target.querySelector('h1, h2');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      try { heading.focus({ preventScroll: true }); } catch (e) { try { heading.focus(); } catch (e2) {} }
    }
  }
  document.querySelectorAll('.admin-menu a').forEach(function(l) {
    var href = l.getAttribute('href');
    if (href === '#inventory') href = '#products';
    var isActive = href === sectionId;
    l.classList.toggle('active', isActive);
    if (isActive) l.setAttribute('aria-current', 'page');
    else l.removeAttribute('aria-current');
  });
};

window.showLowStock = function() {
  const bridge = window.SmileHubAdmin;
  if (!bridge) return;
  const items = bridge.getProducts().filter(function(p) {
    var m = Number(p && p.minStock);
    var min = (Number.isInteger(m) && m >= 0) ? m : 10;
    return p.stock > 0 && p.stock <= min;
  });
  if (items.length === 0) { window.showToast('No low stock items', false, true); return; }
  window.navigateTo('#products');
  setTimeout(function(){
    document.querySelectorAll('#adminProductsBody tr').forEach(function(row) {
      const name = row.querySelector('td:nth-child(4)')?.textContent || row.dataset.product || '';
      const isLow = items.some(function(p) { return name.includes(p.name); });
      row.classList.toggle('row-flash', isLow);
      if (isLow) setTimeout(function(){ row.classList.remove('row-flash'); }, 4500);
    });
  }, 200);
  window.showToast(items.length + ' low stock item(s) highlighted', false, false);
};

window.filterOrders = function() {
  const filter = document.getElementById('orderStatusFilter')?.value || 'all';
  if (window.SmileHubAdmin) window.SmileHubAdmin.filterOrders(filter);
};

window.refreshOrders = function() {
  const filter = document.getElementById('orderStatusFilter')?.value || 'all';
  if (window.SmileHubAdmin && window.SmileHubAdmin.refreshOrders) {
    window.SmileHubAdmin.refreshOrders(filter);
    return;
  }
  showToast('Refreshed', false, false);
};

window.closeOrderModal = function() {
  const modal = document.getElementById('orderModal');
  if (modal) modal.style.display = 'none';
  try {
    var lf = window.__lastAdminFocus;
    if (lf && document.contains(lf)) lf.focus({ preventScroll: true });
    window.__lastAdminFocus = null;
  } catch (e) {}
};

function openProductModalDirect(){
  try {
    var bridge = window.SmileHubAdmin;
    if (bridge && bridge.openProductModal) {
      if (bridge.canManageProducts && !bridge.canManageProducts()) {
        if (bridge.toast) bridge.toast('Only admins can add products.', true);
        return;
      }
      bridge.openProductModal();
      return;
    }
  } catch (e) {}
  window.navigateTo('#products');
}
window.openProductModal = openProductModalDirect;

window.showToast = function(msg, isError, isSuccess) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.textContent = msg;
  if (isError) { toast.style.background = '#d64545'; toast.style.color = 'white'; }
  else if (isSuccess) { toast.style.background = '#1e9b61'; toast.style.color = 'white'; }
  else { toast.style.background = '#102c43'; toast.style.color = 'white'; }
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
};