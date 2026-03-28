// ============================================================
// script-common.js
// ============================================================

// --- Config ---
// ✅ ใส่ URL ของ Apps Script ที่ Deploy แล้วตรงนี้
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz7jbHHtVZyAc0cJhfPPaF8RtLuMPI8PR6z5xjjO3DUQh-hgQ4hm5TPUJ2yKbGEErDt/exec";

// --- Helper: POST ---
async function callAPI(action, body = {}) {
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: JSON.stringify({ action, ...body })
  });
  return res.json();
}

// --- Helper: GET ---
async function callAPIGet(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${APPS_SCRIPT_URL}?${qs}`);
  return res.json();
}

// --- Session Helpers ---
function getSession() {
  return {
    token:       localStorage.getItem('stain_token')   || '',
    user:        localStorage.getItem('stain_user')    || '',
    userAccount: localStorage.getItem('stain_account') || '',
    dept:        localStorage.getItem('stain_dept')    || ''
  };
}

function saveSession(data) {
  localStorage.setItem('stain_token',   data.token);
  localStorage.setItem('stain_user',    data.userName);
  localStorage.setItem('stain_account', data.userAccount);
  localStorage.setItem('stain_dept',    data.department);
}

function clearSession() {
  ['stain_token', 'stain_user', 'stain_account', 'stain_dept']
    .forEach(k => localStorage.removeItem(k));
}

// --- Redirects ---
function redirectToLogin() {
  setTimeout(() => {
    // ✅ login.html → index.html (GitHub Pages เริ่มต้นที่ index.html)
    window.location.href = "/stainmasterlist/index.html";
    // ถ้า repo อยู่ใน subfolder เช่น /stain-system/ ให้เปลี่ยนเป็น:
    // window.location.href = "/REPO_NAME/index.html";
  }, 100);
}

function redirectToMain() {
  window.location.href = "/stainmasterlist/datatable.html";
  // window.location.href = "/REPO_NAME/datatable.html";
}

// --- Logout ---
function handleLogout() {
  Swal.fire({
    title: 'คุณต้องการออกจากระบบใช่หรือไม่?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ออกจากระบบ',
    cancelButtonText: 'ยกเลิก'
  }).then(async (result) => {
    if (result.isConfirmed) {
      const { token, user } = getSession();
      try {
        await callAPI('logout', { token, user });
      } catch (e) {}
      clearSession();
      redirectToLogin();
    }
  });
}

// --- Auto Logout (Token Expiry) ---
function startAutoLogoutTimer() {
  const { token } = getSession();
  if (!token) return;

  try {
    const decoded = atob(token.replace(/-/g, '+').replace(/_/g, '/'));
    const parts = decoded.split("|");
    if (parts.length < 2) return;

    const expiryTime = parseInt(parts[1]);
    if (isNaN(expiryTime)) return;

    const checkTimer = setInterval(() => {
      if (new Date().getTime() >= expiryTime) {
        clearInterval(checkTimer);

        Swal.fire({
          icon: 'warning',
          title: 'Session หมดอายุ',
          text: 'กรุณาเข้าสู่ระบบใหม่',
          allowOutsideClick: false,
          confirmButtonText: 'ตกลง'
        }).then(() => {
          clearSession();
          redirectToLogin();
        });
      }
    }, 5000);
  } catch (e) {}
}

// --- Idle Timer ---
const IDLE_LIMIT = 60 * 60 * 1000; // 1 ชั่วโมง
let idleTimer;

function resetIdleTimer() {
  clearTimeout(idleTimer);

  idleTimer = setTimeout(async () => {
    const { token, user } = getSession();
    try {
      await callAPI('logout', { token, user });
    } catch (e) {}

    Swal.fire({
      icon: 'warning',
      title: 'ไม่มีการใช้งานนานเกินไป',
      text: 'ระบบได้ทำการ Logout เรียบร้อยแล้ว',
      allowOutsideClick: false,
      confirmButtonText: 'ตกลง',
      confirmButtonColor: '#0dcaf0'
    }).then(() => {
      clearSession();
      redirectToLogin();
    });
  }, IDLE_LIMIT);
}

// --- Sidebar ---
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('collapsed');
  localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
}

// --- Init (รันทุกหน้าที่ include ไฟล์นี้) ---
document.addEventListener('DOMContentLoaded', function () {
  // Sidebar state
  const sidebar = document.getElementById('sidebar');
  if (sidebar && localStorage.getItem('sidebarCollapsed') === 'true') {
    sidebar.classList.add('collapsed');
  }

  // เริ่ม timer (เฉพาะหน้าที่ไม่ใช่ index/login)
  const isLoginPage = window.location.pathname.endsWith('index.html')
    || window.location.pathname === '/'
    || window.location.pathname === '';

  if (!isLoginPage) {
    startAutoLogoutTimer();
    resetIdleTimer();
  }
});

// ดักจับ activity
document.addEventListener('mousemove',  resetIdleTimer);
document.addEventListener('keypress',   resetIdleTimer);
document.addEventListener('click',      resetIdleTimer);
document.addEventListener('scroll',     resetIdleTimer);
document.addEventListener('touchstart', resetIdleTimer);
