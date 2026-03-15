// 1. ตั้งค่า URL ของ Google Apps Script Web App (ใช้ตัวเดิมที่คุณตั้งไว้)
const API_URL = "https://script.google.com/macros/s/AKfycbzQoIJWsoyZPEGqsiUSrMfxs2xaYNmS5POl6QAQyR303c42eoEaxTqzhYoofu_XZMJycQ/exec"; 

// 2. ดึงข้อมูลจาก sessionStorage ที่เก็บไว้ตอน Login
window.userName = sessionStorage.getItem('stain_user') || "Guest";
window.userLogin = sessionStorage.getItem('login_id') || "";
window.userDept = sessionStorage.getItem('stain_dept') || ""; 
window.token = sessionStorage.getItem('stain_token') || "";

$(document).ready(function() {
    // ตรวจสอบเบื้องต้น: ถ้าไม่มี Token ให้ไล่กลับหน้า Login ทันที
    if (!window.token || window.userName === "Guest") {
        Swal.fire({
            icon: 'error',
            title: 'กรุณาเข้าสู่ระบบ',
            text: 'คุณยังไม่ได้เข้าสู่ระบบ หรือ Session หมดอายุ',
            confirmButtonText: 'ตกลง',
            allowOutsideClick: false
        }).then(() => {
            window.location.href = 'index.html';
        });
        return;
    }

    // ถ้ามีข้อมูลครบ ให้เริ่มโหลดตาราง
    initStainTable();
    
    // จัดการเมนูตามสิทธิ์
    const manageUserMenu = document.getElementById('menu-manage-user');
    // 🚩 เงื่อนไข: ถ้าไม่ใช่ Admin ให้ซ่อนเมนู Manage USER
    if (window.userDept !== 'Admin') {
        if (manageUserMenu) manageUserMenu.style.display = 'none';
    }
});


// ฟังก์ชันสำหรับส่งกลับหน้า Login
function redirectToLogin() {
    sessionStorage.clear();
    window.location.href = 'index.html';
}

/**
 * 🛡️ แทนที่ระบบตรวจสอบ Token แบบเดิม (google.script.run)
 * เป็นการเช็คผ่าน fetch (ถ้าต้องการตรวจสอบความถูกต้องของ Token กับ Server อีกครั้ง)
 */
async function validateSession() {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            mode: "cors",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({
                action: "validateToken",
                data: { token: window.token, user: window.userLogin }
            })
        });
        const res = await response.json();
        if (res.status !== "Valid") {
            throw new Error("Invalid Session");
        }
    } catch (err) {
        Swal.fire({
            icon: 'warning',
            title: 'Session หมดอายุ',
            text: 'โปรดเข้าสู่ระบบใหม่',
            confirmButtonText: 'ตกลง'
        }).then(() => {
            redirectToLogin();
        });
    }
}


async function initStainTable(callback) {
  Swal.fire({
    title: 'กำลังดึงข้อมูล.....',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    // 🚩 เปลี่ยนจาก google.script.run มาใช้ fetch แทน
    const response = await fetch(API_URL, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ 
        action: "getStainSheetData" // ชื่อ action ต้องตรงกับใน Code.gs
      })
    });

    const data = await response.json();

    if (!data || data.length <= 1) {
      Swal.fire('ข้อมูลว่างเปล่า', 'ไม่พบข้อมูลในระบบ', 'info');
      return;
    }

    window.cachedStainData = data; 
    renderTableStructure(data);

    if (callback && typeof callback === 'function') callback();
    Swal.close();

  } catch (err) {
    console.error(err);
    Swal.fire('Error', 'การเชื่อมต่อผิดพลาด หรือ URL Script ไม่ถูกต้อง', 'error');
  }
}

function renderTableStructure(data) {
  if (!data || data.length === 0) return;

  const rows = data.slice(1);
  // กลับด้านข้อมูลเพื่อให้แถวล่าสุดจาก Sheet มาอยู่บนสุดของตาราง
  rows.reverse(); 

  const displayCols = [1, 2, 9, 10, 11, 12, 18, 20, 22, 40]; 

  if ($.fn.DataTable.isDataTable('#stainTable')) {
    $('#stainTable').DataTable().destroy();
  }
  $('#stainTable').empty();

  // สร้าง Header ให้ครบทุกคอลัมน์
  let headerHtml = '<thead><tr>';
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
  
  $('#stainTable').append(headerHtml);

let bodyHtml = '';
  rows.forEach((row, idx) => {
    // คำนวณหาแถวที่ถูกต้องใน Google Sheets (สำคัญมากสำหรับการเปิด View)
    // แถวที่ 1 คือ Header, ดังนั้นแถวข้อมูลเริ่มที่ 2
    let realSheetIndex = (data.length - 1) - idx;

    bodyHtml += '<tr>';
    displayCols.forEach(i => {
      let cellData = row[i] || '-';
      if (i === 40) {
        let rawTimestamp = row[0];
        let d = new Date(rawTimestamp);
        let displayTime = (!isNaN(d.getTime())) ? d.toLocaleString('th-TH').replace(',', '') : rawTimestamp;
        bodyHtml += `<td><div class="d-flex flex-column align-items-center">
                        <span class="badge-user mb-1">${cellData}</span>
                        <small class="text-muted" style="font-size: 0.7rem;">${displayTime}</small>
                     </div></td>`;
      } else if ([18, 20, 22].includes(i)) {
        bodyHtml += `<td><span class="fw-bold text-primary">${cellData}</span></td>`;
      } else {
        bodyHtml += `<td>${cellData}</td>`;
      }
    });

    bodyHtml += `<td class="text-center">
                   <button class="btn btn-sm btn-view text-white rounded-pill px-3" onclick="openRecordDetail(${realSheetIndex})">
                   <i class="bi bi-eye-fill me-1"></i> View</button>
                 </td>`;
    bodyHtml += '</tr>';
  });
  
  $('#stainTableBody').html(bodyHtml);
  $('#stainTable').DataTable({ 
    responsive: true, 
    pageLength: 10,
    order: [], // ไม่ต้องเรียงซ้ำ เพราะเรา reverse() มาแล้ว
    language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/th.json' }
  });
}

