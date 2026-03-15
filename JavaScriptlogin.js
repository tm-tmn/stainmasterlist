const API_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec"; 

async function callAPI(action, data = {}) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors", 
            headers: {
                "Content-Type": "text/plain;charset=utf-8", 
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
        const res = await callAPI('login', { user: u, pass: p });

        if (res.status === "Success") {
            // ✅ 1. เก็บ Token และชื่อผู้ใช้ (เหมือนเดิม)
            sessionStorage.setItem('stain_token', res.token);
            sessionStorage.setItem('stain_user', res.userName);
            sessionStorage.setItem('login_id', u); 

            // ✅ 2. เพิ่มการเก็บข้อมูล "แผนก" (Dept) ลงใน sessionStorage
            // ค่า res.userDept มาจากที่เราแก้ใน Code.gs
            sessionStorage.setItem('stain_dept', res.userDept || 'ไม่มีแผนก'); 

            Swal.fire({
                icon: 'success',
                title: 'สำเร็จ',
                // ✅ แสดงชื่อพร้อมแผนกในข้อความต้อนรับ
                text: `ยินดีต้อนรับคุณ ${res.userName} (${res.userDept || ''})`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = 'datatable.html'; 
            });
        } else {
            Swal.fire('Error', 'Username หรือ Password ไม่ถูกต้อง', 'error');
        }
    } catch (error) {
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อ Server ได้\nกรุณาตรวจสอบการ Deploy ของระบบ', 'error');
    }
});
