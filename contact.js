// ==========================================
// 1. الإعدادات والمتغيرات الرئيسية
// ==========================================
const MY_WHATSAPP_NUMBER = '201501893345';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzFaMA5IrXkuljsgR3U3tfO1ji9v9pw4_mGCveYqRMRupRpM3qU_7X8fano07DYfFC4vQ/exec';

// جلب ID العميل الحالي
function getCurrentUserId() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (currentUser && (currentUser.id || currentUser.userId)) {
    return String(currentUser.id || currentUser.userId);
  }
  return 'guest';
}

// ==========================================
// 2. تحديث الهيدر والبيانات بجميع الكروت
// ==========================================
function updateHeaderAndProfile() {
  const currentUser = JSON.parse(localStorage.getItem('currentUser'));
  if (!currentUser) return;

  const userId = String(currentUser.id || currentUser.userId || 'guest');
  const name = currentUser.name || 'عميل';
  const balance = currentUser.balance !== undefined ? currentUser.balance : '0';
  const discount = currentUser.discount || '0%';
  
  const savedImg = localStorage.getItem(`user_profile_img_${userId}`) || currentUser.image || 'img/2.png';

  const userImgEl = document.getElementById('user-img');
  if (userImgEl) {
    userImgEl.src = savedImg;
  }

  document.querySelectorAll('#clien-name').forEach(el => el.textContent = name);
  document.querySelectorAll('#clien-id-num').forEach(el => el.textContent = userId);
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
// 3. جلب الفواتير المعتمدة على ID العميل من Google Sheet
// ==========================================
async function getClientInvoices() {
  const userId = getCurrentUserId();
  const deletedInvoices = JSON.parse(localStorage.getItem(`deletedInvoices_${userId}`)) || [];

  let combinedInvoices = [];

  try {
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?userId=${encodeURIComponent(userId)}`);
    if (response.ok) {
      const sheetInvoices = await response.json();
      if (Array.isArray(sheetInvoices)) {
        sheetInvoices.forEach(inv => {
          if (String(inv.userId || inv.id || userId) === String(userId) && !deletedInvoices.includes(String(inv.invoiceCode))) {
            combinedInvoices.push(inv);
          }
        });
      }
    }
  } catch (err) {
    console.error("خطأ أثناء جلب البيانات من Google Sheets:", err);
  }

  let localInvoices = JSON.parse(localStorage.getItem(`invoicesHistory_${userId}`)) || [];
  localInvoices.forEach(locInv => {
    const code = String(locInv.invoiceCode);
    if (!deletedInvoices.includes(code) && !combinedInvoices.some(i => String(i.invoiceCode) === code)) {
      combinedInvoices.push(locInv);
    }
  });

  return combinedInvoices;
}

// ==========================================
// 4. عرض وتتبع الطلبات الأحدث
// ==========================================
async function renderOrderTracking() {
  const invoices = await getClientInvoices();
  const trackingContainer = document.querySelector('.clien-total-order');
  if (!trackingContainer) return;

  const activeOrder = invoices.find(inv => {
    const status = inv.status || 'processing';
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
    <label><button onclick="markAsReceived('${orderCode}')" style="background-color: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">تم الاستلام</button></label>
    <label><button onclick="cancelOrder('${orderCode}')" style="background-color: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer;">الغاء الطلب</button></label>
  `;
}

// ==========================================
// 5. تحليل التواريخ
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
// 6. عرض جدول الفواتير (زر الحذف يظهر فقط للملغى)
// ==========================================
async function renderInvoicesTable() {
  const invoices = await getClientInvoices();
  const container = document.querySelector('.clien-total-order2');
  if (!container) return;

  const statusFilter = document.getElementById('statusFilter')?.value || 'all';
  const fromDateVal = document.getElementById('fromDate')?.value;
  const toDateVal = document.getElementById('toDate')?.value;

  let fromTime = null;
  let toTime = null;

  if (fromDateVal) {
    const cleanFrom = fromDateVal.split('T')[0];
    const [fY, fM, fD] = cleanFrom.split('-').map(Number);
    fromTime = new Date(fY, fM - 1, fD, 0, 0, 0).getTime();
  }

  if (toDateVal) {
    const cleanTo = toDateVal.split('T')[0];
    const [tY, tM, tD] = cleanTo.split('-').map(Number);
    toTime = new Date(tY, tM - 1, tD, 23, 59, 59).getTime();
  }

  let filteredInvoices = invoices.filter(inv => {
    let invStatus = inv.status || 'processing';
    
    if (statusFilter === 'delivered' && invStatus !== 'delivered' && invStatus !== 'تم الاستلام') return false;
    if (statusFilter === 'processing' && invStatus !== 'processing' && invStatus !== 'قيد الانتظار' && invStatus !== 'قيد التجهيز') return false;
    if (statusFilter === 'failed' && invStatus !== 'failed' && invStatus !== 'ملغى' && invStatus !== 'تم الإلغاء') return false;

    if (fromTime !== null || toTime !== null) {
      const invTime = parseInvoiceDate(inv.date);
      if (invTime !== null) {
        if (fromTime !== null && invTime < fromTime) return false;
        if (toTime !== null && invTime > toTime) return false;
      }
    }

    return true;
  });

  let htmlContent = `<h3>سجل الفواتير والطلبات</h3>`;
  
  if (filteredInvoices.length === 0) {
    htmlContent += `<div style="padding: 20px; text-align: center; color: #64748b;">لا توجد فواتير مطابقة للفلترة.</div>`;
  } else {
    filteredInvoices.forEach(inv => {
      const itemsStr = inv.itemsString || (inv.items ? inv.items.map(i => `${i.name} (${i.quantity}x)`).join(' - ') : 'منتجات المتجر');
      const invStatus = inv.status || 'processing';

      let statusText = 'قيد الانتظار';
      let actionHtml = `<button onclick="markAsReceived('${inv.invoiceCode}')">تم الاستلام</button>`;

      if (invStatus === 'delivered' || invStatus === 'تم الاستلام') {
        statusText = 'مكتمل';
        actionHtml = `<span style="color: #16a34a; font-weight: bold;">تم تسليمه</span>`;
      } else if (invStatus === 'failed' || invStatus === 'ملغى' || invStatus === 'تم الإلغاء') {
        statusText = 'ملغى';
        // يظهر زر الحذف فقط للفواتير الملغية
        actionHtml = `
          <span style="color: #dc2626; font-weight: bold; margin-left:8px;">تم الإلغاء</span>
          <button onclick="deleteCancelledInvoice('${inv.invoiceCode}')" style="background:#ef4444; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;">حذف</button>
        `;
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
// 7. حذف الفواتير الملغية فقط
// ==========================================
async function deleteCancelledInvoice(invoiceCode) {
  const invoices = await getClientInvoices();
  const targetInvoice = invoices.find(i => String(i.invoiceCode) === String(invoiceCode));

  if (!targetInvoice) return;

  const status = targetInvoice.status || '';
  const isCancelled = status === 'failed' || status === 'ملغى' || status === 'تم الإلغاء';

  // التحقق المباشر من حالة الفاتورة
  if (!isCancelled) {
    alert('عذراً، يمكن حذف الفواتير الملغية فقط!');
    return;
  }

  if (!confirm('هل تريد حذف هذه الفاتورة الملغية نهائياً؟')) return;

  const userId = getCurrentUserId();
  let deletedInvoices = JSON.parse(localStorage.getItem(`deletedInvoices_${userId}`)) || [];
  
  if (!deletedInvoices.includes(String(invoiceCode))) {
    deletedInvoices.push(String(invoiceCode));
    localStorage.setItem(`deletedInvoices_${userId}`, JSON.stringify(deletedInvoices));
  }

  let localHistory = JSON.parse(localStorage.getItem(`invoicesHistory_${userId}`)) || [];
  localHistory = localHistory.filter(i => String(i.invoiceCode) !== String(invoiceCode));
  localStorage.setItem(`invoicesHistory_${userId}`, JSON.stringify(localHistory));

  renderOrderTracking();
  renderInvoicesTable();
}

async function markAsReceived(invoiceCode) {
  await updateOrderStatus(invoiceCode, 'delivered');
  const message = `تم استلام الاوردر علي رقم ${MY_WHATSAPP_NUMBER} (طلب رقم: ${invoiceCode})`;
  window.open(`https://wa.me/${MY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

async function cancelOrder(invoiceCode) {
  if (!confirm('هل أنت تأكد من إلغاء هذا الطلب؟')) return;
  await updateOrderStatus(invoiceCode, 'failed');
  const message = `تم إلغاء الطلب رقم: ${invoiceCode}`;
  window.open(`https://wa.me/${MY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
}

async function updateOrderStatus(invoiceCode, newStatus) {
  const userId = getCurrentUserId();
  let localHistory = JSON.parse(localStorage.getItem(`invoicesHistory_${userId}`)) || [];

  const invIndex = localHistory.findIndex(i => String(i.invoiceCode) === String(invoiceCode));
  if (invIndex > -1) {
    localHistory[invIndex].status = newStatus;
    localStorage.setItem(`invoicesHistory_${userId}`, JSON.stringify(localHistory));
  }

  renderOrderTracking();
  renderInvoicesTable();
}

function calculateStats(invoices) {
  let totalPurchases = 0;
  let totalOrdersCount = invoices.length;

  invoices.forEach(inv => {
    if (inv.status !== 'failed' && inv.status !== 'ملغى' && inv.status !== 'تم الإلغاء') {
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
// 8. تقديم الشكوى وتحويل الرسالة إلى واتساب
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

    window.open(`https://wa.me/${MY_WHATSAPP_NUMBER}?text=${encodeURIComponent(fullMessage)}`, '_blank');
  });
}

// ==========================================
// 9. التهيئة عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderAndProfile();
  setupImageUpload();
  renderOrderTracking();
  renderInvoicesTable();
  setupContactForm();
});