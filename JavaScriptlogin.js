const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec"; // ก๊อปมาวางที่นี่

async function doLogin() {
    const user = document.getElementById('user').value;
    const pass = document.getElementById('pass').value;

    Swal.fire({ title: 'กำลังตรวจสอบ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'login',
                data: { user, pass }
            })
        });

        const res = await response.json();
        
        if (res.result.success) {
            localStorage.setItem('currentUser', res.result.userName);
            Swal.fire('สำเร็จ!', 'เข้าสู่ระบบแล้ว', 'success').then(() => {
                window.location.href = 'datatable.html';
            });
        } else {
            Swal.fire('ผิดพลาด', 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อกับ Server ได้', 'error');
    }
}
