document.addEventListener('DOMContentLoaded', () => {
  
  // ==========================================
  // 0. التحقق من تسجيل الدخول وتحديث الهيدر
  // ==========================================
  const savedUser = localStorage.getItem('currentUser');
  if (!savedUser) {
    alert('يرجى تسجيل الدخول أولاً!');
    window.location.href = 'index.html';
    return;
  }

  const currentUser = JSON.parse(savedUser);

  // تحديث الهيدر بالبيانات
  const clientNameEl = document.getElementById('clien-name');
  const clientIdNumEl = document.getElementById('clien-id-num');
  const addBtn = document.getElementById('name-add-cart');

  if (clientNameEl) clientNameEl.textContent = currentUser.name;
  if (clientIdNumEl) clientIdNumEl.textContent = currentUser.id;

  // التحكم في زر الإضافة بناءً على الرتبة
  if (currentUser.role === 'client' && addBtn) {
    addBtn.style.display = 'none';
  } else if (currentUser.role === 'admin' && addBtn) {
    addBtn.style.display = 'block';
  }

  // ==========================================
  // 1. تحديد وتخزين عناصر الصفحة والنافذة
  // ==========================================
  const modalForm = document.getElementById('add-1');
  const cancelBtn = document.querySelector('.btn-save-cancel');
  const deleteBtn = document.querySelector('.btn-save-delet');
  const saveBtn = document.querySelector('.btn-save-card');
  
  const mainContainer = document.querySelector('.cards-container');
  const totalCountEl = document.querySelector('.number-carts');

  const searchInput = document.querySelector('.search input') || document.querySelector('input[type="text"]');
  const categoryFilterSelect = document.querySelector('main select') || document.querySelector('.filter-category');

  // ==========================================
  // 2. تحديد خانات الفورم
  // ==========================================
  const idInput = document.querySelector('.form-e input[type="number"]') || document.querySelectorAll('.form-e input')[0];
  const nameInput = document.querySelectorAll('.form-e input')[1];
  const categoryInput = document.querySelectorAll('.form-e input')[2];
  const priceInput = document.querySelectorAll('.form-e input')[3];
  
  const fileInput = document.querySelector('.form-e input[type="file"]'); 
  const urlInput = document.querySelector('.form-e input[type="url"]') || document.querySelectorAll('.form-e input')[5] || document.querySelectorAll('.form-e input')[4]; 

  let productsArray = [];
  let tempUploadedImage = '';

  // ==========================================
  // 3. الاستماع المباشر لرفع الملف
  // ==========================================
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          tempUploadedImage = event.target.result;
        };
        reader.readAsDataURL(file);
      } else {
        tempUploadedImage = '';
      }
    });
  }

  // ==========================================
  // 4. التحكم في فتح وإغلاق النموذج
  // ==========================================
  if (addBtn && modalForm) {
    addBtn.addEventListener('click', (e) => {
      e.preventDefault();
      clearForm();
      modalForm.classList.add('active');
    });
  }

  if (cancelBtn && modalForm) {
    cancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modalForm.classList.remove('active');
      clearForm();
    });
  }

  // ==========================================
  // 5. جلب البيانات والمزامنة مع Firebase
  // ==========================================
  db.ref('products').on('value', (snapshot) => {
    const data = snapshot.val();
    productsArray = [];

    if (data) {
      Object.keys(data).forEach(key => {
        productsArray.push(data[key]);
      });
    }

    updateCategoryDropdowns(productsArray);
    filterAndRenderProducts();
  });

  // ==========================================
  // 6. تحديث قائمة التصنيفات
  // ==========================================
  function updateCategoryDropdowns(products) {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

    if (categoryFilterSelect) {
      const currentSelected = categoryFilterSelect.value;
      let optionsHTML = `<option value="all">اختر التصنيف</option>`;
      categories.forEach(cat => {
        optionsHTML += `<option value="${cat}">${cat}</option>`;
      });
      categoryFilterSelect.innerHTML = optionsHTML;

      if (currentSelected && categories.includes(currentSelected)) {
        categoryFilterSelect.value = currentSelected;
      } else {
        categoryFilterSelect.value = 'all';
      }
    }

    let formDatalist = document.getElementById('categories-list');
    if (!formDatalist && categoryInput) {
      formDatalist = document.createElement('datalist');
      formDatalist.id = 'categories-list';
      document.body.appendChild(formDatalist);
      categoryInput.setAttribute('list', 'categories-list');
    }

    if (formDatalist) {
      formDatalist.innerHTML = categories.map(cat => `<option value="${cat}">`).join('');
    }
  }

  // ==========================================
  // 7. دالة الفلترة والبحث المباشر
  // ==========================================
  function filterAndRenderProducts() {
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const selectedCategory = categoryFilterSelect ? categoryFilterSelect.value : 'all';

    const filtered = productsArray.filter(prod => {
      const prodName = (prod.name || '').toString().toLowerCase();
      const prodId = (prod.id || '').toString().toLowerCase();
      
      const matchesSearch = prodName.includes(searchTerm) || prodId.includes(searchTerm);
      const matchesCategory = (selectedCategory === 'all' || selectedCategory === 'اختر التصنيف') ? true : prod.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });

    displayProducts(filtered);
  }

  // ==========================================
  // 8. عرض الكروت وصورها
  // ==========================================
  function displayProducts(products) {
    document.querySelectorAll('.card').forEach(card => card.remove());

    products.forEach(prod => {
      let imageUrl = 'img/market.jpg';
      if (prod.image && prod.image.trim().length > 5) {
        imageUrl = prod.image.trim();
      }

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-cart"><button><a href="#">اضافه للعربه</a></button></div>
        <div class="card-img"><img src="${imageUrl}" alt="${prod.name}" /></div>
        <div class="name">
          <h3 class="name-name">${prod.name}</h3>
          <span class="name-filter">${prod.category}</span>
          <span class="name-prise">${prod.price}</span>
        </div>
        <div class="card-properts"><button><a href="#">اظهار تفاصيل</a></button></div>
      `;
      mainContainer.appendChild(card);
    });

    if (totalCountEl) totalCountEl.textContent = products.length;
  }

  // ==========================================
  // 9. أحداث البحث والملء التلقائي
  // ==========================================
  if (searchInput) searchInput.addEventListener('input', filterAndRenderProducts);
  if (categoryFilterSelect) categoryFilterSelect.addEventListener('change', filterAndRenderProducts);

  if (idInput) {
    idInput.addEventListener('input', () => {
      const enteredId = idInput.value.trim();
      const foundProduct = productsArray.find(p => p.id === enteredId);

      if (foundProduct) {
        if (nameInput) nameInput.value = foundProduct.name || '';
        if (categoryInput) categoryInput.value = foundProduct.category || '';
        if (priceInput) priceInput.value = foundProduct.price || '';
        if (urlInput) urlInput.value = foundProduct.image && !foundProduct.image.startsWith('data:') ? foundProduct.image : '';
        tempUploadedImage = foundProduct.image || '';
      } else {
        if (nameInput) nameInput.value = '';
        if (categoryInput) categoryInput.value = '';
        if (priceInput) priceInput.value = '';
        if (urlInput) urlInput.value = '';
        tempUploadedImage = '';
      }
    });
  }

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const enteredName = nameInput.value.trim().toLowerCase();
      if (!enteredName) return;

      const foundProduct = productsArray.find(p => (p.name || '').toString().toLowerCase() === enteredName);

      if (foundProduct) {
        if (idInput) idInput.value = foundProduct.id || '';
        if (categoryInput) categoryInput.value = foundProduct.category || '';
        if (priceInput) priceInput.value = foundProduct.price || '';
        if (urlInput) urlInput.value = foundProduct.image && !foundProduct.image.startsWith('data:') ? foundProduct.image : '';
        tempUploadedImage = foundProduct.image || '';
      }
    });
  }

  // ==========================================
  // 10. حفظ وتحديث البيانات في الفايربيس
  // ==========================================
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();

      const idVal = idInput ? idInput.value.trim() : '';
      const nameVal = nameInput ? nameInput.value.trim() : '';
      const catVal = categoryInput ? categoryInput.value.trim() || 'أخرى' : 'أخرى';
      const priceVal = priceInput ? priceInput.value.trim() : '';
      const urlVal = urlInput ? urlInput.value.trim() : '';

      if (!idVal || !nameVal || !priceVal) {
        alert('يرجى ملء كافة البيانات الأساسية (ID، الاسم، السعر)');
        return;
      }

      let finalImg = tempUploadedImage;
      if (!finalImg || finalImg === '') {
        finalImg = urlVal;
      }

      db.ref('products/' + idVal).set({
        id: idVal,
        name: nameVal,
        category: catVal,
        price: priceVal,
        image: finalImg
      });

      modalForm.classList.remove('active');
      clearForm();
    });
  }

  // ==========================================
  // 11. حذف المنتج
  // ==========================================
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const idVal = idInput ? idInput.value.trim() : '';

      if (!idVal) {
        alert('يرجى إدخال الـ ID الخاص بالمنتج المراد حذفه');
        return;
      }

      db.ref('products/' + idVal).remove();
      modalForm.classList.remove('active');
      clearForm();
    });
  }

  // ==========================================
  // 12. تفريغ الخانات
  // ==========================================
  function clearForm() {
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    if (categoryInput) categoryInput.value = '';
    if (priceInput) priceInput.value = '';
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    tempUploadedImage = '';
  }
});