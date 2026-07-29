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

var cachedProductList = [];

function getProducts(callback) {
  var cached = SmileHubStorage.get('smilehub_products_cache', null);
  if (cached && cached.length > 0) {
    cachedProductList = cached;
    if (callback) callback(cached);
  }
  SmileHubData.getProducts(function(data) {
    cachedProductList = data;
    SmileHubStorage.set('smilehub_products_cache', data);
    if (callback) callback(data);
  });
}

function getProduct(id, callback) {
  getProducts(function(products) {
    var found = products.find(function(p) { return p.id === id; }) || null;
    if (callback) callback(found);
  });
}

function getProductDetails(id, callback) {
  getProduct(id, function(product) {
    if (!product) {
      if (callback) callback(null);
      return;
    }
    if (callback) callback({
      name: product.name,
      brand: product.brand || 'SmileHub',
      category: product.category || 'General',
      price: product.price || 0,
      stock: product.stock || 0,
      sku: product.sku || 'SH-' + String(id).padStart(3, '0'),
      image: product.image || 'assets/products/default.svg',
      description: product.description || 'No description available.',
      specs: product.specs || ['No specifications available.']
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var id = Number(new URLSearchParams(location.search).get('id')) || 1;

  getProductDetails(id, function(product) {
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

    var cartButton = document.getElementById('detailAddCart');
    Object.assign(cartButton.dataset, { id: id, name: product.name, price: product.price, image: product.image });
    cartButton.addEventListener('click', function() {
      cartButton.dataset.quantity = document.getElementById('detailQuantity').value;
      addToCart(cartButton);
    });

    var wishButton = document.getElementById('detailWishlist');
    Object.assign(wishButton.dataset, { id: id, name: product.name, price: product.price, image: product.image });

    var wishlist = getStoredList(WISH_KEY);
    var isWished = wishlist.some(function(item) {
      return item.id === id;
    });

    if (isWished) {
      wishButton.innerHTML = '♥ <span style="font-weight:700;">Wishlist</span>';
      wishButton.classList.add('wished');
    } else {
      wishButton.innerHTML = '♡ <span style="font-weight:700;">Wishlist</span>';
      wishButton.classList.remove('wished');
    }

    wishButton.addEventListener('click', function() {
      toggleWishlist(wishButton);
      var wishlist = getStoredList(WISH_KEY);
      var isNowWished = wishlist.some(function(item) {
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
});