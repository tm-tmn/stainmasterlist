// ============================================================
// script-login.js
// ============================================================

// ถ้า Login อยู่แล้วให้ข้ามไปหน้า main เลย (index.html = หน้า login)
document.addEventListener('DOMContentLoaded', function () {
  const { token, user } = getSession();
  if (token && user) {
    window.location.href = '/stainmasterlist/datatable.html';
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
    showConfirmButton: false,
    heightAuto: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    // ✅ แทน google.script.run.checkLogin()
    const res = await callAPI('checkLogin', { username: u, password: p });

    if (res.status === 'Success') {
      // ✅ เก็บลง localStorage ผ่าน saveSession() ใน script-common.js
      saveSession(res);

      Swal.close();

      // ✅ Redirect ไปหน้า main (frontend จัดการเอง ไม่ต้องรอ URL จาก server)
      window.location.href = '/stainmasterlist/datatable.html';

    } else {
      Swal.fire('Error', 'Username หรือ Password ไม่ถูกต้อง', 'error');
    }

  } catch (e) {
    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง', 'error');
  }
}
