// ==========================================
// إعدادات الروابط والبيانات
// ==========================================
const GOOGLE_SHEET_POST_URL =
  "https://script.google.com/macros/s/AKfycbzFaMA5IrXkuljsgR3U3tfO1ji9v9pw4_mGCveYqRMRupRpM3qU_7X8fano07DYfFC4vQ/exec";
const MY_WHATSAPP_NUMBER = "201501893345";

// ==========================================
// 1. تحديد ID العميل الحالي
// ==========================================
function getCurrentUserId() {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (currentUser && currentUser.id) {
    return currentUser.id;
  }

  const clientIdEl = document.getElementById("clien-id-num");
  if (clientIdEl && clientIdEl.textContent.trim()) {
    const rawId = clientIdEl.textContent.replace(/[^\d]/g, "").trim();
    if (rawId) return rawId;
  }

  return "guest";
}

// ==========================================
// 2. إدارة السلة وتجهيز دالة addToCart
// ==========================================
function getCart() {
  const userId = getCurrentUserId();
  const cart = localStorage.getItem(`shoppingCart_${userId}`);
  return cart ? JSON.parse(cart) : [];
}

function saveCart(cart) {
  const userId = getCurrentUserId();
  localStorage.setItem(`shoppingCart_${userId}`, JSON.stringify(cart));
}

// دالة إضافة منتج للسلة (تُستدعى من صفحات المتجر أو الفواتير)
function addToCart(product, productsList = []) {
  let targetProduct = null;

  if (typeof product === "object" && product !== null) {
    targetProduct = product;
  } else if (Array.isArray(productsList) && productsList.length > 0) {
    targetProduct = productsList.find((p) => String(p.id) === String(product));
  }

  if (!targetProduct) {
    alert("لم يتم العثور على بيانات المنتج!");
    return;
  }

  const cart = getCart();
  const existingItem = cart.find(
    (item) => String(item.id) === String(targetProduct.id),
  );

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({
      id: targetProduct.id,
      name: targetProduct.name,
      price: parseFloat(targetProduct.price) || 0,
      image: targetProduct.image || "img/market.jpg",
      quantity: 1,
    });
  }

  saveCart(cart);

  // إشعار نجاح الإضافة
  const toast = document.getElementById("name-add-cart1");
  if (toast) {
    toast.style.display = "block";
    setTimeout(() => {
      toast.style.display = "none";
    }, 2500);
  } else {
    alert(`تمت إضافة "${targetProduct.name}" إلى السلة بنجاح!`);
  }

  // تحديث العرض إذا كنا في صفحة السلة
  if (document.getElementById("cart-items-container")) {
    renderCartPage();
  }
}

// ==========================================
// 3. إدارة سجل الفواتير للعميل
// ==========================================
function getInvoicesHistory() {
  const userId = getCurrentUserId();
  const history = localStorage.getItem(`invoicesHistory_${userId}`);
  return history ? JSON.parse(history) : [];
}

function saveInvoiceToHistory(invoice) {
  const userId = getCurrentUserId();
  const history = getInvoicesHistory();
  history.unshift(invoice);
  localStorage.setItem(`invoicesHistory_${userId}`, JSON.stringify(history));
}

// إعادة شراء المنتجات من فاتورة قديمة
function reorderInvoice(invoiceCode) {
  const history = getInvoicesHistory();
  const targetInvoice = history.find(
    (inv) => String(inv.invoiceCode) === String(invoiceCode),
  );

  if (
    !targetInvoice ||
    !targetInvoice.items ||
    targetInvoice.items.length === 0
  ) {
    alert("تعذر العثور على عناصر الفاتورة!");
    return;
  }

  const cart = getCart();

  targetInvoice.items.forEach((oldItem) => {
    const existingIndex = cart.findIndex(
      (item) => String(item.id) === String(oldItem.id),
    );
    if (existingIndex > -1) {
      cart[existingIndex].quantity += parseInt(oldItem.quantity) || 1;
    } else {
      cart.push({
        id: oldItem.id,
        name: oldItem.name,
        price: parseFloat(oldItem.price) || 0,
        image: oldItem.image || "img/market.jpg",
        quantity: parseInt(oldItem.quantity) || 1,
      });
    }
  });

  saveCart(cart);
  alert("تمت إعادة إضافة منتجات الفاتورة إلى السلة بنجاح!");

  if (document.getElementById("cart-items-container")) {
    renderCartPage();
  } else {
    window.location.href = "cart.html";
  }
}

