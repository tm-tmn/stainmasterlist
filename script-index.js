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
        /* Tip: การส่งข้อมูลแบบ POST ไปยัง Google Apps Script มักติดปัญหา CORS 
           วิธีแก้ที่ง่ายที่สุดคือส่งแบบ GET หรือจัดการผ่าน JSONP 
           ในที่นี้จะใช้การ fetch ไปยัง URL ที่รับ Parameter ครับ
        */
        const response = await fetch(`${WEB_APP_URL}?username=${encodeURIComponent(user)}&password=${encodeURIComponent(pass)}`);
        const result = await response.json();

        if (result.status === "success") {
            // ซ่อนหน้า Login และแสดงหน้ายินดีต้อนรับ
            document.getElementById('loginSection').style.display = 'none';
            document.getElementById('welcomeSection').style.display = 'block';
            
            document.getElementById('welcomeMsg').innerText = `สวัสดีคุณ ${result.name}`;
            document.getElementById('deptMsg').innerText = `สังกัด: ${result.department}`;
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
