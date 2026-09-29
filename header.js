// ==========================================
// 1. الإعدادات والرابط
// ==========================================
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzqz8dWhu2tXYVCoNhAVAimExlOji5PjkSQ6FuLsEDCNr9-PMCnByc69SPZMmS_pWY8Fg/exec';

// دالة لتحويل رابط جوجل دريف العادي إلى رابط مباشر للصورة
function convertGoogleDriveLink(url) {
  if (!url) return url;
  if (url.includes('drive.google.com')) {
    const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch[1]}`;
    }
  }
  return url;
}

document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = JSON.parse(localStorage.getItem('currentUser'));

  if (!currentUser || !currentUser.id) return;

  const clientNameEl = document.getElementById('clien-name');
  const clientIdNumEl = document.getElementById('clien-id-num');
  const clientAddressEl = document.getElementById('clien-id-num2');
  const clientDiscountEl = document.getElementById('clien-id-num3');
  const userImgEl = document.getElementById('user-img');

  // عرض البيانات من الذاكرة المحلية أولاً
  if (clientNameEl) clientNameEl.textContent = currentUser.name || '';
  if (clientIdNumEl) clientIdNumEl.textContent = currentUser.id || '';
  if (clientAddressEl) clientAddressEl.textContent = currentUser.address || '';
  if (clientDiscountEl) clientDiscountEl.textContent = (currentUser.discount !== undefined) ? currentUser.discount + '%' : '0%';
  
  if (userImgEl && currentUser.image) {
    userImgEl.src = convertGoogleDriveLink(currentUser.image);
  }

  // جلب البيانات مباشرة من جوجل شيت وتحديثها
  try {
    const response = await fetch(SCRIPT_URL);
    const usersData = await response.json();
    const freshUserData = usersData[currentUser.id];

    if (freshUserData) {
      currentUser.address = freshUserData.address || '';
      currentUser.discount = freshUserData.discount !== undefined ? freshUserData.discount : 0;
      if (freshUserData.image) {
        currentUser.image = freshUserData.image;
      }

      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      if (clientAddressEl) clientAddressEl.textContent = currentUser.address;
      if (clientDiscountEl) clientDiscountEl.textContent = currentUser.discount + '%';
      
      if (userImgEl && currentUser.image) {
        userImgEl.src = convertGoogleDriveLink(currentUser.image);
      }
    }
  } catch (error) {
    console.error('د ډېټا په راخیستلو کې تېروتنه:', error);
  }

  // عند النقر على الصورة لتغيير الرابط
  if (userImgEl) {
    userImgEl.onclick = async () => {
      const inputUrl = prompt('د عکس نوی لینک یا د Google Drive لینک ورکړئ:', currentUser.image || '');

      if (inputUrl && inputUrl.trim() !== '') {
        const trimmedUrl = inputUrl.trim();
        const formattedUrl = convertGoogleDriveLink(trimmedUrl);

        try {
          await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'text/plain'
            },
            body: JSON.stringify({
              id: currentUser.id,
              imageData: formattedUrl
            })
          });

          alert('لینک په بریا سره په شیت کې خوندي شو!');

          // تحديث الصورة فوراً محلياً وعرضها
          setTimeout(async () => {
            const res = await fetch(SCRIPT_URL);
            const data = await res.json();
            if (data[currentUser.id] && data[currentUser.id].image) {
              currentUser.image = data[currentUser.id].image;
              localStorage.setItem('currentUser', JSON.stringify(currentUser));
              userImgEl.src = convertGoogleDriveLink(currentUser.image);
            }
          }, 1500);

        } catch (err) {
          console.error('په پروسه کې تېروتنه:', err);
        }
      }
    };
  }
});