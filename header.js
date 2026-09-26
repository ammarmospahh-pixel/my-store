// ستاسو نوی اجرا شوی لینک
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzqz8dWhu2tXYVCoNhAVAimExlOji5PjkSQ6FuLsEDCNr9-PMCnByc69SPZMmS_pWY8Fg/exec';

document.addEventListener('DOMContentLoaded', async () => {
  let currentUser = JSON.parse(localStorage.getItem('currentUser'));

  if (!currentUser || !currentUser.id) return;

  const clientNameEl = document.getElementById('clien-name');
  const clientIdNumEl = document.getElementById('clien-id-num');
  const clientAddressEl = document.getElementById('clien-id-num2');
  const clientDiscountEl = document.getElementById('clien-id-num3');
  const userImgEl = document.getElementById('user-img');

  // د محلي ډېټا ښودل
  if (clientNameEl) clientNameEl.textContent = currentUser.name || '';
  if (clientIdNumEl) clientIdNumEl.textContent = currentUser.id || '';
  if (clientAddressEl) clientAddressEl.textContent = currentUser.address || '';
  if (clientDiscountEl) clientDiscountEl.textContent = (currentUser.discount !== undefined) ? currentUser.discount + '%' : '0%';
  if (userImgEl && currentUser.image) userImgEl.src = currentUser.image;

  // له جوجل شیت څخه مستقیمې انلاین ډېټا راخیستل
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
      if (userImgEl && currentUser.image) userImgEl.src = currentUser.image;
    }
  } catch (error) {
    console.error('د ډېټا په راخیستلو کې تېروتنه:', error);
  }

  // پر انځور د کلیک کولو په صورت کې د عکس د لینک بدلول
  if (userImgEl) {
    userImgEl.onclick = async () => {
      const inputUrl = prompt('د عکس نوی لینک یا د Google Drive لینک ورکړئ:', currentUser.image || '');

      if (inputUrl && inputUrl.trim() !== '') {
        const trimmedUrl = inputUrl.trim();

        try {
          await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'text/plain'
            },
            body: JSON.stringify({
              id: currentUser.id,
              imageData: trimmedUrl
            })
          });

          alert('لینک په بریا سره په شیت کې خوندي شو!');

          // له پورته کولو وروسته د مستقیم انځور سملاسي زېرمه کول
          setTimeout(async () => {
            const res = await fetch(SCRIPT_URL);
            const data = await res.json();
            if (data[currentUser.id] && data[currentUser.id].image) {
              currentUser.image = data[currentUser.id].image;
              localStorage.setItem('currentUser', JSON.stringify(currentUser));
              userImgEl.src = currentUser.image;
            }
          }, 1500);

        } catch (err) {
          console.error('په پروسه کې تېروتنه:', err);
        }
      }
    };
  }
});