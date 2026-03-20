const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    /* Mobile guard removed */

    // Initialize Theme
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';

    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode', 'dark');
        if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            document.body.classList.toggle('dark');
            const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
            localStorage.setItem('theme', theme);
            themeToggle.innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
        });
    }

    const btnStudent = document.getElementById('btn-show-student');
    const btnAdmin = document.getElementById('btn-show-admin');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginRoleText = document.getElementById('login-role-text');
    const toRegister = document.getElementById('to-register');
    const toLogin = document.getElementById('to-login');
    const alertBox = document.getElementById('auth-alert');

    let currentRole = 'student';

    // Role Selection Logic
    const setRole = (role) => {
        currentRole = role;
        if (role === 'admin') {
            btnAdmin.classList.add('active', 'bg-indigo-600', 'text-white');
            btnAdmin.classList.remove('text-slate-500');
            btnStudent.classList.remove('active', 'bg-indigo-600', 'text-white');
            btnStudent.classList.add('text-slate-500');
            if (loginRoleText) loginRoleText.innerText = 'Administrator';
            // Hide registration option for admins (usually handled manually or fixed)
            if (toRegister) toRegister.parentElement.style.display = 'none';
        } else {
            btnStudent.classList.add('active', 'bg-indigo-600', 'text-white');
            btnStudent.classList.remove('text-slate-500');
            btnAdmin.classList.remove('active', 'bg-indigo-600', 'text-white');
            btnAdmin.classList.add('text-slate-500');
            if (loginRoleText) loginRoleText.innerText = 'Student';
            if (toRegister) toRegister.parentElement.style.display = 'block';
        }
        hideAlert();
    };

    if (btnStudent) btnStudent.addEventListener('click', () => setRole('student'));
    if (btnAdmin) btnAdmin.addEventListener('click', () => setRole('admin'));

    // Form Switching
    if (toRegister) {
        toRegister.addEventListener('click', () => {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            hideAlert();
        });
    }

    if (toLogin) {
        toLogin.addEventListener('click', () => {
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
            hideAlert();
        });
    }

    // Alert Handlers
    const showAlert = (msg, isError = true) => {
        if (!alertBox) return;
        alertBox.textContent = msg;
        alertBox.className = `px-6 py-4 rounded-2xl text-sm font-bold text-center ${isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`;
        alertBox.classList.remove('hidden');
    };
    const hideAlert = () => { if (alertBox) alertBox.classList.add('hidden'); };

    // Login Submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Authenticating...';
            submitBtn.disabled = true;

            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;

            try {
                const res = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, role: currentRole })
                });
                const data = await res.json();

                if (res.ok) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('username', data.username);
                    localStorage.setItem('role', data.role);
                    window.location.href = data.role === 'admin' ? '/admin_dashboard' : '/student_dashboard';
                } else {
                    showAlert(data.message || 'Authentication failed');
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            } catch (error) {
                showAlert('Neural link failed. Server unreachable.');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    // Register Submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;

            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;

            try {
                const res = await fetch(`${API_BASE}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, role: 'student' }) // Registration defaults to student
                });
                const data = await res.json();

                if (res.ok) {
                    showAlert('Success! Network access granted.', false);
                    setTimeout(() => toLogin.click(), 1500);
                } else {
                    showAlert(data.message || 'Registry failed');
                    submitBtn.disabled = false;
                }
            } catch (error) {
                showAlert('Registry server error.');
                submitBtn.disabled = false;
            }
        });
    }

    // Autologin check
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token) {
        fetch(`${API_BASE}/ping`, { headers: { 'Authorization': `Bearer ${token}` } })
            .then(res => {
                if (res.ok) {
                    window.location.href = role === 'admin' ? '/admin_dashboard' : '/student_dashboard';
                } else {
                    localStorage.clear();
                }
            }).catch(() => { });
    }
});
