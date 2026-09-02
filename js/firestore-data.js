var db = firebase.firestore();

// Seeding demo data requires admin privileges. Track attempts per browser
// session so non-admin visitors don't fire denied writes on every page load.
function seedAlreadyAttempted(key) {
  try {
    if (sessionStorage.getItem(key)) return true;
    sessionStorage.setItem(key, '1');
  } catch (e) {}
  return false;
}

function canAttemptSeed(key) {
  // Only signed-in users can possibly have write access; guests never do.
  return Boolean(firebase.auth().currentUser) && !seedAlreadyAttempted(key);
}

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
    if (products.length === 0 && canAttemptSeed('smilehub_seed_products')) {
      seedDefaultProducts(callback);
    } else {
      callback(products.length ? products : defaultProducts);
    }
  }).catch(function(error) {
    console.warn('Could not load products from Firestore:', error);
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
  }).catch(function(error) {
    console.warn('Could not seed default products (requires admin):', error);
    callback(defaultProducts);
  });
}

function getProductsSync(callback) {
  getProducts(function(products) {
    callback(products);
  });
}

function saveProducts(products, callback) {
  var batch = db.batch();
  products.forEach(function(p) {
    var ref = db.collection('products').doc(String(p.id));
    batch.set(ref, p);
  });
  batch.set(db.collection('products_meta').doc('latest'), {
    version: firebase.firestore.FieldValue.increment(1),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  batch.commit().then(function() {
    if (callback) callback();
  }).catch(function(error) {
    console.warn('Could not save products to Firestore:', error);
    if (callback) callback();
  });
}

function getProductsMeta(callback) {
  db.collection('products_meta').doc('latest').get().then(function(doc) {
    callback(doc.exists ? doc.data() : null);
  }).catch(function() {
    callback(null);
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

function getLocalOrders() {
  try {
    var raw = localStorage.getItem('smilehub_orders');
    var arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

function mergeOrders(local, remote) {
  var byNumber = {};
  remote.forEach(function(o) {
    var n = o.number || o.orderNumber;
    if (n) byNumber[n] = o;
  });
  local.forEach(function(o) {
    var n = o.number || o.orderNumber;
    if (n && !byNumber[n]) byNumber[n] = o;
  });
  return Object.keys(byNumber).map(function(n) { return byNumber[n]; });
}

function getOrders(callback) {
  var local = getLocalOrders();
  // Customers may only read their own orders (firestore.rules: userId == uid),
  // so a plain collection get is denied for non-admins. Use a filtered query.
  var user = (typeof getCachedUser === 'function' ? getCachedUser() : null);
  var isAdminUser = false;
  try {
    var role = user && user.role;
    isAdminUser = role && ['admin','staff','superadmin'].indexOf(String(role).toLowerCase()) !== -1;
  } catch(e){}
  var ordersQuery = (!isAdminUser && user && user.uid)
    ? db.collection('orders').where('userId', '==', user.uid)
    : db.collection('orders');
  // No orderBy('date') here: mobile-app orders store createdAt instead and
  // Firestore silently excludes documents missing the ordered field.
  ordersQuery.get().then(function(snapshot) {
    var orders = [];
    snapshot.forEach(function(doc) {
      var o = doc.data();
      // Remember the real document id so admin edits update the correct
      // record (mobile orders use auto-ids, not their number as id).
      o.docId = doc.id;
      if (!o.date && o.createdAt && typeof o.createdAt.toDate === 'function') {
        try {
          var created = o.createdAt.toDate();
          o.date = created.toLocaleDateString();
          o.sortTs = created.getTime();
        } catch (e) {}
      }
      if (!o.number) o.number = o.orderNumber || doc.id;
      if (!o.email) o.email = o.customerEmail || o.customer_email || '';
      if (!o.customer) o.customer = o.customerName || o.customerEmail || 'Mobile customer';
      if (!o.address && o.shippingAddress && typeof o.shippingAddress === 'object') {
        var sa = o.shippingAddress;
        o.address = [sa.recipient, sa.phone, sa.address].filter(Boolean).join(' • ');
      }
      orders.push(o);
    });
    if (orders.length === 0 && canAttemptSeed('smilehub_seed_orders')) {
      var defaults = getDefaultOrders();
      orders = mergeOrders(local, defaults);
      var batch = db.batch();
      defaults.forEach(function(o) { batch.set(db.collection('orders').doc(o.number), o); });
      batch.commit().catch(function(error) {
        console.warn('Could not seed demo orders (requires admin):', error);
      });
    } else {
      orders = mergeOrders(local, orders.length ? orders : getDefaultOrders());
    }
    callback(orders);
  }).catch(function(error) {
    console.warn('Could not load orders from Firestore:', error);
    callback(mergeOrders(local, getDefaultOrders()));
  });
}

function getDefaultOrders() {
  return [
    { number: 'SH-2026031', customer: 'Maria Santos', email: 'maria@email.com', date: new Date().toLocaleDateString(), total: 2743.20, items: [{ name: 'ProClean Toothbrush', quantity: 2, price: 189 }, { name: 'Nitrile Gloves', quantity: 1, price: 399 }], status: 'Pending', address: '123 Sample St, Quezon City' },
    { number: 'SH-2026030', customer: 'BrightSmile Clinic', email: 'clinic@brightsmile.com', date: new Date(Date.now() - 86400000).toLocaleDateString(), total: 899.00, items: [{ name: 'Composite Resin A2', quantity: 1, price: 899 }], status: 'Delivered', address: '456 Dental Ave, Makati' },
    { number: 'SH-2026029', customer: 'John Dela Cruz', email: 'john@email.com', date: new Date(Date.now() - 172800000).toLocaleDateString(), total: 2345.50, items: [{ name: 'SonicWave Toothbrush', quantity: 1, price: 1299 }, { name: 'MintShield Toothpaste', quantity: 3, price: 159 }], status: 'Delivered', address: '789 Health St, Mandaluyong' }
  ];
}

function saveOrdersToFirestore(orders) {
  orders.forEach(function(o) {
    db.collection('orders').doc(o.number).set(o).catch(function() {});
  });
}

function saveOrder(order, callback) {
  // Writes a single order document. Owners may create their own orders, but
  // the security rules forbid rewriting existing ones — so callers must pass
  // only the NEW order here.
  db.collection('orders').doc(order.number).set(order).then(function() {
    if (callback) callback();
  }).catch(function(error) {
    console.warn('Could not save order to Firestore:', error);
    if (callback) callback();
  });
}

function saveOrders(orders, callback) {
  var batch = db.batch();
  orders.forEach(function(o) {
    // Mobile orders live under auto-generated doc ids (o.docId); writing them
    // to doc(o.number) would create duplicates the app would never see.
    var ref = db.collection('orders').doc(o.docId || o.number);
    var copy = Object.assign({}, o);
    delete copy.docId;
    batch.set(ref, copy);
  });
  batch.commit().then(function() {
    if (callback) callback();
  }).catch(function(error) {
    console.warn('Could not save orders to Firestore:', error);
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
    promoBtn: 'View Deals',
    storeTagline: 'SmileHub Dental Supplies',
    faqs: [
      { q: 'What payment methods do you accept?', a: 'We accept GCash, bank transfer, and cash on delivery within Metro Manila.' },
      { q: 'How long does shipping take?', a: 'Metro Manila orders arrive within 1-3 business days. Provincial orders may take 3-7 business days.' },
      { q: 'Can I return a product?', a: 'Yes, unopened items can be returned within 7 days of delivery. Contact support to initiate a return.' }
    ]
  };
}

function saveCms(data, callback) {
  db.collection('cms').doc('site').set(data).then(function() {
    if (callback) callback();
  }).catch(function(error) {
    console.warn('Could not save CMS content to Firestore:', error);
    if (callback) callback();
  });
}

var SmileHubData = {
  getProducts: getProducts,
  getProductsSync: getProductsSync,
  getProductsMeta: getProductsMeta,
  saveProducts: saveProducts,
  addProduct: addProduct,
  updateProductById: updateProductById,
  deleteProductById: deleteProductById,
  getOrders: getOrders,
  saveOrders: saveOrders,
  saveOrder: saveOrder,
  getCms: getCms,
  saveCms: saveCms,
  categoryImages: categoryImages,
  defaultProducts: defaultProducts
};

window.SmileHubData = SmileHubData;