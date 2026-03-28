// ============================================================
// script-admin.js
// ============================================================

// ============================================================
// Guard: ตรวจสิทธิ์จาก localStorage แทน URL params
// (แทนบล็อก IIFE ที่เช็ค window.userDept และ window.scriptUrl)
// ============================================================
document.addEventListener('DOMContentLoaded', function () {
  const { dept } = getSession();
  if (dept === 'Service Engineer') {
    Swal.fire({
      icon: 'error',
      title: 'Access Denied',
      text: 'สิทธิ์ระดับนี้ไม่สามารถเข้าถึงหน้านี้ได้',
      confirmButtonText: 'ตกลง'
    }).then(() => {
      window.location.href = '/stainmasterlist/datatable.html';
    });
  }
});

// ============================================================
// Init
// ============================================================
window.onload = function () {
  refreshData();
};

// ============================================================
// Helpers
// ============================================================
function showLoading(msg = 'กำลังดำเนินการ...') {
  Swal.fire({ title: msg, allowOutsideClick: false, didOpen: () => Swal.showLoading() });
}

// ============================================================
// Dropdown Management
// ============================================================
async function refreshData() {
  showLoading('กำลังโหลดข้อมูล...');

  try {
    // ✅ แทน google.script.run.getMasterSettings()
    const options = await callAPIGet({ action: 'getMasterSettings' });

    const headerSelect = document.getElementById('headerSelect');
    const displayArea  = document.getElementById('displayArea');

    headerSelect.innerHTML = '';
    displayArea.innerHTML  = '';

    for (let header in options) {
      const opt = document.createElement('option');
      opt.value = header;
      opt.text  = header;
      headerSelect.appendChild(opt);

      let html = `
        <div class="col-md-4 col-lg-3">
          <div class="data-card">
            <div class="data-card-header"><span title="${header}">${header}</span></div>
            <div class="card-body p-0 card-scroll-area" style="max-height: 250px; overflow-y: auto;">
              <ul class="list-group list-group-flush">`;

      options[header].forEach(item => {
        if (item !== '') {
          html += `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span class="text-truncate">${item}</span>
              <div class="btn-group action-icons">
                <i class="bi bi-pencil-square text-primary me-2" role="button" onclick="editOption('${header}', '${item}')"></i>
                <i class="bi bi-trash3 text-danger" role="button" onclick="deleteOption('${header}', '${item}')"></i>
              </div>
            </li>`;
        }
      });

      html += `</ul></div></div></div>`;
      displayArea.innerHTML += html;
    }

    Swal.close();
  } catch (err) {
    Swal.fire('Error', 'โหลดข้อมูลล้มเหลว: ' + err, 'error');
  }
}

async function saveNewOption() {
  const head = document.getElementById('headerSelect').value;
  const val  = document.getElementById('newValue').value.trim();

  if (!val) {
    Swal.fire('คำเตือน', 'กรุณากรอกข้อมูลที่ต้องการเพิ่ม', 'warning');
    return;
  }

  showLoading('กำลังบันทึกข้อมูล...');

  try {
    // ✅ แทน google.script.run.addOptionToSheet()
    const { token, user } = getSession();
    const res = await callAPI('addOption', { token, user, header: head, value: val });
    document.getElementById('newValue').value = '';
    Swal.fire({ icon: 'success', title: 'สำเร็จ', text: res.message, timer: 1500, showConfirmButton: false })
      .then(() => refreshData());
  } catch (err) {
    Swal.fire('Error', 'บันทึกไม่สำเร็จ: ' + err, 'error');
  }
}

async function editOption(head, oldVal) {
  const result = await Swal.fire({
    title: 'แก้ไขข้อมูล',
    html: `แก้ไขค่าในหัวข้อ: <b>${head}</b>`,
    input: 'text',
    inputValue: oldVal,
    showCancelButton: true,
    confirmButtonText: 'บันทึกการแก้ไข',
    cancelButtonText: 'ยกเลิก',
    confirmButtonColor: '#0d6efd',
    inputValidator: v => { if (!v || v.trim() === '') return 'กรุณากรอกข้อมูลใหม่!'; }
  });

  if (result.isConfirmed) {
    showLoading('กำลังอัปเดต...');
    try {
      // ✅ แทน google.script.run.editOptionInSheet()
      const { token, user } = getSession();
      await callAPI('editOption', { token, user, header: head, oldValue: oldVal, newValue: result.value });
      Swal.fire({ icon: 'success', title: 'แก้ไขเรียบร้อย', timer: 1500, showConfirmButton: false })
        .then(() => refreshData());
    } catch (err) {
      Swal.fire('Error', 'แก้ไขไม่สำเร็จ: ' + err, 'error');
    }
  }
}

