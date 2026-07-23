document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('catalogSearch');
  const category = document.getElementById('categoryFilter');
  const sort = document.getElementById('sortProducts');
  const grid = document.getElementById('productGrid');
  const count = document.getElementById('productCount');
  if (!grid) return;

  const params = new URLSearchParams(location.search);
  if (search && params.get('q')) search.value = params.get('q');
  if (category && params.get('category')) category.value = params.get('category');

  function filterProducts() {
    const cards = [...grid.querySelectorAll('.product-card')];
    const term = (search?.value || '').toLowerCase();
    const selectedCategory = category?.value || 'all';

    cards.forEach(card => {
      const matchesText = card.dataset.search.includes(term);
      const matchesCategory = selectedCategory === 'all' || card.dataset.category === selectedCategory;
      card.classList.toggle('hidden', !matchesText || !matchesCategory);
    });

    const visible = cards.filter(card => !card.classList.contains('hidden'));
    if (sort?.value === 'price-low') visible.sort((a,b) => Number(a.dataset.price) - Number(b.dataset.price));
    if (sort?.value === 'price-high') visible.sort((a,b) => Number(b.dataset.price) - Number(a.dataset.price));
    if (sort?.value === 'name') visible.sort((a,b) => a.dataset.name.localeCompare(b.dataset.name));
    visible.forEach(card => grid.appendChild(card));
    if (count) count.textContent = visible.length + ' products found';
  }

  search?.addEventListener('input', filterProducts);
  category?.addEventListener('change', filterProducts);
  sort?.addEventListener('change', filterProducts);
  filterProducts();
});
