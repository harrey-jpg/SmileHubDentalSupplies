var db = firebase.firestore();

var defaultProducts = [
  { id: 1, sku: 'SH-OC-001', name: 'ProClean Soft Toothbrush 4-Pack', brand: 'SmilePro', category: 'Oral Care', price: 189, stock: 86, status: 'Active', image: 'assets/products/oral-care.svg', description: 'Soft rounded bristles for gentle daily plaque removal and comfortable gum care.', specs: ['4 toothbrushes', 'Soft nylon bristles', 'Ergonomic non-slip handle'] },
  { id: 2, sku: 'SH-OC-002', name: 'SonicWave Electric Toothbrush', brand: 'Dentiva', category: 'Oral Care', price: 1299, stock: 24, status: 'Active', image: 'assets/products/oral-care.svg', description: 'Rechargeable sonic toothbrush with three cleaning modes and two-minute timer.', specs: ['3 cleaning modes', 'USB-C rechargeable', '2 brush heads included'] },
  { id: 3, sku: 'SH-OC-003', name: 'MintShield Fluoride Toothpaste 150g', brand: 'Oracare', category: 'Oral Care', price: 159, stock: 120, status: 'Active', image: 'assets/products/oral-care.svg' },
  { id: 4, sku: 'SH-OC-004', name: 'FreshGuard Antibacterial Mouthwash 500mL', brand: 'Oracare', category: 'Oral Care', price: 249, stock: 67, status: 'Active', image: 'assets/products/oral-care.svg' },
  { id: 5, sku: 'SH-OC-005', name: 'GlideEase Dental Floss 50m', brand: 'SmilePro', category: 'Oral Care', price: 99, stock: 144, status: 'Active', image: 'assets/products/oral-care.svg' },
  { id: 6, sku: 'SH-IN-006', name: 'Stainless Dental Mirror No. 5', brand: 'Clinix', category: 'Instruments', price: 185, stock: 58, status: 'Active', image: 'assets/products/instrument.svg' },
  { id: 7, sku: 'SH-IN-007', name: 'Double-Ended Explorer 17/23', brand: 'Clinix', category: 'Instruments', price: 295, stock: 37, status: 'Active', image: 'assets/products/instrument.svg' },
  { id: 8, sku: 'SH-IN-008', name: 'Universal Scaler U15/30', brand: 'Clinix', category: 'Instruments', price: 449, stock: 29, status: 'Active', image: 'assets/products/instrument.svg' },
  { id: 9, sku: 'SH-IN-009', name: 'Premium Extraction Forceps No. 150', brand: 'SurgiDent', category: 'Instruments', price: 1899, stock: 11, status: 'Low Stock', image: 'assets/products/instrument.svg' },
  { id: 10, sku: 'SH-PP-010', name: 'Nitrile Examination Gloves 100s', brand: 'SafeTouch', category: 'PPE', price: 399, stock: 78, status: 'Active', image: 'assets/products/ppe.svg' },
  { id: 11, sku: 'SH-PP-011', name: 'Level 3 Surgical Face Masks 50s', brand: 'SafeTouch', category: 'PPE', price: 279, stock: 94, status: 'Active', image: 'assets/products/ppe.svg' },
  { id: 12, sku: 'SH-PP-012', name: 'Full-Coverage Face Shield 10s', brand: 'MediGuard', category: 'PPE', price: 349, stock: 43, status: 'Active', image: 'assets/products/ppe.svg' },
  { id: 13, sku: 'SH-RS-013', name: 'NanoFill Composite Resin A2', brand: 'Restora', category: 'Restorative', price: 899, stock: 32, status: 'Active', image: 'assets/products/restorative.svg' },
  { id: 14, sku: 'SH-RS-014', name: 'Universal Bonding Agent 5mL', brand: 'Restora', category: 'Restorative', price: 1249, stock: 21, status: 'Active', image: 'assets/products/restorative.svg' },
  { id: 15, sku: 'SH-RS-015', name: 'Phosphoric Acid Etchant Gel 3-Pack', brand: 'Restora', category: 'Restorative', price: 329, stock: 49, status: 'Active', image: 'assets/products/restorative.svg' },
  { id: 16, sku: 'SH-RS-016', name: 'Glass Ionomer Luting Cement Kit', brand: 'CemDent', category: 'Restorative', price: 1399, stock: 18, status: 'Active', image: 'assets/products/restorative.svg' },
  { id: 17, sku: 'SH-DI-017', name: 'Disposable Dental Bibs 125s', brand: 'ClinicEssentials', category: 'Disposables', price: 449, stock: 70, status: 'Active', image: 'assets/products/disposable.svg' },
  { id: 18, sku: 'SH-DI-018', name: 'Self-Sealing Sterilization Pouches 200s', brand: 'SteriliSafe', category: 'Disposables', price: 699, stock: 34, status: 'Active', image: 'assets/products/disposable.svg' },
  { id: 19, sku: 'SH-DI-019', name: 'Disposable Dental Syringes 100s', brand: 'ClinicEssentials', category: 'Disposables', price: 549, stock: 55, status: 'Active', image: 'assets/products/disposable.svg' },
  { id: 20, sku: 'SH-DI-020', name: 'Absorbent Cotton Rolls 1000s', brand: 'ClinicEssentials', category: 'Disposables', price: 799, stock: 46, status: 'Active', image: 'assets/products/disposable.svg' },
  { id: 21, sku: 'SH-DI-021', name: 'Fine Microbrush Applicators 100s', brand: 'MicroTip', category: 'Disposables', price: 199, stock: 105, status: 'Active', image: 'assets/products/disposable.svg' },
  { id: 22, sku: 'SH-DI-022', name: 'Flexible Saliva Ejectors 100s', brand: 'ClinicEssentials', category: 'Disposables', price: 219, stock: 88, status: 'Active', image: 'assets/products/disposable.svg' },
  { id: 23, sku: 'SH-IM-023', name: 'Premium Alginate Impression Material', brand: 'Impressa', category: 'Impression', price: 499, stock: 40, status: 'Active', image: 'assets/products/impression.svg' },
  { id: 24, sku: 'SH-IM-024', name: 'VPS Putty Impression Material Kit', brand: 'Impressa', category: 'Impression', price: 2499, stock: 14, status: 'Active', image: 'assets/products/impression.svg' },
  { id: 25, sku: 'SH-OR-025', name: 'Orthodontic Relief Wax 10-Pack', brand: 'OrthoEase', category: 'Orthodontics', price: 299, stock: 73, status: 'Active', image: 'assets/products/orthodontic.svg' },
  { id: 26, sku: 'SH-OR-026', name: 'Elastic Chain Assortment 15ft', brand: 'OrthoEase', category: 'Orthodontics', price: 749, stock: 27, status: 'Active', image: 'assets/products/orthodontic.svg' },
  { id: 27, sku: 'SH-RO-027', name: 'Diamond Dental Bur Set 30pcs', brand: 'BurMaster', category: 'Rotary', price: 1199, stock: 19, status: 'Active', image: 'assets/products/instrument.svg' },
  { id: 28, sku: 'SH-EQ-028', name: 'LED Curing Light 1200mW', brand: 'LumaDent', category: 'Equipment', price: 3299, stock: 12, status: 'Active', image: 'assets/products/equipment.svg' },
  { id: 29, sku: 'SH-EQ-029', name: 'Ultrasonic Scaler with 5 Tips', brand: 'ProSonic', category: 'Equipment', price: 6999, stock: 7, status: 'Low Stock', image: 'assets/products/equipment.svg' },
  { id: 30, sku: 'SH-EQ-030', name: 'Class B Autoclave 18L Demo Unit', brand: 'SteriliTech', category: 'Equipment', price: 89999, stock: 2, status: 'Low Stock', image: 'assets/products/equipment.svg' },
  { id: 31, sku: 'SH-EQ-031', name: 'Ergonomic Dental Chair Demo Package', brand: 'ChairPro', category: 'Equipment', price: 189999, stock: 1, status: 'Low Stock', image: 'assets/products/equipment.svg' },
  { id: 32, sku: 'SH-CO-032', name: 'Professional Teeth Whitening Kit', brand: 'BrightDent', category: 'Cosmetic', price: 2899, stock: 16, status: 'Active', image: 'assets/products/restorative.svg' }
];

