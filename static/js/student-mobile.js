/* =========================================================
   student-mobile.js  —  Aptitude PRO  |  Mobile Dashboard
   Runs ONLY when the mobile layout is visible (≤ 768px).
   ========================================================= */

'use strict';

/* ── Guard: only run when mobile layout is active ─────────── */
const mobileEl = document.getElementById('mobile-layout');
if (!mobileEl) { /* nothing to do */ }
else {

const API = '/api';

/* ── Auth Guard ────────────────────────────────────────────── */
const token    = localStorage.getItem('token');
const role     = localStorage.getItem('role');
const username = localStorage.getItem('username') || 'Student';

if (!token || role !== 'student') {
    window.location.href = '/';
}

/* ── Helpers ──────────────────────────────────────────────── */
const $   = id => document.getElementById(id);
const hdr = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
});

function showToast(msg, type = 'success') {
    const el = $('mob-alert');
    if (!el) return;
    el.textContent = msg;
    el.className   = `mob-alert ${type} show`;
    setTimeout(() => { el.className = 'mob-alert'; }, 3000);
}

function initials(name) {
    return (name || 'S').trim().split(/\s+/)
        .map(w => w[0]).join('').substring(0, 2).toUpperCase();
}

/* ── Avatar & Name ────────────────────────────────────────── */
const ini = initials(username);
if ($('avatar-initials'))  $('avatar-initials').textContent  = ini;
if ($('mob-profile-av'))   $('mob-profile-av').textContent   = ini;
if ($('mob-profile-name')) $('mob-profile-name').textContent = username;

/* ═══════════════════════════════════════════════════════════
   THEME  —  Light / Dark Toggle
   ═══════════════════════════════════════════════════════════ */
const themeBtn   = $('mob-theme-toggle');
const mobApp     = document.getElementById('mobile-layout');

/* Saved preference; default = dark */
let currentTheme = localStorage.getItem('mob-theme') || 'dark';

