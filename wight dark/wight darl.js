document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('theme-toggle');
  const currentTheme = localStorage.getItem('theme');

  // تطبيق الوضع المفضل المسبق إن وجد
  if (currentTheme === 'dark') {
    document.body.classList.add('dark-mode');
    if (toggleBtn) toggleBtn.textContent = '☀️';
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-mode');

      let theme = 'light';
      if (document.body.classList.contains('dark-mode')) {
        theme = 'dark';
        toggleBtn.textContent = '☀️';
      } else {
        toggleBtn.textContent = '🌙';
      }

      // حفظ الخيار في المحلي كي يستمر عند التنقل بين الصفحات
      localStorage.setItem('theme', theme);
    });
  }
});