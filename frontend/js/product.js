// product.js - Reads from localStorage (same as admin)

// Category to image mapping (used as fallback)
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

// Default products (fallback if no data exists)
const defaultProducts = {
  1: {"name":"ProClean Soft Toothbrush 4-Pack","brand":"SmilePro","category":"Oral Care","price":189,"stock":86,"sku":"SH-OC-001","image":"assets/products/oral-care.svg","description":"Soft rounded bristles for gentle daily plaque removal and comfortable gum care.","specs":["4 toothbrushes","Soft nylon bristles","Ergonomic non-slip handle"]},
  2: {"name":"SonicWave Electric Toothbrush","brand":"Dentiva","category":"Oral Care","price":1299,"stock":24,"sku":"SH-OC-002","image":"assets/products/oral-care.svg","description":"Rechargeable sonic toothbrush with three cleaning modes and two-minute timer.","specs":["3 cleaning modes","USB-C rechargeable","2 brush heads included"]},
  3: {"name":"MintShield Fluoride Toothpaste 150g","brand":"Oracare","category":"Oral Care","price":159,"stock":120,"sku":"SH-OC-003","image":"assets/products/oral-care.svg","description":"Daily fluoride toothpaste formulated to strengthen enamel and freshen breath.","specs":["150g tube","1450 ppm fluoride","Fresh mint flavor"]},
  4: {"name":"FreshGuard Antibacterial Mouthwash 500mL","brand":"Oracare","category":"Oral Care","price":249,"stock":67,"sku":"SH-OC-004","image":"assets/products/oral-care.svg","description":"Alcohol-free antibacterial rinse for everyday oral hygiene and long-lasting freshness.","specs":["500mL bottle","Alcohol-free","Cool mint"]},
  5: {"name":"GlideEase Dental Floss 50m","brand":"SmilePro","category":"Oral Care","price":99,"stock":144,"sku":"SH-OC-005","image":"assets/products/oral-care.svg","description":"Waxed shred-resistant floss that slides comfortably between tight contacts.","specs":["50 meters","Waxed PTFE fiber","Mint flavored"]},
  6: {"name":"Stainless Dental Mirror No. 5","brand":"Clinix","category":"Instruments","price":185,"stock":58,"sku":"SH-IN-006","image":"assets/products/instrument.svg","description":"Front-surface stainless dental mirror for clear intraoral visibility during examination.","specs":["No. 5 mirror head","Autoclavable","Textured handle"]},
  7: {"name":"Double-Ended Explorer 17/23","brand":"Clinix","category":"Instruments","price":295,"stock":37,"sku":"SH-IN-007","image":"assets/products/instrument.svg","description":"Precision explorer with sharp working ends for caries detection and calculus assessment.","specs":["17/23 pattern","Surgical stainless steel","Autoclavable"]},
  8: {"name":"Universal Scaler U15/30","brand":"Clinix","category":"Instruments","price":449,"stock":29,"sku":"SH-IN-008","image":"assets/products/instrument.svg","description":"Balanced universal scaler designed for efficient supragingival calculus removal.","specs":["U15/30 tips","Hollow grip handle","Corrosion resistant"]},
  9: {"name":"Premium Extraction Forceps No. 150","brand":"SurgiDent","category":"Instruments","price":1899,"stock":11,"sku":"SH-IN-009","image":"assets/products/instrument.svg","description":"Universal upper extraction forceps with serrated beaks and secure ergonomic grip.","specs":["No. 150 pattern","German stainless steel","Reinforced hinge"]},
  10: {"name":"Nitrile Examination Gloves 100s","brand":"SafeTouch","category":"PPE","price":399,"stock":78,"sku":"SH-PP-010","image":"assets/products/ppe.svg","description":"Powder-free nitrile examination gloves offering dependable barrier protection and dexterity.","specs":["100 pieces/box","Powder-free","Non-sterile","Medium"]},
  11: {"name":"Level 3 Surgical Face Masks 50s","brand":"SafeTouch","category":"PPE","price":279,"stock":94,"sku":"SH-PP-011","image":"assets/products/ppe.svg","description":"Three-ply high-filtration masks with comfortable ear loops and adjustable nose strip.","specs":["50 pieces/box","Level 3 protection","Fluid resistant"]},
  12: {"name":"Full-Coverage Face Shield 10s","brand":"MediGuard","category":"PPE","price":349,"stock":43,"sku":"SH-PP-012","image":"assets/products/ppe.svg","description":"Anti-fog clear shields with soft forehead foam for full facial splash protection.","specs":["10 pieces/pack","Anti-fog PET visor","Elastic headband"]},
  13: {"name":"NanoFill Composite Resin A2","brand":"Restora","category":"Restorative","price":899,"stock":32,"sku":"SH-RS-013","image":"assets/products/restorative.svg","description":"Light-cured nanohybrid composite with smooth handling and excellent polish retention.","specs":["4g syringe","Shade A2","Universal anterior/posterior use"]},
  14: {"name":"Universal Bonding Agent 5mL","brand":"Restora","category":"Restorative","price":1249,"stock":21,"sku":"SH-RS-014","image":"assets/products/restorative.svg","description":"Single-bottle universal adhesive compatible with self-etch and total-etch techniques.","specs":["5mL bottle","Light cured","Universal bonding protocol"]},
  15: {"name":"Phosphoric Acid Etchant Gel 3-Pack","brand":"Restora","category":"Restorative","price":329,"stock":49,"sku":"SH-RS-015","image":"assets/products/restorative.svg","description":"Controlled-flow 37% phosphoric acid gel for enamel and dentin etching procedures.","specs":["3 x 3mL syringes","37% phosphoric acid","Blue contrast color"]},
  16: {"name":"Glass Ionomer Luting Cement Kit","brand":"CemDent","category":"Restorative","price":1399,"stock":18,"sku":"SH-RS-016","image":"assets/products/restorative.svg","description":"Radiopaque glass ionomer cement for durable luting of crowns, bridges, and bands.","specs":["Powder 15g","Liquid 10mL","High fluoride release"]},
  17: {"name":"Disposable Dental Bibs 125s","brand":"ClinicEssentials","category":"Disposables","price":449,"stock":70,"sku":"SH-DI-017","image":"assets/products/disposable.svg","description":"Two-ply absorbent paper with poly backing for reliable patient protection.","specs":["125 sheets","33 x 45 cm","2-ply paper + poly"]},
  18: {"name":"Self-Sealing Sterilization Pouches 200s","brand":"SteriliSafe","category":"Disposables","price":699,"stock":34,"sku":"SH-DI-018","image":"assets/products/disposable.svg","description":"Medical-grade self-seal pouches with process indicators for steam sterilization.","specs":["200 pieces","90 x 260 mm","Dual process indicators"]},
  19: {"name":"Disposable Dental Syringes 100s","brand":"ClinicEssentials","category":"Disposables","price":549,"stock":55,"sku":"SH-DI-019","image":"assets/products/disposable.svg","description":"Luer-lock disposable syringes for irrigation and dental material dispensing.","specs":["100 pieces","5mL capacity","Sterile, individually packed"]},
  20: {"name":"Absorbent Cotton Rolls 1000s","brand":"ClinicEssentials","category":"Disposables","price":799,"stock":46,"sku":"SH-DI-020","image":"assets/products/disposable.svg","description":"Soft, highly absorbent cotton rolls that retain shape during dental procedures.","specs":["1000 pieces","Size No. 2","Non-sterile"]},
  21: {"name":"Fine Microbrush Applicators 100s","brand":"MicroTip","category":"Disposables","price":199,"stock":105,"sku":"SH-DI-021","image":"assets/products/disposable.svg","description":"Bendable non-linting micro applicators for bonding agents, etchants, and solutions.","specs":["100 pieces","Fine tip","Bendable neck"]},
  22: {"name":"Flexible Saliva Ejectors 100s","brand":"ClinicEssentials","category":"Disposables","price":219,"stock":88,"sku":"SH-DI-022","image":"assets/products/disposable.svg","description":"Smooth-tip flexible ejectors with shape-retaining wire for patient comfort.","specs":["100 pieces","Non-removable tip","Latex-free"]},
  23: {"name":"Premium Alginate Impression Material","brand":"Impressa","category":"Impression","price":499,"stock":40,"sku":"SH-IM-023","image":"assets/products/impression.svg","description":"Fast-setting chromatic alginate with smooth consistency and high tear resistance.","specs":["500g pouch","Fast set","Mint aroma"]},
  24: {"name":"VPS Putty Impression Material Kit","brand":"Impressa","category":"Impression","price":2499,"stock":14,"sku":"SH-IM-024","image":"assets/products/impression.svg","description":"High-viscosity vinyl polysiloxane putty with excellent dimensional stability.","specs":["Base 300mL","Catalyst 300mL","Regular set"]},
  25: {"name":"Orthodontic Relief Wax 10-Pack","brand":"OrthoEase","category":"Orthodontics","price":299,"stock":73,"sku":"SH-OR-025","image":"assets/products/orthodontic.svg","description":"Clear medical-grade wax that protects oral tissue from brackets and wires.","specs":["10 cases","Unscented","Pre-portioned strips"]},
  26: {"name":"Elastic Chain Assortment 15ft","brand":"OrthoEase","category":"Orthodontics","price":749,"stock":27,"sku":"SH-OR-026","image":"assets/products/orthodontic.svg","description":"Continuous orthodontic power chain assortment with consistent force delivery.","specs":["15 feet total","3 spool assortment","Latex-free"]},
  27: {"name":"Diamond Dental Bur Set 30pcs","brand":"BurMaster","category":"Rotary","price":1199,"stock":19,"sku":"SH-RO-027","image":"assets/products/instrument.svg","description":"Assorted high-speed diamond burs for crown preparation, contouring, and finishing.","specs":["30-piece set","FG shank","Autoclavable bur block"]},
  28: {"name":"LED Curing Light 1200mW","brand":"LumaDent","category":"Equipment","price":3299,"stock":12,"sku":"SH-EQ-028","image":"assets/products/equipment.svg","description":"Cordless LED curing light with focused output, timer modes, and ergonomic design.","specs":["1000-1200 mW/cm²","5/10/15/20 sec timer","USB charging dock"]},
  29: {"name":"Ultrasonic Scaler with 5 Tips","brand":"ProSonic","category":"Equipment","price":6999,"stock":7,"sku":"SH-EQ-029","image":"assets/products/equipment.svg","description":"Compact piezoelectric scaler with adjustable power and detachable autoclavable handpiece.","specs":["5 scaler tips","Water flow control","220V"]},
  30: {"name":"Class B Autoclave 18L Demo Unit","brand":"SteriliTech","category":"Equipment","price":89999,"stock":2,"sku":"SH-EQ-030","image":"assets/products/equipment.svg","description":"Demo listing for an 18-liter Class B sterilizer with digital cycles and safety monitoring.","specs":["18L chamber","Class B cycles","Demo / quotation item"]},
  31: {"name":"Ergonomic Dental Chair Demo Package","brand":"ChairPro","category":"Equipment","price":189999,"stock":1,"sku":"SH-EQ-031","image":"assets/products/equipment.svg","description":"Demo dental unit package with programmable chair, delivery system, light, and assistant arm.","specs":["Programmable chair","LED operating light","Demo / quotation item"]},
  32: {"name":"Professional Teeth Whitening Kit","brand":"BrightDent","category":"Cosmetic","price":2899,"stock":16,"sku":"SH-CO-032","image":"assets/products/restorative.svg","description":"Clinic-use whitening kit with controlled gel delivery and gingival barrier materials.","specs":["3 patient treatments","35% carbamide peroxide","Clinic-use demo"]}
};

