const API_BASE = '/api';

const topicsMap = {
    "Quantitative Aptitude": [
        "Number System", "HCF & LCM", "Simplification", "Percentage", "Profit & Loss", "Simple Interest & Compound Interest", "Ratio & Proportion", "Average", "Time & Work", "Pipes & Cisterns", "Time, Speed & Distance", "Boats & Streams", "Mixture & Alligation",
        "Linear Equations", "Quadratic Equations", "Polynomials", "Inequalities", "Functions & Graphs",
        "Lines & Angles", "Triangles", "Quadrilaterals", "Circles", "Polygons",
        "Area & Perimeter (2D)", "Surface Area & Volume (3D)",
        "Basic Trigonometric Ratios", "Identities", "Heights & Distances",
        "Fundamental Counting Principle", "Permutations", "Combinations",
        "Basic Probability", "Conditional Probability",
        "Tables", "Bar Graphs", "Line Graphs", "Pie Charts", "Caselets"
    ],
    "Logical Reasoning": [
        "Number Series", "Letter Series", "Coding–Decoding", "Blood Relations", "Direction Sense", "Syllogisms", "Venn Diagrams", "Seating Arrangement", "Puzzles", "Analogies", "Clocks & Calendars"
    ],
    "Verbal Ability": [
        "Reading Comprehension", "Vocabulary (Synonyms, Antonyms)", "Sentence Correction", "Error Spotting", "Fill in the Blanks", "Para Jumbles", "Active & Passive Voice", "Direct & Indirect Speech"
    ],
    "Placement / Company Focused": [
        "Quant + Reasoning Mixed Problems", "Time-based Calculation Questions", "Data Sufficiency", "Logical Puzzles"
    ]
};

