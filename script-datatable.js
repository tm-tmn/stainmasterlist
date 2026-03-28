// ============================================================
// script-datatable.js
// ============================================================

$(document).ready(function () {
  initStainTable();
});

// ============================================================
// Guard: ถ้าไม่มี session ให้ redirect login
// (แทนบล็อก IIFE ที่เรียก google.script.run.validateSecureToken)
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
  const { token, user } = getSession();
  if (!token || !user) {
    Swal.fire({
      icon: 'error',
      title: 'การเข้าถึงถูกปฏิเสธ',
      text: 'โปรดเข้าสู่ระบบใหม่อีกครั้ง',
      confirmButtonText: 'ตกลง',
      allowOutsideClick: false
    }).then(() => redirectToLogin());
  }
});

// ============================================================
// Change Password
// ============================================================
function openChangePasswordModal() {
  document.getElementById('self-new-pass').value = '';
  document.getElementById('self-confirm-pass').value = '';
  document.getElementById('self-new-pass').type = 'password';
  document.getElementById('self-confirm-pass').type = 'password';
  new bootstrap.Modal(document.getElementById('selfChangePassModal')).show();
}

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

async function submitSelfChangePass() {
  const p1 = document.getElementById('self-new-pass').value.trim();
  const p2 = document.getElementById('self-confirm-pass').value.trim();

  // ✅ แทน window.userLogin
  const { token, user, userAccount } = getSession();
  const currentLoginID = userAccount;

  if (!currentLoginID || currentLoginID === 'undefined') {
    Swal.fire('ผิดพลาด', 'ไม่พบข้อมูลบัญชีผู้ใช้ กรุณาลอง Login ใหม่', 'error');
    return;
  }
  if (!p1 || !p2) { Swal.fire('คำเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning'); return; }
  if (p1 !== p2)  { Swal.fire('ผิดพลาด', 'รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน', 'error'); return; }

  const passwordRegex = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
  if (!passwordRegex.test(p1)) {
    Swal.fire({ icon: 'error', title: 'รูปแบบไม่ถูกต้อง',
      text: 'รหัสผ่านต้องเป็นภาษาอังกฤษ ตัวเลข และสัญลักษณ์เท่านั้น', confirmButtonColor: '#d33' });
    return;
  }

  Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  try {
    // ✅ แทน google.script.run.updatePasswordInSheet()
    const res = await callAPI('updateStainRecord', { 
      token,        
      user,         
      data, 
      rowIndex: data.rowIndex 
    });
    Swal.close();

    if (res.success) {
      bootstrap.Modal.getInstance(document.getElementById('selfChangePassModal'))?.hide();

      // ✅ แทน google.script.run.destroyTokenOnServer()
      await callAPI('logout', { token, user });

      Swal.fire({
        icon: 'success', title: 'สำเร็จ',
        text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ระบบจะนำคุณออกจากระบบ',
        confirmButtonText: 'ตกลง', allowOutsideClick: false
      }).then(() => { clearSession(); redirectToLogin(); });
    } else {
      Swal.fire('ล้มเหลว', res.message, 'error');
    }
  } catch (err) {
    Swal.close();
    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
  }
}