// --- GET PRODUCTS FROM LOCALSTORAGE (SAME AS ADMIN) ---
function getProducts() {
  let products = [];
  
  // Try to get from localStorage (admin data)
  try {
    const saved = localStorage.getItem('smilehub_products');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        products = parsed;
      }
    }
  } catch (e) {}
  
  // If no admin data, use default products
  if (products.length === 0) {
    products = Object.entries(defaultProducts).map(function([id, product]) {
      return {
        id: parseInt(id),
        sku: product.sku || 'SH-' + String(id).padStart(3, '0'),
        name: product.name,
        category: product.category,
        price: product.price,
        stock: product.stock,
        status: product.stock > 10 ? 'Active' : product.stock > 0 ? 'Low Stock' : 'Out of Stock',
        image: product.image || categoryImages[product.category] || 'assets/products/default.svg',
        brand: product.brand || '',
        description: product.description || '',
        specs: product.specs || []
      };
    });
  }
  
  return products;
}

// --- GET SINGLE PRODUCT ---
function getProduct(id) {
  const products = getProducts();
  return products.find(function(p) { return p.id === id; }) || null;
}

// --- CONVERT TO PRODUCT DETAILS FORMAT ---
function getProductDetails(id) {
  const product = getProduct(id);
  if (!product) {
    const defaultProduct = defaultProducts[id];
    if (defaultProduct) {
      return {
        name: defaultProduct.name,
        brand: defaultProduct.brand || 'SmileHub',
        category: defaultProduct.category || 'General',
        price: defaultProduct.price || 0,
        stock: defaultProduct.stock || 0,
        sku: defaultProduct.sku || 'SH-' + String(id).padStart(3, '0'),
        image: defaultProduct.image || 'assets/products/default.svg',
        description: defaultProduct.description || 'No description available.',
        specs: defaultProduct.specs || ['No specifications available.']
      };
    }
    return null;
  }
  
  return {
    name: product.name,
    brand: product.brand || 'SmileHub',
    category: product.category || 'General',
    price: product.price || 0,
    stock: product.stock || 0,
    sku: product.sku || 'SH-' + String(id).padStart(3, '0'),
    image: product.image || 'assets/products/default.svg',
    description: product.description || 'No description available.',
    specs: product.specs || ['No specifications available.']
  };
}

