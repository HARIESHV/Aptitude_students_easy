const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    // Desktop guard removed for mobile-first redesign
    
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

    // --- Navigation ---
    const navItems = document.querySelectorAll('.nav-icon-link');
    const sections = document.querySelectorAll('.dashboard-section');
    const heroSection = document.getElementById('hero-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            const category = item.getAttribute('data-category');
            
            navItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.add('hidden'));
            
            if (heroSection) {
                if (target === 'hero-section') heroSection.classList.remove('hidden');
                else heroSection.classList.add('hidden');
            }
            
            item.classList.add('active');
            
            const targetSection = document.getElementById(target);
            if (targetSection) targetSection.classList.remove('hidden');

            if (target === 'practice') {
                renderCategories(category); 
            }
            if(target === 'leaderboard-section') fetchLeaderboard();
            if(target === 'stats') loadStats();
            if(target === 'history') fetchHistory();
            if(target === 'student-messages') fetchMessages();
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    const alertBox = document.getElementById('dashboard-alert');
    function showAlert(msg, isError = false) {
        if (!alertBox) return;
        alertBox.textContent = msg;
        alertBox.className = `fixed top-24 left-6 right-6 z-[110] px-6 py-4 rounded-2xl font-bold flex items-center gap-3 border shadow-xl ${isError ? 'bg-red-500 dark:bg-red-600 text-white border-red-400' : 'bg-green-500 dark:bg-green-600 text-white border-green-400'}`;
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
        'Quantitative Aptitude': { 
            icon: '<i class="fas fa-calculator"></i>', 
            desc: 'Arithmetic and numeric problem solving.',
            color: 'blue'
        },
        'Verbal Ability': { 
            icon: '<i class="fas fa-comment-dots"></i>', 
            desc: 'English grammar and verbal reasoning.',
            color: 'green'
        },
        'Placement / Company Tests': { 
            icon: '<i class="fas fa-laptop-code"></i>', 
            desc: 'Company-specific aptitude and logical puzzles.',
            color: 'orange'
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

    function renderCategories(filterCategory = null) {
        const grid = document.getElementById('quiz-category-grid');
        if (!grid) return;
        grid.innerHTML = '';
        
        Object.keys(categoryMeta).forEach(catName => {
            if (filterCategory && catName !== filterCategory) return;

            const meta = categoryMeta[catName];
            const catQuestions = allQuestions.filter(q => q.topic === catName && !solvedQuestionsList.includes(q.id));
            const count = catQuestions.length;

            const card = document.createElement('div');
            card.className = 'glass-morphism p-5 flex flex-col gap-4 category-card border-none';
            
            card.innerHTML = `
                <div class="flex items-start gap-4" onclick="showQuestionsInCategory('${catName}')">
                    <div class="w-12 h-12 bg-slate-100 dark:bg-white/10 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                        ${meta.icon}
                    </div>
                    <div class="flex-1 space-y-0.5">
                        <div class="flex items-center justify-between">
                            <h3 class="text-base font-bold text-slate-900 dark:text-white leading-tight">${catName}</h3>
                            <i class="fas fa-chevron-right text-[10px] text-slate-300"></i>
                        </div>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight line-clamp-2">${meta.desc}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5">
                    <div class="flex items-center gap-2">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
                        <span class="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">${count} Questions Available</span>
                    </div>
                    <button class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-indigo-600/20 active:scale-95 transition-all" onclick="showQuestionsInCategory('${catName}')">
                        START QUIZ
                    </button>
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
                tbody.innerHTML = '<div class="glass-morphism p-10 mt-4 rounded-3xl text-center text-slate-400 font-bold text-xs uppercase tracking-widest border-none">No mission logs found</div>';
                return;
            }

            data.history.forEach(sub => {
                const card = document.createElement('div');
                card.className = 'glass-morphism p-5 rounded-2xl mb-4 space-y-3 border-none shadow-sm';
                card.innerHTML = `
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-500">${sub.topic}</span>
                        <span class="text-[9px] font-medium text-slate-400">${sub.timestamp.split(' ')[0]}</span>
                    </div>
                    <div class="font-bold text-slate-900 dark:text-white text-sm leading-snug">${sub.question_title}</div>
                    <div class="flex items-center justify-between pt-2">
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full ${sub.is_correct ? 'bg-emerald-500' : 'bg-rose-500'}"></div>
                            <span class="text-[9px] font-bold uppercase tracking-widest ${sub.is_correct ? 'text-emerald-600' : 'text-rose-500'}">${sub.is_correct ? 'Success' : 'Failed'}</span>
                        </div>
                        <span class="text-[9px] font-bold text-slate-400 uppercase">View Details</span>
                    </div>
                `;
                tbody.appendChild(card);
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
            
            try {
                const res = await fetch(`${API_BASE}/messages`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: formObj
                });
                if (res.ok) {
                    showAlert('Message synced with control center!');
                    msgForm.reset();
                    fetchMessages();
                } else {
                    showAlert('Sync failed', true);
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
                 list.innerHTML = '<div class="glass-morphism p-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No Transmissions</div>';
                 return;
            }
            
            data.messages.forEach(m => {
                const item = document.createElement('div');
                item.className = 'glass-morphism p-6 space-y-3 text-left rounded-[24px] border-none shadow-sm';
                const isAdmin = m.sender_role === 'admin' || m.receiver_id === null;
                
                item.innerHTML = `
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-lg ${isAdmin ? 'bg-indigo-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'} flex items-center justify-center text-[10px]">
                            <i class="fas fa-${isAdmin ? 'shield-alt' : 'user'}"></i>
                        </div>
                        <div>
                            <div class="text-[9px] font-black uppercase tracking-widest text-slate-400">${isAdmin ? 'Control Center' : 'Your Transmission'}</div>
                            <div class="text-[9px] font-bold text-slate-500">${m.timestamp}</div>
                        </div>
                    </div>
                    <p class="text-xs font-medium text-slate-600 dark:text-slate-300">${m.content}</p>
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
                tr.className = `flex items-center gap-4 px-5 py-4 ${std.is_me ? 'bg-indigo-600/5' : ''}`;
                const rankIcon = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
                
                tr.innerHTML = `
                    <div class="w-8 h-8 rounded-xl ${index < 3 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'} flex items-center justify-center font-bold text-xs shadow-sm">
                        ${rankIcon ? rankIcon : index + 1}
                    </div>
                    <div class="flex-1 flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full border-2 border-indigo-500/10 p-0.5">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${std.username}" class="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800">
                        </div>
                        <div>
                            <div class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                ${std.username} 
                                ${std.is_me ? '<span class="text-[8px] px-2 py-0.5 bg-indigo-600 text-white rounded-full font-bold uppercase tracking-tighter">You</span>' : ''}
                            </div>
                            <div class="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mt-0.5">Aptitude Scholar</div>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-bold text-indigo-600">${std.average}%</div>
                    </div>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }

    // Initialize
    fetchStudentQuestions();
});
