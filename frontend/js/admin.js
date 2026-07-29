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

  // Default products
  const defaultProducts = [
    { id: 1, sku: 'SH-OC-001', name: 'ProClean Soft Toothbrush 4-Pack', brand: 'SmilePro', category: 'Oral Care', price: 189, stock: 86, status: 'Active', image: 'assets/products/oral-care.svg', description: 'Soft rounded bristles for gentle daily plaque removal and comfortable gum care.', specs: ['4 toothbrushes', 'Soft nylon bristles', 'Ergonomic non-slip handle'] },
    { id: 2, sku: 'SH-OC-002', name: 'SonicWave Electric Toothbrush', brand: 'Dentiva', category: 'Oral Care', price: 1299, stock: 24, status: 'Active', image: 'assets/products/oral-care.svg', description: 'Rechargeable sonic toothbrush with three cleaning modes and two-minute timer.', specs: ['3 cleaning modes', 'USB-C rechargeable', '2 brush heads included'] },
    { id: 3, sku: 'SH-OC-003', name: 'MintShield Fluoride Toothpaste 150g', brand: 'Oracare', category: 'Oral Care', price: 159, stock: 120, status: 'Active', image: 'assets/products/oral-care.svg', description: 'Daily fluoride toothpaste formulated to strengthen enamel and freshen breath.', specs: ['150g tube', '1450 ppm fluoride', 'Fresh mint flavor'] },
    { id: 4, sku: 'SH-OC-004', name: 'FreshGuard Antibacterial Mouthwash 500mL', brand: 'Oracare', category: 'Oral Care', price: 249, stock: 67, status: 'Active', image: 'assets/products/oral-care.svg', description: 'Alcohol-free antibacterial rinse for everyday oral hygiene and long-lasting freshness.', specs: ['500mL bottle', 'Alcohol-free', 'Cool mint'] },
    { id: 5, sku: 'SH-OC-005', name: 'GlideEase Dental Floss 50m', brand: 'SmilePro', category: 'Oral Care', price: 99, stock: 144, status: 'Active', image: 'assets/products/oral-care.svg', description: 'Waxed shred-resistant floss that slides comfortably between tight contacts.', specs: ['50 meters', 'Waxed PTFE fiber', 'Mint flavored'] },
    { id: 6, sku: 'SH-IN-006', name: 'Stainless Dental Mirror No. 5', brand: 'Clinix', category: 'Instruments', price: 185, stock: 58, status: 'Active', image: 'assets/products/instrument.svg', description: 'Front-surface stainless dental mirror for clear intraoral visibility during examination.', specs: ['No. 5 mirror head', 'Autoclavable', 'Textured handle'] },
    { id: 7, sku: 'SH-IN-007', name: 'Double-Ended Explorer 17/23', brand: 'Clinix', category: 'Instruments', price: 295, stock: 37, status: 'Active', image: 'assets/products/instrument.svg', description: 'Precision explorer with sharp working ends for caries detection and calculus assessment.', specs: ['17/23 pattern', 'Surgical stainless steel', 'Autoclavable'] },
    { id: 8, sku: 'SH-IN-008', name: 'Universal Scaler U15/30', brand: 'Clinix', category: 'Instruments', price: 449, stock: 29, status: 'Active', image: 'assets/products/instrument.svg', description: 'Balanced universal scaler designed for efficient supragingival calculus removal.', specs: ['U15/30 tips', 'Hollow grip handle', 'Corrosion resistant'] },
    { id: 9, sku: 'SH-IN-009', name: 'Premium Extraction Forceps No. 150', brand: 'SurgiDent', category: 'Instruments', price: 1899, stock: 11, status: 'Low Stock', image: 'assets/products/instrument.svg', description: 'Universal upper extraction forceps with serrated beaks and secure ergonomic grip.', specs: ['No. 150 pattern', 'German stainless steel', 'Reinforced hinge'] },
    { id: 10, sku: 'SH-PP-010', name: 'Nitrile Examination Gloves 100s', brand: 'SafeTouch', category: 'PPE', price: 399, stock: 78, status: 'Active', image: 'assets/products/ppe.svg', description: 'Powder-free nitrile examination gloves offering dependable barrier protection and dexterity.', specs: ['100 pieces/box', 'Powder-free', 'Non-sterile', 'Medium'] },
    { id: 11, sku: 'SH-PP-011', name: 'Level 3 Surgical Face Masks 50s', brand: 'SafeTouch', category: 'PPE', price: 279, stock: 94, status: 'Active', image: 'assets/products/ppe.svg', description: 'Three-ply high-filtration masks with comfortable ear loops and adjustable nose strip.', specs: ['50 pieces/box', 'Level 3 protection', 'Fluid resistant'] },
    { id: 12, sku: 'SH-PP-012', name: 'Full-Coverage Face Shield 10s', brand: 'MediGuard', category: 'PPE', price: 349, stock: 43, status: 'Active', image: 'assets/products/ppe.svg', description: 'Anti-fog clear shields with soft forehead foam for full facial splash protection.', specs: ['10 pieces/pack', 'Anti-fog PET visor', 'Elastic headband'] },
    { id: 13, sku: 'SH-RS-013', name: 'NanoFill Composite Resin A2', brand: 'Restora', category: 'Restorative', price: 899, stock: 32, status: 'Active', image: 'assets/products/restorative.svg', description: 'Light-cured nanohybrid composite with smooth handling and excellent polish retention.', specs: ['4g syringe', 'Shade A2', 'Universal anterior/posterior use'] },
    { id: 14, sku: 'SH-RS-014', name: 'Universal Bonding Agent 5mL', brand: 'Restora', category: 'Restorative', price: 1249, stock: 21, status: 'Active', image: 'assets/products/restorative.svg', description: 'Single-bottle universal adhesive compatible with self-etch and total-etch techniques.', specs: ['5mL bottle', 'Light cured', 'Universal bonding protocol'] },
    { id: 15, sku: 'SH-RS-015', name: 'Phosphoric Acid Etchant Gel 3-Pack', brand: 'Restora', category: 'Restorative', price: 329, stock: 49, status: 'Active', image: 'assets/products/restorative.svg', description: 'Controlled-flow 37% phosphoric acid gel for enamel and dentin etching procedures.', specs: ['3 x 3mL syringes', '37% phosphoric acid', 'Blue contrast color'] },
    { id: 16, sku: 'SH-RS-016', name: 'Glass Ionomer Luting Cement Kit', brand: 'CemDent', category: 'Restorative', price: 1399, stock: 18, status: 'Active', image: 'assets/products/restorative.svg', description: 'Radiopaque glass ionomer cement for durable luting of crowns, bridges, and bands.', specs: ['Powder 15g', 'Liquid 10mL', 'High fluoride release'] },
    { id: 17, sku: 'SH-DI-017', name: 'Disposable Dental Bibs 125s', brand: 'ClinicEssentials', category: 'Disposables', price: 449, stock: 70, status: 'Active', image: 'assets/products/disposable.svg', description: 'Two-ply absorbent paper with poly backing for reliable patient protection.', specs: ['125 sheets', '33 x 45 cm', '2-ply paper + poly'] },
    { id: 18, sku: 'SH-DI-018', name: 'Self-Sealing Sterilization Pouches 200s', brand: 'SteriliSafe', category: 'Disposables', price: 699, stock: 34, status: 'Active', image: 'assets/products/disposable.svg', description: 'Medical-grade self-seal pouches with process indicators for steam sterilization.', specs: ['200 pieces', '90 x 260 mm', 'Dual process indicators'] },
    { id: 19, sku: 'SH-DI-019', name: 'Disposable Dental Syringes 100s', brand: 'ClinicEssentials', category: 'Disposables', price: 549, stock: 55, status: 'Active', image: 'assets/products/disposable.svg', description: 'Luer-lock disposable syringes for irrigation and dental material dispensing.', specs: ['100 pieces', '5mL capacity', 'Sterile, individually packed'] },
    { id: 20, sku: 'SH-DI-020', name: 'Absorbent Cotton Rolls 1000s', brand: 'ClinicEssentials', category: 'Disposables', price: 799, stock: 46, status: 'Active', image: 'assets/products/disposable.svg', description: 'Soft, highly absorbent cotton rolls that retain shape during dental procedures.', specs: ['1000 pieces', 'Size No. 2', 'Non-sterile'] },
    { id: 21, sku: 'SH-DI-021', name: 'Fine Microbrush Applicators 100s', brand: 'MicroTip', category: 'Disposables', price: 199, stock: 105, status: 'Active', image: 'assets/products/disposable.svg', description: 'Bendable non-linting micro applicators for bonding agents, etchants, and solutions.', specs: ['100 pieces', 'Fine tip', 'Bendable neck'] },
    { id: 22, sku: 'SH-DI-022', name: 'Flexible Saliva Ejectors 100s', brand: 'ClinicEssentials', category: 'Disposables', price: 219, stock: 88, status: 'Active', image: 'assets/products/disposable.svg', description: 'Smooth-tip flexible ejectors with shape-retaining wire for patient comfort.', specs: ['100 pieces', 'Non-removable tip', 'Latex-free'] },
    { id: 23, sku: 'SH-IM-023', name: 'Premium Alginate Impression Material', brand: 'Impressa', category: 'Impression', price: 499, stock: 40, status: 'Active', image: 'assets/products/impression.svg', description: 'Fast-setting chromatic alginate with smooth consistency and high tear resistance.', specs: ['500g pouch', 'Fast set', 'Mint aroma'] },
    { id: 24, sku: 'SH-IM-024', name: 'VPS Putty Impression Material Kit', brand: 'Impressa', category: 'Impression', price: 2499, stock: 14, status: 'Active', image: 'assets/products/impression.svg', description: 'High-viscosity vinyl polysiloxane putty with excellent dimensional stability.', specs: ['Base 300mL', 'Catalyst 300mL', 'Regular set'] },
    { id: 25, sku: 'SH-OR-025', name: 'Orthodontic Relief Wax 10-Pack', brand: 'OrthoEase', category: 'Orthodontics', price: 299, stock: 73, status: 'Active', image: 'assets/products/orthodontic.svg', description: 'Clear medical-grade wax that protects oral tissue from brackets and wires.', specs: ['10 cases', 'Unscented', 'Pre-portioned strips'] },
    { id: 26, sku: 'SH-OR-026', name: 'Elastic Chain Assortment 15ft', brand: 'OrthoEase', category: 'Orthodontics', price: 749, stock: 27, status: 'Active', image: 'assets/products/orthodontic.svg', description: 'Continuous orthodontic power chain assortment with consistent force delivery.', specs: ['15 feet total', '3 spool assortment', 'Latex-free'] },
    { id: 27, sku: 'SH-RO-027', name: 'Diamond Dental Bur Set 30pcs', brand: 'BurMaster', category: 'Rotary', price: 1199, stock: 19, status: 'Active', image: 'assets/products/instrument.svg', description: 'Assorted high-speed diamond burs for crown preparation, contouring, and finishing.', specs: ['30-piece set', 'FG shank', 'Autoclavable bur block'] },
    { id: 28, sku: 'SH-EQ-028', name: 'LED Curing Light 1200mW', brand: 'LumaDent', category: 'Equipment', price: 3299, stock: 12, status: 'Active', image: 'assets/products/equipment.svg', description: 'Cordless LED curing light with focused output, timer modes, and ergonomic design.', specs: ['1000-1200 mW/cm²', '5/10/15/20 sec timer', 'USB charging dock'] },
    { id: 29, sku: 'SH-EQ-029', name: 'Ultrasonic Scaler with 5 Tips', brand: 'ProSonic', category: 'Equipment', price: 6999, stock: 7, status: 'Low Stock', image: 'assets/products/equipment.svg', description: 'Compact piezoelectric scaler with adjustable power and detachable autoclavable handpiece.', specs: ['5 scaler tips', 'Water flow control', '220V'] },
    { id: 30, sku: 'SH-EQ-030', name: 'Class B Autoclave 18L Demo Unit', brand: 'SteriliTech', category: 'Equipment', price: 89999, stock: 2, status: 'Low Stock', image: 'assets/products/equipment.svg', description: 'Demo listing for an 18-liter Class B sterilizer with digital cycles and safety monitoring.', specs: ['18L chamber', 'Class B cycles', 'Demo / quotation item'] },
    { id: 31, sku: 'SH-EQ-031', name: 'Ergonomic Dental Chair Demo Package', brand: 'ChairPro', category: 'Equipment', price: 189999, stock: 1, status: 'Low Stock', image: 'assets/products/equipment.svg', description: 'Demo dental unit package with programmable chair, delivery system, light, and assistant arm.', specs: ['Programmable chair', 'LED operating light', 'Demo / quotation item'] },
    { id: 32, sku: 'SH-CO-032', name: 'Professional Teeth Whitening Kit', brand: 'BrightDent', category: 'Cosmetic', price: 2899, stock: 16, status: 'Active', image: 'assets/products/restorative.svg', description: 'Clinic-use whitening kit with controlled gel delivery and gingival barrier materials.', specs: ['3 patient treatments', '35% carbamide peroxide', 'Clinic-use demo'] }
  ];

  // --- LOAD PRODUCTS ---
  function loadProducts() {
    let saved = null;
    try {
      const data = localStorage.getItem('smilehub_products');
      if (data) {
        saved = JSON.parse(data);
      }
    } catch (e) {}
    
    if (!saved || saved.length === 0) {
      saved = defaultProducts;
      saveProducts(saved);
    }
    return saved;
  }

  function saveProducts(data) {
    localStorage.setItem('smilehub_products', JSON.stringify(data));
    products = data;
  }

  products = loadProducts();

  // --- DOM REFS ---
  const formBox = document.getElementById('productFormBox');
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
      updateKPIs();
    }
  }

  // --- RENDER PRODUCTS ---
  function renderProducts(filter) {
    products = loadProducts();
    if (!productsBody) return;
    
    const searchTerm = (filter || adminSearch?.value || '').toLowerCase();
    const filtered = products.filter(function(p) {
      return p.name.toLowerCase().includes(searchTerm) ||
             p.sku.toLowerCase().includes(searchTerm) ||
             p.category.toLowerCase().includes(searchTerm);
    });

    if (filtered.length === 0) {
      productsBody.innerHTML = `<tr><td colspan="7" class="text-center muted" style="padding:40px;">No products found.</td></tr>`;
      updateKPIs();
      return;
    }

    productsBody.innerHTML = filtered.map(function(p) {
      const statusClass = p.status === 'Active' ? 'delivered' : p.status === 'Low Stock' ? 'low' : 'processing';
      return `
        <tr>
          <td><img src="${p.image || 'assets/products/default.svg'}" alt="${p.name}" style="width:40px;height:40px;object-fit:contain;background:var(--sky);border-radius:6px;padding:4px;"></td>
          <td>${p.sku}</td>
          <td><strong>${p.name}</strong></td>
          <td>${p.category}</td>
          <td>₱${Number(p.price).toLocaleString('en-PH', {minimumFractionDigits: 2})}</td>
          <td><span class="status ${statusClass}">${p.status}</span></td>
          <td>
            <button class="btn btn-light edit-product" data-id="${p.id}" style="padding:6px 12px;font-size:0.8rem;">✏️ Edit</button>
            <button class="btn btn-danger delete-product" data-id="${p.id}" style="padding:6px 12px;font-size:0.8rem;">🗑️</button>
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
    products = loadProducts();
    const threshold = 10;

    body.innerHTML = products.map(function(p) {
      const status = p.stock === 0 ? 'Out of Stock' : p.stock <= threshold ? 'Low Stock' : 'In Stock';
      const statusClass = p.stock === 0 ? 'processing' : p.stock <= threshold ? 'low' : 'delivered';
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
              updateKPIs();
              showToast('📦 Stock updated: ' + product.name + ' (' + old + ' → ' + val + ')', false, true);
            }
          } else {
            showToast('⚠️ Enter a valid number', true);
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
              updateKPIs();
              showToast('📦 Stock updated: ' + product.name + ' (' + old + ' → ' + val + ')', false, true);
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
    const newProduct = {
      id: newId,
      sku: data.sku || 'SH-' + String(newId).padStart(3, '0'),
      name: data.name,
      brand: data.brand || '',
      category: data.category,
      price: parseFloat(data.price),
      stock: 0,
      status: 'Out of Stock',
      image: image,
      description: data.description || '',
      specs: data.specs ? data.specs.split(',').map(function(s) { return s.trim(); }) : []
    };
    products.push(newProduct);
    saveProducts(products);
    renderProducts();
    updateKPIs();
    showToast('✅ Product "' + newProduct.name + '" added!', false, true);
    showToast('⚠️ Set stock in Inventory section', false, false);
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
      
      formBox.classList.add('show');
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.textContent = '✏️ Update Product';
      showToast('📝 Editing: ' + product.name, false, false);
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
    products[index].description = data.description || '';
    products[index].specs = data.specs ? data.specs.split(',').map(function(s) { return s.trim(); }) : [];
    // Keep stock and status unchanged
    
    saveProducts(products);
    renderProducts();
    updateKPIs();
    showToast('✅ Product "' + oldName + '" updated!', false, true);
    resetForm();
  }

  function deleteProduct(id) {
    const product = products.find(function(p) { return p.id === id; });
    if (!product) return;
    if (confirm('🗑️ Delete "' + product.name + '"?')) {
      products = products.filter(function(p) { return p.id !== id; });
      saveProducts(products);
      renderProducts();
      updateKPIs();
      showToast('🗑️ Product "' + product.name + '" deleted', false, false);
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
    formBox.classList.remove('show');
  }

  // --- KPIs ---
  function updateKPIs() {
    products = loadProducts();
    const total = products.length;
    const low = products.filter(function(p) { return p.stock > 0 && p.stock <= 10; }).length;
    const out = products.filter(function(p) { return p.stock === 0; }).length;
    const revenue = products.reduce(function(sum, p) { return sum + (p.price * p.stock); }, 0);

    const cards = document.querySelectorAll('.kpi-card');
    if (cards.length >= 4) {
      const today = Math.round(revenue * 0.05);
      const el1 = cards[0].querySelector('strong');
      const el1s = cards[0].querySelector('small');
      if (el1) el1.textContent = '₱' + today.toLocaleString();
      if (el1s) el1s.textContent = (today > 0 ? Math.round(today / 1000) : 0) + ' orders';
      
      const el2 = cards[1].querySelector('strong');
      const el2s = cards[1].querySelector('small');
      if (el2) el2.textContent = '₱' + revenue.toLocaleString();
      if (el2s) el2s.textContent = 'From ' + total + ' products';
      
      const el3 = cards[2].querySelector('strong');
      const el3s = cards[2].querySelector('small');
      if (el3) el3.textContent = Math.round(total * 3.5);
      if (el3s) el3s.textContent = Math.round(total * 0.3) + ' active';
      
      const el4 = cards[3].querySelector('strong');
      const el4s = cards[3].querySelector('small');
      if (el4) el4.textContent = low + out;
      if (el4s) el4s.textContent = low + ' low, ' + out + ' out';
    }
    updateInventoryStats();
  }

  function updateInventoryStats() {
    products = loadProducts();
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
    products = loadProducts();
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
      updateKPIs();
      showToast('✅ Updated ' + count + ' products', false, true);
    });
  }

  // --- ORDERS ---
  function getOrders() {
    let orders = [];
    try {
      const saved = localStorage.getItem('smilehub_orders');
      if (saved) orders = JSON.parse(saved);
    } catch (e) {}
    if (!orders || orders.length === 0) {
      orders = [
        { number: 'SH-2026031', customer: 'Maria Santos', email: 'maria@email.com', date: new Date().toLocaleDateString(), total: 2743.20, items: [{ name: 'ProClean Toothbrush', quantity: 2, price: 189 }, { name: 'Nitrile Gloves', quantity: 1, price: 399 }], status: 'Pending', address: '123 Sample St, Quezon City' },
        { number: 'SH-2026030', customer: 'BrightSmile Clinic', email: 'clinic@brightsmile.com', date: new Date(Date.now() - 86400000).toLocaleDateString(), total: 899.00, items: [{ name: 'Composite Resin A2', quantity: 1, price: 899 }], status: 'Delivered', address: '456 Dental Ave, Makati' },
        { number: 'SH-2026029', customer: 'John Dela Cruz', email: 'john@email.com', date: new Date(Date.now() - 172800000).toLocaleDateString(), total: 2345.50, items: [{ name: 'SonicWave Toothbrush', quantity: 1, price: 1299 }, { name: 'MintShield Toothpaste', quantity: 3, price: 159 }], status: 'Delivered', address: '789 Health St, Mandaluyong' }
      ];
      localStorage.setItem('smilehub_orders', JSON.stringify(orders));
    }
    return orders;
  }

  function saveOrders(data) { localStorage.setItem('smilehub_orders', JSON.stringify(data)); }

  function renderOrders(filter) {
    const body = document.getElementById('ordersBody');
    if (!body) return;
    const orders = getOrders();
    let filtered = filter === 'all' ? orders : orders.filter(function(o) { return o.status === filter; });
    filtered.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

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
    saveOrders(orders);
    const filter = document.getElementById('orderStatusFilter')?.value || 'all';
    renderOrders(filter);
    closeOrderModal();
    showToast('📋 Order ' + number + ': ' + old + ' → ' + status, false, true);
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
    document.querySelectorAll('.inventory-alert-item').forEach(function(item) {
      item.addEventListener('click', function() {
        const name = this.dataset.product;
        navigateTo('#inventory');
        setTimeout(function() {
          document.querySelectorAll('#inventoryBody tr').forEach(function(row) {
            const rowName = row.querySelector('td:nth-child(2)')?.textContent || '';
            if (rowName.includes(name)) {
              row.style.background = '#fff3cd';
              row.style.border = '2px solid #f0a320';
              setTimeout(function() { row.style.background = ''; row.style.border = ''; }, 5000);
            }
          });
        }, 300);
      });
    });
  }

  // --- SIDEBAR NAVIGATION ---
  function setupSidebarNavigation() {
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
      
      const productData = {
        name: formData.get('name') || '',
        brand: formData.get('brand') || '',
        category: formData.get('category') || '',
        price: formData.get('price') || 0,
        sku: formData.get('sku') || '',
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

  // --- INIT ---
  function init() {
    // Hide all sections first
    document.querySelectorAll('.admin-section').forEach(function(s) {
      s.style.display = 'none';
    });
    
    // Show dashboard by default
    const dash = document.getElementById('dashboard');
    if (dash) dash.style.display = 'block';
    
    // Set active sidebar link
    document.querySelectorAll('.admin-menu a').forEach(function(link) {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#dashboard') {
        link.classList.add('active');
      }
    });
    
    renderProducts();
    renderInventory();
    renderOrders('all');
    makeDashboardClickable();
    setupSidebarNavigation();
    setupBulkStock();
    setupImagePreview();
    setupFormSubmit(); // This is the key fix!
    updateKPIs();

    // Hide chatbot
    const wrapper = document.getElementById('chatbotWrapper');
    if (wrapper) wrapper.style.display = 'none';

    // Show/Hide form
    if (showFormBtn) {
      showFormBtn.addEventListener('click', function() {
        if (formBox.classList.contains('show')) { 
          resetForm(); 
        } else {
          formBox.classList.add('show');
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
        }
      });
    }

    // Search
    if (adminSearch) {
      adminSearch.addEventListener('input', function() { 
        renderProducts(this.value); 
      });
    }

    // Modal close
    document.addEventListener('click', function(e) {
      const modal = document.getElementById('orderModal');
      if (modal && e.target === modal) closeOrderModal();
    });
  }

  init();
});

// --- GLOBAL FUNCTIONS ---
window.navigateTo = function(sectionId) {
  document.querySelectorAll('.admin-section, #dashboard').forEach(function(s) {
    s.style.display = 'none';
  });
  const target = document.querySelector(sectionId);
  if (target) target.style.display = 'block';
  document.querySelectorAll('.admin-menu a').forEach(function(l) {
    l.classList.remove('active');
    if (l.getAttribute('href') === sectionId) l.classList.add('active');
  });
};

window.showLowStock = function() {
  const products = JSON.parse(localStorage.getItem('smilehub_products') || '[]');
  const items = products.filter(function(p) { return p.stock > 0 && p.stock <= 10; });
  if (items.length === 0) { showToast('✅ No low stock items', false, true); return; }
  document.querySelectorAll('#inventoryBody tr').forEach(function(row) {
    const name = row.querySelector('td:nth-child(2)')?.textContent || '';
    const isLow = items.some(function(p) { return p.name === name; });
    row.style.background = isLow ? '#fff3cd' : '';
  });
  showToast('📊 ' + items.length + ' low stock items', false, false);
};

window.filterOrders = function() {
  const filter = document.getElementById('orderStatusFilter')?.value || 'all';
  renderOrders(filter);
};

window.refreshOrders = function() {
  const filter = document.getElementById('orderStatusFilter')?.value || 'all';
  renderOrders(filter);
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