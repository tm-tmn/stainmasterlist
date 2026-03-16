// 1. กำหนดค่าส่วนกลาง
if (typeof window.API_URL === 'undefined') {
    window.API_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec";
}

// 2. เรียกใช้งานเมื่อโหลดหน้าเว็บ
$(document).ready(function() {
    checkAuthentication();
    resetIdleTimer();
});

function checkAuthentication() {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    
    // ถ้าไม่มีสถานะ Login ให้เตะออกไปหน้า login.html ทันทีโดยไม่ต้องรอกด Popup (เพื่อลดความรำคาญ)
    if (isLoggedIn !== "true") {
        // ล้างค่าที่อาจค้างแบบผิดๆ ทิ้งให้หมดก่อนไป
        localStorage.clear();
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

let idleTimer;
function resetIdleTimer() {
    clearTimeout(idleTimer);
    
    // เช็คก่อนว่าล็อกอินอยู่ไหม ถ้าไม่ล็อกอินไม่ต้องเริ่มนับถอยหลัง
    if (localStorage.getItem("isLoggedIn") !== "true") return;

    idleTimer = setTimeout(() => {
        // ก่อนจะเด้ง Popup ให้เคลียร์ค่าทิ้งทันที เพื่อป้องกัน Loop
        localStorage.clear();
        
        Swal.fire({
            icon: 'warning',
            title: 'เซสชั่นหมดอายุ',
            text: 'คุณไม่ได้ใช้งานนานเกินไป กรุณาเข้าสู่ระบบใหม่',
            allowOutsideClick: false, // ห้ามคลิกข้างนอก
            confirmButtonText: 'ตกลง'
        }).then(() => {
            window.location.href = "login.html";
        });
    }, 60 * 60 * 1000); // 1 ชั่วโมง
}

// ดักจับเหตุการณ์การใช้งานเพื่อ Reset Timer
$(document).on('mousemove keypress click scroll touchstart', function() {
    resetIdleTimer();
});
