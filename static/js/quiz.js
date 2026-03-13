const API_BASE = '/api';

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    if (!token || role !== 'student') {
        window.location.href = '/';
        return;
    }

    // Initialize Theme
    const currentTheme = localStorage.getItem('theme') || 'light';
    if (currentTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const toggle = document.getElementById('quiz-theme-toggle');
        if(toggle) toggle.innerHTML = '<i class="fas fa-sun"></i> Theme';
    }

    document.getElementById('quiz-theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const theme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        localStorage.setItem('theme', theme);
        document.getElementById('quiz-theme-toggle').innerHTML = theme === 'dark' ? '<i class="fas fa-sun"></i> Theme' : '<i class="fas fa-moon"></i> Theme';
    });

    const getHeaders = () => ({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    });

    const urlParams = new URLSearchParams(window.location.search);
    const categoryName = urlParams.get('category');

    if (!categoryName) {
        window.location.href = '/student_dashboard';
        return;
    }

    const categoryMeta = {
        'Logical Reasoning': { icon: '🧠', desc: 'Patterns, sequences, puzzles, and analytical thinking' },
        'Placement / Company Focused': { icon: '💻', desc: 'Mixed aptitude, logical puzzles, and placement-style problems' },
        'Quantitative Aptitude': { icon: '🔢', desc: 'Numbers, algebra, arithmetic, and mathematical problem solving' },
        'Verbal Ability': { icon: '🗣️', desc: 'Grammar, vocabulary, comprehension, and verbal reasoning' }
    };

    const alertBox = document.getElementById('quiz-alert');
    function showAlert(msg, isError = false) {
        alertBox.textContent = msg;
        alertBox.className = `alert ${isError ? 'alert-error' : 'alert-success'}`;
        alertBox.classList.remove('hidden');
        setTimeout(() => alertBox.classList.add('hidden'), 3000);
    }

    let solvedQuestionsList = [];
    let allQuestions = [];
    let activeTimers = {};
    let currentQuestionIndex = 0;
    let filteredQuestions = [];

    async function loadStats() {
        try {
            const res = await fetch(`${API_BASE}/student/stats`, { headers: getHeaders() });
            const data = await res.json();
            solvedQuestionsList = data.solved_questions || [];
        } catch (err) { console.error(err); }
    }

    async function fetchQuestions() {
        await loadStats();
        try {
            const res = await fetch(`${API_BASE}/questions`, { headers: getHeaders() });
            if (!res.ok) return;
            const data = await res.json();
            allQuestions = data.questions;
            filteredQuestions = allQuestions.filter(q => q.topic === categoryName && !solvedQuestionsList.includes(q.id));
            if (currentQuestionIndex >= filteredQuestions.length && filteredQuestions.length > 0) {
                currentQuestionIndex = filteredQuestions.length - 1;
            }
            renderQuestions();
        } catch (err) { console.error(err); }
    }

    function renderQuestions() {
        const list = document.getElementById('student-questions-list');
        list.innerHTML = '';
        
        filteredQuestions = allQuestions.filter(q => q.topic === categoryName && !solvedQuestionsList.includes(q.id));
        const solvedInCat = allQuestions.filter(q => q.topic === categoryName && solvedQuestionsList.includes(q.id));

        if (filteredQuestions.length === 0) {
            list.innerHTML = `<div class="glass-panel text-center py-5">
                <i class="fas fa-check-circle text-success" style="font-size: 3rem; margin-bottom: 1rem;"></i>
                <p class="text-main" style="font-size: 1.2rem;">Awesome! You have completed all available questions in this category.</p>
                <button onclick="window.location.href='/student_dashboard'" class="btn-primary mt-4" style="width:auto;">Go to Dashboard</button>
            </div>`;
            return;
        }

        const meta = categoryMeta[categoryName] || { icon: '❓' };
        
        const header = document.createElement('div');
        header.className = 'text-center mb-4';
        header.innerHTML = `
            <div class="category-icon" style="font-size: 3.5rem;">${meta.icon}</div>
            <h1 style="font-size: 2rem; filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.4)); margin-bottom: 0.5rem;">${categoryName}</h1>
            <p class="text-muted">Question ${currentQuestionIndex + 1} of ${filteredQuestions.length}</p>
        `;
        list.appendChild(header);

        const questionsContainer = document.createElement('div');
        questionsContainer.className = 'centered-view';
        list.appendChild(questionsContainer);
        
        const q = filteredQuestions[currentQuestionIndex];
        const qCard = document.createElement('div');
        qCard.className = 'question-solve-card active-question-card';
        qCard.id = `q-card-${q.id}`;
        qCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 1.5rem;">
                <h3 style="margin: 0; color: #fff;">${q.title}</h3>
                <span class="badge" id="timer-badge-${q.id}" style="background:rgba(255,255,255,0.05); color:var(--text-main); border:1px solid rgba(255,255,255,0.1);">
                    <i class="fas fa-clock"></i> 
                    <span id="timer-${q.id}">${q.time_limit > 0 ? formatTime(q.time_limit) : '∞'}</span>
                </span>
            </div>
            <div style="margin-bottom: 1.5rem;">
                <small class="badge" style="background:rgba(99, 102, 241, 0.2); color:#818cf8; border:1px solid rgba(99, 102, 241, 0.3);">${q.topic} &gt; ${q.subtopic}</small>
            </div>
            
            <div id="q-content-${q.id}">
                <p class="text-main mb-4" style="font-size: 1.2rem; line-height: 1.8; color: #fff;">${q.description}</p>
                <form id="solve-form-${q.id}">
                    <div class="q-options-list">
                        <label class="q-option-label" style="background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.1);"><input type="radio" name="option_${q.id}" value="A" required> A) ${q.option_a}</label>
                        <label class="q-option-label" style="background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.1);"><input type="radio" name="option_${q.id}" value="B"> B) ${q.option_b}</label>
                        <label class="q-option-label" style="background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.1);"><input type="radio" name="option_${q.id}" value="C"> C) ${q.option_c}</label>
                        <label class="q-option-label" style="background: rgba(255,255,255,0.03); border-color: rgba(255,255,255,0.1);"><input type="radio" name="option_${q.id}" value="D"> D) ${q.option_d}</label>
                    </div>
                    
                    <div class="file-upload-section mt-3">
                        <label class="text-muted mb-2" style="display:block; font-size:0.9rem;">
                            <i class="fas fa-paperclip"></i> Attach supporting file (Optional: PDF, Image, DOCX)
                        </label>
                        <input type="file" id="file-${q.id}" class="file-input" accept=".pdf,.doc,.docx,image/*">
                    </div>

                    <button type="submit" class="btn-start-quiz mt-4" style="width: auto; padding: 1rem 2rem;" id="btn-submit-${q.id}">
                        <i class="fas fa-paper-plane"></i> Submit Answer
                    </button>
                </form>
            </div>
            <div id="result-msg-${q.id}" class="mt-4 hidden" style="font-weight: 500;"></div>
        `;
        questionsContainer.appendChild(qCard);

        // Navigation Footer
        const navFooter = document.createElement('div');
        navFooter.className = 'quiz-navigation mt-5';
        navFooter.innerHTML = `
            <button id="prev-btn" class="btn-nav ${currentQuestionIndex === 0 ? 'disabled' : ''}" ${currentQuestionIndex === 0 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i> Previous
            </button>
            <div class="nav-dots">
                ${filteredQuestions.map((_, i) => `<span class="dot ${i === currentQuestionIndex ? 'active' : ''}"></span>`).join('')}
            </div>
            <button id="next-btn" class="btn-nav ${currentQuestionIndex === filteredQuestions.length - 1 ? 'disabled' : ''}" ${currentQuestionIndex === filteredQuestions.length - 1 ? 'disabled' : ''}>
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;
        questionsContainer.appendChild(navFooter);

        // Event Listeners
        document.getElementById('prev-btn').addEventListener('click', () => {
            if (currentQuestionIndex > 0) {
                currentQuestionIndex--;
                renderQuestions();
            }
        });

        document.getElementById('next-btn').addEventListener('click', () => {
            if (currentQuestionIndex < filteredQuestions.length - 1) {
                currentQuestionIndex++;
                renderQuestions();
            }
        });

        const formEl = document.getElementById(`solve-form-${q.id}`);
        formEl.addEventListener('submit', (e) => {
            e.preventDefault();
            const selectedInput = document.querySelector(`input[name="option_${q.id}"]:checked`);
            const selected = selectedInput ? selectedInput.value : 'None';
            const fileInput = document.getElementById(`file-${q.id}`);
            const file = fileInput && fileInput.files[0] ? fileInput.files[0] : null;
            submitAnswer(q.id, selected, file, formEl, qCard);
        });

        // Auto-start timer
        startTimer(q.id, q.time_limit);

        if(solvedInCat.length > 0) {
            const solvedMsg = document.createElement('div');
            solvedMsg.className = 'text-center text-muted mt-5';
            solvedMsg.innerHTML = `<hr style="border:0; border-top:1px solid rgba(255,255,255,0.1); margin: 2rem 0;"><p><i class="fas fa-history"></i> You have already solved ${solvedInCat.length} question(s) in this topic.</p>`;
            questionsContainer.appendChild(solvedMsg);
        }
    }

    async function submitAnswer(qId, selectedOpt, file, formEl, qCard) {
        if(activeTimers[qId]) {
            clearInterval(activeTimers[qId]);
            delete activeTimers[qId];
        }
        
        try {
            const formData = new FormData();
            formData.append('question_id', qId);
            formData.append('selected_option', selectedOpt);
            if(file) formData.append('file', file);

            const subRes = await fetch(`${API_BASE}/submissions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // Form data handles its own boundary
                body: formData
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
                    qCard.style.opacity = '0.5';
                    fetchQuestions(); 
                }, 2000);
            } else {
                if(msgBox) {
                    msgBox.innerText = subData.message;
                    msgBox.className = 'mt-4 badge incorrect';
                }
            }
        } catch (err) { console.error(err); }
    }

    window.startTimer = (qId, timeLimit) => {
        const badge = document.getElementById(`timer-badge-${qId}`);
        if(!badge) return;
        
        if (timeLimit > 0) {
            badge.style.background = '#fee2e2';
            badge.style.color = '#ef4444';
            badge.style.borderColor = '#fca5a5';

            let timeLeft = timeLimit;
            activeTimers[qId] = setInterval(() => {
                timeLeft--;
                const tBadge = document.getElementById(`timer-${qId}`);
                if(tBadge) tBadge.innerText = formatTime(timeLeft);
                
                if (timeLeft <= 0) {
                    clearInterval(activeTimers[qId]);
                    delete activeTimers[qId];
                    badge.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Time's Up!`;
                    
                    const formEl = document.getElementById(`solve-form-${qId}`);
                    const checkedInputs = document.querySelector(`input[name="option_${qId}"]:checked`);
                    const selectedVal = checkedInputs ? checkedInputs.value : 'None';
                    submitAnswer(qId, selectedVal, formEl, document.getElementById(`q-card-${qId}`));
                }
            }, 1000);
        } else {
            badge.style.background = 'rgba(16, 185, 129, 0.1)';
            badge.style.color = '#34d399';
            badge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
        }
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

    fetchQuestions();
});
