// ==========================================
// الإعدادات والمتغيرات الرئيسية
// ==========================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwyWSdlXcpRC3-UhWks_6a1r4ts-JwsSMrPb2cQ-Y3MNKdk4PFasw5r11qB6hh3W4QwVQ/exec';
const MY_WHATSAPP_NUMBER = '201501893345'; // ⬅️ غير هذا الرقم إلى رقم الواتساب الخاص بك بالرمز الدولي (مثال: 201234567890)

let allGlobalInvoices = [];

// ==========================================
// 1. تحديث الهيدر والبيانات بجميع الكروت
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
          const currentUser = JSON.parse(localStorage.getItem('currentUser')) || {};
          const userId = currentUser.id || 'guest';
          localStorage.setItem(`user_profile_img_${userId}`, newImgSrc);
        };
        reader.readAsDataURL(file);
      }
    });
  }
}

// ==========================================
// 2. جلب البيانات وتخزينها
// ==========================================
async function fetchInvoicesFromSheet() {
  const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
  
  window[callbackName] = function(sheetInvoices) {
    delete window[callbackName];
    document.getElementById('jsonp-script-tag')?.remove();

    if (Array.isArray(sheetInvoices)) {
      allGlobalInvoices = sheetInvoices;
      localStorage.setItem('all_customers_invoices', JSON.stringify(sheetInvoices));
      
      filterAndRenderInvoices();
      calculateGlobalStats(sheetInvoices);
    }
  };

  const script = document.createElement('script');
  script.id = 'jsonp-script-tag';
  script.src = `${GOOGLE_SCRIPT_URL}?callback=${callbackName}&_t=${Date.now()}`;
  script.onerror = function() {
    delete window[callbackName];
    script.remove();
    
    allGlobalInvoices = JSON.parse(localStorage.getItem('all_customers_invoices')) || [];
    filterAndRenderInvoices();
    calculateGlobalStats(allGlobalInvoices);
  };
  
  document.body.appendChild(script);
}

