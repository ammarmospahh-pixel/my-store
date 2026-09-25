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
// دالة تحويل روابط Google Drive إلى رابط صورة مباشر
// ==========================================
function formatImageUrl(url) {
  if (!url) return '';
  const trimmedUrl = url.trim();
  
  // التعامل مع صيغ روابط Google Drive المختلفة
  const driveRegex = /https:\/\/drive\.google\.com\/(?:file\/d\/|open\?id=)([^\/\?]+)/;
  const match = trimmedUrl.match(driveRegex);
  
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  
  return trimmedUrl;
}

// ==========================================
// 1. متغيرات النطاق العام (Global Scope)
// ==========================================
let productsArray = [];
let activeProductId = null; 

// 🔗 رابط Google Apps Script المحدث والمعتمد
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzstImEtArx34MLITcnLwxSc3FCRgKVYjzrMH98UBZ73EfxPU9LjLiiyzECWSIXxx3Xsw/exec";

// ==========================================
// دالة جلب المنتجات (تعتمد على الكاش للظهور الفوري)
// ==========================================
function loadProductsFromSheets() {
  // 1. العرض الفوري من الـ localStorage إذا وُجدت بيانات مخزنة
  const cachedData = localStorage.getItem('cached_products');
  if (cachedData) {
    try {
      productsArray = JSON.parse(cachedData);
      updateCategoryDropdowns(productsArray);
      updateIdsDropdown(productsArray);   
      updateNamesDropdown(productsArray); 
      filterAndRenderProducts();
    } catch (e) {
      console.error("Error parsing cached products:", e);
    }
  }

  // 2. تحديث البيانات صامتاً في الخلفية من Google Sheets
  fetch(GOOGLE_SCRIPT_URL)
    .then(res => res.json())
    .then(data => {
      if (Array.isArray(data) && data.length > 0) {
        productsArray = data;
        // حفظ النسخة الجديدة في التخزين المحلي
        localStorage.setItem('cached_products', JSON.stringify(data));
        
        // تحديث الواجهة والقوائم
        updateCategoryDropdowns(productsArray);
        updateIdsDropdown(productsArray);   
        updateNamesDropdown(productsArray); 
        filterAndRenderProducts();
      }
    })
    .catch(err => console.error("Error loading products from Sheets:", err));
}

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
      <div class="card-cart">
        <button type="button" class="btn-add-to-cart amazon-plus-btn" data-id="${item.id}">+</button>
      </div>
      <div class="card-img show-details-btn" data-id="${item.id}" style="cursor: pointer;">
        <img src="${itemImg}" alt="${item.name}" />
      </div>
      <div class="name">
        <h3 class="name-name" style="font-size: 13px;">${item.name}</h3>
        <span class="name-filter" style="font-size: 11px; color: #8c98a4;">${item.category}</span>
        <span class="name-prise" style="font-size: 13px;">${item.price} ج.م</span>
      </div>
      <div class="card-properts">
        <button type="button" class="show-details-btn" data-id="${item.id}">تفاصيل</button>
      </div>
    `;

    relatedContainer.appendChild(cardEl);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const clientNameEl = document.getElementById('clien-name');
  const clientIdNumEl = document.getElementById('clien-id-num');
  const addBtn = document.getElementById('name-add-cart');

  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  if (clientNameEl) clientNameEl.textContent = currentUser ? currentUser.name : 'زائر';
  if (clientIdNumEl) clientIdNumEl.textContent = currentUser ? currentUser.id : '---';

  if (addBtn) {
    if (currentUser && currentUser.role === 'admin') {
      addBtn.style.setProperty('display', 'block', 'important');
    } else {
      addBtn.style.setProperty('display', 'none', 'important');
    }
  }

  const adminEditWrapper = document.getElementById('admin-edit-wrapper');
  if (adminEditWrapper) {
    if (currentUser && currentUser.role === 'admin') {
      adminEditWrapper.style.setProperty('display', 'block', 'important');
    } else {
      adminEditWrapper.style.setProperty('display', 'none', 'important');
    }
  }

  const modalForm = document.getElementById('add-1');
  const cancelBtn = document.querySelector('.btn-save-cancel');
  const deleteBtn = document.querySelector('.btn-save-delet');
  const saveBtn = document.querySelector('.btn-save-card');

  const searchInput = document.getElementById('search-name');
  const categoryFilterSelect = document.getElementById('name-filter-cart');

  const idInput = document.querySelector('.form-e input[type="number"]');
  const nameInput = document.querySelectorAll('.form-e input')[1];
  const categoryInput = document.querySelectorAll('.form-e input')[2];
  const priceInput = document.querySelectorAll('.form-e input')[3];
  const urlInput = document.querySelector('.form-e input[type="url"]'); 

  let idsDatalist = document.getElementById('ids-list');
  if (!idsDatalist && idInput) {
    idsDatalist = document.createElement('datalist');
    idsDatalist.id = 'ids-list';
    document.body.appendChild(idsDatalist);
    idInput.setAttribute('list', 'ids-list');
  }

  let namesDatalist = document.getElementById('names-list');
  if (!namesDatalist && nameInput) {
    namesDatalist = document.createElement('datalist');
    namesDatalist.id = 'names-list';
    document.body.appendChild(namesDatalist);
    nameInput.setAttribute('list', 'names-list');
  }

  if (idInput) {
    idInput.addEventListener('input', () => {
      const typedId = idInput.value.trim();
      if (!typedId) { clearFormExceptId(); return; }
      
      const existingProd = productsArray.find(p => String(p.id) === String(typedId));
      if (existingProd) {
        fillFormFields(existingProd, false);
      } else {
        clearFormExceptId(); 
      }
    });
  }

  if (nameInput) {
    nameInput.addEventListener('input', () => {
      const typedName = nameInput.value.trim().toLowerCase();
      if (!typedName) { clearFormExceptName(); return; }
      
      const existingProd = productsArray.find(p => (p.name || '').trim().toLowerCase() === typedName);
      if (existingProd) {
        fillFormFieldsByName(existingProd);
      }
    });
  }

  function fillFormFields(prod, includeId = true) {
    if (includeId && idInput) idInput.value = prod.id || '';
    if (!includeId && nameInput) nameInput.value = prod.name || '';
    if (categoryInput) categoryInput.value = prod.category || '';
    if (priceInput) priceInput.value = prod.price || '';
    if (urlInput) urlInput.value = prod.image || '';
  }

  function fillFormFieldsByName(prod) {
    if (idInput) idInput.value = prod.id || '';
    if (categoryInput) categoryInput.value = prod.category || '';
    if (priceInput) priceInput.value = prod.price || '';
    if (urlInput) urlInput.value = prod.image || '';
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

  // تحميل المنتجات فورياً من الكاش
  loadProductsFromSheets();

  if (searchInput) searchInput.addEventListener('input', filterAndRenderProducts);
  if (categoryFilterSelect) categoryFilterSelect.addEventListener('change', filterAndRenderProducts);

  // ==========================================
  // زر الحفظ (إضافة / تعديل)
  // ==========================================
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const idVal = idInput ? idInput.value.trim() : '';
      const nameVal = nameInput ? nameInput.value.trim() : '';
      const catVal = categoryInput ? categoryInput.value.trim() || 'أخرى' : 'أخرى';
      const priceVal = priceInput ? priceInput.value.trim() : '';
      
      const rawUrlVal = urlInput ? urlInput.value.trim() : '';
      const urlVal = formatImageUrl(rawUrlVal);

      if (!idVal || !nameVal || !priceVal) {
        alert('يرجى ملء كافة البيانات الأساسية (ID، الاسم، السعر)');
        return;
      }

      const existingProd = productsArray.find(p => String(p.id) === String(idVal));
      let finalImg = urlVal || (existingProd ? existingProd.image : '');

      const payload = {
        action: 'save',
        id: idVal,
        name: nameVal,
        category: catVal,
        price: priceVal,
        imageUrl: finalImg
      };

      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).then(() => {
        alert(existingProd ? 'تم تحديث البيانات بنجاح!' : 'تم حفظ الصنف بنجاح!');
        if (modalForm) modalForm.classList.remove('active');
        clearForm();
        setTimeout(loadProductsFromSheets, 1200);
      }).catch((err) => {
        console.error("Google Sheets Sync Error:", err);
      });
    });
  }

  // ==========================================
  // زر الحذف
  // ==========================================
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const idVal = idInput ? idInput.value.trim() : '';
      if (!idVal) { alert('يرجى إدخال الـ ID'); return; }

      if (confirm('هل أنت متأكد من الحذف؟')) {
        const payload = { action: 'delete', id: idVal };
        fetch(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payload)
        }).then(() => {
          alert('تم الحذف بنجاح!');
          if (modalForm) modalForm.classList.remove('active');
          clearForm();
          setTimeout(loadProductsFromSheets, 1200);
        }).catch((err) => {
          console.error("Google Sheets Delete Error:", err);
        });
      }
    });
  }

  function clearFormExceptId() {
    if (nameInput) nameInput.value = '';
    if (categoryInput) categoryInput.value = '';
    if (priceInput) priceInput.value = '';
    if (urlInput) urlInput.value = '';
  }

  function clearFormExceptName() {
    if (idInput) idInput.value = '';
    if (categoryInput) categoryInput.value = '';
    if (priceInput) priceInput.value = '';
    if (urlInput) urlInput.value = '';
  }

  function clearForm() {
    if (idInput) idInput.value = '';
    if (nameInput) nameInput.value = '';
    clearFormExceptId();
  }
});

function updateIdsDropdown(products) {
  let idsDatalist = document.getElementById('ids-list');
  if (idsDatalist) {
    idsDatalist.innerHTML = products.map(p => `<option value="${p.id}">${p.name ? ' - ' + p.name : ''}</option>`).join('');
  }
}

function updateNamesDropdown(products) {
  let namesDatalist = document.getElementById('names-list');
  if (namesDatalist) {
    namesDatalist.innerHTML = products.map(p => `<option value="${p.name}">ID: ${p.id}</option>`).join('');
  }
}

function updateCategoryDropdowns(products) {
  const categoryFilterSelect = document.getElementById('name-filter-cart');
  const categoryInput = document.querySelectorAll('.form-e input')[2];

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  if (categoryFilterSelect) {
    const currentSelected = categoryFilterSelect.value;
    let optionsHTML = `<option value="all">اختر التصنيف</option>`;
    categories.forEach(cat => { optionsHTML += `<option value="${cat}">${cat}</option>`; });
    categoryFilterSelect.innerHTML = optionsHTML;
    categoryFilterSelect.value = (currentSelected && categories.includes(currentSelected)) ? currentSelected : 'all';
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
  const searchInput = document.getElementById('search-name');
  const categoryFilterSelect = document.getElementById('name-filter-cart');

  const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';
  const selectedCategory = categoryFilterSelect ? categoryFilterSelect.value : 'all';

  const filtered = productsArray.filter(prod => {
    const prodName = (prod.name || '').toString().toLowerCase();
    const prodId = (prod.id || '').toString().toLowerCase();
    const matchesSearch = prodName.includes(searchTerm) || prodId.includes(searchTerm);
    const matchesCategory = (selectedCategory === 'all' || selectedCategory === 'اختر التصنيف') ? true : prod.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  displayProducts(shuffleArray(filtered));
}

function displayProducts(products) {
  const mainContainer = document.querySelector('.cards-container');
  if (!mainContainer) return;
  
  mainContainer.innerHTML = '';

  products.forEach(prod => {
    let imageUrl = 'img/market.jpg';
    if (prod.image && prod.image.trim().length > 5) {
      imageUrl = prod.image.trim();
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-cart">
        <button type="button" class="btn-add-to-cart amazon-plus-btn" data-id="${prod.id}" title="إضافة للعربة">+</button>
      </div>
      <div class="card-img show-details-btn" data-id="${prod.id}" style="cursor: pointer;">
        <img src="${imageUrl}" alt="${prod.name}" />
      </div>
      <div class="name">
        <h3 class="name-name">${prod.name}</h3>
        <span class="name-filter">${prod.category}</span>
        <span class="name-prise">${prod.price} ج.م</span>
      </div>
      <div class="card-properts">
        <button type="button" class="show-details-btn" data-id="${prod.id}">تفاصيل</button>
      </div>
    `;
    mainContainer.appendChild(card);
  });
}

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
      const modal = document.getElementById('propertes-cart');

      if (proImg) proImg.src = (foundProd.image && foundProd.image.trim().length > 5) ? foundProd.image.trim() : 'img/market.jpg';
      if (proTitle) proTitle.textContent = foundProd.name || 'بدون اسم';
      if (proCategory) proCategory.textContent = foundProd.category || 'عام';
      if (proPrice) proPrice.textContent = foundProd.price || '0';
      if (proDescription) proDescription.textContent = foundProd.description || 'لا توجد تفاصيل إضافية مضافة لهذا المنتج.';

      renderRelatedProducts(foundProd.category, foundProd.id);

      if (modal) modal.classList.add('active');
    }
  }

  if (e.target.id === 'close-propertes' || e.target.classList.contains('close-propertes-btn') || e.target.id === 'propertes-cart') {
    const modal = document.getElementById('propertes-cart');
    if (modal) modal.classList.remove('active');
  }

  const addBtn = e.target.closest('.btn-add-to-cart');
  if (addBtn) {
    e.preventDefault();
    const prodId = addBtn.getAttribute('data-id');
    if (prodId && typeof addToCart === 'function') {
      addToCart(prodId, productsArray);
    }
  }

  if (e.target.id === 'pro-add-to-cart-btn') {
    e.preventDefault();
    if (activeProductId && typeof addToCart === 'function') {
      addToCart(activeProductId, productsArray);
      const modal = document.getElementById('propertes-cart');
      if (modal) modal.classList.remove('active');
    }
  }
});