// JavaScriptdatatable.js

// ฟังก์ชันตัวกลางสำหรับคุยกับ Google Apps Script API
async function callAPI(action, data = {}) {
    const url = window.API_URL; // ตัวแปรนี้เราตั้งไว้ใน datatable.html แล้ว
    try {
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action: action, data: data })
        });
        return await response.json();
    } catch (err) {
        console.error("API Error:", err);
        throw err;
    }
}

$(document).ready(function() {
    // 🛡️ เช็คเบื้องต้นจากเครื่องผู้ใช้
    const token = window.token; // มาจาก sessionStorage ที่ดึงไว้ใน datatable.html
    const user = window.userName;
    
    if (!token || !user) {
        Swal.fire({
            icon: 'error',
            title: 'การเข้าถึงถูกปฏิเสธ',
            text: 'โปรดเข้าสู่ระบบใหม่อีกครั้ง',
            allowOutsideClick: false
        }).then(() => {
            window.location.href = 'index.html';
        });
        return;
    }

    // 🛡️ ตรวจสอบกุญแจ (Token) กับ Server จริงๆ
    validateTokenOnServer(token, user);
    
    // เริ่มโหลดตาราง
    initStainTable();
});

async function validateTokenOnServer(token, user) {
    try {
        const res = await callAPI('validateSecureToken', { token, user });
        if (!res.result) { // สมมติว่า server ส่ง { result: true/false }
            Swal.fire('Session หมดอายุ', 'โปรดเข้าสู่ระบบใหม่', 'warning')
                .then(() => window.location.href = 'index.html');
        }
    } catch (e) {
        console.log("Bypass token check for offline testing");
    }
}

/**
 * ฟังก์ชันดึงข้อมูลจาก Google Sheets มาแสดงในตาราง (เวอร์ชัน GitHub)
 */
async function initStainTable(callback) {
  Swal.fire({
    title: 'กำลังดึงข้อมูล.....',
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading()
  });

  try {
    // 🚩 เรียกใช้ callAPI ที่เราสร้างไว้ โดยส่ง action ให้ตรงกับใน Code.gs
    const res = await callAPI('getStainSheetData');
    
    // ตรวจสอบว่ามีข้อมูลส่งกลับมาไหม (res.data คือค่าที่ส่งมาจาก Google)
    const data = res.data;

    if (!data || data.length <= 1) {
      Swal.close();
      Swal.fire('ข้อมูลว่างเปล่า', 'ไม่พบข้อมูลในระบบ', 'info');
      return;
    }

    // เก็บข้อมูลไว้ในตัวแปร Global เพื่อให้ฟังก์ชัน View/Edit เรียกใช้ได้
    window.cachedStainData = data; 
    
    // ส่งข้อมูลไปสร้างโครงสร้างตาราง (ใช้ฟังก์ชันเดิมของคุณได้เลย)
    renderTableStructure(data);

    if (callback && typeof callback === 'function') callback();
    
    Swal.close();

  } catch (err) {
    console.error("Fetch Error:", err);
    Swal.close();
    Swal.fire('Error', 'การเชื่อมต่อผิดพลาด หรือ Server ไม่ตอบสนอง', 'error');
  }
}


/**
 * ฟังก์ชันสำหรับเปิดหน้าต่างเปลี่ยนรหัสผ่านตัวเอง (เวอร์ชัน GitHub)
 */
function openChangePasswordModal() {
    // 1. ล้างค่าเก่าใน Input
    const p1 = document.getElementById('self-new-pass');
    const p2 = document.getElementById('self-confirm-pass');
    
    if (p1 && p2) {
        p1.value = '';
        p2.value = '';
        p1.type = 'password';
        p2.type = 'password';
    }
  
    // 2. รีเซ็ตไอคอนลูกตา (ถ้าคุณใช้ Bootstrap Icons)
    const eyeIcons = document.querySelectorAll('#selfChangePassModal .bi');
    eyeIcons.forEach(icon => {
        icon.classList.remove('bi-eye-slash-fill');
        icon.classList.add('bi-eye-fill');
    });
  
    // 3. สั่งเปิด Modal ด้วย Bootstrap 5
    const modalElement = document.getElementById('selfChangePassModal');
    const myModal = new bootstrap.Modal(modalElement);
    myModal.show();
}

