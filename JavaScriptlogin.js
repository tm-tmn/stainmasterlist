// JavaScriptlogin.js

// 🚩 นำ URL ที่ได้จากการ Deploy ใน Google Apps Script มาวางที่นี่
const API_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec"; 

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
        // ส่งข้อมูลไปที่ Google Apps Script
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'login',
                data: { user: u, pass: p }
            })
        });

        const res = await response.json();

        if (res.status === "Success") {
            // บันทึกข้อมูลลง Session เหมือนเดิม
            sessionStorage.setItem('stain_token', res.token);
            sessionStorage.setItem('stain_user', res.userName);
            
            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                text: 'ยินดีต้อนรับ ' + res.userName,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                // เปลี่ยนหน้าไปยัง datatable.html (บน GitHub)
                window.location.href = 'datatable.html'; 
            });
        } else {
            Swal.fire('Error', 'Username หรือ Password ไม่ถูกต้อง', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อ Server ได้', 'error');
    }
});
