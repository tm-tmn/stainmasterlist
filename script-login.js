// กำหนด URL ของ Google Apps Script Web App
const API_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec";

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const userValue = document.getElementById('username').value;
    const passValue = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');

    // แสดงสถานะกำลังโหลด
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังเข้าสู่ระบบ...';

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "login",
                data: {
                    user: userValue,  // เปลี่ยนจาก user เป็น userValue
                    pass: passValue   // เปลี่ยนจาก pass เป็น passValue
        }
    })
                }
            })
        });

        const result = await response.json();

        if (result.status === "Success") {
            // บันทึกข้อมูลลงใน LocalStorage
            localStorage.setItem("userName", result.name);
            localStorage.setItem("userDept", result.dept);
            localStorage.setItem("userRole", result.role);
            localStorage.setItem("isLoggedIn", "true");

            Swal.fire({
                icon: 'success',
                title: 'เข้าสู่ระบบสำเร็จ',
                text: `ยินดีต้อนรับคุณ ${result.name}`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "database.html"; // เปลี่ยนเป็นหน้าฐานข้อมูล
            });

        } else {
            Swal.fire({
                icon: 'error',
                title: 'เข้าสู่ระบบไม่สำเร็จ',
                text: result.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง',
                confirmButtonColor: '#d33'
            });
            loginBtn.disabled = false;
            loginBtn.innerHTML = 'Sign In';
        }

    } catch (err) {
        console.error(err);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถเชื่อมต่อกับ Server ได้ กรุณาลองใหม่ภายหลัง',
        });
        loginBtn.disabled = false;
        loginBtn.innerHTML = 'Sign In';
    }
});

function checkAuth() {
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
    }
}