// ==========================================
// 4. حساب إجمالي السلة
// ==========================================
function calculateTotals(cart) {
  return cart.reduce(
    (sum, item) => sum + parseFloat(item.price) * parseInt(item.quantity),
    0,
  );
}

// ==========================================
// 5. عرض محتويات صفحة السلة
// ==========================================
function renderCartPage() {
  const cartContainer = document.getElementById("cart-items-container");
  const totalPriceEl = document.getElementById("total-price");

  if (!cartContainer) return;

  const cart = getCart();
  cartContainer.innerHTML = "";

  if (cart.length === 0) {
    cartContainer.innerHTML = `
      <div style="text-align: center; padding: 30px; color: #586574;">
        <h3>السلة فارغة حالياً</h3>
        <p style="margin-top: 10px;">قم بإضافة بعض المنتجات من المتجر لتظهر هنا.</p>
      </div>
    `;
    if (totalPriceEl) totalPriceEl.textContent = "0.00 ج.م";
    renderInvoicesHistory();
    return;
  }

  cart.forEach((item) => {
    const itemTotal =
      (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
    const row = document.createElement("div");
    row.className = "cart-item-row";
    row.innerHTML = `
      <div class="cart-item-info">
        <img src="${item.image && item.image.trim().length > 5 ? item.image : "img/market.jpg"}" alt="${item.name}">
        <div>
          <h4>${item.name}</h4>
          <span>${item.price} ج.م</span>
        </div>
      </div>
      <div class="cart-item-controls">
        <button type="button" class="btn-decrease" data-id="${item.id}">-</button>
        <span>${item.quantity}</span>
        <button type="button" class="btn-increase" data-id="${item.id}">+</button>
      </div>
      <div class="cart-item-total">
        <span>${itemTotal.toFixed(2)} ج.م</span>
        <button type="button" class="btn-remove-item" data-id="${item.id}" style="background: none; border: none; color: #e63946; cursor: pointer; font-size: 16px; margin-right: 10px;">✕</button>
      </div>
    `;
    cartContainer.appendChild(row);
  });

  const total = calculateTotals(cart);
  if (totalPriceEl) totalPriceEl.textContent = `${total.toFixed(2)} ج.م`;

  renderInvoicesHistory();
}

// ==========================================
// 6. إتمام الشراء وإرسال الطلب (WhatsApp + Sheet)
// ==========================================
function handleCheckout() {
  const cart = getCart();
  if (cart.length === 0) {
    alert("السلة فارغة!");
    return;
  }

  const phoneInput = document.getElementById("phone-input");
  const phoneVal = phoneInput ? phoneInput.value.trim() : "";

  if (!phoneVal) {
    alert("يرجى إدخال رقم الهاتف لاستكمال الطلب!");
    if (phoneInput) phoneInput.focus();
    return;
  }

  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  const clientNameEl = document.getElementById("clien-name");
  const clientName =
    currentUser && currentUser.name
      ? currentUser.name
      : clientNameEl
        ? clientNameEl.textContent
        : "عميل";
  const clientId = getCurrentUserId();

  const invoiceCode = "INV-" + Math.floor(100000 + Math.random() * 900000);
  const now = new Date();
  const dateStr =
    now.toLocaleDateString("ar-EG") +
    " " +
    now.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

  let itemsSummaryArray = [];
  let whatsappItemsText = "";

  cart.forEach((item, index) => {
    const itemTotal = item.price * item.quantity;
    itemsSummaryArray.push(`${item.name} (${item.quantity}x)`);
    whatsappItemsText += `${index + 1}. ${item.name} | الكمية: ${item.quantity} | السعر: ${itemTotal.toFixed(2)} ج.م\n`;
  });

  const totalAmount = calculateTotals(cart);

  const invoiceData = {
    invoiceCode: invoiceCode,
    clientId: clientId,
    clientName: clientName,
    phone: phoneVal,
    items: cart,
    itemsString: itemsSummaryArray.join(" - "),
    totalPrice: totalAmount.toFixed(2),
    date: dateStr,
  };

  // 1. حفظ الطلب في سجل الفواتير المحلي الخاص بالعميل
  saveInvoiceToHistory(invoiceData);

  // 2. إرسال البيانات لجوجل شيت بدون تعطيل العرض
  try {
    fetch(GOOGLE_SHEET_POST_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        invoiceCode: invoiceData.invoiceCode,
        clientId: invoiceData.clientId,
        clientName: `${invoiceData.clientName} (${phoneVal})`,
        items: invoiceData.itemsString,
        totalPrice: invoiceData.totalPrice,
        date: invoiceData.date,
      }),
    });
  } catch (err) {
    console.error("Google Sheet Error:", err);
  }

  // 3. تجهيز نص الواتساب
  const message =
    `طلب جديد من المتجر 🛒\n\n` +
    `رقم الفاتورة: ${invoiceCode}\n` +
    `رقم العميل (ID): ${clientId}\n` +
    `اسم العميل: ${clientName}\n` +
    `رقم الهاتف: ${phoneVal}\n` +
    `التاريخ: ${dateStr}\n\n` +
    `المنتجات:\n${whatsappItemsText}\n` +
    `الإجمالي النهائي: ${totalAmount.toFixed(2)} ج.م`;

  const whatsappUrl = `https://wa.me/${MY_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  // 4. تفريغ السلة وتحديث الواجهة والسجل
  saveCart([]);
  renderCartPage();

  // 5. فتح الواتساب
  window.open(whatsappUrl, "_blank");
}

// ==========================================
// 7. عرض سجل الفواتير مع زر إعادة الشراء
// ==========================================
function renderInvoicesHistory() {
  const historyContainer = document.getElementById("history-container");
  if (!historyContainer) return;

  const history = getInvoicesHistory();
  historyContainer.innerHTML = "";

  if (history.length === 0) {
    historyContainer.innerHTML =
      '<p style="color: #8c98a4; font-size: 13px;">لا توجد فواتير سابقة حتى الآن.</p>';
    return;
  }

  history.forEach((inv) => {
    const card = document.createElement("div");
    card.className = "invoice-card";
    card.style.cssText =
      "border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px; margin-bottom: 12px; background: #fff;";

    const itemsText = (inv.items || [])
      .map((i) => `${i.name} (${i.quantity}x)`)
      .join(" - ");

    card.innerHTML = `
      <div class="invoice-header" style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px;">
        <span>فاتورة #${inv.invoiceCode}</span>
        <span style="color: #666; font-size: 12px;">${inv.date}</span>
      </div>
      <div class="invoice-items" style="font-size: 13px; color: #333;">
        <p><strong>العميل:</strong> ${inv.clientName} | <strong>الهاتف:</strong> ${inv.phone}</p>
        <p style="margin-top: 4px;"><strong>المنتجات:</strong> ${itemsText}</p>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <p style="font-weight: bold; color: #28a745; margin: 0;">
            الإجمالي: ${inv.totalPrice} ج.م
          </p>
          <button type="button" class="btn-reorder" data-code="${inv.invoiceCode}" style="background-color: #2b82fb; color: #fff; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold;">
            🔄 إعادة شراء البند
          </button>
        </div>
      </div>
    `;
    historyContainer.appendChild(card);
  });
}

// ==========================================
// 8. الاستماع لكافة الأحداث والضغطات
// ==========================================
document.addEventListener("click", (e) => {
  const target = e.target;

  // زيادة أو نقصان المنتجات في السلة
  if (
    target.classList.contains("btn-increase") ||
    target.classList.contains("btn-decrease") ||
    target.classList.contains("btn-remove-item")
  ) {
    let cart = getCart();
    const id = target.getAttribute("data-id");

    if (target.classList.contains("btn-increase")) {
      const item = cart.find((i) => String(i.id) === String(id));
      if (item) item.quantity += 1;
    } else if (target.classList.contains("btn-decrease")) {
      const itemIndex = cart.findIndex((i) => String(i.id) === String(id));
      if (itemIndex > -1) {
        if (cart[itemIndex].quantity > 1) {
          cart[itemIndex].quantity -= 1;
        } else {
          cart.splice(itemIndex, 1);
        }
      }
    } else if (target.classList.contains("btn-remove-item")) {
      cart = cart.filter((i) => String(i.id) !== String(id));
    }

    saveCart(cart);
    renderCartPage();
  }

  // إعادة شراء الفاتورة
  const reorderBtn = target.closest(".btn-reorder");
  if (reorderBtn) {
    const invCode = reorderBtn.getAttribute("data-code");
    if (invCode) reorderInvoice(invCode);
  }

  // إتمام الطلب
  if (target.id === "checkout-btn") {
    handleCheckout();
  }
});

// التشغيل التلقائي عند التحميل
document.addEventListener("DOMContentLoaded", () => {
  const currentUser = JSON.parse(localStorage.getItem("currentUser"));
  if (currentUser) {
    const nameEl = document.getElementById("clien-name");
    const idEl = document.getElementById("clien-id-num");
    if (nameEl) nameEl.textContent = currentUser.name;
    if (idEl) idEl.textContent = currentUser.id;
  }

  if (document.getElementById("cart-items-container")) {
    renderCartPage();
  }
});
