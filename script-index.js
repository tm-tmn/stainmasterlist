// ============================================================
// script-index.js
// ============================================================

// ถ้า Login อยู่แล้วให้ข้ามไปหน้า main เลย
document.addEventListener('DOMContentLoaded', function () {
  const { token, user } = getSession();
  if (token && user) {
  window.location.href = 'datatable.html';
  }
 });

async function handleLogin() {
  const u = document.getElementById('user').value.trim();
  const p = document.getElementById('pass').value.trim();

  if (!u || !p) {
    Swal.fire('Warning', 'กรุณากรอกข้อมูลให้ครบ', 'warning');
    return;
  }

  Swal.fire({
    title: 'กำลังตรวจสอบ...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    const res = await callAPI('checkLogin', { username: u, password: p });

    if (res.status === 'Success') {
      saveSession(res);

      Swal.close();

      window.location.href = '/datatable.html';
    } else {
      Swal.fire('Error', 'Username หรือ Password ไม่ถูกต้อง', 'error');
    }

  } catch (e) {
    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง', 'error');
  }
}
