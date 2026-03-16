// เปลี่ยน URL นี้ให้เป็น Web App URL ของคุณที่ Deploy จาก Google Apps Script
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzDwkC2c8chRoIcgniD_6OL02lZR2jwDDZp_2Bo-zdWbAFC73nKqPot0cc4p3oEqdEg/exec";

document.getElementById('loginBtn').addEventListener('click', async function() {
    const user = document.getElementById('user').value.trim();
    const pass = document.getElementById('pass').value.trim();
    const loginBtn = document.getElementById('loginBtn');

    if (!user || !pass) {
        alert("กรุณากรอก Username และ Password");
        return;
    }

    // ล็อคปุ่มขณะกำลังโหลด
    loginBtn.innerText = "กำลังเข้าสู่ระบบ...";
    loginBtn.disabled = true;

    try {
        const response = await fetch(`${WEB_APP_URL}?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
        const result = await response.json();

        if (result.status === "success") {
            // 1. เก็บข้อมูลผู้ใช้ไว้ใน Browser (session-based)
            localStorage.setItem("userName", result.name);
            localStorage.setItem("userDept", result.department);
            localStorage.setItem("isLoggedIn", "true");

            // 2. นำทางไปหน้า database.html
            window.location.href = "database.html"; 
        } else {
            alert("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
        }
    } catch (error) {
        console.error("Error:", error);
        alert("ไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่");
    } finally {
        loginBtn.innerText = "เข้าสู่ระบบ";
        loginBtn.disabled = false;
    }
});
