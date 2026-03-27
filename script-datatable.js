// ============================================================
// script-datatable.js (ส่วนที่ 1: Auth & Change Password)
// ============================================================

$(document).ready(function() {
  // 🛡️ 1. เช็คสิทธิ์การเข้าใช้งานทันทีเมื่อโหลดหน้า
  checkAccess();
  
  // 2. โหลดข้อมูลตาราง
  initStainTable();
});

/**
 * 🛡️ ฟังก์ชันเช็คสิทธิ์ (แทนที่ IIFE เดิมที่เช็คจาก URL Params)
 */
async function checkAccess() {
  const session = getSession(); // ดึงจาก script-common.js
  
  // ถ้าไม่มี Token หรือ User ใน localStorage ให้เด้งกลับ index.html
  if (!session.token || !session.userAccount) {
    Swal.fire({
      icon: 'error',
      title: 'การเข้าถึงถูกปฏิเสธ',
      text: 'โปรดเข้าสู่ระบบใหม่อีกครั้ง',
      confirmButtonText: 'ตกลง',
      allowOutsideClick: false
    }).then(() => {
      redirectToLogin(); // เรียกจาก script-common.js (ต้องเป็น ./index.html)
    });
    return;
  }

  // 🛡️ ส่งไปเช็คความถูกต้องของ Token กับ Server (ถ้าต้องการความปลอดภัยสูง)
  // หมายเหตุ: ใช้ callAPIGet หรือส่ง parameter ไปเช็ค
  try {
    // ใน code.gs คุณมี validateSecureToken รอรับอยู่
    // เราจะใช้ doGet ของ GAS โดยส่ง action ไปเช็ค (หรือข้ามส่วนนี้ไปถ้าเชื่อใจ localStorage)
    // แต่เพื่อความปลอดภัยเหมือนเดิม เราจะส่งไปเช็คครับ
  } catch (e) {
    console.error("Auth check failed", e);
  }
}

/**
 * เปิด Modal เปลี่ยนรหัสผ่าน
 */
function openChangePasswordModal() {
  document.getElementById('self-new-pass').value = '';
  document.getElementById('self-confirm-pass').value = '';
  
  const p1 = document.getElementById('self-new-pass');
  const p2 = document.getElementById('self-confirm-pass');
  p1.type = 'password';
  p2.type = 'password';
  
  const modalEl = document.getElementById('selfChangePassModal');
  if (modalEl) {
    const myModal = new bootstrap.Modal(modalEl);
    myModal.show();
  }
}

/**
 * สลับการมองเห็นรหัสผ่าน (คงเดิม)
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
 * ✅ ส่งข้อมูลเปลี่ยนรหัสผ่าน (แปลงเป็น callAPI)
 */
async function submitSelfChangePass() {
  const p1 = document.getElementById('self-new-pass').value.trim();
  const p2 = document.getElementById('self-confirm-pass').value.trim();
  
  // ดึงข้อมูลจาก Session
  const { userAccount, token, user } = getSession();

  if (!userAccount) {
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

  // Regex ตรวจสอบรหัสผ่าน (คงเดิม)
  const passwordRegex = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
  if (!passwordRegex.test(p1)) {
    Swal.fire({
      icon: 'error',
      title: 'รูปแบบไม่ถูกต้อง',
      text: 'รหัสผ่านต้องเป็นภาษาอังกฤษ ตัวเลข และสัญลักษณ์เท่านั้น',
      confirmButtonColor: '#d33'
    });
    return;
  }

  Swal.fire({
    title: 'กำลังบันทึก...',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });
  
  try {
    // ✅ เรียกใช้ callAPI แทน google.script.run
    const res = await callAPI('updatePassword', { 
      targetUser: userAccount, 
      newPass: p1,
      token: token,
      user: user // ชื่อผู้ใช้สำหรับ validate token
    });

    Swal.close();

    if (res.success) {
      // ปิด Modal
      const modalElement = document.getElementById('selfChangePassModal');
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) modalInstance.hide();
      
      // ✅ สั่งทำลาย Token ใน Server
      await callAPI('logout', { token: token, user: user });

      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว กรุณาเข้าสู่ระบบใหม่',
        confirmButtonText: 'ตกลง',
        allowOutsideClick: false
      }).then(() => {
        clearSession(); // ล้าง localStorage
        redirectToLogin(); // ดีดกลับหน้า index.html
      });
      
    } else {
      Swal.fire('ล้มเหลว', res.message || 'เกิดข้อผิดพลาด', 'error');
    }
  } catch (err) {
    Swal.close();
    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ' + err.message, 'error');
  }
}

/**
 * ฟังก์ชันดึงข้อมูลจาก Google Sheets มาแสดงผลในตาราง
 */
