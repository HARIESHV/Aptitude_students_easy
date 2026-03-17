const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    /* ── Desktop-only guard ── */
    if (window.innerWidth < 1024) return;

    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');

    if (!token || role !== 'student') {
        window.location.href = '/';
        return;
    }

    // Initialize Theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode', 'dark');
        document.getElementById('theme-toggle').innerHTML = '<i class="fas fa-sun"></i>';
    }

    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('dark');
        const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        document.getElementById('theme-toggle').innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    });

    if (document.getElementById('welcome-text')) {
        document.getElementById('welcome-text').innerText = `${username}`;
    }
    if (document.getElementById('user-display-name')) {
        document.getElementById('user-display-name').innerText = username;
    }

    // --- Navigation ---
    const navItems = document.querySelectorAll('.nav-links .nav-item');
    const sections = document.querySelectorAll('.dashboard-section');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            const category = item.getAttribute('data-category');
            
            navItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.add('hidden'));
            
            item.classList.add('active');
            const targetSection = document.getElementById(target);
            if (targetSection) targetSection.classList.remove('hidden');
            
            if (pageTitle) {
                // Get text without icon
                const textOnly = item.cloneNode(true);
                textOnly.querySelector('i').remove();
                pageTitle.innerText = textOnly.innerText.trim();
            }

            if (target === 'practice') {
                if (category) {
                    showQuestionsInCategory(category);
                } else {
                    fetchStudentQuestions();
                }
            }
            if(target === 'history') fetchHistory();
            if(target === 'stats') loadStats();
            if(target === 'student-messages') fetchMessages();
            if(target === 'leaderboard-section') fetchLeaderboard();
        });
    });

    const alertBox = document.getElementById('dashboard-alert');
    function showAlert(msg, isError = false) {
        if (!alertBox) return;
        alertBox.textContent = msg;
        alertBox.className = `px-6 py-4 rounded-2xl font-bold flex items-center gap-3 ${isError ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 3000);
    }

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    });

    // --- Logout ---
    document.getElementById('logout-btn').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/';
    });

    let solvedQuestionsList = []; 

    // --- Load Stats ---
    async function loadStats() {
        try {
            const res = await fetch(`${API_BASE}/student/stats`, { headers: getHeaders() });
            const data = await res.json();
            
            if (document.getElementById('stat-attempted')) document.getElementById('stat-attempted').innerText = data.total_attempted;
            if (document.getElementById('stat-average')) document.getElementById('stat-average').innerText = `${data.average}%`;
            
            if (document.getElementById('big-attempted')) document.getElementById('big-attempted').innerText = data.total_attempted;
            if (document.getElementById('big-average')) document.getElementById('big-average').innerText = data.average;
            if (document.getElementById('big-correct')) document.getElementById('big-correct').innerText = data.correct_answers;

            solvedQuestionsList = data.solved_questions || [];
        } catch (err) { console.error(err); }
    }

    const categoryMeta = {
        'Logical Reasoning': { 
            icon: '<i class="fas fa-brain"></i>', 
            desc: 'Patterns, sequences, and analytical puzzles.',
            color: 'indigo'
        },
        'Placement / Company Focused': { 
            icon: '<i class="fas fa-laptop-code"></i>', 
            desc: 'Mixed aptitude for top tech companies.',
            color: 'purple'
        },
        'Quantitative Aptitude': { 
            icon: '<i class="fas fa-calculator"></i>', 
            desc: 'Arithmetic and numeric problem solving.',
            color: 'blue'
        },
        'Verbal Ability': { 
            icon: '<i class="fas fa-comment-dots"></i>', 
            desc: 'English grammar and verbal reasoning.',
            color: 'green'
        }
    };

    let allQuestions = [];

    // --- Practice Questions UI ---
    async function fetchStudentQuestions() {
        await loadStats();
        try {
            const res = await fetch(`${API_BASE}/questions`, { headers: getHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            allQuestions = data.questions;

            renderCategories();
        } catch (err) { console.error(err); }
    }

    function renderCategories() {
        const grid = document.getElementById('quiz-category-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        Object.keys(categoryMeta).forEach(catName => {
            const meta = categoryMeta[catName];
            const catQuestions = allQuestions.filter(q => q.topic === catName && !solvedQuestionsList.includes(q.id));
            const count = catQuestions.length;

            const card = document.createElement('div');
            card.className = 'content-card p-10 space-y-8 flex flex-col justify-between group cursor-pointer hover:border-indigo-500 transition-all';
            card.onclick = () => showQuestionsInCategory(catName);
            
            card.innerHTML = `
                <div class="space-y-6">
                    <div class="w-16 h-16 bg-${meta.color}-100 dark:bg-${meta.color}-900/20 text-${meta.color}-600 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        ${meta.icon}
                    </div>
                    <div class="space-y-2">
                        <h3 class="text-xl font-bold text-slate-900 dark:text-white">${catName}</h3>
                        <p class="text-slate-500 dark:text-slate-400 text-sm font-medium line-clamp-2">${meta.desc}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
                    <div class="flex items-center gap-2">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span class="text-[10px] font-black uppercase tracking-widest text-slate-400">${count} Challenges</span>
                    </div>
                    <i class="fas fa-arrow-right text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all"></i>
                </div>
            `;
            grid.appendChild(card);
        });
    }

    window.showQuestionsInCategory = (category) => {
        window.location.href = `/quiz?category=${encodeURIComponent(category)}`;
    };

    // --- Answered History Section ---
    async function fetchHistory() {
        try {
            const res = await fetch(`${API_BASE}/student/history`, { headers: getHeaders() });
            const data = await res.json();
            const tbody = document.getElementById('student-history-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            if (data.history.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="px-10 py-20 text-center text-slate-400 font-bold font-orbitron">No History Found</td></tr>';
                return;
            }

            data.history.forEach(sub => {
                const tr = document.createElement('tr');
                tr.className = 'group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors';
                tr.innerHTML = `
                    <td class="px-10 py-6">
                        <div class="font-bold text-slate-900 dark:text-white">${sub.question_title}</div>
                        <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">${sub.subtopic}</div>
                    </td>
                    <td class="px-10 py-6">
                        <span class="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">${sub.topic}</span>
                    </td>
                    <td class="px-10 py-6">
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full ${sub.is_correct ? 'bg-green-500' : 'bg-red-500'}"></div>
                            <span class="font-bold text-xs ${sub.is_correct ? 'text-green-600' : 'text-red-500'} uppercase tracking-widest">${sub.is_correct ? 'Correct' : 'Incorrect'}</span>
                        </div>
                    </td>
                    <td class="px-10 py-6 text-right">
                        <div class="text-xs font-bold text-slate-500">${sub.timestamp}</div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }

    // --- Messaging UI ---
    const msgForm = document.getElementById('student-send-msg-form');
    if (msgForm) {
        msgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = msgForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Dispatching...';
            btn.disabled = true;

            const formObj = new FormData();
            formObj.append('content', document.getElementById('s-msg-content').value);
            formObj.append('receiver_id', '1'); 
            
            const fileInput = document.getElementById('s-msg-file');
            if(fileInput && fileInput.files.length > 0) {
                formObj.append('file', fileInput.files[0]);
            }
            
            try {
                const res = await fetch(`${API_BASE}/messages`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formObj
                });
                if (res.ok) {
                    showAlert('Message dispatched to control center!');
                    msgForm.reset();
                    fetchMessages();
                } else {
                    showAlert('Failed to dispatch message', true);
                }
            } catch (error) { showAlert('Critical Error', true); }
            finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    }

    async function fetchMessages() {
        try {
            const res = await fetch(`${API_BASE}/messages`, { headers: getHeaders() });
            const data = await res.json();
            const list = document.getElementById('student-messages-list');
            if (!list) return;
            list.innerHTML = '';
            
            if (data.messages.length === 0) {
                 list.innerHTML = '<div class="content-card p-10 text-center text-slate-400 font-bold font-orbitron">No active logs found</div>';
                 return;
            }
            
            data.messages.forEach(m => {
                const item = document.createElement('div');
                item.className = 'content-card p-8 space-y-4';
                
                const isAdmin = m.sender_role === 'admin' || m.receiver_id === null;
                
                item.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg ${isAdmin ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'} flex items-center justify-center text-xs">
                                <i class="fas fa-${isAdmin ? 'shield-alt' : 'user'}"></i>
                            </div>
                            <div>
                                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">${isAdmin ? 'Admin Console' : 'Sent by Me'}</div>
                                <div class="text-xs font-bold text-slate-500">${m.timestamp}</div>
                            </div>
                        </div>
                    </div>
                    <p class="text-slate-600 dark:text-slate-300 font-medium">${m.content}</p>
                    ${m.file_path ? `
                        <a href="${m.file_path}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 transition-all">
                            <i class="fas fa-file-alt"></i> View Attachment
                        </a>
                    ` : ''}
                `;
                list.appendChild(item);
            });
        } catch (err) { console.error(err); }
    }

    // --- Leaderboard Section ---
    async function fetchLeaderboard() {
        try {
            const res = await fetch(`${API_BASE}/leaderboard`, { headers: getHeaders() });
            const data = await res.json();
            const tbody = document.getElementById('student-leaderboard-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            data.leaderboard.forEach((std, index) => {
                const tr = document.createElement('tr');
                tr.className = std.is_me ? 'bg-indigo-600/5' : 'hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors';
                tr.innerHTML = `
                    <td class="px-10 py-6">
                        <div class="w-8 h-8 rounded-lg ${index < 3 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'} flex items-center justify-center font-black text-xs">
                            #${index + 1}
                        </div>
                    </td>
                    <td class="px-10 py-6">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900 font-bold text-xs uppercase">
                                ${std.username.charAt(0)}
                            </div>
                            <div>
                                <div class="font-bold text-slate-900 dark:text-white">${std.username} ${std.is_me ? '<span class="ml-2 text-[8px] px-2 py-0.5 bg-indigo-600 text-white rounded-full uppercase">You</span>' : ''}</div>
                                <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Novice Learner</div>
                            </div>
                        </div>
                    </td>
                    <td class="px-10 py-6">
                        <span class="text-sm font-bold text-slate-500">${std.total_submissions}</span>
                    </td>
                    <td class="px-10 py-6 text-right">
                        <span class="text-xl font-black text-indigo-600 font-orbitron">${std.average}%</span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }

    // Initialize
    fetchStudentQuestions();
});
