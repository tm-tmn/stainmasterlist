// กำหนด URL ของ Google Apps Script Web App (URL เดียวกับที่ใช้ใน datatable)
const API_URL = "YOUR_GOOGLE_SCRIPT_WEB_APP_URL_HERE";

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
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
                username: user,
                password: pass
            })
        });

        const result = await response.json();

        if (result.status === "Success") {
            // ✨ ส่วนสำคัญ: บันทึกข้อมูลลงใน LocalStorage เพื่อให้หน้าอื่นดึงไปใช้ได้
            localStorage.setItem("userName", result.name);
            localStorage.setItem("userDept", result.dept);
            localStorage.setItem("userRole", result.role); // เช่น Admin หรือ User
            localStorage.setItem("isLoggedIn", "true");

            Swal.fire({
                icon: 'success',
                title: 'เข้าสู่ระบบสำเร็จ',
                text: `ยินดีต้อนรับคุณ ${result.name}`,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                window.location.href = "datatable.html"; // ไปยังหน้าตารางข้อมูล
            });

        } else {
            // กรณีรหัสผ่านผิดหรือหา user ไม่เจอ
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

/**
 * ฟังก์ชันเสริมสำหรับเช็คสถานะการ Login (เผื่อไว้ใช้ในหน้าอื่นๆ)
 */
function checkAuth() {
    if (localStorage.getItem("isLoggedIn") !== "true") {
        window.location.href = "login.html";
    }
}