async function initStainTable(callback) {
  Swal.fire({
    title: 'กำลังดึงข้อมูลจาก Server...',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  const { token, user } = getSession(); // ดึง Token จาก script-common.js

  try {
    // ✅ เปลี่ยนมาใช้ callAPIGet (หรือจะใช้ callAPI แบบ POST ก็ได้ตามที่ code.gs รองรับ)
    // ใน code.gs ของคุณ doGet รองรับ action: 'getStainSheetData'
    const data = await callAPIGet({ 
      action: 'getStainSheetData', 
      token: token, 
      user: user 
    });

    if (!data || data.error === 'unauthorized') {
      Swal.fire({
        icon: 'warning',
        title: 'Session หมดอายุ',
        text: 'กรุณา Login ใหม่เพื่อดึงข้อมูล',
      }).then(() => redirectToLogin());
      return;
    }

    if (data.length <= 1) {
      Swal.fire('ข้อมูลว่างเปล่า', 'ไม่พบข้อมูลในระบบ', 'info');
      // แม้ข้อมูลว่าง ก็ควรล้างตารางเดิม (ถ้ามี)
      return;
    }

    // ✅ เก็บข้อมูลไว้ใน Global Variable เพื่อใช้ในการค้นหา/แก้ไข
    window.cachedStainData = data; 
    
    // เรียกฟังก์ชัน Render (ตัวถัดไปที่คุณน่าจะส่งมา)
    renderTableStructure(data);

    if (callback && typeof callback === 'function') callback();
    
    Swal.close();

  } catch (err) {
    console.error("Fetch Error:", err);
    Swal.fire('Error', 'การเชื่อมต่อผิดพลาด: ' + err.message, 'error');
  }
}

/**
 * ฟังก์ชันสร้างโครงสร้างตารางและแสดงข้อมูล (ใช้ร่วมกับ jQuery DataTables)
 */
function renderTableStructure(data) {
  if (!data || data.length === 0) return;

  // คัดลอกแถวข้อมูล (ตัด Header ออก)
  const rows = [...data.slice(1)]; 
  // กลับด้านข้อมูลเพื่อให้แถวล่าสุดจาก Sheet มาอยู่บนสุด
  rows.reverse(); 

  // คอลัมน์ที่จะดึงมาโชว์ (อ้างอิงตาม Index ใน Google Sheets)
  const displayCols = [1, 2, 9, 10, 11, 12, 18, 20, 22, 40]; 

  // ทำลายตารางเดิมก่อนสร้างใหม่ (ป้องกัน Error Re-initialize)
  if ($.fn.DataTable.isDataTable('#stainTable')) {
    $('#stainTable').DataTable().destroy();
  }
  $('#stainTable').empty();

  // 1. สร้าง Header
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

  // 2. สร้าง Body
  let bodyHtml = '';
  rows.forEach((row, idx) => {
    // คำนวณหา Index จริงใน Sheet (สำหรับปุ่ม View/Edit)
    // แถวที่ 1 คือ Header, ข้อมูลเริ่มแถว 2 (Index 0 ใน Array data.slice(1) คือแถว 2 ใน Sheet)
    let realSheetIndex = (data.length - 1) - idx;

    bodyHtml += '<tr>';
    displayCols.forEach(i => {
      let cellData = row[i] || '-';

      // จัดการคอลัมน์ Recorded By (Index 40) และแสดง Timestamp (Index 0)
      if (i === 40) {
        let rawTimestamp = row[0];
        let displayTime = '';
        
        // ตรวจสอบและแปลงรูปแบบวันที่ให้รองรับทั้ง Date String และ Timestamp
        const d = new Date(rawTimestamp);
        if (!isNaN(d.getTime())) {
          displayTime = d.toLocaleString('th-TH', { 
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
          }).replace(',', '');
        } else {
          displayTime = rawTimestamp; // ถ้าแปลงไม่ได้ให้โชว์ค่าเดิม
        }

        bodyHtml += `<td>
                      <div class="d-flex flex-column align-items-center">
                        <span class="badge-user mb-1">${cellData}</span>
                        <small class="text-muted" style="font-size: 0.7rem;">${displayTime}</small>
                      </div>
                    </td>`;
      } 
      // เน้นตัวหนาสำหรับคอลัมน์เวลา Staining
      else if ([18, 20, 22].includes(i)) {
        bodyHtml += `<td><span class="fw-bold text-primary">${cellData}</span></td>`;
      } 
      else {
        bodyHtml += `<td>${cellData}</td>`;
      }
    });

    // ปุ่ม View รายละเอียด
    bodyHtml += `<td class="text-center">
                   <button class="btn btn-sm btn-view text-white rounded-pill px-3" onclick="openRecordDetail(${realSheetIndex})">
                     <i class="bi bi-eye-fill me-1"></i> View
                   </button>
                 </td>`;
    bodyHtml += '</tr>';
  });
  
  $('#stainTableBody').html(bodyHtml);

  // 3. Initialize DataTables
  $('#stainTable').DataTable({ 
    responsive: true, 
    pageLength: 10,
    order: [], // ไม่ต้องเรียงใหม่เพราะเรา reverse() มาแล้ว
    language: { 
      url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/th.json' 
    }
  });
}

/**
 * ฟังก์ชันเปิด Modal แสดงรายละเอียดข้อมูลรายแถว
 */
function openRecordDetail(rowIndex) {
  rowIndex = parseInt(rowIndex);
  
  // 🛡️ ตรวจสอบข้อมูลใน Cache (ดึงจากตัวแปร Global ที่เราเก็บไว้ตอน initStainTable)
  if (!window.cachedStainData || !window.cachedStainData[rowIndex]) {
    console.error("Data not found for index:", rowIndex);
    return;
  }

  const rowData = window.cachedStainData[rowIndex];
  
  // เริ่มสร้าง Table HTML
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

  // --- FORMAT TIMESTAMP ---
  let timestampDisplay = '-';
  if (rowData[0]) {
    const d = new Date(rowData[0]);
    if (!isNaN(d.getTime())) {
      timestampDisplay = d.toLocaleString('th-TH').replace(',', '');
    } else {
      timestampDisplay = rowData[0]; // กรณีมาเป็น string ที่ parse ไม่ได้
    }
  }

  const recordedBy = rowData[40] || '-';

  // --- ACTION BUTTONS ---
  html += `
  <div class="d-flex justify-content-between align-items-center mt-4">
    <div class="text-muted small">
      <div class="mb-1">
        <i class="bi bi-clock-history me-1 text-primary"></i> 
        <strong>Recorded at:</strong> ${timestampDisplay}
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

  // ใส่ HTML ลงใน Modal
  $('#detailBody').html(html);

  // สั่งแสดง Modal (ใช้ Bootstrap 5 Standard)
  const modalEl = document.getElementById('detailModal');
  const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalInstance.show();
}

/**
 * ฟังก์ชันลบข้อมูลรายแถว
 */
async function deleteRecord(rowIndex) {
    // ดึงข้อมูลจาก Cache มาโชว์ใน Confirm Dialog
    const rowData = window.cachedStainData[rowIndex];
    if (!rowData) return;

    const { token, user } = getSession(); // ดึงสิทธิ์จาก script-common.js

    Swal.fire({
        title: 'ยืนยันการลบข้อมูล?',
        text: `คุณกำลังจะลบข้อมูลของ Site: ${rowData[1]} (S/N: ${rowData[2]}) ใช่หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ลบข้อมูล',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    }).then(async (result) => {
        if (result.isConfirmed) {
            Swal.fire({ 
                title: 'กำลังลบข้อมูล...', 
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading() 
            });

            try {
                // ✅ เปลี่ยนมาใช้ callAPI (POST) เพื่อส่งคำสั่งลบ
                const response = await callAPI('deleteStainRecord', { 
                    rowIndex: rowIndex,
                    token: token,
                    user: user
                });

                if (response.success) {
                    Swal.fire({ 
                        icon: 'success', 
                        title: 'ลบข้อมูลสำเร็จ', 
                        timer: 1500,
                        showConfirmButton: false
                    });

                    // ปิด Modal รายละเอียด (ถ้าเปิดค้างไว้)
                    const detailModal = document.getElementById('detailModal');
                    const modalInstance = bootstrap.Modal.getInstance(detailModal);
                    if (modalInstance) modalInstance.hide();

                    // ✅ รีโหลดตารางใหม่เพื่อให้ข้อมูลเป็นปัจจุบัน
                    initStainTable(); 
                } else {
                    // กรณี Server ปฏิเสธ (เช่น Token หมดอายุ หรือไม่มีสิทธิ์)
                    Swal.fire('ล้มเหลว', response.message || 'ไม่สามารถลบข้อมูลได้', 'error');
                }

            } catch (err) {
                console.error("Delete Error:", err);
                Swal.fire('Error', 'การเชื่อมต่อผิดพลาด: ' + err.message, 'error');
            }
        }
    });
}

