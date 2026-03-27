// ============================================================
// script-newrecord.js
// ============================================================

window.onload = async function () {
  Swal.fire({
    title: 'กำลังโหลดข้อมูล...',
    allowOutsideClick: false,
    didOpen: () => { Swal.showLoading(); }
  });

  try {
    // ✅ แทน google.script.run.getMasterSettings()
    const options = await callAPIGet({ action: 'getMasterSettings' });

    Swal.close();

    if (options.Error) {
      Swal.fire('Error', 'โหลดข้อมูลไม่สำเร็จ: ' + options.Error, 'error');
      return;
    }

    // populate dropdowns
    const selects = document.querySelectorAll('select[data-source]');
    selects.forEach(select => {
      const headerName = select.getAttribute('data-source').trim();
      if (options[headerName]) {
        select.innerHTML = '<option value="">-- เลือก --</option>';
        options[headerName].forEach(val => {
          if (val !== null && val !== '') {
            const opt = document.createElement('option');
            opt.value = val;
            opt.text = val;
            select.appendChild(opt);
          }
        });
      }
    });

    handleStainTypeChange();
    handleFixingChange();
    initReplacementLogic();

    // ดักจับ hidden input เวลา 00:00 → แปลงเป็น 24:00
    document.querySelectorAll('input[name$="_val"]').forEach(input => {
      input.addEventListener('change', function () {
        if (this.value === '00:00' || this.value === '0:00') {
          Swal.fire({
            icon: 'info',
            title: 'คำแนะนำการระบุเวลา',
            text: 'สำหรับเวลาเที่ยงคืน (00:00) ระบบจะปรับเป็น 24:00 ให้โดยอัตโนมัติครับ',
            confirmButtonColor: '#3085d6'
          });
          this.value = '24:00';
          const container = this.closest('.custom-time-picker');
          if (container) {
            const hhInput = container.querySelector('input[id$="_hh"]');
            const mmInput = container.querySelector('input[id$="_mm"]');
            if (hhInput) hhInput.value = '24';
            if (mmInput) mmInput.value = '00';
          }
          this.style.border = '';
        }
      });
    });

  } catch (err) {
    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อ Server ได้: ' + err, 'error');
  }

  // event listeners
  const stainTypeSelect = document.getElementsByName('stainType')[0];
  if (stainTypeSelect) stainTypeSelect.addEventListener('change', handleStainTypeChange);

  const fixingSelect = document.getElementsByName('fixing')[0];
  if (fixingSelect) fixingSelect.addEventListener('change', handleFixingChange);

  // ✅ แทน window.userName — อ่านจาก localStorage ผ่าน getSession()
  const { user } = getSession();
  const recordedInput = document.getElementById('recordedBy_Input');
  if (recordedInput && user) recordedInput.value = user;
};

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

  // ✅ แทน window.userLogin — อ่านจาก localStorage
  const { token, user, userAccount } = getSession();
  const currentLoginID = userAccount;

  if (!currentLoginID || currentLoginID === 'undefined') {
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

  Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  try {
    // ✅ แทน google.script.run.updatePasswordInSheet()
    const res = await callAPI('updatePassword', {
      token, user,
      targetUser: currentLoginID,
      newPass: p1
    });

    Swal.close();

    if (res.success) {
      const modalEl = document.getElementById('selfChangePassModal');
      bootstrap.Modal.getInstance(modalEl)?.hide();

      // ✅ แทน google.script.run.destroyTokenOnServer()
      await callAPI('logout', { token, user });

      Swal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'เปลี่ยนรหัสผ่านเรียบร้อยแล้ว ระบบจะนำคุณออกจากระบบเพื่อเข้าสู่ระบบใหม่',
        confirmButtonText: 'ตกลง',
        allowOutsideClick: false
      }).then(() => {
        clearSession();
        redirectToLogin();
      });

    } else {
      Swal.fire('ล้มเหลว', res.message, 'error');
    }
  } catch (err) {
    Swal.close();
    Swal.fire('Error', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้', 'error');
  }
}