/**
 * สลับการมองเห็นรหัสผ่าน (ใช้ของเดิมได้เลย)
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
 * ส่งข้อมูลเปลี่ยนรหัสผ่าน (เวอร์ชัน GitHub Fetch API)
 */
async function submitSelfChangePass() {
  const p1 = document.getElementById('self-new-pass').value.trim();
  const p2 = document.getElementById('self-confirm-pass').value.trim();
  const currentLoginID = window.userLogin; // ดึงจาก sessionStorage ที่ทำไว้ใน Bridge Script

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
    // 🚩 เปลี่ยนมาใช้ callAPI ที่เราจะสร้างเป็นตัวกลาง
    const res = await callAPI('updatePassword', { 
      loginID: currentLoginID, 
      newPass: p1,
      token: window.token 
    });

    Swal.close();
    if (res.success) {
      // 1. ปิด Modal
      const modalElement = document.getElementById('selfChangePassModal');
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) modalInstance.hide();

      // 2. แจ้งสำเร็จและ Logout
      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว โปรดเข้าสู่ระบบใหม่',
        confirmButtonText: 'ตกลง',
        allowOutsideClick: false
      }).then(() => {
        sessionStorage.clear();
        window.location.replace('index.html'); 
      });
      
    } else {
      Swal.fire('ล้มเหลว', res.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้', 'error');
    }
  } catch (err) {
    Swal.close();
    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
  }
}

/**
 * ฟังก์ชันสร้างตาราง (ทำงานบน Browser 100%)
 */
function renderTableStructure(data) {
  if (!data || data.length === 0) return;

  // คัดลอกข้อมูลเพื่อไม่ให้กระทบ window.cachedStainData ตัวจริง
  const rows = data.slice(1);
  
  // กลับด้านข้อมูลเพื่อให้แถวล่าสุดจาก Sheet มาอยู่บนสุด
  rows.reverse(); 

  // เลือกคอลัมน์ที่จะแสดง (Index ตาม Google Sheet)
  const displayCols = [1, 2, 9, 10, 11, 12, 18, 20, 22, 40]; 

  // ทำลาย DataTable เก่าถ้ามีอยู่ เพื่อวาดใหม่
  if ($.fn.DataTable.isDataTable('#stainTable')) {
    $('#stainTable').DataTable().destroy();
  }
  $('#stainTable').empty();

  // สร้าง Header
  let headerHtml = `
    <thead>
      <tr>
        <th>Site</th>
        <th>S/N</th>
        <th>Brand</th>
        <th>Staining</th>
        <th>Fixing</th>
        <th>Buffer</th>
        <th>Undiluted 1<br><small>(mm:ss)</small></th>
        <th>Diluted 1<br><small>(mm:ss)</small></th>
        <th>Diluted 2<br><small>(mm:ss)</small></th>
        <th>Recorded By</th>
        <th class="text-center">Details</th>
      </tr>
    </thead>
    <tbody id="stainTableBody"></tbody>`;
  
  $('#stainTable').append(headerHtml);

  let bodyHtml = '';
  rows.forEach((row, idx) => {
    // คำนวณหาแถวที่ถูกต้องใน Google Sheets 
    // เพื่อใช้ส่งไปให้ openRecordDetail() ดึงข้อมูลจาก cachedStainData ได้แม่นยำ
    let realSheetIndex = (data.length - 1) - idx;

    bodyHtml += '<tr>';
    displayCols.forEach(i => {
      let cellData = row[i] || '-';
      
      if (i === 40) { // ส่วนแสดงชื่อผู้บันทึกและเวลา
        let rawTimestamp = row[0]; // ใช้คอลัมน์ A (Timestamp)
        let d = new Date(rawTimestamp);
        let displayTime = (!isNaN(d.getTime())) ? d.toLocaleString('th-TH').replace(',', '') : rawTimestamp;
        bodyHtml += `
          <td>
            <div class="d-flex flex-column align-items-center">
              <span class="badge-user mb-1">${cellData}</span>
              <small class="text-muted" style="font-size: 0.7rem;">${displayTime}</small>
            </div>
          </td>`;
      } else if ([18, 20, 22].includes(i)) { // เน้นตัวหนาส่วนที่เป็นเวลา
        bodyHtml += `<td><span class="fw-bold text-primary">${cellData}</span></td>`;
      } else {
        bodyHtml += `<td>${cellData}</td>`;
      }
    });

    // ปุ่ม View (ส่ง Index ของแถวใน Google Sheet เข้าไป)
    bodyHtml += `
      <td class="text-center">
        <button class="btn btn-sm btn-view text-white rounded-pill px-3" onclick="openRecordDetail(${realSheetIndex})">
          <i class="bi bi-eye-fill me-1"></i> View
        </button>
      </td>`;
    bodyHtml += '</tr>';
  });
  
  $('#stainTableBody').html(bodyHtml);

  // สั่งให้ DataTable ทำงาน
  $('#stainTable').DataTable({ 
    responsive: true, 
    pageLength: 10,
    order: [], 
    language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/th.json' }
  });
}