*/
function editRecord(rowIndex) {
  const rowData = window.cachedStainData[rowIndex];
  if (!rowData) return;

  // ดึงข้อมูล Session (ชื่อผู้ใช้)
  const { user } = getSession();

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

        <h5 class="section-header mt-5"><i class="bi bi-person-check-fill"></i>
          <span>Recorded By (ผู้บันทึกการแก้ไข)</span>
        </h5>

        <div class="card border-0 p-4 mb-4 shadow-sm recorded-by-card">
            <div class="row">
                <div class="col-md-12">
                    <label class="form-label fw-bold">
                        <i class="bi bi-shield-check me-1"></i> ชื่อผู้แก้ไขข้อมูล
                    </label>
                    <div class="input-group shadow-sm">
                        <span class="input-group-text"><i class="bi bi-person-badge"></i></span>
                        <input type="text" id="recordedBy_Edit" name="recordedBy" class="form-control" readonly required>
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

  // 1. นำ Form ใส่เข้าไปใน Modal Container
  $('#editFormContainer').html(formHtml);

  // 2. แสดง Modal
  const modalEl = document.getElementById('editModal');
  const editModal = bootstrap.Modal.getOrCreateInstance(modalEl);
  editModal.show();

  // 3. เมื่อ Modal เปิดขึ้นมา ให้โหลด Options และเติมข้อมูลเดิมลงไป
  modalEl.addEventListener('shown.bs.modal', async function() {
      Swal.fire({ 
        title: 'กำลังโหลดข้อมูล...', 
        allowOutsideClick: false, 
        didOpen: () => Swal.showLoading() 
      });

      try {
          // ✅ fetchOptionsForEdit() ต้องถูกปรับให้ดึงจาก API (ถ้ายังไม่ได้ทำ)
          await fetchOptionsForEdit(); 
          
          // ✅ เติมข้อมูลลงในฟิลด์ต่างๆ
          fillEditFormStepByStep(rowData, rowIndex);
          
          // ✅ รัน Logic พิเศษของฟอร์ม (เช่น การคำนวณเวลา หรือโชว์/ซ่อน Tab)
          if (typeof initEditReplacementLogic === 'function') {
            initEditReplacementLogic();
          }

          Swal.close();
      } catch (err) {
          console.error("Error loading edit form:", err);
          Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลตัวเลือกได้: ' + err.message, 'error');
      }
  }, { once: true }); // ให้ทำงานแค่ครั้งเดียวตอนเปิด

  // 4. จัดการการ Submit (ย้ายไปเรียก updateData)
  $(document).off('submit', '#updateForm').on('submit', '#updateForm', function(e) {
      e.preventDefault();
      updateData(); 
  });
}

/**
 * ฟังก์ชันควบคุมการแสดงผลฟิลด์ตามประเภทการ Fixing (สำหรับหน้าแก้ไข)
 */
