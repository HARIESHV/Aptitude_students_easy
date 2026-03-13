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
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const username = localStorage.getItem('username');

    if (!token || role !== 'admin') {
        window.location.href = '/';
        return;
    }

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

    document.getElementById('welcome-text').innerText = `Welcome, ${username}`;

    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.dashboard-section');
    const pageTitle = document.getElementById('page-title');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.style.display = 'none');
            
            link.classList.add('active');
            const target = link.getAttribute('data-target');
            document.getElementById(target).style.display = 'block';
            pageTitle.innerText = link.innerText.trim();

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
        alertBox.textContent = msg;
        alertBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
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
    document.getElementById('q-topic').addEventListener('change', (e) => {
        const subtopicSelect = document.getElementById('q-subtopic');
        subtopicSelect.innerHTML = '<option value="" disabled selected>Select Topic</option>';
        const subs = topicsMap[e.target.value] || [];
        subs.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.innerText = sub;
            subtopicSelect.appendChild(opt);
        });
    });

    document.getElementById('edit-q-topic').addEventListener('change', (e) => {
        const subtopicSelect = document.getElementById('edit-q-subtopic');
        subtopicSelect.innerHTML = '<option value="" disabled selected>Select Topic</option>';
        const subs = topicsMap[e.target.value] || [];
        subs.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.innerText = sub;
            subtopicSelect.appendChild(opt);
        });
    });

    // --- Questions Section ---
    document.getElementById('add-question-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const days = parseInt(document.getElementById('q-days').value) || 0;
        const hours = parseInt(document.getElementById('q-hours').value) || 0;
        const mins = parseInt(document.getElementById('q-mins').value) || 0;
        const secs = parseInt(document.getElementById('q-secs').value) || 0;
        const totalSeconds = (days * 86400) + (hours * 3600) + (mins * 60) + secs;
        
        const data = {
            topic: document.getElementById('q-topic').value,
            subtopic: document.getElementById('q-subtopic').value,
            time_limit: totalSeconds,
            title: document.getElementById('q-title').value,
            description: document.getElementById('q-desc').value,
            option_a: document.getElementById('q-opt-a').value,
            option_b: document.getElementById('q-opt-b').value,
            option_c: document.getElementById('q-opt-c').value,
            option_d: document.getElementById('q-opt-d').value,
            correct_option: document.getElementById('q-correct').value
        };

        try {
            const res = await fetch(`${API_BASE}/questions`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showAlert('Question posted successfully!');
                document.getElementById('add-question-form').reset();
                fetchQuestions();
            } else {
                showAlert('Failed to post question', true);
            }
        } catch (error) { showAlert('Error', true); }
    });

    // --- Edit Question Form ---
    document.getElementById('edit-question-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-q-id').value;
        const days = parseInt(document.getElementById('edit-q-days').value) || 0;
        const hours = parseInt(document.getElementById('edit-q-hours').value) || 0;
        const mins = parseInt(document.getElementById('edit-q-mins').value) || 0;
        const secs = parseInt(document.getElementById('edit-q-secs').value) || 0;
        const totalSeconds = (days * 86400) + (hours * 3600) + (mins * 60) + secs;

        const data = {
            topic: document.getElementById('edit-q-topic').value,
            subtopic: document.getElementById('edit-q-subtopic').value,
            time_limit: totalSeconds,
            title: document.getElementById('edit-q-title').value,
            description: document.getElementById('edit-q-desc').value,
            option_a: document.getElementById('edit-q-opt-a').value,
            option_b: document.getElementById('edit-q-opt-b').value,
            option_c: document.getElementById('edit-q-opt-c').value,
            option_d: document.getElementById('edit-q-opt-d').value,
            correct_option: document.getElementById('edit-q-correct').value
        };

        try {
            const res = await fetch(`${API_BASE}/questions/${id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data)
            });
            if (res.ok) {
                showAlert('Question updated successfully!');
                closeEditModal();
                fetchQuestions();
            } else {
                showAlert('Failed to update question', true);
            }
        } catch (error) { showAlert('Error', true); }
    });

    async function fetchQuestions() {
        try {
            const res = await fetch(`${API_BASE}/questions`, { headers: getHeaders() });
            if (res.status === 401) {
                localStorage.clear();
                window.location.href = '/login';
                return;
            }
            const data = await res.json();
            const list = document.getElementById('admin-questions-list');
            list.innerHTML = '';
            
            data.questions.forEach(q => {
                const item = document.createElement('div');
                item.className = 'item-card';
                item.innerHTML = `
                    <div class="item-content w-100">
                        <div style="display:flex; justify-content:space-between;">
                            <h4>${q.title}</h4>
                            <span class="badge ${q.time_limit > 0 ? 'correct' : ''}"><i class="fas fa-clock"></i> ${q.time_limit > 0 ? formatTime(q.time_limit) : 'Lifetime Access'}</span>
                        </div>
                        <p class="mb-2"><small class="badge bg-secondary" style="background:#e2e8f0; color:#475569;">${q.topic} &gt; ${q.subtopic}</small></p>
                        <p>Correct Option: <strong>${q.correct_option}</strong></p>
                    </div>
                    <div class="item-actions">
                        <button class="btn-primary btn-small" onclick='editQuestion(${JSON.stringify(q).replace(/'/g, "&apos;")})' style="width:auto; background: var(--success); margin-right: 0.5rem;">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-danger btn-small" onclick="deleteQuestion(${q.id})">
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
        
        let parts = [];
        if(d > 0) parts.push(`${d}d`);
        if(h > 0 || d > 0) parts.push(`${h.toString().padStart(2, '0')}h`);
        parts.push(`${m.toString().padStart(2, '0')}m`);
        parts.push(`${s.toString().padStart(2, '0')}s`);
        
        return parts.join(':');
    }

    window.deleteQuestion = async (id) => {
        if(!confirm('Are you sure? This deletes associated submissions.')) return;
        try {
            const res = await fetch(`${API_BASE}/questions/${id}`, { method: 'DELETE', headers: getHeaders() });
            if (res.ok) {
                showAlert('Question deleted successfully!');
                fetchQuestions();
            } else {
                const data = await res.json();
                showAlert(data.message || 'Failed to delete question', true);
            }
        } catch (err) { 
            console.error(err); 
            showAlert('Error deleting question', true);
        }
    };

    window.editQuestion = (q) => {
        document.getElementById('edit-q-id').value = q.id;
        document.getElementById('edit-q-topic').value = q.topic;
        
        // Trigger subtopic population
        const subtopicSelect = document.getElementById('edit-q-subtopic');
        subtopicSelect.innerHTML = '';
        const subs = topicsMap[q.topic] || [];
        subs.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub;
            opt.innerText = sub;
            if(sub === q.subtopic) opt.selected = true;
            subtopicSelect.appendChild(opt);
        });

        document.getElementById('edit-q-title').value = q.title;
        document.getElementById('edit-q-desc').value = q.description || '';
        
        // Time breakdown
        let totalSeconds = q.time_limit;
        const d = Math.floor(totalSeconds / 86400);
        totalSeconds %= 86400;
        const h = Math.floor(totalSeconds / 3600);
        totalSeconds %= 3600;
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        
        document.getElementById('edit-q-days').value = d;
        document.getElementById('edit-q-hours').value = h;
        document.getElementById('edit-q-mins').value = m;
        document.getElementById('edit-q-secs').value = s;

        document.getElementById('edit-q-opt-a').value = q.option_a;
        document.getElementById('edit-q-opt-b').value = q.option_b;
        document.getElementById('edit-q-opt-c').value = q.option_c;
        document.getElementById('edit-q-opt-d').value = q.option_d;
        document.getElementById('edit-q-correct').value = q.correct_option;

        openEditModal();
    };

    window.openEditModal = () => {
        document.getElementById('edit-question-modal').classList.remove('hidden');
    };

    window.closeEditModal = () => {
        document.getElementById('edit-question-modal').classList.add('hidden');
    };

    // --- Submissions Section ---
    async function fetchSubmissions() {
        try {
            const res = await fetch(`${API_BASE}/submissions`, { headers: getHeaders() });
            const data = await res.json();
            const tbody = document.getElementById('submissions-tbody');
            tbody.innerHTML = '';
            
            data.submissions.forEach(sub => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${sub.student}</td>
                    <td>${sub.question}</td>
                    <td>${sub.topic}</td>
                    <td>Opt ${sub.selected_option}</td>
                    <td><span class="badge ${sub.is_correct ? 'correct' : 'incorrect'}">${sub.is_correct ? 'Correct' : 'Incorrect'}</span></td>
                    <td>${sub.file_path ? `<a href="${sub.file_path}" target="_blank" class="btn-small" style="background:rgba(99,102,241,0.1); border:1px solid rgba(99,102,241,0.2); color:#818cf8; text-decoration:none;"><i class="fas fa-eye"></i> View</a>` : '<span class="text-muted">None</span>'}</td>
                    <td><small>${sub.timestamp}</small></td>
                    <td>
                        <button class="btn-danger btn-small" onclick="deleteSubmission(${sub.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }

    window.deleteSubmission = async (id) => {
        if (!confirm('Are you sure you want to delete this submission?')) return;
        try {
            const res = await fetch(`${API_BASE}/submissions/${id}`, { method: 'DELETE', headers: getHeaders() });
            if (res.ok) {
                showAlert('Submission deleted!');
                fetchSubmissions();
            }
        } catch (err) { console.error(err); }
    };

    // --- Meet Links Section ---
    document.getElementById('add-meetlink-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            title: document.getElementById('m-title').value,
            url: document.getElementById('m-url').value
        };

        try {
            const res = await fetch(`${API_BASE}/meetlinks`, { method: 'POST', headers: getHeaders(), body: JSON.stringify(data) });
            if (res.ok) {
                showAlert('Link posted!');
                document.getElementById('add-meetlink-form').reset();
                fetchMeetLinks();
            }
        } catch (error) { showAlert('Error', true); }
    });

    async function fetchMeetLinks() {
        try {
            const res = await fetch(`${API_BASE}/meetlinks`, { headers: getHeaders() });
            const data = await res.json();
            const list = document.getElementById('meetlinks-list');
            list.innerHTML = '';
            
            data.meetlinks.forEach(l => {
                const item = document.createElement('div');
                item.className = 'item-card';
                item.innerHTML = `
                    <div class="item-content">
                        <h4>${l.title}</h4>
                        <p><a href="${l.url}" target="_blank" class="action-link">${l.url}</a></p>
                        <p><small>${l.created_at}</small></p>
                    </div>
                    <div class="item-actions">
                        <button class="btn-danger btn-small" onclick="deleteMeetLink(${l.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                list.appendChild(item);
            });
        } catch (err) { console.error(err); }
    }

    window.deleteMeetLink = async (id) => {
        try {
            await fetch(`${API_BASE}/meetlinks/${id}`, { method: 'DELETE', headers: getHeaders() });
            fetchMeetLinks();
        } catch (err) { console.error(err); }
    };

    // --- Messages Section ---
    document.getElementById('send-msg-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formObj = new FormData();
        formObj.append('receiver_id', document.getElementById('msg-receiver').value);
        formObj.append('content', document.getElementById('msg-content').value);
        
        const fileInput = document.getElementById('msg-file');
        if(fileInput.files.length > 0) {
            formObj.append('file', fileInput.files[0]);
        }

        try {
            const res = await fetch(`${API_BASE}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // FormData automatically sets multipart boundaries
                body: formObj
            });
            if (res.ok) {
                showAlert('Message sent!');
                document.getElementById('send-msg-form').reset();
                fetchMessages();
            } else {
                showAlert('Error sending message', true);
            }
        } catch (error) { showAlert('Error', true); }
    });

    async function fetchMessages() {
        try {
            const res = await fetch(`${API_BASE}/messages`, { headers: getHeaders() });
            const data = await res.json();
            const list = document.getElementById('messages-list');
            list.innerHTML = '';
            
            data.messages.forEach(m => {
                const item = document.createElement('div');
                item.className = 'item-card';
                
                let targetLabel = m.receiver_id === null ? '<span class="badge correct">Broadcast</span>' : `To: <strong>${m.receiver}</strong>`;
                
                item.innerHTML = `
                    <div class="item-content w-100">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                            <strong>${m.sender} <span class="badge ${m.sender_role === 'admin' ? 'correct' : ''}">${m.sender_role}</span></strong>
                            <small class="text-muted">${m.timestamp}</small>
                        </div>
                        <p style="margin-bottom:0.3rem;"><small>${targetLabel}</small></p>
                        <p style="color:var(--text-main); margin-bottom: 0.5rem;">${m.content}</p>
                        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                            ${m.file_path ? `<a href="${m.file_path}" target="_blank" class="action-link" style="font-size:0.9rem;"><i class="fas fa-paperclip"></i> View Attached File</a>` : '<span></span>'}
                            <button class="btn-danger btn-small" onclick="deleteMessage(${m.id})" title="Delete Message"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
                list.appendChild(item);
            });
        } catch (err) { console.error(err); }
    }
    
    async function fetchStudentsForMessages() {
        try {
            const res = await fetch(`${API_BASE}/students`, { headers: getHeaders() });
            const data = await res.json();
            const receiverSelect = document.getElementById('msg-receiver');
            receiverSelect.innerHTML = '<option value="all" selected>All Students (Broadcast)</option>';
            data.students.forEach(std => {
                const opt = document.createElement('option');
                opt.value = std.id;
                opt.innerText = std.username;
                receiverSelect.appendChild(opt);
            });
        } catch (err) { console.error(err); }
    }

    // --- Leaderboard Section ---
    async function fetchLeaderboard() {
        try {
            const res = await fetch(`${API_BASE}/students`, { headers: getHeaders() });
            const data = await res.json();
            const tbody = document.getElementById('leaderboard-tbody');
            tbody.innerHTML = '';

            const sorted = data.students.sort((a, b) => b.average - a.average);

            if (sorted.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:2rem;"><i class="fas fa-trophy" style="opacity:0.3; font-size:2rem;"></i><br>No students yet</td></tr>';
                return;
            }

            sorted.forEach((std, index) => {
                const rank = index + 1;
                const correct = Math.round((std.average / 100) * std.total_submissions);

                let medalIcon = `<span style="font-weight:700; color:var(--text-muted);">${rank}</span>`;
                if (rank === 1) medalIcon = '<span title="Gold" style="font-size:1.3rem;">🥇</span>';
                else if (rank === 2) medalIcon = '<span title="Silver" style="font-size:1.3rem;">🥈</span>';
                else if (rank === 3) medalIcon = '<span title="Bronze" style="font-size:1.3rem;">🥉</span>';

                let scoreBadgeColor = '#ef4444';
                if (std.average >= 80) scoreBadgeColor = '#22c55e';
                else if (std.average >= 50) scoreBadgeColor = '#f59e0b';

                const tr = document.createElement('tr');
                tr.style.transition = 'background 0.2s';
                tr.innerHTML = `
                    <td style="text-align:center;">${medalIcon}</td>
                    <td><strong>${std.username}</strong></td>
                    <td style="text-align:center;">${std.total_submissions}</td>
                    <td style="text-align:center;">${correct}</td>
                    <td style="text-align:center;">
                        <span style="background:${scoreBadgeColor}22; color:${scoreBadgeColor}; border:1px solid ${scoreBadgeColor}55; padding:0.25rem 0.75rem; border-radius:999px; font-weight:600; font-size:0.9rem;">
                            ${std.average}%
                        </span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }

    // --- Students Registry Section ---
    async function fetchStudents() {
        try {
            const res = await fetch(`${API_BASE}/students`, { headers: getHeaders() });
            const data = await res.json();
            const tbody = document.getElementById('students-tbody');
            tbody.innerHTML = '';
            
            const sortedStudents = data.students.sort((a, b) => b.average - a.average);

            sortedStudents.forEach((std, index) => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${index + 1}</td>
                    <td><strong>${std.username}</strong></td>
                    <td>${std.total_submissions}</td>
                    <td><span class="badge correct">${std.average}%</span></td>
                    <td>
                        <button class="btn-danger btn-small" onclick="deleteStudent(${std.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }
    
    window.deleteStudent = async (id) => {
        if(!confirm('Are you sure you want to delete this student? All their submissions and messages will be permanently removed.')) return;
        try {
            const res = await fetch(`${API_BASE}/students/${id}`, { 
                method: 'DELETE', 
                headers: getHeaders() 
            });
            if(res.ok) {
                showAlert('Student deleted successfully');
                fetchStudents();
                fetchGlobalStats();
            } else {
                showAlert('Failed to delete student', true);
            }
        } catch (err) { console.error(err); }
    };

    window.deleteMessage = async (id) => {
        if(!confirm('Delete this message permanently?')) return;
        try {
            const res = await fetch(`${API_BASE}/messages/${id}`, { 
                method: 'DELETE', 
                headers: getHeaders() 
            });
            if(res.ok) {
                showAlert('Message deleted');
                fetchMessages();
            }
        } catch (err) { console.error(err); }
    };

    // --- Excel Export Handlers ---
    async function downloadExcelBlob(endpoint, defaultFilename) {
        try {
            showAlert('Generating Excel file...', false);
            const res = await fetch(`${API_BASE}/${endpoint}`, {
                method: 'GET',
                headers: getHeaders()
            });
            
            if (!res.ok) {
                showAlert('Failed to export data.', true);
                return;
            }
            
            const blob = await res.blob();
            // Get filename from response header if available
            let filename = defaultFilename;
            const disposition = res.headers.get('content-disposition');
            if (disposition && disposition.indexOf('attachment') !== -1) {
                const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                const matches = filenameRegex.exec(disposition);
                if (matches != null && matches[1]) { 
                    filename = matches[1].replace(/['"]/g, '');
                }
            }

            // Create hidden download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            showAlert('Export complete!');
        } catch (err) {
            console.error(err);
            showAlert('Error generating export.', true);
        }
    }

    // Attach listeners
    document.getElementById('export-submissions-btn').addEventListener('click', () => {
        downloadExcelBlob('export/submissions', 'Submissions.xlsx');
    });

    document.getElementById('export-registry-btn').addEventListener('click', () => {
        downloadExcelBlob('export/students', 'Students.xlsx');
    });

    document.getElementById('export-leaderboard-btn').addEventListener('click', () => {
        downloadExcelBlob('export/students', 'Leaderboard.xlsx'); // They use the same endpoint but it's okay
    });

    async function fetchGlobalStats() {
        try {
            const res = await fetch(`${API_BASE}/students`, { headers: getHeaders() });
            if (res.status === 401) {
                localStorage.clear();
                window.location.href = '/login';
                return;
            }
            const data = await res.json();
            
            const students = data.students;
            const totalStudents = students.length;
            
            let sumAverages = 0;
            students.forEach(std => {
                sumAverages += parseFloat(std.average) || 0;
            });
            const overallAverage = totalStudents > 0 ? (sumAverages / totalStudents).toFixed(2) : 0;
            
            const countEl = document.getElementById('global-stat-students');
            const avgEl = document.getElementById('global-stat-average');
            
            if (countEl) countEl.innerText = totalStudents;
            if (avgEl) avgEl.innerText = `${overallAverage}%`;
        } catch (err) {
            console.error(err);
        }
    }

    // Initial Load
    fetchQuestions();
    fetchGlobalStats();
});
