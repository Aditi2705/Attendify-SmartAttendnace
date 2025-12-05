// Configuration Variables
const CONFIG = {
    collegeDomain: '@bciit.ac.in',
    courses: ['B.Tech CSE', 'B.Tech IT', 'BCA', 'MCA', 'MBA'],
    batches: ['2021-2025', '2022-2026', '2023-2027', '2024-2028', '2025-2029']
};

// Course durations (years). End year = startYear + duration
const COURSE_DURATIONS = {
    'B.Tech CSE': 4,
    'B.Tech IT': 4,
    'BCA': 3,
    'MCA': 2,
    'MBA': 2
};

// Key used to persist which form/tab is active
const ACTIVE_FORM_KEY = 'smartAttendance.activeForm';

// Base URL for backend API (adjust if your .NET backend lives on another path/host)
const API_BASE = window.API_BASE || '/api';

// Small helper for POSTing JSON to the API and parsing JSON responses.
async function apiPost(path, body){
    const url = `${API_BASE}${path}`;
    try{
        const headers = { 'Content-Type':'application/json' };
        const token = localStorage.getItem('smartAttendance.token');
        if (token) headers['Authorization'] = 'Bearer ' + token;
        const res = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });
        const data = await res.json().catch(()=>null);
        if(!res.ok) throw new Error((data && data.message) || `Request failed ${res.status}`);
        return data;
    }catch(err){
        throw err;
    }
}

// DOM Elements
const studentLoginForm = document.getElementById('studentLoginForm');
const studentRegisterForm = document.getElementById('studentRegisterForm');
const teacherLoginForm = document.getElementById('teacherLoginForm');
const formContainer = document.querySelector('.form-container');

const showStudentRegisterLink = document.getElementById('showStudentRegister') || { addEventListener: () => {} };
const showTeacherLoginLink = document.getElementById('showTeacherLogin');
const showStudentLoginFromRegisterLink = document.getElementById('showStudentLoginFromRegister');
const showStudentLoginFromTeacherLink = document.getElementById('showStudentLoginFromTeacher');

// Student Login Elements
const studentRollNoInput = document.getElementById('studentRollNo');
const studentPasswordInput = document.getElementById('studentPassword');
const studentLoginBtn = document.getElementById('studentLoginBtn');
const studentRollNoError = document.getElementById('studentRollNoError');
const studentPasswordError = document.getElementById('studentPasswordError');

// Student Registration Elements
const regFullNameInput = document.getElementById('regFullName');
const regEmailInput = document.getElementById('regEmail');
const regRollNoInput = document.getElementById('regRollNo');
const regCourseSelect = document.getElementById('regCourse');
const regBatchSelect = document.getElementById('regBatch');
const regPasswordInput = document.getElementById('regPassword');
const regConfirmPasswordInput = document.getElementById('regConfirmPassword');
const studentRegisterBtn = document.getElementById('studentRegisterBtn');

const regFullNameError = document.getElementById('regFullNameError');
const regEmailError = document.getElementById('regEmailError');
const regRollNoError = document.getElementById('regRollNoError');
const regCourseError = document.getElementById('regCourseError');
const regBatchError = document.getElementById('regBatchError');
const regPasswordError = document.getElementById('regPasswordError');
const regConfirmPasswordError = document.getElementById('regConfirmPasswordError');

const strengthUppercase = document.getElementById('strengthUppercase');
const strengthLowercase = document.getElementById('strengthLowercase');
const strengthNumber = document.getElementById('strengthNumber');
const strengthSymbol = document.getElementById('strengthSymbol');
const strengthLength = document.getElementById('strengthLength');

// Teacher Login Elements
const teacherEmailInput = document.getElementById('teacherEmail');
const teacherPasswordInput = document.getElementById('teacherPassword');
const teacherLoginBtn = document.getElementById('teacherLoginBtn');
const teacherEmailError = document.getElementById('teacherEmailError');
const teacherPasswordError = document.getElementById('teacherPasswordError');