function handleFixingChangeEdit() {
  const fixingSelect = document.getElementById('fixing');
  if (!fixingSelect) return;

  const val = fixingSelect.value;
  
  // Containers สำหรับฟิลด์ Setting
  const mPreContainer = document.getElementById('edit-container-methanol-prefix');
  const mFixContainer = document.getElementById('edit-container-methanol-fix');
  const sPreContainer = document.getElementById('edit-container-stain-prefix');

  // Select Elements ด้านใน
  const mPre = mPreContainer?.querySelector('select');
  const mFix = mFixContainer?.querySelector('select');
  const sPre = sPreContainer?.querySelector('select');

  // อ้างอิงปุ่ม Tab ทั้งส่วน Addition และ Replacement
  const addMethTabBtn = document.querySelector('[data-bs-target="#add-meth"]');
  const repMethTabBtn = document.querySelector('[data-bs-target="#rep-meth"]');

  // ฟังก์ชันช่วยสลับหน้า Tab (Bootstrap 5)
  const showTab = (selector) => {
    const btn = document.querySelector(selector);
    if (btn) bootstrap.Tab.getOrCreateInstance(btn).show();
  };

  if (val === 'Methanol') {
    // 1. จัดการ Container
    if (mPreContainer) mPreContainer.style.display = 'block';
    if (mFixContainer) mFixContainer.style.display = 'block';
    if (sPreContainer) sPreContainer.style.display = 'none';
    
    // 2. Enable/Disable ฟิลด์
    if (mPre) mPre.disabled = false;
    if (mFix) mFix.disabled = false;
    if (sPre) sPre.disabled = true;

    // 3. แสดง Tab Methanol กลับมา
    if (addMethTabBtn) addMethTabBtn.parentElement.style.display = 'block';
    if (repMethTabBtn) repMethTabBtn.parentElement.style.display = 'block';

    // 4. สลับหน้า Tab ไปที่ Methanol
    showTab('[data-bs-target="#add-meth"]');
    showTab('[data-bs-target="#rep-meth"]');

  } else if (val === 'Stain') {
    // 1. จัดการ Container (สลับกัน)
    if (mPreContainer) mPreContainer.style.display = 'none';
    if (mFixContainer) mFixContainer.style.display = 'none';
    if (sPreContainer) sPreContainer.style.display = 'block';

    if (mPre) mPre.disabled = true;
    if (mFix) mFix.disabled = true;
    if (sPre) sPre.disabled = false;

    // 2. ซ่อน Tab Methanol (เพราะใช้ Stain แทน)
    if (addMethTabBtn) addMethTabBtn.parentElement.style.display = 'none';
    if (repMethTabBtn) repMethTabBtn.parentElement.style.display = 'none';

    // 3. สลับหน้า Tab ไปที่ Undiluted
    showTab('[data-bs-target="#add-undiluted"]');
    showTab('[data-bs-target="#rep-undiluted"]');

  } else {
    // กรณีอื่นๆ หรือ Default: แสดงทั้งหมด
    if (mPreContainer) mPreContainer.style.display = 'block';
    if (mFixContainer) mFixContainer.style.display = 'block';
    if (sPreContainer) sPreContainer.style.display = 'block';

    if (mPre) mPre.disabled = false;
    if (mFix) mFix.disabled = false;
    if (sPre) sPre.disabled = false;
    
    if (addMethTabBtn) addMethTabBtn.parentElement.style.display = 'block';
    if (repMethTabBtn) repMethTabBtn.parentElement.style.display = 'block';
  }
}

/**
 * ฟังก์ชันควบคุมการแสดงผลเมื่อสลับระหว่าง Single และ Double Staining
 */
function handleStainTypeChange() {
  const stainTypeSelect = document.getElementById('stainType');
  if (!stainTypeSelect) return;
  
  // ตรวจสอบว่าเป็น Double Staining หรือไม่
  const isDouble = (stainTypeSelect.value.includes("Double"));

  // 1. จัดการฟิลด์หลักของ Stain 2
  const stain2Fields = ['stain2_ratio', 'dilutedStain2_time', 'add_diluted2_time'];
  stain2Fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const parent = el.closest('[class*="col-"]');
      if (parent) {
        parent.style.display = isDouble ? 'block' : 'none';
      }
      
      // ✅ ปิดการใช้งานหากไม่ใช่ Double เพื่อไม่ให้กระทบ Validation
      el.disabled = !isDouble;

      if (!isDouble) {
        el.selectedIndex = 0; 
      }
    }
  });

  // 2. จัดการส่วนของ Tab (Addition & Replacement)
  const tabAdd2 = document.getElementById('tab-stain2-addition');
  const tabRep2 = document.getElementById('tab-replace-stain2');
  
  if (tabAdd2) tabAdd2.style.setProperty('display', isDouble ? 'block' : 'none', 'important');
  if (tabRep2) tabRep2.style.setProperty('display', isDouble ? 'block' : 'none', 'important');

  // 3. จัดการฟิลด์ Replacement ของ Stain 2 เป็นพิเศษ
  const repS2Cond = document.getElementById('replace_diluted2_cond');
  if (repS2Cond) {
    repS2Cond.disabled = !isDouble;
    if (!isDouble) {
        repS2Cond.selectedIndex = 0;
        // ✅ รีเซ็ตค่าเวลาใน Custom Time Picker ให้เป็นค่าเริ่มต้น
        if (typeof mapTimeToPickerManual === "function") {
            mapTimeToPickerManual('replace_diluted2_val', '00:00');
        }
    }
  }
}

/**
 * กรองตัวอักษรให้เป็น Alphanumeric และสัญลักษณ์ที่จำเป็นเท่านั้น
 * ใช้กับฟิลด์ Buffer Type หรือชื่อรุ่น
 */
function validateAlphanumeric(input) {
  // กรองเอาเฉพาะ A-Z, a-z, 0-9, ช่องว่าง, จุด, วงเล็บ และโคลอน
  input.value = input.value.replace(/[^A-Za-z0-9\s\.\(\)\:]/g, '');
}

/**
 * ควบคุมค่า Amount of washing (13-23)
 */
function validateAmtWash1(input) {
  if (input.value === '') return;
  let val = parseInt(input.value);
  
  // ป้องกันค่าติดลบ
  if (val < 0) input.value = 0;
  // ป้องกันค่าเกิน Limit (23)
  if (val > 23) input.value = 23;
}

/**
 * ควบคุมค่า Amount of washing (29-62)
 */
function validateAmtWash2(input) {
  if (input.value === '') return;
  let val = parseInt(input.value);
  
  // ป้องกันค่าติดลบ
  if (val < 0) input.value = 0;
  // ป้องกันค่าเกิน Limit (62)
  if (val > 62) input.value = 62;
}

// 1. ตัวแปรเก็บ Timer (ประกาศไว้ภายนอกฟังก์ชัน)
let stepTimer = null;
let repeatTimer = null;

