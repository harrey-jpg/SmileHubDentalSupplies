// admin.js - Full Functional Admin Dashboard

document.addEventListener('DOMContentLoaded', function() {
  // --- DATA STORE ---
  let products = [];
  
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

  // Try to load products from productDetails if available
  if (typeof productDetails !== 'undefined') {
    products = Object.entries(productDetails).map(function([id, product]) {
      return {
        id: parseInt(id),
        sku: product.sku || 'SH-' + String(id).padStart(3, '0'),
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        status: product.stock > 10 ? 'Active' : product.stock > 0 ? 'Low Stock' : 'Out of Stock',
        image: product.image || categoryImages[product.category] || 'assets/products/default.svg'
      };
    });
  } else {
    products = [
      { id: 1, sku: 'SH-001', name: 'ProClean Toothbrush', category: 'Oral Care', price: 189, stock: 86, status: 'Active', image: 'assets/products/oral-care.svg' },
      { id: 2, sku: 'SH-002', name: 'SonicWave Toothbrush', category: 'Oral Care', price: 1299, stock: 24, status: 'Active', image: 'assets/products/oral-care.svg' },
    ];
  }

  // Load products from localStorage if available
  const savedProducts = window.SmileHubStorage ? window.SmileHubStorage.get('admin_products', null) : null;
  if (savedProducts && Array.isArray(savedProducts) && savedProducts.length > 0) {
    products = savedProducts;
  }

  // --- DOM REFERENCES ---
  const formBox = document.getElementById('productFormBox');
  const showProductFormBtn = document.getElementById('showProductForm');
  const productForm = document.getElementById('productFormBox');
  const adminSearch = document.getElementById('adminSearch');
  const productsBody = document.getElementById('adminProductsBody');

  // --- IMAGE PREVIEW ---
  function setupImagePreview() {
    const categorySelect = document.getElementById('productCategory');
    const imageSelect = document.getElementById('productImageSelect');
    const customImageInput = document.getElementById('customImageInput');
    const previewImg = document.getElementById('previewImg');

    function updatePreview(src) {
      if (previewImg) {
        previewImg.src = src;
      }
    }

    if (categorySelect) {
      categorySelect.addEventListener('change', function() {
        const category = this.value;
        const imagePath = categoryImages[category] || 'assets/products/default.svg';
        if (imageSelect) {
          const options = imageSelect.options;
          let found = false;
          for (let i = 0; i < options.length; i++) {
            if (options[i].value === imagePath) {
              imageSelect.selectedIndex = i;
              found = true;
              break;
            }
          }
          if (!found) {
            const newOption = document.createElement('option');
            newOption.value = imagePath;
            newOption.textContent = '📁 ' + category;
            imageSelect.appendChild(newOption);
            imageSelect.value = imagePath;
          }
        }
        updatePreview(imagePath);
        if (customImageInput) customImageInput.value = '';
      });
    }

    if (imageSelect) {
      imageSelect.addEventListener('change', function() {
        updatePreview(this.value);
        if (customImageInput) customImageInput.value = '';
      });
    }

    if (customImageInput) {
      customImageInput.addEventListener('input', function() {
        if (this.value.trim()) {
          updatePreview(this.value.trim());
          if (imageSelect) imageSelect.value = '';
        }
      });
    }
  }

  // --- NAVIGATION FUNCTION ---
  function navigateTo(sectionId) {
    document.querySelectorAll('.admin-section, #dashboard').forEach(function(section) {
      section.style.display = 'none';
    });
    
    const target = document.querySelector(sectionId);
    if (target) target.style.display = 'block';
    
    document.querySelectorAll('.admin-menu a').forEach(function(link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === sectionId) {
        link.classList.add('active');
      }
    });
    
    if (sectionId === '#products') {
      renderProducts(adminSearch ? adminSearch.value : '');
    }
    if (sectionId === '#inventory') {
      renderInventory();
    }
    if (sectionId === '#orders') {
      const filter = document.getElementById('orderStatusFilter')?.value || 'all';
      renderOrders(filter);
    }
  }

  // --- MAKE DASHBOARD CLICKABLE ---
  function makeDashboardClickable() {
    document.querySelectorAll('.kpi-card.clickable').forEach(function(card) {
      card.addEventListener('click', function() {
        const target = this.dataset.target;
        if (target) navigateTo(target);
      });
    });

    document.querySelectorAll('.inventory-alert-item').forEach(function(item) {
      item.addEventListener('click', function() {
        const productName = this.dataset.product;
        navigateTo('#inventory');
        setTimeout(function() {
          highlightProduct(productName);
        }, 300);
      });
    });
  }

  function highlightProduct(productName) {
    const rows = document.querySelectorAll('#inventoryBody tr');
    rows.forEach(function(row) {
      const name = row.querySelector('td:nth-child(2)')?.textContent || '';
      if (name.includes(productName)) {
        row.style.background = '#fff3cd';
        row.style.border = '2px solid #f0a320';
        setTimeout(function() {
          row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 200);
        setTimeout(function() {
          row.style.background = '';
          row.style.border = '';
        }, 5000);
      }
    });
  }

  // --- RENDER PRODUCTS ---
  function renderProducts(filter = '') {
    if (!productsBody) return;
    
    const filtered = products.filter(function(p) {
      const searchTerm = filter.toLowerCase();
      return p.name.toLowerCase().includes(searchTerm) ||
             p.sku.toLowerCase().includes(searchTerm) ||
             p.category.toLowerCase().includes(searchTerm);
    });

    if (filtered.length === 0) {
      productsBody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center muted" style="padding: 40px;">
            No products found. Click "Add Product" to create one.
          </td>
        </tr>
      `;
      return;
    }

    productsBody.innerHTML = filtered.map(function(p) {
      const statusClass = p.status === 'Active' ? 'delivered' : 
                         p.status === 'Low Stock' ? 'low' : 'processing';
      
      return `
        <tr>
          <td><img src="${p.image || 'assets/products/default.svg'}" alt="${p.name}" style="width:40px;height:40px;object-fit:contain;background:var(--sky);border-radius:6px;padding:4px;"></td>
          <td>${p.sku}</td>
          <td><strong>${p.name}</strong></td>
          <td>${p.category}</td>
          <td>₱${Number(p.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
          <td>${p.stock}</td>
          <td><span class="status ${statusClass}">${p.status}</span></td>
          <td>
            <button class="btn btn-light edit-product" data-id="${p.id}" style="padding: 6px 12px; font-size: 0.8rem;">✏️ Edit</button>
            <button class="btn btn-danger delete-product" data-id="${p.id}" style="padding: 6px 12px; font-size: 0.8rem;">🗑️</button>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.edit-product').forEach(function(btn) {
      btn.addEventListener('click', function() {
        editProduct(parseInt(btn.dataset.id));
      });
    });

    document.querySelectorAll('.delete-product').forEach(function(btn) {
      btn.addEventListener('click', function() {
        deleteProduct(parseInt(btn.dataset.id));
      });
    });

    updateKPIs();
  }

  // --- RENDER INVENTORY ---
  function renderInventory() {
    const body = document.getElementById('inventoryBody');
    if (!body) return;

    const lowStockThreshold = 10;
    
    body.innerHTML = products.map(function(p) {
      const status = p.stock === 0 ? 'Out of Stock' :
                     p.stock <= lowStockThreshold ? 'Low Stock' : 'In Stock';
      const statusClass = p.stock === 0 ? 'processing' :
                          p.stock <= lowStockThreshold ? 'low' : 'delivered';
      
      return `
        <tr data-product="${p.name}">
          <td><img src="${p.image || 'assets/products/default.svg'}" alt="${p.name}" style="width:35px;height:35px;object-fit:contain;background:var(--sky);border-radius:6px;padding:3px;"></td>
          <td><strong>${p.name}</strong></td>
          <td>${p.sku}</td>
          <td>
            <input type="number" class="stock-input" data-id="${p.id}" value="${p.stock}" min="0" style="width:80px;padding:6px;border:1px solid var(--border);border-radius:6px;">
          </td>
          <td>${lowStockThreshold}</td>
          <td><span class="status ${statusClass}">${status}</span></td>
          <td>
            <button class="btn btn-primary update-stock" data-id="${p.id}" style="padding:4px 12px;font-size:0.8rem;">Update</button>
          </td>
        </tr>
      `;
    }).join('');

    document.querySelectorAll('.update-stock').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const id = parseInt(btn.dataset.id);
        const input = document.querySelector(`.stock-input[data-id="${id}"]`);
        if (input) {
          const newStock = parseInt(input.value);
          if (!isNaN(newStock) && newStock >= 0) {
            updateStock(id, newStock);
          } else {
            showToast('⚠️ Please enter a valid stock number', true);
          }
        }
      });
    });

    document.querySelectorAll('.stock-input').forEach(function(input) {
      input.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
          const id = parseInt(input.dataset.id);
          const newStock = parseInt(input.value);
          if (!isNaN(newStock) && newStock >= 0) {
            updateStock(id, newStock);
          }
        }
      });
    });

    updateInventoryStats();
  }

  function updateStock(id, newStock) {
    const product = products.find(function(p) { return p.id === id; });
    if (!product) {
      showToast('❌ Product not found!', true);
      return;
    }

    const oldStock = product.stock;
    product.stock = newStock;
    product.status = newStock === 0 ? 'Out of Stock' :
                     newStock <= 10 ? 'Low Stock' : 'Active';
    
    saveProducts();
    renderInventory();
    renderProducts(adminSearch ? adminSearch.value : '');
    updateKPIs();
    
    showToast('📦 ' + product.name + ': Stock updated (' + oldStock + ' → ' + newStock + ')');
  }

  // --- CRUD OPERATIONS ---
  function addProduct(productData) {
    const newId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
    
    let image = productData.image;
    if (!image || image === '') {
      image = categoryImages[productData.category] || 'assets/products/default.svg';
    }
    
    const newProduct = {
      id: newId,
      sku: productData.sku || 'SH-' + String(newId).padStart(3, '0'),
      name: productData.name,
      category: productData.category,
      price: parseFloat(productData.price),
      stock: parseInt(productData.stock),
      status: parseInt(productData.stock) > 10 ? 'Active' : 
              parseInt(productData.stock) > 0 ? 'Low Stock' : 'Out of Stock',
      image: image
    };
    
    products.push(newProduct);
    saveProducts();
    renderProducts(adminSearch ? adminSearch.value : '');
    showToast('✅ Product "' + newProduct.name + '" added successfully!');
    return newProduct;
  }

  function editProduct(id) {
    const product = products.find(function(p) { return p.id === id; });
    if (!product) {
      showToast('❌ Product not found!', true);
      return;
    }

    const form = document.getElementById('adminProductForm');
    if (form) {
      form.querySelector('[name="productId"]').value = product.id;
      form.querySelector('[name="name"]').value = product.name;
      form.querySelector('[name="category"]').value = product.category;
      form.querySelector('[name="price"]').value = product.price;
      form.querySelector('[name="stock"]').value = product.stock;
      
      const imageSelect = document.getElementById('productImageSelect');
      const customImageInput = document.getElementById('customImageInput');
      const previewImg = document.getElementById('previewImg');
      
      if (imageSelect) {
        let found = false;
        for (let i = 0; i < imageSelect.options.length; i++) {
          if (imageSelect.options[i].value === product.image) {
            imageSelect.selectedIndex = i;
            found = true;
            break;
          }
        }
        if (!found && product.image) {
          imageSelect.value = '';
          if (customImageInput) customImageInput.value = product.image;
          if (previewImg) previewImg.src = product.image;
        } else {
          if (customImageInput) customImageInput.value = '';
          if (previewImg) previewImg.src = product.image;
        }
      }
      
      formBox.classList.add('show');
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = '✏️ Update Product';
    }
  }

  function updateProduct(id, productData) {
    const index = products.findIndex(function(p) { return p.id === id; });
    if (index === -1) {
      showToast('❌ Product not found!', true);
      return;
    }

    let image = productData.image;
    if (!image || image === '') {
      image = categoryImages[productData.category] || 'assets/products/default.svg';
    }

    products[index].name = productData.name;
    products[index].category = productData.category;
    products[index].price = parseFloat(productData.price);
    products[index].stock = parseInt(productData.stock);
    products[index].image = image;
    products[index].status = parseInt(productData.stock) > 10 ? 'Active' : 
                            parseInt(productData.stock) > 0 ? 'Low Stock' : 'Out of Stock';
    
    saveProducts();
    renderProducts(adminSearch ? adminSearch.value : '');
    showToast('✅ Product "' + products[index].name + '" updated successfully!');
    resetForm();
  }

  function deleteProduct(id) {
    const product = products.find(function(p) { return p.id === id; });
    if (!product) return;
    
    if (confirm('🗑️ Are you sure you want to delete "' + product.name + '"?')) {
      products = products.filter(function(p) { return p.id !== id; });
      saveProducts();
      renderProducts(adminSearch ? adminSearch.value : '');
      showToast('🗑️ Product "' + product.name + '" deleted.');
    }
  }

  function saveProducts() {
    if (window.SmileHubStorage) {
      window.SmileHubStorage.set('admin_products', products);
    }
    try {
      localStorage.setItem('admin_products', JSON.stringify(products));
    } catch (e) {}
  }

  function resetForm() {
    const form = document.getElementById('adminProductForm');
    if (form) {
      form.reset();
      form.querySelector('[name="productId"]').value = '';
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = '💾 Save Product';
    }
    formBox.classList.remove('show');
  }

  // --- UPDATE KPIs ---
  function updateKPIs() {
    const totalProducts = products.length;
    const lowStock = products.filter(function(p) { return p.stock <= 10 && p.stock > 0; }).length;
    const outOfStock = products.filter(function(p) { return p.stock === 0; }).length;
    const totalRevenue = products.reduce(function(sum, p) { return sum + (p.price * p.stock); }, 0);

    const kpiCards = document.querySelectorAll('.kpi-card');
    if (kpiCards.length >= 4) {
      const todaySales = Math.round(totalRevenue * 0.05);
      kpiCards[0].querySelector('strong').textContent = '₱' + todaySales.toLocaleString();
      kpiCards[0].querySelector('small').textContent = (todaySales > 0 ? Math.round(todaySales / 1000) : 0) + ' completed orders';
      
      kpiCards[1].querySelector('strong').textContent = '₱' + totalRevenue.toLocaleString();
      kpiCards[1].querySelector('small').textContent = 'From ' + totalProducts + ' products';
      
      kpiCards[2].querySelector('strong').textContent = Math.round(totalProducts * 3.5);
      kpiCards[2].querySelector('small').textContent = Math.round(totalProducts * 0.3) + ' active this week';
      
      kpiCards[3].querySelector('strong').textContent = lowStock + outOfStock;
      kpiCards[3].querySelector('small').textContent = lowStock + ' need restock, ' + outOfStock + ' out of stock';
    }
  }

  function updateInventoryStats() {
    const totalStock = products.reduce(function(sum, p) { return sum + p.stock; }, 0);
    const lowStock = products.filter(function(p) { return p.stock > 0 && p.stock <= 10; }).length;
    const outOfStock = products.filter(function(p) { return p.stock === 0; }).length;
    const totalValue = products.reduce(function(sum, p) { return sum + (p.price * p.stock); }, 0);

    const totalStockEl = document.getElementById('totalStockCount');
    const lowStockEl = document.getElementById('lowStockCount');
    const outOfStockEl = document.getElementById('outOfStockCount');
    const inventoryValueEl = document.getElementById('inventoryValue');

    if (totalStockEl) totalStockEl.textContent = totalStock;
    if (lowStockEl) lowStockEl.textContent = lowStock;
    if (outOfStockEl) outOfStockEl.textContent = outOfStock;
    if (inventoryValueEl) inventoryValueEl.textContent = '₱' + totalValue.toLocaleString();
  }

  function showLowStock() {
    const lowStockItems = products.filter(function(p) { return p.stock > 0 && p.stock <= 10; });
    if (lowStockItems.length === 0) {
      showToast('✅ No low stock items! All products are well-stocked.');
      return;
    }
    
    document.querySelectorAll('#inventoryBody tr').forEach(function(row) {
      const name = row.querySelector('td:nth-child(2)')?.textContent || '';
      const isLowStock = lowStockItems.some(function(p) { return p.name === name; });
      row.style.background = isLowStock ? '#fff3cd' : '';
    });
  }

  // --- BULK STOCK UPDATE ---
  function setupBulkStockForm() {
    const form = document.getElementById('bulkStockForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const categoryFilter = document.getElementById('bulkCategoryFilter').value;
      const adjustmentType = document.getElementById('bulkAdjustmentType').value;
      const quantity = parseInt(document.getElementById('bulkQuantity').value);

      if (isNaN(quantity) || quantity < 0) {
        showToast('⚠️ Please enter a valid quantity', true);
        return;
      }

      let updatedCount = 0;
      const productsToUpdate = categoryFilter === 'all' ? 
        products : 
        products.filter(function(p) { return p.category === categoryFilter; });

      productsToUpdate.forEach(function(p) {
        if (adjustmentType === 'set') {
          p.stock = quantity;
        } else if (adjustmentType === 'add') {
          p.stock += quantity;
        } else if (adjustmentType === 'subtract') {
          p.stock = Math.max(0, p.stock - quantity);
        }
        p.status = p.stock === 0 ? 'Out of Stock' :
                   p.stock <= 10 ? 'Low Stock' : 'Active';
        updatedCount++;
      });

      saveProducts();
      renderInventory();
      renderProducts(adminSearch ? adminSearch.value : '');
      updateKPIs();
      showToast('✅ Updated stock for ' + updatedCount + ' products');
    });
  }

  // ============================================
  // ORDER MANAGEMENT FUNCTIONS
  // ============================================

  function getOrders() {
    let orders = [];
    
    if (window.SmileHubStorage) {
      orders = window.SmileHubStorage.get('smilehub_simple_orders', []);
    }
    
    if (!orders || orders.length === 0) {
      try {
        const saved = localStorage.getItem('smilehub_simple_orders');
        if (saved) {
          orders = JSON.parse(saved);
        }
      } catch (e) {}
    }
    
    if (!orders || orders.length === 0) {
      orders = [
        {
          number: 'SH-2026031',
          customer: 'Maria Santos',
          email: 'maria@email.com',
          date: new Date().toLocaleDateString(),
          total: 2743.20,
          items: [
            { name: 'ProClean Toothbrush', quantity: 2, price: 189 },
            { name: 'Nitrile Gloves', quantity: 1, price: 399 }
          ],
          status: 'Pending',
          address: '123 Sample St, Quezon City'
        },
        {
          number: 'SH-2026030',
          customer: 'BrightSmile Clinic',
          email: 'clinic@brightsmile.com',
          date: new Date(Date.now() - 86400000).toLocaleDateString(),
          total: 899.00,
          items: [
            { name: 'Composite Resin A2', quantity: 1, price: 899 }
          ],
          status: 'Delivered',
          address: '456 Dental Ave, Makati'
        },
        {
          number: 'SH-2026029',
          customer: 'John Dela Cruz',
          email: 'john@email.com',
          date: new Date(Date.now() - 172800000).toLocaleDateString(),
          total: 2345.50,
          items: [
            { name: 'SonicWave Toothbrush', quantity: 1, price: 1299 },
            { name: 'MintShield Toothpaste', quantity: 3, price: 159 }
          ],
          status: 'Delivered',
          address: '789 Health St, Mandaluyong'
        }
      ];
      saveOrders(orders);
    }
    
    return orders;
  }

  function saveOrders(orders) {
    if (window.SmileHubStorage) {
      window.SmileHubStorage.set('smilehub_simple_orders', orders);
    }
    try {
      localStorage.setItem('smilehub_simple_orders', JSON.stringify(orders));
    } catch (e) {}
  }

  function renderOrders(filter = 'all') {
    const body = document.getElementById('ordersBody');
    if (!body) return;

    const orders = getOrders();
    
    // Filter orders
    let filtered = orders;
    if (filter !== 'all') {
      filtered = orders.filter(function(order) {
        return order.status === filter;
      });
    }

    // Sort by date (newest first)
    filtered.sort(function(a, b) {
      return new Date(b.date) - new Date(a.date);
    });

    if (filtered.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="7" class="text-center muted" style="padding: 40px;">
            No orders found with status "${filter}". 
            ${filter !== 'all' ? '<a href="#" onclick="document.getElementById(\'orderStatusFilter\').value=\'all\';filterOrders();return false;" style="color:var(--blue);text-decoration:underline;">View all orders</a>' : ''}
          </td>
        </tr>
      `;
      updateOrderStats(orders);
      return;
    }

    body.innerHTML = filtered.map(function(order) {
      const statusClass = order.status === 'Delivered' ? 'delivered' :
                          order.status === 'Processing' ? 'processing' :
                          order.status === 'Shipped' ? 'processing' :
                          order.status === 'Cancelled' ? 'low' : 'processing';
      
      const statusIcon = order.status === 'Delivered' ? '✅' :
                         order.status === 'Processing' ? '📦' :
                         order.status === 'Shipped' ? '🚚' :
                         order.status === 'Cancelled' ? '❌' : '⏳';
      
      const itemCount = order.items ? order.items.reduce(function(sum, item) {
        return sum + (item.quantity || 1);
      }, 0) : 0;
      
      return `
        <tr>
          <td><strong>${order.number}</strong></td>
          <td>${order.customer}</td>
          <td>${order.date}</td>
          <td>₱${Number(order.total).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
          <td>${itemCount} items</td>
          <td><span class="status ${statusClass}">${statusIcon} ${order.status}</span></td>
          <td>
            <button class="btn btn-light view-order" data-number="${order.number}" style="padding:4px 10px;font-size:0.8rem;">👁️ View</button>
            <select class="order-status-update" data-number="${order.number}" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.8rem;background:var(--white);color:var(--text);">
              <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>⏳ Pending</option>
              <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>📦 Processing</option>
              <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>🚚 Shipped</option>
              <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>✅ Delivered</option>
              <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>❌ Cancelled</option>
            </select>
          </td>
        </tr>
      `;
    }).join('');

    // View order button
    document.querySelectorAll('.view-order').forEach(function(btn) {
      btn.addEventListener('click', function() {
        const orderNumber = this.dataset.number;
        viewOrderDetails(orderNumber);
      });
    });

    // Status update dropdown
    document.querySelectorAll('.order-status-update').forEach(function(select) {
      select.addEventListener('change', function() {
        const orderNumber = this.dataset.number;
        const newStatus = this.value;
        updateOrderStatus(orderNumber, newStatus);
      });
    });

    updateOrderStats(orders);
  }

  function updateOrderStats(orders) {
    const total = orders.length;
    const pending = orders.filter(function(o) { return o.status === 'Pending'; }).length;
    const processing = orders.filter(function(o) { return o.status === 'Processing'; }).length;
    const shipped = orders.filter(function(o) { return o.status === 'Shipped'; }).length;
    const delivered = orders.filter(function(o) { return o.status === 'Delivered'; }).length;
    const cancelled = orders.filter(function(o) { return o.status === 'Cancelled'; }).length;

    const totalEl = document.getElementById('totalOrders');
    const pendingEl = document.getElementById('pendingOrders');
    const processingEl = document.getElementById('processingOrders');
    const deliveredEl = document.getElementById('deliveredToday');

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (processingEl) processingEl.textContent = processing + (shipped > 0 ? ' (+' + shipped + ' shipped)' : '');
    if (deliveredEl) deliveredEl.textContent = delivered + (cancelled > 0 ? ' (+' + cancelled + ' cancelled)' : '');
  }

  function updateOrderStatus(orderNumber, newStatus) {
    const orders = getOrders();
    const orderIndex = orders.findIndex(function(o) {
      return o.number === orderNumber;
    });

    if (orderIndex === -1) {
      showToast('❌ Order not found!', true);
      return;
    }

    const oldStatus = orders[orderIndex].status;
    orders[orderIndex].status = newStatus;
    
    if (newStatus === 'Delivered') {
      orders[orderIndex].deliveredDate = new Date().toLocaleDateString();
    }

    saveOrders(orders);
    
    const currentFilter = document.getElementById('orderStatusFilter')?.value || 'all';
    renderOrders(currentFilter);
    
    closeOrderModal();
    
    showToast('📋 Order ' + orderNumber + ' updated: ' + oldStatus + ' → ' + newStatus);
  }

  function viewOrderDetails(orderNumber) {
    const orders = getOrders();
    const order = orders.find(function(o) {
      return o.number === orderNumber;
    });

    if (!order) {
      showToast('❌ Order not found!', true);
      return;
    }

    const modal = document.getElementById('orderModal');
    const title = document.getElementById('orderModalTitle');
    const content = document.getElementById('orderModalContent');

    if (modal && title && content) {
      modal.style.display = 'flex';
      title.textContent = 'Order ' + order.number;
      
      const itemsHtml = order.items ? order.items.map(function(item) {
        return `
          <tr>
            <td>${item.name}</td>
            <td>${item.quantity || 1}</td>
            <td>₱${Number(item.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
            <td>₱${Number((item.quantity || 1) * item.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
          </tr>
        `;
      }).join('') : '';

      const statusClass = order.status === 'Delivered' ? 'delivered' :
                          order.status === 'Processing' ? 'processing' :
                          order.status === 'Shipped' ? 'processing' :
                          order.status === 'Cancelled' ? 'low' : 'processing';

      content.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
          <div>
            <strong>Customer:</strong> ${order.customer}
          </div>
          <div>
            <strong>Email:</strong> ${order.email || 'N/A'}
          </div>
          <div>
            <strong>Date:</strong> ${order.date}
          </div>
          <div>
            <strong>Status:</strong> <span class="status ${statusClass}">${order.status}</span>
          </div>
          <div style="grid-column: span 2;">
            <strong>Delivery Address:</strong><br>
            ${order.address || 'N/A'}
          </div>
        </div>
        
        <h3>Order Items</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr>
                <td colspan="3" style="text-align:right;"><strong>Total:</strong></td>
                <td><strong>₱${Number(order.total).toLocaleString('en-PH', {minimumFractionDigits: 2})}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }
  }

  function closeOrderModal() {
    const modal = document.getElementById('orderModal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  function filterOrders() {
    const filter = document.getElementById('orderStatusFilter')?.value || 'all';
    renderOrders(filter);
  }

  function refreshOrders() {
    const filter = document.getElementById('orderStatusFilter')?.value || 'all';
    renderOrders(filter);
    showToast('🔄 Orders refreshed');
  }

  // --- TOAST ---
  function showToast(message, isError) {
    const oldToast = document.querySelector('.toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    if (isError) {
      toast.style.background = '#d64545';
    }
    document.body.appendChild(toast);

    setTimeout(function() {
      toast.remove();
    }, 3000);
  }

  // --- EVENT LISTENERS ---
  if (showProductFormBtn) {
    showProductFormBtn.addEventListener('click', function() {
      if (formBox.classList.contains('show')) {
        resetForm();
      } else {
        formBox.classList.add('show');
        const form = document.getElementById('adminProductForm');
        if (form) {
          form.reset();
          form.querySelector('[name="productId"]').value = '';
          const submitBtn = form.querySelector('button[type="submit"]');
          if (submitBtn) submitBtn.textContent = '💾 Save Product';
          
          const previewImg = document.getElementById('previewImg');
          if (previewImg) previewImg.src = 'assets/products/oral-care.svg';
          const customInput = document.getElementById('customImageInput');
          if (customInput) customInput.value = '';
          const imageSelect = document.getElementById('productImageSelect');
          if (imageSelect) imageSelect.value = 'assets/products/oral-care.svg';
        }
      }
    });
  }

  if (productForm) {
    productForm.addEventListener('submit', function(event) {
      event.preventDefault();
      const form = document.getElementById('adminProductForm');
      const formData = new FormData(form);
      
      const imageSelect = document.getElementById('productImageSelect');
      const customImageInput = document.getElementById('customImageInput');
      let image = imageSelect ? imageSelect.value : '';
      if (customImageInput && customImageInput.value.trim()) {
        image = customImageInput.value.trim();
      }
      
      const productData = {
        name: formData.get('name'),
        category: formData.get('category'),
        price: formData.get('price'),
        stock: formData.get('stock'),
        sku: formData.get('sku') || '',
        image: image
      };

      if (!productData.name || !productData.category || !productData.price || !productData.stock) {
        showToast('⚠️ Please fill in all required fields!', true);
        return;
      }

      const productId = formData.get('productId');
      if (productId) {
        updateProduct(parseInt(productId), productData);
      } else {
        addProduct(productData);
      }
    });
  }

  if (adminSearch) {
    adminSearch.addEventListener('input', function() {
      renderProducts(this.value);
    });
  }

  // --- SIDEBAR NAVIGATION ---
  document.querySelectorAll('.admin-menu a').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const target = this.getAttribute('href');
      
      document.querySelectorAll('.admin-menu a').forEach(function(l) {
        l.classList.remove('active');
      });
      this.classList.add('active');
      
      navigateTo(target);
    });
  });

  // --- ORDER MODAL CLOSE ON OUTSIDE CLICK ---
  document.addEventListener('click', function(e) {
    const modal = document.getElementById('orderModal');
    if (modal && e.target === modal) {
      closeOrderModal();
    }
  });

  // --- INIT ---
  function init() {
    document.querySelectorAll('.admin-section').forEach(function(section) {
      section.style.display = 'none';
    });
    const dashboard = document.getElementById('dashboard');
    if (dashboard) dashboard.style.display = 'block';
    
    renderProducts();
    makeDashboardClickable();
    setupBulkStockForm();
    setupImagePreview();
    renderOrders('all');
    
    // Hide chatbot on admin page
    const chatbotWrapper = document.getElementById('chatbotWrapper');
    if (chatbotWrapper) {
      chatbotWrapper.style.display = 'none';
    }
  }

  init();
});

// --- GLOBAL FUNCTIONS ---
window.navigateTo = function(sectionId) {
  document.querySelectorAll('.admin-section, #dashboard').forEach(function(section) {
    section.style.display = 'none';
  });
  const target = document.querySelector(sectionId);
  if (target) target.style.display = 'block';
  
  document.querySelectorAll('.admin-menu a').forEach(function(link) {
    link.classList.remove('active');
    if (link.getAttribute('href') === sectionId) {
      link.classList.add('active');
    }
  });
};

window.showLowStock = function() {
  const lowStockItems = window.products ? window.products.filter(function(p) { return p.stock > 0 && p.stock <= 10; }) : [];
  if (lowStockItems.length === 0) {
    showToast('✅ No low stock items! All products are well-stocked.');
    return;
  }
  
  document.querySelectorAll('#inventoryBody tr').forEach(function(row) {
    const name = row.querySelector('td:nth-child(2)')?.textContent || '';
    const isLowStock = lowStockItems.some(function(p) { return p.name === name; });
    row.style.background = isLowStock ? '#fff3cd' : '';
  });
};

window.filterOrders = function() {
  const filter = document.getElementById('orderStatusFilter')?.value || 'all';
  renderOrders(filter);
};

window.refreshOrders = function() {
  const filter = document.getElementById('orderStatusFilter')?.value || 'all';
  renderOrders(filter);
  showToast('🔄 Orders refreshed');
};

window.closeOrderModal = function() {
  const modal = document.getElementById('orderModal');
  if (modal) {
    modal.style.display = 'none';
  }
};

window.updateOrderStatus = function(orderNumber, newStatus) {
  // This is called from the dropdown
  const orders = getOrders();
  const orderIndex = orders.findIndex(function(o) {
    return o.number === orderNumber;
  });

  if (orderIndex === -1) {
    showToast('❌ Order not found!', true);
    return;
  }

  const oldStatus = orders[orderIndex].status;
  orders[orderIndex].status = newStatus;
  
  if (newStatus === 'Delivered') {
    orders[orderIndex].deliveredDate = new Date().toLocaleDateString();
  }

  saveOrders(orders);
  
  const currentFilter = document.getElementById('orderStatusFilter')?.value || 'all';
  renderOrders(currentFilter);
  
  closeOrderModal();
  
  showToast('📋 Order ' + orderNumber + ' updated: ' + oldStatus + ' → ' + newStatus);
};

window.viewOrderDetails = function(orderNumber) {
  const orders = getOrders();
  const order = orders.find(function(o) {
    return o.number === orderNumber;
  });

  if (!order) {
    showToast('❌ Order not found!', true);
    return;
  }

  const modal = document.getElementById('orderModal');
  const title = document.getElementById('orderModalTitle');
  const content = document.getElementById('orderModalContent');

  if (modal && title && content) {
    modal.style.display = 'flex';
    title.textContent = 'Order ' + order.number;
    
    const itemsHtml = order.items ? order.items.map(function(item) {
      return `
        <tr>
          <td>${item.name}</td>
          <td>${item.quantity || 1}</td>
          <td>₱${Number(item.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
          <td>₱${Number((item.quantity || 1) * item.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
        </tr>
      `;
    }).join('') : '';

    const statusClass = order.status === 'Delivered' ? 'delivered' :
                        order.status === 'Processing' ? 'processing' :
                        order.status === 'Shipped' ? 'processing' :
                        order.status === 'Cancelled' ? 'low' : 'processing';

    content.innerHTML = `
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:20px;">
        <div>
          <strong>Customer:</strong> ${order.customer}
        </div>
        <div>
          <strong>Email:</strong> ${order.email || 'N/A'}
        </div>
        <div>
          <strong>Date:</strong> ${order.date}
        </div>
        <div>
          <strong>Status:</strong> <span class="status ${statusClass}">${order.status}</span>
        </div>
        <div style="grid-column: span 2;">
          <strong>Delivery Address:</strong><br>
          ${order.address || 'N/A'}
        </div>
      </div>
      
      <h3>Order Items</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
            <tr>
              <td colspan="3" style="text-align:right;"><strong>Total:</strong></td>
              <td><strong>₱${Number(order.total).toLocaleString('en-PH', {minimumFractionDigits: 2})}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    `;
  }
};

window.showToast = function(message, isError) {
  const oldToast = document.querySelector('.toast');
  if (oldToast) oldToast.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  if (isError) {
    toast.style.background = '#d64545';
  }
  document.body.appendChild(toast);

  setTimeout(function() {
    toast.remove();
  }, 3000);
};