/**
 * ฟังก์ชันแสดงรายละเอียดข้อมูลใน Modal (เวอร์ชัน GitHub)
 */
function openRecordDetail(rowIndex) {
  rowIndex = parseInt(rowIndex);
  
  // ตรวจสอบว่ามีข้อมูลใน Cache หรือไม่
  if (!window.cachedStainData || !window.cachedStainData[rowIndex]) {
    console.error("Data not found for index:", rowIndex);
    return;
  }

  const rowData = window.cachedStainData[rowIndex];
  
  // เริ่มสร้าง HTML ตาราง (คงสไตล์เส้นขอบ 2px และสีตามที่คุณออกแบบไว้)
  let html = '<table class="table table-bordered align-middle mb-0" style="border: 2px solid #000; width: 100%;">';
  html += '<tbody>';

  // --- SECTION 1: SITE & S/N ---
  html += '<tr style="border-bottom: 1px solid #000;">';
  html += ' <th colspan="2" class="text-center bg-light" style="border-right: 2px solid #000; font-weight: bold; width: 70%; padding: 8px;">Site</th>';
  html += ` <td class="text-center fw-bold text-primary" style="width: 30%; padding: 8px;">${rowData[1] || '-'}</td>`;
  html += '</tr>';
  html += '<tr style="border-bottom: 2px solid #000;">';
  html += ' <th colspan="2" class="text-center bg-light" style="border-right: 2px solid #000; font-weight: bold; padding: 8px;">S/N</th>';
  html += ` <td class="text-center fw-bold text-primary" style="padding: 8px;">${rowData[2] || '-'}</td>`;
  html += '</tr>';

  // --- SECTION 2: SERVICE SETTING ---
  html += '<tr>';
  html += ' <th rowspan="6" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold; width: 30%;">Service Setting</th>';
  html += ' <th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; width: 40%; padding: 8px;">Prefixing</th>';
  html += ` <td class="text-center" style="width: 30%; padding: 8px;">${rowData[3] || '-'}</td>`;
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
    html += `<tr style="border-bottom: ${borderBottom};">`;
    html += ` <th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">${item.label}</th>`;
    html += ` <td class="text-center" style="padding: 8px;">${item.val || '-'}</td>`;
    html += '</tr>';
  });

  // --- SECTION 3-4: STAIN TYPE & FIXING & BUFFER --- (รวมเพื่อความรวดเร็ว)
  html += `<tr><th rowspan="2" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Stain type</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Brand</th><td class="text-center">${rowData[9] || '-'}</td></tr>`;
  html += `<tr style="border-bottom: 1px solid #000;"><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Single/Double staining?</th><td class="text-center">${rowData[10] || '-'}</td></tr>`;
  html += `<tr style="border-bottom: 1px solid #000;"><th class="text-center bg-light" style="border-right: 1px solid #000; font-weight: bold;">Fixing</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Stain or Met Fix</th><td class="text-center">${rowData[11] || '-'}</td></tr>`;
  html += `<tr style="border-bottom: 1px solid #000;"><th class="text-center bg-light" style="border-right: 1px solid #000; font-weight: bold;">Buffer type</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Concentrated/Tablet</th><td class="text-center">${rowData[12] || '-'}</td></tr>`;
  html += `<tr><th rowspan="2" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Smear Fan</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Fan 1</th><td class="text-center">${rowData[13] || '-'}</td></tr>`;
  html += `<tr style="border-bottom: 2px solid #000;"><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Fan 2</th><td class="text-center">${rowData[14] || '-'}</td></tr>`;

  // --- SECTION 5: STAIN SETTING ---
  html += `<tr><th rowspan="11" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Stain Setting</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Met Prefix</th><td class="text-center">${rowData[15] || '-'}</td></tr>`;
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

  // --- SECTION 6-7: ADDITION & REPLACEMENT ---
  html += `<tr><th rowspan="4" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Stain Addition Setting</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Methanol</th><td class="text-center">${rowData[26] || '-'} / ${rowData[30] || '0'} Slides</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Undiluted Stain 1</th><td class="text-center">${rowData[27] || '-'} / ${rowData[31] || '0'} Slides</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 1</th><td class="text-center">${rowData[28] || '-'}</td></tr>`;
  html += `<tr style="border-bottom: 2px solid #000;"><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 2</th><td class="text-center">${rowData[29] || '-'}</td></tr>`;

  html += `<tr><th rowspan="4" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Stain Replacement Setting</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Methanol</th><td class="text-center">${rowData[32] || '-'} / ${rowData[33] || '-'}</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Undiluted Stain 1</th><td class="text-center">${rowData[34] || '-'} / ${rowData[35] || '-'}</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 1</th><td class="text-center">${rowData[36] || '-'} / ${rowData[37] || '-'}</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 2</th><td class="text-center">${rowData[38] || '-'} / ${rowData[39] || '-'}</td></tr>`;

  html += '</tbody></table>';

  // --- RECORD INFO & BUTTONS ---
  let timestamp = '-';
  if (rowData[0]) {
    const d = new Date(rowData[0]);
    timestamp = (!isNaN(d.getTime())) ? d.toLocaleString('th-TH') : rowData[0];
  }

  html += `
  <div class="d-flex justify-content-between align-items-center mt-4">
    <div class="text-muted small">
      <div class="mb-1"><i class="bi bi-clock-history me-1 text-primary"></i> <strong>Recorded at:</strong> ${timestamp}</div>
      <div><i class="bi bi-person-badge me-1 text-primary"></i> <strong>By:</strong> ${rowData[40] || '-'}</div>
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

  // แสดงผลลงใน Modal
  $('#detailBody').html(html);
  const modalEl = document.getElementById('detailModal');
  const modalInstance = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalInstance.show();
}

/**
 * ฟังก์ชันลบข้อมูล (เวอร์ชัน GitHub Fetch API)
 */
async function deleteRecord(rowIndex) {
    const rowData = window.cachedStainData[rowIndex];
    
    const result = await Swal.fire({
        title: 'ยืนยันการลบข้อมูล?',
        text: `คุณกำลังจะลบข้อมูลของ Site: ${rowData[1]} ใช่หรือไม่?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'ลบข้อมูล',
        cancelButtonText: 'ยกเลิก',
        reverseButtons: true
    });

    if (result.isConfirmed) {
        Swal.fire({ 
            title: 'กำลังลบ...', 
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading() 
        });

        try {
            // 🚩 เรียกใช้ callAPI เพื่อส่ง rowIndex ไปลบที่ Server
            // หมายเหตุ: rowIndex ในหน้าเว็บเราตรงกับลำดับแถวใน Google Sheet (รวม Header) แล้ว
            const res = await callAPI('deleteStainRecord', { rowIndex: rowIndex });

            Swal.close();
            if (res.success) {
                await Swal.fire({ 
                    icon: 'success', 
                    title: 'ลบสำเร็จ', 
                    timer: 1500,
                    showConfirmButton: false 
                });
                
                // ปิด Modal รายละเอียด
                const modalEl = document.getElementById('detailModal');
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if (modalInstance) modalInstance.hide();
                
                // รีโหลดตารางใหม่เพื่อให้ข้อมูลเป็นปัจจุบัน
                initStainTable(); 
            } else {
                Swal.fire('ล้มเหลว', res.message || 'ไม่สามารถลบข้อมูลได้', 'error');
            }
        } catch (err) {
            Swal.close();
            Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
        }
    }
}