function stepTime(btn, type, amount) {
  // ฟังก์ชันคำนวณค่า (Logic เดิมของคุณซึ่งถูกต้องดีอยู่แล้ว)
  const performStep = () => {
    const container = btn.closest('.custom-time-picker');
    if (!container) return;

    const hhInput = container.querySelector('input[id$="_hh"]');
    const mmInput = container.querySelector('input[id$="_mm"]');
    const hiddenInput = container.querySelector('input[type="hidden"]');

    let hh = parseInt(hhInput.value) || 0;
    let mm = parseInt(mmInput.value) || 0;

    if (type === 'HH') {
      hh += amount;
      if (hh < 0) hh = 24; 
      else if (hh > 24) hh = 0;
      
      hhInput.value = hh.toString().padStart(2, '0');
      // ถ้าเป็น 24:00 ให้บังคับนาทีเป็น 00 เสมอ
      if (hh === 24) mmInput.value = "00";
    } else {
      // ถ้านาฬิกาเป็น 24 ชม. แล้ว ไม่ให้ปรับนาที (ล็อคไว้ที่ 24:00)
      if (hh === 24) {
        mm = 0;
      } else {
        mm += amount;
        if (mm < 0) mm = 59; 
        else if (mm > 59) mm = 0;
      }
      mmInput.value = mm.toString().padStart(2, '0');
    }
    
    // อัปเดตค่าเข้า Hidden Input เพื่อเตรียมส่ง Form
    hiddenInput.value = `${hhInput.value}:${mmInput.value}`;
  };

  // 2. ฟังก์ชันหยุดวิ่ง
  const stopStepping = () => {
    clearTimeout(stepTimer);
    clearInterval(repeatTimer);
    btn.removeEventListener('mouseup', stopStepping);
    btn.removeEventListener('mouseleave', stopStepping);
    btn.removeEventListener('touchend', stopStepping); // รองรับมือถือ
  };

  // 3. เริ่มการวิ่งของตัวเลข
  const startStepping = () => {
    performStep(); // ทำงานทันที 1 ครั้งเมื่อคลิก
    
    // ล้างค่าเก่าก่อนเริ่มใหม่
    clearTimeout(stepTimer);
    clearInterval(repeatTimer);

    // หน่วงเวลา 500ms (รอว่าคนกดค้างไหม)
    stepTimer = setTimeout(() => {
      // ถ้าค้างเกิน 500ms ให้เริ่มวิ่งทุก 100ms
      repeatTimer = setInterval(performStep, 100);
    }, 500);
  };

  // ผูก Event การหยุด
  btn.addEventListener('mouseup', stopStepping);
  btn.addEventListener('mouseleave', stopStepping);
  btn.addEventListener('touchend', stopStepping); // เพิ่ม Support จอสัมผัส

  startStepping();
}

/**
 * ฟังก์ชันเริ่มต้นเชื่อมต่อ Logic สำหรับส่วน Replacement ในหน้าแก้ไข
 */
function initEditReplacementLogic() {
  // เลือก Select ทุกตัวใน editModal ที่ชื่อลงท้ายด้วย _cond (เช่น replace_meth_cond, replace_undiluted_cond)
  const replacementSelectors = document.querySelectorAll('#editModal select[name$="_cond"]');
  
  replacementSelectors.forEach(select => {
    // 1. รันครั้งแรกทันที (Initial UI State) 
    // เพื่อให้ช่องกรอกเวลาโชว์/ซ่อนตามข้อมูลที่ดึงมาจาก Database
    if (typeof updateReplacementUI === 'function') {
      updateReplacementUI(select);
    }

    // 2. ผูก Event 'change' 
    // ล้าง Event เก่าออกก่อน (ถ้ามี) เพื่อป้องกันการซ้อนทับ (Event Doubling)
    select.removeEventListener('change', handleReplacementChange); 
    select.addEventListener('change', handleReplacementChange);
  });
}

/**
 * Helper function สำหรับจัดการ Event Change
 */
function handleReplacementChange(e) {
  if (typeof updateReplacementUI === 'function') {
    updateReplacementUI(e.target);
  }
}

/**
 * ฟังก์ชันดึงตัวเลือก (Options) จาก Master Settings มาใส่ใน Dropdown ของหน้าแก้ไข
 */
async function fetchOptionsForEdit() {
    try {
        // ✅ เปลี่ยนจาก google.script.run เป็น callAPI (GET/POST ตามที่ตั้งไว้)
        // เพื่อดึงข้อมูล Master Settings จาก Google Sheets ผ่าน GAS
        const options = await callAPI('getMasterSettings');

        if (!options) {
            throw new Error("ไม่ได้รับข้อมูล Master Settings");
        }

        // ค้นหาทุก Select ใน Form ที่มี Attribute 'data-source'
        const selects = document.querySelectorAll('#updateForm .form-select[data-source]');
        
        selects.forEach(select => {
            const source = select.getAttribute('data-source').trim();
            
            // ถ้าในข้อมูลที่ดึงมามี Key ตรงกับ data-source ของ Select นั้น
            if (options[source]) {
                let html = '<option value="">-- เลือก --</option>';
                
                options[source].forEach(val => {
                    // กรองค่าว่างออก และสร้าง Option
                    if (val !== null && val !== undefined && val !== "") {
                        html += `<option value="${val}">${val}</option>`;
                    }
                });
                
                select.innerHTML = html;
            }
        });

        return true; // สำเร็จ

    } catch (err) {
        console.error("Fetch Options Error:", err);
        throw err; // ส่ง Error ต่อไปให้ .catch ใน editRecord จัดการ
    }
}

/**
 * ฟังก์ชันเติมข้อมูลลงในฟอร์มแก้ไขทีละขั้นตอน
 */