var categoryImages = {
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

function getProducts(callback) {
  db.collection('products').orderBy('id', 'asc').get().then(function(snapshot) {
    var products = [];
    snapshot.forEach(function(doc) {
      products.push(doc.data());
    });
    if (products.length === 0) {
      seedDefaultProducts(callback);
    } else {
      callback(products);
    }
  }).catch(function() {
    callback(defaultProducts);
  });
}

function seedDefaultProducts(callback) {
  var batch = db.batch();
  defaultProducts.forEach(function(p) {
    var ref = db.collection('products').doc(String(p.id));
    batch.set(ref, p);
  });
  batch.commit().then(function() {
    callback(defaultProducts);
  }).catch(function() {
    callback(defaultProducts);
  });
}

function getProductsSync(callback) {
  var cached = SmileHubStorage.get('smilehub_products_cache', null);
  if (cached) {
    callback(cached);
  }
  getProducts(function(products) {
    SmileHubStorage.set('smilehub_products_cache', products);
    callback(products);
  });
}

function saveProducts(products, callback) {
  var batch = db.batch();
  products.forEach(function(p) {
    var ref = db.collection('products').doc(String(p.id));
    batch.set(ref, p);
  });
  SmileHubStorage.set('smilehub_products_cache', products);
  batch.commit().then(function() {
    if (callback) callback();
  }).catch(function() {
    if (callback) callback();
  });
}

function addProduct(data, callback) {
  getProducts(function(products) {
    var newId = products.length > 0 ? Math.max.apply(null, products.map(function(p) { return p.id; })) + 1 : 1;
    var image = data.image || categoryImages[data.category] || 'assets/products/default.svg';
    var stock = typeof data.stock === 'number' ? data.stock : 0;
    var newProduct = {
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
    saveProducts(products, function() {
      if (callback) callback(newProduct);
    });
  });
}

function updateProductById(id, data, callback) {
  getProducts(function(products) {
    var index = products.findIndex(function(p) { return p.id === id; });
    if (index === -1) { if (callback) callback(null); return; }
    for (var key in data) {
      if (key !== 'id') products[index][key] = data[key];
    }
    saveProducts(products, function() {
      if (callback) callback(products[index]);
    });
  });
}

function deleteProductById(id, callback) {
  getProducts(function(products) {
    products = products.filter(function(p) { return p.id !== id; });
    saveProducts(products, function() {
      db.collection('products').doc(String(id)).delete().catch(function() {});
      if (callback) callback();
    });
  });
}

function getOrders(callback) {
  db.collection('orders').orderBy('date', 'desc').get().then(function(snapshot) {
    var orders = [];
    snapshot.forEach(function(doc) {
      orders.push(doc.data());
    });
    callback(orders.length ? orders : getDefaultOrders());
  }).catch(function() {
    callback(getDefaultOrders());
  });
}

function getDefaultOrders() {
  var orders = SmileHubStorage.get('smilehub_orders', []);
  if (orders.length > 0) {
    saveOrdersToFirestore(orders);
  }
  return orders;
}

function saveOrdersToFirestore(orders) {
  orders.forEach(function(o) {
    db.collection('orders').doc(o.number).set(o).catch(function() {});
  });
}

function saveOrders(orders, callback) {
  SmileHubStorage.set('smilehub_orders', orders);
  var batch = db.batch();
  orders.forEach(function(o) {
    var ref = db.collection('orders').doc(o.number);
    batch.set(ref, o);
  });
  batch.commit().then(function() {
    if (callback) callback();
  }).catch(function() {
    if (callback) callback();
  });
}

function getCms(callback) {
  db.collection('cms').doc('site').get().then(function(doc) {
    if (doc.exists) {
      callback(doc.data());
    } else {
      var defaults = getDefaultCms();
      db.collection('cms').doc('site').set(defaults).catch(function() {});
      callback(defaults);
    }
  }).catch(function() {
    callback(getDefaultCms());
  });
}

function getDefaultCms() {
  return {
    heroHeadline: 'Your Trusted Dental Supply Partner',
    heroSubtitle: 'Quality dental products for clinics, dentists, and students across the Philippines.',
    heroCta: 'Shop Now',
    promoTtext: 'Free shipping on orders over ₱3,000',
    storeTagline: 'SmileHub Dental Supplies'
  };
}

function saveCms(data, callback) {
  db.collection('cms').doc('site').set(data).then(function() {
    SmileHubStorage.set('smilehub_cms_live', data);
    if (callback) callback();
  }).catch(function() {
    SmileHubStorage.set('smilehub_cms_live', data);
    if (callback) callback();
  });
}

var SmileHubData = {
  getProducts: getProducts,
  getProductsSync: getProductsSync,
  saveProducts: saveProducts,
  addProduct: addProduct,
  updateProductById: updateProductById,
  deleteProductById: deleteProductById,
  getOrders: getOrders,
  saveOrders: saveOrders,
  getCms: getCms,
  saveCms: saveCms,
  categoryImages: categoryImages,
  defaultProducts: defaultProducts
};

window.SmileHubData = SmileHubData;