// ============================================================
// Init Table
// ============================================================
function initStainTable(callback) {
  Swal.fire({ title: 'กำลังดึงข้อมูล.....', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  const { token, user } = getSession();

  // ✅ แทน google.script.run.getStainSheetData()
  callAPIGet({ action: 'getStainSheetData', token, user })
    .then(data => {
      if (!data || data.length <= 1) {
        Swal.fire('ข้อมูลว่างเปล่า', 'ไม่พบข้อมูลในระบบ', 'info');
        return;
      }
      window.cachedStainData = data;
      renderTableStructure(data);
      if (callback && typeof callback === 'function') callback();
      Swal.close();
    })
    .catch(() => Swal.fire('Error', 'การเชื่อมต่อผิดพลาด', 'error'));
}

// ============================================================
// Render Table
// ============================================================
function renderTableStructure(data) {
  if (!data || data.length === 0) return;

  const rows = data.slice(1);
  rows.reverse();

  const displayCols = [1, 2, 9, 10, 11, 12, 18, 20, 22, 40];

  if ($.fn.DataTable.isDataTable('#stainTable')) $('#stainTable').DataTable().destroy();
  $('#stainTable').empty();

  let headerHtml = '<thead><tr>';
  headerHtml += '<th>Site</th><th>S/N</th><th>Brand</th><th>Staining</th>';
  headerHtml += '<th>Fixing</th><th>Buffer</th>';
  headerHtml += '<th>Undiluted 1<br><small>(mm:ss)</small></th>';
  headerHtml += '<th>Diluted 1<br><small>(mm:ss)</small></th>';
  headerHtml += '<th>Diluted 2<br><small>(mm:ss)</small></th>';
  headerHtml += '<th>Recorded By</th><th class="text-center">Details</th>';
  headerHtml += '</tr></thead><tbody id="stainTableBody"></tbody>';
  $('#stainTable').append(headerHtml);

  let bodyHtml = '';
  rows.forEach((row, idx) => {
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
    order: [],
    language: { url: 'https://cdn.datatables.net/plug-ins/1.13.6/i18n/th.json' }
  });
}

// ============================================================
// Open Record Detail
// ============================================================
function openRecordDetail(rowIndex) {
  rowIndex = parseInt(rowIndex);
  if (!window.cachedStainData || !window.cachedStainData[rowIndex]) return;

  const rowData = window.cachedStainData[rowIndex];
  let html = '<table class="table table-bordered align-middle mb-0" style="border: 2px solid #000; width: 100%;">';
  html += '<tbody>';

  html += '<tr style="border-bottom: 1px solid #000;">';
  html += ' <th colspan="2" class="text-center bg-light" style="border-right: 2px solid #000; font-weight: bold; width: 70%; padding: 8px;">Site</th>';
  html += ' <td class="text-center fw-bold text-primary" style="width: 30%; padding: 8px;">' + (rowData[1] || '-') + '</td>';
  html += '</tr>';
  html += '<tr style="border-bottom: 2px solid #000;">';
  html += ' <th colspan="2" class="text-center bg-light" style="border-right: 2px solid #000; font-weight: bold; padding: 8px;">S/N</th>';
  html += ' <td class="text-center fw-bold text-primary" style="padding: 8px;">' + (rowData[2] || '-') + '</td>';
  html += '</tr>';

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
    html += `<tr style="border-bottom: ${borderBottom};">
      <th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">${item.label}</th>
      <td class="text-center" style="padding: 8px;">${item.val || '-'}</td></tr>`;
  });

  html += '<tr><th rowspan="2" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Stain type</th>';
  html += `<th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Brand</th><td class="text-center">${rowData[9] || '-'}</td></tr>`;
  html += `<tr style="border-bottom: 1px solid #000;"><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Single/Double staining?</th><td class="text-center">${rowData[10] || '-'}</td></tr>`;
  html += `<tr style="border-bottom: 1px solid #000;"><th class="text-center bg-light" style="border-right: 1px solid #000; font-weight: bold;">Fixing</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Stain or Met Fix</th><td class="text-center">${rowData[11] || '-'}</td></tr>`;
  html += `<tr style="border-bottom: 1px solid #000;"><th class="text-center bg-light" style="border-right: 1px solid #000; font-weight: bold;">Buffer type</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Concentrated/Tablet</th><td class="text-center">${rowData[12] || '-'}</td></tr>`;
  html += `<tr><th rowspan="2" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Smear Fan</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Fan 1</th><td class="text-center">${rowData[13] || '-'}</td></tr>`;
  html += `<tr style="border-bottom: 2px solid #000;"><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Fan 2</th><td class="text-center">${rowData[14] || '-'}</td></tr>`;

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

  html += `<tr><th rowspan="4" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Stain Addition Setting</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Methanol</th><td class="text-center">${rowData[26] || '-'} / ${rowData[30] || '0'} Slides</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Undiluted Stain 1</th><td class="text-center">${rowData[27] || '-'} / ${rowData[31] || '0'} Slides</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 1</th><td class="text-center">${rowData[28] || '-'}</td></tr>`;
  html += `<tr style="border-bottom: 2px solid #000;"><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 2</th><td class="text-center">${rowData[29] || '-'}</td></tr>`;

  html += `<tr><th rowspan="4" class="text-center bg-light" style="border-right: 1px solid #000; vertical-align: middle; font-weight: bold;">Stain Replacement Setting</th><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Methanol</th><td class="text-center">${rowData[32] || '-'} / ${rowData[33] || '-'}</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Undiluted Stain 1</th><td class="text-center">${rowData[34] || '-'} / ${rowData[35] || '-'}</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 1</th><td class="text-center">${rowData[36] || '-'} / ${rowData[37] || '-'}</td></tr>`;
  html += `<tr><th class="bg-light" style="border-right: 2px solid #000; font-weight: normal; padding: 8px;">Diluted Stain 2</th><td class="text-center">${rowData[38] || '-'} / ${rowData[39] || '-'}</td></tr>`;

  html += '</tbody></table>';

  let timestamp = '-';
  if (rowData[0]) {
    try {
      const dateObj = new Date(rowData[0]);
      if (!isNaN(dateObj.getTime())) {
        timestamp = dateObj.toLocaleString('th-TH', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
      } else {
        timestamp = rowData[0];
      }
    } catch (e) { timestamp = rowData[0]; }
  }

  const recordedBy = rowData[40] || '-';
  html += `
  <div class="d-flex justify-content-between align-items-center mt-4">
    <div class="text-muted small">
      <div class="mb-1"><i class="bi bi-clock-history me-1 text-primary"></i><strong>Recorded at:</strong> ${timestamp}</div>
      <div><i class="bi bi-person-badge me-1 text-primary"></i><strong>By:</strong> ${recordedBy}</div>
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
  const oldInstance = bootstrap.Modal.getInstance(modalEl);
  if (oldInstance) oldInstance.hide();
  new bootstrap.Modal(modalEl).show();
}

// ============================================================
// Delete Record
// ============================================================
async function deleteRecord(rowIndex) {
  const rowData = window.cachedStainData[rowIndex];
  const { token, user } = getSession();

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
    Swal.fire({ title: 'กำลังลบ...', didOpen: () => Swal.showLoading() });
    try {
      // ✅ แทน google.script.run.deleteStainRecord()
      await callAPI('deleteStainRecord', { token, user, rowIndex });
      Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500 });
      bootstrap.Modal.getInstance(document.getElementById('detailModal'))?.hide();
      initStainTable();
    } catch (err) {
      Swal.fire('Error', err.toString(), 'error');
    }
  }
}

// ============================================================
// Edit Record — form HTML (คงโครงสร้างเดิมทั้งหมด)
// ============================================================
function editRecord(rowIndex) {
  const rowData = window.cachedStainData[rowIndex];

  const formHtml = `
    <div class="main-form-card" style="padding: 10px;">
      <form id="updateForm">
        <input type="hidden" name="rowIndex" id="rowIndex" value="${rowIndex}">
        <input type="hidden" name="id" id="id">

        <h5 class="section-header"><i class="bi bi-info-circle-fill"></i> General Information</h5>
        <div class="info-card-wrapper">
          <div class="row g-3">
            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-hospital me-1"></i> Site / โรงพยาบาล</label>
              <div class="input-group custom-input-group">
                <span class="input-group-text"><i class="bi bi-building"></i></span>
                <input type="text" id="site" name="site" class="form-control" readonly value="${rowData[1] || ''}" style="background-color: #f8fafc; cursor: not-allowed;">
              </div>
            </div>
            <div class="col-md-6">
              <label class="form-label"><i class="bi bi-qr-code-scan me-1"></i> หมายเลขเครื่อง (S/N)</label>
              <div class="input-group custom-input-group">
                <span class="input-group-text"><i class="bi bi-hash"></i></span>
                <input type="text" id="sn" name="sn" class="form-control" placeholder="ระบุ S/N" value="${rowData[2] || ''}">
              </div>
            </div>
          </div>
        </div>

        <h5 class="section-header mt-4"><i class="bi bi-gear-fill"></i> Service Setting</h5>
        <div class="info-card-wrapper">
          <div class="row g-4">
            <div class="col-md-6"><label class="form-label">Prefixing</label><select id="prefixing" name="prefixing" class="form-select" data-source="Prefixing" required><option value="">-- เลือก --</option></select></div>
            <div class="col-md-6"><label class="form-label">Rinsing (rinse water)</label><select id="rinsing" name="rinsing" class="form-select" data-source="Rinsing (rinse water)" required><option value="">-- เลือก --</option></select></div>
            <div class="col-md-6"><label class="form-label">Amount of washing (13-23)</label><input type="number" id="amtWash1" name="amtWash1" class="form-control" oninput="validateAmtWash1(this)" placeholder="13-23" required></div>
            <div class="col-md-6"><label class="form-label">Amount of washing (29-62)</label><input type="number" id="amtWash2" name="amtWash2" class="form-control" oninput="validateAmtWash2(this)" placeholder="29-62" required></div>
            <div class="col-md-6"><label class="form-label">Extended Time (0-60 min)</label><input type="number" id="extTime" name="extTime" class="form-control" min="0" max="60" placeholder="0-60" required></div>
            <div class="col-md-6"><label class="form-label">Preparation method</label><select id="prepMethod" name="prepMethod" class="form-select" data-source="Preparation method of diluted stain 1" required><option value="">-- เลือก --</option></select></div>
          </div>
        </div>

        <h5 class="section-header mt-4"><i class="bi bi-droplet-fill"></i> Stain Type</h5>
        <div class="info-card-wrapper">
          <div class="row g-4">
            <div class="col-md-6"><label class="form-label">Brand</label><select id="mixed" name="mixed" class="form-select" data-source="Brand" required><option value="">-- เลือก Brand --</option></select></div>
            <div class="col-md-6"><label class="form-label">Single/Double Staining</label><select id="stainType" name="stainType" class="form-select" data-source="Single/Double Staining" required onchange="handleStainTypeChange()"><option value="">-- เลือกประเภทการย้อม --</option></select></div>
            <div class="col-md-6"><label class="form-label">Fixing</label><select id="fixing" name="fixing" class="form-select" data-source="Fixing" required onchange="handleFixingChangeEdit()"><option value="">-- เลือกประเภท Fixing --</option></select></div>
            <div class="col-md-6"><label class="form-label">Buffer type</label><input type="text" id="bufferType" name="bufferType" class="form-control" oninput="validateAlphanumeric(this)" placeholder="เช่น WATER, 6.8" required></div>
          </div>
        </div>

        <h5 class="section-header mt-4"><i class="bi bi-wind"></i> Smear Fan</h5>
        <div class="info-card-wrapper">
          <div class="row g-4">
            <div class="col-md-6"><label class="form-label">Fan 1</label><select id="fan1" name="fan1" class="form-select" data-source="Fan 1" required><option value="">-- เลือก --</option></select></div>
            <div class="col-md-6"><label class="form-label">Fan 2</label><select id="fan2" name="fan2" class="form-select" data-source="Fan 2" required><option value="">-- เลือก --</option></select></div>
          </div>
        </div>

        <h5 class="section-header mt-4"><i class="bi bi-sliders"></i> Stain Setting</h5>
        <div class="info-card-wrapper">
          <div class="row g-4">
            <div class="col-md-4" id="edit-container-methanol-prefix"><label class="form-label">Met Prefix</label><select id="methanolPrefix" name="methanolPrefix" class="form-select" data-source="Met Prefix"></select></div>
            <div class="col-md-4" id="edit-container-methanol-fix"><label class="form-label">Met Fix (mm:ss)</label><select id="methanolFix" name="methanolFix" class="form-select" data-source="Met Fix"></select></div>
            <div class="col-md-4" id="edit-container-stain-prefix"><label class="form-label">Stain Prefix</label><select id="stainPrefix" name="stainPrefix" class="form-select" data-source="Stain Prefix"></select></div>
            <div class="col-md-4"><label class="form-label">Undiluted Stain 1</label><select id="undilutedStain1_time" name="undilutedStain1_time" class="form-select" data-source="Undiluted Stain 1" required></select></div>
            <div class="col-md-4"><label class="form-label">Stain 1 Ratio</label><select id="stain1_ratio" name="stain1_ratio" class="form-select" data-source="Stain 1 Dilution Ratio" required></select></div>
            <div class="col-md-4"><label class="form-label">Diluted Stain 1</label><select id="dilutedStain1_time" name="dilutedStain1_time" class="form-select" data-source="Diluted Stain 1" required></select></div>
            <div class="col-md-6"><label class="form-label">Stain 2 Ratio</label><select id="stain2_ratio" name="stain2_ratio" class="form-select" data-source="Stain 2 Dilution Ratio"></select></div>
            <div class="col-md-6"><label class="form-label">Diluted Stain 2</label><select id="dilutedStain2_time" name="dilutedStain2_time" class="form-select" data-source="Diluted Stain 2"></select></div>
            <div class="col-md-4"><label class="form-label">Rinse Count</label><select id="rinseCount" name="rinseCount" class="form-select" data-source="Rinse Count" required></select></div>
            <div class="col-md-4"><label class="form-label">Dry (mm:ss)</label><select id="dryTime" name="dryTime" class="form-select" data-source="Dry" required></select></div>
            <div class="col-md-4"><label class="form-label">Heater Status</label><select id="heaterStatus" name="heaterStatus" class="form-select" data-source="Heater" required></select></div>
          </div>
        </div>

        <h5 class="section-header mt-5"><i class="bi bi-plus-circle-fill"></i> Stain Addition Setting</h5>
        <div class="card border-0 shadow-sm overflow-hidden" style="border-radius: 20px;">
          <div class="card-header bg-white pt-3 border-0">
            <ul class="nav nav-pills card-header-tabs border-0" id="additionTabs">
              <li class="nav-item"><button class="nav-link active" data-bs-toggle="tab" data-bs-target="#add-meth" type="button">Methanol</button></li>
              <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#add-undiluted" type="button">Undiluted Stain 1</button></li>
              <li class="nav-item"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#add-diluted1" type="button">Diluted Stain 1</button></li>
              <li class="nav-item" id="tab-stain2-addition" style="display:none;"><button class="nav-link" data-bs-toggle="tab" data-bs-target="#add-diluted2" type="button">Diluted Stain 2</button></li>
            </ul>
          </div>
          <div class="card-body p-4 bg-light bg-opacity-50">
            <div class="tab-content">
              <div class="tab-pane fade show active" id="add-meth">
                <div class="row g-3">
                  <div class="col-md-6"><label class="form-label small fw-bold">Time (HH:mm)</label><select id="add_meth_time" name="add_meth_time" class="form-select" data-source="Time Options"></select></div>
                  <div class="col-md-6"><label class="form-label small fw-bold">Slides</label><select id="add_meth_slides" name="add_meth_slides" class="form-select" data-source="Slide Options"></select></div>
                </div>
              </div>
              <div class="tab-pane fade" id="add-undiluted">
                <div class="row g-3">
                  <div class="col-md-6"><label class="form-label small fw-bold">Time (HH:mm)</label><select id="add_undiluted_time" name="add_undiluted_time" class="form-select" data-source="Time Options"></select></div>
                  <div class="col-md-6"><label class="form-label small fw-bold">Slides</label><select id="add_undiluted_slides" name="add_undiluted_slides" class="form-select" data-source="Slide Options"></select></div>
                </div>
              </div>
              <div class="tab-pane fade" id="add-diluted1">
                <div class="col-md-6"><label class="form-label small fw-bold">Time (HH:mm)</label><select id="add_diluted_time" name="add_diluted_time" class="form-select" data-source="Enlapsed Option"></select></div>
              </div>
              <div class="tab-pane fade" id="add-diluted2">
                <div class="col-md-6"><label class="form-label small fw-bold">Time (HH:mm)</label><select id="add_diluted2_time" name="add_diluted2_time" class="form-select" data-source="Enlapsed Option"></select></div>
              </div>
            </div>
          </div>
        </div>

        <h5 class="section-header mt-5"><i class="bi bi-arrow-repeat"></i> Stain Replacement Setting</h5>
        <div class="card border-0 shadow-sm overflow-hidden" style="border-radius: 20px;">
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
              ${['meth','undiluted','diluted1','diluted2'].map(k => `
              <div class="tab-pane fade ${k==='meth'?'show active':''}" id="rep-${k}">
                <div class="row g-3 align-items-end">
                  <div class="col-md-6"><label class="form-label small fw-bold text-secondary">Condition</label>
                    <select id="replace_${k}_cond" name="replace_${k}_cond" class="form-select" data-source="Replace Options" style="border-radius:10px;"></select>
                  </div>
                  <div class="col-md-6"><label class="form-label small fw-bold text-secondary">Value (HH:mm)</label>
                    <div class="d-flex align-items-center gap-2 custom-time-picker">
                      <div class="input-group input-group-sm" style="width:110px;">
                        <button class="btn btn-primary" type="button" onclick="stepTime(this,'HH',-1)">-</button>
                        <input type="text" id="replace_${k}_hh" class="form-control text-center bg-white fw-bold" value="00" readonly>
                        <button class="btn btn-primary" type="button" onclick="stepTime(this,'HH',1)">+</button>
                      </div>
                      <span class="fw-bold">:</span>
                      <div class="input-group input-group-sm" style="width:110px;">
                        <button class="btn btn-primary" type="button" onclick="stepTime(this,'mm',-1)">-</button>
                        <input type="text" id="replace_${k}_mm" class="form-control text-center bg-white fw-bold" value="00" readonly>
                        <button class="btn btn-primary" type="button" onclick="stepTime(this,'mm',1)">+</button>
                      </div>
                      <input type="hidden" id="replace_${k}_val" name="replace_${k}_val" value="00:00">
                    </div>
                  </div>
                </div>
              </div>`).join('')}
            </div>
          </div>
        </div>

        <h5 class="section-header mt-5"><i class="bi bi-person-check-fill"></i> Recorded By (ผู้บันทึกการแก้ไข)</h5>
        <div class="card border-0 p-4 mb-4 shadow-sm">
          <div class="row">
            <div class="col-md-12">
              <label class="form-label fw-bold"><i class="bi bi-shield-check me-1"></i> ชื่อผู้แก้ไขข้อมูล</label>
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

  $('#editFormContainer').html(formHtml);
  const modalEl = document.getElementById('editModal');
  const editModal = new bootstrap.Modal(modalEl);
  editModal.show();

  modalEl.addEventListener('shown.bs.modal', function () {
    Swal.fire({ title: 'กำลังโหลด...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    fetchOptionsForEdit().then(() => {
      try {
        fillEditFormStepByStep(rowData, rowIndex);
        initEditReplacementLogic();

        // ✅ แทน window.userName
        const { user } = getSession();
        const recordedByEl = document.getElementById('recordedBy_Edit');
        if (recordedByEl && user) recordedByEl.value = user;

      } catch (err) {
        console.error('Error filling form:', err);
      } finally {
        Swal.close();
      }
    }).catch(() => Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลตัวเลือกได้', 'error'));
  }, { once: true });

  $(document).off('submit', '#updateForm').on('submit', '#updateForm', function (e) {
    e.preventDefault();
    updateData();
  });
}

// ============================================================
// Fixing / StainType handlers (Edit Modal)
// ============================================================
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
    if (addMethTabBtn) bootstrap.Tab.getOrCreateInstance(addMethTabBtn).show();
    if (repMethTabBtn) bootstrap.Tab.getOrCreateInstance(repMethTabBtn).show();
  } else if (val === 'Stain') {
    if (mPreContainer) mPreContainer.style.display = 'none';
    if (mFixContainer) mFixContainer.style.display = 'none';
    if (sPreContainer) sPreContainer.style.display = 'block';
    if (mPre) mPre.disabled = true;
    if (mFix) mFix.disabled = true;
    if (sPre) sPre.disabled = false;
    if (addMethTabBtn) addMethTabBtn.parentElement.style.display = 'none';
    if (repMethTabBtn) repMethTabBtn.parentElement.style.display = 'none';
    const addU = document.querySelector('[data-bs-target="#add-undiluted"]');
    const repU = document.querySelector('[data-bs-target="#rep-undiluted"]');
    if (addU) bootstrap.Tab.getOrCreateInstance(addU).show();
    if (repU) bootstrap.Tab.getOrCreateInstance(repU).show();
  } else {
    [mPreContainer, mFixContainer, sPreContainer].forEach(el => { if (el) el.style.display = 'block'; });
    [mPre, mFix, sPre].forEach(el => { if (el) el.disabled = false; });
    if (addMethTabBtn) addMethTabBtn.parentElement.style.display = 'block';
    if (repMethTabBtn) repMethTabBtn.parentElement.style.display = 'block';
  }
}