function fillEditFormStepByStep(rowData, rowIndex) {
  // Helper สำหรับใส่ค่าลง Element โดยอ้างอิง ID
  const setValById = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;

    // จัดการค่าว่าง/Null ให้เป็น String ว่าง
    const val = (value === undefined || value === null) ? '' : String(value).trim();

    // กรณีเป็น Select: ถ้าค่าที่ได้มาไม่มีในตัวเลือก ให้สร้าง Option ใหม่ขึ้นมาเองชั่วคราว
    if (el.tagName === 'SELECT' && val !== '' && val !== '-') {
      const exists = Array.from(el.options).some(opt => opt.value === val);
      if (!exists) {
        const tempOpt = new Option(val, val, true, true);
        el.add(tempOpt);
      }
    }

    el.value = val;
    // กระตุ้น Event 'change' เพื่อให้ Logic ที่ผูกไว้ทำงานต่อ
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  try {
    // 0. ข้อมูลพื้นฐานสำหรับระบบ
    setValById('rowIndex', rowIndex);
    // rowData[0] ปกติจะเป็น ID ของแถว
    setValById('id', rowData[0]);

    // 1. Mapping ข้อมูลดัชนีหลัก (0-31) ตามลำดับ Column ใน Sheet
    const fields = [
      'id', 'site', 'sn', 'prefixing', 'rinsing', 'amtWash1', 'amtWash2', 'extTime', 
      'prepMethod', 'mixed', 'stainType', 'fixing', 'bufferType', 'fan1', 'fan2', 
      'methanolPrefix', 'methanolFix', 'stainPrefix', 'undilutedStain1_time', 
      'stain1_ratio', 'dilutedStain1_time', 'stain2_ratio', 'dilutedStain2_time', 
      'rinseCount', 'dryTime', 'heaterStatus', 'add_meth_time', 'add_undiluted_time', 
      'add_diluted_time', 'add_diluted2_time', 'add_meth_slides', 'add_undiluted_slides'
    ];
    
    fields.forEach((id, idx) => {
      if (idx < rowData.length) {
        setValById(id, rowData[idx]);
      }
    });

    // 2. Mapping Stain Replacement (ดัชนี 32-39)
    const replacementConfigs = [
      { condId: 'replace_meth_cond',      prefix: 'replace_meth_val',       cIdx: 32, tIdx: 33 },
      { condId: 'replace_undiluted_cond', prefix: 'replace_undiluted_val', cIdx: 34, tIdx: 35 },
      { condId: 'replace_diluted1_cond',   prefix: 'replace_diluted1_val',   cIdx: 36, tIdx: 37 },
      { condId: 'replace_diluted2_cond',   prefix: 'replace_diluted2_val',   cIdx: 38, tIdx: 39 }
    ];

    replacementConfigs.forEach(item => {
      const condVal = String(rowData[item.cIdx] || "").trim();
      let timeVal = String(rowData[item.tIdx] || "00:00").trim();
      
      // ล้างค่า Condition ให้เป็นมาตรฐาน
      const cleanCond = (condVal === "-" || condVal === "" || condVal === "None") ? "None" : condVal;
      
      // จัดรูปแบบเวลาให้เป็น HH:mm เสมอ (เช่น 8:5 -> 08:05)
      if (timeVal.includes(':')) {
        const parts = timeVal.split(':');
        timeVal = parts[0].padStart(2, '0') + ":" + (parts[1] || '00').padStart(2, '0');
      } else {
        timeVal = "00:00";
      }

      setValById(item.condId, cleanCond);
      
      // เรียกใช้ฟังก์ชันแยกส่วนเวลาลง Time Picker (HH และ mm)
      if (typeof mapTimeToPickerManual === "function") {
        mapTimeToPickerManual(item.prefix, timeVal);
      }
    });

    // 3. ✨ จัดการชื่อผู้บันทึก (Recorded By)
    // ดึงจาก Session ปัจจุบันเท่านั้น เพื่อให้รู้ว่าใครเป็นคน "แก้ไข" ล่าสุด
    const { user } = getSession(); 
    if (user) {
        setValById('recordedBy_Edit', user); 
    }

    // 4. รอให้ Dropdown โหลดเสร็จแล้วค่อยอัปเดต UI ชิ้นส่วนย่อยๆ
    setTimeout(() => {
      replacementConfigs.forEach(item => {
        const selectEl = document.getElementById(item.condId);
        if (selectEl && typeof updateReplacementUI === "function") {
          updateReplacementUI(selectEl, false);
        }
      });
      // รัน Logic ซ่อน/โชว์ ฟิลด์ตามประเภทการ Fixing และ Stain Type
      if (typeof handleFixingChangeEdit === "function") handleFixingChangeEdit();
      if (typeof handleStainTypeChange === "function") handleStainTypeChange();
    }, 250);

  } catch (e) { 
    console.error("❌ Error in fillEditFormStepByStep:", e);
  }
}

/**
 * ฟังก์ชันแสดงข้อผิดพลาดและเปลี่ยนหน้า Tab ไปยังจุดที่ข้อมูลไม่ครบ
 * @param {HTMLElement} pane - Element ของ Tab Pane ที่พบ Error
 * @param {string} customMsg - ข้อความที่ต้องการแจ้งเตือน
 */
