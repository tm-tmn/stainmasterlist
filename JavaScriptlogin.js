const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec"; // ก๊อปมาวางที่นี่

async function handleLogin() {
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (!user || !pass) {
        Swal.fire('กรุณากรอกข้อมูลให้ครบ');
        return;
    }

    Swal.fire({ title: 'กำลังตรวจสอบ...', didOpen: () => Swal.showLoading() });

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'login',
                data: { user: user, pass: pass }
            })
        });

        const result = await response.json();

        if (result.status === "Success") {
            Swal.fire('สำเร็จ', 'ยินดีต้อนรับ ' + result.userName, 'success')
            .then(() => {
                // เก็บชื่อผู้ใช้ไว้ในเครื่อง และย้ายไปหน้าตาราง
                localStorage.setItem('user', result.userName);
                window.location.href = 'datatable.html';
            });
        } else {
            Swal.fire('ล้มเหลว', 'รหัสผ่านไม่ถูกต้อง', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อ Server ได้', 'error');
    }
}