// Populate dropdowns
function populateDropdowns() {
    CONFIG.courses.forEach(course => {
        const option = document.createElement('option');
        option.value = course;
        option.textContent = course;
        regCourseSelect.appendChild(option);
    });
    // Initially leave batch select empty; it will be populated when a course is chosen
    regBatchSelect.innerHTML = '<option value="">-- Select Batch --</option>';

    // When course selection changes, update batch options based on course duration
    regCourseSelect.addEventListener('change', () => {
        updateBatchesForCourse(regCourseSelect.value);
    });

    // If a course is already selected (e.g., restored form), populate batches now
    if(regCourseSelect.value) updateBatchesForCourse(regCourseSelect.value);
}
populateDropdowns();

function updateBatchesForCourse(course){
    // determine duration (default to 4 if unknown)
    const duration = COURSE_DURATIONS[course] || 4;
    // CONFIG.batches contains sample ranges like '2021-2025' where we treat the first part as start year
    const starts = CONFIG.batches.map(b => parseInt(String(b).split('-')[0], 10)).filter(n => !isNaN(n));
    // generate batch strings using start + duration
    const generated = starts.map(s => `${s}-${s + duration}`);
    // populate select
    regBatchSelect.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- Select Batch --';
    regBatchSelect.appendChild(placeholder);
    generated.forEach(b => {
        const o = document.createElement('option'); o.value = b; o.textContent = b; regBatchSelect.appendChild(o);
    });
}



// Form Switching Logic
function switchForm(targetForm) {
    const forms = [studentLoginForm, studentRegisterForm, teacherLoginForm];
    forms.forEach(form => {
        if (form === targetForm) {
            form.classList.add('active');
        } else {
            form.classList.remove('active');
            // Clear form data and reset validation when switching away
            const formElement = form.querySelector('form');
            if (formElement) {
                formElement.reset();
                resetValidation(formElement);
            }
        }
    });

    // Toggle a class on the container when the registration form is active so
    // we can expand the container width only for registration without
    // affecting the login forms.
    if (targetForm === studentRegisterForm) {
        formContainer.classList.add('mode-register');
    } else {
        formContainer.classList.remove('mode-register');
    }

    // Persist which form is currently active so the selection survives reloads
    try {
        if (targetForm && targetForm.id) {
            localStorage.setItem(ACTIVE_FORM_KEY, targetForm.id);
        }
    } catch (err) {
        // If localStorage isn't available (e.g., strict privacy mode), ignore silently
    }
}

function resetValidation(formElement) {
    const formGroups = formElement.querySelectorAll('.form-group');
    formGroups.forEach(group => {
        group.classList.remove('invalid');
        const errorMessage = group.querySelector('.error-message');
        if (errorMessage) {
            errorMessage.textContent = '';
        }
    });
    // Reset password strength indicator
    if (formElement.id === 'studentRegisterForm') {
        updatePasswordStrength('');
    }
    // Disable submit buttons
    const submitBtn = formElement.querySelector('.submit-button');
    if (submitBtn) {
        submitBtn.disabled = true;
    }
    // Remove attempted flag so errors are hidden until next submit
    formElement.classList.remove('attempted');
}

// Event Listeners for Form Switching
showStudentRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(studentRegisterForm);
});
showTeacherLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(teacherLoginForm);
});
showStudentLoginFromRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(studentLoginForm);
});
showStudentLoginFromTeacherLink.addEventListener('click', (e) => {
    e.preventDefault();
    switchForm(studentLoginForm);
});

 
document.querySelectorAll('.password-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
        // Prevent default and avoid leaving focus on the toggle itself.
        e.preventDefault();
        const targetId = toggle.dataset.target;
        const passwordInput = document.getElementById(targetId);
        const wasPassword = passwordInput.type === 'password';
        if (wasPassword) {
            passwordInput.type = 'text';
            toggle.textContent = '🙈'; // Eye-slash icon
        } else {
            passwordInput.type = 'password';
            toggle.textContent = '👁️'; // Eye icon
        }
        // Keep focus on the input to avoid focus/blur visual changes that can
        // cause the surrounding flex container to re-center and produce a
        // momentary contract/expand effect.
        try {
            passwordInput.focus({ preventScroll: true });
            // Move caret to end when input becomes text (best-effort)
            const len = passwordInput.value ? passwordInput.value.length : 0;
            if (typeof passwordInput.setSelectionRange === 'function') {
                passwordInput.setSelectionRange(len, len);
            }
        } catch (err) {
            // Some input types / browsers may throw; ignore safely.
        }
    });
});

