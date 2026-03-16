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

async function loadStainData() {
    try {
        console.log("กำลังดึงข้อมูลจาก:", WEB_APP_URL); // Debug ดู URL
        const response = await fetch(`${WEB_APP_URL}?action=getStainData`);
        
        if (!response.ok) throw new Error('Network response was not ok');
        
        const result = await response.json();
        console.log("ข้อมูลที่ได้รับ:", result); // ดูว่าข้อมูลมาไหม

        if (result.status === "success") {
            initializeDataTable(result.data);
        } else {
            Swal.fire("ข้อผิดพลาด", result.message || "ไม่สามารถดึงข้อมูลได้", "error");
        }
    } catch (error) {
        console.error("Detailed Error:", error);
        Swal.fire("ข้อผิดพลาด", "การเชื่อมต่อล้มเหลว: " + error.message, "error");
    }
}
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

function initializeDataTable(data) {
    if ($.fn.DataTable.isDataTable('#stainTable')) {
        $('#stainTable').DataTable().destroy();
    }
    $('#stainTable').empty();

    // สร้าง Header (เพิ่ม th เปล่าไว้รองรับคอลัมน์ time ที่ถูกซ่อน)
    let headerHtml = '<thead><tr>';
    headerHtml += '<th></th>'; // เพิ่ม th เปล่าตัวที่ 1 สำหรับ time (Index 0)
    headerHtml += '<th>Site</th>';
    headerHtml += '<th>S/N</th>';
    headerHtml += '<th>Brand</th>';
    headerHtml += '<th>Staining</th>';
    headerHtml += '<th>Fixing</th>';
    headerHtml += '<th>Buffer</th>';
    headerHtml += '<th>Undiluted 1<br><small>(mm:ss)</small></th>';
    headerHtml += '<th>Diluted 1<br><small>(mm:ss)</small></th>';
    headerHtml += '<th>Diluted 2<br><small>(mm:ss)</small></th>';
    headerHtml += '<th>Recorded By</th>';
    headerHtml += '<th class="text-center">Details</th>';
    headerHtml += '</tr></thead><tbody id="stainTableBody"></tbody>';
    
    $('#stainTable').html(headerHtml);

    $('#stainTable').DataTable({
        data: data,
        columns: [
            { data: 'time', visible: false }, // Index 0
            { data: 'site' },                 // Index 1
            { data: 'sn' },                   // Index 2
            { data: 'brand' },
            { data: 'staining' },
            { data: 'fixing' },
            { data: 'buffer' },
            { data: 'undiluted1', render: formatTime },
            { data: 'diluted1', render: formatTime },
            { data: 'diluted2', render: formatTime },
            { data: 'recordedBy' },
            { 
                data: null, 
                render: function(data, type, row) {
                    return `<button class="btn btn-info btn-sm" onclick="showFullDetail(${row.rawRow})"><i class="bi bi-eye"></i></button>`;
                }
            }
        ],
        order: [[0, 'desc']], 
        responsive: true, // เติมคอมม่าตรงนี้ ***
        language: {       // ตอนนี้ language จะทำงานได้ปกติ
            url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/th.json'
        },
        pageLength: 10
    });
}

function formatTime(data) {
    if (!data || data === "" || data === "-" || data === "null") return "-";
    return data; 
}