function handleStainTypeChange() {
  const stainTypeSelect = document.getElementById('stainType');
  if (!stainTypeSelect) return;
  const isDouble = stainTypeSelect.value.includes('Double');

  ['stain2_ratio', 'dilutedStain2_time', 'add_diluted2_time'].forEach(id => {
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

  const repS2Cond = document.getElementById('replace_diluted2_cond');
  if (repS2Cond) {
    repS2Cond.disabled = !isDouble;
    if (!isDouble) {
      repS2Cond.selectedIndex = 0;
      mapTimeToPickerManual('replace_diluted2_val', '00:00');
    }
  }
}

// ============================================================
// Validation helpers
// ============================================================
function validateAlphanumeric(input) { input.value = input.value.replace(/[^A-Za-z0-9\s\.\(\)\:]/g, ''); }
function validateAmtWash1(input) { let v = parseInt(input.value); if (v > 23) input.value = 23; }
function validateAmtWash2(input) { let v = parseInt(input.value); if (v > 62) input.value = 62; }

// ============================================================
// Time Picker
// ============================================================
let stepTimer = null;

function stepTime(btn, type, amount) {
  const performStep = () => {
    const container = btn.closest('.custom-time-picker');
    const hhInput   = container.querySelector('input[id$="_hh"]');
    const mmInput   = container.querySelector('input[id$="_mm"]');
    const hiddenInput = container.querySelector('input[type="hidden"]');

    if (type === 'HH') {
      let val = parseInt(hhInput.value) + amount;
      if (val < 0) val = 24; else if (val > 24) val = 0;
      hhInput.value = val.toString().padStart(2, '0');
      if (val === 24) mmInput.value = '00';
    } else {
      let val = parseInt(mmInput.value) + amount;
      if (parseInt(hhInput.value) === 24) { val = 0; }
      else { if (val < 0) val = 59; else if (val > 59) val = 0; }
      mmInput.value = val.toString().padStart(2, '0');
    }
    hiddenInput.value = hhInput.value + ':' + mmInput.value;
  };

  const stopStepping = () => {
    clearTimeout(stepTimer); clearInterval(stepTimer);
    btn.removeEventListener('mouseup', stopStepping);
    btn.removeEventListener('mouseleave', stopStepping);
  };

  btn.addEventListener('mouseup', stopStepping);
  btn.addEventListener('mouseleave', stopStepping);
  performStep();
  clearInterval(stepTimer);
  stepTimer = setTimeout(() => { stepTimer = setInterval(performStep, 100); }, 500);
}

// ============================================================
// Replacement UI
// ============================================================
function initEditReplacementLogic() {
  document.querySelectorAll('#editModal select[name$="_cond"]').forEach(select => {
    updateReplacementUI(select);
    select.addEventListener('change', e => updateReplacementUI(e.target));
  });
}

function updateReplacementUI(selectElement, shouldReset = true) {
  const row = selectElement.closest('.row');
  if (!row) return;
  const container = row.querySelector('.custom-time-picker');
  if (!container) return;

  const isNoneValue = (!selectElement.value || selectElement.value === '' || selectElement.value === 'None');
  container.querySelectorAll('button').forEach(btn => btn.disabled = isNoneValue);
  container.querySelectorAll('input').forEach(input => {
    input.disabled = isNoneValue;
    input.style.backgroundColor = isNoneValue ? '#e9ecef' : '#ffffff';
    if (isNoneValue && shouldReset) {
      if (input.type === 'hidden') input.value = '00:00';
      else if (input.classList.contains('form-control')) input.value = '00';
    }
  });
}

// ============================================================
// Fetch Options for Edit
// ============================================================
async function fetchOptionsForEdit() {
  // ✅ แทน google.script.run.getMasterSettings()
  const options = await callAPIGet({ action: 'getMasterSettings' });
  const selects = document.querySelectorAll('#updateForm .form-select[data-source]');
  selects.forEach(select => {
    const source = select.getAttribute('data-source').trim();
    if (options[source]) {
      let html = '<option value="">-- เลือก --</option>';
      options[source].forEach(val => {
        if (val !== null && val !== '') html += `<option value="${val}">${val}</option>`;
      });
      select.innerHTML = html;
    }
  });
}

// ============================================================
// Fill Edit Form
// ============================================================
function fillEditFormStepByStep(rowData, rowIndex) {
  const setValById = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    const val = (value === undefined || value === null) ? '' : String(value).trim();
    if (el.tagName === 'SELECT' && val !== '' && val !== '-') {
      const exists = Array.from(el.options).some(opt => opt.value === val);
      if (!exists) el.add(new Option(val, val, true, true));
    }
    el.value = val;
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  try {
    setValById('rowIndex', rowIndex);
    setValById('id', rowData[0]);

    const fields = [
      'id','site','sn','prefixing','rinsing','amtWash1','amtWash2','extTime',
      'prepMethod','mixed','stainType','fixing','bufferType','fan1','fan2',
      'methanolPrefix','methanolFix','stainPrefix','undilutedStain1_time',
      'stain1_ratio','dilutedStain1_time','stain2_ratio','dilutedStain2_time',
      'rinseCount','dryTime','heaterStatus','add_meth_time','add_undiluted_time',
      'add_diluted_time','add_diluted2_time','add_meth_slides','add_undiluted_slides'
    ];
    fields.forEach((id, idx) => { if (idx < rowData.length) setValById(id, rowData[idx]); });

    const replacementConfigs = [
      { condId: 'replace_meth_cond',      valId: 'replace_meth_val',      cIdx: 32, tIdx: 33 },
      { condId: 'replace_undiluted_cond', valId: 'replace_undiluted_val', cIdx: 34, tIdx: 35 },
      { condId: 'replace_diluted1_cond',  valId: 'replace_diluted1_val',  cIdx: 36, tIdx: 37 },
      { condId: 'replace_diluted2_cond',  valId: 'replace_diluted2_val',  cIdx: 38, tIdx: 39 }
    ];

    replacementConfigs.forEach(item => {
      const condVal = String(rowData[item.cIdx] || '').trim();
      let timeVal   = String(rowData[item.tIdx] || '00:00').trim();
      const cleanCond = (condVal === '-' || condVal === '' || condVal === 'None') ? 'None' : condVal;
      if (timeVal.includes(':')) {
        const parts = timeVal.split(':');
        timeVal = parts[0].padStart(2,'0') + ':' + parts[1].padStart(2,'0');
      } else { timeVal = '00:00'; }
      setValById(item.condId, cleanCond);
      mapTimeToPickerManual(item.valId, timeVal);
    });

    // ✅ แทน window.userName
    const { user } = getSession();
    setValById('recordedBy_Edit', user);

    setTimeout(() => {
      replacementConfigs.forEach(item => {
        const selectEl = document.getElementById(item.condId);
        if (selectEl) updateReplacementUI(selectEl, false);
      });
      handleFixingChangeEdit();
      handleStainTypeChange();
    }, 200);

  } catch (e) { console.error('Error in fillEditFormStepByStep:', e); }
}

function mapTimeToPickerManual(valInputId, timeStr) {
  const prefix = valInputId.replace('_val', '');
  const hhEl  = document.getElementById(prefix + '_hh');
  const mmEl  = document.getElementById(prefix + '_mm');
  const valEl = document.getElementById(valInputId);
  if (timeStr && timeStr.includes(':')) {
    let [hh, mm] = timeStr.split(':');
    hh = hh.trim().padStart(2,'0');
    mm = mm.trim().padStart(2,'0');
    if (hhEl) hhEl.value = hh;
    if (mmEl) mmEl.value = mm;
    if (valEl) valEl.value = hh + ':' + mm;
  }
}

// ============================================================
// Tab Error Helper
// ============================================================
function showTabErrorEdit(pane, customMsg) {
  const tabTrigger = document.querySelector(`[data-bs-target="#${pane.id}"]`);
  if (tabTrigger) bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
  Swal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน',
    text: customMsg || 'กรุณาตรวจสอบและเลือกข้อมูลให้ครบในหน้านี้', confirmButtonColor: '#3085d6' });
}

