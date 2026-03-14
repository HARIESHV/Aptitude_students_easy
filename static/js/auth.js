const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i>';
    }

    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        document.getElementById('theme-toggle').innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });

    const btnStudent = document.getElementById('btn-show-student');
    const btnAdmin = document.getElementById('btn-show-admin');
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const loginRoleText = document.getElementById('login-role-text');
    const regRoleText = document.getElementById('reg-role-text');
    
    const toRegister = document.getElementById('to-register');
    const toLogin = document.getElementById('to-login');
    
    const alertBox = document.getElementById('auth-alert');

    let currentRole = 'student';

    // Toggle Roles
    if (btnStudent && btnAdmin) {
        btnStudent.addEventListener('click', () => {
            currentRole = 'student';
            btnStudent.classList.add('active');
            btnAdmin.classList.remove('active');
            if (loginRoleText) loginRoleText.innerText = 'as Student';
            if (regRoleText) regRoleText.innerText = 'as Student';
            const loginToggle = document.querySelector('#login-form .toggle-text');
            if (loginToggle) loginToggle.style.display = 'block';
            hideAlert();
        });

        btnAdmin.addEventListener('click', () => {
            currentRole = 'admin';
            btnAdmin.classList.add('active');
            btnStudent.classList.remove('active');
            if (loginRoleText) loginRoleText.innerText = 'as Admin';
            if (regRoleText) regRoleText.innerText = 'as Admin';
            
            const loginToggle = document.querySelector('#login-form .toggle-text');
            if (loginToggle) loginToggle.style.display = 'none';
            if (toLogin) toLogin.click(); 
            
            hideAlert();
        });
    }

    // Toggle Forms
    if (toRegister && toLogin && loginForm && registerForm) {
        toRegister.addEventListener('click', () => {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            hideAlert();
        });

        toLogin.addEventListener('click', () => {
            registerForm.style.display = 'none';
            loginForm.style.display = 'block';
            hideAlert();
        });
    }

    // Helper: Show Alert
    function showAlert(msg, isError = true) {
        if (!alertBox) return;
        alertBox.textContent = msg;
        alertBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 3000);
    }
    function hideAlert() { if (alertBox) alertBox.classList.add('hidden'); }

    // Register Handler
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;

            try {
                const res = await fetch(`${API_BASE}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, role: currentRole })
                });
                const data = await res.json();
                
                if (res.ok) {
                    // Clear any stale session so the new user must log in fresh
                    localStorage.removeItem('token');
                    localStorage.removeItem('username');
                    localStorage.removeItem('role');
                    showAlert('Registration successful! Please login.', false);
                    if (toLogin) toLogin.click(); 
                    registerForm.reset();
                } else {
                    showAlert(data.message || 'Registration failed');
                }
            } catch (error) {
                showAlert('Server error occurred.');
            }
        });
    }

    // Login Handler
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
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
                    
                    if (data.role === 'admin') {
                        window.location.href = '/admin_dashboard';
                    } else {
                        window.location.href = '/student_dashboard';
                    }
                } else {
                    showAlert(data.message || 'Login failed');
                }
            } catch (error) {
                showAlert('Server error occurred.');
            }
        });
    }

    // Check if already logged in — validate token with /api/ping (no DB hit, instant)
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    if (token) {
        fetch(`${API_BASE}/ping`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }).then(res => {
            if (res.ok) {
                // Token is valid — redirect to the right dashboard
                if (role === 'admin') window.location.href = '/admin_dashboard';
                else if (role === 'student') window.location.href = '/student_dashboard';
            } else {
                // Token expired or invalid — clear it and stay on login page
                localStorage.removeItem('token');
                localStorage.removeItem('username');
                localStorage.removeItem('role');
            }
        }).catch(() => {
            // Network error — stay on login page
        });
    }
});
