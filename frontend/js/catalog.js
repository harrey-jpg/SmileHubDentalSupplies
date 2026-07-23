// catalog.js - Updated with full filter support

document.addEventListener('DOMContentLoaded', function() {
  const search = document.getElementById('catalogSearch');
  const category = document.getElementById('categoryFilter');
  const sort = document.getElementById('sortProducts');
  const grid = document.getElementById('productGrid');
  const count = document.getElementById('productCount');
  
  // Checkbox filters
  const inStockCheckbox = document.querySelector('input[type="checkbox"]:nth-of-type(1)');
  const newProductsCheckbox = document.querySelector('input[type="checkbox"]:nth-of-type(2)');
  const featuredCheckbox = document.querySelector('input[type="checkbox"]:nth-of-type(3)');
  
  if (!grid) return;

  // Get URL parameters for category filter
  const params = new URLSearchParams(location.search);
  if (search && params.get('q')) search.value = params.get('q');
  if (category && params.get('category')) category.value = params.get('category');

  function filterProducts() {
    const cards = [...grid.querySelectorAll('.product-card')];
    const term = (search?.value || '').toLowerCase();
    const selectedCategory = category?.value || 'all';
    
    // Get checkbox states
    const showInStock = inStockCheckbox ? inStockCheckbox.checked : true;
    const showNew = newProductsCheckbox ? newProductsCheckbox.checked : false;
    const showFeatured = featuredCheckbox ? featuredCheckbox.checked : false;

    let visibleCount = 0;

    cards.forEach(function(card) {
      // Text search filter
      const matchesText = card.dataset.search.includes(term);
      
      // Category filter
      const matchesCategory = selectedCategory === 'all' || card.dataset.category === selectedCategory;
      
      // Stock filter - check if product has stock
      let matchesStock = true;
      if (showInStock) {
        const stockText = card.querySelector('.stock')?.textContent || '';
        const stockMatch = stockText.match(/\d+/);
        if (stockMatch) {
          const stockCount = parseInt(stockMatch[0]);
          matchesStock = stockCount > 0;
        }
      }
      
      // New products filter - check for "New" badge
      let matchesNew = true;
      if (showNew) {
        const hasNewBadge = card.querySelector('.badge')?.textContent === 'New';
        matchesNew = hasNewBadge;
      }
      
      // Featured products filter - check for "Featured" badge
      let matchesFeatured = true;
      if (showFeatured) {
        const hasFeaturedBadge = card.querySelector('.badge')?.textContent === 'Featured';
        matchesFeatured = hasFeaturedBadge;
      }
      
      // All conditions must match
      const isVisible = matchesText && matchesCategory && matchesStock && matchesNew && matchesFeatured;
      
      card.classList.toggle('hidden', !isVisible);
      if (isVisible) visibleCount++;
    });

    // Sorting
    if (sort?.value === 'price-low') {
      visibleCards.sort(function(a, b) {
        return Number(a.dataset.price) - Number(b.dataset.price);
      });
    } else if (sort?.value === 'price-high') {
      visibleCards.sort(function(a, b) {
        return Number(b.dataset.price) - Number(a.dataset.price);
      });
    } else if (sort?.value === 'name') {
      visibleCards.sort(function(a, b) {
        return a.dataset.name.localeCompare(b.dataset.name);
      });
    }
    
    // Reorder DOM
    visibleCards.forEach(function(card) {
      grid.appendChild(card);
    });
    
    // Update count
    if (count) {
      count.textContent = visibleCount + ' product' + (visibleCount !== 1 ? 's' : '') + ' found';
    }
  }

  // Event listeners
  search?.addEventListener('input', filterProducts);
  category?.addEventListener('change', filterProducts);
  sort?.addEventListener('change', filterProducts);
  
  // Checkbox event listeners
  if (inStockCheckbox) inStockCheckbox.addEventListener('change', filterProducts);
  if (newProductsCheckbox) newProductsCheckbox.addEventListener('change', filterProducts);
  if (featuredCheckbox) featuredCheckbox.addEventListener('change', filterProducts);

  // Run initial filter
  filterProducts();
});