async function deleteOption(head, val) {
  const result = await Swal.fire({
    title: 'ยืนยันการลบ?',
    text: `คุณต้องการลบ "${val}" ออกจากหัวข้อ "${head}" ใช่หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#dc3545',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'ใช่, ลบเลย',
    cancelButtonText: 'ยกเลิก'
  });

  if (result.isConfirmed) {
    showLoading('กำลังลบข้อมูล...');
    try {
      // ✅ แทน google.script.run.deleteOptionFromSheet()
      const { token, user } = getSession();
      await callAPI('deleteOption', { token, user, header: head, value: val });
      Swal.fire({ icon: 'success', title: 'ลบข้อมูลสำเร็จ', timer: 1000, showConfirmButton: false })
        .then(() => refreshData());
    } catch (err) {
      Swal.fire('Error', 'ลบไม่สำเร็จ: ' + err, 'error');
    }
  }
}

// ============================================================
// User Management
// ============================================================
function openManageUserModal() {
  const { dept } = getSession();
  if (dept !== 'Admin') {
    Swal.fire({ icon: 'warning', title: 'สิทธิ์ไม่เพียงพอ',
      text: 'เฉพาะ Admin เท่านั้นที่สามารถจัดการผู้ใช้งานได้', confirmButtonColor: '#3085d6' });
    return;
  }
  const modalElem = document.getElementById('userModal');
  let userModal = bootstrap.Modal.getInstance(modalElem);
  if (!userModal) userModal = new bootstrap.Modal(modalElem);
  userModal.show();
  loadUserData();
}

async function loadUserData() {
  showLoading('กำลังโหลดข้อมูลผู้ใช้งาน...');

  try {
    // ✅ แทน google.script.run.getUserList()
    const { token, user } = getSession();
    const users = await callAPIGet({ action: 'getUserList', token, user });

    const area = document.getElementById('userTableArea');
    let html = `
      <div class="table-responsive">
        <table class="table table-hover align-middle border">
          <thead class="table-light">
            <tr><th>Username</th><th>Name</th><th>Dept</th><th class="text-center">Action</th></tr>
          </thead>
          <tbody>`;

    users.forEach(u => {
      const isAdmin = (u.dept === 'Admin');
      html += `
        <tr>
          <td><code>${u.username}</code></td>
          <td>${u.name}</td>
          <td><span class="badge bg-info text-dark">${u.dept}</span></td>
          <td class="text-center">
            <button class="btn btn-sm btn-outline-primary me-1" onclick="editUserPassword('${u.username}')" title="เปลี่ยนรหัสผ่าน">
              <i class="bi bi-key"></i>
            </button>
            ${!isAdmin
              ? `<button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${u.username}')"><i class="bi bi-trash"></i></button>`
              : `<button class="btn btn-sm btn-light text-muted" disabled><i class="bi bi-trash"></i></button>`}
          </td>
        </tr>`;
    });

    html += `</tbody></table></div>`;
    area.innerHTML = html;
    Swal.close();
  } catch (err) {
    Swal.fire('Error', 'โหลด User ล้มเหลว: ' + err, 'error');
  }
}

async function deleteUser(username) {
  const result = await Swal.fire({
    title: 'ยืนยันการลบ?',
    text: `คุณต้องการลบผู้ใช้ "${username}" ใช่หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    confirmButtonText: 'ใช่, ลบเลย'
  });

  if (result.isConfirmed) {
    showLoading('กำลังลบ...');
    try {
      // ✅ แทน google.script.run.deleteUserFromSheet()
      const { token, user } = getSession();
      await callAPI('deleteUser', { token, user, username });
      Swal.fire('สำเร็จ', 'ลบผู้ใช้งานเรียบร้อย', 'success');
      loadUserData();
    } catch (err) {
      Swal.fire('Error', err.toString(), 'error');
    }
  }
}

