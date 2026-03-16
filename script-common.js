// 1. กำหนดค่าส่วนกลาง
if (typeof window.API_URL === 'undefined') {
    window.API_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec";
}

let idleTimer; // ประกาศตัวแปรไว้ด้านนอก

$(document).ready(function() {
    // 🚩 เช็คก่อนว่า "ตอนนี้" อยู่หน้าไหน
    const isLoginPage = window.location.pathname.includes("login.html") || window.location.pathname === "/";

    if (!isLoginPage) {
        // ถ้าไม่ใช่หน้า Login ให้เช็คสิทธิ์
        checkAuthentication();
        // เริ่มนับ Idle Timer เฉพาะเมื่อมั่นใจว่า Login แล้ว
        resetIdleTimer();
    }
});

// ฟังก์ชันเช็คสถานะการเข้าสู่ระบบ
function checkAuthentication() {
    const isLoggedIn = localStorage.getItem("isLoggedIn");
    if (isLoggedIn !== "true") {
        // ถ้าไม่ได้ Login ให้ดีดออกเงียบๆ ไม่ต้องใช้ Swal เพื่อเลี่ยง Loop
        window.location.href = "login.html";
    }
}

// ระบบ Idle Timeout (ปรับปรุงใหม่)
function resetIdleTimer() {
    // 1. เคลียร์ Timer เก่าทิ้งก่อนเสมอ
    if (idleTimer) clearTimeout(idleTimer);

    // 2. ถ้าไม่ได้ Login อยู่ ก็ไม่ต้องเริ่มนับ
    if (localStorage.getItem("isLoggedIn") !== "true") return;

    // 3. เริ่มนับถอยหลัง (ตั้งไว้ 60 นาที)
    idleTimer = setTimeout(() => {
        // เช็คอีกครั้งเพื่อความชัวร์ก่อนดีดออก
        if (localStorage.getItem("isLoggedIn") === "true") {
            handleAutoLogout();
        }
    }, 60 * 60 * 1000); 
}

// ฟังก์ชันจัดการตอนหมดเวลาอัตโนมัติ
function handleAutoLogout() {
    localStorage.clear(); // ล้างข้อมูลก่อน
    Swal.fire({
        icon: 'warning',
        title: 'เซสชั่นหมดอายุ',
        text: 'คุณไม่ได้ใช้งานนานเกินไป กรุณาเข้าสู่ระบบใหม่',
        allowOutsideClick: false,
        confirmButtonText: 'ตกลง'
    }).then(() => {
        window.location.href = "login.html";
    });
}

// ดักจับการขยับเมาส์เพื่อต่อเวลา
$(document).on('mousemove keypress click scroll touchstart', function() {
    resetIdleTimer();
});
