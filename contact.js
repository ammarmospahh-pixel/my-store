// ==========================================
// 1. الإعدادات والمتغيرات الرئيسية
// ==========================================
const MY_WHATSAPP_NUMBER = '201501893345';
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzPVHikzUab0n7EqKgDaE1sZ7pqZ0Q7AL3LJeUTQrdKPy6qRzzpkSxxjJjWSmurGNW8Tg/exec';

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
// 3. جلب البيانات من الذاكرة المحلية أولاً ثم من الشيت
// ==========================================
function getLocalInvoices() {
  const userId = String(getCurrentUserId());
  const storageKey = `invoicesHistory_${userId}`;
  return JSON.parse(localStorage.getItem(storageKey)) || [];
}

async function fetchInvoicesFromSheet() {
  const userId = String(getCurrentUserId());
  const storageKey = `invoicesHistory_${userId}`;

  try {
    const fetchUrl = `${GOOGLE_SCRIPT_URL}?userId=${encodeURIComponent(userId)}&_t=${Date.now()}`;
    const response = await fetch(fetchUrl, { redirect: 'follow' });
    
    if (response.ok) {
      const sheetInvoices = await response.json();

      if (Array.isArray(sheetInvoices)) {
        const localInvoices = getLocalInvoices();

        const freshInvoices = sheetInvoices.map(sheetInv => {
          const invCode = String(sheetInv.invoiceCode || '---').trim();
          
          const existingLocal = localInvoices.find(l => String(l.invoiceCode).trim() === invCode);
          let rawStatus = existingLocal ? existingLocal.status : String(sheetInv.status || 'processing').trim();
          
          if (!rawStatus || rawStatus === '') {
            rawStatus = 'processing';
          }

          return {
            invoiceCode: invCode,
            date: sheetInv.date || '',
            itemsString: sheetInv.itemsString || 'منتجات المتجر',
            totalPrice: parseFloat(sheetInv.totalPrice || 0),
            status: rawStatus
          };
        });
        
        if (JSON.stringify(localInvoices) !== JSON.stringify(freshInvoices)) {
          localStorage.setItem(storageKey, JSON.stringify(freshInvoices));
          renderOrderTracking();
          renderInvoicesTable();
        }
      }
    }
  } catch (err) {
    console.warn("الاعتماد على النسخة المحلية لعدم توفر اتصال بالإنترنت:", err);
  }
}

