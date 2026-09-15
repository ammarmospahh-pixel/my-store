// رابط Google Apps Script الخاص بك
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzllkAlRUE4tciAvkkLbK3RHXpZDWGgjHQyORN3D736Z4nmLJcjjaz_w-adumZsKyeT/exec";

// عناصر DOM
const loginForm = document.getElementById("loginForm");
const userIdInput = document.getElementById("userId");
const userPasswordInput = document.getElementById("userPassword");
const selectedRoleInput = document.getElementById("selectedRole");
const notificationBox = document.getElementById("notificationBox");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const submitBtn = document.querySelector(".submit-btn");

let fetchTimeout = null;

// ==========================================
// 1. التحكم في اختيار الرتبة (Client / Admin)
// ==========================================
function selectRole(role) {
  selectedRoleInput.value = role;
  
  const clientCard = document.getElementById("roleClient");
  const adminCard = document.getElementById("roleAdmin");

  if (role === 'admin') {
    adminCard.classList.add("active");
    clientCard.classList.remove("active");
  } else {
    clientCard.classList.add("active");
    adminCard.classList.remove("active");
  }
}

// ==========================================
// 2. إظهار / إخفاء كلمة السر
// ==========================================
function togglePassVisibility(inputId, iconElement) {
  const input = document.getElementById(inputId);
  if (input.type === "password") {
    input.type = "text";
    iconElement.classList.replace("fa-eye", "fa-eye-slash");
  } else {
    input.type = "password";
    iconElement.classList.replace("fa-eye-slash", "fa-eye");
  }
}

// ==========================================
// 3. تغيير الثيم (فاتح / داكن)
// ==========================================
themeToggleBtn.addEventListener("click", () => {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const themeIcon = themeToggleBtn.querySelector("i");

  if (currentTheme === "light") {
    document.documentElement.removeAttribute("data-theme");
    themeIcon.classList.replace("fa-sun", "fa-moon");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.setAttribute("data-theme", "light");
    themeIcon.classList.replace("fa-moon", "fa-sun");
    localStorage.setItem("theme", "light");
  }
});

// استعادة الثيم المحفوظ عند فتح الصفحة
window.addEventListener("DOMContentLoaded", () => {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    themeToggleBtn.querySelector("i").classList.replace("fa-moon", "fa-sun");
  }
});

// ==========================================
// 4. جلب الاسم والـ Role عند كتابة الـ ID
// ==========================================
userIdInput.addEventListener("input", function() {
  const id = this.value.trim();
  clearTimeout(fetchTimeout);

  if (id === "") {
    hideNotification();
    return;
  }

  showNotification("جاري جلب بيانات المستخدم...", "success");

  // انتظار 600 ملي ثانية بعد توقف المستخدم عن الكتابة لمنع كثافة الطلبات
  fetchTimeout = setTimeout(async () => {
    try {
      const response = await fetch(`${SCRIPT_URL}?id=${encodeURIComponent(id)}`);
      const result = await response.json();

      if (result.status === "success") {
        // إظهار اسم المستخدم وتحديد رتبته تلقائياً في الواجهة
        showNotification(`أهلاً بك: ${result.name}`, "success");
        if (result.role) {
          selectRole(result.role);
        }
      } else {
        showNotification("الرقم التعريفي (ID) غير مسجل بالنظام!", "error");
      }
    } catch (error) {
      console.error(error);
      showNotification("تعذر الاتصال بقاعدة البيانات لطلب الاسم.", "error");
    }
  }, 600);
});

// ==========================================
// 5. التحقق وتسجيل الدخول والتوجيه
// ==========================================
loginForm.addEventListener("submit", async function(e) {
  e.preventDefault();

  const id = userIdInput.value.trim();
  const password = userPasswordInput.value.trim();
  const selectedRole = selectedRoleInput.value;

  if (!id || !password) {
    showNotification("يرجى ملء جميع الحقول المطلوبة!", "error");
    return;
  }

  // تعطيل الزر أثناء التحقق
  submitBtn.disabled = true;
  const originalBtnText = submitBtn.innerHTML;
  submitBtn.innerHTML = `<span>جاري التحقق...</span> <i class="fa-solid fa-spinner fa-spin"></i>`;
  showNotification("جاري مطابقة كلمة السر...", "success");

  try {
    const response = await fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ 
        id: id, 
        password: password,
        role: selectedRole
      })
    });

    const result = await response.json();

    if (result.status === "success") {
      // التأكد من أن الرتبة المختارة تطابق رتبة الحساب في الشيت
      if (result.role !== selectedRole) {
        showNotification(`عذراً، هذا الحساب محدد كـ (${result.role === 'admin' ? 'مدير' : 'عميل'})، يرجى تغيير نوع المستخدم.`, "error");
        selectRole(result.role);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        return;
      }

      showNotification("تم تسجيل الدخول بنجاح! جاري التوجيه...", "success");

      // حفظ بيانات الجلسة محلياً لاستخدامها داخل الصفحات
      localStorage.setItem("userRole", result.role);
      localStorage.setItem("userId", id);

      // التوجيه الصحيح بالخروج من مجلد "تسجيل دخول" والدخول لمجلد الصفحة المطلوبة
      setTimeout(() => {
        if (result.role === "admin") {
          window.location.href = "../admin/index.html";
        } else {
          window.location.href = "../client/index.html";
        }
      }, 1200);

    } else {
      showNotification(result.message || "كلمة السر غير صحيحة!", "error");
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  } catch (error) {
    console.error(error);
    showNotification("حدث خطأ أثناء الاتصال بالخادم، حاول مرة أخرى.", "error");
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnText;
  }
});

// ==========================================
// 6. دالّة إظهار وإخفاء الإشعارات
// ==========================================
function showNotification(msg, type) {
  notificationBox.style.display = "block";
  notificationBox.innerText = msg;
  notificationBox.className = `notification-box ${type}`;
}

function hideNotification() {
  notificationBox.style.display = "none";
  notificationBox.innerText = "";
}