function applyTheme(theme) {
    if (theme === 'light') {
        mobApp.classList.add('mob-light-mode');
        if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
        mobApp.classList.remove('mob-light-mode');
        if (themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun"></i>';
    }
    currentTheme = theme;
    localStorage.setItem('mob-theme', theme);
}

applyTheme(currentTheme);   /* Apply on load */

if (themeBtn) {
    themeBtn.addEventListener('click', () => {
        applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
    });
}

/* ═══════════════════════════════════════════════════════════
   NAVIGATION  —  6-item bottom bar
   Sections: mob-home | mob-practice | mob-company |
             mob-classes | mob-leaderboard | mob-profile
   ═══════════════════════════════════════════════════════════ */
const navItems  = document.querySelectorAll('#mobile-layout .mob-nav-item');
const sections  = document.querySelectorAll('#mobile-layout .mob-section');

/* Map section → lazy loader */
const sectionLoaders = {
    'mob-classes':     fetchMeetLinks,
    'mob-leaderboard': fetchLeaderboard,
    'mob-practice':    () => renderGrid('mob-practice-grid'),
    'mob-company':     renderCompany,
    'mob-profile':     loadProfile,
};

function switchSection(targetId) {
    /* Hide all sections */
    sections.forEach(s => s.classList.remove('mob-active'));
    navItems.forEach(n => n.classList.remove('mob-nav-active'));

    /* Show target */
    const sec = document.getElementById(targetId);
    if (sec) sec.classList.add('mob-active');

    const activeNav = document.querySelector(
        `#mobile-layout .mob-nav-item[data-section="${targetId}"]`
    );
    if (activeNav) activeNav.classList.add('mob-nav-active');

    /* Scroll back to top */
    const scroll = $('mob-scroll');
    if (scroll) scroll.scrollTo({ top: 0, behavior: 'smooth' });

    /* Lazy load data */
    if (sectionLoaders[targetId]) sectionLoaders[targetId]();
}

navItems.forEach(item => {
    item.addEventListener('click', () => {
        switchSection(item.getAttribute('data-section'));
    });
});

/* CTA button → Practice */
const ctaBtn = $('mob-cta-practice');
if (ctaBtn) ctaBtn.addEventListener('click', () => switchSection('mob-practice'));

/* Avatar click → Profile */
const avatar = $('mob-avatar');
if (avatar) avatar.addEventListener('click', () => switchSection('mob-profile'));

/* ═══════════════════════════════════════════════════════════
   CATEGORY META
   ═══════════════════════════════════════════════════════════ */
const categoryMeta = {
    'Logical Reasoning': {
        icon: '🧠', iconClass: 'violet',
        desc: 'Patterns, sequences, puzzles & analytical thinking'
    },
    'Quantitative Aptitude': {
        icon: '🔢', iconClass: 'blue',
        desc: 'Numbers, algebra, arithmetic & maths problem solving'
    },
    'Verbal Ability': {
        icon: '🗣️', iconClass: 'green',
        desc: 'Grammar, vocabulary, comprehension & verbal reasoning'
    },
    'Placement / Company Focused': {
        icon: '💻', iconClass: 'orange',
        desc: 'Mixed aptitude, logical puzzles & placement-style questions'
    }
};

/* ═══════════════════════════════════════════════════════════
   STATE
   ═══════════════════════════════════════════════════════════ */
let allQuestions = [];
let solvedIds    = [];

/* ═══════════════════════════════════════════════════════════
   STATS  API
   ═══════════════════════════════════════════════════════════ */
async function loadStats() {
    try {
        const res  = await fetch(`${API}/student/stats`, { headers: hdr() });
        const data = await res.json();

        const safePatch = (id, val) => { const el = $(id); if (el) el.textContent = val; };

        safePatch('mob-stat-attempted', data.total_attempted  || 0);
        safePatch('mob-stat-average',  `${data.average       || 0}%`);
        safePatch('mob-prof-attempted', data.total_attempted  || 0);
        safePatch('mob-prof-correct',   data.correct_answers  || 0);
        safePatch('mob-prof-avg',      `${data.average       || 0}%`);

        solvedIds = data.solved_questions || [];
    } catch (err) { console.error('[stats]', err); }
}

/* ═══════════════════════════════════════════════════════════
   QUESTIONS  API  →  category cards
   ═══════════════════════════════════════════════════════════ */
async function fetchQuestions() {
    await loadStats();
    try {
        const res  = await fetch(`${API}/questions`, { headers: hdr() });
        if (!res.ok) return;
        const data = await res.json();
        allQuestions = data.questions || [];

        renderGrid('mob-category-grid');   /* Home section */
    } catch (err) { console.error('[questions]', err); }
}

/* Render category cards into a given container */
function renderGrid(containerId, filterFn = null) {
    const grid = $(containerId);
    if (!grid) return;
    grid.innerHTML = '';

    Object.entries(categoryMeta).forEach(([catName, meta]) => {
        if (filterFn && !filterFn(catName)) return;
        const remaining = allQuestions.filter(
            q => q.topic === catName && !solvedIds.includes(q.id)
        ).length;
        grid.appendChild(buildCard(catName, meta, remaining));
    });
}

function renderCompany() {
    renderGrid('mob-company-grid', name => name === 'Placement / Company Focused');
}

function buildCard(catName, meta, count) {
    const card = document.createElement('div');
    card.className = 'mob-cat-card';
    card.innerHTML = `
        <div class="mob-card-top">
            <div class="mob-card-icon ${meta.iconClass}">${meta.icon}</div>
            <div class="mob-card-text">
                <h3>${catName}</h3>
                <p>${meta.desc}</p>
            </div>
        </div>
        <div class="mob-card-footer">
            <span class="mob-q-badge">
                <i class="fas fa-question-circle"></i>
                ${count} Question${count !== 1 ? 's' : ''}
            </span>
            <button class="mob-start-btn" data-cat="${catName}">
                Start Quiz <i class="fas fa-arrow-right"></i>
            </button>
        </div>`;

    card.querySelector('.mob-start-btn').addEventListener('click', e => {
        e.stopPropagation();
        startQuiz(catName);
    });
    card.addEventListener('click', () => startQuiz(catName));
    return card;
}

function startQuiz(category) {
    window.location.href = `/quiz?category=${encodeURIComponent(category)}`;
}

/* ═══════════════════════════════════════════════════════════
   LEADERBOARD
   ═══════════════════════════════════════════════════════════ */
async function fetchLeaderboard() {
    const list = $('mob-lb-list');
    if (!list) return;
    list.innerHTML = '<p class="mob-empty">Loading…</p>';
    try {
        const res  = await fetch(`${API}/leaderboard`, { headers: hdr() });
        const data = await res.json();
        list.innerHTML = '';

        if (!data.leaderboard?.length) {
            list.innerHTML = '<p class="mob-empty">No data yet.</p>';
            return;
        }

        data.leaderboard.forEach((std, idx) => {
            const rank        = idx + 1;
            const rankClass   = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '';
            const rankDisplay = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

            const row = document.createElement('div');
            row.className = `mob-lb-row${std.is_me ? ' mob-me' : ''}`;
            row.innerHTML = `
                <div class="mob-rank ${rankClass}">${rankDisplay}</div>
                <div class="mob-lb-name">
                    ${escHtml(std.username)}
                    ${std.is_me ? '<span class="mob-you-badge">YOU</span>' : ''}
                </div>
                <div class="mob-lb-score">${std.average}%</div>`;
            list.appendChild(row);
        });
    } catch (err) {
        if (list) list.innerHTML = '<p class="mob-empty">Failed to load.</p>';
        console.error('[leaderboard]', err);
    }
}

/* ═══════════════════════════════════════════════════════════
   PROFILE  (loads history + messages together)
   ═══════════════════════════════════════════════════════════ */
function loadProfile() {
    loadStats();
    fetchHistory();
    fetchMessages();
}

/* ═══════════════════════════════════════════════════════════
   HISTORY
   ═══════════════════════════════════════════════════════════ */
async function fetchHistory() {
    const list = $('mob-hist-list');
    if (!list) return;
    list.innerHTML = '<p class="mob-empty">Loading…</p>';
    try {
        const res  = await fetch(`${API}/student/history`, { headers: hdr() });
        const data = await res.json();
        list.innerHTML = '';

        if (!data.history?.length) {
            list.innerHTML = '<p class="mob-empty">No questions answered yet.</p>';
            return;
        }

        data.history.forEach(sub => {
            const row = document.createElement('div');
            row.className = 'mob-hist-row';
            row.innerHTML = `
                <div class="mob-hist-q">${escHtml(sub.question_title)}</div>
                <div class="mob-hist-meta">
                    <span class="mob-hist-topic">${escHtml(sub.topic)} → ${escHtml(sub.subtopic)}</span>
                    <span class="mob-hist-status ${sub.is_correct ? 'correct' : 'incorrect'}">
                        ${sub.is_correct ? '✓ Correct' : '✗ Wrong'}
                    </span>
                </div>`;
            list.appendChild(row);
        });
    } catch (err) {
        if (list) list.innerHTML = '<p class="mob-empty">Failed to load history.</p>';
        console.error('[history]', err);
    }
}

/* ═══════════════════════════════════════════════════════════
   LIVE CLASSES  —  Meet Links
   Called when "Classes" nav tab is tapped
   ═══════════════════════════════════════════════════════════ */
async function fetchMeetLinks() {
    const list = $('mob-meet-list');
    if (!list) return;
    list.innerHTML = '<p class="mob-empty">Loading…</p>';
    try {
        const res  = await fetch(`${API}/meetlinks`, { headers: hdr() });
        const data = await res.json();
        list.innerHTML = '';

        if (!data.meetlinks?.length) {
            list.innerHTML = `
                <div style="text-align:center;padding:24px 0;">
                    <div style="font-size:2.5rem;margin-bottom:12px;">📹</div>
                    <p class="mob-empty" style="padding:0;">No active classes right now.<br>
                    <span style="font-size:0.76rem;">Check back later for live sessions.</span></p>
                </div>`;
            return;
        }

        data.meetlinks.forEach(l => {
            const row = document.createElement('div');
            row.className = 'mob-meet-row';
            row.innerHTML = `
                <div class="mob-meet-icon"><i class="fas fa-video"></i></div>
                <div class="mob-meet-info">
                    <h4>${escHtml(l.title)}</h4>
                    <p>Posted: ${escHtml(l.created_at)}</p>
                </div>
                <a href="${escHtml(l.url)}" target="_blank" rel="noopener" class="mob-join-btn">
                    <i class="fas fa-external-link-alt"></i> Join
                </a>`;
            list.appendChild(row);
        });
    } catch (err) {
        if (list) list.innerHTML = '<p class="mob-empty">Failed to load classes.</p>';
        console.error('[meetlinks]', err);
    }
}

/* ═══════════════════════════════════════════════════════════
   MESSAGES  —  Send + Fetch + Delete
   ═══════════════════════════════════════════════════════════ */
const msgForm = $('mob-msg-form');
if (msgForm) {
    msgForm.addEventListener('submit', async e => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('content', $('mob-msg-content').value.trim());
        formData.append('receiver_id', '1');  /* Admin = 1 */

        const fileInput = $('mob-msg-file');
        if (fileInput?.files.length > 0) formData.append('file', fileInput.files[0]);

        try {
            const res = await fetch(`${API}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                showToast('Message sent ✓', 'success');
                msgForm.reset();
                fetchMessages();
            } else {
                showToast('Error sending message', 'error');
            }
        } catch {
            showToast('Network error', 'error');
        }
    });
}

async function fetchMessages() {
    const chatList = $('mob-chat-list');
    if (!chatList) return;
    chatList.innerHTML = '';

    try {
        const res  = await fetch(`${API}/messages`, { headers: hdr() });
        const data = await res.json();

        if (!data.messages?.length) {
            chatList.innerHTML = '<p class="mob-empty">No messages yet.</p>';
            return;
        }

        data.messages.forEach(m => {
            const isAnnounce = m.receiver_id === null;
            const isMe       = !isAnnounce && m.sender_role !== 'admin';

            const bubble     = document.createElement('div');
            const bubbleCls  = isAnnounce ? 'announcement' : isMe ? 'from-me' : 'from-admin';
            bubble.className = `mob-chat-bubble ${bubbleCls}`;

            const label   = isAnnounce ? '📢 Announcement' : isMe ? 'Me' : 'Admin';
            const fileTag = m.file_path
                ? `<br><a href="${escHtml(m.file_path)}" target="_blank"
                      style="color:#a78bfa;font-size:0.75rem;text-decoration:none;">
                      <i class="fas fa-paperclip"></i>&nbsp;View File</a>`
                : '';
            const delTag  = isMe
                ? `<button class="mob-bubble-del" onclick="mobDeleteMsg(${m.id})">
                       <i class="fas fa-trash"></i> Delete</button>`
                : '';

            bubble.innerHTML = `
                <div class="mob-bubble-header">
                    <span class="mob-bubble-label">${label}</span>
                    <span class="mob-bubble-time">${escHtml(m.timestamp)}</span>
                </div>
                <div class="mob-bubble-content">${escHtml(m.content)}${fileTag}</div>
                ${delTag}`;
            chatList.appendChild(bubble);
        });
    } catch (err) { console.error('[messages]', err); }
}

window.mobDeleteMsg = async id => {
    if (!confirm('Delete this message permanently?')) return;
    try {
        const res = await fetch(`${API}/messages/${id}`, {
            method: 'DELETE', headers: hdr()
        });
        if (res.ok) {
            showToast('Message deleted', 'success');
            fetchMessages();
        }
    } catch (err) { console.error(err); }
};

/* ═══════════════════════════════════════════════════════════
   LOGOUT
   ═══════════════════════════════════════════════════════════ */
const logoutBtn = $('mob-logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.clear();
            window.location.href = '/';
        }
    });
}

/* ═══════════════════════════════════════════════════════════
   SECURITY HELPER  —  basic XSS escape
   ═══════════════════════════════════════════════════════════ */
function escHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/* ═══════════════════════════════════════════════════════════
   INIT  —  Kick off on page load
   ═══════════════════════════════════════════════════════════ */
fetchQuestions();   /* loads stats + renders home cards */

} /* end guard block */
