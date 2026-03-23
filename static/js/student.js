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

    async function fetchMeetLinks() {
        try {
            const listIds = ['student-meetlinks-list', 'student-meetlinks-mob'];

            const res = await fetch(`${API_BASE}/meetlinks`, { method: 'GET', headers: getHeaders() });
            if (!res.ok) return;
            const data = await res.json();

            const links = data.meetlinks;

            listIds.forEach(id => {
                const list = document.getElementById(id);
                // If the section is the mobile section, we replace its inner div content. 
                // Wait, finding the list container:
                const container = id === 'student-meetlinks-mob' ? list.querySelector('div') : list;
                if (!container) return;

                if (links.length === 0) {
                    container.innerHTML = `
                        <div class="w-16 h-16 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-2 shadow-inner">
                            <i class="fas fa-video"></i>
                        </div>
                        <p class="text-sm font-bold text-slate-900 dark:text-white mt-4">No active classes scheduled right now.</p>
                        <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-2">When your instructor schedules a live aptitude session, the meeting link will appear here.</p>
                    `;
                    return;
                }

                container.className = id === 'student-meetlinks-list' ? 'items-list space-y-4' : 'space-y-4 w-full';
                container.innerHTML = links.map(m => `
                    <div class="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-left relative overflow-hidden group">
                        <div class="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div class="flex items-center gap-4 relative z-10">
                            <div class="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center text-xl shrink-0">
                                <i class="fas fa-video"></i>
                            </div>
                            <div class="flex-1">
                                <div class="text-[10px] text-slate-500 font-bold mb-0.5 uppercase tracking-widest">${m.created_at}</div>
                                <div class="font-bold text-lg text-slate-900 dark:text-white mb-2 leading-tight">${m.title}</div>
                            </div>
                        </div>
                        <div class="mt-4 relative z-10">
                            <a href="${m.url}" target="_blank" class="w-full inline-flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all">
                                Join Session <i class="fas fa-external-link-alt text-xs opacity-70"></i>
                            </a>
                        </div>
                    </div>
                `).join('');
            });
        } catch (err) {
            console.error('Error fetching meet links:', err);
        }
    }

    async function fetchLeaderboard() {
        try {
            const res = await fetch(`${API_BASE}/leaderboard`, { method: 'GET', headers: getHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            const lb = data.leaderboard;

            // Render Desktop
            const desktopTbody = document.getElementById('student-leaderboard-tbody');
            if (desktopTbody) {
                desktopTbody.innerHTML = lb.map(s => {
                    let rankIcon = '';
                    if (s.rank === 1) rankIcon = '🥇 ';
                    else if (s.rank === 2) rankIcon = '🥈 ';
                    else if (s.rank === 3) rankIcon = '🥉 ';

                    return `
                        <tr>
                            <td><span class="font-bold">${rankIcon}${s.rank}</span></td>
                            <td>
                                <div class="font-bold text-slate-900 dark:text-white">${s.name}</div>
                                <div class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">@${s.username}</div>
                            </td>
                            <td>${s.answeredQuestions}</td>
                            <td class="text-[11px] text-slate-500">${s.lastActivity ? new Date(s.lastActivity).toLocaleString() : 'Never'}</td>
                        </tr>
                    `;
                }).join('');
            }

            // Render Mobile
            const mobileTbody = document.getElementById('student-leaderboard-tbody-mob');
            if (mobileTbody) {
                mobileTbody.innerHTML = lb.map(s => {
                    let rankColor = 'bg-slate-100 dark:bg-slate-800 text-slate-500';
                    let rankIcon = '';
                    if (s.rank === 1) { rankColor = 'bg-amber-100 text-amber-600'; rankIcon = '🥇'; }
                    else if (s.rank === 2) { rankColor = 'bg-slate-200 text-slate-600'; rankIcon = '🥈'; }
                    else if (s.rank === 3) { rankColor = 'bg-orange-100 text-orange-600'; rankIcon = '🥉'; }

                    return `
                        <div class="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
                            <div class="w-10 h-10 rounded-xl ${rankColor} flex items-center justify-center font-black text-sm shrink-0">
                                ${rankIcon || s.rank}
                            </div>
                            <div class="flex-1">
                                <div class="font-bold text-slate-900 dark:text-white">${s.name}</div>
                                <div class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">@${s.username}</div>
                            </div>
                            <div class="text-right">
                                <div class="text-indigo-600 font-black text-sm">${s.answeredQuestions}</div>
                                <div class="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Solved</div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (err) {
            console.error('Error fetching leaderboard:', err);
        }
    }

    // fetchMeetLinks was already here...

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

                // If dark mode is enabled, also show the quiz/practice section automatically
                if (isDark) {
                    const practiceTab = document.querySelector('[data-target="practice"], [data-target="practice-mob"]');
                    if (practiceTab) practiceTab.click();
                }
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
                if (b) b.innerHTML = '<i class="fas fa-compress"></i>';
            });
        } else {
            document.exitFullscreen();
            ['fullscreen-toggle', 'fullscreen-toggle-mob'].forEach(id => {
                const b = document.getElementById(id);
                if (b) b.innerHTML = '<i class="fas fa-expand"></i>';
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

    const getVisibleSection = () => {
        for (const s of sections) {
            if (!s.classList.contains('hidden') && s.style.display !== 'none') return s;
        }
        return null;
    };

    let isSwitching = false;

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (isSwitching) return;
            const target = item.getAttribute('data-target');
            const category = item.getAttribute('data-category');

            navItems.forEach(i => i.classList.remove('active', 'active-pill'));
            item.classList.add('active', 'active-pill');

            const current = getVisibleSection();
            const targetSection = document.getElementById(target);
            if (!targetSection || targetSection === current) return;

            isSwitching = true;

            if (heroSection) {
                heroSection.classList.add('hidden');
                heroSection.style.display = '';
            }

            if (current) {
                current.classList.remove('section-enter');
                current.classList.add('section-exit');
            }

            setTimeout(() => {
                sections.forEach(s => {
                    s.classList.add('hidden');
                    s.style.display = '';
                    s.classList.remove('section-exit', 'section-enter');
                });

                targetSection.classList.remove('hidden');
                void targetSection.offsetWidth; // restart animation
                targetSection.classList.add('section-enter');

                isSwitching = false;
            }, current ? 220 : 0);

            if (target.includes('practice')) {
                renderCategories(category);
            }
            if (target.includes('leaderboard')) fetchLeaderboard();
            if (target.includes('stats')) loadStats();
            if (target.includes('history')) fetchHistory();
            if (target.includes('messages')) fetchMessages();
            if (target.includes('meetlinks')) fetchMeetLinks();

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
                        card.className = 'glass-morphism p-5 rounded-3xl mb-4 space-y-4 border-none shadow-xl';
                        card.innerHTML = `
                            <div class="flex items-center justify-between">
                                <span class="text-[10px] font-black uppercase tracking-widest text-brand-purple bg-brand-purple/10 px-2 py-1 rounded-lg">${sub.topic}</span>
                                <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">${sub.timestamp.split(' ')[0]}</span>
                            </div>
                            <div class="font-bold text-slate-900 dark:text-white text-sm leading-tight line-clamp-2">${sub.question_title}</div>
                            <div class="flex items-center justify-between pt-2">
                                <div class="flex items-center gap-2">
                                    <div class="w-2.5 h-2.5 rounded-full ${sub.is_correct ? 'bg-emerald-500' : 'bg-rose-500'} shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                                    <span class="text-[10px] font-black uppercase tracking-widest ${sub.is_correct ? 'text-emerald-500' : 'text-rose-500'}">${sub.is_correct ? 'Success' : 'Failed'}</span>
                                </div>
                                ${(() => {
                                    if (!sub.file_path) return '';
                                    const ext = sub.file_path.split('.').pop().split('?')[0].toLowerCase();
                                    const allowed = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
                                    // Also allow the new API links which might not have extensions but we assume are valid now
                                    if (sub.file_path.includes('/api/downloads/submission/') || allowed.includes(ext)) {
                                        return `<button onclick="previewFile('${sub.file_path}')" class="px-4 py-2 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest active:scale-95 transition-all"><i class="fas fa-eye mr-1.5"></i> Proof</button>`;
                                    }
                                    return '';
                                })()}
                            </div>
                        `;
                        el.appendChild(card);
                    } else {
                        const tr = document.createElement('tr');
                        tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-default';
                        tr.innerHTML = `
                            <td class="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">${sub.question_title}</td>
                            <td class="px-6 py-4"><span class="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 uppercase">${sub.topic}</span></td>
                            <td class="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">${sub.selected_option || 'N/A'}</td>
                            <td class="px-6 py-4"><span class="badge ${sub.is_correct ? 'correct' : 'incorrect'}">${sub.is_correct ? 'Correct' : 'Incorrect'}</span></td>
                            <td class="px-6 py-4 text-slate-400 text-xs">${sub.timestamp}</td>
                            <td class="px-6 py-4 text-right">
                                ${(() => {
                                    if (!sub.file_path) return '<span class="text-slate-300 text-[10px] uppercase font-bold">No Proof</span>';
                                    const ext = sub.file_path.split('.').pop().split('?')[0].toLowerCase();
                                    const allowed = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
                                    if (sub.file_path.includes('/api/downloads/submission/') || allowed.includes(ext)) {
                                        return `<button onclick="previewFile('${sub.file_path}')" class="text-indigo-600 hover:text-indigo-700 font-black text-[10px] uppercase tracking-widest"><i class="fas fa-eye mr-1"></i> View</button>`;
                                    }
                                    return '<span class="text-slate-300 text-[10px] uppercase font-bold">No Proof</span>';
                                })()}
                            </td>
                        `;
                        el.appendChild(tr);
                    }
                });
            });
        } catch (err) { console.error(err); }
    }

    window.previewFile = (path) => {
        console.log("🛠️ Attempting to preview file:", path);
        const modal = document.getElementById('file-preview-modal');
        const body = document.getElementById('preview-body');
        const downloadBtn = document.getElementById('preview-download-btn');

        if (!modal || !body || !downloadBtn) {
            console.error("❌ Preview modal elements missing!");
            return;
        }

        body.innerHTML = `
            <div class="p-20 text-center flex flex-col items-center gap-4">
                <i class="fas fa-circle-notch fa-spin text-4xl text-indigo-600"></i>
                <p class="text-[10px] font-black uppercase text-slate-400 tracking-widest">Opening Secure Archive...</p>
            </div>
        `;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';

        const ext = path.split('.').pop().toLowerCase();
        downloadBtn.href = path;

        setTimeout(() => {
            const cacheBuster = `t=${new Date().getTime()}`;
            const fullUrl = path.includes('?') ? `${path}&${cacheBuster}` : `${path}?${cacheBuster}`;

            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'jfif', 'pjpeg', 'pjp'].includes(ext)) {
                // Pre-check file availability
                fetch(path, { method: 'HEAD' })
                    .then(r => {
                        console.log("🔍 File availability check:", r.status);
                        if (r.ok) {
                            body.innerHTML = `
                                <img src="${fullUrl}" 
                                     class="max-w-full h-auto rounded-xl shadow-2xl border-4 border-white dark:border-slate-800 motion-safe:animate-reveal" 
                                     style="max-height: 65vh; object-fit: contain;"
                                     onerror="this.parentElement.innerHTML='<div class=p-10>❌ Error loading image. The file might be corrupt or blocked.</div>'"
                                     loading="lazy">
                            `;
                        } else {
                            body.innerHTML = `
                                <div class="p-16 text-center space-y-4">
                                    <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl">
                                        <i class="fas fa-exclamation-triangle"></i>
                                    </div>
                                    <h5 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">File Not Found (404)</h5>
                                    <p class="text-[10px] text-slate-500 max-w-[200px] mx-auto">The link exists in the database, but the file is missing from the server storage.</p>
                                    <div class="pt-4">
                                        <a href="${path}" download class="text-[10px] font-black uppercase text-indigo-600 border-b-2 border-indigo-600 pb-1">Try Direct Download</a>
                                    </div>
                                </div>
                            `;
                        }
                    })
                    .catch(() => {
                        body.innerHTML = `<div class="p-10 text-slate-400 font-bold">❌ Connection error. The server might be blocking the request.</div>`;
                    });
            } else if (ext === 'pdf') {
                body.innerHTML = `<iframe src="${fullUrl}" class="w-full h-[65vh] rounded-xl border-0 shadow-lg bg-white" loading="lazy"></iframe>`;
            } else if (['doc', 'docx', 'xls', 'xlsx'].includes(ext)) {
                body.innerHTML = `
                    <div class="p-16 text-center space-y-6">
                        <div class="w-24 h-24 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center text-4xl mx-auto text-blue-500 shadow-inner">
                            <i class="fas fa-file-word"></i>
                        </div>
                        <div class="space-y-2">
                            <h4 class="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight">MS Office Document</h4>
                            <p class="text-xs font-bold text-slate-500">Browser cannot preview .${ext} files directly.</p>
                        </div>
                        <div class="pt-4">
                            <p class="text-[9px] text-slate-400 uppercase tracking-widest font-black mb-4">Click below to open/download</p>
                        </div>
                    </div>
                `;
            } else {
                body.innerHTML = `
                    <div class="p-16 text-center space-y-6">
                        <div class="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-4xl mx-auto text-slate-400">
                            <i class="fas fa-file-download"></i>
                        </div>
                        <p class="text-sm font-bold text-slate-500">Direct preview unavailable for .${ext} files.</p>
                        <p class="text-[9px] text-slate-400 uppercase tracking-widest font-black">Download to view contents</p>
                    </div>
                `;
            }
        }, 600);
    };

    window.closeFilePreview = () => {
        const modal = document.getElementById('file-preview-modal');
        if (modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
        document.getElementById('preview-body').innerHTML = '';
    };

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
                ? '<div class="p-10 text-center text-slate-400 animate-pulse uppercase text-[10px] font-bold tracking-widest">Scanning rankings...</div>'
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

                data.leaderboard.forEach((std) => {
                    const rank = std.rank;
                    const isTop3 = rank <= 3;
                    const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
                    const rankStr = medal || `#${rank}`;
                    const isMe = std.username === localStorage.getItem('username');

                    if (cont.isMob) {
                        const tr = document.createElement('div');
                        tr.className = `flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 w-full ${isMe ? 'bg-indigo-600/10 border-indigo-500/40 shadow-xl' :
                                rank === 1 ? 'bg-amber-500/5 border-amber-500/20' :
                                    rank === 2 ? 'bg-slate-400/5 border-slate-400/20' :
                                        rank === 3 ? 'bg-orange-800/5 border-orange-800/20' :
                                            'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                            }`;

                        tr.innerHTML = `
                            <div class="w-10 h-10 rounded-xl ${rank === 1 ? 'bg-amber-500/20 text-amber-600' :
                                rank === 2 ? 'bg-slate-500/20 text-slate-500' :
                                    rank === 3 ? 'bg-orange-700/20 text-orange-700' :
                                        'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            } flex items-center justify-center font-black text-sm shrink-0">
                                ${rankStr}
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="font-bold text-slate-900 dark:text-white truncate flex items-center gap-2">
                                    ${std.name}
                                    ${isMe ? '<span class="text-[8px] px-1.5 py-0.5 bg-indigo-600 text-white rounded-full font-bold uppercase tracking-widest">You</span>' : ''}
                                </div>
                                <div class="text-[9px] text-slate-500 font-bold uppercase tracking-widest truncate">@${std.username}</div>
                            </div>
                            <div class="text-right shrink-0">
                                <div class="text-indigo-600 font-black text-sm">${std.answeredQuestions}</div>
                                <div class="text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">Solved</div>
                            </div>
                        `;
                        el.appendChild(tr);
                    } else {
                        const tr = document.createElement('tr');
                        tr.className = `transition-colors ${isMe ? 'bg-indigo-600/5' : ''} ${isTop3 ? 'font-bold' : ''}`;
                        tr.innerHTML = `
                            <td class="px-6 py-4">
                                <span class="text-sm font-black">${rankStr}</span>
                            </td>
                            <td class="px-6 py-4">
                                <div class="flex flex-col">
                                    <span class="text-slate-900 dark:text-white font-bold flex items-center gap-2">
                                        ${std.name}
                                        ${isMe ? '<span class="px-2 py-0.5 bg-indigo-600 text-white text-[9px] rounded-full font-black uppercase">You</span>' : ''}
                                    </span>
                                    <span class="text-[10px] text-slate-500 font-bold uppercase tracking-widest">@${std.username}</span>
                                </div>
                            </td>
                            <td class="px-6 py-4 text-center font-black text-slate-600 dark:text-slate-400">${std.answeredQuestions}</td>
                            <td class="px-6 py-4 text-center text-[11px] text-slate-500">
                                ${std.lastActivity ? new Date(std.lastActivity).toLocaleString() : 'Never'}
                            </td>
                        `;
                        el.appendChild(tr);
                    }
                });
            });
        } catch (err) {
            console.error(err);
        }
    }

    // Initialize
    fetchStudentQuestions();
    fetchMeetLinks();
    fetchLeaderboard();
});