async function submitUserForm() {
  const targetUser = document.getElementById('target-username').value.trim();
  const pass       = document.getElementById('target-password').value.trim();
  const name       = document.getElementById('target-name').value.trim();
  const dept       = document.getElementById('target-dept').value;
  const isEdit     = document.getElementById('target-username').readOnly;

  if (!targetUser || !pass || (!isEdit && !name)) {
    Swal.fire('คำเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    return;
  }

  const passwordRegex = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
  if (!passwordRegex.test(pass)) {
    Swal.fire({ icon: 'error', title: 'รูปแบบรหัสผ่านไม่ถูกต้อง',
      text: 'รหัสผ่านต้องเป็นภาษาอังกฤษ ตัวเลข และสัญลักษณ์เท่านั้น', confirmButtonColor: '#d33' });
    return;
  }

  showLoading('กำลังบันทึกข้อมูล...');

  try {
    const { token, user } = getSession();

    if (isEdit) {
      // ✅ แทน google.script.run.updatePasswordInSheet() (admin เปลี่ยนให้คนอื่น)
      await callAPI('updatePassword', { token, user, targetUser, newPass: pass });
      Swal.fire('สำเร็จ', 'เปลี่ยนรหัสผ่านเรียบร้อย', 'success');
    } else {
      // ✅ แทน google.script.run.addUserToSheet()
      const res = await callAPI('addUser', { token, user,
        userData: { username: targetUser, password: pass, name, dept } });
      if (res.success) {
        Swal.fire('สำเร็จ', 'เพิ่มผู้ใช้ใหม่เรียบร้อย', 'success');
      } else {
        Swal.fire('ล้มเหลว', res.message, 'error');
        return;
      }
    }

    toggleUserForm(false);
    loadUserData();
  } catch (err) {
    Swal.fire('Error', err.toString(), 'error');
  }
}

function toggleUserForm(show, isEdit = false, username = '') {
  const formArea      = document.getElementById('userFormArea');
  const btnAdd        = document.getElementById('btnAddNewUser');
  const title         = document.getElementById('formTitle');
  const passwordInput = document.getElementById('target-password');
  const eyeIcon       = document.getElementById('eyeIcon');

  // รีเซ็ตสถานะ password input ทุกครั้ง
  if (passwordInput) {
    passwordInput.type = 'password';
    if (eyeIcon) { eyeIcon.classList.remove('bi-eye-slash-fill'); eyeIcon.classList.add('bi-eye-fill'); }
  }

  if (show) {
    $(formArea).slideDown(300);
    btnAdd.style.display = 'none';
    title.innerText = isEdit ? `เปลี่ยนรหัสผ่าน: ${username}` : 'เพิ่มผู้ใช้งานใหม่';

    document.getElementById('target-username').value    = username;
    document.getElementById('target-username').readOnly = isEdit;
    document.getElementById('target-password').value    = '';

    const extraFields = document.getElementById('extraFields');
    if (isEdit) {
      $(extraFields).hide();
    } else {
      $(extraFields).show();
      document.getElementById('target-name').value = '';
    }
    document.getElementById('target-password').focus();
  } else {
    $(formArea).slideUp(200);
    btnAdd.style.display = 'inline-block';
  }
}

function editUserPassword(username) {
  toggleUserForm(true, true, username);
}

function togglePasswordVisibility() {
  const input   = document.getElementById('target-password');
  const eyeIcon = document.getElementById('eyeIcon');
  if (input.type === 'password') {
    input.type = 'text';
    eyeIcon.classList.replace('bi-eye-fill', 'bi-eye-slash-fill');
  } else {
    input.type = 'password';
    eyeIcon.classList.replace('bi-eye-slash-fill', 'bi-eye-fill');
  }
}

// ============================================================
// Change Password (ตัวเอง)
// ============================================================
function openChangePasswordModal() {
  document.getElementById('self-new-pass').value    = '';
  document.getElementById('self-confirm-pass').value = '';
  document.getElementById('self-new-pass').type     = 'password';
  document.getElementById('self-confirm-pass').type = 'password';
  new bootstrap.Modal(document.getElementById('selfChangePassModal')).show();
}

function toggleSelfPassword(inputId, btn) {
  const input = document.getElementById(inputId);
  const icon  = btn.querySelector('i');
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
    const res = await callAPI('updatePassword', { token, user, targetUser: currentLoginID, newPass: p1 });
    Swal.close();

    if (res.success) {
      bootstrap.Modal.getInstance(document.getElementById('selfChangePassModal'))?.hide();

      // ✅ แทน google.script.run.destroyTokenOnServer()
      await callAPI('logout', { token, user });

      Swal.fire({
        icon: 'success', title: 'สำเร็จ',
        text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ระบบจะนำคุณออกจากระบบเพื่อเข้าสู่ระบบใหม่',
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
// Audit Log
// ============================================================
function openLogModal() {
  const { dept } = getSession();
  if (dept !== 'Admin') {
    Swal.fire('สิทธิ์ไม่เพียงพอ', 'เฉพาะ Admin เท่านั้นที่ดู Log ได้', 'warning');
    return;
  }
  new bootstrap.Modal(document.getElementById('logModal')).show();
}

document.getElementById('logModal').addEventListener('shown.bs.modal', function () {
  loadLogData();
});

async function loadLogData() {
  const tableId = '#logTable';
  if (typeof $.fn.DataTable === 'undefined') return;

  if ($.fn.DataTable.isDataTable(tableId)) {
    $(tableId).DataTable().clear().destroy();
    $(tableId).find('tbody').html(
      '<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><br>กำลังโหลดข้อมูลล่าสุด...</td></tr>'
    );
  }

  try {
    // ✅ แทน google.script.run.getEditLogs()
    const { token, user, dept } = getSession();
    const logs = await callAPIGet({ action: 'getEditLogs', token, user, dept });

    $('#logTable').DataTable({
      data: logs,
      columns: [
        { data: 0, render: d => d ? new Date(d).toLocaleString('th-TH') : '' },
        { data: 1 },
        { data: 2 },
        { data: 3, render: d => `<span class="badge bg-info text-dark">${d}</span>` },
        { data: 4 },
        { data: 5, render: d => `<div style="white-space: pre-line; font-size: 0.85rem; line-height: 1.4;">${d}</div>` }
      ],
      order: [[0, 'desc']],
      responsive: true,
      autoWidth: false,
      language: { url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/th.json' }
    });

    setTimeout(() => { $(tableId).DataTable().columns.adjust(); }, 300);
  } catch (err) {
    Swal.fire('Error', 'ไม่สามารถรีเฟรชข้อมูลได้: ' + err, 'error');
  }
}
