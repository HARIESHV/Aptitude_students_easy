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

    // Initialize Theme
    const themeToggle = document.getElementById('theme-toggle') || document.getElementById('theme-toggle-top');
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

    if (document.getElementById('welcome-text')) {
        document.getElementById('welcome-text').innerText = `${username}`;
    }

    // --- Navigation ---
    const navItems = document.querySelectorAll('.nav-links .nav-item');
    const sections = document.querySelectorAll('.dashboard-section');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const target = item.getAttribute('data-target');
            
            navItems.forEach(i => i.classList.remove('active'));
            sections.forEach(s => s.classList.add('hidden'));
            
            item.classList.add('active');
            const targetSection = document.getElementById(target);
            if (targetSection) targetSection.classList.remove('hidden');
            
            if (pageTitle) {
                const textOnly = item.cloneNode(true);
                textOnly.querySelector('i').remove();
                pageTitle.innerText = textOnly.innerText.trim();
            }

            if(target === 'questions') fetchQuestions();
            if(target === 'submissions') fetchSubmissions();
            if(target === 'meetlinks') fetchMeetLinks();
            if(target === 'messages') { fetchMessages(); fetchStudentsForMessages(); }
            if(target === 'registry') fetchStudents();
            if(target === 'leaderboard') fetchLeaderboard();
        });
    });

    const alertBox = document.getElementById('dashboard-alert');
    function showAlert(msg, isError = false) {
        if (!alertBox) return;
        alertBox.textContent = msg;
        alertBox.className = `px-6 py-4 rounded-2xl font-bold flex items-center gap-3 border shadow-lg ${isError ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/50' : 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/50'}`;
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
            const res = await fetch(`${API_BASE}/questions`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showAlert('Intelligence Node deployed!');
                document.getElementById('add-question-form').reset();
                fetchQuestions();
            } else showAlert('Deployment failed', true);
        } catch (error) { showAlert('Error', true); }
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

    async function fetchQuestions() {
        try {
            const res = await fetch(`${API_BASE}/questions`, { headers: getHeaders() });
            if (res.status === 401) { window.location.href = '/login'; return; }
            const data = await res.json();
            const list = document.getElementById('admin-questions-list');
            if (!list) return;
            list.innerHTML = '';
            
            data.questions.forEach(q => {
                const item = document.createElement('div');
                item.className = 'content-card p-8 flex justify-between items-center group hover:border-indigo-500 transition-all';
                item.innerHTML = `
                    <div class="space-y-3">
                        <div class="flex items-center gap-3">
                            <span class="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">${q.topic}</span>
                            <span class="text-xs font-bold text-slate-400">#${q.id}</span>
                        </div>
                        <h4 class="text-xl font-bold text-slate-900 dark:text-white">${q.title}</h4>
                        <div class="flex items-center gap-4 text-xs font-medium text-slate-500">
                             <span class="flex items-center gap-1"><i class="fas fa-clock"></i> ${q.time_limit > 0 ? formatTime(q.time_limit) : 'Unlimited'}</span>
                             <span class="flex items-center gap-1"><i class="fas fa-tag"></i> ${q.subtopic}</span>
                             <span class="flex items-center gap-1 font-bold text-indigo-600"><i class="fas fa-key"></i> ${q.question_type === 'text' ? q.correct_text_answer : 'Option ' + q.correct_option}</span>
                        </div>
                    </div>
                    <div class="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all" onclick='editQuestion(${JSON.stringify(q).replace(/'/g, "&apos;")})'>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl flex items-center justify-center hover:bg-red-600 hover:text-white transition-all" onclick="deleteQuestion(${q.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                list.appendChild(item);
            });
        } catch (err) { console.error(err); }
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
        try {
            const res = await fetch(`${API_BASE}/submissions`, { headers: getHeaders() });
            const data = await res.json();
            const tbody = document.getElementById('submissions-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            
            data.submissions.forEach(sub => {
                const tr = document.createElement('tr');
                tr.className = 'group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors';
                tr.innerHTML = `
                    <td class="px-10 py-6">
                        <div class="font-bold text-slate-900 dark:text-white">${sub.student}</div>
                        <div class="text-[10px] text-slate-400 font-black uppercase tracking-widest">${sub.timestamp}</div>
                    </td>
                    <td class="px-10 py-6">
                        <div class="text-sm font-medium text-slate-600 dark:text-slate-300 truncate max-w-xs">${sub.question}</div>
                    </td>
                    <td class="px-10 py-6">
                        <div class="flex items-center gap-2">
                            <div class="w-2 h-2 rounded-full ${sub.is_correct ? 'bg-green-500' : 'bg-red-500'}"></div>
                            <span class="font-bold text-xs ${sub.is_correct ? 'text-green-600' : 'text-red-500'} uppercase tracking-widest">${sub.is_correct ? 'Correct' : 'Incorrect'}</span>
                        </div>
                    </td>
                    <td class="px-10 py-6 text-right">
                        <div class="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            ${sub.file_path ? `<a href="${sub.file_path}" target="_blank" class="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><i class="fas fa-eye"></i></a>` : ''}
                            <button class="w-8 h-8 bg-red-50 text-red-600 rounded-lg flex items-center justify-center hover:bg-red-600 hover:text-white transition-all" onclick="deleteSubmission(${sub.id})"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }

    window.deleteSubmission = async (id) => {
        if (!confirm('Erase this record?')) return;
        try {
            const res = await fetch(`${API_BASE}/submissions/${id}`, { method: 'DELETE', headers: getHeaders() });
            if (res.ok) { showAlert('Record erased.'); fetchSubmissions(); }
        } catch (err) { console.error(err); }
    };

    // --- Meet Links Section ---
    document.getElementById('add-meetlink-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = { title: document.getElementById('m-title').value, url: document.getElementById('m-url').value };
        try {
            const res = await fetch(`${API_BASE}/meetlinks`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
            if (res.ok) { showAlert('Signal established!'); document.getElementById('add-meetlink-form').reset(); fetchMeetLinks(); }
        } catch (error) { showAlert('Error', true); }
    });

    async function fetchMeetLinks() {
        try {
            const res = await fetch(`${API_BASE}/meetlinks`, { headers: getHeaders() });
            const data = await res.json();
            const list = document.getElementById('meetlinks-list');
            if (!list) return;
            list.innerHTML = '';
            data.meetlinks.forEach(l => {
                const item = document.createElement('div');
                item.className = 'content-card p-6 flex justify-between items-center group';
                item.innerHTML = `
                    <div class="space-y-1">
                        <h4 class="font-bold text-lg text-slate-900 dark:text-white">${l.title}</h4>
                        <a href="${l.url}" target="_blank" class="text-xs text-indigo-500 font-medium hover:underline">${l.url}</a>
                    </div>
                    <button class="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 hover:text-white" onclick="deleteMeetLink(${l.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                `;
                list.appendChild(item);
            });
        } catch (err) { console.error(err); }
    }

    window.deleteMeetLink = async (id) => {
        try { await fetch(`${API_BASE}/meetlinks/${id}`, { method: 'DELETE', headers: getHeaders() }); fetchMeetLinks(); } catch (err) { console.error(err); }
    };

    // --- Messages Section ---
    document.getElementById('send-msg-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const f = new FormData();
        f.append('receiver_id', document.getElementById('msg-receiver').value);
        f.append('content', document.getElementById('msg-content').value);
        const fi = document.getElementById('msg-file');
        if(fi.files.length > 0) f.append('file', fi.files[0]);
        try {
            const res = await fetch(`${API_BASE}/messages`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: f });
            if (res.ok) { showAlert('Broadcast sent!'); document.getElementById('send-msg-form').reset(); fetchMessages(); }
            else showAlert('Broadcast failed', true);
        } catch (error) { showAlert('Error', true); }
    });

    async function fetchMessages() {
        try {
            const res = await fetch(`${API_BASE}/messages`, { headers: getHeaders() });
            const data = await res.json();
            const list = document.getElementById('messages-list');
            if (!list) return;
            list.innerHTML = '';
            data.messages.forEach(m => {
                const item = document.createElement('div');
                item.className = 'content-card p-8 space-y-4';
                const isBroadcast = m.receiver_id === null;
                item.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs"><i class="fas fa-shield-alt"></i></div>
                            <div>
                                <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">${isBroadcast ? 'Broadcast Signal' : 'To: ' + m.receiver}</div>
                                <div class="text-xs font-bold text-slate-500">${m.timestamp}</div>
                            </div>
                        </div>
                        <button class="text-slate-300 hover:text-red-500 transition-colors" onclick="deleteMessage(${m.id})"><i class="fas fa-trash"></i></button>
                    </div>
                    <p class="text-slate-600 dark:text-slate-300 font-medium">${m.content}</p>
                    ${m.file_path ? `<a href="${m.file_path}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-600"><i class="fas fa-file-alt"></i> Attachment</a>` : ''}
                `;
                list.appendChild(item);
            });
        } catch (err) { console.error(err); }
    }
    
    async function fetchStudentsForMessages() {
        try {
            const res = await fetch(`${API_BASE}/students`, { headers: getHeaders() });
            const data = await res.json();
            const s = document.getElementById('msg-receiver');
            s.innerHTML = '<option value="all" selected>All Intelligence Nodes (Broadcast)</option>';
            data.students.forEach(std => {
                const o = document.createElement('option');
                o.value = std.id; o.innerText = std.username;
                s.appendChild(o);
            });
        } catch (err) { console.error(err); }
    }

    // --- Leaderboard & Registry ---
    async function fetchLeaderboard() {
        try {
            const res = await fetch(`${API_BASE}/students`, { headers: getHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            const tbody = document.getElementById('leaderboard-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            const sorted = data.students.sort((a,b) => b.average - a.average);
            sorted.forEach((std, i) => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 transition-colors';
                tr.innerHTML = `
                    <td class="px-10 py-6"><div class="w-8 h-8 rounded-lg ${i<3?'bg-amber-100 text-amber-600':'bg-slate-100 text-slate-500'} flex items-center justify-center font-black text-xs">#${i+1}</div></td>
                    <td class="px-10 py-6"><div class="font-bold text-slate-900 dark:text-white">${std.username}</div></td>
                    <td class="px-10 py-6 text-center text-sm font-bold text-slate-500">${std.total_submissions}</td>
                    <td class="px-10 py-6 text-right"><span class="text-xl font-black text-indigo-600 font-orbitron">${std.average}%</span></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }

    async function fetchStudents() {
        try {
            const res = await fetch(`${API_BASE}/students`, { headers: getHeaders() });
            const data = await res.json();
            const tbody = document.getElementById('students-tbody');
            if (!tbody) return;
            tbody.innerHTML = '';
            data.students.forEach((std, i) => {
                const tr = document.createElement('tr');
                tr.className = 'hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors';
                tr.innerHTML = `
                    <td class="px-10 py-6 text-xs text-slate-400 font-bold">${i+1}</td>
                    <td class="px-10 py-6 font-bold text-slate-900 dark:text-white">${std.username}</td>
                    <td class="px-10 py-6 text-center font-bold text-slate-500">${std.total_submissions}</td>
                    <td class="px-10 py-6 text-center"><span class="px-3 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold">${std.average}%</span></td>
                    <td class="px-10 py-6 text-right">
                        <button class="w-8 h-8 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all" onclick="deleteStudent(${std.id})"><i class="fas fa-trash"></i></button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }
    
    window.deleteStudent = async (id) => {
        if(!confirm('Decommission this intelligence node?')) return;
        try {
            const res = await fetch(`${API_BASE}/students/${id}`, { method: 'DELETE', headers: getHeaders() });
            if(res.ok) { showAlert('Node decommissioned.'); fetchStudents(); fetchGlobalStats(); }
        } catch (err) { console.error(err); }
    };

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

    document.getElementById('export-submissions-btn').addEventListener('click', () => downloadExcelBlob('export/submissions', 'Submissions.xlsx'));
    document.getElementById('export-registry-btn').addEventListener('click', () => downloadExcelBlob('export/students', 'StudentsRegistry.xlsx'));
    document.getElementById('export-leaderboard-btn').addEventListener('click', () => downloadExcelBlob('export/students', 'Leaderboard.xlsx'));

    async function fetchGlobalStats() {
        try {
            const res = await fetch(`${API_BASE}/students`, { headers: getHeaders() });
            if (res.status === 401) return;
            const data = await res.json();
            const s = data.students;
            const avg = s.length > 0 ? (s.reduce((a, b) => a + (parseFloat(b.average)||0), 0) / s.length).toFixed(2) : 0;
            if (document.getElementById('global-stat-students')) document.getElementById('global-stat-students').innerText = s.length;
            if (document.getElementById('global-stat-average')) document.getElementById('global-stat-average').innerText = `${avg}%`;
        } catch (err) { console.error(err); }
    }

    fetchQuestions();
    fetchGlobalStats();
});