// --- GET ALL PRODUCT DETAILS ---
function getAllProductDetails() {
  const products = getProducts();
  const details = {};
  
  products.forEach(function(p) {
    details[p.id] = {
      name: p.name,
      brand: p.brand || 'SmileHub',
      category: p.category || 'General',
      price: p.price || 0,
      stock: p.stock || 0,
      sku: p.sku || 'SH-' + String(p.id).padStart(3, '0'),
      image: p.image || 'assets/products/default.svg',
      description: p.description || 'No description available.',
      specs: p.specs || ['No specifications available.']
    };
  });
  
  // If no products found, use defaults
  if (Object.keys(details).length === 0) {
    return defaultProducts;
  }
  
  return details;
}

// --- EXPOSE FOR USE ---
window.productDetails = getAllProductDetails();
window.getProduct = getProduct;
window.getProductDetails = getProductDetails;
window.getProducts = getProducts;

// --- PRODUCT PAGE INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
  const id = Number(new URLSearchParams(location.search).get('id')) || 1;
  const product = getProductDetails(id);
  
  if (!product) {
    document.getElementById('detailName').textContent = 'Product Not Found';
    document.getElementById('detailDescription').textContent = 'This product does not exist.';
    return;
  }

  document.getElementById('detailName').textContent = product.name;
  document.getElementById('detailBrand').textContent = product.brand || 'SmileHub';
  document.getElementById('detailCategory').textContent = product.category || 'General';
  document.getElementById('detailPrice').textContent = money(product.price);
  document.getElementById('detailStock').textContent = (product.stock || 0) + ' pieces available';
  document.getElementById('detailSku').textContent = product.sku || 'N/A';
  document.getElementById('detailDescription').textContent = product.description || 'No description available.';
  document.getElementById('detailImage').src = product.image || 'assets/products/default.svg';
  
  if (product.specs && product.specs.length > 0) {
    document.getElementById('detailSpecs').innerHTML = product.specs.map(function(spec) {
      return '<li>' + spec + '</li>';
    }).join('');
  } else {
    document.getElementById('detailSpecs').innerHTML = '<li>No specifications available.</li>';
  }

  // Setup cart button
  const cartButton = document.getElementById('detailAddCart');
  Object.assign(cartButton.dataset, { id: id, name: product.name, price: product.price, image: product.image });
  cartButton.addEventListener('click', function() {
    cartButton.dataset.quantity = document.getElementById('detailQuantity').value;
    addToCart(cartButton);
  });

  // Setup wishlist button with state
  const wishButton = document.getElementById('detailWishlist');
  Object.assign(wishButton.dataset, { id: id, name: product.name, price: product.price, image: product.image });
  
  // Check if product is already in wishlist
  const wishlist = getStoredList(WISH_KEY);
  const isWished = wishlist.some(function(item) {
    return item.id === id;
  });
  
  // Set initial heart state with text
  if (isWished) {
    wishButton.innerHTML = '♥ <span style="font-weight:700;">Wishlist</span>';
    wishButton.classList.add('wished');
  } else {
    wishButton.innerHTML = '♡ <span style="font-weight:700;">Wishlist</span>';
    wishButton.classList.remove('wished');
  }
  
  wishButton.addEventListener('click', function() {
    toggleWishlist(wishButton);
    // Update button text after toggle
    const wishlist = getStoredList(WISH_KEY);
    const isNowWished = wishlist.some(function(item) {
      return item.id === id;
    });
    if (isNowWished) {
      wishButton.innerHTML = '♥ <span style="font-weight:700;">Wishlist</span>';
      wishButton.classList.add('wished');
    } else {
      wishButton.innerHTML = '♡ <span style="font-weight:700;">Wishlist</span>';
      wishButton.classList.remove('wished');
    }
  });

  // Tab buttons
  document.querySelectorAll('.tab-button').forEach(function(button) {
    button.addEventListener('click', function() {
      document.querySelectorAll('.tab-button').forEach(function(item) {
        item.classList.remove('active');
      });
      document.querySelectorAll('.tab-panel').forEach(function(panel) {
        panel.classList.add('hidden');
      });
      button.classList.add('active');
      document.getElementById(button.dataset.tab).classList.remove('hidden');
    });
  });
});