document.addEventListener('DOMContentLoaded', () => {
  const formBox = document.getElementById('productFormBox');
  document.getElementById('showProductForm').addEventListener('click', () => formBox.classList.toggle('show'));
  document.getElementById('productFormBox').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.target);
    const row = document.createElement('tr');
    row.innerHTML = `<td>NEW-${Date.now().toString().slice(-4)}</td><td>${form.get('name')}</td><td>${form.get('category')}</td><td>${money(form.get('price'))}</td><td>${form.get('stock')}</td><td><span class="status delivered">Active</span></td><td><button class="btn btn-light">Edit</button></td>`;
    document.getElementById('adminProductsBody').prepend(row);
    event.target.reset();
    formBox.classList.remove('show');
    showToast('Product added to the frontend table');
  });

  document.getElementById('adminSearch').addEventListener('input', event => {
    const term = event.target.value.toLowerCase();
    document.querySelectorAll('#adminProductsBody tr').forEach(row => row.classList.toggle('hidden', !row.textContent.toLowerCase().includes(term)));
  });
});
