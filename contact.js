// ==========================================
// 1. الإعدادات والمتغيرات الرئيسية
// ==========================================
const MY_WHATSAPP_NUMBER = '201501893345';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFaMA5IrXkuljsgR3U3tfO1ji9v9pw4_mGCveYqRMRupRpM3qU_7X8fano07DYfFC4vQ/exec';

// جلب ID العميل الحالي
function getCurrentUserId() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && (currentUser.id || currentUser.userId)) {
    return String(currentUser.id || currentUser.userId).trim();
  }
  return 'guest';
}

// ==========================================
// 2. تحديث الهيدر والبيانات بجميع الكروت
// ==========================================
function updateHeaderAndProfile() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) return;

  const userId = String(currentUser.id || currentUser.userId || 'guest').trim();
  const name = currentUser.name || 'عميل';
  const balance = currentUser.balance !== undefined ? currentUser.balance : '0';
  const discount = currentUser.discount || '0%';
  
  const savedImg = localStorage.getItem(`user_profile_img_${userId}`) || currentUser.image || 'img/2.png';

  const userImgEl = document.getElementById('user-img');
  if (userImgEl) {
    userImgEl.src = savedImg;
  }

  document.querySelectorAll('#clien-name').forEach(el => el.textContent = name);
  document.querySelectorAll('#clien-id-num').forEach(el => {
    if (!el.closest('.clien-total-container')) {
      el.textContent = userId;
    }
  });
  document.querySelectorAll('#clien-id-num2').forEach(el => el.textContent = balance + ' ج.م');
  document.querySelectorAll('#clien-id-num3').forEach(el => el.textContent = discount);
}