// --- Validation Functions ---

// Generic validation helper
function validateInput(inputElement, errorElement, validationFn) {
    const isValid = validationFn(inputElement.value);
    if (isValid) {
        inputElement.closest('.form-group').classList.remove('invalid');
        errorElement.textContent = '';
    } else {
        inputElement.closest('.form-group').classList.add('invalid');
        errorElement.textContent = validationFn.errorMessage || 'Invalid input.';
    }
    return isValid;
}

// Student Login Validation
function validateStudentRollNo(rollNo) {
    const isValid = rollNo.trim() !== '';
    validateStudentRollNo.errorMessage = 'Roll No. is required.';
    return isValid;
}

function validateStudentPassword(password) {
    const isValid = password.trim() !== '';
    validateStudentPassword.errorMessage = 'Password is required.';
    return isValid;
}

function checkStudentLoginFormValidity() {
    const isRollNoValid = validateInput(studentRollNoInput, studentRollNoError, validateStudentRollNo);
    const isPasswordValid = validateInput(studentPasswordInput, studentPasswordError, validateStudentPassword);
    studentLoginBtn.disabled = !(isRollNoValid && isPasswordValid);
}

// Student Registration Validation
function validateFullName(name) {
    const isValid = /^[a-zA-Z\s]{3,50}$/.test(name);
    validateFullName.errorMessage = 'Full Name must be 3-50 characters, letters and spaces only.';
    return isValid;
}

function validateEmail(email) {
    const emailRegex = new RegExp(`^[a-zA-Z0-9._%+-]+${CONFIG.collegeDomain}$`);
    const isValid = emailRegex.test(email) && email.length <= (100 + CONFIG.collegeDomain.length);
    validateEmail.errorMessage = `Email must be valid and end with ${CONFIG.collegeDomain}, max 100 chars before domain.`;
    return isValid;
}

function validateRegRollNo(rollNo) {
    const isValid = /^[a-zA-Z0-9]{5,20}$/.test(rollNo);
    validateRegRollNo.errorMessage = 'Roll No. must be alphanumeric, 5-20 characters.';
    return isValid;
}

function validateCourse(course) {
    const isValid = course !== '';
    validateCourse.errorMessage = 'Please select a course.';
    return isValid;
}

function validateBatch(batch) {
    const isValid = batch !== '';
    validateBatch.errorMessage = 'Please select a batch.';
    return isValid;
}

// Ensure the selected batch matches the selected course duration (e.g., B.Tech -> 4 years)
function validateBatchForCourse(course, batch){
    if(!course || !batch) {
        validateBatchForCourse.errorMessage = 'Please select a course and batch.';
        return false;
    }
    const duration = COURSE_DURATIONS[course] || 4;
    // expect batch format 'YYYY-YYYY'
    const parts = String(batch).split('-');
    if(parts.length !== 2){
        validateBatchForCourse.errorMessage = 'Invalid batch format.';
        return false;
    }
    const start = parseInt(parts[0], 10);
    const end = parseInt(parts[1], 10);
    if(isNaN(start) || isNaN(end)){
        validateBatchForCourse.errorMessage = 'Invalid batch years.';
        return false;
    }
    if((end - start) !== duration){
        validateBatchForCourse.errorMessage = `Selected batch (${batch}) is not valid for ${course} (expected ${duration}-year duration).`;
        return false;
    }
    return true;
}

function validatePassword(password) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*]/.test(password);
    const isLengthValid = password.length >= 8 && password.length <= 128;

    updatePasswordStrength(password);

    const isValid = hasUppercase && hasLowercase && hasNumber && hasSymbol && isLengthValid;
    validatePassword.errorMessage = 'Password does not meet all requirements.';
    return isValid;
}

function updatePasswordStrength(password) {
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%^&*]/.test(password);
    const isLengthValid = password.length >= 8 && password.length <= 128;

    function updateStrengthItem(element, isValid) {
        element.classList.toggle('valid', isValid);
        element.classList.toggle('invalid', !isValid);
        element.querySelector('.icon').textContent = isValid ? '✓' : '✗';
    }

    updateStrengthItem(strengthUppercase, hasUppercase);
    updateStrengthItem(strengthLowercase, hasLowercase);
    updateStrengthItem(strengthNumber, hasNumber);
    updateStrengthItem(strengthSymbol, hasSymbol);
    updateStrengthItem(strengthLength, isLengthValid);
}