// ============================================================
// Time Picker
// ============================================================
let stepTimer = null;

function stepTime(btn, type, amount) {
  const performStep = () => {
    const container = btn.closest('.custom-time-picker');
    const hhInput = container.querySelector('input[id$="_hh"]');
    const mmInput = container.querySelector('input[id$="_mm"]');
    const hiddenInput = container.querySelector('input[type="hidden"]');

    if (type === 'HH') {
      let val = parseInt(hhInput.value) + amount;
      if (val < 0) val = 23;
      else if (val > 23) val = 0;
      hhInput.value = val.toString().padStart(2, '0');
    } else {
      let val = parseInt(mmInput.value) + amount;
      if (val < 0) val = 59;
      else if (val > 59) val = 0;
      mmInput.value = val.toString().padStart(2, '0');
    }
    hiddenInput.value = hhInput.value + ':' + mmInput.value;
  };

  const stopStepping = () => {
    clearTimeout(stepTimer);
    clearInterval(stepTimer);
    btn.removeEventListener('mouseup', stopStepping);
    btn.removeEventListener('mouseleave', stopStepping);
  };

  btn.addEventListener('mouseup', stopStepping);
  btn.addEventListener('mouseleave', stopStepping);

  performStep();
  clearInterval(stepTimer);
  stepTimer = setTimeout(() => {
    stepTimer = setInterval(performStep, 100);
  }, 500);
}

function isValidTime(timeStr) {
  return /^([0-9]{1,2}):([0-5][0-9])$/.test(timeStr);
}

// ============================================================
// Replacement Logic
// ============================================================
function toggleReplacementInput(selectElement) {
  if (!selectElement) return;
  const row = selectElement.closest('.row');
  const container = row.querySelector('.custom-time-picker');
  if (!container) return;

  const isNone = (selectElement.value === '' || selectElement.value === 'None');
  container.querySelectorAll('button').forEach(btn => btn.disabled = isNone);
  container.querySelectorAll('input').forEach(input => {
    input.disabled = isNone;
    if (isNone) {
      if (input.type !== 'hidden') input.value = '00';
      else input.value = '00:00';
      input.style.backgroundColor = '#e9ecef';
    } else {
      input.style.backgroundColor = '#ffffff';
    }
  });
}

function initReplacementLogic() {
  document.querySelectorAll('select[name$="_cond"]').forEach(select => {
    toggleReplacementInput(select);
  });
}

// ============================================================
// Stain Type / Fixing
// ============================================================
function handleStainTypeChange() {
  const stainTypeSelect = document.getElementsByName('stainType')[0];
  if (!stainTypeSelect) return;
  const isDouble = (stainTypeSelect.value === 'Double Stain');

  ['select[name="stain2_ratio"]', 'select[name="dilutedStain2_time"]'].forEach(selector => {
    const el = document.querySelector(selector);
    if (el) {
      const col = el.closest('[class*="col-"]');
      if (col) col.style.display = isDouble ? 'block' : 'none';
      el.disabled = !isDouble;
      if (!isDouble) el.value = '';
    }
  });

  const tab2Addition = document.getElementById('tab-stain2');
  const tab2Replace  = document.getElementById('tab-replace-stain2');
  if (tab2Addition) tab2Addition.style.display = isDouble ? 'block' : 'none';
  if (tab2Replace)  tab2Replace.style.display  = isDouble ? 'block' : 'none';

  if (!isDouble) {
    document.querySelector('#additionTabs button:first-child')?.click();
    document.querySelector('#replacementTabs button:first-child')?.click();
  }
}

