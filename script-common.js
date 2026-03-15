  // เรียกใช้งานเมื่อโหลดหน้าเว็บ
  $(document).ready(function() {
      startAutoLogoutTimer();
  });
  // 🖱️ ดักจับเหตุการณ์การใช้งาน (ขยับเมาส์, พิมพ์, คลิก, หรือสกロールหน้าจอ)
  $(document).on('mousemove keypress click scroll touchstart', function() {
      resetIdleTimer();
  });

  // ให้ระบบเริ่มนับทันทีที่หน้าเว็บโหลดเสร็จ
  $(document).ready(function() {
      resetIdleTimer();
  });

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    
    // เก็บค่าไว้ใน localStorage (true = ย่อ, false = กาง)
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
  }

  document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    const isCollapsed = localStorage.getItem('sidebarCollapsed');

    // ตรวจสอบค่าที่เก็บไว้ ถ้าเป็น 'true' ให้ย่อ Sidebar ทันที
    if (isCollapsed === 'true') {
      sidebar.classList.add('collapsed');
    }
  });


  function handleLogout() {
  Swal.fire({
    title: 'คุณต้องการออกจากระบบใช่หรือไม่?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ออกจากระบบ',
    cancelButtonText: 'ยกเลิก'
  }).then((result) => {
    if (result.isConfirmed) {
      // ดึง Token ปัจจุบันมาเตรียมทำลาย
      const currentToken = window.token || sessionStorage.getItem('stain_token');

      // 1. ส่งไปบอก Server ให้ทำลาย Token นี้ในระบบ
      google.script.run.destroyTokenOnServer(currentToken);

      // 2. ล้างข้อมูลในเครื่อง User
      sessionStorage.clear();
      window.token = null;

      // 3. ดีดกลับหน้า Login (ใช้ .replace เพื่อไม่ให้กด Back กลับมาได้ง่ายๆ)
      const baseUrl = window.scriptUrl || "<?= scriptUrl ?>";
      window.top.location.replace(baseUrl + "?page=login");
    }
  });
}

  // --- คงฟังก์ชัน redirectToLogin ไว้เหมือนเดิม ---
function redirectToLogin() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}


// ฟังก์ชันเช็คเวลาหมดอายุจาก Token โดยตรง (ฝั่ง Client)
function startAutoLogoutTimer() {
    if (!window.token) return;

    try {
        // 1. แกะ Token เพื่อเอา Timestamp ออกมา (Base64 Decode)
        const decoded = atob(window.token.split('.')[0] || window.token); // ปรับตาม Format ของคุณ
        const parts = decoded.split("|");
        const expiryTime = parseInt(parts[1]);

        // 2. ตั้ง Timer เช็คทุกๆ 5 วินาที
        const timer = setInterval(() => {
            const currentTime = new Date().getTime();
            
            if (currentTime >= expiryTime) {
                clearInterval(timer); // หยุดนับ
                
                Swal.fire({
                    icon: 'warning',
                    title: 'Session หมดอายุ',
                    text: 'คุณไม่ได้ใช้งานนานเกินไป กรุณาเข้าสู่ระบบใหม่',
                    allowOutsideClick: false,
                    confirmButtonText: 'ตกลง'
                }).then(() => {
                    redirectToLogin();
                });
            }
        }, 5000); // เช็คทุก 5 วินาที
    } catch (e) {
        console.log("Timer error:", e);
    }
}

let idleTimer;
const IDLE_LIMIT = 60 * 60 * 1000; // ตั้งค่า Idle ไว้ที่ 30 นาที

function resetIdleTimer() {
    clearTimeout(idleTimer);
    
    idleTimer = setTimeout(() => {
        // 🚩 สั่งยกเลิกสิทธิ์ที่ Server ทันที (ส่งตัวแปร token ที่มีอยู่ในหน้าจอไป)
        if (typeof token !== 'undefined') {
            google.script.run.logout(token);
        }

        Swal.fire({
            icon: 'warning',
            title: 'ไม่มีการใช้งานนานเกินไป',
            text: 'ระบบได้ทำการ Logout เรียบร้อยแล้ว',
            allowOutsideClick: false,
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#0dcaf0'
        }).then(() => {
            window.token = null; 
            window.top.location.href = window.scriptUrl; 
        });
    }, IDLE_LIMIT);
}
