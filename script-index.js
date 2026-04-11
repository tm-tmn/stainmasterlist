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
    // ✅ เปลี่ยนจากการใช้ callAPI มาเป็นการ Query ที่ตาราง userlogin ใน Supabase โดยตรง
    const { data, error } = await _supabase
      .from('userlogin') // ตรวจสอบชื่อตารางให้ตรงกับใน Supabase นะครับ
      .select('*')
      .eq('username', u)  // เช็ค username
      .eq('password', p)  // เช็ค password (แบบพื้นฐาน)
      .single();          // เอามาแค่แถวเดียว

    if (error || !data) {
      // ถ้ามี Error หรือไม่เจอข้อมูล (Username/Password ผิด)
      Swal.fire('Error', 'Username หรือ Password ไม่ถูกต้อง', 'error');
    } else {
      // ✅ ถ้าเจอข้อมูล (Login สำเร็จ)
      // สร้างข้อมูลจำลองให้ตรงกับที่ saveSession() ใน script-common.js ต้องการ
      const loginData = {
        token: btoa(`${u}|${new Date().getTime() + (60 * 60 * 1000)}`), // สร้าง token จำลอง (หมดอายุใน 1 ชม.)
        userName: data.display_name || data.username, // ใช้ชื่อจากตาราง (ถ้ามี column display_name)
        userAccount: data.username,
        department: data.dept || 'Medical Lab'
      };

      saveSession(loginData);
      Swal.close();
      window.location.href = '/stainmasterlist/datatable.html';
    }

  } catch (e) {
    console.error(e);
    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง', 'error');
  }
}
