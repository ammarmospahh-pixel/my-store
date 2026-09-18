document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.querySelector('form') || document.getElementById('login-form');
  const idInput = document.getElementById('user-id') || document.querySelectorAll('input')[0];
  const passwordInput = document.getElementById('user-password') || document.querySelectorAll('input')[1];

  const GOOGLE_SHEET_API = 'https://script.google.com/macros/s/AKfycbwSYST86fGm7UrUjUuLzRzWpm_N84DepM--Rw-xMTmICj1JCXm63y_s6aeikxKZabEN7A/exec';

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const enteredId = idInput ? idInput.value.trim() : '';
      const enteredPassword = passwordInput ? passwordInput.value.trim() : '';

      if (!enteredId || !enteredPassword) {
        alert('يرجى إدخال رقم التعريف وكلمة المرور!');
        return;
      }

      console.log('جاري التحقق من البيانات...');

      fetch(GOOGLE_SHEET_API)
        .then(response => response.json())
        .then(users => {
          // البحث عن العميل في البيانات المرجعة من Google Sheets
          const userData = users[enteredId];

          // 1. التحقق من وجود العميل ومطابقة كلمة المرور بالضبط
          if (userData && String(userData.password).trim() === enteredPassword) {
            
            // حفظ بيانات الجلسة بنجاح
            localStorage.setItem('currentUser', JSON.stringify({
              id: enteredId,
              name: userData.name,
              role: userData.role
            }));

            // التوجيه إلى صفحة المتجر فقط في حالة مطابقة البيانات
            window.location.href = 'shop.html';

          } else {
            // 2. إذا كانت البيانات غير مطابقة
            alert('لم يتم العثور على العميل أو كلمة المرور غير صحيحة!');
          }
        })
        .catch(error => {
          console.error('خطأ في الاتصال:', error);
          alert('حدث خطأ في الاتصال بالخادم، يرجى المحاولة لاحقاً.');
        });
    });
  }
});