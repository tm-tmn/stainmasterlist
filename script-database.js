// URL ของ Google Apps Script (Web App)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzDwkC2c8chRoIcgniD_6OL02lZR2jwDDZp_2Bo-zdWbAFC73nKqPot0cc4p3oEqdEg/exec";

$(document).ready(function() {
    checkAuth();
    loadStainData();
});

// 1. ตรวจสอบการ Login
function checkAuth() {
    const userName = localStorage.getItem("userName");
    const userDept = localStorage.getItem("userDept");
    const isLoggedIn = localStorage.getItem("isLoggedIn");

    if (isLoggedIn !== "true" || !userName) {
        window.location.href = "index.html"; // ถ้าไม่ได้ login ให้เด้งกลับ
        return;
    }

    // แสดงชื่อและแผนกบน Sidebar
    document.getElementById("display-user-name").innerText = userName;
    document.getElementById("display-user-dept").innerText = userDept;
    
    // ทำตัวอักษรแรกเป็น Avatar (เช่น Somchai -> S)
    document.getElementById("user-avatar").innerText = userName.charAt(0).toUpperCase();
}

// 2. ดึงข้อมูลจาก Google Sheets มาแสดงใน DataTable
async function loadStainData() {
    try {
        // ในขั้นตอนนี้ เราจะเรียก Apps Script โดยส่ง action=getData (คุณต้องไปเพิ่มที่ฝั่ง GAS ด้วย)
        const response = await fetch(`${WEB_APP_URL}?action=getData`);
        const result = await response.json();

        if (result.status === "success") {
            initializeDataTable(result.data);
        } else {
            Swal.fire("ข้อผิดพลาด", "ไม่สามารถดึงข้อมูลได้", "error");
        }
    } catch (error) {
        console.error("Error:", error);
        Swal.fire("ข้อผิดพลาด", "การเชื่อมต่อล้มเหลว", "error");
    }
}

// 3. ตั้งค่า DataTable
function initializeDataTable(data) {
    $('#stainTable').DataTable({
        data: data,
        columns: [
            { title: "วันที่", data: "date" },
            { title: "ชื่อรายการ", data: "item_name" },
            { title: "แผนก", data: "department" },
            { title: "สถานะ", data: "status" },
            { 
                title: "จัดการ", 
                data: null,
                render: function(data, type, row) {
                    return `<button class="btn btn-sm btn-outline-primary" onclick="viewDetail('${row.id}')">
                                <i class="bi bi-search"></i>
                            </button>`;
                }
            }
        ],
        language: {
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/th.json' // เมนูภาษาไทย
        },
        responsive: true,
        destroy: true // เพื่อให้โหลดใหม่ได้ถ้ามีการ Refresh
    });
}

// 4. ฟังก์ชัน Log out
function handleLogout() {
    Swal.fire({
        title: 'ยืนยันการออกจากระบบ?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, ออกจากระบบ',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = "index.html";
        }
    });
}
