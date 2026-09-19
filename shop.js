// ==========================================
// 0. دالة الخلط العشوائي (Fisher-Yates Shuffle)
// ==========================================
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ==========================================
// 1. متغيرات النطاق العام (Global Scope)
// ==========================================
let productsArray = [];
let activeProductId = null; // تخزين ID المنتج المفتوح حالياً

// ==========================================
// دالة عرض المنتجات المشابهة داخل النافذة المنبثقة
// ==========================================
function renderRelatedProducts(category, currentProductId) {
  const relatedContainer = document.getElementById('related-products-container');
  if (!relatedContainer) return;

  const relatedList = productsArray.filter(p => p.category === category && String(p.id) !== String(currentProductId));
  relatedContainer.innerHTML = '';

  if (relatedList.length === 0) {
    relatedContainer.innerHTML = '<p style="color: #888; font-size: 14px; text-align: center; width: 100%;">لا توجد منتجات أخرى من نفس التصنيف حالياً.</p>';
    return;
  }

  relatedList.forEach(item => {
    const itemImg = (item.image && item.image.trim().length > 5) ? item.image.trim() : 'img/market.jpg';
    
    const cardEl = document.createElement('div');
    cardEl.className = 'card related-card-item';
    cardEl.innerHTML = `
      <div class="card-cart"><button type="button"><a href="#">اضافه للعربه</a></button></div>
      <div class="card-img"><img src="${itemImg}" alt="${item.name}" /></div>
      <div class="name">
        <h3 class="name-name" style="font-size: 14px;">${item.name}</h3>
        <span class="name-filter" style="font-size: 11px; color: #8c98a4;">${item.category}</span>
        <span class="name-prise" style="font-size: 14px;">${item.price} ج.م</span>
      </div>
      <div class="card-properts">
        <button type="button" class="show-details-btn" data-id="${item.id}">إظهار تفاصيل</button>
      </div>
    `;

    relatedContainer.appendChild(cardEl);
  });
}

// ==========================================
// التحكم في بيانات تسجيل الدخول بالهيدر
// ==========================================
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