/** * จัดการการแสดงผลฟิลด์ตามประเภทการ Fixing (Methanol vs Stain)
 */
function handleFixingChangeEdit() {
  const val = document.getElementById('fixing')?.value;
  const mPreContainer = document.getElementById('edit-container-methanol-prefix');
  const mFixContainer = document.getElementById('edit-container-methanol-fix');
  const sPreContainer = document.getElementById('edit-container-stain-prefix');

  const mPre = mPreContainer?.querySelector('select');
  const mFix = mFixContainer?.querySelector('select');
  const sPre = sPreContainer?.querySelector('select');

  const addMethTabBtn = document.querySelector('[data-bs-target="#add-meth"]');
  const repMethTabBtn = document.querySelector('[data-bs-target="#rep-meth"]');

  if (val === 'Methanol') {
    if (mPreContainer) mPreContainer.style.display = 'block';
    if (mFixContainer) mFixContainer.style.display = 'block';
    if (sPreContainer) sPreContainer.style.display = 'none';
    
    if (mPre) mPre.disabled = false;
    if (mFix) mFix.disabled = false;
    if (sPre) sPre.disabled = true;

    if (addMethTabBtn) addMethTabBtn.parentElement.style.display = 'block';
    if (repMethTabBtn) repMethTabBtn.parentElement.style.display = 'block';

    // ✨ ใช้ getOrCreateInstance เพื่อความชัวร์ใน BS5
    if (addMethTabBtn) bootstrap.Tab.getOrCreateInstance(addMethTabBtn).show();
  } else if (val === 'Stain') {
    if (mPreContainer) mPreContainer.style.display = 'none';
    if (mFixContainer) mFixContainer.style.display = 'none';
    if (sPreContainer) sPreContainer.style.display = 'block';

    if (mPre) mPre.disabled = true;
    if (mFix) mFix.disabled = true;
    if (sPre) sPre.disabled = false;

    if (addMethTabBtn) addMethTabBtn.parentElement.style.display = 'none';
    if (repMethTabBtn) repMethTabBtn.parentElement.style.display = 'none';

    const addUndilutedTrigger = document.querySelector('[data-bs-target="#add-undiluted"]');
    if (addUndilutedTrigger) bootstrap.Tab.getOrCreateInstance(addUndilutedTrigger).show();
  } else {
    [mPreContainer, mFixContainer, sPreContainer].forEach(el => { if(el) el.style.display = 'block'; });
    if (addMethTabBtn) addMethTabBtn.parentElement.style.display = 'block';
  }
}

