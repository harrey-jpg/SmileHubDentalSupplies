// --- INVENTORY FUNCTIONS ---

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
      <tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.sku}</td>
        <td>
          <input type="number" class="stock-input" data-id="${p.id}" value="${p.stock}" min="0" style="width:80px;padding:6px;">
        </td>
        <td>${lowStockThreshold}</td>
        <td><span class="status ${statusClass}">${status}</span></td>
        <td>
          <button class="btn btn-primary update-stock" data-id="${p.id}" style="padding:4px 12px;font-size:0.8rem;">Update</button>
        </td>
      </tr>
    `;
  }).join('');

  // Add event listeners for stock updates
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

  // Allow Enter key to submit stock update
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
  
  const change = newStock - oldStock;
  const changeText = change > 0 ? `+${change}` : change;
  showToast(`📦 ${product.name}: Stock updated (${oldStock} → ${newStock})`);
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
  // Filter products with low stock
  const lowStockItems = products.filter(function(p) { return p.stock > 0 && p.stock <= 10; });
  if (lowStockItems.length === 0) {
    showToast('✅ No low stock items! All products are well-stocked.');
    return;
  }
  
  // Highlight low stock rows
  document.querySelectorAll('#inventoryBody tr').forEach(function(row) {
    const name = row.querySelector('td:first-child')?.textContent || '';
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
    showToast(`✅ Updated stock for ${updatedCount} products`);
  });
}