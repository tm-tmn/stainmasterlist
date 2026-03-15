// กำหนด URL ของ Google Apps Script Web App
const API_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec";

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const userValue = document.getElementById('username').value;
    const passValue = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');

    // 🚩 DEBUG 1: เช็คค่าที่ดึงมาจาก Input ในหน้าเว็บ
    console.log("--- Frontend Debug ---");
    console.log("Input Username:", userValue);
    console.log("Input Password:", passValue);

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังเข้าสู่ระบบ...';

    // เตรียมก้อนข้อมูลที่จะส่ง
    const payload = {
        action: "login",
        data: {
            user: userValue,
            pass: passValue
        }
    };

    // 🚩 DEBUG 2: เช็ค JSON ก่อนกดส่ง Fetch
    console.log("Payload to send:", JSON.stringify(payload));

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload)
        });

        // 🚩 DEBUG 3: เช็ค HTTP Status
        console.log("HTTP Status:", response.status);

        const result = await response.json();
        
        // 🚩 DEBUG 4: เช็คข้อมูลที่ Server ตอบกลับมา
        console.log("Response from Server:", result);

        if (result.status === "Success") {
            console.log("✅ Login Success! Storing data...");
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
                window.location.href = "database.html";
            });

        } else {
            console.warn("❌ Login Failed:", result.message);
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
        console.error("🔥 Fetch Error:", err);
        Swal.fire({
            icon: 'error',
            title: 'เกิดข้อผิดพลาด',
            text: 'ไม่สามารถเชื่อมต่อกับ Server ได้',
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
