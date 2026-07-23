document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('wishlistGrid');
  const wishlist = getStoredList(WISH_KEY);
  if (!wishlist.length) {
    grid.innerHTML = '<div class="card empty-state"><h3>No saved products yet</h3><p>Use the heart buttons in the catalog.</p><a class="btn btn-primary" href="products.html">Browse Products</a></div>';
    return;
  }
  grid.innerHTML = wishlist.map(item => `
    <article class="card product-card">
      <div class="product-image"><img src="${item.image}" alt="${item.name}"></div>
      <div class="product-body"><h3>${item.name}</h3><div class="price-row"><span class="price">${money(item.price)}</span></div>
      <button class="btn btn-primary btn-block add-cart" data-id="${item.id}" data-name="${item.name}" data-price="${item.price}" data-image="${item.image}">Add to Cart</button></div>
    </article>`).join('');
  document.querySelectorAll('.add-cart').forEach(button => button.addEventListener('click', () => addToCart(button)));
});
