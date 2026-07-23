document.addEventListener('DOMContentLoaded', function() {
  const grid = document.getElementById('wishlistGrid');
  const wishlist = getStoredList(WISH_KEY);
  
  // Update wishlist count on page load (hides if empty)
  updateWishlistCount();
  
  if (!wishlist.length) {
    grid.innerHTML = '<div class="card empty-state"><h3>No saved products yet</h3><p>Use the heart buttons in the catalog.</p><a class="btn btn-primary" href="products.html">Browse Products</a></div>';
    return;
  }
  
  grid.innerHTML = wishlist.map(function(item, index) {
    return `
      <article class="card product-card">
        <button class="wish-button remove-wishlist" data-index="${index}" data-id="${item.id}" title="Remove from wishlist">♥</button>
        <div class="product-image"><img src="${item.image}" alt="${item.name}"></div>
        <div class="product-body">
          <h3>${item.name}</h3>
          <div class="price-row"><span class="price">${money(item.price)}</span></div>
          <button class="btn btn-primary btn-block add-cart" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-image="${item.image}">Add to Cart</button>
        </div>
      </article>
    `;
  }).join('');
  
  // Add to cart buttons
  document.querySelectorAll('.add-cart').forEach(function(button) {
    button.addEventListener('click', function() {
      addToCart(button);
    });
  });
  
  // Remove from wishlist buttons (unwish)
  document.querySelectorAll('.remove-wishlist').forEach(function(button) {
    button.addEventListener('click', function() {
      const id = Number(button.dataset.id);
      let wishlist = getStoredList(WISH_KEY);
      const productName = wishlist.find(function(item) {
        return item.id === id;
      })?.name || 'Product';
      
      wishlist = wishlist.filter(function(item) {
        return item.id !== id;
      });
      
      saveStoredList(WISH_KEY, wishlist);
      updateWishlistCount();
      
      // Also update heart icons on product pages/catalog
      document.querySelectorAll('.add-wishlist').forEach(function(wishBtn) {
        if (Number(wishBtn.dataset.id) === id) {
          wishBtn.textContent = '♡';
          wishBtn.classList.remove('wished');
        }
      });
      
      showToast(productName + ' removed from wishlist');
      
      // Re-render wishlist page
      location.reload();
    });
  });
});