function openRecordDetail(rowIndex) {
  rowIndex = parseInt(rowIndex);
  // ดึงข้อมูลจาก Cache ล่าสุด (ตรวจสอบให้มั่นใจว่า initStainTable อัปเดตตัวแปรนี้แล้ว)
  if (!window.cachedStainData || !window.cachedStainData[rowIndex]) return;

  const rowData = window.cachedStainData[rowIndex];
  let html = '<table class="table table-bordered align-middle mb-0" style="border: 2px solid #000; width: 100%;">';
  html += '<tbody>';

  // --- SECTION 1: SITE & S/N ---
  html += '<tr style="border-bottom: 1px solid #000;">';
  html += ' <th colspan="2" class="text-center bg-light" style="border-right: 2px solid #000; font-weight: bold; width: 70%; padding: 8px;">Site</th>';
  html += ' <td class="text-center fw-bold text-primary" style="width: 30%; padding: 8px;">' + (rowData[1] || '-') + '</td>';
  html += '</tr>';
  html += '<tr style="border-bottom: 2px solid #000;">';
  html += ' <th colspan="2" class="text-center bg-light" style="border-right: 2px solid #000; font-weight: bold; padding: 8px;">S/N</th>';
  html += ' <td class="text-center fw-bold text-primary" style="padding: 8px;">' + (rowData[2] || '-') + '</td>';
  html += '</tr>';

  // --- SECTION 2: SERVICE SETTING ---
  html += '<tr>';
  html += ' <th rowspan="6" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold; width: 30%;">Service Setting</th>';
  html += ' <th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; width: 40%; padding: 8px;">Prefixing</th>';
  html += ' <td class="text-center" style="width: 30%; padding: 8px;">' + (rowData[3] || '-') + '</td>';
  html += '</tr>';

  const subFields = [
    { label: 'Rinsing (rinse water)', val: rowData[4] },
    { label: 'Amount of washing solution for diluted stain 1 pool', val: rowData[5] },
    { label: 'Amount of washing solution for diluted stain 2 pool', val: rowData[6] },
    { label: 'Extended time for cleaning stain pool at shutdown', val: rowData[7] },
    { label: 'Preparation method of dilute stain 1', val: rowData[8] }
  ];

  subFields.forEach((item, index) => {
    const borderBottom = (index === subFields.length - 1) ? '2px solid #000' : '1px solid #000';
    html += '<tr style="border-bottom: ' + borderBottom + ';">';
    html += ' <th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">' + item.label + '</th>';
    html += ' <td class="text-center" style="padding: 8px;">' + (item.val || '-') + '</td>';
    html += '</tr>';
  });

  // --- SECTION 3: STAIN TYPE ---
  html += '<tr><th rowspan="2" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Stain type</th>';
  html += '<th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Brand</th><td class="text-center">' + (rowData[9] || '-') + '</td></tr>';
  html += '<tr style="border-bottom: 1px solid #000;"><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Single/Double staining?</th><td class="text-center">' + (rowData[10] || '-') + '</td></tr>';

  // --- SECTION 4: FIXING & BUFFER & FAN ---
  html += '<tr style="border-bottom: 1px solid #000;"><th class="text-center bg-light" style="border-right: 1px solid #000; font-weight: bold;">Fixing</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Stain or Met Fix</th><td class="text-center">' + (rowData[11] || '-') + '</td></tr>';
  html += '<tr style="border-bottom: 1px solid #000;"><th class="text-center bg-light" style="border-right: 1px solid #000; font-weight: bold;">Buffer type</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Concentrated/Tablet</th><td class="text-center">' + (rowData[12] || '-') + '</td></tr>';
  html += '<tr><th rowspan="2" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Smear Fan</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Fan 1</th><td class="text-center">' + (rowData[13] || '-') + '</td></tr>';
  html += '<tr style="border-bottom: 2px solid #000;"><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Fan 2</th><td class="text-center">' + (rowData[14] || '-') + '</td></tr>';

  // --- SECTION 5: STAIN SETTING ---
  html += '<tr><th rowspan="11" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Stain Setting</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Met Prefix</th><td class="text-center">' + (rowData[15] || '-') + '</td></tr>';
  const stainFields = [
    { label: 'Met Fix (mm:ss)', val: rowData[16] }, { label: 'Stain Prefix', val: rowData[17] },
    { label: 'Undilute Stain 1 (mm:ss)', val: rowData[18] }, { label: 'Stain 1 Dilution Ratio:', val: rowData[19] },
    { label: 'Diluted Stain 1 (mm:ss)', val: rowData[20] }, { label: 'Stain 2 Dilution Ratio:', val: rowData[21] },
    { label: 'Diluted Stain 2 (mm:ss)', val: rowData[22] }, { label: 'Rinse Count', val: rowData[23] },
    { label: 'Dry (mm:ss)', val: rowData[24] }, { label: 'Heater', val: rowData[25] }
  ];
  stainFields.forEach((item, index) => {
    const borderBottom = (index === stainFields.length - 1) ? '2px solid #000' : '1px solid #000';
    html += `<tr style="border-bottom: ${borderBottom};"><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">${item.label}</th><td class="text-center">${item.val || '-'}</td></tr>`;
  });

  // --- SECTION 6: ADDITION ---
  html += `<tr><th rowspan="4" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Stain Addition Setting</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Methanol</th><td class="text-center">${rowData[26] || '-'} / ${rowData[30] || '0'} Slides</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Undiluted Stain 1</th><td class="text-center">${rowData[27] || '-'} / ${rowData[31] || '0'} Slides</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 1</th><td class="text-center">${rowData[28] || '-'}</td></tr>`;
  html += `<tr style="border-bottom: 2px solid #000;"><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 2</th><td class="text-center">${rowData[29] || '-'}</td></tr>`;

  // --- SECTION 7: REPLACEMENT ---
  html += `<tr><th rowspan="4" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Stain Replacement Setting</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Methanol</th><td class="text-center">${rowData[32] || '-'} / ${rowData[33] || '-'}</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Undiluted Stain 1</th><td class="text-center">${rowData[34] || '-'} / ${rowData[35] || '-'}</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 1</th><td class="text-center">${rowData[36] || '-'} / ${rowData[37] || '-'}</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 2</th><td class="text-center">${rowData[38] || '-'} / ${rowData[39] || '-'}</td></tr>`;

  html += '</tbody></table>';

  // --- ACTION BUTTONS ---
// --- ACTION BUTTONS & RECORD INFO ---
  
  // ฟังก์ชันช่วยจัดรูปแบบวันที่ให้ปลอดภัย
  let timestamp = '-';
  if (rowData[0]) {
    try {
      const dateObj = new Date(rowData[0]);
      // เช็คว่า dateObj ใช้งานได้จริงหรือไม่
      if (!isNaN(dateObj.getTime())) {
        timestamp = dateObj.toLocaleString('th-TH', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } else {
        // หากยัง Invalid ให้แสดงค่าดิบจาก Sheet (Col A) ไปตรงๆ
        timestamp = rowData[0]; 
      }
    } catch (e) {
      timestamp = rowData[0];
    }
  }

  const recordedBy = rowData[40] || '-';

  html += `
  <div class="d-flex justify-content-between align-items-center mt-4">
    <div class="text-muted small">
      <div class="mb-1">
        <i class="bi bi-clock-history me-1 text-primary"></i> 
        <strong>Recorded at:</strong> ${timestamp}
      </div>
      <div>
        <i class="bi bi-person-badge me-1 text-primary"></i> 
        <strong>By:</strong> ${recordedBy}
      </div>
    </div>

    <div class="d-flex gap-2">
      <button type="button" class="btn btn-warning px-4 shadow-sm" onclick="editRecord(${rowIndex})">
        <i class="bi bi-pencil-square me-2"></i> แก้ไข
      </button>
      <button type="button" class="btn btn-danger px-4 shadow-sm" onclick="deleteRecord(${rowIndex})">
        <i class="bi bi-trash me-2"></i> ลบ
      </button>
    </div>
  </div>`;

$('#detailBody').html(html);

  const modalEl = document.getElementById('detailModal');
  
  // ล้างค่าค้างเก่าของ Bootstrap
  const oldInstance = bootstrap.Modal.getInstance(modalEl);
  if (oldInstance) { oldInstance.hide(); }

  const modalInstance = new bootstrap.Modal(modalEl);
  modalInstance.show();
}

function deleteRecord(rowIndex) {
    const rowData = window.cachedStainData[rowIndex];
    Swal.fire({
        title: 'ยืนยันการลบข้อมูล?',
        text: `คุณกำลังจะลบข้อมูลของ Site: ${rowData[1]} ใช่หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ลบข้อมูล',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'กำลังลบ...', didOpen: () => Swal.showLoading() });
            google.script.run
                .withSuccessHandler(response => {
                    Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500 });
                    bootstrap.Modal.getInstance(document.getElementById('detailModal'))?.hide();
                    initStainTable(); 
                })
                .withFailureHandler(err => Swal.fire('Error', err, 'error'))
                .deleteStainRecord(rowIndex);
        }
    });
}

function editRecord(rowIndex) {
  const rowData = window.cachedStainData[rowIndex];

  const formHtml = `
    <div class="main-form-card" style="padding: 10px;">
      <form id="updateForm">
        <input type="hidden" name="rowIndex" id="rowIndex" value="${rowIndex}">
        <input type="hidden" name="id" id="id">

        <h5 class="section-header">
            <i class="bi bi-info-circle-fill"></i> General Information
        </h5>
        
        <div class="info-card-wrapper">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-hospital me-1"></i> Site / โรงพยาบาล</label>
              <div class="input-group custom-input-group">
                <span class="input-group-text"><i class="bi bi-building"></i></span>
                <input type="text" id="site" name="site" class="form-control" readonly value="${rowData.site || ''}" style="background-color: #f8fafc; cursor: not-allowed;">
              </div>
            </div>
            
            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-qr-code-scan me-1"></i> หมายเลขเครื่อง (Serial Number)</label>
              <div class="input-group custom-input-group">
                <span class="input-group-text"><i class="bi bi-hash"></i></span>
                <input type="text" id="sn" name="sn" class="form-control" placeholder="ระบุ S/N" value="${rowData.sn || ''}">
              </div>
            </div>
          </div>
        </div>

        <h5 class="section-header mt-4">
            <i class="bi bi-gear-fill"></i> Service Setting
        </h5>
        
        <div class="info-card-wrapper">
          <div class="row g-4">
            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-layers me-1"></i> Prefixing</label>
              <select id="prefixing" name="prefixing" class="form-select custom-select" data-source="Prefixing" required>
                <option value="">-- เลือก --</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-droplet-half me-1"></i> Rinsing (rinse water)</label>
              <select id="rinsing" name="rinsing" class="form-select custom-select" data-source="Rinsing (rinse water)" required>
                <option value="">-- เลือก --</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-moisture me-1"></i> Amount of washing (13-23)</label>
              <input type="number" id="amtWash1" name="amtWash1" class="form-control custom-input" oninput="validateAmtWash1(this)" placeholder="13-23" required>
            </div>

            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-moisture me-1"></i> Amount of washing (29-62)</label>
              <input type="number" id="amtWash2" name="amtWash2" class="form-control custom-input" oninput="validateAmtWash2(this)" placeholder="29-62" required>
            </div>

            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-clock-history me-1"></i> Extended Time (0-60 min)</label>
              <input type="number" id="extTime" name="extTime" class="form-control custom-input" min="0" max="60" placeholder="0-60" required>
            </div>

            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-diagram-3 me-1"></i> Preparation method</label>
              <select id="prepMethod" name="prepMethod" class="form-select custom-select" data-source="Preparation method of diluted stain 1" required>
                <option value="">-- เลือก --</option>
              </select>
            </div>
          </div>
        </div>

        <h5 class="section-header mt-4">
            <i class="bi bi-droplet-fill"></i> Stain Type
        </h5>
        
        <div class="info-card-wrapper">
          <div class="row g-4">
            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-tags me-1"></i> Brand</label>
              <select id="mixed" name="mixed" class="form-select custom-select" data-source="Brand" required>
                <option value="">-- เลือก Brand --</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-intersect me-1"></i> Single/Double Staining</label>
              <select id="stainType" name="stainType" class="form-select custom-select highlight-select" data-source="Single/Double Staining" required onchange="handleStainTypeChange(true)">
                <option value="">-- เลือกประเภทการย้อม --</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-thermometer-half me-1"></i> Fixing</label>
              <select id="fixing" name="fixing" class="form-select custom-select" data-source="Fixing" required onchange="handleFixingChangeEdit(true)">
                <option value="">-- เลือกประเภท Fixing --</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-vial me-1"></i> Buffer type</label>
              <input type="text" id="bufferType" name="bufferType" class="form-control custom-input" oninput="validateAlphanumeric(this)" placeholder="เช่น WATER, 6.8" required>
            </div>
          </div>
        </div>

        <h5 class="section-header mt-4">
            <i class="bi bi-wind"></i> Smear Fan
        </h5>
        
        <div class="info-card-wrapper">
          <div class="row g-4">
            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-fan me-1"></i> Fan 1</label>
              <select id="fan1" name="fan1" class="form-select custom-select" data-source="Fan 1" required>
                <option value="">-- เลือกสถานะ Fan 1 --</option>
              </select>
            </div>

            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-fan me-1"></i> Fan 2</label>
              <select id="fan2" name="fan2" class="form-select custom-select" data-source="Fan 2" required>
                <option value="">-- เลือกสถานะ Fan 2 --</option>
              </select>
            </div>
          </div>
        </div>

        <h5 class="section-header mt-4">
            <i class="bi bi-sliders"></i> Stain Setting
        </h5>
        
        <div class="info-card-wrapper">
          <div class="row g-4">
            <div class="col-md-4" id="edit-container-methanol-prefix">
              <label class="form-label"><i class="bi bi-droplet me-1"></i> Met Prefix</label>
              <select id="methanolPrefix" name="methanolPrefix" class="form-select custom-select" data-source="Met Prefix"></select>
            </div>
            <div class="col-md-4" id="edit-container-methanol-fix">
              <label class="form-label"><i class="bi bi-stopwatch me-1"></i> Met Fix (mm:ss)</label>
              <select id="methanolFix" name="methanolFix" class="form-select custom-select" data-source="Met Fix"></select>
            </div>
            <div class="col-md-4" id="edit-container-stain-prefix">
              <label class="form-label"><i class="bi bi-type me-1"></i> Stain Prefix</label>
              <select id="stainPrefix" name="stainPrefix" class="form-select custom-select" data-source="Stain Prefix"></select>
            </div>

            <div class="col-md-4">
              <label class="form-label">Undiluted Stain 1</label>
              <select id="undilutedStain1_time" name="undilutedStain1_time" class="form-select custom-select" data-source="Undiluted Stain 1" required></select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Stain 1 Ratio</label>
              <select id="stain1_ratio" name="stain1_ratio" class="form-select custom-select" data-source="Stain 1 Dilution Ratio" required></select>
            </div>
            <div class="col-md-4">
              <label class="form-label">Diluted Stain 1</label>
              <select id="dilutedStain1_time" name="dilutedStain1_time" class="form-select custom-select" data-source="Diluted Stain 1" required></select>
            </div>

            <div class="col-md-6">
              <label class="form-label text-indigo fw-bold"><i class="bi bi-plus-circle me-1"></i> Stain 2 Ratio</label>
              <select id="stain2_ratio" name="stain2_ratio" class="form-select custom-select border-indigo" data-source="Stain 2 Dilution Ratio"></select>
            </div>
            <div class="col-md-6">
              <label class="form-label text-indigo fw-bold"><i class="bi bi-plus-circle me-1"></i> Diluted Stain 2</label>
              <select id="dilutedStain2_time" name="dilutedStain2_time" class="form-select custom-select border-indigo" data-source="Diluted Stain 2"></select>
            </div>

            <div class="col-md-4">
              <label class="form-label"><i class="bi bi-arrow-repeat me-1"></i> Rinse Count</label>
              <select id="rinseCount" name="rinseCount" class="form-select custom-select" data-source="Rinse Count" required></select>
            </div>
            <div class="col-md-4">
              <label class="form-label"><i class="bi bi-wind me-1"></i> Dry (mm:ss)</label>
              <select id="dryTime" name="dryTime" class="form-select custom-select" data-source="Dry" required></select>
            </div>
            <div class="col-md-4">
              <label class="form-label"><i class="bi bi-thermometer-sun me-1"></i> Heater Status</label>
              <select id="heaterStatus" name="heaterStatus" class="form-select custom-select" data-source="Heater" required></select>
            </div>
          </div>
        </div>

        <h5 class="section-header mt-5">
            <i class="bi bi-plus-circle-fill"></i> Stain Addition Setting
        </h5>

        <div class="info-card-wrapper p-0 overflow-hidden" style="border: 1px solid #e2e8f0 !important; border-radius: 20px; background-color: #fff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
            <div class="card border-0">
                <div class="card-header bg-white pt-3 border-bottom" style="border-bottom: 1px solid #f1f5f9 !important;">
                    <ul class="nav nav-pills card-header-tabs border-0 px-3" id="additionTabs">
                        <li class="nav-item">
                            <button class="nav-link active custom-tab" data-bs-toggle="tab" data-bs-target="#add-meth" type="button">Methanol</button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link custom-tab" data-bs-toggle="tab" data-bs-target="#add-undiluted" type="button">Undiluted Stain 1</button>
                        </li>
                        <li class="nav-item">
                            <button class="nav-link custom-tab" data-bs-toggle="tab" data-bs-target="#add-diluted1" type="button">Diluted Stain 1</button>
                        </li>
                        <li class="nav-item" id="tab-stain2-addition" style="display:none;">
                            <button class="nav-link custom-tab" data-bs-toggle="tab" data-bs-target="#add-diluted2" type="button">Diluted Stain 2</button>
                        </li>
                    </ul>
                </div>

                <div class="card-body p-4 bg-light bg-opacity-10">
                    <div class="tab-content">
                        <div class="tab-pane fade show active" id="add-meth">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold"><i class="bi bi-clock me-1"></i> Time (HH:mm)</label>
                                    <select id="add_meth_time" name="add_meth_time" class="form-select custom-select" data-source="Time Options"></select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold"><i class="bi bi-stickies me-1"></i> Slides</label>
                                    <select id="add_meth_slides" name="add_meth_slides" class="form-select custom-select" data-source="Slide Options"></select>
                                </div>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="add-undiluted">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold"><i class="bi bi-clock me-1"></i> Time (HH:mm)</label>
                                    <select id="add_undiluted_time" name="add_undiluted_time" class="form-select custom-select" data-source="Time Options"></select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold"><i class="bi bi-stickies me-1"></i> Slides</label>
                                    <select id="add_undiluted_slides" name="add_undiluted_slides" class="form-select custom-select" data-source="Slide Options"></select>
                                </div>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="add-diluted1">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold"><i class="bi bi-hourglass-split me-1"></i> Time (HH:mm)</label>
                                    <select id="add_diluted_time" name="add_diluted_time" class="form-select custom-select" data-source="Enlapsed Option"></select>
                                </div>
                            </div>
                        </div>

                        <div class="tab-pane fade" id="add-diluted2">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold"><i class="bi bi-hourglass-split me-1"></i> Time (HH:mm)</label>
                                    <select id="add_diluted2_time" name="add_diluted2_time" class="form-select custom-select" data-source="Enlapsed Option"></select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>       


        <h5 class="section-header mt-5">
            <i class="bi bi-arrow-repeat"></i> Stain Replacement Setting
            </h5>
        <div class="card border-0 shadow-sm overflow-hidden" style="border-radius: 20px; border: 1px solid #e2e8f0 !important;">
            <div class="card-header bg-white pt-3 border-0">
                <ul class="nav nav-pills card-header-tabs border-0" id="replacementTabs">
                    <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#rep-meth" type="button">Methanol</button></li>
                    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#rep-undiluted" type="button">Undiluted Stain 1</button></li>
                    <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#rep-diluted1" type="button">Diluted Stain 1</button></li>
                    <li class="nav-item" id="tab-replace-stain2" style="display:none;"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#rep-diluted2" type="button">Diluted Stain 2</button></li>
                </ul>
            </div>

            <div class="card-body p-4 bg-light bg-opacity-25">
                <div class="tab-content">
                    <div class="tab-pane fade show active" id="rep-meth">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-6"><label class="form-label small fw-bold text-secondary">Condition</label><select id="replace_meth_cond" name="replace_meth_cond" class="form-select shadow-sm" data-source="Replace Options" style="border-radius: 10px;"></select></div>
                            <div class="col-md-6"><label class="form-label small fw-bold text-secondary">Value (HH:mm)</label>
                                <div class="d-flex align-items-center gap-2 custom-time-picker">
                                    <div class="input-group input-group-sm" style="width: 110px;"><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'HH', -1)">-</button><input type="text" id="replace_meth_hh" class="form-control text-center bg-white" value="00" readonly><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'HH', 1)">+</button></div>
                                    <span class="fw-bold">:</span>
                                    <div class="input-group input-group-sm" style="width: 110px;"><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'mm', -1)">-</button><input type="text" id="replace_meth_mm" class="form-control text-center bg-white" value="00" readonly><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'mm', 1)">+</button></div>
                                    <input type="hidden" id="replace_meth_val" name="replace_meth_val" value="00:00">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="rep-undiluted">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-6"><label class="form-label small fw-bold text-secondary">Condition</label><select id="replace_undiluted_cond" name="replace_undiluted_cond" class="form-select shadow-sm" data-source="Replace Options" style="border-radius: 10px;"></select></div>
                            <div class="col-md-6">
                                <div class="d-flex align-items-center gap-2 custom-time-picker">
                                    <div class="input-group input-group-sm" style="width: 110px;"><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'HH', -1)">-</button><input type="text" id="replace_undiluted_hh" class="form-control text-center bg-white" value="00" readonly><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'HH', 1)">+</button></div>
                                    <span class="fw-bold">:</span>
                                    <div class="input-group input-group-sm" style="width: 110px;"><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'mm', -1)">-</button><input type="text" id="replace_undiluted_mm" class="form-control text-center bg-white" value="00" readonly><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'mm', 1)">+</button></div>
                                    <input type="hidden" id="replace_undiluted_val" name="replace_undiluted_val" value="00:00">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="rep-diluted1">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-6"><label class="form-label small fw-bold text-secondary">Condition</label><select id="replace_diluted1_cond" name="replace_diluted1_cond" class="form-select shadow-sm" data-source="Replace Options" style="border-radius: 10px;"></select></div>
                            <div class="col-md-6">
                                <div class="d-flex align-items-center gap-2 custom-time-picker">
                                    <div class="input-group input-group-sm" style="width: 110px;"><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'HH', -1)">-</button><input type="text" id="replace_diluted1_hh" class="form-control text-center bg-white" value="00" readonly><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'HH', 1)">+</button></div>
                                    <span class="fw-bold">:</span>
                                    <div class="input-group input-group-sm" style="width: 110px;"><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'mm', -1)">-</button><input type="text" id="replace_diluted1_mm" class="form-control text-center bg-white" value="00" readonly><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'mm', 1)">+</button></div>
                                    <input type="hidden" id="replace_diluted1_val" name="replace_diluted1_val" value="00:00">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="tab-pane fade" id="rep-diluted2">
                        <div class="row g-3 align-items-end">
                            <div class="col-md-6"><label class="form-label small fw-bold text-secondary">Condition</label><select id="replace_diluted2_cond" name="replace_diluted2_cond" class="form-select shadow-sm" data-source="Replace Options" style="border-radius: 10px;"></select></div>
                            <div class="col-md-6">
                                <div class="d-flex align-items-center gap-2 custom-time-picker">
                                    <div class="input-group input-group-sm" style="width: 110px;"><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'HH', -1)">-</button><input type="text" id="replace_diluted2_hh" class="form-control text-center bg-white" value="00" readonly><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'HH', 1)">+</button></div>
                                    <span class="fw-bold">:</span>
                                    <div class="input-group input-group-sm" style="width: 110px;"><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'mm', -1)">-</button><input type="text" id="replace_diluted2_mm" class="form-control text-center bg-white" value="00" readonly><button class="btn btn-primary shadow-sm" type="button" onclick="stepTime(this, 'mm', 1)">+</button></div>
                                    <input type="hidden" id="replace_diluted2_val" name="replace_diluted2_val" value="00:00">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <h5 class="section-header mt-5">
            <i class="bi bi-person-check-fill"></i>
            <span>Recorded By (ผู้บันทึก)</span>
        </h5>

        <div class="card border-0 p-4 mb-4 shadow-sm recorded-by-card">
            <div class="row">
                <div class="col-md-12">
                    <label class="form-label fw-bold">
                        <i class="bi bi-shield-check me-1"></i> ยืนยันชื่อผู้บันทึกการแก้ไขข้อมูล
                    </label>
                    <div class="input-group shadow-sm">
                        <span class="input-group-text"><i class="bi bi-person-badge"></i></span>
                        <select id="recordedBy" name="recordedBy" class="form-select" data-source="Name Record" required>
                            <option value="">-- เลือกชื่อผู้บันทึก --</option>
                            </select>
                    </div>
                </div>
            </div>
        </div>

        <div class="mt-4 pb-3">
          <button type="submit" class="btn-submit animate__animated animate__fadeInUp">
            <i class="fas fa-save me-2"></i> Confirm and Save Configuration
          </button>
        </div>
      </form>
    </div>`;

  // --- ส่วน Logic (คงเดิม 100%) ---
  $('#editFormContainer').html(formHtml);
  const modalEl = document.getElementById('editModal');
  const editModal = new bootstrap.Modal(modalEl);
  editModal.show();

  modalEl.addEventListener('shown.bs.modal', function() {
      Swal.fire({ title: 'กำลังโหลด...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      fetchOptionsForEdit().then(() => {
          try {
              fillEditFormStepByStep(rowData, rowIndex);
              initEditReplacementLogic();
          } catch (err) {
              console.error("Error filling form:", err);
          } finally {
              Swal.close();
          }
      }).catch(err => {
          Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลตัวเลือกได้', 'error');
      });
  }, { once: true });

  $(document).off('submit', '#updateForm').on('submit', '#updateForm', function(e) {
      e.preventDefault();
      updateData(); 
  });
}



function handleFixingChangeEdit() {
  const val = document.getElementById('fixing')?.value;
  const mPreContainer = document.getElementById('edit-container-methanol-prefix');
  const mFixContainer = document.getElementById('edit-container-methanol-fix');
  const sPreContainer = document.getElementById('edit-container-stain-prefix');

  const mPre = mPreContainer?.querySelector('select');
  const mFix = mFixContainer?.querySelector('select');
  const sPre = sPreContainer?.querySelector('select');

  // อ้างอิงปุ่ม Tab ทั้งสองส่วน
  const addMethTabBtn = document.querySelector('[data-bs-target="#add-meth"]');
  const repMethTabBtn = document.querySelector('[data-bs-target="#rep-meth"]');

  if (val === 'Methanol') {
    // 1. แสดง Container และ Enable ฟิลด์
    if (mPreContainer) mPreContainer.style.display = 'block';
    if (mFixContainer) mFixContainer.style.display = 'block';
    if (sPreContainer) sPreContainer.style.display = 'none';
    
    if (mPre) mPre.disabled = false;
    if (mFix) mFix.disabled = false;
    if (sPre) sPre.disabled = true;

    // ✨ 2. แสดงปุ่ม Tab Methanol กลับมา (จุดที่ต้องเพิ่ม)
    if (addMethTabBtn) addMethTabBtn.parentElement.style.display = 'block';
    if (repMethTabBtn) repMethTabBtn.parentElement.style.display = 'block';

    // 3. ดีดหน้า Tab กลับมาที่ Methanol เพื่อให้ User เริ่มกรอก
    if (addMethTabBtn) bootstrap.Tab.getOrCreateInstance(addMethTabBtn).show();
    if (repMethTabBtn) bootstrap.Tab.getOrCreateInstance(repMethTabBtn).show();

  } else if (val === 'Stain') {
    if (mPreContainer) mPreContainer.style.display = 'none';
    if (mFixContainer) mFixContainer.style.display = 'none';
    if (sPreContainer) sPreContainer.style.display = 'block';

    if (mPre) mPre.disabled = true;
    if (mFix) mFix.disabled = true;
    if (sPre) sPre.disabled = false;

    // ซ่อนปุ่ม Tab Methanol
    if (addMethTabBtn) addMethTabBtn.parentElement.style.display = 'none';
    if (repMethTabBtn) repMethTabBtn.parentElement.style.display = 'none';

    // ดีดไปหน้าอื่น
    const addUndilutedTrigger = document.querySelector('[data-bs-target="#add-undiluted"]');
    if (addUndilutedTrigger) bootstrap.Tab.getOrCreateInstance(addUndilutedTrigger).show();
    const repUndilutedTrigger = document.querySelector('[data-bs-target="#rep-undiluted"]');
    if (repUndilutedTrigger) bootstrap.Tab.getOrCreateInstance(repUndilutedTrigger).show();

  } else {
    // Default แสดงทั้งหมด
    [mPreContainer, mFixContainer, sPreContainer].forEach(el => { if(el) el.style.display = 'block'; });
    [mPre, mFix, sPre].forEach(el => { if(el) el.disabled = false; });
    
    // แสดง Tab ทั้งหมดกลับมา
    if (addMethTabBtn) addMethTabBtn.parentElement.style.display = 'block';
    if (repMethTabBtn) repMethTabBtn.parentElement.style.display = 'block';
  }
}

function handleStainTypeChange() {
  const stainTypeSelect = document.getElementById('stainType');
  if (!stainTypeSelect) return;
  const isDouble = (stainTypeSelect.value.includes("Double"));

  const stain2Fields = ['stain2_ratio', 'dilutedStain2_time', 'add_diluted2_time'];
  stain2Fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const parent = el.closest('[class*="col-"]');
      if (parent) parent.style.display = isDouble ? 'block' : 'none';
      
      // ✨ เพิ่มการ disabled เพื่อให้ Validation ข้ามฟิลด์นี้ถ้าไม่ใช่ Double
      el.disabled = !isDouble;

      if (!isDouble) {
        el.selectedIndex = 0; 
      }
    }
  });

  // ส่วนของ Tab และ Replacement
  const tabAdd2 = document.getElementById('tab-stain2-addition');
  const tabRep2 = document.getElementById('tab-replace-stain2');
  
  if (tabAdd2) tabAdd2.style.setProperty('display', isDouble ? 'block' : 'none', 'important');
  if (tabRep2) tabRep2.style.setProperty('display', isDouble ? 'block' : 'none', 'important');

  // ✨ จัดการฟิลด์ Replacement ของ Stain 2
  const repS2Cond = document.getElementById('replace_diluted2_cond');
  if (repS2Cond) {
    repS2Cond.disabled = !isDouble;
    if (!isDouble) {
        repS2Cond.selectedIndex = 0;
        if (typeof mapTimeToPickerManual === "function") {
            mapTimeToPickerManual('replace_diluted2_val', '00:00');
        }
    }
  }
}

function validateAlphanumeric(input) {
  input.value = input.value.replace(/[^A-Za-z0-9\s\.\(\)\:]/g, '');
}

function validateAmtWash1(input) {
  let val = parseInt(input.value);
  if (val > 23) input.value = 23;
}

function validateAmtWash2(input) {
  let val = parseInt(input.value);
  if (val > 62) input.value = 62;
}

// 1. ประกาศตัวแปรสำหรับเก็บ Timer ไว้ด้านบนสุดของ script
let stepTimer = null;

function stepTime(btn, type, amount) {
  // ฟังก์ชันภายในสำหรับคำนวณค่า (แยกออกมาเพื่อให้เรียกซ้ำได้)
  const performStep = () => {
    const container = btn.closest('.custom-time-picker');
    const hhInput = container.querySelector('input[id$="_hh"]');
    const mmInput = container.querySelector('input[id$="_mm"]');
    const hiddenInput = container.querySelector('input[type="hidden"]');

    if (type === 'HH') {
      let val = parseInt(hhInput.value) + amount;
      if (val < 0) val = 24; else if (val > 24) val = 0;
      hhInput.value = val.toString().padStart(2, '0');

      if (val === 24) {
        mmInput.value = "00";
      }
    } else {
      let val = parseInt(mmInput.value) + amount;
      if (parseInt(hhInput.value) === 24) {
        val = 0;
      } else {
        if (val < 0) val = 59; else if (val > 59) val = 0;
      }
      mmInput.value = val.toString().padStart(2, '0');
    }
    hiddenInput.value = hhInput.value + ":" + mmInput.value;
  };

  // 2. เมื่อกดเมาส์ลง (mousedown)
  const startStepping = () => {
    performStep(); // ทำงานทันที 1 ครั้ง
    clearInterval(stepTimer);
    // ตั้งหน่วงเวลา 500ms ก่อนจะเริ่มวิ่งรัวๆ ทุก 100ms
    stepTimer = setTimeout(() => {
        stepTimer = setInterval(performStep, 100);
    }, 500);
  };

  // 3. เมื่อปล่อยเมาส์หรือเมาส์หลุดจากปุ่ม
  const stopStepping = () => {
    clearTimeout(stepTimer);
    clearInterval(stepTimer);
    btn.removeEventListener('mouseup', stopStepping);
    btn.removeEventListener('mouseleave', stopStepping);
  };

  // ผูก Event การกดค้าง
  btn.addEventListener('mouseup', stopStepping);
  btn.addEventListener('mouseleave', stopStepping);
  startStepping();
}

function initEditReplacementLogic() {
  document.querySelectorAll('#editModal select[name$="_cond"]').forEach(select => {
    updateReplacementUI(select);
    select.addEventListener('change', (e) => updateReplacementUI(e.target));
  });
}

function fetchOptionsForEdit() {
  return new Promise((resolve, reject) => {
    google.script.run
      .withFailureHandler(err => reject(err))
      .withSuccessHandler(options => {
        const selects = document.querySelectorAll('#updateForm .form-select[data-source]');
        selects.forEach(select => {
          const source = select.getAttribute('data-source').trim();
          if (options[source]) {
            let html = '<option value="">-- เลือก --</option>';
            options[source].forEach(val => {
              if (val !== null && val !== "") html += `<option value="${val}">${val}</option>`;
            });
            select.innerHTML = html;
          }
        });
        resolve();
      })
      .getMasterSettings();
  });
}
function fillEditFormStepByStep(rowData, rowIndex) {
  // ฟังก์ชันช่วยเซตค่าที่ฉลาดขึ้น
  const setValById = (id, value) => {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`⚠️ Element ID [${id}] not found.`);
      return;
    }

    const val = (value === undefined || value === null) ? '' : String(value).trim();

    // ถ้าเป็น Select และค่ายังไม่โหลด ให้สร้าง Option ชั่วคราวไว้รอ
    if (el.tagName === 'SELECT' && val !== '' && val !== '-') {
      const exists = Array.from(el.options).some(opt => opt.value === val);
      if (!exists) {
        const tempOpt = new Option(val, val, true, true);
        el.add(tempOpt);
      }
    }

    el.value = val;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  try {
    // 0. ใส่ข้อมูลพื้นฐาน
    setValById('rowIndex', rowIndex);
    setValById('id', rowData[0]);

    // 1. Mapping ข้อมูลดัชนี 1-31 (ข้าม 0 เพราะเป็น ID)
    const fields = [
      'id', 'site', 'sn', 'prefixing', 'rinsing', 'amtWash1', 'amtWash2', 'extTime', 
      'prepMethod', 'mixed', 'stainType', 'fixing', 'bufferType', 'fan1', 'fan2', 
      'methanolPrefix', 'methanolFix', 'stainPrefix', 'undilutedStain1_time', 
      'stain1_ratio', 'dilutedStain1_time', 'stain2_ratio', 'dilutedStain2_time', 
      'rinseCount', 'dryTime', 'heaterStatus', 'add_meth_time', 'add_undiluted_time', 
      'add_diluted_time', 'add_diluted2_time', 'add_meth_slides', 'add_undiluted_slides',
      'recordedBy' // อย่าลืมช่องผู้บันทึก (สมมติว่าเป็นดัชนีสุดท้ายหรือดัชนี 40 ตาม Sheet)
    ];
    
    fields.forEach((id, idx) => {
      if (idx < rowData.length) {
        setValById(id, rowData[idx]);
      }
    });

    // 2. Mapping Stain Replacement Setting (ดัชนี 32-39)
    const replacementConfigs = [
      { condId: 'replace_meth_cond',       prefix: 'replace_meth_val',       cIdx: 32, tIdx: 33 },
      { condId: 'replace_undiluted_cond', prefix: 'replace_undiluted_val', cIdx: 34, tIdx: 35 },
      { condId: 'replace_diluted1_cond',  prefix: 'replace_diluted1_val',  cIdx: 36, tIdx: 37 },
      { condId: 'replace_diluted2_cond',  prefix: 'replace_diluted2_val',  cIdx: 38, tIdx: 39 }
    ];

    replacementConfigs.forEach(item => {
      const condVal = String(rowData[item.cIdx] || "").trim();
      let timeVal = String(rowData[item.tIdx] || "00:00").trim();
      
      const cleanCond = (condVal === "-" || condVal === "" || condVal === "None" || condVal === "null") ? "None" : condVal;
      
      if (timeVal.includes(':')) {
        const parts = timeVal.split(':');
        timeVal = parts[0].padStart(2, '0') + ":" + parts[1].padStart(2, '0');
      } else {
        timeVal = "00:00";
      }

      setValById(item.condId, cleanCond);
      if (typeof mapTimeToPickerManual === "function") {
        mapTimeToPickerManual(item.prefix, timeVal);
      }
    });

    // 3. จัดการเรื่อง "Recorded By" เพิ่มเติม (จากภาพ image_61a382.png คือดัชนีสุดท้ายใน Sheet)
    // ถ้า Recorded By อยู่คอลัมน์สุดท้าย (ดัชนี 40) ให้ใส่ค่าตรงนี้
    if (rowData[40]) {
        setValById('recordedBy', rowData[40]);
    }

    // 4. อัปเดต UI
    setTimeout(() => {
      replacementConfigs.forEach(item => {
        const selectEl = document.getElementById(item.condId);
        if (selectEl && typeof updateReplacementUI === "function") {
          updateReplacementUI(selectEl, false);
        }
      });

      if (typeof handleFixingChangeEdit === "function") handleFixingChangeEdit(false);
      if (typeof handleStainTypeChange === "function") handleStainTypeChange(false);
    }, 200);

  } catch (e) { 
    console.error("❌ Error in fillEditFormStepByStep:", e);
  }
}

/**
 * ฟังก์ชันช่วยเหลือ: สลับ Tab และแจ้งเตือน Error
 */
function showTabErrorEdit(pane, customMsg) {
    const tabId = pane.id;
    const tabTrigger = document.querySelector(`[data-bs-target="#${tabId}"]`);
    
    if (tabTrigger) {
        bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
    }

    Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: customMsg || 'กรุณาตรวจสอบและเลือกข้อมูลให้ครบในหน้านี้',
        confirmButtonColor: '#3085d6'
    });
}

function updateData() {
    const form = document.getElementById('updateForm');
    
    // --- 0. เตรียมข้อมูลเวลาจาก Custom Picker ---
    const pickerPrefixes = ['replace_meth', 'replace_undiluted', 'replace_diluted1', 'replace_diluted2'];
    pickerPrefixes.forEach(prefix => {
        const hh = document.getElementById(`${prefix}_hh`)?.value || "00";
        const mm = document.getElementById(`${prefix}_mm`)?.value || "00";
        const hiddenInput = document.getElementById(`${prefix}_val`);
        if (hiddenInput) {
            hiddenInput.value = `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
        }
    });

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const stainType = data.stainType || "";
    const fixingVal = data.fixing || "";

    // --- 1. ตรวจสอบทุกลูกเช็ค (Unified Loop) ---
    // ค้นหาทั้ง input และ select ที่ไม่ถูก disabled
    const allInputs = form.querySelectorAll('select:not([disabled]), input:not([disabled]):not([type="hidden"]):not([type="button"])');
    
    for (let el of allInputs) {
        const val = el.value ? el.value.trim() : "";
        
        // ✨ กรองเงื่อนไขการตรวจสอบ: 
        // ถ้าเป็นฟิลด์ Stain 2 แต่ไม่ใช่ Double Stain ให้ข้ามไป
        if (el.id.includes('2') && !stainType.includes("Double")) continue;
        // ถ้าเป็นฟิลด์ Methanol แต่เลือก Fixing = Stain ให้ข้ามไป
        if (el.id.includes('meth') && fixingVal === "Stain") continue;
        if (val === "Loading...") continue;

        // 🛑 ตรวจสอบค่าว่าง หรือ "-- เลือก --"
        if (!val || val === "" || val.includes('--')) {
            
            // ดึงชื่อ Label (ลองหาจากหลายแหล่งเพื่อให้ครอบคลุมทุก Section)
            const label = el.closest('.mb-3')?.querySelector('.form-label')?.innerText 
                          || el.closest('div')?.querySelector('.form-label')?.innerText 
                          || "ข้อมูลบางส่วน";

            // เช็คว่าฟิลด์นี้อยู่ใน Tab หรือไม่
            const pane = el.closest('.tab-pane');
            if (pane) {
                showTabErrorEdit(pane, `กรุณาระบุ: ${label}`);
            } else {
                // ถ้าอยู่นอก Tab (เช่น Stain Setting / Service Setting)
                Swal.fire({
                    icon: 'warning',
                    title: 'ข้อมูลไม่ครบถ้วน',
                    text: `กรุณากรอกหรือเลือก: ${label}`,
                    confirmButtonColor: '#3085d6'
                });
                el.focus();
            }
            return; // หยุดทันทีเมื่อเจอจุดผิด
        }

        // 🛑 ตรวจสอบกรณีเลือก Condition แต่ลืมแก้เวลา (00:00)
        if (el.name && el.name.endsWith('_val')) {
            const condName = el.name.replace('_val', '_cond');
            const condSelect = form.querySelector(`select[name="${condName}"]`);
            if (condSelect && condSelect.value !== "None" && condSelect.value !== "" && val === "00:00") {
                const pane = el.closest('.tab-pane');
                showTabErrorEdit(pane, "กรุณาระบุเวลาให้ถูกต้อง (ห้ามเป็น 00:00 เมื่อมีการตั้งเงื่อนไข)");
                return;
            }
        }
    }

    // --- 2. ตรวจสอบข้อมูลภายใน Tab Panes (Loop เจาะลึก) ---
    const tabPanes = form.querySelectorAll('.tab-pane');
    for (let pane of tabPanes) {
        const isStain2Tab = pane.id.includes('2'); 
        const isMethTab = pane.id.includes('meth'); 

        // ข้าม Tab ที่ไม่เกี่ยวข้องกับเงื่อนไขปัจจุบัน
        if (isStain2Tab && !stainType.includes("Double")) continue; 
        if (isMethTab && fixingVal === "Stain") continue; 

        const inputs = pane.querySelectorAll('select, input:not([type="button"]):not([type="submit"])');
        for (let input of inputs) {
            if (!input.disabled) {
                const value = input.value ? input.value.trim() : "";
                
                // ตรวจสอบ Replacement Condition และเวลา (ห้ามเป็น 00:00 ถ้าเลือกเงื่อนไขอื่น)
                if (input.name.endsWith('_val')) {
                    const condName = input.name.replace('_val', '_cond');
                    const condSelect = form.querySelector(`select[name="${condName}"]`);
                    if (condSelect && condSelect.value !== "None" && condSelect.value !== "") {
                        if (!value || value === "00:00") {
                            showTabErrorEdit(pane, "กรุณาระบุเวลาให้ถูกต้อง (ห้ามเป็น 00:00 เมื่อมีการตั้งเงื่อนไข)");
                            return; 
                        }
                    }
                } 
                // ตรวจสอบ Dropdown ปกติใน Tab
                else if (!value || value === "" || value.includes("--")) {
                    showTabErrorEdit(pane); 
                    return;
                }
            }
        }
    }

    // --- 3. Data Cleanup ก่อนส่ง (คงเดิมของคุณไว้) ---
    if (!stainType.includes("Double")) {
        data.stain2_ratio = "-"; data.dilutedStain2_time = "-";
        data.add_diluted2_time = "-"; data.replace_diluted2_cond = "None";
        data.replace_diluted2_val = "00:00";
    }
    if (fixingVal === "Stain") {
        data.methanolPrefix = "-"; data.methanolFix = "-";
        data.add_meth_time = "-"; data.add_meth_slides = "-";
        data.replace_meth_cond = "None"; data.replace_meth_val = "00:00";
    } else if (fixingVal === "Methanol") {
        data.stainPrefix = "-";
    }

    // --- 4. ยืนยันการบันทึกแก้ไข ---
    Swal.fire({
        title: 'ยืนยันการแก้ไข?',
        text: "คุณต้องการบันทึกการเปลี่ยนแปลงใช่หรือไม่?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
            
            // --- 4. ภายในส่วน google.script.run ของฟังก์ชัน updateData ---
            google.script.run
                .withSuccessHandler(function(response) {
                    if (response === "Success") {
                        Swal.fire({ 
                            icon: 'success', 
                            title: 'สำเร็จ!', 
                            text: 'แก้ไขข้อมูลเรียบร้อยแล้ว', 
                            timer: 1500, 
                            showConfirmButton: false 
                        });

                        // 1. ปิด Modal แก้ไข
                        const editModalEl = document.getElementById('editModal');
                        const editModal = bootstrap.Modal.getInstance(editModalEl);
                        if (editModal) editModal.hide();

                        // 2. รีเฟรชตารางหลัก (DataTable)
                        if (typeof initStainTable === "function") {
                            // ใส่ Callback เพื่อให้มั่นใจว่าตารางโหลดเสร็จก่อนค่อยเปิด Detail
                            initStainTable(function() { 
                                // ✨ 3. เรียกฟังก์ชันเปิดรายละเอียดซ้ำอีกครั้ง โดยใช้ rowIndex เดิม
                                // เพื่อให้ตาราง Detail แสดงข้อมูลที่เพิ่งอัปเดตไป
                                setTimeout(() => {
                                    if (typeof openRecordDetail === "function") {
                                        openRecordDetail(data.rowIndex);
                                    }
                                }, 300); // หน่วงเวลานิดเดียวเพื่อให้ Modal ตัวเก่าเคลียร์เสร็จ
                            });
                        }

                    } else {
                        Swal.fire('เกิดข้อผิดพลาด', response, 'error');
                    }
                })
                .withFailureHandler(err => Swal.fire('Error', err.toString(), 'error'))
                .updateStainRecord(data, data.rowIndex);
        }
    });
}