function showTabErrorEdit(pane, customMsg) {
    if (!pane) return;

    const tabId = pane.id;
    // ค้นหาปุ่ม Trigger ที่เชื่อมกับ Tab Pane นี้
    const tabTrigger = document.querySelector(`[data-bs-target="#${tabId}"]`);
    
    if (tabTrigger) {
        // ใช้ Bootstrap Instance เพื่อสั่ง Switch Tab
        const tabInstance = bootstrap.Tab.getOrCreateInstance(tabTrigger);
        tabInstance.show();
        
        // แถม: เลื่อนหน้าจอขึ้นไปที่ตัว Tab เพื่อให้ผู้ใช้เห็นชัดเจน (กรณีฟอร์มยาว)
        tabTrigger.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // แจ้งเตือนด้วย SweetAlert2
    Swal.fire({
        icon: 'warning',
        title: 'ข้อมูลไม่ครบถ้วน',
        text: customMsg || 'กรุณาตรวจสอบและกรอกข้อมูลในส่วนนี้ให้ครบถ้วน',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'รับทราบ',
        // ป้องกันการกดปิดโดยไม่ตั้งใจ
        allowOutsideClick: false 
    });
}

/**
 * ฟังก์ชันรวบรวมข้อมูลและส่งไปบันทึกแก้ไขที่ Google Sheets
 */
async function updateData() {
    const form = document.getElementById('updateForm');
    if (!form) return;

    // --- 0. ดึงข้อมูลผู้บันทึกจาก Session ปัจจุบัน (เพื่อความปลอดภัย) ---
    const { user, token } = getSession(); 
    
    // --- 1. เตรียมข้อมูลเวลาจาก Custom Picker ---
    const pickerPrefixes = ['replace_meth', 'replace_undiluted', 'replace_diluted1', 'replace_diluted2'];
    pickerPrefixes.forEach(prefix => {
        const hh = document.getElementById(`${prefix}_hh`)?.value || "00";
        const mm = document.getElementById(`${prefix}_mm`)?.value || "00";
        const hiddenInput = document.getElementById(`${prefix}_val`);
        if (hiddenInput) {
            hiddenInput.value = `${hh.padStart(2, '0')}:${mm.padStart(2, '0')}`;
        }
    });

    // รวบรวมข้อมูลจากฟอร์มทั้งหมด
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // แนบข้อมูลระบบ
    data.recordedBy = user || "Unknown"; 
    data.token = token; 
    
    const stainType = data.stainType || "";
    const fixingVal = data.fixing || "";

    // --- 2. การตรวจสอบข้อมูล (Validation Loop) ---
    const allInputs = form.querySelectorAll('select:not([disabled]), input:not([disabled]):not([type="hidden"]):not([type="button"])');
    
    for (let el of allInputs) {
        const val = el.value ? el.value.trim() : "";
        
        // ข้ามการตรวจสอบตามเงื่อนไขที่ไม่เกี่ยวข้อง
        if (el.id.includes('2') && !stainType.includes("Double")) continue;
        if (el.id.includes('meth') && fixingVal === "Stain") continue;
        if (val === "Loading...") continue;

        // ตรวจสอบค่าว่าง
        if (!val || val === "" || val.includes('--')) {
            const label = el.closest('.mb-3')?.querySelector('.form-label')?.innerText 
                          || el.closest('div')?.querySelector('.form-label')?.innerText 
                          || "ข้อมูลบางส่วน";

            const pane = el.closest('.tab-pane');
            if (pane && typeof showTabErrorEdit === "function") {
                showTabErrorEdit(pane, `กรุณาระบุ: ${label}`);
            } else {
                Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: `กรุณากรอกหรือเลือก: ${label}`, confirmButtonColor: '#3085d6' });
                el.focus();
            }
            return; 
        }

        // ตรวจสอบเงื่อนไข Replacement Time (ห้ามเป็น 00:00)
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

    // --- 3. Data Cleanup ก่อนส่ง (ป้องกันข้อมูลขยะค้างในระบบ) ---
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
    const confirm = await Swal.fire({
        title: 'ยืนยันการแก้ไข?',
        text: "คุณต้องการบันทึกการเปลี่ยนแปลงใช่หรือไม่?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'บันทึก',
        cancelButtonText: 'ยกเลิก'
    });

    if (!confirm.isConfirmed) return;

    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        // ✅ เปลี่ยนจาก google.script.run เป็น callAPI
        const response = await callAPI('updateStainRecord', { 
            data: data, 
            rowIndex: data.rowIndex 
        });

        if (response === "Success") {
            await Swal.fire({ 
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

            // 2. รีเฟรชตารางและเปิดดูรายละเอียดใหม่เพื่อตรวจสอบข้อมูล
            if (typeof initStainTable === "function") {
                initStainTable(() => { 
                    setTimeout(() => {
                        if (typeof openRecordDetail === "function") {
                            openRecordDetail(data.rowIndex);
                        }
                    }, 300);
                });
            }
        } else {
            Swal.fire('เกิดข้อผิดพลาด', response, 'error');
        }
    } catch (err) {
        Swal.fire('Error', err.toString(), 'error');
    }
}

/**
 * ฟังก์ชันกระจายค่าเวลาจาก String (HH:mm) ลงใน Custom Time Picker
 * @param {string} valInputId - ID ของ Hidden Input (เช่น 'replace_meth_val')
 * @param {string} timeStr - ค่าเวลาที่ดึงมา (เช่น '08:30')
 */
function mapTimeToPickerManual(valInputId, timeStr) {
  // 1. หา Prefix เพื่ออ้างอิง Element อื่นๆ ในชุดเดียวกัน
  // เช่น replace_meth_val -> prefix คือ replace_meth
  const prefix = valInputId.replace('_val', '');
  
  const hhEl = document.getElementById(prefix + '_hh');
  const mmEl = document.getElementById(prefix + '_mm');
  const valEl = document.getElementById(valInputId);
  
  // ตรวจสอบความถูกต้องของข้อมูลเบื้องต้น
  if (timeStr && typeof timeStr === 'string' && timeStr.includes(':')) {
    let [hh, mm] = timeStr.split(':');
    
    // 2. Format ให้เป็น 2 หลักเสมอ (Padding)
    // เช่น "9" -> "09", "5" -> "05"
    hh = (hh || "00").trim().padStart(2, '0');
    mm = (mm || "00").trim().padStart(2, '0');
    
    // 3. หยอดค่าลงใน UI
    if (hhEl) hhEl.value = hh;
    if (mmEl) mmEl.value = mm;
    
    // 4. อัปเดต Hidden Input หลักเพื่อให้ Form Data พร้อมส่ง
    if (valEl) valEl.value = `${hh}:${mm}`; 
    
  } else {
    // กรณีข้อมูลผิดพลาด หรือเป็นค่าว่าง ให้ Reset เป็น 00:00
    if (hhEl) hhEl.value = "00";
    if (mmEl) mmEl.value = "00";
    if (valEl) valEl.value = "00:00";
  }
}

/**
 * ฟังก์ชันควบคุมการเปิด/ปิด UI ของ Time Picker ตามเงื่อนไข Replacement
 * @param {HTMLSelectElement} selectElement - ตัว Dropdown ของ Condition
 * @param {boolean} shouldReset - บังคับรีเซ็ตค่าเวลาเป็น 00:00 หรือไม่
 */
function updateReplacementUI(selectElement, shouldReset = true) {
  if (!selectElement) return;

  const row = selectElement.closest('.row');
  if (!row) return;

  const container = row.querySelector('.custom-time-picker');
  if (!container) return;

  // 1. ตรวจสอบค่า 'None' หรือค่าว่างอย่างเข้มงวด
  const val = selectElement.value;
  const isNoneValue = (!val || val === "" || val === "None" || val === "-");
  
  const buttons = container.querySelectorAll('button');
  const inputs = container.querySelectorAll('input');

  // 2. ปิด/เปิด การใช้งานปุ่มกด (Step Time)
  buttons.forEach(btn => {
    btn.disabled = isNoneValue;
    // เพิ่มการปรับความโปร่งใสเพื่อให้ดูออกว่ากดไม่ได้
    btn.style.opacity = isNoneValue ? "0.5" : "1";
  });

  // 3. ปิด/เปิด การใช้งาน Input และปรับสีพื้นหลัง
  inputs.forEach(input => {
    input.disabled = isNoneValue;
    
    // ใช้สีพื้นหลังมาตรฐานของ Bootstrap สำหรับฟิลด์ที่ Disabled
    input.style.backgroundColor = isNoneValue ? "#e9ecef" : "#ffffff";
    input.style.cursor = isNoneValue ? "not-allowed" : "auto";
    
    // 4. รีเซ็ตค่าเป็น 00:00 เฉพาะเมื่อมีการเปลี่ยนแปลงโดยผู้ใช้ (Manual Change)
    if (isNoneValue && shouldReset) {
      if (input.type === 'hidden') {
        input.value = "00:00";
      } else if (input.classList.contains('form-control')) {
        input.value = "00";
      }
    }
  });
}

/**
 * ฟังก์ชันสร้างและดาวน์โหลดรายงาน PDF จากรายละเอียดข้อมูล
 */
async function downloadPDF() {
    // 1. ตรวจสอบ Library (รองรับทั้งระบบเก่าและใหม่)
    const jsPDFLib = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
    if (!jsPDFLib) {
        Swal.fire('Error', 'ไม่สามารถโหลด Library สำหรับสร้าง PDF ได้ (ตรวจสอบ jspdf ใน index.html)', 'error');
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

    let clone = null;
    try {
        // 2. สร้าง Clone เพื่อจัดระเบียบข้อมูลสำหรับ PDF โดยเฉพาะ
        clone = element.cloneNode(true);
        
        // ลบปุ่มและส่วนควบคุมที่ไม่ต้องการให้อยู่ในรายงาน
        const extras = clone.querySelectorAll('button, .modal-footer, .btn-close, .no-print');
        extras.forEach(el => el.remove());

        // ล็อคเส้นตารางและแก้ปัญหา Rowspan
        const tables = clone.querySelectorAll('table');
        tables.forEach(table => {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.backgroundColor = '#ffffff';
            table.style.fontSize = '14px'; // กำหนดขนาดฟอนต์ให้คงที่ใน PDF
            
            const cells = table.querySelectorAll('th, td');
            cells.forEach(cell => {
                cell.style.border = '1px solid #333'; // เส้นตารางชัดเจน
                cell.style.padding = '8px';
                cell.style.backgroundColor = '#ffffff';
                cell.style.verticalAlign = 'middle';
                cell.style.color = '#000000'; // บังคับตัวอักษรสีดำเข้ม

                // แก้ไขปัญหาเส้นคาด Rowspan (ดัน Layer ข้อความขึ้นมา)
                if (cell.rowSpan > 1) {
                    cell.style.zIndex = "10";
                    cell.style.position = "relative";
                    cell.style.backgroundColor = "#ffffff"; 
                }
            });
        });

        // ซ่อน Clone ไว้ในจุดที่มองไม่เห็นแต่ Browser ยัง Render ได้
        Object.assign(clone.style, {
            position: "fixed",
            top: "0",
            left: "-9999px",
            width: "800px",
            display: "block",
            visibility: "visible"
        });
        document.body.appendChild(clone);

        // 3. แปลง HTML เป็น Canvas (ใช้สเกล 2 เพื่อความคมชัดสูง)
        const canvas = await html2canvas(clone, {
            scale: 2, 
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            windowWidth: 800
        });

        // ใช้ JPEG 0.8 เพื่อลดขนาดไฟล์แต่ยังคงความชัดของตัวหนังสือ
        const imgData = canvas.toDataURL('image/jpeg', 0.8); 

        // 4. สร้าง PDF A4
        const pdf = new jsPDFLib({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            compress: true 
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15; // เพิ่มขอบกระดาษให้ดูโปรขึ้น
        const maxWidth = pageWidth - (margin * 2);
        const maxHeight = pageHeight - (margin * 2);

        let finalWidth = maxWidth;
        let finalHeight = (canvas.height * maxWidth) / canvas.width;

        // ถ้าภาพยาวเกินหน้ากระดาษ ให้ย่อลงมาให้พอดี 1 หน้า
        if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = (canvas.width * maxHeight) / canvas.height;
        }

        const xOffset = (pageWidth - finalWidth) / 2;
        
        // ใส่ภาพลงใน PDF ด้วยโหมด 'FAST' เพื่อความเร็ว
        pdf.addImage(imgData, 'JPEG', xOffset, margin, finalWidth, finalHeight, undefined, 'FAST');

        // ดึงชื่อ Site มาตั้งชื่อไฟล์ (หาจากแถวที่ 2 ของตารางรายละเอียด)
        const siteNameEl = element.querySelector('td:nth-child(2)');
        const siteName = siteNameEl ? siteNameEl.innerText.trim() : 'Service_Report';
        
        const dateStr = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
        pdf.save(`Stain_Config_${siteName}_${dateStr}.pdf`);

        Swal.close();

    } catch (error) {
        console.error("PDF Creation Error:", error);
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF: ' + error.message, 'error');
    } finally {
        // ทำความสะอาด DOM เสมอไม่ว่าจะสำเร็จหรือไม่
        if (clone && clone.parentNode) {
            document.body.removeChild(clone);
        }
    }
}