// ==========================================
// 4. عرض وتتبع الطلبات الأحدث (متابعة الطلب)
// ==========================================
function renderOrderTracking() {
  const invoices = getLocalInvoices();
  const trackingContainer = document.querySelector('.clien-total-order');
  if (!trackingContainer) return;

  const activeOrder = invoices.find(inv => {
    const status = String(inv.status || 'processing').trim();
    return status !== 'delivered' && status !== 'تم الاستلام' && status !== 'مكتمل' && status !== 'failed' && status !== 'ملغى';
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
// 5. دالة تفكيك التاريخ واستخراج الوقت
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

// تخزين الفواتير المفلترة الحالية للاستخدام في الطباعة
let currentFilteredInvoices = [];

// ==========================================
// 6. عرض سجل الفواتير والطلبات (مع البحث والفلتر بدقة)
// ==========================================
function renderInvoicesTable() {
  const invoices = getLocalInvoices();
  const container = document.querySelector('.clien-total-order2');
  if (!container) return;

  // جلب عناصر الفلتر والبحث من الصفحة ديناميكياً
  const selects = document.querySelectorAll('select');
  const inputs = document.querySelectorAll('input[type="text"], input:not([type])');

  let statusFilter = 'all';
  if (selects.length > 0) {
    for (let sel of selects) {
      if (sel.closest('.clien-total-order2-header') || sel.parentElement.textContent.includes('حالة الطلب') || sel.options.length > 1) {
        const val = sel.value.trim();
        if (val === 'مكتمل' || val === 'delivered') statusFilter = 'delivered';
        else if (val === 'قيد التجهيز' || val === 'processing') statusFilter = 'processing';
        break;
      }
    }
  }

  let searchQuery = '';
  for (let inp of inputs) {
    if (inp.type !== 'date' && inp.type !== 'file' && inp.id !== 'fromDate' && inp.id !== 'toDate' && !inp.closest('.clien-total-container')) {
      searchQuery = inp.value.trim().toLowerCase();
      break;
    }
  }

  currentFilteredInvoices = invoices.filter(inv => {
    let invStatus = String(inv.status || 'processing').trim();
    
    if (invStatus === 'failed' || invStatus === 'ملغى' || invStatus === 'تم الإلغاء') {
      return false;
    }

    if (statusFilter === 'delivered' && invStatus !== 'delivered' && invStatus !== 'تم الاستلام' && invStatus !== 'مكتمل') return false;
    if (statusFilter === 'processing' && invStatus !== 'processing' && invStatus !== 'قيد الانتظار' && invStatus !== 'قيد التجهيز') return false;

    if (searchQuery !== '') {
      const invCode = String(inv.invoiceCode || '').toLowerCase();
      const itemsStr = String(inv.itemsString || '').toLowerCase();
      const invDate = String(inv.date || '').toLowerCase();

      if (!invCode.includes(searchQuery) && !itemsStr.includes(searchQuery) && !invDate.includes(searchQuery)) {
        return false;
      }
    }

    return true;
  });

  let htmlContent = `<h3>سجل الفواتير والطلبات</h3>`;
  
  if (currentFilteredInvoices.length === 0) {
    htmlContent += `<div style="padding: 20px; text-align: center; color: #64748b;">لا توجد فواتير مطابقة للبحث.</div>`;
  } else {
    currentFilteredInvoices.forEach(inv => {
      const itemsStr = inv.itemsString || 'منتجات المتجر';
      const invStatus = String(inv.status || 'processing').trim();

      let statusText = 'مكتمل';
      let actionHtml = `<span style="color: #16a34a; font-weight: bold;">تم تسليمه</span>`;

      if (invStatus !== 'delivered' && invStatus !== 'تم الاستلام' && invStatus !== 'مكتمل') {
        statusText = 'قيد الانتظار/التجهيز';
        actionHtml = `<button onclick="markAsReceived('${inv.invoiceCode}')">تم الاستلام</button>`;
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
  calculateStats(currentFilteredInvoices);
}

// تفعيل أحداث التغيير للبحث والفلتر والطباعة فورياً
function setupSearchAndFilters() {
  document.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('input', () => renderInvoicesTable());
    element.addEventListener('change', () => renderInvoicesTable());
  });

  // ربط زر طباعة كشف الحساب
  const printButtons = document.querySelectorAll('button, a');
  printButtons.forEach(btn => {
    if (btn.textContent.includes('طباعة') || btn.innerHTML.includes('طباعة')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        printAccountStatement();
      });
    }
  });
}

// ==========================================
// 7. دالة طباعة كشف الحساب
// ==========================================
function printAccountStatement() {
  const clientName = document.querySelector('#clien-name')?.textContent || 'عميل';
  const clientId = getCurrentUserId();
  
  let printWindow = window.open('', '_blank');
  let rowsHtml = '';
  let totalSum = 0;

  currentFilteredInvoices.forEach(inv => {
    totalSum += parseFloat(inv.totalPrice || 0);
    rowsHtml += `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${inv.invoiceCode}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${inv.date}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${inv.itemsString || 'منتجات المتجر'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${parseFloat(inv.totalPrice || 0).toFixed(2)} ج.م</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${inv.status}</td>
      </tr>
    `;
  });

  printWindow.document.write(`
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>كشف حساب العميل - ${clientName}</title>
      <style>
        body { font-family: Tahoma, sans-serif; padding: 20px; color: #333; }
        h2 { text-align: center; color: #2563eb; }
        .info { margin-bottom: 20px; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: #f3f4f6; border: 1px solid #ddd; padding: 10px; text-align: center; }
        .total { margin-top: 20px; font-size: 18px; font-weight: bold; text-align: left; }
      </style>
    </head>
    <body>
      <h2>كشف حساب الطلبات والفواتير</h2>
      <div class="info">
        <p><strong>اسم العميل:</strong> ${clientName}</p>
        <p><strong>كود العميل:</strong> ${clientId}</p>
        <p><strong>تاريخ التقرير:</strong> ${new Date().toLocaleDateString('ar-EG')}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>رقم الطلب</th>
            <th>اسم العميل/ورقم الهاتف</th>
            <th>المنتجات</th>
            <th>الإجمالي</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
      <div class="total">
        إجمالي المشتريات: ${totalSum.toFixed(2)} ج.م
      </div>
      <script>
        window.onload = function() { window.print(); window.close(); }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ==========================================
// 8. حساب الإحصائيات
// ==========================================
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

// ==========================================
// 9. دالة زر "تم الاستلام"
// ==========================================
async function markAsReceived(invoiceCode) {
  const userId = String(getCurrentUserId());
  const storageKey = `invoicesHistory_${userId}`;
  
  let localHistory = JSON.parse(localStorage.getItem(storageKey)) || [];
  const invIndex = localHistory.findIndex(i => String(i.invoiceCode) === String(invoiceCode));
  
  if (invIndex > -1) {
    localHistory[invIndex].status = 'delivered';
  } else {
    localHistory.push({ invoiceCode: invoiceCode, status: 'delivered' });
  }
  localStorage.setItem(storageKey, JSON.stringify(localHistory));

  renderOrderTracking();
  renderInvoicesTable();

  try {
    const updateUrl = `${GOOGLE_SCRIPT_URL}?action=updateStatus&invoiceCode=${encodeURIComponent(invoiceCode)}&status=delivered`;
    fetch(updateUrl, { mode: 'no-cors' });
  } catch (err) {
    console.error("خطأ أثناء التحديث:", err);
  }

  const message = `تم استلام الاوردر علي رقم ${MY_WHATSAPP_NUMBER} (طلب رقم: ${invoiceCode})`;
  const whatsappUrl = `https://wa.me/${MY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

// ==========================================
// 10. دالة إلغاء الطلب والحذف اللحظي
// ==========================================
async function cancelOrder(invoiceCode) {
  if (!confirm('هل أنت متأكد من إلغاء هذا الطلب وحذفه نهائياً؟')) return;

  const userId = String(getCurrentUserId());
  const storageKey = `invoicesHistory_${userId}`;

  let localHistory = JSON.parse(localStorage.getItem(storageKey)) || [];
  localHistory = localHistory.filter(i => String(i.invoiceCode) !== String(invoiceCode));
  localStorage.setItem(storageKey, JSON.stringify(localHistory));

  const trackingContainer = document.querySelector('.clien-total-order');
  if (trackingContainer) {
    trackingContainer.style.display = 'none';
  }

  renderOrderTracking();
  renderInvoicesTable();

  try {
    const deleteUrl = `${GOOGLE_SCRIPT_URL}?action=delete&invoiceCode=${encodeURIComponent(invoiceCode)}&userId=${encodeURIComponent(userId)}`;
    const img = new Image();
    img.src = deleteUrl;
  } catch (err) {
    console.error("خطأ أثناء الحذف من الشيت:", err);
  }

  const message = `طلب إلغاء وحذف أوردر برقم: ${invoiceCode}`;
  const whatsappUrl = `https://wa.me/${MY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

// ==========================================
// 11. تقديم الشكوى وتحويل الرسالة إلى واتساب
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
// 12. التهيئة عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderAndProfile();
  setupImageUpload();
  
  renderOrderTracking();
  renderInvoicesTable();
  setupSearchAndFilters(); // تفعيل البحث، الفلتر، والطباعة فوراً
  
  fetchInvoicesFromSheet();
  
  setupContactForm();
});