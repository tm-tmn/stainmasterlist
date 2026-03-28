<script>
(function() {
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = urlParams.get('page');
    const userDept = window.userDept; 

    if (currentPage === 'admin' && userDept === 'Service Engineer') {
        Swal.fire({
            icon: 'error',
            title: 'Access Denied',
            text: 'สิทธิ์ระดับ L1 ไม่สามารถเข้าถึงหน้านี้ได้',
            confirmButtonText: 'ตกลง'
        }).then(() => { 
            window.location.href = window.scriptUrl + "?page=main&user=" + encodeURIComponent(window.userName) + "&t=" + window.token;
        });
        return; 
    }
})();


  function showLoading(msg = 'กำลังดำเนินการ...') {
    Swal.fire({
      title: msg,
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  window.onload = function() {
      const userDept = window.userDept;
      if (userDept === 'Application Specialist') {
    }
      refreshData();
  };

  function setupLoginHandler(modal) {
    const form = document.getElementById('adminLoginForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
      e.preventDefault();
      const user = document.getElementById('adminUsername').value;
      const pass = document.getElementById('adminPassword').value;

      showLoading('กำลังตรวจสอบสิทธิ์...'); // ตอนนี้จะเรียกได้แล้ว

      google.script.run
        .withSuccessHandler(function(response) {
          if (response.success) {
            Swal.fire({
              icon: 'success',
              title: 'เข้าสู่ระบบสำเร็จ',
              timer: 1000,
              showConfirmButton: false
            }).then(() => {
              modal.hide();
              document.getElementById('adminContent').style.display = 'block';
              refreshData(); // 🚩 จะไปดึงข้อมูลจาก Setting ต่อที่นี่
            });
          } else {
            Swal.fire('ล้มเหลว', response.message, 'error');
          }
        })
        .withFailureHandler(function(err) {
          Swal.fire('Error', 'Login Fail: ' + err, 'error');
        })
        .checkAdminLogin(user, pass);
    });
  }

  // --- 3. ปรับปรุงฟังก์ชัน refreshData เพื่อคุมสิทธิ์ Edit/Delete ในตัว ---
    function refreshData() {
        if (typeof showLoading === "function") {
            showLoading('กำลังโหลดข้อมูล...');
        }

        google.script.run
          .withSuccessHandler(function(options) {
            const headerSelect = document.getElementById('headerSelect');
            const displayArea = document.getElementById('displayArea');
            const userDept = window.userDept;
            
            headerSelect.innerHTML = '';
            displayArea.innerHTML = '';

            for (let header in options) {
              let opt = document.createElement('option');
              opt.value = header;
              opt.text = header;
              headerSelect.appendChild(opt);

              let html = `
                <div class="col-md-4 col-lg-3">
                  <div class="data-card">
                    <div class="data-card-header"><span title="${header}">${header}</span></div>
                    <div class="card-body p-0 card-scroll-area" style="max-height: 250px; overflow-y: auto;">
                      <ul class="list-group list-group-flush">`;
              
              options[header].forEach(item => {
                if (item !== "") {
                  // 🚩 เช็คสิทธิ์: ถ้าเป็น Admin ถึงจะเห็นปุ่มแก้ไข/ลบ (สมมติว่า L2 แก้ไม่ได้)
                  // แต่ถ้าคุณให้ L2 แก้ได้ด้วย ก็ไม่ต้องใส่เงื่อนไขครอบไอคอน
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
          })
          .withFailureHandler(function(err) {
            Swal.fire('Error', 'โหลดข้อมูลล้มเหลว: ' + err, 'error');
          })
          .getMasterSettings();
    }

  /**
   * ฟังก์ชันบันทึกข้อมูลใหม่ (Add)
   */
  function saveNewOption() {
    const head = document.getElementById('headerSelect').value;
    const val = document.getElementById('newValue').value.trim();

    if(!val) {
      Swal.fire('คำเตือน', 'กรุณากรอกข้อมูลที่ต้องการเพิ่ม', 'warning');
      return;
    }

    showLoading('กำลังบันทึกข้อมูล...');

    google.script.run
      .withSuccessHandler(function(res) {
        document.getElementById('newValue').value = ''; // ล้างช่องกรอก
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: res,
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          refreshData(); // โหลดข้อมูลใหม่ทันที
        });
      })
      .withFailureHandler(function(err) {
        Swal.fire('Error', 'บันทึกไม่สำเร็จ: ' + err, 'error');
      })
      .addOptionToSheet(head, val);
  }

  /**
   * ฟังก์ชันแก้ไขข้อมูล (Edit/Rename)
   */
  function editOption(head, oldVal) {
    Swal.fire({
      title: 'แก้ไขข้อมูล',
      html: `แก้ไขค่าในหัวข้อ: <b>${head}</b>`,
      input: 'text',
      inputValue: oldVal,
      showCancelButton: true,
      confirmButtonText: 'บันทึกการแก้ไข',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#0d6efd',
      inputValidator: (value) => {
        if (!value || value.trim() === "") return 'กรุณากรอกข้อมูลใหม่!'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        showLoading('กำลังอัปเดต...');
        google.script.run
          .withSuccessHandler(function(res) {
            Swal.fire({
              icon: 'success',
              title: 'แก้ไขเรียบร้อย',
              timer: 1500,
              showConfirmButton: false
            }).then(() => {
              refreshData();
            });
          })
          .editOptionInSheet(head, oldVal, result.value);
      }
    });
  }

  /**
   * ฟังก์ชันลบข้อมูล (Delete)
   */
  function deleteOption(head, val) {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: `คุณต้องการลบ "${val}" ออกจากหัวข้อ "${head}" ใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        showLoading('กำลังลบข้อมูล...');
        google.script.run
          .withSuccessHandler(function(res) {
            Swal.fire({
              icon: 'success',
              title: 'ลบข้อมูลสำเร็จ',
              timer: 1000,
              showConfirmButton: false
            }).then(() => {
              refreshData();
            });
          })
          .deleteOptionFromSheet(head, val);
      }
    });
  }

// 1. ฟังก์ชันเปิด Modal
function openManageUserModal() {
  const userDept = window.userDept;

  // 🚩 ตรวจสอบสิทธิ์ภายในฟังก์ชัน
  if (userDept !== 'Admin') {
    Swal.fire({
      icon: 'warning',
      title: 'สิทธิ์ไม่เพียงพอ',
      text: 'เฉพาะ Admin เท่านั้นที่สามารถจัดการผู้ใช้งานได้',
      confirmButtonColor: '#3085d6'
    });
    return; // หยุดการทำงาน ไม่เปิด Modal
  }

  // ถ้าเป็น Admin ให้ทำงานต่อตามปกติ
  const modalElem = document.getElementById('userModal');
  let userModal = bootstrap.Modal.getInstance(modalElem);
  if (!userModal) {
    userModal = new bootstrap.Modal(modalElem);
  }
  userModal.show();
  loadUserData();
}

// 2. ฟังก์ชันโหลดข้อมูล (แก้ไข ID และเพิ่มปุ่ม Add)
function loadUserData() {
  showLoading('กำลังโหลดข้อมูลผู้ใช้งาน...');
  google.script.run
    .withSuccessHandler(function(users) {
      const area = document.getElementById('userTableArea');
      let html = `
        <div class="table-responsive">
          <table class="table table-hover align-middle border">
            <thead class="table-light">
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Dept</th>
                <th class="text-center">Action</th>
              </tr>
            </thead>
            <tbody>`;
      
      users.forEach((user) => {
        const isAdmin = (user.dept === 'Admin');

        html += `
          <tr>
            <td><code>${user.username}</code></td>
            <td>${user.name}</td>
            <td><span class="badge bg-info text-dark">${user.dept}</span></td>
            <td class="text-center">
              <button class="btn btn-sm btn-outline-primary me-1" onclick="editUserPassword('${user.username}')" title="เปลี่ยนรหัสผ่าน">
                <i class="bi bi-key"></i>
              </button>
              ${!isAdmin ? `
                <button class="btn btn-sm btn-outline-danger" onclick="deleteUser('${user.username}')" title="ลบผู้ใช้">
                  <i class="bi bi-trash"></i>
                </button>` : `<button class="btn btn-sm btn-light text-muted" disabled><i class="bi bi-trash"></i></button>`}
            </td>
          </tr>`;
      });
      
      html += `</tbody></table></div>`;
      area.innerHTML = html;
      Swal.close();
    })
    .getUserList();
}

// ฟังก์ชันลบ User
function deleteUser(username) {
  Swal.fire({
    title: 'ยืนยันการลบ?',
    text: `คุณต้องการลบผู้ใช้ "${username}" ใช่หรือไม่?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    confirmButtonText: 'ใช่, ลบเลย'
  }).then((result) => {
    if (result.isConfirmed) {
      showLoading('กำลังลบ...');
      google.script.run
        .withSuccessHandler(() => {
          Swal.fire('สำเร็จ', 'ลบผู้ใช้งานเรียบร้อย', 'success');
          loadUserData(); // รีโหลดตาราง
        })
        .deleteUserFromSheet(username); // ต้องสร้างฟังก์ชันนี้ใน Code.gs
    }
  });
}

// ฟังก์ชันสำหรับ Admin เปลี่ยนรหัสให้คนอื่น
function editUserPassword(username) {
  Swal.fire({
    title: `เปลี่ยนรหัสผ่านสำหรับ: ${username}`,
    input: 'password',
    inputLabel: 'กรอกรหัสผ่านใหม่',
    inputPlaceholder: 'Password',
    showCancelButton: true,
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก',
    inputAttributes: {
      autocapitalize: 'off',
      autocorrect: 'off'
    },
    inputValidator: (value) => {
      if (!value) return 'กรุณากรอกรหัสผ่านใหม่!';
      if (value.length < 4) return 'รหัสผ่านควรมีความยาวอย่างน้อย 4 ตัวอักษร';
    }
  }).then((result) => {
    if (result.isConfirmed) {
      showLoading('กำลังบันทึกรหัสผ่านใหม่...');
      google.script.run
        .withSuccessHandler(function(res) {
          if (res.success) {
            Swal.fire('สำเร็จ!', res.message, 'success');
          } else {
            Swal.fire('ล้มเหลว', res.message, 'error');
          }
        })
        .updatePasswordInSheet(username, result.value);
    }
  });
}

// ฟังก์ชันสำหรับเปิดหน้าต่างเปลี่ยนรหัสผ่านตัวเอง
function openChangePasswordModal() {
  // ล้างค่าในช่อง input ทุกครั้งที่เปิด
  document.getElementById('self-new-pass').value = '';
  document.getElementById('self-confirm-pass').value = '';
  
  // สั่งเปิด Bootstrap Modal (id ต้องตรงกับใน HTML)
  const myModal = new bootstrap.Modal(document.getElementById('selfChangePassModal'));
  myModal.show();
}

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

// ฟังก์ชันสลับการมองเห็นรหัสผ่านสำหรับ Change Password ตัวเอง
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

function addNewUserForm() {
  // 1. ยกเลิกกลไกการดักจับ Focus ของ Bootstrap ทุกกรณี
  $.fn.modal.Constructor.prototype._enforceFocus = function() {}; 
  
  const userModalElem = document.getElementById('userModal');
  const originalTabindex = userModalElem.getAttribute('tabindex');
  userModalElem.removeAttribute('tabindex');

  Swal.fire({
    title: 'เพิ่มผู้ใช้งานใหม่',
    html: `
      <div class="text-start">
        <label class="form-label small fw-bold">Username</label>
        <input id="new-username" class="swal2-input mt-0" placeholder="Username">
        <label class="form-label small fw-bold">Password</label>
        <input id="new-password" type="password" class="swal2-input mt-0" placeholder="Password">
        <label class="form-label small fw-bold">Full Name</label>
        <input id="new-name" class="swal2-input mt-0" placeholder="Name">
        <label class="form-label small fw-bold">Department</label>
        <select id="new-dept" class="swal2-input mt-0">
          <option value="Application Specialist">Application Specialist</option>
          <option value="Service Engineer">Service Engineer</option>
        </select>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: 'บันทึก',
    cancelButtonText: 'ยกเลิก',
    focusConfirm: false,
    // 2. บังคับให้ Input แรกรับโฟกัสทันทีเมื่อเปิด Swal
    didOpen: () => {
      const input = document.getElementById('new-username');
      if (input) input.focus();
    },
    didClose: () => {
      if (originalTabindex !== null) {
        userModalElem.setAttribute('tabindex', originalTabindex);
      }
    },
    preConfirm: () => {
      const username = document.getElementById('new-username').value.trim();
      const password = document.getElementById('new-password').value.trim();
      const name = document.getElementById('new-name').value.trim();
      const dept = document.getElementById('new-dept').value;

      if (!username || !password || !name || !dept) {
        Swal.showValidationMessage('กรุณากรอกข้อมูลให้ครบทุกช่อง');
        return false;
      }
      return { username, password, name, dept };
    }
  }).then((result) => {
    if (result.isConfirmed) {
      showLoading('กำลังบันทึก...');
      google.script.run
        .withSuccessHandler(function(res) {
          if (res.success) {
            Swal.fire('สำเร็จ', 'เพิ่มผู้ใช้งานเรียบร้อย', 'success');
            loadUserData();
          } else {
            Swal.fire('ล้มเหลว', res.message, 'error');
          }
        })
        .addUserToSheet(result.value);
    }
  });
}

function toggleUserForm(show, isEdit = false, username = '') {
  const formArea = document.getElementById('userFormArea');
  const btnAdd = document.getElementById('btnAddNewUser');
  const title = document.getElementById('formTitle');
  
  if (show) {
    $(formArea).slideDown(300);
    btnAdd.style.display = 'none';
    title.innerText = isEdit ? `เปลี่ยนรหัสผ่าน: ${username}` : 'เพิ่มผู้ใช้งานใหม่';
    
    document.getElementById('target-username').value = username;
    document.getElementById('target-username').readOnly = isEdit;
    document.getElementById('target-password').value = '';
    
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

function submitUserForm() {
  const user = document.getElementById('target-username').value.trim();
  const pass = document.getElementById('target-password').value.trim();
  const name = document.getElementById('target-name').value.trim();
  const dept = document.getElementById('target-dept').value;
  const isEdit = document.getElementById('target-username').readOnly;

  if (!user || !pass || (!isEdit && !name)) {
    Swal.fire('คำเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    return;
  }

  // 🚩 แก้ไข Regex: รองรับ A-Z, a-z, 0-9 และ Special Characters (!@#$%^&* เป็นต้น) 
  // แต่ห้ามมีภาษาไทยหรือช่องว่าง
  const passwordRegex = /^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+$/;
  
  if (!passwordRegex.test(pass)) {
    Swal.fire({
      icon: 'error',
      title: 'รูปแบบรหัสผ่านไม่ถูกต้อง',
      text: 'รหัสผ่านต้องเป็นภาษาอังกฤษ ตัวเลข และสัญลักษณ์เท่านั้น ห้ามมีภาษาไทยหรือเว้นวรรค',
      confirmButtonColor: '#d33'
    });
    return;
  }

  showLoading('กำลังบันทึกข้อมูล...');
  
  // ส่วน google.script.run เหมือนเดิม...
  if (isEdit) {
    google.script.run
      .withSuccessHandler(() => {
        Swal.fire('สำเร็จ', 'เปลี่ยนรหัสผ่านเรียบร้อย', 'success');
        toggleUserForm(false);
        loadUserData();
      })
      .updatePasswordInSheet(user, pass);
  } else {
    google.script.run
      .withSuccessHandler(res => {
        if (res.success) {
          Swal.fire('สำเร็จ', 'เพิ่มผู้ใช้ใหม่เรียบร้อย', 'success');
          toggleUserForm(false);
          loadUserData();
        } else {
          Swal.fire('ล้มเหลว', res.message, 'error');
        }
      })
      .addUserToSheet({username: user, password: pass, name: name, dept: dept});
  }
}

/**
 * ฟังก์ชันสลับการมองเห็นรหัสผ่าน
 */
function togglePasswordVisibility() {
  const passwordInput = document.getElementById('target-password');
  const eyeIcon = document.getElementById('eyeIcon');
  
  if (passwordInput.type === 'password') {
    // เปลี่ยนเป็นข้อความธรรมดา เพื่อให้มองเห็น
    passwordInput.type = 'text';
    // เปลี่ยนไอคอนเป็นรูปตาปิด หรือตาสีอื่นเพื่อให้รู้ว่าเปิดอยู่
    eyeIcon.classList.remove('bi-eye-fill');
    eyeIcon.classList.add('bi-eye-slash-fill');
  } else {
    // เปลี่ยนกลับเป็นรหัสผ่าน
    passwordInput.type = 'password';
    // เปลี่ยนไอคอนกลับเป็นรูปตาเปิด
    eyeIcon.classList.remove('bi-eye-slash-fill');
    eyeIcon.classList.add('bi-eye-fill');
  }
}

/**
 * ปรับปรุงฟังก์ชัน toggleUserForm ให้รีเซ็ตสถานะปุ่ม Show Password ทุกครั้งที่เปิดฟอร์ม
 */
function toggleUserForm(show, isEdit = false, username = '') {
  const formArea = document.getElementById('userFormArea');
  const btnAdd = document.getElementById('btnAddNewUser');
  const title = document.getElementById('formTitle');
  
  // เพิ่มการรีเซ็ต Input Password ให้เป็นแบบซ่อนทุกครั้งที่เปิด/ปิด
  const passwordInput = document.getElementById('target-password');
  const eyeIcon = document.getElementById('eyeIcon');
  if (passwordInput) {
    passwordInput.type = 'password';
    if (eyeIcon) {
      eyeIcon.classList.remove('bi-eye-slash-fill');
      eyeIcon.classList.add('bi-eye-fill');
    }
  }

  if (show) {
    $(formArea).slideDown(300);
    btnAdd.style.display = 'none';
    title.innerText = isEdit ? `เปลี่ยนรหัสผ่าน: ${username}` : 'เพิ่มผู้ใช้งานใหม่';
    
    document.getElementById('target-username').value = username;
    document.getElementById('target-username').readOnly = isEdit;
    document.getElementById('target-password').value = '';
    
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


// แก้ไขฟังก์ชันเดิมในตารางให้มาเรียกฟอร์มนี้แทน
function editUserPassword(username) {
  toggleUserForm(true, true, username);
}


function initAdminPage() {
    // สมมติว่าคุณเก็บข้อมูล User ไว้ในตัวแปร global หลังจาก Login
    if (window.currentUser && window.currentUser.dept === "Admin") {
        document.getElementById('adminLogSection').style.display = 'block';
        loadEditLogs();
    } else {
        Swal.fire('Access Denied', 'หน้านี้สำหรับ Admin เท่านั้น', 'error');
        // อาจจะ redirect ไปหน้าอื่น
    }
}

// ฟังก์ชันสำหรับเปิด Modal
function openLogModal() {

  if (window.userDept !== 'Admin') {
    Swal.fire('สิทธิ์ไม่เพียงพอ', 'เฉพาะ Admin เท่านั้นที่ดู Log ได้', 'warning');
    return;
  }

  
  const logModal = new bootstrap.Modal(document.getElementById('logModal'));
  logModal.show();
}

// โหลดข้อมูลเมื่อ Modal กางเสร็จครั้งแรก
document.getElementById('logModal').addEventListener('shown.bs.modal', function () {
  loadLogData();
});

// ฟังก์ชันโหลดข้อมูล (ใช้ทั้งตอนเปิด Modal และตอนกดปุ่ม Refresh)

function loadLogData() {
  const tableId = '#logTable';
  
  // ตรวจสอบ Library ก่อนรัน
  if (typeof $.fn.DataTable === 'undefined') return;

  // เคลียร์ข้อมูลเก่าและแสดงสถานะ Loading
  if ($.fn.DataTable.isDataTable(tableId)) {
    $(tableId).DataTable().clear().destroy();
    $(tableId).find('tbody').html('<tr><td colspan="6" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div><br>กำลังโหลดข้อมูลล่าสุด...</td></tr>');
  }

  google.script.run
    .withSuccessHandler(function(logs) {
      $('#logTable').DataTable({
        data: logs,
        columns: [
          { data: 0, render: (d) => d ? new Date(d).toLocaleString('th-TH') : "" },
          { data: 1 },
          { data: 2 },
          { 
            data: 3, 
            render: (d) => `<span class="badge bg-info text-dark">${d}</span>` 
          },
          { data: 4 },
          { 
            data: 5,
            render: function(data) {
              // ใช้สไตล์ pre-line เพื่อให้แสดงบรรทัดใหม่ตามที่บันทึกมาใน Google Sheet
              return `<div style="white-space: pre-line; font-size: 0.85rem; line-height: 1.4;">${data}</div>`;
            }
          }
        ],
        order: [[0, 'desc']],
        responsive: true,
        autoWidth: false,
        language: {
          url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/th.json'
        }
      });
      // บังคับให้ตารางคำนวณขนาดใหม่ทันที
      setTimeout(() => { $(tableId).DataTable().columns.adjust(); }, 300);
    })
    .withFailureHandler(err => {
      Swal.fire('Error', 'ไม่สามารถรีเฟรชข้อมูลได้: ' + err, 'error');
    })
    .getEditLogs(window.userDept);
}
</script>