function handleFixingChange() {
  const fixingSelect = document.getElementById('fixing');
  if (!fixingSelect) return;
  const fixingVal = fixingSelect.value;

  const methPreContainer = document.getElementById('container-methanol-prefix');
  const methFixContainer = document.getElementById('container-methanol-fix');
  const stainPreContainer = document.getElementById('container-stain-prefix');
  const methPreSelect    = document.getElementById('methanolPrefix');
  const methFixSelect    = document.getElementById('methanolFix');
  const stainPreSelect   = document.getElementById('stainPrefix');

  if (!methPreContainer || !methFixContainer || !stainPreContainer) return;

  const methTabInputs = document.querySelectorAll('#add-meth select, #add-meth input, #rep-meth select, #rep-meth input');

  if (fixingVal === 'Methanol') {
    methPreContainer.style.display = 'block';
    methFixContainer.style.display = 'block';
    stainPreContainer.style.display = 'none';

    document.querySelector('[data-bs-target="#add-meth"]').parentElement.style.display = 'block';
    document.querySelector('[data-bs-target="#rep-meth"]').parentElement.style.display = 'block';
    methTabInputs.forEach(input => input.disabled = false);

    bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#add-meth"]')).show();
    bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#rep-meth"]')).show();

    methPreSelect.required = true;
    methFixSelect.required = true;
    stainPreSelect.required = false;
    stainPreSelect.value = '';

  } else if (fixingVal === 'Stain') {
    methPreContainer.style.display = 'none';
    methFixContainer.style.display = 'none';
    stainPreContainer.style.display = 'block';

    document.querySelector('[data-bs-target="#add-meth"]').parentElement.style.display = 'none';
    document.querySelector('[data-bs-target="#rep-meth"]').parentElement.style.display = 'none';
    methTabInputs.forEach(input => {
      input.disabled = true;
      if (input.type !== 'button') input.value = '';
    });

    bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#add-undiluted"]')).show();
    bootstrap.Tab.getOrCreateInstance(document.querySelector('[data-bs-target="#rep-undiluted"]')).show();

    methPreSelect.required = false; methPreSelect.value = '';
    methFixSelect.required = false; methFixSelect.value = '';
    stainPreSelect.required = true;

  } else {
    methPreContainer.style.display = 'block';
    methFixContainer.style.display = 'block';
    stainPreContainer.style.display = 'block';
    methTabInputs.forEach(input => input.disabled = false);
  }
}

// ============================================================
// Validation helpers
// ============================================================
function validateAlphanumeric(input) {
  input.value = input.value.replace(/[^A-Za-z0-9\s\.\(\)\:]/g, '');
}

function validateRange(input) {
  let val = parseInt(input.value);
  if (val > 60) input.value = 60;
  if (val < 0)  input.value = 0;
}

function validateAmtWash1(input) {
  let val = parseInt(input.value);
  if (isNaN(val)) return;
  if (val > 23) input.value = 23;
  if (val < 13 && input.value.length >= 2) input.value = 13;
}

function validateAmtWash2(input) {
  let val = parseInt(input.value);
  if (isNaN(val)) return;
  if (val > 62) input.value = 62;
  if (val < 29 && input.value.length >= 2) input.value = 29;
}