function validateConfirmPassword(confirmPassword) {
    const password = regPasswordInput.value;
    const isValid = confirmPassword === password && confirmPassword.trim() !== '';
    validateConfirmPassword.errorMessage = 'Passwords do not match.';
    return isValid;
}

function checkStudentRegisterFormValidity() {
    const isFullNameValid = validateInput(regFullNameInput, regFullNameError, validateFullName);
    const isEmailValid = validateInput(regEmailInput, regEmailError, validateEmail);
    const isRollNoValid = validateInput(regRollNoInput, regRollNoError, validateRegRollNo);
    const isCourseValid = validateInput(regCourseSelect, regCourseError, validateCourse);
    const isBatchValid = validateInput(regBatchSelect, regBatchError, validateBatch) && (function(){
        const ok = validateBatchForCourse(regCourseSelect.value, regBatchSelect.value);
        if(!ok){ regBatchSelect.closest('.form-group').classList.add('invalid'); regBatchError.textContent = validateBatchForCourse.errorMessage; }
        return ok;
    })();
    const isPasswordValid = validateInput(regPasswordInput, regPasswordError, validatePassword);
    const isConfirmPasswordValid = validateInput(regConfirmPasswordInput, regConfirmPasswordError, validateConfirmPassword);

    studentRegisterBtn.disabled = !(isFullNameValid && isEmailValid && isRollNoValid && isCourseValid && isBatchValid && isPasswordValid && isConfirmPasswordValid);
}

// re-validate when batch or course changes (in case restored values are mismatched)
regBatchSelect.addEventListener('change', () => { checkStudentRegisterFormValidity(); });
regCourseSelect.addEventListener('change', () => { checkStudentRegisterFormValidity(); });

// Teacher Login Validation
function validateTeacherEmail(email) {
    const emailRegex = new RegExp(`^[a-zA-Z0-9._%+-]+${CONFIG.collegeDomain}$`);
    const isValid = emailRegex.test(email);
    validateTeacherEmail.errorMessage = `Email must be valid and end with ${CONFIG.collegeDomain}.`;
    return isValid;
}

function validateTeacherPassword(password) {
    const isValid = password.trim() !== '';
    validateTeacherPassword.errorMessage = 'Password is required.';
    return isValid;
}

function checkTeacherLoginFormValidity() {
    const isEmailValid = validateInput(teacherEmailInput, teacherEmailError, validateTeacherEmail);
    const isPasswordValid = validateInput(teacherPasswordInput, teacherPasswordError, validateTeacherPassword);
    teacherLoginBtn.disabled = !(isEmailValid && isPasswordValid);
}

 

// --- Event Listeners for Real-time Validation ---

// Student Login
studentRollNoInput.addEventListener('input', checkStudentLoginFormValidity);
studentPasswordInput.addEventListener('input', checkStudentLoginFormValidity);

// Student Registration
regFullNameInput.addEventListener('input', checkStudentRegisterFormValidity);
regEmailInput.addEventListener('input', checkStudentRegisterFormValidity);
regRollNoInput.addEventListener('input', checkStudentRegisterFormValidity);
regCourseSelect.addEventListener('change', checkStudentRegisterFormValidity);
regBatchSelect.addEventListener('change', checkStudentRegisterFormValidity);
regPasswordInput.addEventListener('input', () => {
    checkStudentRegisterFormValidity();
    validateConfirmPassword(regConfirmPasswordInput.value); // Re-validate confirm password if main password changes
});
regConfirmPasswordInput.addEventListener('input', checkStudentRegisterFormValidity);

// Teacher Login
teacherEmailInput.addEventListener('input', checkTeacherLoginFormValidity);
teacherPasswordInput.addEventListener('input', checkTeacherLoginFormValidity);

 

// --- Form Submission Handlers ---

