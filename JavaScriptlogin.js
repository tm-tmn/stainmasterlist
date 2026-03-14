// JavaScriptlogin.js

const API_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec"; 

// ฟังก์ชันช่วยส่งข้อมูลแบบรองรับ Google Apps Script Redirect
async function callAPI(action, data = {}) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors", // ต้องเปิด cors ไว้
            headers: {
                "Content-Type": "text/plain;charset=utf-8", // ใช้ text/plain เพื่อเลี่ยง Preflight request
            },
            body: JSON.stringify({ action, data })
        });
        return await response.json();
    } catch (err) {
        console.error("API Call Error:", err);
        throw err;
    }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;

    Swal.fire({
        title: 'กำลังตรวจสอบ...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        // 🚩 เรียกใช้ฟังก์ชัน callAPI ที่เราสร้างไว้ข้างบน
        const res = await callAPI('login', { user: u, pass: p });

        if (res.status === "Success") {
            sessionStorage.setItem('stain_token', res.token);
            sessionStorage.setItem('stain_user', res.userName);
            sessionStorage.setItem('login_id', u); // เก็บไว้ใช้ตอนเปลี่ยนรหัสผ่าน

            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: 'ยินดีต้อนรับ ' + res.userName,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'datatable.html'; 
            });
        } else {
            Swal.fire('Error', 'Username หรือ Password ไม่ถูกต้อง', 'error');
        }
    } catch (error) {
        // หากยังเข้าตรงนี้ แสดงว่า URL ของ Script อาจจะผิด หรือสิทธิ์การเข้าถึงไม่ได้เป็น Anyone
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อ Server ได้\nกรุณาตรวจสอบการ Deploy ของระบบ', 'error');
    }
});