// ============================================================
// Update Data
// ============================================================
async function updateData() {
  const form = document.getElementById('updateForm');
  const recordedByValue = document.getElementById('recordedBy_Edit')?.value || '';

  // sync time pickers → hidden inputs
  ['replace_meth','replace_undiluted','replace_diluted1','replace_diluted2'].forEach(prefix => {
    const hh = document.getElementById(`${prefix}_hh`)?.value || '00';
    const mm = document.getElementById(`${prefix}_mm`)?.value || '00';
    const hidden = document.getElementById(`${prefix}_val`);
    if (hidden) hidden.value = `${hh.padStart(2,'0')}:${mm.padStart(2,'0')}`;
  });

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  data.recordedBy = recordedByValue;

  // ✅ แทน window.token / window.userLogin
  const { token, user } = getSession();
  data.token    = token;
  data.user     = user;

  const stainType = data.stainType || '';
  const fixingVal = data.fixing    || '';

  // Validation
  const allInputs = form.querySelectorAll('select:not([disabled]), input:not([disabled]):not([type="hidden"]):not([type="button"])');
  for (let el of allInputs) {
    const val = el.value ? el.value.trim() : '';
    if (el.id.includes('2') && !stainType.includes('Double')) continue;
    if (el.id.includes('meth') && fixingVal === 'Stain') continue;
    if (val === 'Loading...') continue;
    if (!val || val.includes('--')) {
      const label = el.closest('.mb-3')?.querySelector('.form-label')?.innerText
                 || el.closest('div')?.querySelector('.form-label')?.innerText
                 || 'ข้อมูลบางส่วน';
      const pane = el.closest('.tab-pane');
      if (pane) showTabErrorEdit(pane, `กรุณาระบุ: ${label}`);
      else { Swal.fire({ icon:'warning', title:'ข้อมูลไม่ครบถ้วน', text:`กรุณากรอกหรือเลือก: ${label}`, confirmButtonColor:'#3085d6' }); el.focus(); }
      return;
    }
    if (el.name && el.name.endsWith('_val')) {
      const condSelect = form.querySelector(`select[name="${el.name.replace('_val','_cond')}"]`);
      if (condSelect && condSelect.value !== 'None' && condSelect.value !== '' && val === '00:00') {
        showTabErrorEdit(el.closest('.tab-pane'), 'กรุณาระบุเวลาให้ถูกต้อง (ห้ามเป็น 00:00 เมื่อมีการตั้งเงื่อนไข)');
        return;
      }
    }
  }

  // Data cleanup
  if (!stainType.includes('Double')) {
    data.stain2_ratio = '-'; data.dilutedStain2_time = '-';
    data.add_diluted2_time = '-'; data.replace_diluted2_cond = 'None'; data.replace_diluted2_val = '00:00';
  }
  if (fixingVal === 'Stain') {
    data.methanolPrefix = '-'; data.methanolFix = '-';
    data.add_meth_time = '-'; data.add_meth_slides = '-';
    data.replace_meth_cond = 'None'; data.replace_meth_val = '00:00';
  } else if (fixingVal === 'Methanol') {
    data.stainPrefix = '-';
  }

  const confirmed = await Swal.fire({
    title: 'ยืนยันการแก้ไข?', text: 'คุณต้องการบันทึกการเปลี่ยนแปลงใช่หรือไม่?',
    icon: 'question', showCancelButton: true,
    confirmButtonColor: '#3085d6', confirmButtonText: 'บันทึก', cancelButtonText: 'ยกเลิก'
  });

  if (!confirmed.isConfirmed) return;

  Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  try {
    const response = await callAPI('updateStainRecord', {
      token,              // ✅ body.token — doPost อ่านได้โดยตรง
      user,               // ✅ body.user — doPost อ่านได้โดยตรง
      data,               // body.data — ส่งไปให้ updateStainRecord()
      rowIndex: data.rowIndex
    });

    if (response.result === 'Success') {
      Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'แก้ไขข้อมูลเรียบร้อยแล้ว', timer: 1500, showConfirmButton: false });

      const editModalEl = document.getElementById('editModal');
      bootstrap.Modal.getInstance(editModalEl)?.hide();

      initStainTable(function () {
        setTimeout(() => openRecordDetail(data.rowIndex), 300);
      });
    } else {
      Swal.fire('เกิดข้อผิดพลาด', response.result || 'ไม่ทราบสาเหตุ', 'error');
    }
  } catch (err) {
    Swal.fire('Error', err.toString(), 'error');
  }
}

