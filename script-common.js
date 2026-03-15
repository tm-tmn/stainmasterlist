// 1. กำหนดค่าส่วนกลาง
if (typeof window.API_URL === 'undefined') {
    window.API_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec";
}

// 2. เรียกใช้งานเมื่อโหลดหน้าเว็บ
$(document).ready(function() {
    // ดึงข้อมูลผู้ใช้มาแสดงผลบน Sidebar ก่อนเช็คสิทธิ์
    const userName = localStorage.getItem("userName");
    const userDept = localStorage.getItem("userDept");
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (isLoggedIn === "true") {
        // อัปเดต UI ชื่อและแผนก (อิงตาม ID ใน HTML ของคุณ)
        if ($('#userNameDisplay').length) $('#userNameDisplay').text(userName);
        if ($('#userDeptDisplay').length) $('#userDeptDisplay').text(userDept);
    } else {
        // ถ้าไม่มีข้อมูลการล็อกอิน ให้แสดงแจ้งเตือนแล้วดีดออก
        Swal.fire({
            icon: 'error',
            title: 'กรุณาเข้าสู่ระบบ',
            text: 'คุณยังไม่ได้เข้าสู่ระบบ หรือ Session หมดอายุ',
            confirmButtonText: 'ตกลง'
        }).then(() => {
            window.location.href = "login.html";
        });
    }

    resetIdleTimer();
});

// ฟังก์ชันเช็คสถานะการเข้าสู่ระบบ
function checkAuthentication() {
    // ถ้าค่าใน localStorage ไม่ใช่ "true" ให้ดีดออกทันที
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
    }
}

// ฟังก์ชันจัดการ Sidebar
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
}

document.addEventListener('DOMContentLoaded', function() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar && localStorage.getItem('sidebarCollapsed') === 'true') {
        sidebar.classList.add('collapsed');
    }
});

// ฟังก์ชันออกจากระบบ (Logout)
function handleLogout() {
    Swal.fire({
        title: 'ยืนยันการออกจากระบบ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, ออกจากระบบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear(); 
            window.location.href = "login.html";
        }
    });
}

// ระบบ Idle Timeout (ดีดออกเมื่อไม่ใช้งาน)
let idleTimer;
const IDLE_LIMIT = 60 * 60 * 1000; // 60 นาที

function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        localStorage.clear();
        Swal.fire({
            icon: 'warning',
            title: 'ไม่มีการใช้งานนานเกินไป',
            text: 'ระบบได้ทำการ Logout เรียบร้อยแล้วเพื่อความปลอดภัย',
            allowOutsideClick: false,
            confirmButtonText: 'ตกลง',
            confirmButtonColor: '#0dcaf0'
        }).then(() => {
            window.location.href = "login.html";
        });
    }, IDLE_LIMIT);
}