function mapTimeToPickerManual(valInputId, timeStr) {
  // ตัดคำว่า '_val' ออกเพื่อให้ได้ prefix ที่ถูกต้อง (เช่น replace_meth_val -> replace_meth)
  const prefix = valInputId.replace('_val', '');
  
  const hhEl = document.getElementById(prefix + '_hh');
  const mmEl = document.getElementById(prefix + '_mm');
  const valEl = document.getElementById(valInputId);
  
  if (timeStr && timeStr.includes(':')) {
    let [hh, mm] = timeStr.split(':');
    // เติมเลข 0 ข้างหน้าให้ครบ 2 หลัก
    hh = hh.trim().padStart(2, '0');
    mm = mm.trim().padStart(2, '0');
    
    if (hhEl) hhEl.value = hh;
    if (mmEl) mmEl.value = mm;
    if (valEl) valEl.value = hh + ":" + mm; 
  }
}


function updateReplacementUI(selectElement, shouldReset = true) {
  const row = selectElement.closest('.row');
  if (!row) return;
  const container = row.querySelector('.custom-time-picker');
  if (!container) return;

  // ตรวจสอบค่า 'None' อย่างเข้มงวด
  const isNoneValue = (!selectElement.value || selectElement.value === "" || selectElement.value === "None");
  const buttons = container.querySelectorAll('button');
  const inputs = container.querySelectorAll('input');

  buttons.forEach(btn => btn.disabled = isNoneValue);

  inputs.forEach(input => {
    input.disabled = isNoneValue;
    input.style.backgroundColor = isNoneValue ? "#e9ecef" : "#ffffff";
    
    // Reset เฉพาะเมื่อสั่ง และต้องเป็นค่า None เท่านั้น
    if (isNoneValue && shouldReset) {
      if (input.type === 'hidden') input.value = "00:00";
      else if (input.classList.contains('form-control')) input.value = "00";
    }
  });
}

