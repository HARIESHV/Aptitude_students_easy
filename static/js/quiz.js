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
        document.body.classList.add('dark-mode', 'dark');
        const toggle = document.getElementById('quiz-theme-toggle');
        if(toggle) toggle.innerHTML = '<i class="fas fa-sun"></i> Theme';
    }

    document.getElementById('quiz-theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        document.body.classList.toggle('dark');
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
        'Logical Reasoning': { icon: '<i class="fas fa-brain"></i>', desc: 'Patterns, sequences, puzzles, and analytical thinking' },
        'Placement / Company Focused': { icon: '<i class="fas fa-laptop-code"></i>', desc: 'Mixed aptitude, logical puzzles, and placement-style problems' },
        'Quantitative Aptitude': { icon: '<i class="fas fa-calculator"></i>', desc: 'Numbers, algebra, arithmetic, and mathematical problem solving' },
        'Verbal Ability': { icon: '<i class="fas fa-comment-dots"></i>', desc: 'Grammar, vocabulary, comprehension, and verbal reasoning' }
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
            list.innerHTML = `<div class="glass-panel rounded-3xl p-8 md:p-12 text-center space-y-6">
                <div class="w-20 h-20 md:w-24 md:h-24 bg-green-100 dark:bg-green-900/20 text-green-600 rounded-full flex items-center justify-center text-4xl md:text-5xl mx-auto shadow-xl shadow-green-500/20">
                    <i class="fas fa-check-double"></i>
                </div>
                <h1 class="text-2xl md:text-3xl font-bold font-orbitron">Category Conquered!</h1>
                <p class="text-slate-500 font-medium text-base md:text-lg">You have completed all available questions in <br/><span class="text-indigo-600 font-bold">${categoryName}</span>.</p>
                <button onclick="window.location.href='/student_dashboard'" class="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/20 hover:scale-105 transition-all">Return to Dashboard</button>
            </div>`;
            return;
        }

        const meta = categoryMeta[categoryName] || { icon: '❓' };
        
        const header = document.createElement('div');
        header.className = 'flex flex-row items-end justify-between mb-8 gap-4';
        header.innerHTML = `
            <div class="space-y-1">
                <div class="flex items-center gap-2 md:gap-3">
                    <div class="w-8 h-8 md:w-10 md:h-10 bg-indigo-600 text-white rounded-lg md:rounded-xl flex items-center justify-center text-base md:text-xl">${meta.icon}</div>
                    <h1 class="text-xl md:text-2xl font-bold font-orbitron tracking-tight">${categoryName}</h1>
                </div>
                <p class="text-slate-400 font-bold uppercase tracking-widest text-[10px] md:text-xs">Question ${currentQuestionIndex + 1} of ${filteredQuestions.length}</p>
            </div>
            <div class="nav-dots flex gap-1.5 md:gap-2 overflow-x-auto pb-1">
                ${filteredQuestions.map((_, i) => `<span class="dot ${i === currentQuestionIndex ? 'active' : ''}"></span>`).join('')}
            </div>
        `;
        list.appendChild(header);

        const q = filteredQuestions[currentQuestionIndex];
        const qCard = document.createElement('div');
        qCard.className = 'glass-panel rounded-3xl md:rounded-[2.5rem] p-6 md:p-12 space-y-8 md:space-y-10 relative overflow-hidden active-question-card animate-reveal';
        qCard.id = `q-card-${q.id}`;
        qCard.innerHTML = `
            <div class="flex flex-col md:flex-row justify-between items-start gap-4 md:items-center">
                <div class="space-y-1">
                    <span class="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-indigo-500">${q.subtopic}</span>
                    <h3 class="text-2xl md:text-3xl font-bold leading-tight">${q.title}</h3>
                </div>
                <div id="timer-badge-${q.id}" class="px-4 py-2 md:px-6 md:py-3 bg-slate-100 dark:bg-slate-900 rounded-xl md:rounded-2xl border border-black/5 dark:border-white/5 flex items-center gap-2 md:gap-3 font-bold text-sm md:text-base">
                    <i class="fas fa-clock text-slate-400"></i> 
                    <span id="timer-${q.id}">${q.time_limit > 0 ? formatTime(q.time_limit) : '∞'}</span>
                </div>
            </div>

            <div id="q-content-${q.id}" class="space-y-8 md:space-y-10">
                <p class="text-lg md:text-xl text-slate-600 dark:text-slate-300 font-medium leading-relaxed">${q.description}</p>
                
                <form id="solve-form-${q.id}" class="space-y-8">
                    ${q.question_type === 'text' ? `
                    <div class="relative group">
                        <i class="fas fa-pen-nib absolute left-5 md:left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors"></i>
                        <input type="text" name="text_answer_${q.id}" id="text_answer_${q.id}" placeholder="Type your answer..." required 
                        class="w-full pl-12 md:pl-14 pr-6 md:pr-8 py-4 md:py-5 bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl border-2 border-slate-100 dark:border-slate-800 focus:outline-none focus:border-indigo-600 transition-all font-bold text-base md:text-lg text-slate-900 dark:text-white">
                    </div>
                    ` : `
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 q-options-list">
                        <div class="q-option-card glass-panel !bg-white/40 dark:!bg-slate-900/40 p-5 md:p-6 rounded-2xl md:rounded-3xl flex items-center gap-4 md:gap-5" data-option="A">
                            <div class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 opt-letter text-sm md:text-base">A</div>
                            <span class="font-bold text-base md:text-lg opt-text">${q.option_a}</span>
                            <input type="radio" name="option_${q.id}" value="A" required class="hidden">
                        </div>
                        <div class="q-option-card glass-panel !bg-white/40 dark:!bg-slate-900/40 p-5 md:p-6 rounded-2xl md:rounded-3xl flex items-center gap-4 md:gap-5" data-option="B">
                            <div class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 opt-letter text-sm md:text-base">B</div>
                            <span class="font-bold text-base md:text-lg opt-text">${q.option_b}</span>
                            <input type="radio" name="option_${q.id}" value="B" class="hidden">
                        </div>
                        <div class="q-option-card glass-panel !bg-white/40 dark:!bg-slate-900/40 p-5 md:p-6 rounded-2xl md:rounded-3xl flex items-center gap-4 md:gap-5" data-option="C">
                            <div class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 opt-letter text-sm md:text-base">C</div>
                            <span class="font-bold text-base md:text-lg opt-text">${q.option_c}</span>
                            <input type="radio" name="option_${q.id}" value="C" class="hidden">
                        </div>
                        <div class="q-option-card glass-panel !bg-white/40 dark:!bg-slate-900/40 p-5 md:p-6 rounded-2xl md:rounded-3xl flex items-center gap-4 md:gap-5" data-option="D">
                            <div class="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-slate-400 opt-letter text-sm md:text-base">D</div>
                            <span class="font-bold text-base md:text-lg opt-text">${q.option_d}</span>
                            <input type="radio" name="option_${q.id}" value="D" class="hidden">
                        </div>
                    </div>
                    `}
                    
                    <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6 pt-6 border-t border-black/5 dark:border-white/5">
                        <div class="flex items-center gap-4">
                            <label class="cursor-pointer group flex items-center gap-3 px-4 md:px-5 py-2.5 md:py-3 bg-slate-50 dark:bg-slate-900 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-900/10 transition-all">
                                <i class="fas fa-paperclip text-slate-400 group-hover:text-indigo-600"></i>
                                <span class="text-[10px] md:text-xs font-bold text-slate-500 group-hover:text-indigo-600 uppercase tracking-widest">Attach Proof</span>
                                <input type="file" id="file-${q.id}" class="hidden" accept=".pdf,.doc,.docx,image/*">
                            </label>
                            <div id="file-status-${q.id}" class="text-[9px] md:text-[10px] font-black uppercase text-indigo-600 tracking-widest hidden">File Ready</div>
                        </div>

                        <div class="flex gap-3 md:gap-4">
                            <button type="button" id="prev-btn" class="flex-1 md:flex-none px-4 md:px-6 py-3 md:py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl md:rounded-2xl font-bold ${currentQuestionIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200'} transition-all text-sm md:text-base">Prev</button>
                            <button type="submit" id="btn-submit-${q.id}" class="flex-[2] md:flex-none px-6 md:px-10 py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-bold shadow-xl shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all text-sm md:text-base">Submit</button>
                            <button type="button" id="next-btn" class="flex-1 md:flex-none px-4 md:px-6 py-3 md:py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl md:rounded-2xl font-bold ${currentQuestionIndex === filteredQuestions.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-200'} transition-all text-sm md:text-base">Next</button>
                        </div>
                    </div>
                </form>
            </div>
            <div id="result-msg-${q.id}" class="mt-8 hidden p-8 rounded-3xl font-bold text-center text-xl animate-reveal"></div>
        `;
        list.appendChild(qCard);

        // File feedback
        const fileInput = document.getElementById(`file-${q.id}`);
        const fileStatus = document.getElementById(`file-status-${q.id}`);
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) fileStatus.classList.remove('hidden');
        });

        // Card Selection Logic
        if (q.question_type !== 'text') {
            const cards = qCard.querySelectorAll('.q-option-card');
            cards.forEach(card => {
                card.addEventListener('click', () => {
                    if (card.classList.contains('correct') || card.classList.contains('incorrect')) return;
                    cards.forEach(c => c.classList.remove('selected'));
                    card.classList.add('selected');
                    card.querySelector('input').checked = true;
                });
            });
        }

        // Navigation
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
            let selected = 'None';
            if (q.question_type === 'text') {
                const textInput = document.getElementById(`text_answer_${q.id}`);
                selected = textInput ? textInput.value : '';
            } else {
                const selectedInput = document.querySelector(`input[name="option_${q.id}"]:checked`);
                selected = selectedInput ? selectedInput.value : 'None';
            }
            const file = fileInput && fileInput.files[0] ? fileInput.files[0] : null;
            submitAnswer(q.id, selected, file, formEl, qCard);
        });

        startTimer(q.id, q.time_limit);
    }

    async function submitAnswer(qId, selectedOpt, file, formEl, qCard) {
        if(activeTimers[qId]) {
            clearInterval(activeTimers[qId]);
            delete activeTimers[qId];
        }
        
        try {
            const btn = document.getElementById(`btn-submit-${qId}`);
            btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Processing...';
            btn.disabled = true;

            const formData = new FormData();
            formData.append('question_id', qId);
            formData.append('selected_option', selectedOpt);
            if(file) formData.append('file', file);

            const subRes = await fetch(`${API_BASE}/submissions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const subData = await subRes.json();
            
            const msgBox = document.getElementById(`result-msg-${qId}`);
            msgBox.classList.remove('hidden');
            
            if (subRes.ok) {
                const selectedCard = qCard.querySelector('.q-option-card.selected');
                const allOptionCards = qCard.querySelectorAll('.q-option-card');
                
                if (subData.is_correct) {
                    msgBox.className = 'mt-8 p-8 rounded-3xl font-bold text-center text-xl bg-green-500 text-white shadow-2xl shadow-green-500/30';
                    msgBox.innerHTML = `<i class="fas fa-check-circle text-3xl mb-2 block"></i> Outstanding Intelligence!<br/><span class="text-sm opacity-80 uppercase tracking-widest">Answer Correct</span>`;
                    if(selectedCard) selectedCard.classList.add('correct');
                } else {
                    msgBox.className = 'mt-8 p-8 rounded-3xl font-bold text-center text-xl bg-red-500 text-white shadow-2xl shadow-red-500/30';
                    msgBox.innerHTML = `<i class="fas fa-times-circle text-3xl mb-2 block"></i> Logical Discrepancy Found.<br/><span class="text-sm opacity-80 uppercase tracking-widest">Correct Answer: ${subData.correct_option}</span>`;
                    if(selectedCard) {
                        selectedCard.classList.remove('selected');
                        selectedCard.classList.add('incorrect');
                    }
                    
                    // Highlight actual correct
                    const correctCard = qCard.querySelector(`.q-option-card[data-option="${subData.correct_option}"]`);
                    if(correctCard) correctCard.classList.add('correct');
                }
                
                formEl.querySelectorAll('input, button').forEach(el => el.disabled = true);
                
                setTimeout(() => {
                    fetchQuestions(); 
                }, 4000);
            } else {
                msgBox.innerText = subData.message;
                msgBox.className = 'mt-8 p-6 bg-red-100 text-red-600 rounded-2xl font-bold';
            }
        } catch (err) { 
            console.error(err);
            btn.innerHTML = 'Retry Submission';
            btn.disabled = false;
        }
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
                    let selectedVal = 'None';
                    const textInput = document.getElementById(`text_answer_${qId}`);
                    if (textInput) {
                        selectedVal = textInput.value;
                    } else {
                        const checkedInputs = document.querySelector(`input[name="option_${qId}"]:checked`);
                        selectedVal = checkedInputs ? checkedInputs.value : 'None';
                    }
                    submitAnswer(qId, selectedVal, null, formEl, document.getElementById(`q-card-${qId}`));
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
