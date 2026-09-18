document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  if (!currentUser) {
    alert('يرجى تسجيل الدخول أولاً!');
    window.location.href = 'index.html';
    return;
  }

  const clientNameEl = document.getElementById('clien-name');
  const clientIdNumEl = document.getElementById('clien-id-num');
  const addBtn = document.getElementById('name-add-cart');

  if (clientNameEl) clientNameEl.textContent = currentUser.name;
  if (clientIdNumEl) clientIdNumEl.textContent = currentUser.id;

  if (currentUser.role === 'client' && addBtn) {
    addBtn.style.display = 'none';
  } else if (currentUser.role === 'admin' && addBtn) {
    addBtn.style.display = 'block';
  }
});