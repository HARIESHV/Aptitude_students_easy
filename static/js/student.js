const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    /* ── Desktop-only guard: skip on mobile screens ── */
    if (window.innerWidth <= 768) return;
    const desktopEl = document.getElementById('desktop-layout');
    if (!desktopEl) return;

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
    document.getElementById('user-display-name').innerText = username;

    // --- Cinematic Reveal Animations (GSAP) ---
    if (typeof gsap !== 'undefined') {
        gsap.to('.animate-reveal', {
            opacity: 1,
            y: 0,
            duration: 1,
            stagger: 0.2,
            ease: "power4.out"
        });

        // Floating Card Animation for Daily Challenge
        gsap.to('.daily-challenge-card', {
            y: -10,
            duration: 3,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }

    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.dashboard-section');
    const pageTitle = document.getElementById('page-title');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const target = link.getAttribute('data-target');
            const category = link.getAttribute('data-category');
            
            navLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.style.display = 'none');
            
            link.classList.add('active');
            const targetSection = document.getElementById(target);
            if (targetSection) targetSection.style.display = 'block';
            
            if (pageTitle) pageTitle.innerText = link.innerText.trim();

            if (target === 'practice') {
                if (category) {
                    showQuestionsInCategory(category);
                } else {
                    fetchStudentQuestions();
                }
            }
            if(target === 'history') fetchHistory();
            if(target === 'stats') loadStatsChart();
            if(target === 'student-meetlinks') fetchMeetLinks();
            if(target === 'student-messages') fetchMessages();
            if(target === 'leaderboard-section') fetchLeaderboard();
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

    let solvedQuestionsList = []; 
    let activeTimers = {};

    // --- Load Stats ---
    async function loadStats() {
        try {
            const res = await fetch(`${API_BASE}/student/stats`, { headers: getHeaders() });
            const data = await res.json();
            
            document.getElementById('stat-attempted').innerText = data.total_attempted;
            document.getElementById('stat-average').innerText = `${data.average}%`;
            
            document.getElementById('big-attempted').innerText = data.total_attempted;
            document.getElementById('big-average').innerText = data.average;
            document.getElementById('big-correct').innerText = data.correct_answers;

            solvedQuestionsList = data.solved_questions || [];
        } catch (err) { console.error(err); }
    }

    function loadStatsChart() { loadStats(); }

    // --- Answer Submission Engine ---
    async function submitAnswer(qId, selectedOpt, formEl, qCard) {
        if(activeTimers[qId]) {
            clearInterval(activeTimers[qId]);
            delete activeTimers[qId];
        }
        
        try {
            const subRes = await fetch(`${API_BASE}/submissions`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ question_id: qId, selected_option: selectedOpt })
            });
            const subData = await subRes.json();
            
            const msgBox = document.getElementById(`result-msg-${qId}`);
            if(msgBox) msgBox.classList.remove('hidden');
            
            if (subRes.ok) {
                if (subData.is_correct) {
                    if(msgBox) msgBox.innerHTML = `<span class="badge correct"><i class="fas fa-check"></i> Correct! Well done.</span>`;
                } else {
                    if(msgBox) msgBox.innerHTML = `<span class="badge incorrect"><i class="fas fa-times"></i> Incorrect. The right answer was Option ${subData.correct_option}</span>`;
                }
                
                if (formEl) {
                    formEl.querySelectorAll('input, button').forEach(el => el.disabled = true);
                }
                setTimeout(() => {
                    if(qCard) qCard.style.opacity = '0.5';
                    fetchStudentQuestions(); 
                }, 2000);
            } else {
                if(msgBox) {
                    msgBox.innerText = subData.message;
                    msgBox.className = 'mt-3 badge incorrect';
                }
            }
        } catch (err) { console.error(err); }
    }

    const categoryMeta = {
        'Logical Reasoning': { icon: '🧠', desc: 'Patterns, sequences, puzzles, and analytical thinking' },
        'Placement / Company Focused': { icon: '💻', desc: 'Mixed aptitude, logical puzzles, and placement-style problems' },
        'Quantitative Aptitude': { icon: '🔢', desc: 'Numbers, algebra, arithmetic, and mathematical problem solving' },
        'Verbal Ability': { icon: '🗣️', desc: 'Grammar, vocabulary, comprehension, and verbal reasoning' }
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
        grid.innerHTML = '';
        
        // Ensure all categories from meta are shown, even if 0 questions
        Object.keys(categoryMeta).forEach(catName => {
            const meta = categoryMeta[catName];
            const catQuestions = allQuestions.filter(q => q.topic === catName && !solvedQuestionsList.includes(q.id));
            const count = catQuestions.length;

            const card = document.createElement('div');
            card.className = 'category-card';
            card.innerHTML = `
                <div>
                    <div class="category-icon">${meta.icon}</div>
                    <h3>${catName}</h3>
                    <p>${meta.desc}</p>
                    <div class="category-stats">
                        <span class="cat-badge questions"><i class="fas fa-question-circle"></i> ${count} Questions</span>
                        <span class="cat-badge timer"><i class="fas fa-infinity"></i> No Timer</span>
                        <span class="cat-badge duration">lifetime</span>
                    </div>
                </div>
                <button class="btn-start-quiz" onclick="showQuestionsInCategory('${catName}')">Start Quiz &rarr;</button>
            `;
            grid.appendChild(card);
        });

        document.getElementById('quiz-categories-view').classList.remove('hidden');
        document.getElementById('category-questions-view').classList.add('hidden');
    }

    window.showQuestionsInCategory = (category) => {
        window.location.href = `/quiz?category=${encodeURIComponent(category)}`;
    };

    window.showCategories = () => {
        // Redundant on dashboard as it's separate now
    };

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

    // --- Answered History Section ---
    async function fetchHistory() {
        try {
            const res = await fetch(`${API_BASE}/student/history`, { headers: getHeaders() });
            const data = await res.json();
            const tbody = document.getElementById('student-history-tbody');
            tbody.innerHTML = '';
            
            if (data.history.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No questions answered yet.</td></tr>';
                return;
            }

            data.history.forEach(sub => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td><strong>${sub.question_title}</strong></td>
                    <td><small>${sub.topic} &gt; ${sub.subtopic}</small></td>
                    <td><strong>Opt ${sub.selected_option}</strong></td>
                    <td>Opt ${sub.correct_option}</td>
                    <td><span class="badge ${sub.is_correct ? 'correct' : 'incorrect'}">${sub.is_correct ? 'Correct' : 'Incorrect'}</span></td>
                    <td><small>${sub.timestamp}</small></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }

    // --- Meet Links UI ---
    async function fetchMeetLinks() {
        try {
            const res = await fetch(`${API_BASE}/meetlinks`, { headers: getHeaders() });
            const data = await res.json();
            const list = document.getElementById('student-meetlinks-list');
            list.innerHTML = '';
            
            if (data.meetlinks.length === 0) {
                list.innerHTML = '<p class="text-muted">No active classes right now.</p>';
            }

            data.meetlinks.forEach(l => {
                const item = document.createElement('div');
                item.className = 'item-card';
                item.innerHTML = `
                    <div class="item-content">
                        <h4>${l.title}</h4>
                        <p class="text-muted mb-2"><small>Posted: ${l.created_at}</small></p>
                        <p class="mt-2"><a href="${l.url}" target="_blank" class="btn-primary btn-small" style="text-decoration:none;"><i class="fas fa-video"></i> Join Class</a></p>
                    </div>
                `;
                list.appendChild(item);
            });
        } catch (err) { console.error(err); }
    }

    // --- Messaging UI ---
    document.getElementById('student-send-msg-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formObj = new FormData();
        formObj.append('content', document.getElementById('s-msg-content').value);
        // FORCE: Students only message the admin.
        formObj.append('receiver_id', '1'); 
        
        const fileInput = document.getElementById('s-msg-file');
        if(fileInput.files.length > 0) {
            formObj.append('file', fileInput.files[0]);
        }
        
        try {
            const res = await fetch(`${API_BASE}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // Fetch handles multipart boundary internally
                body: formObj
            });
            if (res.ok) {
                showAlert('Message sent to Admin!');
                document.getElementById('student-send-msg-form').reset();
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
            const list = document.getElementById('student-messages-list');
            list.innerHTML = '';
            
            if (data.messages.length === 0) {
                 list.innerHTML = '<p class="text-muted">No messages found.</p>';
                 return;
            }
            
            data.messages.forEach(m => {
                const item = document.createElement('div');
                item.className = 'item-card';
                
                let label = '';
                let badgeClass = '';
                let receiverInfo = '';
                
                if (m.receiver_id === null) {
                    label = 'Announcement';
                    badgeClass = 'correct'; // green for official announcements
                    receiverInfo = 'All Students';
                } else {
                    label = m.sender_role === 'admin' ? 'Admin' : 'Me';
                    badgeClass = m.sender_role === 'admin' ? 'correct' : 'bg-secondary';
                    receiverInfo = m.sender_role === 'admin' ? '' : 'To: Admin';
                }

                item.innerHTML = `
                    <div class="item-content w-100">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.5rem;">
                            <strong>${label} <span class="badge ${badgeClass}">${m.sender_role}</span></strong>
                            <small class="text-muted">${m.timestamp}</small>
                        </div>
                        ${receiverInfo ? `<p style="margin-bottom:0.3rem;"><small><strong>${receiverInfo}</strong></small></p>` : ''}
                        <p style="color:var(--text-main); margin-bottom: 0.5rem;">${m.content}</p>
                        <div style="display:flex; justify-content:space-between; align-items:flex-end;">
                            ${m.file_path ? `<a href="${m.file_path}" target="_blank" class="action-link" style="font-size:0.9rem;"><i class="fas fa-paperclip"></i> View Attached File</a>` : '<span></span>'}
                            ${label === 'Me' ? `<button class="btn-danger btn-small" onclick="deleteMessage(${m.id})" title="Delete My Message"><i class="fas fa-trash"></i></button>` : ''}
                        </div>
                    </div>
                `;
                list.appendChild(item);
            });
        } catch (err) { console.error(err); }
    }
    
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


    // --- Leaderboard Section ---
    async function fetchLeaderboard() {
        try {
            const res = await fetch(`${API_BASE}/leaderboard`, { headers: getHeaders() });
            const data = await res.json();
            const tbody = document.getElementById('student-leaderboard-tbody');
            tbody.innerHTML = '';
            
            data.leaderboard.forEach((std, index) => {
                const tr = document.createElement('tr');
                if (std.is_me) tr.style.background = 'rgba(99, 102, 241, 0.1)';
                tr.innerHTML = `
                    <td><strong>#${index + 1}</strong></td>
                    <td>${std.username} ${std.is_me ? '<span class="badge correct">You</span>' : ''}</td>
                    <td>${std.total_submissions}</td>
                    <td><span class="highlight-text">${std.average}%</span></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) { console.error(err); }
    }

    // Initialize
    fetchStudentQuestions();
});