studentLoginForm.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formEl = e.target;
    formEl.classList.add('attempted');
    checkStudentLoginFormValidity();

    if (!studentLoginBtn.disabled) {
        const enteredRollNo = studentRollNoInput.value.trim();
        const enteredPassword = studentPasswordInput.value;
        // Call backend API for student login
        try{
            const resp = await apiPost('/auth/students/login', { rollNo: enteredRollNo, password: enteredPassword });
            // On success, backend may return a redirectUrl or token
                if(resp && resp.token){
                    localStorage.setItem('smartAttendance.token', resp.token);
                }
                showLoginLoader('Signing in...', resp && resp.redirectUrl ? resp.redirectUrl : 'student-profile.html');
        }catch(err){
            studentPasswordError.textContent = err.message || 'Invalid Roll No. or password.';
            studentPasswordInput.closest('.form-group').classList.add('invalid');
            console.error('Student login failed', err);
        }
    }
});

studentRegisterForm.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formEl = e.target;
    formEl.classList.add('attempted');
    checkStudentRegisterFormValidity();
    if (!studentRegisterBtn.disabled) {
        const payload = {
            fullName: regFullNameInput.value,
            email: regEmailInput.value,
            rollNo: regRollNoInput.value,
            course: regCourseSelect.value,
            batch: regBatchSelect.value,
            password: regPasswordInput.value
        };
        try{
            // Use StudentController to create a student (creates AppUser + Student record)
            const resp = await apiPost('/student', {
                FullName: payload.fullName,
                Email: payload.email,
                Password: payload.password,
                RollNo: payload.rollNo,
                ClassName: `${payload.course} ${payload.batch}`
            });
            // On success, either auto-switch to login or notify user
            alert((resp && resp.message) ? resp.message : 'Registration successful. Please login.');
            // Switch to student login form
            switchForm(studentLoginForm);
        }catch(err){
            regEmailError.textContent = err.message || 'Registration failed.';
            regEmailInput.closest('.form-group').classList.add('invalid');
            console.error('Registration failed', err);
        }
    }
});

teacherLoginForm.querySelector('form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formEl = e.target;
    formEl.classList.add('attempted');
    checkTeacherLoginFormValidity();
    if (!teacherLoginBtn.disabled) {
        const enteredEmail = teacherEmailInput.value.trim();
        const enteredPassword = teacherPasswordInput.value;
        try{
            const resp = await apiPost('/auth/login', { UserName: enteredEmail, Password: enteredPassword });
            // If success, backend may provide a token
            if(resp && resp.token){ localStorage.setItem('smartAttendance.token', resp.token); }
            showLoginLoader('Signing in...', resp && resp.redirectUrl ? resp.redirectUrl : 'teacher-portal.html');
            return;
        }catch(err){
            teacherPasswordError.textContent = err.message || 'Invalid email or password.';
            teacherPasswordInput.closest('.form-group').classList.add('invalid');
            console.log('Teacher Login attempt failed for:', enteredEmail, err);
        }
    }
});

 

// Show a loader overlay and redirect after a short transition
function showLoginLoader(message, redirectUrl){
    const loader = document.getElementById('loginLoader');
    if(!loader) { window.location.href = redirectUrl; return; }
    const msgEl = loader.querySelector('.loader-message');
    if(msgEl) msgEl.textContent = message;
    loader.classList.add('show');
    document.body.classList.add('no-scroll');
    // Small delay so animation is visible; then redirect
    setTimeout(()=>{
        // optional small fade/hold before navigating
        window.location.href = redirectUrl;
    }, 900);
}

// Initial validation check for the default active form
// Restore the last active form (if any) from localStorage so tab selection
// survives a page reload. Defaults to student login when key is absent/invalid.
(function restoreActiveForm(){
    try {
        const savedId = localStorage.getItem(ACTIVE_FORM_KEY);
        const defaultForm = studentLoginForm;
        if (savedId) {
            const el = document.getElementById(savedId);
            if (el) {
                switchForm(el);
            } else {
                switchForm(defaultForm);
            }
        } else {
            switchForm(defaultForm);
        }
    } catch (err) {
        // If localStorage access throws, fall back to default behavior
        switchForm(studentLoginForm);
    }
})();

// Run initial validation check for whichever form was activated above
checkStudentLoginFormValidity();