document.addEventListener('DOMContentLoaded', () => {
    /* Mobile guard removed */
    
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');

    if (!token || role !== 'admin') {
        window.location.href = '/';
        return;
    }

    // --- Core Sound Service (SyncSound) ---
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    let audioCtx = null;

    const soundEffects = {
        message: { freq: [523.25, 783.99], type: 'sine', duration: 0.15 },
        alert: { freq: [880, 440], type: 'square', duration: 0.3 },
        success: { freq: [440, 554.37, 659.25], type: 'sine', duration: 0.1 },
        error: { freq: [220, 110], type: 'sawtooth', duration: 0.4 },
        pop: { freq: [660], type: 'sine', duration: 0.05 }
    };

    function playSound(type) {
        try {
            if (!audioCtx) audioCtx = new AudioContextClass();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            const config = soundEffects[type];
            if (!config) return;

            const now = audioCtx.currentTime;
            config.freq.forEach((f, i) => {
                const osc = audioCtx.createOscillator();
                const gain = audioCtx.createGain();
                osc.type = config.type;
                osc.frequency.setValueAtTime(f, now + (i * 0.05));
                gain.gain.setValueAtTime(0.08, now + (i * 0.05));
                gain.gain.exponentialRampToValueAtTime(0.01, now + (i * 0.05) + config.duration);
                osc.connect(gain);
                gain.connect(audioCtx.destination);
                osc.start(now + (i * 0.05));
                osc.stop(now + (i * 0.05) + config.duration);
            });
        } catch (e) { console.warn("Sound inhibited:", e); }
    }

    // Initialize Theme
    const getThemeToggle = () => document.getElementById('theme-toggle-top-desktop') || document.getElementById('theme-toggle-mobile');
    const currentTheme = localStorage.getItem('theme') || 'light';
    
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode', 'dark');
        const toggles = [document.getElementById('theme-toggle-top-desktop'), document.getElementById('theme-toggle-mobile')];
        toggles.forEach(t => { if(t) t.innerHTML = '<i class="fas fa-sun"></i>'; });
    }

    const toggles = [document.getElementById('theme-toggle-top-desktop'), document.getElementById('theme-toggle-mobile')];
    toggles.forEach(toggle => {
        if (toggle) {
            toggle.addEventListener('click', () => {
                document.body.classList.toggle('dark-mode');
                document.body.classList.toggle('dark');
                const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
                localStorage.setItem('theme', theme);
                const icon = theme === 'dark' ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
                document.getElementById('theme-toggle-top-desktop').innerHTML = icon;
                document.getElementById('theme-toggle-mobile').innerHTML = icon;
            });
        }
    });

    const usernames = document.querySelectorAll('.welcome-username');
    usernames.forEach(el => el.innerText = username);

    // --- Navigation & Shared Container Logic ---
    const navItems = document.querySelectorAll('.nav-links .nav-item');
    const sections = document.querySelectorAll('.dashboard-section');
    const desktopTitle = document.getElementById('page-title-desktop');

    // Move sections to appropriate container on load and resize
    const sectionsRoot = document.getElementById('shared-sections'); 
    // Actually, I'll just move the dashboard-section elements themselves
    const desktopSectionsRoot = document.getElementById('desktop-sections-root');
    const mobileSectionsRoot = document.getElementById('mobile-content-area');

    function relocateSections() {
        const isDesktop = window.innerWidth >= 1024;
        const targetRoot = isDesktop ? desktopSectionsRoot : mobileSectionsRoot;
        if (!targetRoot) return;
        
        sections.forEach(s => targetRoot.appendChild(s));
    }

    window.addEventListener('resize', relocateSections);
    relocateSections();

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            
            navItems.forEach(i => i.classList.remove('active'));
            // Activate all nav items that point to the same target (desktop + mobile)
            document.querySelectorAll(`.nav-links .nav-item[data-target="${target}"]`).forEach(i => i.classList.add('active'));
            
            sections.forEach(s => s.classList.add('hidden'));
            const targetSection = document.getElementById(target);
            if (targetSection) targetSection.classList.remove('hidden');
            
            if (desktopTitle) {
                const textOnly = item.cloneNode(true);
                const icon = textOnly.querySelector('i');
                if(icon) icon.remove();
                desktopTitle.innerText = textOnly.innerText.trim();
            }

            if(target === 'questions') fetchQuestions();
            if(target === 'submissions' || target === 'proofs') fetchSubmissions();
            if(target === 'meetlinks') fetchMeetLinks();
            if(target === 'messages') { fetchMessages(); fetchStudentsForMessages(); }
            if(target === 'registry') fetchStudents();
            if(target === 'leaderboard') fetchLeaderboard();
        });
    });

    const alertBox = document.getElementById('dashboard-alert');
    function showAlert(msg, isError = false) {
        if (!alertBox) {
            if (isError) { console.error(msg); playSound('error'); }
            else { console.log(msg); playSound('success'); }
            return;
        }
        if (isError) playSound('error'); else playSound('success');
        alertBox.textContent = msg;
        alertBox.className = `px-6 py-4 rounded-2xl font-bold flex items-center gap-3 border shadow-lg ${isError ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/50'}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 3000);
    }

    const emptyState = (msg) => `<div class="text-center p-12 text-slate-400 font-bold col-span-full">${msg}</div>`;

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    });

    // --- Logout ---
    const logoutBtn = document.getElementById('logout-btn-desktop');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/';
        });
    }
    
    const logoutBtnMob = document.getElementById('logout-btn-mobile');
    if (logoutBtnMob) {
        logoutBtnMob.addEventListener('click', () => {
            localStorage.clear();
            window.location.href = '/';
        });
    }
    
    // --- Topics Mapping ---
    const setupTopicHandler = (topicId, subtopicId) => {
        const topicEl = document.getElementById(topicId);
        const subtopicEl = document.getElementById(subtopicId);
        if (topicEl && subtopicEl) {
            topicEl.addEventListener('change', (e) => {
                subtopicEl.innerHTML = '<option value="" disabled selected>Select Subtopic</option>';
                const subs = topicsMap[e.target.value] || [];
                subs.forEach(sub => {
                    const opt = document.createElement('option');
                    opt.value = sub;
                    opt.innerText = sub;
                    subtopicEl.appendChild(opt);
                });
            });
        }
    };

    setupTopicHandler('q-topic', 'q-subtopic');
    setupTopicHandler('edit-q-topic', 'edit-q-subtopic');

    // --- Questions Section ---
    document.getElementById('add-question-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const totalSeconds = 
            (parseInt(document.getElementById('q-days').value) || 0) * 86400 +
            (parseInt(document.getElementById('q-hours').value) || 0) * 3600 +
            (parseInt(document.getElementById('q-mins').value) || 0) * 60 +
            (parseInt(document.getElementById('q-secs').value) || 0);
        
        const data = {
            topic: document.getElementById('q-topic').value,
            subtopic: document.getElementById('q-subtopic').value,
            time_limit: totalSeconds,
            title: document.getElementById('q-title').value,
            description: document.getElementById('q-desc').value,
            question_type: document.getElementById('q-type').value,
            answer_description: document.getElementById('q-ans-desc').value,
            option_a: document.getElementById('q-opt-a').value,
            option_b: document.getElementById('q-opt-b').value,
            option_c: document.getElementById('q-opt-c').value,
            option_d: document.getElementById('q-opt-d').value,
            correct_option: document.getElementById('q-correct').value,
            correct_text_answer: document.getElementById('q-text-answer').value
        };

        try {
            const btn = document.getElementById('deploy-btn');
            if (btn) btn.disabled = true;
            
            const res = await fetch(`${API_BASE}/questions`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showAlert('Intelligence Node deployed!');
                document.getElementById('add-question-form').reset();
                fetchQuestions();
            } else {
                const err = await res.json();
                showAlert(err.message || 'Deployment failed', true);
            }
        } catch (error) { showAlert('Connection Error', true); }
        finally {
            const btn = document.getElementById('deploy-btn');
            if (btn) btn.disabled = false;
        }
    });

    document.getElementById('edit-question-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-q-id').value;
        const totalSeconds = 
            (parseInt(document.getElementById('edit-q-days').value) || 0) * 86400 +
            (parseInt(document.getElementById('edit-q-hours').value) || 0) * 3600 +
            (parseInt(document.getElementById('edit-q-mins').value) || 0) * 60 +
            (parseInt(document.getElementById('edit-q-secs').value) || 0);

        const data = {
            topic: document.getElementById('edit-q-topic').value,
            subtopic: document.getElementById('edit-q-subtopic').value,
            time_limit: totalSeconds,
            title: document.getElementById('edit-q-title').value,
            description: document.getElementById('edit-q-desc').value,
            question_type: document.getElementById('edit-q-type').value,
            answer_description: document.getElementById('edit-q-ans-desc').value,
            option_a: document.getElementById('edit-q-opt-a').value,
            option_b: document.getElementById('edit-q-opt-b').value,
            option_c: document.getElementById('edit-q-opt-c').value,
            option_d: document.getElementById('edit-q-opt-d').value,
            correct_option: document.getElementById('edit-q-correct').value,
            correct_text_answer: document.getElementById('edit-q-text-answer').value
        };

        try {
            const res = await fetch(`${API_BASE}/questions/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showAlert('Intelligence Node updated!');
                closeEditModal();
                fetchQuestions();
            } else showAlert('Update failed', true);
        } catch (error) { showAlert('Error', true); }
    });

    window.fetchQuestions = async () => {
        const list = document.getElementById('admin-questions-list');
        if (!list) return;

        list.innerHTML = '<div class="py-20 text-center"><div class="spinner mb-4 mx-auto"></div><div class="text-slate-400 font-bold">Syncing Question Bank...</div></div>';
        list.classList.add('flex', 'flex-col', 'items-center', 'justify-center');
        
        try {
            const res = await fetch(`${API_BASE}/questions`, { headers: getHeaders() });
            if (res.status === 401) { window.location.href = '/login'; return; }
            if (!res.ok) throw new Error('Failed to fetch');
            
            const data = await res.json();
            list.innerHTML = '';
            list.classList.remove('flex', 'flex-col', 'items-center', 'justify-center');
            
            // Update count badge
            const badge = document.getElementById('questions-count-badge');
            if (badge) badge.innerHTML = `<i class="fas fa-list-ol mr-1.5"></i> ${data.questions ? data.questions.length : 0} Questions`;
            
            if (!data.questions || data.questions.length === 0) {
                list.classList.add('flex', 'flex-col', 'items-center', 'justify-center');
                list.innerHTML = `<div class="py-20 text-center text-slate-400 font-bold">No assessments deployed yet.</div>`;
                return;
            }
            
            data.questions.forEach(q => {
                const item = document.createElement('div');
                item.className = 'p-6 md:p-8 space-y-4 group hover:bg-indigo-50/30 dark:hover:bg-indigo-900/5 transition-all';
                const hasExplanation = q.answer_description && q.answer_description.trim();
                item.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="space-y-2.5 flex-1 min-w-0 mr-4">
                            <div class="flex items-center gap-2 flex-wrap">
                                <span class="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">${q.topic}</span>
                                <span class="text-xs font-bold text-slate-400">#${q.id}</span>
                                ${hasExplanation 
                                    ? `<span class="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><i class="fas fa-lightbulb"></i> Explanation</span>` 
                                    : `<span class="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><i class="fas fa-exclamation-triangle"></i> No Explanation</span>`
                                }
                            </div>
                            <h4 class="text-lg font-bold text-slate-900 dark:text-white leading-snug">${q.title}</h4>
                            <div class="flex items-center gap-4 text-xs font-medium text-slate-500 flex-wrap">
                                 <span class="flex items-center gap-1"><i class="fas fa-clock"></i> ${q.time_limit > 0 ? formatTime(q.time_limit) : 'Unlimited'}</span>
                                 <span class="flex items-center gap-1"><i class="fas fa-tag"></i> ${q.subtopic}</span>
                                 <span class="flex items-center gap-1 font-bold text-indigo-600"><i class="fas fa-key"></i> ${q.question_type === 'text' ? q.correct_text_answer : 'Option ' + q.correct_option}</span>
                            </div>
                            ${hasExplanation ? `
                            <div class="pt-1">
                                <p class="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-emerald-50/70 dark:bg-emerald-900/10 px-4 py-3 rounded-xl border border-emerald-100 dark:border-emerald-900/30 line-clamp-2">
                                    <i class="fas fa-lightbulb text-emerald-500 mr-1.5"></i>${q.answer_description}
                                </p>
                            </div>` : ''}
                        </div>
                        <div class="flex gap-2 shrink-0 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                            <button class="w-9 h-9 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-lg flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all" onclick='editQuestion(${JSON.stringify(q).replace(/'/g, "&apos;")})'>
                                <i class="fas fa-edit text-sm"></i>
                            </button>
                            <button class="w-9 h-9 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-600 hover:text-white transition-all" onclick="deleteQuestion(${q.id})">
                                <i class="fas fa-trash text-sm"></i>
                            </button>
                        </div>
                    </div>
                `;
                list.appendChild(item);
            });
        } catch (err) { 
            list.innerHTML = emptyState('Error linking with cloud database.');
            console.error(err); 
        }
    }

    function formatTime(totalSeconds) {
        const d = Math.floor(totalSeconds / 86400);
        const h = Math.floor((totalSeconds % 86400) / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        let p = [];
        if(d > 0) p.push(`${d}d`);
        if(h > 0 || d > 0) p.push(`${h.toString().padStart(2, '0')}h`);
        p.push(`${m.toString().padStart(2, '0')}m`);
        p.push(`${s.toString().padStart(2, '0')}s`);
        return p.join(':');
    }

    window.deleteQuestion = async (id) => {
        if(!confirm('Purge this intelligence node? Submissions will be lost.')) return;
        try {
            const res = await fetch(`${API_BASE}/questions/${id}`, { method: 'DELETE', headers: getHeaders() });
            if (res.ok) { showAlert('Node purged.'); fetchQuestions(); }
            else showAlert('Purge failed', true);
        } catch (err) { console.error(err); }
    };

    window.editQuestion = (q) => {
        document.getElementById('edit-q-id').value = q.id;
        document.getElementById('edit-q-topic').value = q.topic;
        const subtopicSelect = document.getElementById('edit-q-subtopic');
        subtopicSelect.innerHTML = '';
        (topicsMap[q.topic] || []).forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub; opt.innerText = sub;
            if(sub === q.subtopic) opt.selected = true;
            subtopicSelect.appendChild(opt);
        });
        document.getElementById('edit-q-title').value = q.title;
        document.getElementById('edit-q-desc').value = q.description || '';
        let t = q.time_limit;
        document.getElementById('edit-q-days').value = Math.floor(t / 86400); t %= 86400;
        document.getElementById('edit-q-hours').value = Math.floor(t / 3600); t %= 3600;
        document.getElementById('edit-q-mins').value = Math.floor(t / 60);
        document.getElementById('edit-q-secs').value = t % 60;
        document.getElementById('edit-q-type').value = q.question_type || 'mcq';
        document.getElementById('edit-q-ans-desc').value = q.answer_description || '';
        document.getElementById('edit-q-text-answer').value = q.correct_text_answer || '';
        document.getElementById('edit-q-opt-a').value = q.option_a || '';
        document.getElementById('edit-q-opt-b').value = q.option_b || '';
        document.getElementById('edit-q-opt-c').value = q.option_c || '';
        document.getElementById('edit-q-opt-d').value = q.option_d || '';
        document.getElementById('edit-q-correct').value = q.correct_option || '';
        openEditModal();
    };

    window.openEditModal = () => document.getElementById('edit-question-modal').classList.remove('hidden');
    window.closeEditModal = () => document.getElementById('edit-question-modal').classList.add('hidden');

    // --- Submissions Section ---
    async function fetchSubmissions() {
        const resultsTbody = document.getElementById('submissions-tbody');
        const proofsTbody = document.getElementById('proofs-tbody');
        const mobileContainer = document.getElementById('mobile-content-area');
        if (!resultsTbody && !proofsTbody) return;

        try {
            const res = await fetch(`${API_BASE}/submissions`, { headers: getHeaders() });
            const data = await res.json();
            const subs = data.submissions || [];
            
            // Intelligent Grouping: Each student gets one row per UNIQUE QUESTION (by ID, not title)
            const grouped = new Map();
            subs.forEach(s => {
                const key = `${s.username}_${s.question_id}`; // Use question_id to keep same-topic questions separate
                if (!grouped.has(key)) {
                    grouped.set(key, {
                        student: s.student,
                        username: s.username,
                        question: s.question,
                        topic: s.topic,
                        question_id: s.question_id,
                        attempts: []
                    });
                }
                grouped.get(key).attempts.push(s);
            });

            const groups = Array.from(grouped.values());

            // 1. Populate Quiz Records (Results Table)
            if (resultsTbody) {
                resultsTbody.innerHTML = '';
                if (groups.length === 0) {
                    resultsTbody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-slate-400 font-bold">${emptyState('No quiz records found.')}</td></tr>`;
                } else {
                    groups.forEach(group => {
                        const latest = group.attempts[0]; // Subs are desc by timestamp
                        const attCount = group.attempts.length;

                        const tr = document.createElement('tr');
                        tr.className = 'group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors';
                        tr.innerHTML = `
                            <td class="px-10 py-6">
                                <div class="font-bold text-slate-900 dark:text-white">${group.student}</div>
                                <div class="text-[10px] text-indigo-500 font-bold uppercase tracking-tight -mt-0.5">@${group.username}</div>
                            </td>
                            <td class="px-10 py-6">
                                <div class="text-sm font-medium text-slate-600 dark:text-slate-300 truncate max-w-[200px]">${group.question}</div>
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">${group.topic || ''}</div>
                            </td>
                            <td class="px-10 py-6">
                                ${(() => {
                                    const isText = latest.question_type === 'text';
                                    const studentAns = latest.selected_option || '';
                                    const correctAns = latest.correct_answer || '';
                                    if (isText) {
                                        // For text answers: show full content in a block
                                        const shortAns = studentAns.length > 80 ? studentAns.substring(0, 80) + '…' : studentAns;
                                        const viewBtn = studentAns.length > 80 ? `<button onclick="showFullAnswer('${encodeURIComponent(studentAns)}', '${encodeURIComponent(correctAns)}')" class="mt-1 text-[8px] font-black text-indigo-500 uppercase tracking-widest hover:underline">View Full Answer</button>` : '';
                                        return `<div class="space-y-1.5">
                                            <div class="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><i class="fas fa-align-left text-[7px]"></i> Text Answer</div>
                                            <div class="p-2 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-200">${shortAns || '<span class="opacity-40">No answer</span>'}</div>
                                            ${viewBtn}
                                            <div class="flex items-center gap-1 mt-1">
                                                <span class="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Correct:</span>
                                                <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 italic">${correctAns || 'N/A'}</span>
                                            </div>
                                        </div>`;
                                    } else {
                                        // For MCQ: compact inline display
                                        return `<div class="space-y-1">
                                            <div class="flex items-center gap-2">
                                                <span class="text-[8px] font-black text-slate-400 uppercase tracking-tighter w-12">Student:</span>
                                                <div class="text-xs font-bold text-slate-600 dark:text-slate-200 italic" title="${studentAns}">${studentAns || 'N/A'}</div>
                                            </div>
                                            <div class="flex items-center gap-2">
                                                <span class="text-[8px] font-black text-indigo-400 uppercase tracking-tighter w-12">Correct:</span>
                                                <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 italic">${correctAns || 'N/A'}</div>
                                            </div>
                                        </div>`;
                                    }
                                })()}
                            </td>
                            <td class="px-10 py-6 text-center">
                                <div class="flex flex-col items-center gap-1">
                                    <div class="flex items-center gap-2">
                                        <div class="w-1.5 h-1.5 rounded-full ${latest.is_correct ? 'bg-green-500' : 'bg-red-500'}"></div>
                                        <span class="font-black text-[10px] ${latest.is_correct ? 'text-green-600' : 'text-red-500'} uppercase tracking-widest">${latest.is_correct ? 'Passed' : 'Failed'}</span>
                                    </div>
                                    ${attCount > 1 ? `<span class="text-[7px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-400 font-black uppercase">${attCount} attempts</span>` : ''}
                                </div>
                            </td>
                            <td class="px-10 py-6">
                                <div class="text-[9px] text-slate-400 font-black font-mono uppercase tracking-tight">${latest.timestamp}</div>
                            </td>
                            <td class="px-10 py-6 text-right">
                                <button class="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-600 hover:text-white transition-all opacity-0 group-hover:opacity-100" onclick="deleteSubmission(${latest.id})" title="Delete Latest Instance"><i class="fas fa-trash"></i></button>
                            </td>
                        `;
                        resultsTbody.appendChild(tr);
                    });
                }
            }

            // 2. Populate Quiz Proofs (Files Table)
            if (proofsTbody) {
                proofsTbody.innerHTML = '';
                // Quiz Proofs: Show every individual submission that has a file, newest first
                const proofSubs = subs.filter(s => s.file_path);

                if (proofSubs.length === 0) {
                    proofsTbody.innerHTML = `<tr><td colspan="5" class="p-12 text-center text-slate-400 font-bold">${emptyState('No uploaded files found in history.')}</td></tr>`;
                } else {
                    proofSubs.forEach(sub => {
                        if (!sub.file_path) return;

                        // Determine file type — paths are stored as /api/downloads/submission/<uuid>
                        // so we detect type from mimetype hint if available, else mark as unknown
                        const isBlob = sub.file_path.includes('/api/downloads/submission/');
                        const uuid = isBlob ? sub.file_path.split('/').pop() : null;

                        // Build a display filename
                        const filename = isBlob ? `Proof_${sub.username}_${sub.id}` : sub.file_path.split('/').pop();

                        // Icon: default to generic file, can be improved if mimetype is exposed later
                        let iconClass = 'fa-file-shield';

                        const tr = document.createElement('tr');
                        tr.className = 'group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors';
                        
                        tr.innerHTML = `
                            <td class="px-10 py-6">
                                <div class="font-bold text-slate-900 dark:text-white">${sub.student}</div>
                                <div class="text-[9px] text-indigo-500 font-bold uppercase tracking-tight">@${sub.username}</div>
                            </td>
                            <td class="px-10 py-6">
                                <div class="text-sm font-medium text-slate-500 truncate max-w-[200px]">${sub.question}</div>
                                <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">${sub.topic || ''}</div>
                            </td>
                            <td class="px-10 py-6">
                                <div class="flex items-center gap-2">
                                    <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 flex items-center justify-center text-emerald-600">
                                        <i class="fas ${iconClass}"></i>
                                    </div>
                                    <div class="text-[10px] font-bold text-slate-600 dark:text-slate-300 w-32 truncate" title="${filename}">${filename}</div>
                                </div>
                            </td>
                            <td class="px-10 py-6">
                                <div class="text-[10px] text-slate-400 font-bold uppercase tracking-widest">${sub.timestamp}</div>
                            </td>
                            <td class="px-10 py-6 text-right">
                                <div class="flex items-center justify-end gap-3">
                                    <button onclick="previewFile('${sub.file_path}')" class="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-[10px] hover:bg-indigo-600 hover:text-white transition-all uppercase tracking-widest">Preview</button>
                                    <button onclick="downloadSecureFile('${sub.file_path}', '${filename}')" class="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold text-[10px] hover:scale-105 transition-all uppercase tracking-widest flex items-center gap-2">
                                        <i class="fas fa-download"></i> Download
                                    </button>
                                </div>
                            </td>
                        `;
                        proofsTbody.appendChild(tr);
                    });
                }
            }

            // Sync to Mobile if visible
            const activeNav = document.querySelector('.nav-links .nav-item.active');
            if(activeNav && (activeNav.dataset.target === 'submissions' || activeNav.dataset.target === 'proofs') && mobileContainer) {
                renderSubmissionsMobile(subs);
            }

        } catch (err) { 
            console.error(err); 
        }
    }

    function renderSubmissionsMobile(submissions) {
        const mobileContainer = document.getElementById('mobile-content-area');
        if(!mobileContainer) return;
        
        mobileContainer.innerHTML = `
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Student Logs</h3>
                <button onclick="downloadExcelBlob('export/submissions', 'Logs.xlsx')" class="p-2 bg-green-600 text-white rounded-lg text-xs font-bold uppercase"><i class="fas fa-download"></i> EXCEL</button>
            </div>
            <div id="mobile-submissions-list" class="space-y-4"></div>
        `;

        const list = document.getElementById('mobile-submissions-list');
        if(!submissions || submissions.length === 0) {
            list.innerHTML = `<div class="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No activity logs found</div>`;
            return;
        }

        submissions.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'glass-morphism p-5 rounded-3xl border-none shadow-xl space-y-4';
            card.innerHTML = `
                <div class="flex justify-between items-start">
                    <div>
                        <div class="text-sm font-black text-slate-900 dark:text-white truncate max-w-[150px]">${sub.student}</div>
                        <div class="text-[9px] font-black text-indigo-500 uppercase tracking-tight -mt-0.5">@${sub.username}</div>
                        <div class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">${sub.timestamp}</div>
                    </div>
                    <div class="px-2.5 py-1 ${sub.is_correct ? 'emerald-gradient text-white border-none' : 'rose-gradient text-white border-none'} rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/10">
                        ${sub.is_correct ? 'Correct' : 'Fail'}
                    </div>
                </div>
                <div class="space-y-1">
                    <div class="text-[11px] font-medium text-slate-400 uppercase tracking-widest font-black">${sub.question}</div>
                    <div class="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300 italic">
                        "${sub.selected_option || 'No Answer Provided'}"
                    </div>
                </div>
                <div class="flex gap-2 pt-2">
                    ${(() => {
                        if (!sub.file_path) return '<div class="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center opacity-50">No Proof Uploaded</div>';
                        const ext = sub.file_path.split('.').pop().split('?')[0].toLowerCase();
                        const allowed = ['pdf', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
                        if (sub.file_path.includes('/api/downloads/submission/') || allowed.includes(ext)) {
                            return `
                                <div class="flex-1 flex gap-2">
                                    <button onclick="previewFile('${sub.file_path}')" class="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-600 hover:text-white active:scale-95 transition-all"><i class="fas fa-eye mr-1"></i> Preview</button>
                                    <button onclick="downloadSecureFile('${sub.file_path}', '${sub.username}_Q${sub.id}')" class="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center"><i class="fas fa-download mr-1"></i> Download</button>
                                </div>
                            `;
                        }
                        return '<div class="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest text-center opacity-50">Invalid Proof Format</div>';
                    })()}
                    <button onclick="deleteSubmission(${sub.id})" class="w-12 h-12 bg-rose-50 dark:bg-rose-900/10 text-rose-500 rounded-xl flex items-center justify-center active:scale-95 transition-all">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            `;
            list.appendChild(card);
        });
    }

    window.showFullAnswer = (encodedStudentAns, encodedCorrectAns) => {
        const studentAns = decodeURIComponent(encodedStudentAns);
        const correctAns = decodeURIComponent(encodedCorrectAns);
        
        // Reuse or create a simple modal
        let modal = document.getElementById('text-answer-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'text-answer-modal';
            modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center p-6';
            modal.style.background = 'rgba(0,0,0,0.7)';
            modal.style.backdropFilter = 'blur(6px)';
            document.body.appendChild(modal);
        }
        modal.innerHTML = `
            <div class="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden">
                <div class="p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                        <h3 class="text-xl font-black text-slate-900 dark:text-white">Full Text Answer</h3>
                        <div class="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-0.5">Student Submission</div>
                    </div>
                    <button onclick="document.getElementById('text-answer-modal').remove(); document.body.style.overflow='';" 
                            class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 transition-all flex items-center justify-center">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                    <div>
                        <div class="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <i class="fas fa-user-graduate"></i> Student Answer
                        </div>
                        <div class="p-5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30 rounded-2xl text-sm font-medium text-slate-700 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">${studentAns || 'No answer submitted'}</div>
                    </div>
                    <div>
                        <div class="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <i class="fas fa-check-circle"></i> Expected Answer
                        </div>
                        <div class="p-5 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-700/30 rounded-2xl text-sm font-bold text-indigo-700 dark:text-indigo-200 leading-relaxed whitespace-pre-wrap">${correctAns || 'N/A'}</div>
                    </div>
                </div>
            </div>
        `;
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        modal.addEventListener('click', (e) => { if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; } });
    };

    window.downloadSecureFile = async (path, filename) => {
        try {
            const res = await fetch(path, { method: 'HEAD' });
            if (!res.ok) {
                showAlert('Wait! The file link exists in the database, but the file was deleted from the server storage.', true);
                return;
            }
            // Trigger actual download
            const a = document.createElement('a');
            a.href = path;
            // Removed hardcoded .bin to allow server-determined extension
            a.download = filename; 
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            showAlert('Connection error. Could not verify file.', true);
        }
    };

    window.previewFile = async (path) => {
        console.log("🛠️ Attempting to preview file:", path);
        const modal = document.getElementById('file-preview-modal');
        const body = document.getElementById('preview-body');
        const downloadBtn = document.getElementById('preview-download-btn');
        
        if(!modal || !body || !downloadBtn) {
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
        downloadBtn.style.display = 'flex'; // Reset immediately when opening

        try {
            const res = await fetch(path, { method: 'HEAD' });
            if (!res.ok) {
                downloadBtn.style.display = 'none'; // Hide download button if file is missing
                body.innerHTML = `
                    <div class="p-16 text-center space-y-4">
                        <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl">
                            <i class="fas fa-exclamation-triangle"></i>
                        </div>
                        <h5 class="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">File Not Found (404)</h5>
                        <p class="text-[10px] text-slate-500 max-w-[200px] mx-auto">The link exists in the database, but the file is missing from the server storage.</p>
                        <div class="pt-4">
                            <button onclick="downloadSecureFile('${path}', 'Missing_File')" class="text-[10px] font-black uppercase text-indigo-600 border-b-2 border-indigo-600 pb-1">Try Direct Download</button>
                        </div>
                    </div>
                `;
                return; // Stop here if the file is missing physically.
            }
        } catch (e) {
            downloadBtn.style.display = 'none';
            body.innerHTML = `<div class="p-10 text-slate-400 font-bold">❌ Connection error. The server might be blocking the request.</div>`;
            return;
        }

        setTimeout(() => {
            const cacheBuster = `t=${new Date().getTime()}`;
            const fullUrl = path.includes('?') ? `${path}&${cacheBuster}` : `${path}?${cacheBuster}`;

            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'jfif', 'pjpeg', 'pjp'].includes(ext)) {
                body.innerHTML = `
                    <img src="${fullUrl}" 
                         class="max-w-full h-auto rounded-xl shadow-2xl border-4 border-white dark:border-slate-800 motion-safe:animate-reveal" 
                         style="max-height: 65vh; object-fit: contain;"
                         onerror="this.parentElement.innerHTML='<div class=p-10>❌ Error loading image. The file might be corrupt or blocked.</div>'"
                         loading="lazy">
                `;
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
        }, 300);
    };

    window.closeFilePreview = () => {
        const modal = document.getElementById('file-preview-modal');
        if(modal) modal.classList.add('hidden');
        document.body.style.overflow = '';
        document.getElementById('preview-body').innerHTML = '';
    };

    // --- Leaderboard & Registry ---
    async function fetchLeaderboard() {
        const tbody = document.getElementById('leaderboard-tbody');
        if (!tbody) return;
        try {
            const res = await fetch(`${API_BASE}/leaderboard`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            tbody.innerHTML = '';
            if (!data.leaderboard || data.leaderboard.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4" class="p-12 text-center text-slate-400 font-bold">No rankings found.</td></tr>`;
                return;
            }
            data.leaderboard.forEach((std, i) => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors';
                tr.innerHTML = `
                    <td class="px-10 py-6"><div class="w-8 h-8 rounded-lg ${i<3?'bg-amber-100 text-amber-600':'bg-slate-100 dark:bg-slate-800 text-slate-500'} flex items-center justify-center font-black text-xs">#${i+1}</div></td>
                    <td class="px-10 py-6">
                        <div class="font-bold text-slate-900 dark:text-white">${std.name || std.username}</div>
                        <div class="text-[10px] text-indigo-500 font-bold uppercase tracking-tight -mt-0.5">@${std.username}</div>
                    </td>
                    <td class="px-10 py-6 text-center text-sm font-bold text-slate-500">${std.answeredQuestions || 0}</td>
                    <td class="px-10 py-6 text-right"><span class="text-xl font-black text-indigo-600 font-orbitron">${std.average || 0}%</span></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { tbody.innerHTML = `<tr><td colspan="4" class="p-12 text-center text-red-500 font-bold">Error calculating standings.</td></tr>`; }
    }

    async function fetchStudents() {
        const tbody = document.getElementById('students-tbody');
        if (!tbody) return;
        try {
            const res = await fetch(`${API_BASE}/students`, { headers: getHeaders() });
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();
            tbody.innerHTML = '';
            if (!data.students || data.students.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="p-12 text-center text-slate-400 font-bold">No students registered yet.</td></tr>`;
                return;
            }
            data.students.forEach((std, i) => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors';
                tr.innerHTML = `
                    <td class="px-10 py-6"><div class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center font-black text-xs">#${i+1}</div></td>
                    <td class="px-10 py-6">
                        <div class="font-bold text-slate-900 dark:text-white">${std.name}</div>
                        <div class="text-[10px] text-indigo-500 font-bold uppercase tracking-tight -mt-0.5">@${std.username}</div>
                    </td>
                    <td class="px-10 py-6 text-center"><span class="font-bold text-slate-600 dark:text-slate-200">${std.total_submissions}</span></td>
                    <td class="px-10 py-6 text-center"><span class="font-bold text-indigo-600 dark:text-indigo-400">${std.total_proofs}</span></td>
                    <td class="px-10 py-6 text-center"><span class="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">${std.average}%</span></td>
                    <td class="px-10 py-6 text-right">
                        <div class="flex items-center justify-end gap-2">
                            <button class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all" onclick='editStudent(${JSON.stringify(std).replace(/'/g, "&apos;")})'><i class="fas fa-edit"></i></button>
                            <button class="w-8 h-8 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all" onclick="deleteStudent(${std.id})"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { tbody.innerHTML = `<tr><td colspan="6" class="p-12 text-center text-red-500 font-bold">Registry link failed.</td></tr>`; }
    }
    
    window.deleteStudent = async (id) => {
        if(!confirm('Decommission this student node? All their history and messages will be purged.')) return;
        try {
            const res = await fetch(`${API_BASE}/students/${id}`, { method: 'DELETE', headers: getHeaders() });
            if(res.ok) { showAlert('Node decommissioned.'); fetchStudents(); fetchGlobalStats(); }
        } catch (err) { console.error(err); }
    };

    window.editStudent = (std) => {
        const idInput = document.getElementById('edit-student-id');
        const nameInput = document.getElementById('edit-student-name');
        const userMark = document.getElementById('edit-student-username');
        if(idInput) idInput.value = std.id;
        if(nameInput) nameInput.value = std.name || '';
        if(userMark) userMark.value = std.username || '';
        document.getElementById('edit-student-password').value = '';
        openEditStudentModal();
    };

    window.openEditStudentModal = () => document.getElementById('edit-student-modal').classList.remove('hidden');
    window.closeEditStudentModal = () => document.getElementById('edit-student-modal').classList.add('hidden');

    const editStudentForm = document.getElementById('edit-student-form');
    if (editStudentForm) {
        editStudentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-student-id').value;
            const data = {
                name: document.getElementById('edit-student-name').value,
                username: document.getElementById('edit-student-username').value,
                password: document.getElementById('edit-student-password').value
            };
            try {
                const res = await fetch(`${API_BASE}/students/${id}`, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(data) });
                if (res.ok) { showAlert('Student profile updated!'); closeEditStudentModal(); fetchStudents(); }
                else { const err = await res.json(); showAlert(err.message || 'Update failed', true); }
            } catch (error) { showAlert('Error connecting to server', true); }
        });
    }

    // --- Meet Links Section ---
    const addMeetLink = document.getElementById('add-meetlink-form');
    if (addMeetLink) {
        addMeetLink.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('m-title').value;
            const url = document.getElementById('m-url').value;
            try {
                showAlert('Broadcasting link...', false);
                const res = await fetch(`${API_BASE}/meetlinks`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ title, url })
                });
                if (res.ok) {
                    addMeetLink.reset();
                    showAlert('Link broadcasted successfully!');
                    fetchMeetLinks();
                } else showAlert('Failed to broadcast link.', true);
            } catch (err) { showAlert('Network Error', true); }
        });
    }

    async function fetchMeetLinks() {
        const list = document.getElementById('meetlinks-list');
        if (!list) return;
        try {
            const res = await fetch(`${API_BASE}/meetlinks`, { headers: getHeaders() });
            const data = await res.json();
            if (!data.meetlinks || data.meetlinks.length === 0) {
                list.innerHTML = emptyState('No active meet links recorded.');
                return;
            }
            list.innerHTML = data.meetlinks.map(m => `
                <div class="p-6 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative text-left">
                    <button onclick="deleteMeetLink(${m.id})" class="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl bg-red-100/50 dark:bg-red-900/30 text-red-500 hover:bg-red-500 hover:text-white transition-all">
                        <i class="fas fa-trash text-xs"></i>
                    </button>
                    <div class="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center mb-4 text-xl">
                        <i class="fas fa-video"></i>
                    </div>
                    <div class="text-[10px] text-slate-500 font-bold mb-1 uppercase tracking-widest">${m.timestamp || ''}</div>
                    <div class="font-bold text-lg mb-4 text-slate-900 dark:text-white">${m.title}</div>
                    <a href="${m.url}" target="_blank" class="w-full inline-block text-center py-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 font-bold rounded-xl border border-indigo-100 dark:border-indigo-800/30 active:scale-[0.98] transition-all">
                         Join Meeting <i class="fas fa-external-link-alt ml-1 text-xs opacity-70"></i>
                    </a>
                </div>
            `).join('');
        } catch (err) { console.error(err); }
    }
    window.fetchMeetLinks = fetchMeetLinks;

    window.deleteMeetLink = async (id) => {
        if(!confirm('Are you sure you want to stop broadcasting this link?')) return;
        try {
            showAlert('Deleting broadcast...', false);
            const res = await fetch(`${API_BASE}/meetlinks/${id}`, { method: 'DELETE', headers: getHeaders() });
            if (res.ok) { showAlert('Link disconnected!'); fetchMeetLinks(); }
            else showAlert('Failed to disconnect link.', true);
        } catch(err) { showAlert('Error', true); }
    };

    // --- Messages Section ---
    const sendMsgForm = document.getElementById('send-msg-form');
    if (sendMsgForm) {
        sendMsgForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const f = new FormData();
            f.append('receiver_id', document.getElementById('msg-receiver').value);
            f.append('content', document.getElementById('msg-content').value);
            const fi = document.getElementById('msg-file');
            if(fi.files.length > 0) f.append('file', fi.files[0]);
            try {
                const res = await fetch(`${API_BASE}/messages`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: f });
                if (res.ok) { showAlert('Broadcast sent!'); sendMsgForm.reset(); fetchMessages(); }
                else showAlert('Broadcast failed', true);
            } catch (error) { showAlert('Error', true); }
        });
    }

    async function fetchMessages() {
        const list = document.getElementById('messages-list');
        if (!list) return;
        try {
            const res = await fetch(`${API_BASE}/messages`, { headers: getHeaders() });
            const data = await res.json();
            if (!data.messages || data.messages.length === 0) {
                list.innerHTML = emptyState('No transmission history found.');
                return;
            }
            list.innerHTML = data.messages.map(m => `
                <div class="content-card p-8 space-y-4">
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs"><i class="fas fa-shield-alt"></i></div>
                            <div>
                                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">${m.receiver_id === null ? 'Broadcast Signal' : 'To: ' + m.receiver}</div>
                                <div class="text-xs font-bold text-slate-500">${m.timestamp}</div>
                            </div>
                        </div>
                        <button class="text-slate-300 hover:text-red-500 transition-colors" onclick="deleteMessage(${m.id})"><i class="fas fa-trash"></i></button>
                    </div>
                    <p class="text-slate-600 dark:text-slate-300 font-medium">${m.content}</p>
                    ${m.file_path ? `<button onclick="previewFile('${m.file_path}')" class="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600 active:scale-95 transition-all"><i class="fas fa-file-alt"></i> View Attachment</button>` : ''}
                </div>
            `).join('');
        } catch (err) { console.error(err); }
    }

    async function fetchStudentsForMessages() {
        const s = document.getElementById('msg-receiver');
        if (!s) return;
        try {
            const res = await fetch(`${API_BASE}/students`, { headers: getHeaders() });
            const data = await res.json();
            s.innerHTML = '<option value="all" selected>All Intelligence Nodes (Broadcast)</option>';
            data.students.forEach(std => {
                const o = document.createElement('option');
                o.value = std.id; o.innerText = std.username;
                s.appendChild(o);
            });
        } catch (err) { console.error(err); }
    }

    window.deleteMessage = async (id) => {
        if(!confirm('Purge transmission?')) return;
        try {
            const res = await fetch(`${API_BASE}/messages/${id}`, { method: 'DELETE', headers: getHeaders() });
            if(res.ok) { showAlert('Transmission purged.'); fetchMessages(); }
        } catch (err) { console.error(err); }
    };

    // --- Excel Export ---
    async function downloadExcelBlob(endpoint, defaultFilename) {
        try {
            showAlert('Compiling data stream...', false);
            const res = await fetch(`${API_BASE}/${endpoint}`, { method: 'GET', headers: getHeaders() });
            if (!res.ok) { showAlert('Stream failed.', true); return; }
            const b = await res.blob();
            const url = window.URL.createObjectURL(b);
            const a = document.createElement('a'); a.style.display = 'none'; a.href = url; a.download = defaultFilename;
            document.body.appendChild(a); a.click();
            window.URL.revokeObjectURL(url);
            showAlert('Export complete!');
        } catch (err) { showAlert('Error', true); }
    }

    const subExport = document.getElementById('export-submissions-btn');
    if (subExport) subExport.addEventListener('click', () => downloadExcelBlob('export/submissions', 'Submissions.xlsx'));
    const regExport = document.getElementById('export-registry-btn');
    if (regExport) regExport.addEventListener('click', () => downloadExcelBlob('export/students', 'StudentsRegistry.xlsx'));
    const lbExport = document.getElementById('export-leaderboard-btn');
    if (lbExport) lbExport.addEventListener('click', () => downloadExcelBlob('export/students', 'Leaderboard.xlsx'));

    // --- Stats & Notifications ---
    async function fetchGlobalStats() {
        try {
            const res = await fetch(`${API_BASE}/admin/stats`, { headers: getHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            const stats = {
                'global-stat-students': data.total_students,
                'stat-students-mobile': data.total_students,
                'global-stat-average': `${data.global_average}%`,
                'stat-avg-mobile': `${data.global_average}%`,
                'global-stat-submissions': data.total_submissions,
                'stat-submissions-mobile': data.total_submissions,
                'global-stat-proofs': data.total_proofs,
                'global-stat-questions': data.total_questions
            };
            for (const [id, val] of Object.entries(stats)) {
                const el = document.getElementById(id);
                if (el) el.innerText = val;
            }
        } catch (err) { console.error(err); }
    }

    let lastNotiCheck = localStorage.getItem('last_noti_read_admin') || '1970-01-01 00:00:00';
    let lastNotiSoundTime = localStorage.getItem('last_noti_sound_admin') || '1970-01-01 00:00:00';
    const notiSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    notiSound.volume = 0.5;

    async function fetchNotifications() {
        try {
            const res = await fetch(`${API_BASE}/notifications`, { headers: getHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            renderNotifications(data.notifications);
        } catch (err) { console.error(err); }
    }

    function renderNotifications(notis) {
        const list = document.getElementById('noti-list-desktop');
        const badge = document.getElementById('noti-badge-desktop');
        if (!list) return;
        const filteredNotis = notis.slice(0, 5);
        const unreadCount = filteredNotis.filter(n => n.timestamp > lastNotiCheck).length;
        if (unreadCount > 0) { badge.innerText = unreadCount; badge.classList.remove('hidden'); }
        else badge.classList.add('hidden');

        if (filteredNotis.length > 0) {
            const latestTimestamp = filteredNotis[0].timestamp;
            if (latestTimestamp > lastNotiSoundTime) {
                if (lastNotiSoundTime !== '1970-01-01 00:00:00') notiSound.play().catch(()=>{});
                lastNotiSoundTime = latestTimestamp;
                localStorage.setItem('last_noti_sound_admin', latestTimestamp);
            }
        }
        if (filteredNotis.length === 0) {
            list.innerHTML = '<div class="p-8 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">No new updates</div>';
            return;
        }
        list.innerHTML = filteredNotis.map(n => `
            <div class="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex gap-4 ${n.timestamp > lastNotiCheck ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}">
                <div class="w-10 h-10 shrink-0 rounded-xl ${n.type === 'submission' ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-100 text-indigo-600'} flex items-center justify-center text-sm">
                    <i class="fas ${n.type === 'submission' ? (n.is_correct ? 'fa-check-circle' : 'fa-times-circle') : 'fa-envelope'}"></i>
                </div>
                <div class="flex-1">
                    <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">${n.title}</div>
                    <div class="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5">${n.content}</div>
                    <div class="text-[9px] text-slate-400 mt-1">${n.timestamp}</div>
                </div>
            </div>
        `).join('');
    }

    window.markAllRead = () => {
        const istTime = new Date(new Date().getTime() + 19800000).toISOString().replace('T', ' ').split('.')[0];
        lastNotiCheck = istTime;
        localStorage.setItem('last_noti_read_admin', lastNotiCheck);
        fetchNotifications();
    };

    const notiBtn = document.getElementById('noti-btn-desktop');
    const notiDropdown = document.getElementById('noti-dropdown-desktop');
    if (notiBtn && notiDropdown) {
        notiBtn.addEventListener('click', (e) => { e.stopPropagation(); notiDropdown.classList.toggle('hidden'); });
        document.addEventListener('click', () => notiDropdown.classList.add('hidden'));
        notiDropdown.addEventListener('click', (e) => e.stopPropagation());
    }

    // Initial Polls
    fetchQuestions(); fetchGlobalStats(); fetchMeetLinks(); fetchNotifications();
    setInterval(fetchNotifications, 30000);
});