/**
 * จัดการฟิลด์สำหรับกรณีการย้อมแบบ Double Staining
 */
function handleStainTypeChange() {
  const stainTypeSelect = document.getElementById('stainType');
  if (!stainTypeSelect) return;
  const isDouble = (stainTypeSelect.value.includes("Double"));

  // รายการ ID ที่ต้องซ่อน/แสดงถ้าไม่ใช่ Double
  const stain2Fields = ['stain2_ratio', 'dilutedStain2_time', 'add_diluted2_time'];
  stain2Fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      const parent = el.closest('[class*="col-"]');
      if (parent) parent.style.display = isDouble ? 'block' : 'none';
      el.disabled = !isDouble;
      if (!isDouble) el.selectedIndex = 0; 
    }
  });

  const tabAdd2 = document.getElementById('tab-stain2-addition');
  const tabRep2 = document.getElementById('tab-replace-stain2');
  if (tabAdd2) tabAdd2.style.setProperty('display', isDouble ? 'block' : 'none', 'important');
  if (tabRep2) tabRep2.style.setProperty('display', isDouble ? 'block' : 'none', 'important');
}

/** * ฟังก์ชันสำหรับ Time Stepper (กดค้างเพื่อเพิ่ม/ลดเวลา)
 */
let stepTimer = null;
function stepTime(btn, type, amount) {
  const performStep = () => {
    const container = btn.closest('.custom-time-picker');
    if(!container) return;
    const hhInput = container.querySelector('input[id$="_hh"]');
    const mmInput = container.querySelector('input[id$="_mm"]');
    const hiddenInput = container.querySelector('input[type="hidden"]');

    if (type === 'HH') {
      let val = parseInt(hhInput.value) + amount;
      if (val < 0) val = 24; else if (val > 24) val = 0;
      hhInput.value = val.toString().padStart(2, '0');
      if (val === 24) mmInput.value = "00";
    } else {
      let val = parseInt(mmInput.value) + amount;
      if (parseInt(hhInput.value) === 24) { val = 0; } 
      else { if (val < 0) val = 59; else if (val > 59) val = 0; }
      mmInput.value = val.toString().padStart(2, '0');
    }
    hiddenInput.value = hhInput.value + ":" + mmInput.value;
  };

  const startStepping = () => {
    performStep();
    clearInterval(stepTimer);
    stepTimer = setTimeout(() => { stepTimer = setInterval(performStep, 100); }, 500);
  };

  const stopStepping = () => {
    clearTimeout(stepTimer);
    clearInterval(stepTimer);
  };

  btn.addEventListener('mouseup', stopStepping, { once: true });
  btn.addEventListener('mouseleave', stopStepping, { once: true });
  startStepping();
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

/**
 * โหลดตัวเลือก (Options) จาก Google Sheets มาใส่ใน Select ทุกตัวที่มี data-source
 */
async function fetchOptionsForEdit() {
  try {
    // 🚩 เรียกใช้ callAPI เพื่อขอข้อมูล Master Settings
    const options = await callAPI('getMasterSettings');
    
    const selects = document.querySelectorAll('#updateForm .form-select[data-source]');
    selects.forEach(select => {
      const source = select.getAttribute('data-source').trim();
      
      if (options && options[source]) {
        let html = '<option value="">-- เลือก --</option>';
        options[source].forEach(val => {
          if (val !== null && val !== "") {
            html += `<option value="${val}">${val}</option>`;
          }
        });
        select.innerHTML = html;
      }
    });
    return true;
  } catch (err) {
    console.error("fetchOptionsForEdit Error:", err);
    throw err;
  }
}

/**
 * เติมข้อมูลจากแถวที่เลือก (rowData) ลงในฟอร์มแก้ไข
 */
function fillEditFormStepByStep(rowData, rowIndex) {
  const setValById = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;

    const val = (value === undefined || value === null) ? '' : String(value).trim();

    // ถ้าเป็น Select และค่ายังไม่ถูกโหลดในขั้นตอนนี้ ให้สร้าง Option รอไว้ (Prevent blank)
    if (el.tagName === 'SELECT' && val !== '' && val !== '-') {
      const exists = Array.from(el.options).some(opt => opt.value === val);
      if (!exists) {
        el.add(new Option(val, val, true, true));
      }
    }

    el.value = val;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  try {
    // 0. ข้อมูลพื้นฐาน
    setValById('rowIndex', rowIndex);
    // rowData[0] มักจะเป็น Timestamp หรือ ID
    setValById('id', rowData[0]); 

    // 1. Mapping ข้อมูล Index 1-31 (General -> Stain Setting)
    const fields = [
      'id', 'site', 'sn', 'prefixing', 'rinsing', 'amtWash1', 'amtWash2', 'extTime', 
      'prepMethod', 'mixed', 'stainType', 'fixing', 'bufferType', 'fan1', 'fan2', 
      'methanolPrefix', 'methanolFix', 'stainPrefix', 'undilutedStain1_time', 
      'stain1_ratio', 'dilutedStain1_time', 'stain2_ratio', 'dilutedStain2_time', 
      'rinseCount', 'dryTime', 'heaterStatus', 'add_meth_time', 'add_undiluted_time', 
      'add_diluted_time', 'add_diluted2_time', 'add_meth_slides', 'add_undiluted_slides'
    ];
    
    fields.forEach((id, idx) => {
      if (idx < rowData.length) setValById(id, rowData[idx]);
    });

    // 2. Mapping Stain Replacement (Index 32-39)
    const replacementConfigs = [
      { condId: 'replace_meth_cond',       prefix: 'replace_meth_val',       cIdx: 32, tIdx: 33 },
      { condId: 'replace_undiluted_cond', prefix: 'replace_undiluted_val', cIdx: 34, tIdx: 35 },
      { condId: 'replace_diluted1_cond',  prefix: 'replace_diluted1_val',  cIdx: 36, tIdx: 37 },
      { condId: 'replace_diluted2_cond',  prefix: 'replace_diluted2_val',  cIdx: 38, tIdx: 39 }
    ];

    replacementConfigs.forEach(item => {
      const condVal = String(rowData[item.cIdx] || "").trim();
      let timeVal = String(rowData[item.tIdx] || "00:00").trim();
      
      const cleanCond = (condVal === "-" || condVal === "" || condVal === "None") ? "None" : condVal;
      
      if (timeVal.includes(':')) {
        const parts = timeVal.split(':');
        timeVal = parts[0].padStart(2, '0') + ":" + parts[1].padStart(2, '0');
      }

      setValById(item.condId, cleanCond);
      // ฟังก์ชันนี้ต้องมีอยู่ใน script เพื่อแยก HH:mm ลงช่องกด
      if (typeof mapTimeToPickerManual === "function") {
        mapTimeToPickerManual(item.prefix, timeVal);
      }
    });

    // 3. Recorded By (Index 40)
    if (rowData[40]) {
        setValById('recordedBy', rowData[40]);
    }

    // 4. Force Update UI (หน่วงเวลาเล็กน้อยให้ DOM จัดการตัวเอง)
    setTimeout(() => {
      if (typeof handleFixingChangeEdit === "function") handleFixingChangeEdit();
      if (typeof handleStainTypeChange === "function") handleStainTypeChange();
    }, 300);

  } catch (e) { 
    console.error("❌ fillEditForm Error:", e);
  }
}

function mapTimeToPickerManual(hiddenId, timeStr) {
    const hiddenEl = document.getElementById(hiddenId);
    if (!hiddenEl) return;
    
    hiddenEl.value = timeStr;
    const [hh, mm] = timeStr.split(':');
    
    // ค้นหา input hh และ mm ที่อยู่ในกลุ่มเดียวกัน
    const container = hiddenEl.closest('.custom-time-picker');
    if (container) {
        const hhInput = container.querySelector('input[id$="_hh"]');
        const mmInput = container.querySelector('input[id$="_mm"]');
        if (hhInput) hhInput.value = hh;
        if (mmInput) mmInput.value = mm;
    }
}

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

async function updateData() {
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

    // --- 1. Unified Validation Loop ---
    const allInputs = form.querySelectorAll('select:not([disabled]), input:not([disabled]):not([type="hidden"]):not([type="button"])');
    
    for (let el of allInputs) {
        const val = el.value ? el.value.trim() : "";
        
        // ข้ามฟิลด์ที่ไม่ต้องตรวจสอบตาม Logic
        if (el.id.includes('2') && !stainType.includes("Double")) continue;
        if (el.id.includes('meth') && fixingVal === "Stain") continue;
        if (val === "Loading...") continue;

        // ตรวจสอบค่าว่าง
        if (!val || val === "" || val.includes('--')) {
            const label = el.closest('.mb-3')?.querySelector('.form-label')?.innerText 
                          || el.closest('div')?.querySelector('.form-label')?.innerText 
                          || "ข้อมูลบางส่วน";

            const pane = el.closest('.tab-pane');
            if (pane) {
                showTabErrorEdit(pane, `กรุณาระบุ: ${label}`);
            } else {
                Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: `กรุณากรอกหรือเลือก: ${label}` });
                el.focus();
            }
            return; 
        }

        // ตรวจสอบกรณีเลือก Condition แต่ลืมแก้เวลา (ห้ามเป็น 00:00)
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

    // --- 2. Data Cleanup (ทำให้ข้อมูลสะอาดก่อนส่งเข้า Sheet) ---
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

    // --- 3. ยืนยันและส่งข้อมูล (GitHub Fetch Version) ---
    const confirm = await Swal.fire({
        title: 'ยืนยันการแก้ไข?',
        text: "คุณต้องการบันทึกการเปลี่ยนแปลงใช่หรือไม่?",
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'บันทึก'
    });

    if (confirm.isConfirmed) {
        Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        try {
            // 🚩 เปลี่ยนจาก google.script.run เป็น callAPI
            const response = await callAPI('updateStainRecord', {
                rowIndex: data.rowIndex,
                payload: data
            });

            if (response.success) {
                await Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'แก้ไขข้อมูลเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });

                // 1. ปิด Modal
                const editModal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
                if (editModal) editModal.hide();

                // 2. รีเฟรชตารางและเปิด Detail ดูผลลัพธ์
                if (typeof initStainTable === "function") {
                    initStainTable(); // รีโหลดตารางใหม่
                    
                    // หน่วงเวลาเปิด Detail เล็กน้อยเพื่อให้ข้อมูลใหม่โหลดเข้า Memory
                    setTimeout(() => {
                        if (typeof openRecordDetail === "function") {
                            openRecordDetail(data.rowIndex);
                        }
                    }, 500);
                }
            } else {
                Swal.fire('เกิดข้อผิดพลาด', response.message || 'บันทึกไม่สำเร็จ', 'error');
            }
        } catch (err) {
            console.error("Update Error:", err);
            Swal.fire('Error', 'ไม่สามารถเชื่อมต่อกับฐานข้อมูลได้', 'error');
        }
    }
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

async function downloadPDF() {
    // 1. ตรวจสอบ Library ทั้งสองตัว
    const jsPDFLib = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
    if (!jsPDFLib || typeof html2canvas === 'undefined') {
        Swal.fire('Error', 'ไม่พบ Library (jsPDF/html2canvas) กรุณาตรวจสอบการเชื่อมต่อ', 'error');
        return;
    }

    const element = document.getElementById('detailBody');
    if (!element) return;

    Swal.fire({
        title: 'กำลังสร้างรายงาน PDF...',
        text: 'กำลังประมวลผลตารางและภาษาไทย',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // 2. สร้าง Clone และจัดการ Style เพื่อความคมชัด
        const clone = element.cloneNode(true);
        const extras = clone.querySelectorAll('button, .modal-footer, .btn-close, .no-print');
        extras.forEach(el => el.remove());

        // ปรับแต่งตารางใน Clone
        const tables = clone.querySelectorAll('table');
        tables.forEach(table => {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.fontFamily = "'Sarabun', sans-serif"; // บังคับฟอนต์ถ้ามี
            
            const cells = table.querySelectorAll('th, td');
            cells.forEach(cell => {
                cell.style.border = '0.5px solid #333';
                cell.style.padding = '8px 6px';
                cell.style.backgroundColor = '#ffffff';
                cell.style.color = '#000000'; // บังคับสีตัวอักษรให้เข้ม
                
                if (cell.rowSpan > 1) {
                    cell.style.zIndex = "10";
                    cell.style.position = "relative";
                }
            });
        });

        // ซ่อน Clone ในตำแหน่งที่ปลอดภัย
        Object.assign(clone.style, {
            position: "fixed",
            top: "0",
            left: "-9999px",
            width: "1000px", // เพิ่มความกว้างเพื่อให้ Render ตารางไม่เบียด
            display: "block"
        });
        document.body.appendChild(clone);

        // 3. แปลงเป็น Canvas (เพิ่ม logging: false เพื่อประสิทธิภาพ)
        const canvas = await html2canvas(clone, {
            scale: 2, // เพิ่มเป็น 2 เพื่อความชัดระดับ High-Def
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            letterRendering: true // ช่วยเรื่องการจัดวางช่องว่างตัวอักษร
        });

        // แปลงเป็น JPEG (Balanced Quality)
        const imgData = canvas.toDataURL('image/jpeg', 0.85); 

        // 4. สร้าง PDF A4
        const pdf = new jsPDFLib({
            orientation: 'p',
            unit: 'mm',
            format: 'a4',
            compress: true 
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 15;
        const maxWidth = pageWidth - (margin * 2);

        let finalWidth = maxWidth;
        let finalHeight = (canvas.height * maxWidth) / canvas.width;

        // ถ้าสูงเกินหน้า ให้ย่อลงตามสัดส่วน
        if (finalHeight > (pageHeight - (margin * 2))) {
            finalHeight = pageHeight - (margin * 2);
            finalWidth = (canvas.width * finalHeight) / canvas.height;
        }

        const xOffset = (pageWidth - finalWidth) / 2;
        
        // ใส่รูปภาพลง PDF
        pdf.addImage(imgData, 'JPEG', xOffset, margin, finalWidth, finalHeight, undefined, 'MEDIUM');

        // ชื่อไฟล์ (ดึงจาก Site Name ในตาราง)
        const siteNameElement = element.querySelector('td:nth-child(2)');
        const siteName = siteNameElement ? siteNameElement.innerText.split('\n')[0].trim() : 'Report';
        
        pdf.save(`Stain_Report_${siteName}_${new Date().toLocaleDateString('th-TH')}.pdf`);

        document.body.removeChild(clone);
        Swal.close();

    } catch (error) {
        console.error("PDF Error:", error);
        Swal.fire('Error', 'เกิดข้อผิดพลาด: ' + error.message, 'error');
    }
}
