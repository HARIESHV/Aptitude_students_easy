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

    // Initialize Themes for both Desktop and Mobile
    const currentTheme = localStorage.getItem('theme') || 'light';
    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode', 'dark');
            const btns = ['theme-toggle', 'theme-toggle-mob'];
            btns.forEach(id => {
                const b = document.getElementById(id);
                if (b) b.innerHTML = '<i class="fas fa-sun"></i>';
            });
        } else {
            document.body.classList.remove('dark-mode', 'dark');
            const btns = ['theme-toggle', 'theme-toggle-mob'];
            btns.forEach(id => {
                const b = document.getElementById(id);
                if (b) b.innerHTML = '<i class="fas fa-moon"></i>';
            });
        }
    };
    applyTheme(currentTheme);

    ['theme-toggle', 'theme-toggle-mob'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                const isDark = document.body.classList.toggle('dark-mode');
                document.body.classList.toggle('dark');
                const theme = isDark ? 'dark' : 'light';
                localStorage.setItem('theme', theme);
                applyTheme(theme);
            });
        }
    });

    // --- Fullscreen Utility ---
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
            });
            ['fullscreen-toggle', 'fullscreen-toggle-mob'].forEach(id => {
                const b = document.getElementById(id);
                if(b) b.innerHTML = '<i class="fas fa-compress"></i>';
            });
        } else {
            document.exitFullscreen();
            ['fullscreen-toggle', 'fullscreen-toggle-mob'].forEach(id => {
                const b = document.getElementById(id);
                if(b) b.innerHTML = '<i class="fas fa-expand"></i>';
            });
        }
    };

    ['fullscreen-toggle', 'fullscreen-toggle-mob'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', toggleFullscreen);
    });

    if (document.getElementById('welcome-text')) document.getElementById('welcome-text').innerText = username;
    if (document.getElementById('welcome-text-mob')) document.getElementById('welcome-text-mob').innerText = username;
    if (document.getElementById('user-display-name')) document.getElementById('user-display-name').innerText = username;

    // --- Navigation ---
    const navItems = document.querySelectorAll('.nav-icon-link, .nav-links li');
    const sections = document.querySelectorAll('.dashboard-section, .dashboard-section-mob');
    const heroSection = document.getElementById('hero-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            const category = item.getAttribute('data-category');
            
            navItems.forEach(i => i.classList.remove('active', 'active-pill'));
            item.classList.add('active', 'active-pill');

            // Hide everything first using classes only
            sections.forEach(s => {
                s.classList.add('hidden');
                s.style.display = ''; // Clear any inline styles that might cause overlaps
            });
            if (heroSection) {
                heroSection.classList.add('hidden');
                heroSection.style.display = '';
            }
            
            const targetSection = document.getElementById(target);
            if (targetSection) {
                targetSection.classList.remove('hidden');
                // Use a consistent way to show sections without inline styles if possible
                // If it was hidden by Tailwind, removing 'hidden' is enough.
            }

            if (target.includes('practice')) {
                renderCategories(category); 
            }
            if(target.includes('leaderboard')) fetchLeaderboard();
            if(target.includes('stats')) loadStats();
            if(target.includes('history')) fetchHistory();
            if(target.includes('messages')) fetchMessages();
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    function showAlert(msg, isError = false) {
        const boxes = ['dashboard-alert', 'dashboard-alert-mob'];
        boxes.forEach(id => {
            const box = document.getElementById(id);
            if (!box) return;
            box.textContent = msg;
            box.className = `fixed top-20 left-4 right-4 z-[110] px-6 py-4 rounded-2xl font-bold flex items-center gap-3 border shadow-2xl backdrop-blur-md ${isError ? 'bg-red-500/90 text-white border-red-400' : 'bg-emerald-500/90 text-white border-emerald-400'}`;
            box.classList.remove('hidden');
            setTimeout(() => box.classList.add('hidden'), 3000);
        });
    }

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    });

    // --- Logout ---
    ['logout-btn', 'logout-btn-mob'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                localStorage.clear();
                window.location.href = '/';
            });
        }
    });

    let solvedQuestionsList = []; 

    // --- Load Stats ---
    async function loadStats() {
        try {
            const res = await fetch(`${API_BASE}/student/stats`, { headers: getHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            
            const mapping = {
                'stat-attempted': data.total_attempted,
                'stat-average': `${data.average}%`,
                'big-attempted': data.total_attempted,
                'big-attempted-mob': data.total_attempted,
                'big-average': data.average,
                'big-average-mob': data.average,
                'big-correct': data.correct_answers,
                'big-correct-mob': data.correct_answers
            };

            Object.keys(mapping).forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerText = mapping[id];
            });

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
        const grids = [
            { id: 'quiz-category-grid', isMob: false },
            { id: 'quiz-category-grid-mob', isMob: true }
        ];

        grids.forEach(gridInfo => {
            const grid = document.getElementById(gridInfo.id);
            if (!grid) return;
            grid.innerHTML = '';

            Object.keys(categoryMeta).forEach(catName => {
                if (filterCategory && catName !== filterCategory) return;

                const meta = categoryMeta[catName];
                const catQuestions = allQuestions.filter(q => q.topic === catName && !solvedQuestionsList.includes(q.id));
                const count = catQuestions.length;

                if (gridInfo.isMob) {
                    // Modern Mobile Card
                    const card = document.createElement('div');
                    card.className = 'glass-morphism p-5 flex flex-col gap-4 category-card border-none w-full';
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
                                START
                            </button>
                        </div>
                    `;
                    grid.appendChild(card);
                } else {
                    // Modern Desktop Premium Card
                    const card = document.createElement('div');
                    card.className = 'premium-card p-8 flex flex-col justify-between group';
                    card.innerHTML = `
                        <div>
                            <div class="category-icon-orb group-hover:scale-110 transition-transform">
                                ${meta.icon}
                            </div>
                            <h3 class="text-2xl font-black text-slate-800 dark:text-white mb-2">${catName}</h3>
                            <p class="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-6">${meta.desc}</p>
                        </div>
                        <div class="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
                            <div class="flex flex-col">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">Available</span>
                                <span class="text-lg font-black text-indigo-600">${count} Practice Sets</span>
                            </div>
                            <button onclick="showQuestionsInCategory('${catName}')" class="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
                                Practice Now
                            </button>
                        </div>
                    `;
                    grid.appendChild(card);
                }
            });
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
            
            const containers = [
                { id: 'student-history-tbody', isMob: false },
                { id: 'student-history-tbody-mob', isMob: true }
            ];

            containers.forEach(cont => {
                const el = document.getElementById(cont.id);
                if (!el) return;
                el.innerHTML = '';

                if (data.history.length === 0) {
                    el.innerHTML = cont.isMob 
                        ? '<div class="glass-morphism p-10 mt-4 rounded-3xl text-center text-slate-400 font-bold text-xs uppercase tracking-widest border-none">No mission logs found</div>'
                        : '<tr><td colspan="6" style="text-align:center;">No history found.</td></tr>';
                    return;
                }

                data.history.forEach(sub => {
                    if (cont.isMob) {
                        const card = document.createElement('div');
                        card.className = 'glass-morphism p-5 rounded-2xl mb-4 space-y-3 border-none shadow-sm';
                        card.innerHTML = `
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-bold uppercase tracking-widest text-indigo-500">${sub.topic}</span>
                                <span class="text-[9px] font-medium text-slate-400">${sub.timestamp.split(' ') ? sub.timestamp.split(' ')[0] : ''}</span>
                            </div>
                            <div class="font-bold text-slate-900 dark:text-white text-sm leading-snug">${sub.question_title}</div>
                            <div class="flex items-center justify-between pt-2">
                                <div class="flex items-center gap-2">
                                    <div class="w-2 h-2 rounded-full ${sub.is_correct ? 'bg-emerald-500' : 'bg-rose-500'}"></div>
                                    <span class="text-[9px] font-bold uppercase tracking-widest ${sub.is_correct ? 'text-emerald-600' : 'text-rose-500'}">${sub.is_correct ? 'Success' : 'Failed'}</span>
                                </div>
                            </div>
                        `;
                        el.appendChild(card);
                    } else {
                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td>${sub.question_title}</td>
                            <td>${sub.topic}</td>
                            <td>${sub.selected_option}</td>
                            <td>${sub.correct_option}</td>
                            <td><span class="badge ${sub.is_correct ? 'correct' : 'incorrect'}">${sub.is_correct ? 'Correct' : 'Incorrect'}</span></td>
                            <td>${sub.timestamp}</td>
                        `;
                        el.appendChild(tr);
                    }
                });
            });
        } catch (err) { console.error(err); }
    }

    // --- Messaging UI ---
    const msgForm = document.getElementById('student-send-msg-form');
    const msgFormMob = document.getElementById('student-send-msg-form-mob');
    
    const handleMsgSubmit = async (e, contentId) => {
        e.preventDefault();
        const contentEl = document.getElementById(contentId);
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Sending...';
        btn.disabled = true;

        const formObj = new FormData();
        formObj.append('content', contentEl.value);
        formObj.append('receiver_id', '1'); 
        
        try {
            const res = await fetch(`${API_BASE}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formObj
            });
            if (res.ok) {
                showAlert('Message sent!');
                e.target.reset();
                fetchMessages();
            } else {
                showAlert('Send failed', true);
            }
        } catch (error) { showAlert('Connection Error', true); }
        finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    if (msgForm) msgForm.addEventListener('submit', (e) => handleMsgSubmit(e, 's-msg-content'));
    if (msgFormMob) msgFormMob.addEventListener('submit', (e) => handleMsgSubmit(e, 's-msg-content-mob'));

    async function fetchMessages() {
        try {
            const res = await fetch(`${API_BASE}/messages`, { headers: getHeaders() });
            const data = await res.json();
            
            const containers = [
                { id: 'student-messages-list', isMob: false },
                { id: 'student-messages-list-mob', isMob: true }
            ];

            containers.forEach(cont => {
                const list = document.getElementById(cont.id);
                if (!list) return;
                list.innerHTML = '';
                
                if (data.messages.length === 0) {
                     list.innerHTML = `<div class="glass-morphism p-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest ${cont.isMob ? 'border-none' : ''}">No Transmissions</div>`;
                     return;
                }
                
                data.messages.forEach(m => {
                    const item = document.createElement('div');
                    item.className = cont.isMob 
                        ? 'glass-morphism p-5 space-y-3 text-left rounded-[24px] border-none shadow-sm'
                        : 'glass-morphism p-6 space-y-3 text-left rounded-[24px] border-none shadow-sm';
                    
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
                        <p class="text-xs font-medium text-slate-600 dark:text-slate-300 leading-snug">${m.content}</p>
                    `;
                    list.appendChild(item);
                });
            });
        } catch (err) { console.error(err); }
    }

    // --- Leaderboard Section ---
    async function fetchLeaderboard() {
        const containers = [
            { id: 'student-leaderboard-tbody', isMob: false },
            { id: 'student-leaderboard-tbody-mob', isMob: true }
        ];

        containers.forEach(cont => {
            const el = document.getElementById(cont.id);
            if (el) el.innerHTML = cont.isMob 
                ? '<div class="p-10 text-center text-slate-400 animate-pulse">Scanning rankings...</div>'
                : '<tr><td colspan="4" style="text-align:center;">Loading rankings...</td></tr>';
        });

        try {
            const res = await fetch(`${API_BASE}/leaderboard`, { headers: getHeaders() });
            const data = await res.json();
            
            containers.forEach(cont => {
                const el = document.getElementById(cont.id);
                if (!el) return;
                el.innerHTML = '';
                
                if (!data.leaderboard || data.leaderboard.length === 0) {
                    el.innerHTML = cont.isMob 
                        ? '<div class="glass-morphism p-10 text-center text-slate-400 font-bold text-xs uppercase tracking-widest">No rankings found</div>'
                        : '<tr><td colspan="4" style="text-align:center;">No leaderboard data available.</td></tr>';
                    return;
                }

                data.leaderboard.forEach((std, index) => {
                    const rankStr = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
                    
                    if (cont.isMob) {
                        const tr = document.createElement('div');
                        tr.className = `flex items-center gap-4 px-5 py-4 rounded-2xl mb-2 ${std.is_me ? 'bg-indigo-600/10 border border-indigo-500/20 shadow-lg' : 'bg-white/5 border border-transparent'}`;
                        tr.innerHTML = `
                            <div class="w-8 h-8 rounded-xl ${index < 3 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'} flex items-center justify-center font-bold text-xs shadow-sm">
                                ${rankStr}
                            </div>
                            <div class="flex-1 flex items-center gap-3 overflow-hidden">
                                <div class="w-10 h-10 rounded-full border-2 border-indigo-500/10 p-0.5 shrink-0">
                                    <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${std.username}" class="w-full h-full rounded-full bg-slate-100 dark:bg-slate-800">
                                </div>
                                <div class="overflow-hidden">
                                    <div class="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                                        ${std.username} 
                                        ${std.is_me ? '<span class="text-[8px] px-2 py-0.5 bg-indigo-600 text-white rounded-full font-bold uppercase tracking-tighter">You</span>' : ''}
                                    </div>
                                    <div class="text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mt-0.5">${std.total_submissions || 0} Submissions</div>
                                </div>
                            </div>
                            <div class="text-right shrink-0">
                                <div class="text-xs font-bold text-indigo-600">${std.average}%</div>
                            </div>
                        `;
                        el.appendChild(tr);
                    } else {
                        const tr = document.createElement('tr');
                        if (std.is_me) tr.style.background = 'rgba(99, 102, 241, 0.1)';
                        tr.innerHTML = `
                            <td><strong>${rankStr}</strong></td>
                            <td>${std.username} ${std.is_me ? '<span class="badge correct">You</span>' : ''}</td>
                            <td>${std.total_submissions || 0}</td>
                            <td><span class="highlight-text">${std.average}%</span></td>
                        `;
                        el.appendChild(tr);
                    }
                });
            });
        } catch (err) { 
            console.error(err);
            containers.forEach(cont => {
                const el = document.getElementById(cont.id);
                if (el) el.innerHTML = '<div class="p-10 text-center text-red-400">Error loading data.</div>';
            });
        }
    }

    // Initialize
    fetchStudentQuestions();
});