// رفع وتغيير الصورة الشخصية
function setupImageUpload() {
  const userImg = document.getElementById('user-img');
  const uploadInput = document.getElementById('uploud-img-user');

  if (userImg && uploadInput) {
    userImg.addEventListener('click', () => uploadInput.click());
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
          const newImgSrc = event.target.result;
          userImg.src = newImgSrc;
          const userId = getCurrentUserId();
          localStorage.setItem(`user_profile_img_${userId}`, newImgSrc);
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// ==========================================
// 3. جلب جميع الفواتير من Google Sheets و LocalStorage
// ==========================================
async function getClientInvoices() {
  const userId = String(getCurrentUserId());
  
  // أ) البيانات المخزنة محلياً
  let allInvoices = JSON.parse(localStorage.getItem(`invoicesHistory_${userId}`)) || [];

  // ب) جلب كل الفواتير مباشرة من Google Apps Script (Google Sheets)
  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?userId=${encodeURIComponent(userId)}&_t=${Date.now()}`);
    if (response.ok) {
      const sheetInvoices = await response.json();

      if (Array.isArray(sheetInvoices)) {
        sheetInvoices.forEach(sheetInv => {
          const invCode = sheetInv.invoiceCode || sheetInv.kwd_alfatwra || sheetInv['كود الفاتورة'];
          const exists = allInvoices.some(i => String(i.invoiceCode) === String(invCode));
          if (!exists) {
            allInvoices.push({
              invoiceCode: invCode || '---',
              date: sheetInv.date || sheetInv.tarykh_altsjyl || sheetInv['تاريخ و وقت التسجيل'] || '',
              itemsString: sheetInv.itemsString || sheetInv.tsfyl_almtlbat || sheetInv['تفاصيل الطلبات والمجموعات'] || '',
              totalPrice: sheetInv.totalPrice || sheetInv.almsrofat || sheetInv['السعر الإجمالي'] || 0,
              status: sheetInv.status || sheetInv.halat_al3mlyl || sheetInv['حالة الطلب'] || 'processing'
            });
          }
        });
      }
    }
  } catch (err) {
    console.error("خطأ أثناء جلب البيانات من Google Sheets:", err);
  }

  return allInvoices;
}

// ==========================================
// 4. عرض وتتبع الطلبات الأحدث (متابعة الطلب)
// ==========================================
async function renderOrderTracking() {
  const invoices = await getClientInvoices();
  const trackingContainer = document.querySelector('.clien-total-order');
  if (!trackingContainer) return;

  const activeOrder = invoices.find(inv => {
    const status = String(inv.status || 'processing').trim();
    return status === 'processing' || status === 'قيد الانتظار' || status === 'قيد التجهيز';
  });

  if (!activeOrder) {
    trackingContainer.style.display = 'none';
    return;
  }

  trackingContainer.style.display = 'flex';
  const orderCode = activeOrder.invoiceCode || '---';

  trackingContainer.innerHTML = `
    <label><span>رقم الطلب: ${orderCode}</span></label>
    <label><span style="background-color: #dbeafe; color: #2563eb;">تم الطلب</span></label>
    <label><span style="background-color: #fef08a; color: #ca8a04;">يتم التجهيز</span></label>
    <label><span>خرج للتوصيل</span></label>
    <label><button type="button" onclick="markAsReceived('${orderCode}')" style="background-color: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">تم الاستلام</button></label>
    <label><button type="button" onclick="cancelOrder('${orderCode}')" style="background-color: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">إلغاء الطلب</button></label>
  `;
}

// ==========================================
// 5. دالة تفكيك التاريخ واستخراج الوقت بمرونة
// ==========================================
function parseInvoiceDate(dateStr) {
  if (!dateStr) return null;

  const numbers = String(dateStr).match(/\d+/g);
  if (!numbers || numbers.length < 3) return null;

  let year, month, day;

  if (numbers[0].length === 4) {
    year = parseInt(numbers[0], 10);
    month = parseInt(numbers[1], 10) - 1;
    day = parseInt(numbers[2], 10);
  } else if (numbers[2].length === 4) {
    day = parseInt(numbers[0], 10);
    month = parseInt(numbers[1], 10) - 1;
    year = parseInt(numbers[2], 10);
  } else {
    return null;
  }

  return new Date(year, month, day).getTime();
}

// ==========================================
// 6. عرض سجل الفواتير والطلبات (يشمل البحث المباشر والفلترة)
// ==========================================
async function renderInvoicesTable() {
  const invoices = await getClientInvoices();
  const container = document.querySelector('.clien-total-order2');
  if (!container) return;

  const statusFilter = document.getElementById('statusFilter')?.value || 'all';
  const fromDateVal = document.getElementById('fromDate')?.value;
  const toDateVal = document.getElementById('toDate')?.value;

  // جلب حقل البحث بجميع احتمالات الـ IDs الممكّنة
  const searchEl = document.getElementById('searchInput') || document.getElementById('fromDate');
  const searchQuery = searchEl ? searchEl.value.trim().toLowerCase() : '';

  let fromTime = null;
  let toTime = null;

  if (fromDateVal && fromDateVal.includes('-')) {
    const cleanFrom = fromDateVal.split('T')[0];
    const [fY, fM, fD] = cleanFrom.split('-').map(Number);
    fromTime = new Date(fY, fM - 1, fD, 0, 0, 0).getTime();
  }

  if (toDateVal && toDateVal.includes('-')) {
    const cleanTo = toDateVal.split('T')[0];
    const [tY, tM, tD] = cleanTo.split('-').map(Number);
    toTime = new Date(tY, tM - 1, tD, 23, 59, 59).getTime();
  }

  // فلترة الفواتير مع استبعاد الملغى ومطابقة البحث مع (كود الفاتورة، المنتجات، التاريخ)
  let filteredInvoices = invoices.filter(inv => {
    let invStatus = String(inv.status || 'processing').trim();
    
    // إخفاء الفواتير الملغاة
    if (invStatus === 'failed' || invStatus === 'ملغى' || invStatus === 'تم الإلغاء') {
      return false;
    }

    if (statusFilter === 'delivered' && invStatus !== 'delivered' && invStatus !== 'تم الاستلام' && invStatus !== 'مكتمل') return false;
    if (statusFilter === 'processing' && invStatus !== 'processing' && invStatus !== 'قيد الانتظار' && invStatus !== 'قيد التجهيز') return false;

    if (fromTime !== null || toTime !== null) {
      const invTime = parseInvoiceDate(inv.date);
      if (invTime !== null) {
        if (fromTime !== null && invTime < fromTime) return false;
        if (toTime !== null && invTime > toTime) return false;
      }
    }

    // مطابقة البحث النصي (رقم الفاتورة - تفاصيل المنتج - التاريخ)
    if (searchQuery !== '') {
      const invCode = String(inv.invoiceCode || '').toLowerCase();
      const itemsStr = String(inv.itemsString || (inv.items ? inv.items.map(i => i.name).join(' ') : '')).toLowerCase();
      const invDate = String(inv.date || '').toLowerCase();

      const matchesCode = invCode.includes(searchQuery);
      const matchesItems = itemsStr.includes(searchQuery);
      const matchesDate = invDate.includes(searchQuery);

      if (!matchesCode && !matchesItems && !matchesDate) {
        return false;
      }
    }

    return true;
  });

  let htmlContent = `<h3>سجل الفواتير والطلبات</h3>`;
  
  if (filteredInvoices.length === 0) {
    htmlContent += `<div style="padding: 20px; text-align: center; color: #64748b;">لا توجد فواتير مطابقة.</div>`;
  } else {
    filteredInvoices.forEach(inv => {
      const itemsStr = inv.itemsString || (inv.items ? inv.items.map(i => `${i.name} (${i.quantity}x)`).join(' - ') : 'منتجات المتجر');
      const invStatus = String(inv.status || 'processing').trim();

      let statusText = 'قيد الانتظار/التجهيز';
      let actionHtml = `<button onclick="markAsReceived('${inv.invoiceCode}')">تم الاستلام</button>`;

      if (invStatus === 'delivered' || invStatus === 'تم الاستلام' || invStatus === 'مكتمل') {
        statusText = 'مكتمل';
        actionHtml = `<span style="color: #16a34a; font-weight: bold;">تم تسليمه</span>`;
      }
      
      htmlContent += `
        <div class="clien-total-order2-container-item" style="margin-bottom: 10px;">
          <span>${inv.invoiceCode}</span>
          <span>${inv.date}</span>
          <span>${itemsStr}</span>
          <span>${parseFloat(inv.totalPrice || 0).toFixed(2)} ج.م</span>
          <span>${statusText}</span>
          ${actionHtml}
        </div>
      `;
    });
  }

  container.innerHTML = htmlContent;
  calculateStats(filteredInvoices);
}

// ==========================================
// 7. دالة زر "تم الاستلام"
// ==========================================
async function markAsReceived(invoiceCode) {
  const userId = String(getCurrentUserId());
  let localHistory = JSON.parse(localStorage.getItem(`invoicesHistory_${userId}`)) || [];

  const invIndex = localHistory.findIndex(i => String(i.invoiceCode) === String(invoiceCode));
  if (invIndex > -1) {
    localHistory[invIndex].status = 'delivered';
    localStorage.setItem(`invoicesHistory_${userId}`, JSON.stringify(localHistory));
  } else {
    localHistory.push({ invoiceCode: invoiceCode, status: 'delivered' });
    localStorage.setItem(`invoicesHistory_${userId}`, JSON.stringify(localHistory));
  }

  // إرسال تحديث الحالة إلى Google Sheets
  try {
    fetch(`${GOOGLE_SCRIPT_URL}?action=updateStatus&invoiceCode=${encodeURIComponent(invoiceCode)}&status=delivered`, { mode: 'no-cors' });
  } catch (err) {
    console.error("خطأ أثناء التحديث في Google Sheets:", err);
  }

  // فتح الواتساب للإشعار بالاستلام
  const message = `تم استلام الاوردر علي رقم ${MY_WHATSAPP_NUMBER} (طلب رقم: ${invoiceCode})`;
  const whatsappUrl = `https://wa.me/${MY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');

  // إعادة تحديث الواجهة
  renderOrderTracking();
  renderInvoicesTable();
}

// ==========================================
// 8. دالة إلغاء الطلب والحذف النهائي
// ==========================================
async function cancelOrder(invoiceCode) {
  if (!confirm('هل أنت متأكد من إلغاء هذا الطلب وحذفه نهائياً من المنصة وجوجل شيت؟')) return;

  const userId = String(getCurrentUserId());

  // 1. حذف الفاتورة فوراً من ذاكرة المتصفح المحلية (localStorage)
  let localHistory = JSON.parse(localStorage.getItem(`invoicesHistory_${userId}`)) || [];
  localHistory = localHistory.filter(i => String(i.invoiceCode) !== String(invoiceCode));
  localStorage.setItem(`invoicesHistory_${userId}`, JSON.stringify(localHistory));

  // 2. إرسال أمر الحذف المباشر إلى Google Sheets
  try {
    fetch(`${GOOGLE_SCRIPT_URL}?action=delete&invoiceCode=${encodeURIComponent(invoiceCode)}&userId=${encodeURIComponent(userId)}`, { mode: 'no-cors' });
  } catch (err) {
    console.error("خطأ أثناء حذف الفاتورة من Google Sheets:", err);
  }

  // 3. إرسال إشعار الإلغاء عبر الواتساب
  const message = `طلب إلغاء وحذف أوردر برقم: ${invoiceCode}`;
  const whatsappUrl = `https://wa.me/${MY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');

  // 4. إخفاء شريط التتبع وإعادة تحديث الجدول لإخفاء الفاتورة تماماً
  const trackingContainer = document.querySelector('.clien-total-order');
  if (trackingContainer) {
    trackingContainer.style.display = 'none';
  }

  renderOrderTracking();
  renderInvoicesTable();
}

function calculateStats(invoices) {
  let totalPurchases = 0;
  let totalOrdersCount = invoices.length;

  invoices.forEach(inv => {
    const status = String(inv.status || '').trim();
    if (status !== 'failed' && status !== 'ملغى' && status !== 'تم الإلغاء') {
      totalPurchases += parseFloat(inv.totalPrice || 0);
    }
  });

  let totalPoints = Math.floor(totalPurchases / 100);

  const container = document.querySelector('.clien-total-container');
  if (container) {
    const cards = container.querySelectorAll('span span');
    if (cards.length >= 3) {
      cards[0].textContent = totalPurchases.toFixed(2) + ' ج.م';
      cards[1].textContent = totalOrdersCount;
      cards[2].textContent = totalPoints + ' نقطة';
    }
  }
}

function filterInvoices() {
  renderInvoicesTable();
}

function printStatement() {
  window.print();
}

// ==========================================
// 9. تقديم الشكوى وتحويل الرسالة إلى واتساب
// ==========================================
function setupContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('namber').value.trim();
    const message = document.getElementById('message').value.trim();

    if (!name || !phone || !message) {
      alert('يرجى ملء جميع الحقول المطلوبة!');
      return;
    }

    let fullMessage = `📌 *رسالة جديدة (شكوى/اقتراح)*\n\n`;
    fullMessage += `👤 *الاسم:* ${name}\n`;
    fullMessage += `📱 *رقم الهاتف:* ${phone}\n`;
    fullMessage += `📝 *الرسالة:* \n${message}`;

    const whatsappUrl = `https://wa.me/${MY_WHATSAPP_NUMBER}?text=${encodeURIComponent(fullMessage)}`;
    window.open(whatsappUrl, '_blank');
  });
}

// ==========================================
// 10. التهيئة عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderAndProfile();
  setupImageUpload();
  renderOrderTracking();
  renderInvoicesTable();
  setupContactForm();
});