// ==========================================
// 3. دالة فلترة وعرض الطلبات
// ==========================================
function filterAndRenderInvoices() {
  const container = document.querySelector('.clien-total-order2');
  if (!container) return;

  const selects = document.querySelectorAll('select');
  let statusFilter = 'all';
  for (let sel of selects) {
    const val = sel.value.trim();
    if (val === 'مكتمل' || val === 'delivered' || val === 'قيد الانتظار/التجهيز' || val === 'قيد الانتظار' || val === 'processing') {
      statusFilter = val;
      break;
    }
    if (sel.options.length > 1 && (val === 'الكل' || val === 'all' || val === '')) {
      statusFilter = 'all';
      break;
    }
  }

  const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
  let searchQuery = '';
  for (let inp of inputs) {
    if (!inp.closest('.clien-total-container') && inp.id !== 'name') {
      searchQuery = inp.value.trim().toLowerCase();
      break;
    }
  }

  const filtered = allGlobalInvoices.filter(inv => {
    const status = String(inv.status || 'processing').trim();
    
    if (statusFilter !== 'all' && statusFilter !== 'الكل' && statusFilter !== '') {
      if (statusFilter === 'مكتمل' || statusFilter === 'delivered') {
        if (status !== 'delivered' && status !== 'تم الاستلام' && status !== 'مكتمل') return false;
      } else if (statusFilter === 'قيد الانتظار' || statusFilter === 'قيد الانتظار/التجهيز' || statusFilter === 'processing') {
        if (status === 'delivered' || status === 'تم الاستلام' || status === 'مكتمل') return false;
      }
    }

    if (searchQuery !== '') {
      const clientName = String(inv.clientName || '').toLowerCase();
      const clientId = String(inv.clientId || '').toLowerCase();
      const invoiceCode = String(inv.invoiceCode || '').toLowerCase();
      const items = String(inv.itemsString || '').toLowerCase();

      if (!clientName.includes(searchQuery) && !clientId.includes(searchQuery) && !invoiceCode.includes(searchQuery) && !items.includes(searchQuery)) {
        return false;
      }
    }

    return true;
  });

  let htmlContent = `<h3>سجل الفواتير والطلبات</h3>`;
  
  if (filtered.length === 0) {
    htmlContent += `<div style="padding: 20px; text-align: center; color: #64748b;">لا توجد أي طلبات مطابقة للبحث أو الفلتر.</div>`;
  } else {
    filtered.forEach(inv => {
      const clientName = inv.clientName || 'عميل غير معروف';
      const clientId = inv.clientId || '---';
      const invoiceCode = inv.invoiceCode || '---';
      const items = inv.itemsString || 'منتجات المتجر';
      const totalPrice = parseFloat(inv.totalPrice || 0).toFixed(2);
      const status = String(inv.status || 'processing').trim();

      let statusText = 'مكتمل';
      let actionHtml = `<span style="color: #16a34a; font-weight: bold;">تم تسليمه</span>`;

      if (status !== 'delivered' && status !== 'تم الاستلام' && status !== 'مكتمل') {
        statusText = 'قيد الانتظار/التجهيز';
        actionHtml = `<button type="button" class="btn-receive" onclick="markAsReceived('${invoiceCode}')">تم الاستلام</button>`;
      }

      htmlContent += `
        <div class="clien-total-order2-container-item" style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; gap: 15px; text-align: right; direction: rtl;">
          <div style="flex: 1; font-weight: bold; color: #0f172a;">${invoiceCode}</div>
          <div style="flex: 1.5;">
            <strong>${clientName}</strong><br>
            <small style="color: #64748b;">(${clientId})</small>
          </div>
          <div style="flex: 2; color: #334155; font-size: 14px;">${items}</div>
          <div style="flex: 1; font-weight: bold; color: #0f172a;">${totalPrice} ج.م</div>
          <div style="flex: 1; color: #0f172a;">${statusText}</div>
          <div style="flex: 1.5; text-align: left; display: flex; gap: 6px; align-items: center; justify-content: flex-end;">
            ${actionHtml}
            <button type="button" class="btn-print" onclick="printSingleInvoice('${invoiceCode}')">🖨️ طباعة</button>
            <button type="button" class="btn-delete" onclick="cancelOrder('${invoiceCode}')" style="background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">حذف</button>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = htmlContent;
}

// ==========================================
// 4. تحديث الإحصائيات العامة
// ==========================================
function calculateGlobalStats(invoices) {
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
// 5. ربط أحداث البحث والفلترة
// ==========================================
function setupSearchAndFilters() {
  document.querySelectorAll('input, select').forEach(element => {
    if (element.id !== 'name' && element.id !== 'namber' && element.id !== 'message') {
      element.addEventListener('input', () => filterAndRenderInvoices());
      element.addEventListener('change', () => filterAndRenderInvoices());
    }
  });
}

// ==========================================
// 6. تحديث حالة الطلب إلى مكتمل
// ==========================================
async function markAsReceived(invoiceCode) {
  allGlobalInvoices = JSON.parse(localStorage.getItem('all_customers_invoices')) || [];
  const invIndex = allGlobalInvoices.findIndex(i => String(i.invoiceCode) === String(invoiceCode));
  
  if (invIndex > -1) {
    allGlobalInvoices[invIndex].status = 'delivered';
    localStorage.setItem('all_customers_invoices', JSON.stringify(allGlobalInvoices));
    filterAndRenderInvoices();
    calculateGlobalStats(allGlobalInvoices);
  }

  try {
    const updateUrl = `${GOOGLE_SCRIPT_URL}?action=updateStatus&invoiceCode=${encodeURIComponent(invoiceCode)}&status=delivered`;
    fetch(updateUrl, { mode: 'no-cors' });
  } catch (err) {
    console.error("خطأ أثناء التحديث:", err);
  }
}

// ==========================================
// 7. حذف الطلب نهائياً
// ==========================================
async function cancelOrder(invoiceCode) {
  if (!confirm('هل أنت متأكد من حذف هذا الطلب نهائياً؟')) return;

  allGlobalInvoices = JSON.parse(localStorage.getItem('all_customers_invoices')) || [];
  allGlobalInvoices = allGlobalInvoices.filter(i => String(i.invoiceCode) !== String(invoiceCode));
  localStorage.setItem('all_customers_invoices', JSON.stringify(allGlobalInvoices));

  filterAndRenderInvoices();
  calculateGlobalStats(allGlobalInvoices);

  try {
    const deleteUrl = `${GOOGLE_SCRIPT_URL}?action=delete&invoiceCode=${encodeURIComponent(invoiceCode)}`;
    const img = new Image();
    img.src = deleteUrl;
  } catch (err) {
    console.error("خطأ أثناء الحذف:", err);
  }
}

// ==========================================
// 8. طباعة فاتورة واحدة مفردة
// ==========================================
function printSingleInvoice(invoiceCode) {
  const invoice = allGlobalInvoices.find(inv => String(inv.invoiceCode) === String(invoiceCode));

  if (!invoice) {
    alert('تعذر العثور على بيانات الفاتورة!');
    return;
  }

  const clientName = invoice.clientName || 'عميل غير معروف';
  const clientId = invoice.clientId || '---';
  const items = invoice.itemsString || 'منتجات المتجر';
  const totalPrice = parseFloat(invoice.totalPrice || 0).toFixed(2);
  const date = invoice.date || new Date().toLocaleDateString('ar-EG');
  const status = (invoice.status === 'delivered' || invoice.status === 'تم الاستلام' || invoice.status === 'مكتمل') ? 'مكتمل' : 'قيد الانتظار';

  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>فاتورة رقم ${invoiceCode}</title>
      <style>
        body { font-family: Tahoma, sans-serif; padding: 25px; direction: rtl; color: #1e293b; }
        .box { border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; max-width: 500px; margin: auto; }
        .h { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .row { display: flex; justify-content: space-between; margin: 10px 0; }
        .items { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 5px; margin-top: 10px; }
        .tot { font-weight: bold; color: #16a34a; font-size: 16px; margin-top: 15px; text-align: left; }
      </style>
    </head>
    <body>
      <div class="box">
        <div class="h"><h2>فاتورة شراء</h2><p>رقم: <strong>${invoiceCode}</strong></p></div>
        <div class="row"><span><strong>العميل:</strong> ${clientName}</span><span><strong>ID:</strong> ${clientId}</span></div>
        <div class="row"><span><strong>التاريخ:</strong> ${date}</span><span><strong>الحالة:</strong> ${status}</span></div>
        <div class="items"><strong>المنتجات:</strong><br>${items}</div>
        <div class="tot">الإجمالي: ${totalPrice} ج.م</div>
      </div>
      <script>window.onload = function() { window.print(); window.close(); };</script>
    </body>
    </html>
  `);
  printWindow.document.close();
}

// ==========================================
// 9. دالة طباعة كشف الحساب بالكامل
// ==========================================
function printAccountStatement() {
  window.print();
}

// ==========================================
// 10. تقديم الشكوى وتحويل الرسالة إلى واتساب
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
// 11. التهيئة الرئيسية عند تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  updateHeaderAndProfile();
  setupImageUpload();
  
  allGlobalInvoices = JSON.parse(localStorage.getItem('all_customers_invoices')) || [];
  if (allGlobalInvoices.length > 0) {
    filterAndRenderInvoices();
    calculateGlobalStats(allGlobalInvoices);
  }
  
  setupSearchAndFilters();
  fetchInvoicesFromSheet();
  setupContactForm();
});
// ==========================================
// دالة طباعة كشف الحساب وسجل الفواتير بالكامل
// ==========================================
function printStatement() {
  const container = document.querySelector('.clien-total-order2');
  
  if (!container || !container.innerHTML.trim()) {
    alert('لا يوجد محتوى في سجل الفواتير لطباعته!');
    return;
  }

  // فتح نافذة جديدة للطباعة
  const printWindow = window.open('', '_blank');
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>طباعة سجل الفواتير والطلبات</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          padding: 20px;
          direction: rtl;
          color: #1e293b;
          background: #ffffff;
        }
        h2 {
          text-align: center;
          color: #0f172a;
          margin-bottom: 20px;
          border-bottom: 2px solid #2563eb;
          padding-bottom: 10px;
        }
        .clien-total-order2-container-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          margin-bottom: 8px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 13px;
          page-break-inside: avoid;
        }
        /* إخفاء أزرار التحكم والعمليات أثناء الطباعة الورقية */
        button, .btn-print, .btn-receive, .btn-delete {
          display: none !important;
        }
      </style>
    </head>
    <body>
      <h2>سجل الفواتير والطلبات</h2>
      ${container.innerHTML}
      <script>
        window.onload = function() {
          window.print();
          window.close();
        };
      </script>
    </body>
    </html>
  `);

  printWindow.document.close();
}