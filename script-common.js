// 1. กำหนดค่าส่วนกลาง
if (typeof window.API_URL === 'undefined') {
    window.API_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec";
}

// 2. เรียกใช้งานเมื่อโหลดหน้าเว็บ
$(document).ready(function() {
    checkAuthentication();
    resetIdleTimer();
});

// ฟังก์ชันเช็คสถานะการเข้าสู่ระบบ (แบบง่าย)
function checkAuthentication() {
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
    }
}

// ฟังก์ชันออกจากระบบ
function handleLogout() {
    Swal.fire({
        title: 'ยืนยันการออกจากระบบ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'ใช่, ออกจากระบบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear(); 
            window.location.href = "login.html";
        }
    });
}

// ระบบ Idle Timeout (ดีดออกเมื่อไม่ใช้งานเกิน 60 นาที)
let idleTimer;
function resetIdleTimer() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        localStorage.clear();
        window.location.href = "login.html";
    }, 60 * 60 * 1000); 
}

// ดักจับเหตุการณ์การใช้งานเพื่อ Reset Timer
$(document).on('mousemove keypress click scroll touchstart', function() {
    resetIdleTimer();
});