if (!currentUser) {
  alert('يرجى تسجيل الدخول أولاً!');
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. تحديث بيانات العميل في الهيدر
  const clientNameEl = document.getElementById('clien-name');
  const clientIdNumEl = document.getElementById('clien-id-num');
  const addBtn = document.getElementById('name-add-cart');

  if (clientNameEl && currentUser) clientNameEl.textContent = currentUser.name;
  if (clientIdNumEl && currentUser) clientIdNumEl.textContent = currentUser.id;

  if (currentUser && currentUser.role === 'client' && addBtn) {
    addBtn.style.display = 'none';
  } else if (currentUser && currentUser.role === 'admin' && addBtn) {
    addBtn.style.display = 'block';
  }

  // 2. التحكم بظهور زر تعديل التفاصيل للأدمن
  const adminEditWrapper = document.getElementById('admin-edit-wrapper');
  if (currentUser && currentUser.role === 'admin' && adminEditWrapper) {
    adminEditWrapper.style.display = 'block';
  } else if (adminEditWrapper) {
    adminEditWrapper.style.display = 'none';
  }

  // 3. تحديد وتخزين عناصر الصفحة والنافذة
  const modalForm = document.getElementById('add-1');
  const cancelBtn = document.querySelector('.btn-save-cancel');
  const deleteBtn = document.querySelector('.btn-save-delet');
  const saveBtn = document.querySelector('.btn-save-card');
  const mainContainer = document.querySelector('.cards-container');
  const totalCountEl = document.querySelector('.number-carts');

  const searchInput = document.getElementById('search-name');
  const categoryFilterSelect = document.getElementById('name-filter-cart');

  // عناصر التعديل على التفاصيل
  const editDescBtn = document.getElementById('pro-add-to-cart-btn2');
  const descText = document.getElementById('pro-description');
  const editContainer = document.getElementById('edit-description-container');
  const descInput = document.getElementById('pro-description-input');
  const saveDescBtn = document.getElementById('save-description-btn');
  const cancelDescBtn = document.getElementById('cancel-description-btn');

  // عناصر نموذج إضافة / تعديل صنف
  const idInput = document.querySelector('.form-e input[type="number"]');
  const nameInput = document.querySelectorAll('.form-e input')[1];
  const categoryInput = document.querySelectorAll('.form-e input')[2];
  const priceInput = document.querySelectorAll('.form-e input')[3];
  const fileInput = document.querySelector('.form-e input[type="file"]'); 
  const urlInput = document.querySelector('.form-e input[type="url"]'); 

  let tempUploadedImage = '';

  // 4. تعبئة البيانات تلقائياً بمجرد كتابة الـ ID
  if (idInput) {
    idInput.addEventListener('input', () => {
      const typedId = idInput.value.trim();
      if (!typedId) {
        clearFormExceptId();
        return;
      }

      const existingProd = productsArray.find(p => String(p.id) === String(typedId));
      if (existingProd) {
        fillFormFields(existingProd, false);
      } else {
        clearFormExceptId();
      }
    });
  }

  // 5. تعبئة البيانات تلقائياً بمجرد كتابة اسم الصنف
  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const typedName = nameInput.value.trim().toLowerCase();
      if (!typedName) {
        clearFormExceptName();
        return;
      }

      const existingProd = productsArray.find(p => (p.name || '').trim().toLowerCase() === typedName);
      if (existingProd) {
        fillFormFields(existingProd, true);
      } else {
        clearFormExceptName();
      }
    });
  }

  function fillFormFields(prod, includeId = true) {
    if (includeId && idInput) idInput.value = prod.id || '';
    if (!includeId && nameInput) nameInput.value = prod.name || '';
    if (categoryInput) categoryInput.value = prod.category || '';
    if (priceInput) priceInput.value = prod.price || '';
    if (urlInput) urlInput.value = (prod.image && !prod.image.startsWith('data:')) ? prod.image : '';
  }

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

  // جلب البيانات المباشرة من Firebase
  if (typeof db !== 'undefined') {
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
  }

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

    // لخبطة الترتيب عشوائياً قبل العرض
    const randomized = shuffleArray(filtered);

    displayProducts(randomized);
  }

  function displayProducts(products) {
    if (!mainContainer) return;
    document.querySelectorAll('.cards-container .card').forEach(card => card.remove());

    products.forEach(prod => {
      let imageUrl = 'img/market.jpg';
      if (prod.image && prod.image.trim().length > 5) {
        imageUrl = prod.image.trim();
      }

      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-cart"><button type="button"><a href="#">اضافه للعربه</a></button></div>
        <div class="card-img"><img src="${imageUrl}" alt="${prod.name}" /></div>
        <div class="name">
          <h3 class="name-name">${prod.name}</h3>
          <span class="name-filter">${prod.category}</span>
          <span class="name-prise">${prod.price}</span>
        </div>
        <div class="card-properts"><button type="button" class="show-details-btn" data-id="${prod.id}">إظهار تفاصيل</button></div>
      `;
      mainContainer.appendChild(card);
    });

    if (totalCountEl) totalCountEl.textContent = products.length;
  }

  if (searchInput) searchInput.addEventListener('input', filterAndRenderProducts);
  if (categoryFilterSelect) categoryFilterSelect.addEventListener('change', filterAndRenderProducts);

  // أحداث زر تعديل التفاصيل للأدمن
  if (editDescBtn) {
    editDescBtn.addEventListener('click', () => {
      if (descInput && descText) {
        const currentContent = descText.textContent.trim();
        descInput.value = (currentContent === 'لا توجد تفاصيل إضافية مضافة لهذا المنتج.') ? '' : currentContent;
        descText.style.display = 'none';
        editContainer.style.display = 'block';
      }
    });
  }

  if (cancelDescBtn) {
    cancelDescBtn.addEventListener('click', () => {
      if (editContainer) editContainer.style.display = 'none';
      if (descText) descText.style.display = 'block';
    });
  }

  if (saveDescBtn) {
    saveDescBtn.addEventListener('click', () => {
      const newDescription = descInput.value.trim();

      if (!activeProductId) {
        alert('خطأ: لم يتم تحديد المنتج بشكل صحيح، يرجى إغلاق النافذة وفتحها مجدداً!');
        return;
      }

      if (typeof db !== 'undefined') {
        db.ref('products/' + activeProductId).update({
          description: newDescription
        }).then(() => {
          const updatedText = newDescription || 'لا توجد تفاصيل إضافية مضافة لهذا المنتج.';
          if (descText) descText.textContent = updatedText;

          const localProd = productsArray.find(p => String(p.id) === String(activeProductId));
          if (localProd) localProd.description = newDescription;

          if (editContainer) editContainer.style.display = 'none';
          if (descText) descText.style.display = 'block';
          alert('تم حفظ التفاصيل بنجاح!');
        }).catch(err => {
          alert('حدث خطأ أثناء الحفظ: ' + err.message);
        });
      }
    });
  }

  // حفظ / تعديل المنتج
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

      const duplicateName = productsArray.find(p => (p.name || '').trim().toLowerCase() === nameVal.toLowerCase() && String(p.id) !== String(idVal));
      if (duplicateName) {
        alert(`اسم الصنف "${nameVal}" مستخدم بالفعل لصنف آخر برقم ID (${duplicateName.id}). لا يمكنك تكرار اسم الصنف!`);
        return;
      }

      const existingProd = productsArray.find(p => String(p.id) === String(idVal));
      let finalImg = tempUploadedImage;

      if (!finalImg || finalImg === '') {
        finalImg = urlVal || (existingProd ? existingProd.image : '');
      }

      if (typeof db !== 'undefined') {
        db.ref('products/' + idVal).set({
          id: idVal,
          name: nameVal,
          category: catVal,
          price: priceVal,
          image: finalImg,
          description: existingProd ? (existingProd.description || '') : ''
        }).then(() => {
          alert('تم حفظ البيانات بنجاح!');
        });
      }

      if (modalForm) modalForm.classList.remove('active');
      clearForm();
    });
  }

  // حذف المنتج
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const idVal = idInput ? idInput.value.trim() : '';

      if (!idVal) {
        alert('يرجى إدخال الـ ID الخاص بالمنتج المراد حذفه');
        return;
      }

      if (confirm('هل أنت تأكد من رغبتك في حذف هذا المنتج؟')) {
        if (typeof db !== 'undefined') {
          db.ref('products/' + idVal).remove().then(() => {
            alert('تم حذف المنتج بنجاح!');
          });
        }
        if (modalForm) modalForm.classList.remove('active');
        clearForm();
      }
    });
  }

  function clearFormExceptId() {
    if (nameInput) nameInput.value = '';
    if (categoryInput) categoryInput.value = '';
    if (priceInput) priceInput.value = '';
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    tempUploadedImage = '';
  }

  function clearFormExceptName() {
    if (idInput) idInput.value = '';
    if (categoryInput) categoryInput.value = '';
    if (priceInput) priceInput.value = '';
    if (fileInput) fileInput.value = '';
    if (urlInput) urlInput.value = '';
    tempUploadedImage = '';
  }

  function clearForm() {
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    clearFormExceptId();
  }
});

// ==========================================
// الاستماع للنقر على "إظهار تفاصيل" النافذة
// ==========================================
document.addEventListener('click', function (e) {
  const btn = e.target.closest('.show-details-btn');
  
  if (btn) {
    e.preventDefault();
    activeProductId = btn.getAttribute('data-id');
    
    const foundProd = productsArray.find(p => String(p.id) === String(activeProductId));

    if (foundProd) {
      const proImg = document.getElementById('pro-img');
      const proTitle = document.getElementById('pro-title');
      const proCategory = document.getElementById('pro-category');
      const proPrice = document.getElementById('pro-price');
      const proDescription = document.getElementById('pro-description');
      const editContainer = document.getElementById('edit-description-container');
      const modal = document.getElementById('propertes-cart');

      if (proImg) proImg.src = (foundProd.image && foundProd.image.trim().length > 5) ? foundProd.image.trim() : 'img/market.jpg';
      if (proTitle) proTitle.textContent = foundProd.name || 'بدون اسم';
      if (proCategory) proCategory.textContent = foundProd.category || 'عام';
      if (proPrice) proPrice.textContent = foundProd.price || '0';
      if (proDescription) proDescription.textContent = foundProd.description || 'لا توجد تفاصيل إضافية مضافة لهذا المنتج.';

      if (editContainer) editContainer.style.display = 'none';
      if (proDescription) proDescription.style.display = 'block';

      renderRelatedProducts(foundProd.category, foundProd.id);

      if (modal) {
        modal.classList.add('active');
      }
    }
  }

  // إغلاق النافذة
  if (e.target.id === 'close-propertes' || e.target.classList.contains('close-propertes-btn') || e.target.id === 'propertes-cart') {
    const modal = document.getElementById('propertes-cart');
    if (modal) modal.classList.remove('active');
  }
});