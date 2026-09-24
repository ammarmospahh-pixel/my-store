document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  if (!currentUser) {
    alert('يرجى تسجيل الدخول أولاً!');
    window.location.href = 'id.html';
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
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {
    id: '',
    name: 'زائر',
    role: 'guest'
  };

  const clientNameEl = document.getElementById('clien-name');
  const clientIdNumEl = document.getElementById('clien-id-num');
  const addBtn = document.getElementById('name-add-cart');

  // 1. تحديث اسم العميل والـ ID في الهيدر
  if (clientNameEl) clientNameEl.textContent = currentUser.name || 'زائر';
  if (clientIdNumEl) {
    if (currentUser.id) {
      clientIdNumEl.parentElement.style.display = 'inline';
      clientIdNumEl.textContent = currentUser.id;
    } else {
      // إخفاء الـ ID إذا كان زائرًا
      clientIdNumEl.parentElement.style.display = 'none';
    }
  }

  // 2. التحكم في زر إضافة المنتج (للأدمن فقط)
  if (addBtn) {
    if (currentUser.role === 'admin') {
      addBtn.style.display = 'block';
    } else {
      addBtn.style.display = 'none';
    }
  }

  // 3. تعديل رابط "تواصل معنا" إلى "تسجيل دخول" لو كان زائرًا
  const linksNav = document.querySelector('.links');
  if (linksNav) {
    const contactLink = Array.from(linksNav.querySelectorAll('a')).find(
      a => a.getAttribute('href') === 'contact.html' || a.textContent.trim().includes('تواصل')
    );

    if (contactLink && (!currentUser.id || currentUser.role === 'guest')) {
      contactLink.href = 'id.html';
      contactLink.textContent = 'تسجيل دخول';
    }
  }
});
const currentUser = JSON.parse(localStorage.getItem('currentUser'));

// إذا كان العميل زائرًا (لا يوجد ID أو الـ role هو guest)
if (!currentUser || !currentUser.id || currentUser.role === 'guest') {
  const logoutBtn = document.querySelector('.longout a');
  if (logoutBtn) {
    logoutBtn.textContent = 'تسجيل دخول';
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));

  // فحص هل العميل زائر أم لا (إذا لم تكن هناك بيانات أو الـ ID فارغ أو الرتبة guest)
  const isGuest = !currentUser || !currentUser.id || currentUser.role === 'guest';

  const clientNameEl = document.getElementById('clien-name');
  const clientIdNumEl = document.getElementById('clien-id-num');
  const logoutBtn = document.querySelector('.longout a');

  if (isGuest) {
    // 1. تغيير الاسم في الهيدر إلى "زائر"
    if (clientNameEl) clientNameEl.textContent = 'زائر';

    // 2. إخفاء الـ ID بالكامل
    if (clientIdNumEl) {
      if (clientIdNumEl.parentElement) {
        clientIdNumEl.parentElement.style.display = 'none';
      } else {
        clientIdNumEl.textContent = '';
      }
    }

    // 3. تغيير زر الهيدر ليصبح "تسجيل دخول"
    if (logoutBtn) {
      logoutBtn.textContent = 'تسجيل دخول';
    }
  } else {
    // إذا كان عميل مسجل بـ ID
    if (clientNameEl) clientNameEl.textContent = currentUser.name;
    if (clientIdNumEl) {
      if (clientIdNumEl.parentElement) {
        clientIdNumEl.parentElement.style.display = 'inline';
      }
      clientIdNumEl.textContent = currentUser.id;
    }
    if (logoutBtn) {
      logoutBtn.textContent = 'تسجيل خروج';
    }
  }
});
// التثبيت التلقائي لحساب الزائر في حال عدم وجود جلسة دخول سابقة
(function initGuestUser() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser || !currentUser.id) {
    localStorage.setItem('currentUser', JSON.stringify({
      id: '',
      name: 'زائر',
      role: 'guest'
    }));
  }
})();