function showTabError(pane, targetElement, customMsg) {
  const tabTrigger = document.querySelector(`[data-bs-target="#${pane.id}"]`);
  if (tabTrigger) bootstrap.Tab.getOrCreateInstance(tabTrigger).show();

  if (targetElement) {
    targetElement.style.border = '2px solid #dc3545';
    targetElement.style.backgroundColor = '#fff8f8';
    const clearError = function () {
      this.style.border = '';
      this.style.backgroundColor = '';
      this.removeEventListener('input', clearError);
      this.removeEventListener('change', clearError);
    };
    targetElement.addEventListener('input', clearError);
    targetElement.addEventListener('change', clearError);
  }

  Swal.fire({
    icon: 'warning',
    title: 'ข้อมูลไม่ครบถ้วน',
    text: customMsg || 'กรุณาตรวจสอบช่องที่ไฮไลท์สีแดงในหน้านี้',
    confirmButtonColor: '#3085d6'
  }).then(() => {
    if (targetElement) {
      setTimeout(() => {
        targetElement.focus();
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);
    }
  });
}

// ============================================================
// Submit Form
// ============================================================
async function submitFormData(form) {
  const btn = document.getElementById('submitBtn');
  if (!btn) return;
  btn.disabled = true;

  const recordedByEl = document.getElementById('recordedBy_Input');
  if (!recordedByEl || !recordedByEl.value) {
    Swal.fire({
      icon: 'error',
      title: 'ไม่พบชื่อผู้บันทึก',
      text: 'ระบบไม่สามารถระบุตัวตนของคุณได้ กรุณา Refresh หรือเข้าสู่ระบบใหม่'
    });
    btn.disabled = false;
    return;
  }

  // Validate fields
  const allInputs = form.querySelectorAll('select, input:not([type="button"]):not([type="submit"]):not([type="hidden"])');
  for (let input of allInputs) {
    if (input.disabled) continue;

    const pane = input.closest('.tab-pane');
    if (pane) {
      const tabTrigger = document.querySelector(`[data-bs-target="#${pane.id}"]`);
      if (tabTrigger) {
        const isHidden = tabTrigger.offsetWidth === 0 ||
          tabTrigger.closest('.d-none') ||
          tabTrigger.parentElement.style.display === 'none';
        if (isHidden) continue;
      }
    }

    const isVisible   = input.offsetWidth > 0 || input.offsetHeight > 0;
    const isParentHidden = input.closest('[style*="display: none"]') || input.closest('.d-none');
    if (!pane && (!isVisible || isParentHidden)) continue;

    const value = input.value ? input.value.trim() : '';
    if (value === 'Loading...') continue;

    const formGroup = input.closest('.mb-3') || input.closest('td') || input.parentElement;
    let labelText = formGroup.querySelector('.form-label')?.innerText
      || input.previousElementSibling?.innerText
      || 'ข้อมูลบางช่อง';
    labelText = labelText.replace(/[:*]/g, '').trim();

    if (!value || value === '' || value.includes('--')) {
      const msg = `กรุณากรอกข้อมูลในช่อง: ${labelText}`;
      if (pane) showTabError(pane, input, msg);
      else {
        Swal.fire('ข้อมูลไม่ครบถ้วน', msg, 'warning');
        input.style.border = '2px solid #dc3545';
        setTimeout(() => input.focus(), 500);
      }
      btn.disabled = false;
      return;
    }
  }

  const confirmed = await Swal.fire({
    title: 'ยืนยันการบันทึก?',
    text: 'กรุณาตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยัน',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#0dcaf0',
    cancelButtonColor: '#6c757d',
    confirmButtonText: 'Yes, Save it!'
  });

  if (!confirmed.isConfirmed) {
    btn.disabled = false;
    return;
  }

  Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

  try {
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => { data[key] = value; });

    // ✅ แทน window.token / window.userLogin — อ่านจาก localStorage
    const { token, user, userAccount } = getSession();
    data.token      = token;
    data.userLogin  = user;       // ส่ง userName ให้ server validate
    data.recordedBy = recordedByEl.value;

    // ✅ แทน google.script.run.submitForm()
    const res = await callAPI('submitForm', data);

    Swal.close();

    if (res.success) {
      Swal.fire({ icon: 'success', title: 'สำเร็จ!', text: 'บันทึกเรียบร้อย', timer: 2000, showConfirmButton: false });
      form.reset();
      btn.disabled = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      initReplacementLogic();
      handleStainTypeChange();
      handleFixingChange();

      // ใส่ชื่อผู้บันทึกกลับมาหลัง reset
      document.getElementById('recordedBy_Input').value = user;
    } else {
      Swal.fire('เกิดข้อผิดพลาด', res.message || 'ไม่ทราบสาเหตุ', 'error');
      btn.disabled = false;
    }
  } catch (err) {
    Swal.close();
    Swal.fire('เกิดข้อผิดพลาด', err.toString(), 'error');
    btn.disabled = false;
  }
}