async function downloadPDF() {
    // แก้ปัญหา Destructuring Error
    const jsPDFLib = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
    if (!jsPDFLib) {
        Swal.fire('Error', 'ไม่สามารถโหลด Library สำหรับสร้าง PDF ได้', 'error');
        return;
    }

    const element = document.getElementById('detailBody');
    if (!element) return;

    Swal.fire({
        title: 'กำลังสร้างรายงาน PDF...',
        text: 'กำลังจัดระเบียบตารางและภาษาไทย',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // 1. สร้าง Clone เพื่อไม่ให้กระทบหน้าจอผู้ใช้
        const clone = element.cloneNode(true);
        
        // ลบปุ่มและส่วนเกินที่ไม่ต้องการใน PDF
        const extras = clone.querySelectorAll('button, .modal-footer, .btn-close');
        extras.forEach(el => el.remove());

// 2. ล็อคเส้นตาราง (ปรับปรุงเพื่อแก้ปัญหาเส้นคาดข้อความ Rowspan)
        const tables = clone.querySelectorAll('table');
        tables.forEach(table => {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse'; // ใช้ collapse เพื่อให้เส้นเชื่อมกันเป๊ะ
            table.style.backgroundColor = '#ffffff';
            
            const cells = table.querySelectorAll('th, td');
            cells.forEach(cell => {
                // บังคับสไตล์พื้นฐาน
                cell.style.border = '0.5px solid #000'; // ใช้เส้นบางลงเล็กน้อยเพื่อให้ดูคมชัด
                cell.style.padding = '6px';
                cell.style.backgroundColor = '#ffffff';
                cell.style.verticalAlign = 'middle'; // จัดข้อความให้อยู่กึ่งกลางแนวตั้ง

                // --- แก้ไขปัญหาเส้นคาด Rowspan ---
                // เช็คว่าเซลล์นี้เป็น Rowspan หรือไม่
                if (cell.rowSpan > 1) {
                    cell.style.zIndex = "10"; // ดันเซลล์ที่มีข้อความขึ้นมาอยู่ข้างบน
                    cell.style.position = "relative";
                    cell.style.backgroundColor = "#ffffff"; // บังคับพื้นหลังสีขาวเพื่อบังเส้นหลังเซลล์
                }
            });
        });

        // ซ่อน Clone ไว้ในที่ที่มองไม่เห็นก่อนถ่ายภาพ
        clone.style.position = "fixed";
        clone.style.top = "0";
        clone.style.left = "-9999px";
        clone.style.width = "800px"; // กำหนดความกว้างมาตรฐาน
        document.body.appendChild(clone);

        // 3. แปลง HTML เป็น Canvas
        const canvas = await html2canvas(clone, {
            scale: 1.5, // ลดลงจาก 2 เล็กน้อย (1.5 ยังชัดมากสำหรับ A4)
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // --- จุดเปลี่ยนสำคัญ: ใช้ JPEG และใส่ค่า Quality ---
        // 0.7 คือจุดที่สมดุลที่สุดระหว่างความชัดของตัวอักษรและขนาดไฟล์
        const imgData = canvas.toDataURL('image/jpeg', 0.7); 

        // สร้าง PDF พร้อมเปิดระบบ Compress
        const pdf = new jsPDFLib({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            compress: true 
        });

        

        // 4. คำนวณขนาดภาพให้พอดี (ใช้ Logic เดิมของคุณ)
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 10;
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);

        let finalWidth = maxWidth;
        let finalHeight = (canvas.height * maxWidth) / canvas.width;

        if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = (canvas.width * maxHeight) / canvas.height;
        }

        const xOffset = (pageWidth - finalWidth) / 2;
        
        // --- เปลี่ยนฟอร์แมตใน addImage เป็น JPEG ---
        pdf.addImage(imgData, 'JPEG', xOffset, margin, finalWidth, finalHeight, undefined, 'FAST');

        // ดึงชื่อ Site มาตั้งชื่อไฟล์
        const siteName = element.querySelector('td:nth-child(2)')?.innerText || 'Report';
        pdf.save(`Stain_Report_${siteName.trim()}.pdf`);

        // ทำความสะอาด
        document.body.removeChild(clone);
        Swal.close();

    } catch (error) {
        console.error("PDF Creation Error:", error);
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF', 'error');
    }
}

/**
 * ฟังก์ชันสำหรับเปิดหน้าต่างเปลี่ยนรหัสผ่านตัวเอง
 */
function openChangePasswordModal() {
  document.getElementById('self-new-pass').value = '';
  document.getElementById('self-confirm-pass').value = '';
  
  // รีเซ็ตให้เป็น type password และไอคอนตาเปิด
  const p1 = document.getElementById('self-new-pass');
  const p2 = document.getElementById('self-confirm-pass');
  p1.type = 'password';
  p2.type = 'password';
  
  const myModal = new bootstrap.Modal(document.getElementById('selfChangePassModal'));
  myModal.show();
}

/**
 * สลับการมองเห็นรหัสผ่าน
 */
function toggleSelfPassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon = btn.querySelector('i');
  if (input.type === 'password') {
    input.type = 'text';
    icon.classList.replace('bi-eye-fill', 'bi-eye-slash-fill');
  } else {
    input.type = 'password';
    icon.classList.replace('bi-eye-slash-fill', 'bi-eye-fill');
  }
}