// ============================================================
// PDF Export (คงเดิม ไม่มีการเปลี่ยนแปลง)
// ============================================================
async function downloadPDF() {
  const jsPDFLib = window.jspdf ? window.jspdf.jsPDF : window.jsPDF;
  if (!jsPDFLib) { Swal.fire('Error', 'ไม่สามารถโหลด Library สำหรับสร้าง PDF ได้', 'error'); return; }

  const element = document.getElementById('detailBody');
  if (!element) return;

  Swal.fire({ title: 'กำลังสร้างรายงาน PDF...', text: 'กำลังจัดระเบียบตารางและภาษาไทย',
    allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  try {
    const clone = element.cloneNode(true);
    clone.querySelectorAll('button, .modal-footer, .btn-close').forEach(el => el.remove());

    clone.querySelectorAll('table').forEach(table => {
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.backgroundColor = '#ffffff';
      table.querySelectorAll('th, td').forEach(cell => {
        cell.style.border = '0.5px solid #000';
        cell.style.padding = '6px';
        cell.style.backgroundColor = '#ffffff';
        cell.style.verticalAlign = 'middle';
        if (cell.rowSpan > 1) {
          cell.style.zIndex = '10';
          cell.style.position = 'relative';
          cell.style.backgroundColor = '#ffffff';
        }
      });
    });

    clone.style.cssText = 'position:fixed;top:0;left:-9999px;width:800px;';
    document.body.appendChild(clone);

    const canvas = await html2canvas(clone, { scale: 1.5, useCORS: true, logging: false, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/jpeg', 0.7);

    const pdf = new jsPDFLib({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const pageWidth  = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const maxWidth = pageWidth - (margin * 2);
    const maxHeight = pageHeight - (margin * 2);

    let finalWidth  = maxWidth;
    let finalHeight = (canvas.height * maxWidth) / canvas.width;
    if (finalHeight > maxHeight) { finalHeight = maxHeight; finalWidth = (canvas.width * maxHeight) / canvas.height; }

    const xOffset = (pageWidth - finalWidth) / 2;
    pdf.addImage(imgData, 'JPEG', xOffset, margin, finalWidth, finalHeight, undefined, 'FAST');

    const siteName = element.querySelector('td:nth-child(2)')?.innerText || 'Report';
    pdf.save(`Stain_Report_${siteName.trim()}.pdf`);
    document.body.removeChild(clone);
    Swal.close();
  } catch (error) {
    console.error('PDF Error:', error);
    Swal.fire('Error', 'เกิดข้อผิดพลาดในการสร้างไฟล์ PDF', 'error');
  }
}
