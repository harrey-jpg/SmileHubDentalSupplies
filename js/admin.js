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
        products = data;
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
  const showFormBtn = document.getElementById('showProductForm');
  const productsBody = document.getElementById('adminProductsBody');
  const adminSearch = document.getElementById('adminSearch');
  const productForm = document.getElementById('productFormBox');

  // --- TOAST ---
  function showToast(msg, isError, isSuccess) {
    const old = document.querySelector('.toast');
    if (old) old.remove();
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    if (isError) { toast.style.background = '#d64545'; toast.style.color = 'white'; }
    else if (isSuccess) { toast.style.background = '#1e9b61'; toast.style.color = 'white'; }
    else { toast.style.background = '#102c43'; toast.style.color = 'white'; }
    document.body.appendChild(toast);
    setTimeout(function() { toast.remove(); }, 3000);
  }

  // --- IMAGE PREVIEW ---
  function setupImagePreview() {
    const catSelect = document.getElementById('productCategory');
    const imgSelect = document.getElementById('productImageSelect');
    const customInput = document.getElementById('customImageInput');
    const preview = document.getElementById('previewImg');

    function update(src) { if (preview) preview.src = src; }

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
        if (this.value.trim()) {
          update(this.value.trim());
          if (imgSelect) imgSelect.value = '';
        }
      });
    }
  }

  // --- NAVIGATION FUNCTION ---
  function navigateTo(sectionId) {
    document.querySelectorAll('.admin-section, #dashboard').forEach(function(s) {
      s.style.display = 'none';
    });
    
    const target = document.querySelector(sectionId);
    if (target) {
      target.style.display = 'block';
      target.querySelectorAll('.admin-section').forEach(function(s) {
        s.style.display = '';
      });
    }
    
    document.querySelectorAll('.admin-menu a').forEach(function(link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === sectionId) {
        link.classList.add('active');
      }
    });
    
    if (sectionId === '#products') {
      renderProducts();
    }
    if (sectionId === '#inventory') {
      renderInventory();
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
  }

  // --- RENDER PRODUCTS ---
  function renderProducts(filter) {
    if (!productsBody) return;

    const searchTerm = (filter || adminSearch?.value || '').toLowerCase();
    const catSelect = document.getElementById('adminCategoryFilter');
    const selectedCat = catSelect ? catSelect.value : 'all';
    const filtered = products.filter(function(p) {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm) ||
             p.sku.toLowerCase().includes(searchTerm) ||
             p.category.toLowerCase().includes(searchTerm);
      return matchesSearch && (selectedCat === 'all' || p.category === selectedCat);
    });

    const countEl = document.getElementById('productCount');
    if (countEl) countEl.textContent = 'Showing ' + filtered.length + ' of ' + products.length + ' products';

    if (filtered.length === 0) {
      productsBody.innerHTML = `<tr><td colspan="7" class="text-center muted" style="padding:40px;">No products found.</td></tr>`;
      updateKPIs();
      return;
    }

    productsBody.innerHTML = filtered.map(function(p) {
      const statusClass = p.status === 'Active' ? 'delivered' : p.status === 'Low Stock' ? 'low' : 'out-of-stock';
      return `
        <tr>
          <td><img class="prod-thumb" src="${p.image || 'assets/products/default.svg'}" alt="${p.name}"></td>
          <td><span class="sku-muted">${p.sku}</span></td>
          <td><strong>${p.name}</strong></td>
          <td><span class="chip-cat">${p.category}</span></td>
          <td class="price-strong">₱${Number(p.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
          <td><span class="status ${statusClass}">${p.status}</span></td>
          <td>
            <div class="row-actions">
              <button class="btn btn-light edit-product" data-id="${p.id}" style="padding:6px 12px;font-size:0.8rem;">✏️ Edit</button>
              <button class="btn btn-danger delete-product" data-id="${p.id}" style="padding:6px 12px;font-size:0.8rem;">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

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

    updateKPIs();
  }

  // --- RENDER INVENTORY ---
  function renderInventory() {
    const body = document.getElementById('inventoryBody');
    if (!body) return;
    const threshold = 10;

    body.innerHTML = products.map(function(p) {
      const status = p.stock === 0 ? 'Out of Stock' : p.stock <= threshold ? 'Low Stock' : 'In Stock';
      const statusClass = p.stock === 0 ? 'out-of-stock' : p.stock <= threshold ? 'low' : 'delivered';
      return `
        <tr data-product="${p.name}">
          <td><img src="${p.image || 'assets/products/default.svg'}" style="width:35px;height:35px;object-fit:contain;background:var(--sky);border-radius:6px;padding:3px;"></td>
          <td><strong>${p.name}</strong></td>
          <td>${p.sku}</td>
          <td><input type="number" class="stock-input" data-id="${p.id}" value="${p.stock}" min="0" style="width:80px;padding:6px;border:1px solid var(--border);border-radius:6px;"></td>
          <td>${threshold}</td>
          <td><span class="status ${statusClass}">${status}</span></td>
          <td><button class="btn btn-primary update-stock" data-id="${p.id}" style="padding:4px 12px;font-size:0.8rem;">Update</button></td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.update-stock').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const id = parseInt(this.dataset.id);
        const input = document.querySelector('.stock-input[data-id="' + id + '"]');
        if (input) {
          const val = parseInt(input.value);
          if (!isNaN(val) && val >= 0) {
            const product = products.find(function(p) { return p.id === id; });
            if (product) {
              const old = product.stock;
              product.stock = val;
              product.status = val === 0 ? 'Out of Stock' : val <= 10 ? 'Low Stock' : 'Active';
              saveProducts(products);
              renderInventory();
              renderProducts();
              updateDashboard();
              addAuditLog('Updated stock for "' + product.name + '" (' + old + ' → ' + val + ')');
              showToast('Stock updated: ' + product.name + ' (' + old + ' → ' + val + ')', false, true);
            }
          } else {
            showToast('Enter a valid number', true);
          }
        }
      });
    });

    document.querySelectorAll('.stock-input').forEach(function(input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          const id = parseInt(this.dataset.id);
          const val = parseInt(this.value);
          if (!isNaN(val) && val >= 0) {
            const product = products.find(function(p) { return p.id === id; });
            if (product) {
              const old = product.stock;
              product.stock = val;
              product.status = val === 0 ? 'Out of Stock' : val <= 10 ? 'Low Stock' : 'Active';
              saveProducts(products);
              renderInventory();
              renderProducts();
              updateDashboard();
              addAuditLog('Updated stock for "' + product.name + '" (' + old + ' → ' + val + ')');
              showToast('Stock updated: ' + product.name + ' (' + old + ' → ' + val + ')', false, true);
            }
          }
        }
      });
    });

    updateInventoryStats();
    updateKPIs();
  }

  // --- CRUD OPERATIONS ---
  function addProduct(data) {
    const newId = products.length > 0 ? Math.max(...products.map(function(p) { return p.id; })) + 1 : 1;
    const image = data.image || categoryImages[data.category] || 'assets/products/default.svg';
    const stock = typeof data.stock === 'number' ? data.stock : 0;
    const newProduct = {
      id: newId,
      sku: data.sku || 'SH-' + String(newId).padStart(3, '0'),
      name: data.name,
      brand: data.brand || '',
      category: data.category,
      price: parseFloat(data.price),
      stock: stock,
      status: stock === 0 ? 'Out of Stock' : stock <= 10 ? 'Low Stock' : 'Active',
      image: image,
      description: data.description || '',
      specs: data.specs ? data.specs.split(',').map(function(s) { return s.trim(); }) : []
    };
    products.push(newProduct);
    saveProducts(products);
    renderProducts();
    updateDashboard();
    addAuditLog('Added product "' + newProduct.name + '" (' + newProduct.sku + ') with ' + stock + ' units');
    showToast('"' + newProduct.name + '" added with ' + stock + ' units', false, true);
    resetForm();
  }

  function editProduct(id) {
    const product = products.find(function(p) { return p.id === id; });
    if (!product) { showToast('❌ Product not found', true); return; }

    const form = document.getElementById('adminProductForm');
    if (form) {
      form.querySelector('[name="productId"]').value = product.id;
      form.querySelector('[name="name"]').value = product.name;
      form.querySelector('[name="brand"]').value = product.brand || '';
      form.querySelector('[name="category"]').value = product.category;
      form.querySelector('[name="price"]').value = product.price;
      form.querySelector('[name="stock"]').value = product.stock;
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
      
      if (productModal) productModal.style.display = 'flex';
      var title = document.getElementById('productModalTitle');
      if (title) title.textContent = 'Edit Product';
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = 'Update Product';
      showToast('Editing: ' + product.name, false, false);
    }
  }

  function updateProduct(id, data) {
    const index = products.findIndex(function(p) { return p.id === id; });
    if (index === -1) { showToast('❌ Product not found', true); return; }

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
      products[index].status = data.stock === 0 ? 'Out of Stock' : data.stock <= 10 ? 'Low Stock' : 'Active';
    }
    
    saveProducts(products);
    renderProducts();
    updateDashboard();
    addAuditLog('Updated product "' + products[index].name + '"');
    showToast('Product "' + oldName + '" updated!', false, true);
    resetForm();
  }

  function deleteProduct(id) {
    const product = products.find(function(p) { return p.id === id; });
    if (!product) return;
    if (confirm('🗑️ Delete "' + product.name + '"?')) {
      products = products.filter(function(p) { return p.id !== id; });
      saveProducts(products);
      db.collection('products').doc(String(id)).delete().catch(function() {});
      renderProducts();
      updateDashboard();
      addAuditLog('Deleted product "' + product.name + '"');
      showToast('Product "' + product.name + '" deleted', false, false);
    }
  }

  function resetForm() {
    const form = document.getElementById('adminProductForm');
    if (form) {
      form.reset();
      form.querySelector('[name="productId"]').value = '';
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = '💾 Save Product';
    }
    var title = document.getElementById('productModalTitle');
    if (title) title.textContent = 'Add Product';
    if (productModal) productModal.style.display = 'none';
  }

  // --- UPDATE DASHBOARD ---
  function updateDashboard() {
    updateKPIs();
    renderRecentOrders();
    renderInventoryAlerts();
    renderCharts();
  }

  function updateKPIs() {
    const total = products.length;
    const low = products.filter(function(p) { return p.stock > 0 && p.stock <= 10; }).length;
    const out = products.filter(function(p) { return p.stock === 0; }).length;
    const revenue = products.reduce(function(sum, p) { return sum + (p.price * p.stock); }, 0);
    const totalStock = products.reduce(function(sum, p) { return sum + p.stock; }, 0);
    const todaySales = Math.round(revenue * 0.05);

    const orders = getOrders();
    const todayOrders = orders.filter(function(o) { return o.date === new Date().toLocaleDateString(); }).length;

    setText('kpiTodaySales', '₱' + todaySales.toLocaleString());
    setText('kpiTodayOrders', todayOrders + ' orders today');
    setText('kpiTotalRevenue', '₱' + revenue.toLocaleString());
    setText('kpiRevenuePeriod', 'From ' + totalStock + ' units in stock');
    setText('kpiTotalProducts', total);
    setText('kpiActiveProducts', (total - out) + ' in stock');
    setText('kpiLowStock', low + out);
    setText('kpiLowStockDetail', low + ' low, ' + out + ' out of stock');
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
      body.innerHTML = '<tr><td colspan="4" class="text-center muted" style="padding:30px;">No orders yet</td></tr>';
      return;
    }
    var sorted = orders.slice().sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
    var recent = sorted.slice(0, 5);

    body.innerHTML = recent.map(function(o) {
      var cls = o.status === 'Delivered' ? 'delivered' : o.status === 'Cancelled' ? 'low' : 'processing';
      return '<tr>' +
        '<td><strong>' + o.number + '</strong></td>' +
        '<td>' + o.customer + '</td>' +
        '<td>₱' + Number(o.total).toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</td>' +
        '<td><span class="status ' + cls + '">' + o.status + '</span></td>' +
        '</tr>';
    }).join('');
  }

  function renderInventoryAlerts() {
    const container = document.getElementById('dashInventoryAlerts');
    if (!container) return;
    const alerts = products.filter(function(p) { return p.stock <= 10; }).sort(function(a, b) { return a.stock - b.stock; });

    if (alerts.length === 0) {
      container.innerHTML = '<p class="muted" style="text-align:center;padding:20px;">All items well-stocked</p>';
      return;
    }

    container.innerHTML = alerts.map(function(p) {
      const label = p.stock === 0 ? 'Out of stock' : p.stock + ' left';
      const cls = p.stock === 0 ? 'low' : p.stock <= 5 ? 'low' : 'processing';
      return '<div class="inventory-alert-item" data-product="' + p.name + '">' +
        '<span class="status ' + cls + '">' + label + '</span> ' + p.name +
        '</div>';
    }).join('');
  }

  // --- CHARTS ---
  let chartStockStatus = null;
  let chartCategoryValue = null;

  function renderCharts() {
    const inStock = products.filter(function(p) { return p.stock > 10; }).length;
    const lowStock = products.filter(function(p) { return p.stock > 0 && p.stock <= 10; }).length;
    const outStock = products.filter(function(p) { return p.stock === 0; }).length;

    // Category value data
    var catMap = {};
    products.forEach(function(p) {
      if (!catMap[p.category]) catMap[p.category] = 0;
      catMap[p.category] += p.price * p.stock;
    });
    var categories = Object.keys(catMap).sort(function(a, b) { return catMap[b] - catMap[a]; }).slice(0, 6);
    var catValues = categories.map(function(c) { return catMap[c]; });

    if (typeof Chart === 'undefined') return;

    // Destroy old charts
    if (chartStockStatus) { chartStockStatus.destroy(); chartStockStatus = null; }
    if (chartCategoryValue) { chartCategoryValue.destroy(); chartCategoryValue = null; }

    var ctx1 = document.getElementById('chartStockStatus');
    if (ctx1) {
      chartStockStatus = new Chart(ctx1, {
        type: 'doughnut',
        data: {
          labels: ['In Stock', 'Low Stock', 'Out of Stock'],
          datasets: [{
            data: [inStock, lowStock, outStock],
            backgroundColor: ['#1e9b61', '#f0a320', '#d64545'],
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

    var ctx2 = document.getElementById('chartCategoryValue');
    if (ctx2) {
      chartCategoryValue = new Chart(ctx2, {
        type: 'bar',
        data: {
          labels: categories,
          datasets: [{
            label: 'Inventory Value (₱)',
            data: catValues,
            backgroundColor: ['#1261a0', '#0f9d9a', '#7b61ff', '#f0a320', '#d64545', '#1e9b61'],
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: function(v) { return '₱' + (v >= 1000 ? (v/1000).toFixed(0) + 'k' : v); }, font: { size: 10 } },
              grid: { color: 'rgba(0,0,0,0.06)' }
            },
            x: {
              ticks: { font: { size: 9 } },
              grid: { display: false }
            }
          }
        }
      });
    }
  }

  function updateInventoryStats() {
    const totalStock = products.reduce(function(sum, p) { return sum + p.stock; }, 0);
    const low = products.filter(function(p) { return p.stock > 0 && p.stock <= 10; }).length;
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
    const items = products.filter(function(p) { return p.stock > 0 && p.stock <= 10; });
    if (items.length === 0) { showToast('✅ No low stock items', false, true); return; }
    document.querySelectorAll('#inventoryBody tr').forEach(function(row) {
      const name = row.querySelector('td:nth-child(2)')?.textContent || '';
      const isLow = items.some(function(p) { return p.name === name; });
      row.style.background = isLow ? '#fff3cd' : '';
    });
    showToast('📊 ' + items.length + ' low stock items', false, false);
  }

  // --- BULK STOCK ---
  function setupBulkStock() {
    const form = document.getElementById('bulkStockForm');
    if (!form) return;
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const cat = document.getElementById('bulkCategoryFilter').value;
      const type = document.getElementById('bulkAdjustmentType').value;
      const qty = parseInt(document.getElementById('bulkQuantity').value);
      if (isNaN(qty) || qty < 0) { showToast('⚠️ Enter valid quantity', true); return; }

      let count = 0;
      const toUpdate = cat === 'all' ? products : products.filter(function(p) { return p.category === cat; });
      toUpdate.forEach(function(p) {
        if (type === 'set') p.stock = qty;
        else if (type === 'add') p.stock += qty;
        else if (type === 'subtract') p.stock = Math.max(0, p.stock - qty);
        p.status = p.stock === 0 ? 'Out of Stock' : p.stock <= 10 ? 'Low Stock' : 'Active';
        count++;
      });
      saveProducts(products);
      renderInventory();
      renderProducts();
      updateDashboard();
      addAuditLog('Bulk stock update: ' + type + ' ' + qty + ' for ' + count + ' products (' + cat + ')');
      showToast('Updated ' + count + ' products', false, true);
    });
  }

  // --- ORDERS ---
  var ordersCache = [];

  function getOrders() {
    return ordersCache;
  }

  function fetchOrders(callback) {
    SmileHubData.getOrders(function(data) {
      ordersCache = data;
      if (callback) callback(data);
    });
  }

  function saveOrders(data) {
    ordersCache = data;
    SmileHubData.saveOrders(data);
  }

  function renderOrders(filter) {
    const body = document.getElementById('ordersBody');
    if (!body) return;
    const orders = getOrders();
    let filtered = filter === 'all' ? orders : orders.filter(function(o) { return o.status === filter; });
    filtered.sort(function(a, b) {
      var ta = a.sortTs || (new Date(a.date).getTime() || 0);
      var tb = b.sortTs || (new Date(b.date).getTime() || 0);
      return tb - ta;
    });

    if (filtered.length === 0) {
      body.innerHTML = `<tr><td colspan="7" class="text-center muted" style="padding:40px;">No orders found</td></tr>`;
      updateOrderStats(orders);
      return;
    }

    body.innerHTML = filtered.map(function(order) {
      const cls = order.status === 'Delivered' ? 'delivered' : order.status === 'Processing' ? 'processing' : order.status === 'Shipped' ? 'processing' : order.status === 'Cancelled' ? 'low' : 'processing';
      const icon = order.status === 'Delivered' ? '✅' : order.status === 'Processing' ? '📦' : order.status === 'Shipped' ? '🚚' : order.status === 'Cancelled' ? '❌' : '⏳';
      const count = order.items ? order.items.reduce(function(s, i) { return s + (i.quantity || 1); }, 0) : 0;
      return `
        <tr>
          <td><strong>${order.number}</strong></td>
          <td>${order.customer}</td>
          <td>${order.date}</td>
          <td>₱${Number(order.total).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
          <td>${count} items</td>
          <td><span class="status ${cls}">${icon} ${order.status}</span></td>
          <td>
            <button class="btn btn-light view-order" data-number="${order.number}" style="padding:4px 10px;font-size:0.8rem;">👁️ View</button>
            <select class="order-status-update" data-number="${order.number}" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.8rem;">
              <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
              <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
              <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
              <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
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
        updateOrderStatus(this.dataset.number, this.value);
      });
    });
    updateOrderStats(orders);
  }

  function updateOrderStatus(number, status) {
    const orders = getOrders();
    const idx = orders.findIndex(function(o) { return o.number === number; });
    if (idx === -1) return;
    const old = orders[idx].status;
    orders[idx].status = status;

    // Surgical update: write ONLY this order's document. Rewriting the whole
    // list fails whenever any single order is not writable.
    const refId = orders[idx].docId || orders[idx].number;
    db.collection('orders').doc(refId).update({
      status: status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
      addAuditLog('Changed order ' + number + ' from ' + old + ' to ' + status);
      showToast('Order ' + number + ': ' + old + ' → ' + status, false, true);
    }).catch(function(error) {
      console.error('Order status update failed:', error);
      showToast('Status update failed: ' + (error.code || error.message), true);
    });

    const filter = document.getElementById('orderStatusFilter')?.value || 'all';
    renderOrders(filter);
    closeOrderModal();
  }

  function viewOrder(number) {
    const orders = getOrders();
    const order = orders.find(function(o) { return o.number === number; });
    if (!order) { showToast('❌ Order not found', true); return; }

    const modal = document.getElementById('orderModal');
    const title = document.getElementById('orderModalTitle');
    const content = document.getElementById('orderModalContent');
    if (!modal || !title || !content) return;

    modal.style.display = 'flex';
    title.textContent = 'Order ' + order.number;

    // Add print button next to close
    var closeBtn = modal.querySelector('.btn-light');
    if (closeBtn && !document.getElementById('printSlipBtn')) {
      var printBtn = document.createElement('button');
      printBtn.className = 'btn btn-secondary';
      printBtn.id = 'printSlipBtn';
      printBtn.textContent = 'Print Slip';
      printBtn.style.marginRight = '8px';
      printBtn.onclick = function() { printOrderSlip(order.number); };
      closeBtn.parentNode.insertBefore(printBtn, closeBtn);
    }

    const itemsHtml = order.items ? order.items.map(function(item) {
      return `<tr><td>${item.name}</td><td>${item.quantity || 1}</td><td>₱${Number(item.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td><td>₱${Number((item.quantity || 1) * item.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td></tr>`;
    }).join('') : '';

    const cls = order.status === 'Delivered' ? 'delivered' : order.status === 'Processing' ? 'processing' : order.status === 'Shipped' ? 'processing' : order.status === 'Cancelled' ? 'low' : 'processing';

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">
        <div><strong>Customer:</strong> ${order.customer}</div>
        <div><strong>Email:</strong> ${order.email || 'N/A'}</div>
        <div><strong>Date:</strong> ${order.date}</div>
        <div><strong>Status:</strong> <span class="status ${cls}">${order.status}</span></div>
        <div style="grid-column:span 2;"><strong>Address:</strong><br>${order.address || 'N/A'}</div>
      </div>
      <h3>Items</h3>
      <div class="table-wrap"><table><thead><tr><th>Product</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${itemsHtml}<tr><td colspan="3" style="text-align:right;"><strong>Total:</strong></td><td><strong>₱${Number(order.total).toLocaleString('en-PH', {minimumFractionDigits: 2})}</strong></td></tr></tbody></table></div>
    `;
  }

  function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) modal.style.display = 'none';
  }

  function filterOrders() {
    const filter = document.getElementById('orderStatusFilter')?.value || 'all';
    renderOrders(filter);
  }

  function refreshOrders() {
    const filter = document.getElementById('orderStatusFilter')?.value || 'all';
    renderOrders(filter);
    showToast('🔄 Refreshed', false, false);
  }

  function updateOrderStats(orders) {
    const total = orders.length;
    const pending = orders.filter(function(o) { return o.status === 'Pending'; }).length;
    const processing = orders.filter(function(o) { return o.status === 'Processing' || o.status === 'Shipped'; }).length;
    const delivered = orders.filter(function(o) { return o.status === 'Delivered'; }).length;

    const el1 = document.getElementById('totalOrders');
    const el2 = document.getElementById('pendingOrders');
    const el3 = document.getElementById('processingOrders');
    const el4 = document.getElementById('deliveredToday');
    if (el1) el1.textContent = total;
    if (el2) el2.textContent = pending;
    if (el3) el3.textContent = processing;
    if (el4) el4.textContent = delivered;
  }

  // --- MAKE DASHBOARD CLICKABLE ---
  function makeDashboardClickable() {
    document.querySelectorAll('.kpi-card.clickable').forEach(function(card) {
      card.addEventListener('click', function() {
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
        navigateTo('#inventory');
        setTimeout(function() {
          document.querySelectorAll('#inventoryBody tr').forEach(function(row) {
            var rowName = (row.querySelector('td:nth-child(2)') || {}).textContent || '';
            if (rowName.includes(name)) {
              row.style.background = '#fff3cd';
              row.style.border = '2px solid #f0a320';
              setTimeout(function() { row.style.background = ''; row.style.border = ''; }, 5000);
            }
          });
        }, 300);
      });
    }
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
      
      // Get image from select or custom input
      const imgSelect = document.getElementById('productImageSelect');
      const customInput = document.getElementById('customImageInput');
      let image = imgSelect ? imgSelect.value : '';
      if (customInput && customInput.value.trim()) {
        image = customInput.value.trim();
      }
      
      const stockVal = parseInt(formData.get('stock'));
      const productData = {
        name: formData.get('name') || '',
        brand: formData.get('brand') || '',
        category: formData.get('category') || '',
        price: formData.get('price') || 0,
        sku: formData.get('sku') || '',
        stock: isNaN(stockVal) ? 0 : stockVal,
        image: image,
        description: formData.get('description') || '',
        specs: formData.get('specs') || ''
      };
      
      // Validate required fields
      if (!productData.name.trim()) {
        showToast('⚠️ Product name is required!', true);
        return;
      }
      if (!productData.category) {
        showToast('⚠️ Category is required!', true);
        return;
      }
      if (!productData.price || parseFloat(productData.price) <= 0) {
        showToast('⚠️ Please enter a valid price!', true);
        return;
      }
      
      const productId = formData.get('productId');
      
      if (productId) {
        // Update existing product
        updateProduct(parseInt(productId), productData);
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

  function applyRoleVisibility() {
    const role = getCurrentUserRole();
    if (!role) return;

    // Update top bar with user info
    const user = window.SmileHubAuth && window.SmileHubAuth.getLoggedInUser();
    if (user) {
      const avatarEl = document.getElementById('adminAvatar');
      const nameEl = document.getElementById('adminUsername');
      const roleEl = document.getElementById('adminRoleBadge');
      if (avatarEl) avatarEl.textContent = user.name.charAt(0).toUpperCase();
      if (nameEl) nameEl.textContent = user.name;
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
      }
    });

    // Show/hide sections based on data-role
    document.querySelectorAll('[data-role]').forEach(function(section) {
      const allowedRoles = section.getAttribute('data-role').split(',');
      if (!allowedRoles.includes(role) && !allowedRoles.includes('all')) {
        section.style.display = 'none';
      }
    });

    // Show/hide elements based on data-role-btn
    document.querySelectorAll('[data-role-btn]').forEach(function(el) {
      const allowedRoles = el.getAttribute('data-role-btn').split(',');
      if (!allowedRoles.includes(role)) {
        el.style.display = 'none';
      }
    });
  }

  // --- CMS ---
  function getDefaultCms() {
    return {
      heroHeadline: 'Your Trusted Dental Supply Partner',
      heroSubtitle: 'Quality dental products for clinics, dentists, and students across the Philippines.',
      heroCta: 'Shop Now',
      promoTtext: 'Free shipping on orders over ₱3,000',
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
    if (promoText) promoText.value = data.promoTtext;
    if (promoBtn) promoBtn.value = data.promoBtn;
    if (tagline) tagline.value = data.storeTagline;

    var list = document.getElementById('cmsFaqList');
    if (!list) return;
    if (data.faqs.length === 0) {
      list.innerHTML = '<p class="muted" style="text-align:center;padding:20px;">No FAQs yet. Click "+ Add FAQ" to add one.</p>';
      return;
    }
    list.innerHTML = data.faqs.map(function(faq, i) {
      return '<div class="card" style="padding:14px;margin-bottom:10px;border:1px solid var(--border);border-radius:10px;">' +
        '<div style="display:flex;gap:10px;margin-bottom:8px;">' +
        '<input class="faq-question" data-index="' + i + '" value="' + faq.q.replace(/"/g, '&quot;') + '" placeholder="Question" style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:6px;">' +
        '<button class="btn btn-light delete-faq" data-index="' + i + '" style="padding:6px 12px;font-size:0.8rem;">Remove</button>' +
        '</div>' +
        '<textarea class="faq-answer" data-index="' + i + '" placeholder="Answer" rows="2" style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:6px;">' + faq.a.replace(/"/g, '&quot;') + '</textarea>' +
        '</div>';
    }).join('');

    list.querySelectorAll('.delete-faq').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var idx = parseInt(this.dataset.index);
        var data = loadCms();
        data.faqs.splice(idx, 1);
        saveCms(data);
        renderCms();
        showToast('FAQ removed', false, false);
      });
    });

    list.querySelectorAll('.faq-question, .faq-answer').forEach(function(el) {
      el.addEventListener('input', function() {
        var data = loadCms();
        var idx = parseInt(this.dataset.index);
        var questions = list.querySelectorAll('.faq-question');
        var answers = list.querySelectorAll('.faq-answer');
        questions.forEach(function(q, i) {
          if (data.faqs[i]) { data.faqs[i].q = q.value; }
        });
        answers.forEach(function(a, i) {
          if (data.faqs[i]) { data.faqs[i].a = a.value; }
        });
        saveCms(data);
      });
    });
  }

  function setupCms() {
    var addBtn = document.getElementById('addFaqBtn');
    if (addBtn) {
      addBtn.addEventListener('click', function() {
        var data = loadCms();
        data.faqs.push({ q: 'New question', a: 'New answer' });
        saveCms(data);
        renderCms();
        showToast('New FAQ added', false, true);
      });
    }

    function saveCmsFromForm() {
      var data = loadCms();
      var headline = document.getElementById('cmsHeroHeadline');
      var subtitle = document.getElementById('cmsHeroSubtitle');
      var cta = document.getElementById('cmsHeroCta');
      var promoText = document.getElementById('cmsPromoText');
      var promoBtn = document.getElementById('cmsPromoBtn');
      var tagline = document.getElementById('cmsStoreTagline');
      if (headline) data.heroHeadline = headline.value;
      if (subtitle) data.heroSubtitle = subtitle.value;
      if (cta) data.heroCta = cta.value;
      if (promoText) data.promoTtext = promoText.value;
      if (promoBtn) data.promoBtn = promoBtn.value;
      if (tagline) data.storeTagline = tagline.value;

      // Collect FAQ data
      var questions = document.querySelectorAll('.faq-question');
      var answers = document.querySelectorAll('.faq-answer');
      questions.forEach(function(q, i) {
        if (data.faqs[i]) data.faqs[i].q = q.value;
      });
      answers.forEach(function(a, i) {
        if (data.faqs[i]) data.faqs[i].a = a.value;
      });

      saveCms(data);
      addAuditLog('Updated CMS content');
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
      body.innerHTML = '<tr><td colspan="5" class="text-center muted" style="padding:40px;">No accounts found.</td></tr>';
      updateAccountStats(accounts);
      return;
    }

    var search = (document.getElementById('accountSearch') || {}).value || '';
    var roleFilter = (document.getElementById('accountRoleFilter') || {}).value || 'all';

    var filtered = accounts.filter(function(a) {
      var nameMatch = a.name.toLowerCase().includes(search.toLowerCase());
      var emailMatch = a.email.toLowerCase().includes(search.toLowerCase());
      var roleMatch = roleFilter === 'all' || a.role === roleFilter;
      return (nameMatch || emailMatch) && roleMatch;
    });

    var currentUser = window.SmileHubAuth ? window.SmileHubAuth.getLoggedInUser() : null;
    var isSuper = currentUser && currentUser.role === 'superadmin';

    body.innerHTML = filtered.map(function(a) {
      var roleLabels = { customer: 'Customer', staff: 'Staff', admin: 'Admin', superadmin: 'Super Admin' };
      var roleClass = a.role === 'superadmin' ? 'delivered' : a.role === 'admin' ? 'processing' : a.role === 'staff' ? 'low' : '';
      var statusText = a.status === 'suspended' ? 'Suspended' : 'Active';
      var statusClass = a.status === 'suspended' ? 'low' : 'delivered';

      var roleOptions = ['customer', 'staff', 'admin', 'superadmin'].map(function(r) {
        return '<option value="' + r + '" ' + (a.role === r ? 'selected' : '') + '>' + roleLabels[r] + '</option>';
      }).join('');

      return '<tr>' +
        '<td><strong>' + a.name + '</strong></td>' +
        '<td>' + a.email + '</td>' +
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
    }).join('') || '<tr><td colspan="5" class="text-center muted" style="padding:40px;">No matching accounts.</td></tr>';

    // Role change handlers (superadmin only)
    body.querySelectorAll('.acc-role-select').forEach(function(sel) {
      sel.addEventListener('change', function() {
        var email = this.dataset.email;
        var newRole = this.value;
        var idx = accounts.findIndex(function(a) { return a.email === email; });
        if (idx > -1) {
          var oldRole = accounts[idx].role;
          accounts[idx].role = newRole;
          window.SmileHubAuth.saveAccounts(accounts).then(renderAccounts).catch(function(error) { console.error('Account update failed:', error); showToast('Update failed: ' + (error.code || error.message || 'check console'), true); });
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
          window.SmileHubAuth.saveAccounts(accounts).then(renderAccounts).catch(function(error) { console.error('Account update failed:', error); showToast('Update failed: ' + (error.code || error.message || 'check console'), true); });
          addAuditLog((newStatus === 'suspended' ? 'Suspended' : 'Activated') + ' account: ' + email);
          showToast(email + ' ' + (newStatus === 'suspended' ? 'suspended' : 'activated'), false, true);
        }
      });
    });

    // Delete account handler (superadmin only)
    body.querySelectorAll('.acc-delete').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var email = this.dataset.email;
        if (!confirm('Delete account "' + email + '"? This cannot be undone.')) return;
        var idx = accounts.findIndex(function(a) { return a.email === email; });
        if (idx > -1) {
          var name = accounts[idx].name;
          accounts.splice(idx, 1);
          window.SmileHubAuth.saveAccounts(accounts).then(renderAccounts).catch(function(error) { console.error('Account update failed:', error); showToast('Update failed: ' + (error.code || error.message || 'check console'), true); });
          // Remove the Firestore doc too, otherwise getAccounts() restores it on reload.
          firebase.firestore().collection('accounts').doc(email).delete()
            .catch(function(error) { console.warn('Could not delete account from Firestore:', error); });
          // Also delete matching users/{uid} profile(s) — getAccounts() merges
          // users collection, so a lingering users doc resurrects the account.
          firebase.firestore().collection('users').where('email', '==', email).get()
            .then(function(snap) {
              snap.forEach(function(doc) {
                doc.ref.delete().catch(function() {});
              });
              // Also try lower-cased variant if stored that way
              if (snap.empty && email !== email.toLowerCase()) {
                return firebase.firestore().collection('users').where('email', '==', email.toLowerCase()).get();
              }
            })
            .then(function(snap2) {
              if (snap2 && !snap2.empty) {
                snap2.forEach(function(doc) { doc.ref.delete().catch(function() {}); });
              }
            })
            .catch(function() {});
          addAuditLog('Deleted account: ' + email + ' (' + name + ')');
          showToast('Account deleted: ' + email, false, false);
        }
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
    if (search) search.addEventListener('input', renderAccounts);
    if (filter) filter.addEventListener('change', renderAccounts);

    // Create account form toggle
    var showBtn = document.getElementById('showCreateAccountForm');
    var form = document.getElementById('createAccountForm');
    var cancelBtn = document.getElementById('cancelCreateAccount');
    if (showBtn && form) {
      showBtn.addEventListener('click', function() { form.classList.toggle('show'); });
    }
    if (cancelBtn && form) {
      cancelBtn.addEventListener('click', function() { form.classList.remove('show'); });
    }

    // Create account submit
    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var firstName = document.getElementById('createAccFirstName').value.trim();
        var lastName = document.getElementById('createAccLastName').value.trim();
        var email = document.getElementById('createAccEmail').value.trim().toLowerCase();
        var password = document.getElementById('createAccPassword').value;
        var role = document.getElementById('createAccRole').value;

        if (!firstName || !lastName || !email || !password) {
          showToast('All fields are required', true);
          return;
        }
        if (password.length < 6) {
          showToast('Password must be at least 6 characters', true);
          return;
        }

        if (accounts.some(function(a) { return a.email === email; })) {
          showToast('Email already registered', true);
          return;
        }

        showToast('Pre-registering account...');

        var newAccount = {
          firstName: firstName,
          lastName: lastName,
          name: firstName + ' ' + lastName,
          email: email,
          phone: '',
          address: '',
          role: role,
          status: 'pending'
        };

        accounts.push(newAccount);

        Promise.all([
          window.SmileHubAuth.saveAccounts(accounts),
          firebase.firestore().collection('user_registrations').doc(email).set({
            firstName: firstName,
            lastName: lastName,
            displayName: firstName + ' ' + lastName,
            email: email,
            role: role,
            claimed: false
          })
        ]).then(function() {
          form.classList.remove('show');
          form.reset();
          renderAccounts();
          addAuditLog('Pre-registered: ' + email + ' (' + role + ')');
          showToast('Account pre-registered! User must sign up via Register page to activate.', false, true);
        }).catch(function(error) {
          showToast('Firestore error: ' + error.message, true);
        });
      });
    }
  }

  // --- REPORTS ---
  var reportChartInstance = null;

  function renderReports(period) {
    period = period || 'all';
    var orders = getOrders();

    // Date filter
    var now = new Date();
    var filtered = orders.filter(function(o) {
      if (period === 'all') return true;
      var d = new Date(o.date);
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

    // Stats
    var totalOrders = filtered.length;
    var totalRevenue = filtered.reduce(function(sum, o) { return sum + (o.total || 0); }, 0);
    var totalItems = filtered.reduce(function(sum, o) {
      return sum + (o.items ? o.items.reduce(function(s, i) { return s + (i.quantity || 1); }, 0) : 0);
    }, 0);
    var avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    setText('reportTotalOrders', totalOrders);
    setText('reportRevenue', '₱' + totalRevenue.toLocaleString('en-PH', {minimumFractionDigits: 2}));
    setText('reportAvgOrder', '₱' + avgOrder.toLocaleString('en-PH', {minimumFractionDigits: 2}));
    setText('reportItemsSold', totalItems);

    // Product breakdown
    var productMap = {};
    filtered.forEach(function(o) {
      if (o.items) {
        o.items.forEach(function(item) {
          var name = item.name || 'Unknown';
          if (!productMap[name]) productMap[name] = { orders: 0, units: 0, revenue: 0 };
          productMap[name].orders += 1;
          productMap[name].units += item.quantity || 1;
          productMap[name].revenue += (item.quantity || 1) * (item.price || 0);
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
          return '<tr><td><strong>' + name + '</strong></td><td>' + p.orders + '</td><td>' + p.units + '</td><td>₱' + p.revenue.toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</td></tr>';
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
      'Delivered': '#1e9b61', 'Cancelled': '#d64545'
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

    // Payment summary
    var summary = document.getElementById('reportPaymentSummary');
    if (summary) {
      var totalVal = filtered.reduce(function(s, o) { return s + (o.total || 0); }, 0);
      var pendingVal = filtered.filter(function(o) { return o.status === 'Pending'; }).reduce(function(s, o) { return s + (o.total || 0); }, 0);
      var completedVal = filtered.filter(function(o) { return o.status === 'Delivered'; }).reduce(function(s, o) { return s + (o.total || 0); }, 0);
      summary.innerHTML =
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span>Total Revenue</span><strong>₱' + totalVal.toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);"><span>Pending Payments</span><strong style="color:#f0a320;">₱' + pendingVal.toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;"><span>Completed Payments</span><strong style="color:#1e9b61;">₱' + completedVal.toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</strong></div>' +
        '<div style="display:flex;justify-content:space-between;padding:8px 0;border-top:2px solid var(--border);margin-top:4px;"><span>Orders Count</span><strong>' + filtered.length + '</strong></div>';
    }
  }

  function printReport() {
    var period = document.getElementById('reportPeriod');
    var label = period ? period.options[period.selectedIndex].text : 'All Time';
    var content = document.querySelector('#reports .grid-4') ? document.getElementById('reports').innerHTML : '';
    if (!content) return;

    var win = window.open('', '_blank');
    win.document.write('<html><head><title>Sales Report - ' + label + '</title>' +
      '<style>body{font-family:Arial,sans-serif;padding:30px;color:#203047;}' +
      'table{width:100%;border-collapse:collapse;margin:16px 0;}th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #dce5ec;}' +
      'th{background:#e9f7fb;font-size:0.85rem;text-transform:uppercase;}' +
      '.print-hide{display:none!important;}' +
      'h2{margin:0 0 4px;}.muted{color:#6b7a8c;font-size:0.9rem;}' +
      '.kpi-card{display:inline-block;padding:16px 24px;margin:8px;border:1px solid #dce5ec;border-radius:12px;text-align:center;}' +
      '.kpi-card strong{display:block;font-size:1.5rem;margin-top:4px;}' +
      '@media print{body{padding:0;}}</style></head><body>' +
      '<h1>Sales Report</h1><p class="muted">' + label + ' &middot; Generated ' + new Date().toLocaleString() + '</p>' +
      content.replace(/<button[\s\S]*?<\/button>/g, '').replace(/<canvas[\s\S]*?<\/canvas>/g, '').replace(/id="[^"]*"/g, '') +
      '</body></html>');
    win.document.close();
    setTimeout(function() { win.print(); }, 500);
  }

  // --- PRINT ORDER SLIP ---
  function printOrderSlip(orderNumber) {
    var orders = getOrders();
    var order = orders.find(function(o) { return o.number === orderNumber; });
    if (!order) { showToast('Order not found', true); return; }

    var itemsHtml = order.items ? order.items.map(function(item) {
      return '<tr><td>' + (item.name || 'Item') + '</td><td>' + (item.quantity || 1) + '</td><td>₱' + Number(item.price).toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</td><td>₱' + Number((item.quantity || 1) * item.price).toLocaleString('en-PH', {minimumFractionDigits: 2}) + '</td></tr>';
    }).join('') : '';

    var win = window.open('', '_blank');
    win.document.write('<html><head><title>Order Slip - ' + order.number + '</title>' +
      '<style>' +
      'body{font-family:Arial,sans-serif;padding:40px;color:#203047;max-width:700px;margin:auto;}' +
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
      '<div><strong>Order #</strong>' + order.number + '</div>' +
      '<div><strong>Date</strong>' + order.date + '</div>' +
      '<div><strong>Customer</strong>' + order.customer + '</div>' +
      '<div><strong>Status</strong>' + order.status + '</div>' +
      '<div style="grid-column:span 2;"><strong>Shipping Address</strong>' + (order.address || 'N/A') + '</div>' +
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
      snapshot.forEach(function(doc) { auditLogsCache.push(doc.data()); });
      if (auditLogsCache.length === 0) {
        auditLogsCache = [
          { time: new Date(Date.now() - 3600000).toLocaleString(), admin: 'SmileHub Admin', action: 'Updated stock for Composite Resin A2' },
          { time: new Date(Date.now() - 7200000).toLocaleString(), admin: 'SmileHub Admin', action: 'Changed order SH-2026031 to Processing' },
          { time: new Date(Date.now() - 86400000).toLocaleString(), admin: 'SmileHub Admin', action: 'Published homepage promotion' }
        ];
        var batch = firebase.firestore().batch();
        auditLogsCache.forEach(function(e) {
          batch.add(firebase.firestore().collection('audit_logs'), e);
        });
        batch.commit().catch(function() {});
      }
      if (callback) callback(auditLogsCache);
    }).catch(function() {
      if (callback) callback(auditLogsCache || []);
    });
  }

  function renderAuditLogs() {
    var body = document.getElementById('auditBody');
    if (!body) return;
    var logs = getAuditLogs();
    if (logs.length === 0) {
      body.innerHTML = '<tr><td colspan="3" class="text-center muted" style="padding:40px;">No audit entries yet.</td></tr>';
      return;
    }
    body.innerHTML = logs.map(function(log) {
      return '<tr><td>' + log.time + '</td><td>' + log.admin + '</td><td>' + log.action + '</td></tr>';
    }).join('');
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

    container.innerHTML = templates.map(function(t, i) {
      return '<div class="card form-card" style="margin-bottom:14px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
        '<h3 style="margin:0;">' + t.label + '</h3>' +
        '<button class="btn btn-light reset-template" data-index="' + i + '" style="padding:4px 12px;font-size:0.8rem;">Reset</button>' +
        '</div>' +
        '<div class="form-group"><label>Subject</label><input class="notif-subject" data-index="' + i + '" value="' + t.subject.replace(/"/g, '&quot;') + '" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;"></div>' +
        '<div class="form-group"><label>Body</label><textarea class="notif-body" data-index="' + i + '" rows="3" style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;">' + t.body.replace(/"/g, '&quot;') + '</textarea></div>' +
        '<small class="muted">Use {{customer}}, {{order_number}}, {{total}}, {{address}} as placeholders.</small>' +
        '</div>';
    }).join('');

    container.querySelectorAll('.notif-subject, .notif-body').forEach(function(el) {
      el.addEventListener('input', function() {
        var templates = loadTemplates();
        var idx = parseInt(this.dataset.index);
        var subjects = container.querySelectorAll('.notif-subject');
        var bodies = container.querySelectorAll('.notif-body');
        subjects.forEach(function(s, i) { if (templates[i]) templates[i].subject = s.value; });
        bodies.forEach(function(b, i) { if (templates[i]) templates[i].body = b.value; });
        saveTemplates(templates);
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
    
    setupImagePreview();
    setupSidebarNavigation();
    setupFormSubmit();
    setupBulkStock();
    var productsLoaded = false;
    var ordersLoaded = false;
    function tryRenderDashboard() {
      if (productsLoaded && ordersLoaded) {
        updateDashboard();
      }
    }
    loadProducts(function() {
      renderProducts();
      renderInventory();
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
    fetchCms(function() {
      renderCms();
      setupCms();
    });
    fetchAuditLogs();
    setupAccountSearch();
    if (window.SmileHubAuth) {
      window.SmileHubAuth.getAccounts().then(function(a) {
        accounts = a;
        renderAccounts();
      }).catch(function(error) {
        console.warn('Could not load accounts (check users/{uid} role doc / Firestore rules):', error);
        renderAccounts();
      });
    } else {
      renderAccounts();
    }
    renderNotificationTemplates();

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

    // Clear audit log
    var clearAuditBtn = document.getElementById('clearAuditBtn');
    if (clearAuditBtn) {
      clearAuditBtn.addEventListener('click', function() {
        if (confirm('Clear all audit log entries?')) {
          localStorage.removeItem('smilehub_audit_log');
          renderAuditLogs();
          addAuditLog('Audit log cleared');
          showToast('Audit log cleared', false, false);
        }
      });
    }

    // Hide chatbot
    const wrapper = document.getElementById('chatbotWrapper');
    if (wrapper) wrapper.style.display = 'none';

    // Show/Hide form
    if (showFormBtn) {
      showFormBtn.addEventListener('click', function() {
        if (productModal && productModal.style.display === 'flex') {
          resetForm();
        } else {
          if (productModal) productModal.style.display = 'flex';
          const form = document.getElementById('adminProductForm');
          if (form) {
            form.reset();
            form.querySelector('[name="productId"]').value = '';
            const btn = form.querySelector('button[type="submit"]');
            if (btn) btn.textContent = '💾 Save Product';
            const preview = document.getElementById('previewImg');
            if (preview) preview.src = 'assets/products/oral-care.svg';
            const custom = document.getElementById('customImageInput');
            if (custom) custom.value = '';
            const imgSelect = document.getElementById('productImageSelect');
            if (imgSelect) imgSelect.value = 'assets/products/oral-care.svg';
          }
          var title = document.getElementById('productModalTitle');
          if (title) title.textContent = 'Add Product';
        }
      });
    }

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

    // Close product modal with Escape key
    document.addEventListener('keydown', function(e) {
      var pModal = document.getElementById('productModal');
      if (e.key === 'Escape' && pModal && pModal.style.display !== 'none') resetForm();
    });

    // Modal close - order modal
    document.addEventListener('click', function(e) {
      var modal = document.getElementById('orderModal');
      if (modal && e.target === modal) closeOrderModal();
      var pModal = document.getElementById('productModal');
      if (pModal && e.target === pModal) resetForm();
    });

  }

    // Bridge so global onclick handlers (defined below, outside this
    // closure) can reach internal functions and data.
    window.SmileHubAdmin = {
      getProducts: function() { return products; },
      filterOrders: function(filter) { renderOrders(filter); },
      refreshOrders: function(filter) {
        fetchOrders(function() {
          renderOrders(filter);
          if (window.showToast) showToast('🔄 Orders refreshed', false, false);
        });
      }
    };

  init();
});

// --- GLOBAL FUNCTIONS ---
window.navigateTo = function(sectionId) {
  document.querySelectorAll('.admin-section, #dashboard').forEach(function(s) {
    s.style.display = 'none';
  });
  const target = document.querySelector(sectionId);
  if (target) {
    target.style.display = 'block';
    target.querySelectorAll('.admin-section').forEach(function(s) { s.style.display = ''; });
  }
  document.querySelectorAll('.admin-menu a').forEach(function(l) {
    l.classList.remove('active');
    if (l.getAttribute('href') === sectionId) l.classList.add('active');
  });
};

window.showLowStock = function() {
  const bridge = window.SmileHubAdmin;
  if (!bridge) return;
  const items = bridge.getProducts().filter(function(p) { return p.stock > 0 && p.stock <= 10; });
  if (items.length === 0) { showToast('✅ No low stock items', false, true); return; }
  document.querySelectorAll('#inventoryBody tr').forEach(function(row) {
    const name = row.dataset.product || '';
    const isLow = items.some(function(p) { return p.name === name; });
    row.style.background = isLow ? '#fff3cd' : '';
    row.style.borderRadius = isLow ? '6px' : '';
  });
  showToast('📊 ' + items.length + ' low stock item(s) highlighted', false, false);
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
  showToast('🔄 Refreshed', false, false);
};

window.closeOrderModal = function() {
  const modal = document.getElementById('orderModal');
  if (modal) modal.style.display = 'none';
};

window.showToast = function(msg, isError, isSuccess) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  if (isError) { toast.style.background = '#d64545'; toast.style.color = 'white'; }
  else if (isSuccess) { toast.style.background = '#1e9b61'; toast.style.color = 'white'; }
  else { toast.style.background = '#102c43'; toast.style.color = 'white'; }
  document.body.appendChild(toast);
  setTimeout(function() { toast.remove(); }, 3000);
};