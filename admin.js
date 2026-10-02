// ==========================================
// الإعدادات والمتغيرات الرئيسية
// ==========================================
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwyWSdlXcpRC3-UhWks_6a1r4ts-JwsSMrPb2cQ-Y3MNKdk4PFasw5r11qB6hh3W4QwVQ/exec';
let allGlobalInvoices = [];
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
// 1. جلب البيانات وتخزينها
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
// 2. دالة فلترة وعرض الطلبات (مصححة لتعمل مع "قيد الانتظار" تماماً)
// ==========================================
function filterAndRenderInvoices() {
  const container = document.querySelector('.clien-total-order2');
  if (!container) return;

  // جلب قيمة فلتر الحالة بدقة من عناصر الـ select
  const selects = document.querySelectorAll('select');
  let statusFilter = 'all';
  for (let sel of selects) {
    const val = sel.value.trim();
    // التحقق من قيم الفلتر المختلفة (سواء نصية أو برمجية)
    if (val === 'مكتمل' || val === 'delivered' || val === 'قيد الانتظار/التجهيز' || val === 'قيد الانتظار' || val === 'processing') {
      statusFilter = val;
      break;
    }
    if (sel.options.length > 1 && (val === 'الكل' || val === 'all' || val === '')) {
      statusFilter = 'all';
      break;
    }
  }

  // جلب قيمة نص البحث
  const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
  let searchQuery = '';
  for (let inp of inputs) {
    if (!inp.closest('.clien-total-container')) {
      searchQuery = inp.value.trim().toLowerCase();
      break;
    }
  }

  // تطبيق شروط البحث والفلترة
  const filtered = allGlobalInvoices.filter(inv => {
    const status = String(inv.status || 'processing').trim();
    
    // فلتر الحالة
    if (statusFilter !== 'all' && statusFilter !== 'الكل' && statusFilter !== '') {
      if (statusFilter === 'مكتمل' || statusFilter === 'delivered') {
        if (status !== 'delivered' && status !== 'تم الاستلام' && status !== 'مكتمل') return false;
      } else if (statusFilter === 'قيد الانتظار' || statusFilter === 'قيد الانتظار/التجهيز' || statusFilter === 'processing') {
        if (status === 'delivered' || status === 'تم الاستلام' || status === 'مكتمل') return false;
      }
    }

    // فلتر البحث
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

  // رسم الجدول
  let htmlContent = `<h3></h3>`;
  
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
        actionHtml = `<button type="button" onclick="markAsReceived('${invoiceCode}')" style="background-color: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-weight: bold;">تم الاستلام</button>`;
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
          <div style="flex: 1.2; text-align: left; display: flex; gap: 8px; align-items: center; justify-content: flex-end;">
            ${actionHtml}
            <button type="button" onclick="cancelOrder('${invoiceCode}')" style="background-color: #fee2e2; color: #dc2626; border: 1px solid #fecaca; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13px;">حذف</button>
          </div>
        </div>
      `;
    });
  }

  container.innerHTML = htmlContent;
}

// ==========================================
// 3. تحديث الإحصائيات العامة (إجمالي المبيعات والطلبات والنقاط)
// ==========================================
// ==========================================
// تحديث الإحصائيات العامة (إجمالي المبيعات، الطلبات، ونظام النقاط: نقطة لكل 100 ج.م)
// ==========================================
function calculateGlobalStats(invoices) {
  let totalPurchases = 0;
  let totalOrdersCount = invoices.length;

  invoices.forEach(inv => {
    const status = String(inv.status || '').trim();
    // حساب المبيعات للطلبات غير الملغاة فقط
    if (status !== 'failed' && status !== 'ملغى' && status !== 'تم الإلغاء') {
      totalPurchases += parseFloat(inv.totalPrice || 0);
    }
  });

  // حساب النقاط: نقطة واحدة لكل 100 جنيه
  let totalPoints = Math.floor(totalPurchases / 100);

  const container = document.querySelector('.clien-total-container');
  if (container) {
    const cards = container.querySelectorAll('span span');
    if (cards.length >= 3) {
      cards[0].textContent = totalPurchases.toFixed(2) + ' ج.م'; // إجمالي المبيعات
      cards[1].textContent = totalOrdersCount;                   // إجمالي الطلبات
      cards[2].textContent = totalPoints + ' نقطة';               // إجمالي النقاط (نقطة لكل 100 ج.م)
    }
  }
}

// ==========================================
// 4. ربط أحداث البحث والفلترة
// ==========================================
function setupSearchAndFilters() {
  document.querySelectorAll('input, select').forEach(element => {
    element.addEventListener('input', () => filterAndRenderInvoices());
    element.addEventListener('change', () => filterAndRenderInvoices());
  });
}

// ==========================================
// 5. تحديث حالة الطلب إلى مكتمل
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
// 6. حذف الطلب نهائياً
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
// 7. التهيئة عند التحميل
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  allGlobalInvoices = JSON.parse(localStorage.getItem('all_customers_invoices')) || [];
  if (allGlobalInvoices.length > 0) {
    filterAndRenderInvoices();
    calculateGlobalStats(allGlobalInvoices);
  }
  
  setupSearchAndFilters();
  fetchInvoicesFromSheet();
});8
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
// دالة طباعة كشف الحساب أو الطلبات الحالية
// ==========================================
function printAccountStatement() {
  // يمكننا طباعة الحاوية المخصصة للطلبات أو الصفحة ككل
  const printContent = document.querySelector('.clien-total-order2')?.innerHTML;
  
  if (!printContent) {
    window.print(); // طباعة الصفحة بشكل إفتراضي إذا لم يتم العثور على الحاوية
    return;
  }

  const originalContent = document.body.innerHTML;
  
  // إنشاء نافذة أو محتوى مخصص للطباعة
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html dir="rtl" lang="ar">
      <head>
        <title>كشف حساب العملاء والطلبات</title>
        <style>
          body { font-family: Tahoma, sans-serif; padding: 20px; color: #333; }
          h3 { text-align: center; margin-bottom: 20px; }
          .clien-total-order2-container-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            margin-bottom: 8px;
            border-bottom: 1px solid #ddd;
            font-size: 14px;
          }
          button { display: none; } /* إخفاء الأزرار مثل الحذف والاستلام عند الطباعة */
        </style>
      </head>
      <body>
        <h3>سجل فواتير وطلبات العملاء</h3>
        ${printContent}
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

// ربط زر طباعة كشف الحساب تلقائياً عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
  const printBtn = document.querySelector('button, .btn'); // حدد الزر الخاص بالطباعة بناءً على الكلاس أو النص
  // أو البحث عن الزر الذي يحتوي على كلمة "طباعة"
  const allButtons = document.querySelectorAll('button, a');
  allButtons.forEach(btn => {
    if (btn.textContent.includes('طباعة') || btn.textContent.includes('كشف الحساب')) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        printAccountStatement();
      });
    }
  });
});
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