/**
 * ส่งข้อมูลเปลี่ยนรหัสผ่าน
 */
function submitSelfChangePass() {
  const p1 = document.getElementById('self-new-pass').value.trim();
  const p2 = document.getElementById('self-confirm-pass').value.trim();
  const currentLoginID = window.userLogin;

  if (!currentLoginID || currentLoginID === "undefined") {
    Swal.fire('ผิดพลาด', 'ไม่พบข้อมูลบัญชีผู้ใช้ กรุณาลอง Login ใหม่', 'error');
    return;
  }

  if (!p1 || !p2) {
    Swal.fire('คำเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    return;
  }

  if (p1 !== p2) {
    Swal.fire('ผิดพลาด', 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน', 'error');
    return;
  }

  const passwordRegex = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
  if (!passwordRegex.test(p1)) {
    Swal.fire({
      icon: 'error',
      title: 'รูปแบบไม่ถูกต้อง',
      text: 'รหัสผ่านต้องเป็นภาษาอังกฤษ ตัวเลข และสัญลักษณ์เท่านั้น ห้ามมีภาษาไทยหรือเว้นวรรค',
      confirmButtonColor: '#d33'
    });
    return;
  }

  Swal.fire({
    title: 'กำลังบันทึก...',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });
  
    google.script.run
    .withSuccessHandler(function(res) {
      Swal.close();
      if (res.success) {
        // 1. ปิด Modal
        const modalElement = document.getElementById('selfChangePassModal');
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();
        
        // ✨ จุดสำคัญ: สั่งทำลาย Token ใน Server ทันที
        const currentToken = window.token; 
        if (currentToken) {
          google.script.run.destroyTokenOnServer(currentToken); // สั่งทำลายใน Cache
        }

        // 2. แจ้งสำเร็จ และเมื่อกด "ตกลง" ให้ Logout ทันที
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ระบบจะนำคุณออกจากระบบเพื่อเข้าสู่ระบบใหม่',
          confirmButtonText: 'ตกลง',
          allowOutsideClick: false
        }).then(() => {
          // 3. ล้างข้อมูลในเครื่อง Browser
          sessionStorage.clear();
          window.token = null;

          // 4. ดีดกลับหน้า Login ด้วย .replace 
          // (การใช้ .replace จะช่วยแทนที่ประวัติหน้าปัจจุบัน ทำให้กด Back กลับมาได้ยากขึ้น)
          const baseUrl = window.scriptUrl || "<?= scriptUrl ?>";
          window.top.location.replace(baseUrl + "?page=login"); 
        });
        
      } else {
        Swal.fire('ล้มเหลว', res.message, 'error');
      }
    })
    .withFailureHandler(err => {
        Swal.close();
        Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
    })
    .updatePasswordInSheet(currentLoginID, p1);
}

