/**
 * ============================================================
 * RESULT.JS — PTU Grade Portal · Modern Interactive Frontend
 * Unified SPA with Public Homepage, Staff Dashboard,
 * Student OTP Self-Service, Dark/Light Theme System,
 * Interactive Dropzones, Animated Counters, and Particle Canvas.
 * ============================================================
 */

'use strict';

// Auto-detect backend API URL for local testing and public cloud deployment
const API_URL = (() => {
    if (window.API_URL) return window.API_URL;
    if (localStorage.getItem('CUSTOM_API_URL')) return localStorage.getItem('CUSTOM_API_URL');
    if (window.location.protocol === 'file:') return 'http://127.0.0.1:8000';
    if ((window.location.hostname === '127.0.0.1' || window.location.hostname === 'localhost') && window.location.port && window.location.port !== '8000') {
        return 'http://127.0.0.1:8000';
    }
    return window.location.origin;
})();

// ─── Global State ─────────────────────────────────────────────
let authToken = localStorage.getItem('token') || null;
let userRole = localStorage.getItem('role') || null;
let currentUsername = localStorage.getItem('username') || null;
let currentView = 'dashboard';

// Active navigation view state
let _activePublicView = 'home'; // 'home' | 'auth' | 'report-card'

// Inline editing IDs
let editStudentId = null;
let editStudentRegNo = null;
let editSubjectId = null;
let editResultId = null;
let editResultBatch = '';

// Caches
let allStudentsCache = [];
let allSubjectsCache = [];
let allResultsCache = [];
let allGradesCache = [];

// Filters
let currentBatchFilter = 'All';
let currentSectionFilter = 'All';
let currentDeptFilter = 'All';
let currentStudentSearch = '';
let currentSubjectSearch = '';
let currentArrearFilter = ['all'];

// Results View State
let currentResultsBatchFilter = 'All';
let resultsCurrentPage = 1;
let resultsPageSize = 50;
let resultsAvailableBatches = [];

// Report Card OTP State
let rcRegNo = '';
let rcEmail = '';
let rcAccessToken = '';
let rcResendTimerId = null;

// ─── 1. Utility Functions ────────────────────────────────────
function $(id) {
    return document.getElementById(id);
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

const ROMAN_ORDER = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
function romanCompare(a, b) {
    const idxA = ROMAN_ORDER.indexOf(String(a).trim().toUpperCase());
    const idxB = ROMAN_ORDER.indexOf(String(b).trim().toUpperCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return String(a).localeCompare(String(b));
}

// ─── 2. Toast Notification System ────────────────────────────
function showToast(message, type = 'success', durationMs = 3200) {
    const container = $('toast-container');
    if (!container) return;

    const titleMap = { success: 'Success', error: 'Error', warning: 'Warning', info: 'Information' };
    const iconMap  = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${iconMap[type] || '✓'}</span>
        <div class="toast-body">
            <div class="toast-title">${titleMap[type] || 'Notice'}</div>
            <div class="toast-msg">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="this.closest('.toast').remove()" aria-label="Dismiss">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div class="toast-bar" style="animation-duration:${durationMs}ms;"></div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('removing');
        setTimeout(() => toast.remove(), 260);
    }, durationMs);
}

// ─── 3. Light & Dark Theme System ────────────────────────────
function initTheme() {
    const saved = localStorage.getItem('ptu_theme') || localStorage.getItem('theme');
    const pref = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = saved || pref || 'dark';
    setTheme(theme, false);

    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('ptu_theme')) {
                setTheme(e.matches ? 'dark' : 'light', false);
            }
        });
    }
}

function setTheme(theme, notify = true) {
    const valid = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', valid);
    document.documentElement.style.colorScheme = valid;
    localStorage.setItem('ptu_theme', valid);
    localStorage.setItem('theme', valid);

    // Sync public navbar segmented switch
    const lightBtn = $('theme-btn-light');
    const darkBtn = $('theme-btn-dark');
    if (lightBtn && darkBtn) {
        if (valid === 'light') {
            lightBtn.classList.add('active');
            lightBtn.setAttribute('aria-checked', 'true');
            darkBtn.classList.remove('active');
            darkBtn.setAttribute('aria-checked', 'false');
        } else {
            darkBtn.classList.add('active');
            darkBtn.setAttribute('aria-checked', 'true');
            lightBtn.classList.remove('active');
            lightBtn.setAttribute('aria-checked', 'false');
        }
    }

    // Sync dashboard theme toggle
    const dashToggle = $('theme-toggle');
    if (dashToggle) {
        dashToggle.setAttribute('title', `Switch to ${valid === 'dark' ? 'Light' : 'Dark'} Mode (Alt + T)`);
    }

    if (notify) {
        showToast(`Theme changed to ${valid === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}`, 'info', 2000);
    }
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next, true);
}

// ─── 4. Particle Canvas (Hero Network) ────────────────────────
let _particleAnimationId = null;

function initParticleCanvas() {
    const canvas = $('cyber-network-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let W, H, particles = [];
    const PARTICLE_COUNT = 55;

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    class Particle {
        constructor() {
            this.reset();
        }
        reset() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.vx = (Math.random() - 0.5) * 0.45;
            this.vy = (Math.random() - 0.5) * 0.45;
            this.r = Math.random() * 1.8 + 1;
            this.alpha = Math.random() * 0.5 + 0.2;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > W) this.vx *= -1;
            if (this.y < 0 || this.y > H) this.vy *= -1;
        }
        draw() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = isDark
                ? `rgba(129, 140, 248, ${this.alpha})`
                : `rgba(220, 38, 38, ${this.alpha * 0.85})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, W, H);
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 130) {
                    const lineAlpha = (1 - dist / 130) * (isDark ? 0.18 : 0.12);
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = isDark
                        ? `rgba(99, 102, 241, ${lineAlpha})`
                        : `rgba(220, 38, 38, ${lineAlpha})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
        _particleAnimationId = requestAnimationFrame(animate);
    }

    canvas.classList.add('visible');
    animate();
}

// ─── 5. Animated Number Counters ──────────────────────────────
function animateCounter(el, target, duration = 800) {
    if (!el) return;
    const start = parseInt(el.innerText, 10) || 0;
    const end = parseInt(target, 10) || 0;
    if (start === end) {
        el.innerText = end;
        return;
    }
    const startTime = performance.now();
    function tick(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3); // cubic out
        const current = Math.round(start + (end - start) * ease);
        el.innerText = current;
        if (progress < 1) {
            requestAnimationFrame(tick);
        } else {
            el.innerText = end;
        }
    }
    requestAnimationFrame(tick);
}

// ─── 6. Public Stats (Homepage Ticker) ────────────────────────
async function loadPublicStats() {
    const studentEl = $('home-stat-students');
    const subjectEl = $('home-stat-subjects');
    const resultEl  = $('home-stat-results');
    const deptEl    = $('home-stat-depts');

    try {
        const res = await fetch(API_URL + '/stats/public');
        if (res.ok) {
            const data = await res.json();
            if (studentEl) animateCounter(studentEl, data.students || 0);
            if (subjectEl) animateCounter(subjectEl, data.subjects || 0);
            if (resultEl)  animateCounter(resultEl, data.results || 0);
            if (deptEl)    animateCounter(deptEl, data.departments || 0);
            return;
        }
    } catch (e) {
        console.warn('Public stats endpoint unavailable:', e);
    }

    if (studentEl) studentEl.innerText = '0';
    if (subjectEl) subjectEl.innerText = '0';
    if (resultEl)  resultEl.innerText = '0';
    if (deptEl)    deptEl.innerText = '0';
}

// ─── 7. View Routing & Navigation ────────────────────────────
function navigateToHome() {
    _activePublicView = 'home';
    $('public-navbar')?.classList.remove('hidden');
    $('home-section')?.classList.remove('hidden');
    $('auth-section')?.classList.add('hidden');
    $('report-card-section')?.classList.add('hidden');
    $('dashboard-section')?.classList.add('hidden');

    $('nav-btn-home')?.classList.add('active');
    $('nav-btn-student')?.classList.remove('active');
    $('nav-btn-staff')?.classList.remove('active');

    loadPublicStats();
}

function openReportCardFromHome() {
    _activePublicView = 'report-card';
    $('public-navbar')?.classList.remove('hidden');
    $('home-section')?.classList.add('hidden');
    $('auth-section')?.classList.add('hidden');
    $('report-card-section')?.classList.remove('hidden');
    $('dashboard-section')?.classList.add('hidden');

    $('nav-btn-home')?.classList.remove('active');
    $('nav-btn-student')?.classList.add('active');
    $('nav-btn-staff')?.classList.remove('active');

    resetOtpState();
    showRcLookupStep();
}

function openStaffPortalFromHome() {
    if (authToken && userRole) {
        evaluateSessionState();
        return;
    }
    _activePublicView = 'auth';
    $('public-navbar')?.classList.remove('hidden');
    $('home-section')?.classList.add('hidden');
    $('auth-section')?.classList.remove('hidden');
    $('report-card-section')?.classList.add('hidden');
    $('dashboard-section')?.classList.add('hidden');

    $('nav-btn-home')?.classList.remove('active');
    $('nav-btn-student')?.classList.remove('active');
    $('nav-btn-staff')?.classList.add('active');
}

function closeStaffPortalFromHome() {
    navigateToHome();
}

function openReportCard() {
    openReportCardFromHome();
}

function closeReportCard() {
    navigateToHome();
}

function closeReportCardOutput() {
    $('report-card-output')?.classList.add('hidden');
    resetOtpState();
    showRcLookupStep();
}

function togglePasswordVisibility(inputId, btn) {
    const input = $(inputId);
    if (!input) return;
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    btn.innerHTML = isPw
        ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
        : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
}

// ─── 8. Authenticated Fetch Helper ────────────────────────────
async function authFetch(url, options = {}) {
    if (!authToken) throw new Error('Not authenticated');
    options.headers = {
        ...options.headers,
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
    };
    const res = await fetch(API_URL + url, options);
    if (res.status === 401) {
        handleLogout();
        throw new Error('Session expired');
    }
    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Request failed');
    }
    return res.json();
}

// ─── 9. Authentication & Wizard Flow Logic ───────────────────────
let authFlow = {
    mode: 'login',       // 'login' | 'register' | 'reset'
    step: 'login',       // 'login' | 'otp-request' | 'otp-verify' | 'set-password'
    name: '',
    email: '',
    otpToken: null
};

function updatePasswordCriteria(password) {
    const container = document.getElementById('password-criteria');
    if (!container) return;

    const rules = [
        { id: 'length',    test: password.length >= 8 },
        { id: 'lowercase', test: /[a-z]/.test(password) },
        { id: 'uppercase', test: /[A-Z]/.test(password) },
        { id: 'digit',     test: /\d/.test(password) },
        { id: 'special',   test: /[!@#$%^&*]/.test(password) }
    ];

    rules.forEach(rule => {
        const item = container.querySelector(`[data-criteria="${rule.id}"]`);
        if (!item) return;
        const icon = item.querySelector('.criteria-icon');
        if (rule.test) {
            item.classList.add('valid');
            item.classList.remove('invalid');
            if (icon) icon.textContent = '✓';
        } else {
            item.classList.add('invalid');
            item.classList.remove('valid');
            if (icon) icon.textContent = '•';
        }
    });
}

function showAuthStep(stepName) {
    authFlow.step = stepName;
    const steps = ['login', 'otp-request', 'otp-verify', 'set-password'];
    steps.forEach(s => {
        const el = $(`auth-step-${s}`);
        if (el) el.style.display = (s === stepName) ? 'block' : 'none';
    });

    if (stepName === 'login') {
        if ($('auth-title')) $('auth-title').innerHTML = 'Staff <span class="accent">Sign In</span>';
        if ($('auth-subtitle')) $('auth-subtitle').innerText = 'Enter your credentials to access the management portal';
        authFlow.mode = 'login';
        authFlow.otpToken = null;
    } else if (authFlow.mode === 'register') {
        if ($('auth-title')) $('auth-title').innerHTML = 'Staff <span class="accent">Register</span>';
        if ($('auth-subtitle')) $('auth-subtitle').innerText = 'Pre-registered staff identity verification & account setup';
    } else if (authFlow.mode === 'reset') {
        if ($('auth-title')) $('auth-title').innerHTML = 'Reset <span class="accent">Password</span>';
        if ($('auth-subtitle')) $('auth-subtitle').innerText = 'Verify your email identity to set a new password';
    }
}

function startRegisterFlow() {
    authFlow.mode = 'register';
    authFlow.otpToken = null;
    if ($('otp-name-group')) $('otp-name-group').style.display = 'block';
    if ($('otp-req-name')) {
        $('otp-req-name').value = '';
        $('otp-req-name').setAttribute('required', 'required');
    }
    if ($('otp-req-email')) $('otp-req-email').value = '';
    if ($('set-password-btn-label')) $('set-password-btn-label').innerText = 'Complete Registration';
    if ($('set-password-label')) $('set-password-label').innerText = 'Password';
    showAuthStep('otp-request');
    $('otp-req-name')?.focus();
}

function startForgotPasswordFlow() {
    authFlow.mode = 'reset';
    authFlow.otpToken = null;
    if ($('otp-name-group')) $('otp-name-group').style.display = 'none';
    if ($('otp-req-name')) {
        $('otp-req-name').value = '';
        $('otp-req-name').removeAttribute('required');
    }
    if ($('otp-req-email')) $('otp-req-email').value = '';
    if ($('set-password-btn-label')) $('set-password-btn-label').innerText = 'Reset Password';
    if ($('set-password-label')) $('set-password-label').innerText = 'New Password';
    showAuthStep('otp-request');
    $('otp-req-email')?.focus();
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const btn = $('auth-submit-btn');
    const username = $('auth-username').value.trim();
    const password = $('auth-password').value;

    if (!username || !password) {
        showToast('Please enter both username and password', 'warning');
        return;
    }

    btn.classList.add('loading');
    const formData = new URLSearchParams({ username, password });
    try {
        const res = await fetch(API_URL + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Invalid username or password');

        localStorage.setItem('token', data.access_token);
        localStorage.setItem('role', data.role);
        localStorage.setItem('username', data.username);
        authToken = data.access_token;
        userRole = data.role;
        currentUsername = data.username;

        showToast(`Welcome back, ${data.username}! [${(data.role || 'Staff').toUpperCase()}]`, 'success');
        evaluateSessionState();
    } catch (err) {
        let message = err.message;
        if (err.message === 'Failed to fetch') {
            message = 'Cannot connect to backend. Please ensure the server is running on ' + API_URL;
        }
        showToast(message, 'error');
    } finally {
        btn.classList.remove('loading');
    }
}

async function handleOtpRequest(e) {
    e.preventDefault();
    const btn = $('otp-request-btn');
    const name = ($('otp-req-name')?.value || '').trim();
    const email = ($('otp-req-email')?.value || '').trim().toLowerCase();

    if (authFlow.mode === 'register' && !name) {
        showToast('Please enter your full name as recorded in Resources', 'warning');
        return;
    }
    if (!email) {
        showToast('Please enter your email address', 'warning');
        return;
    }

    authFlow.name = name;
    authFlow.email = email;

    btn.classList.add('loading');
    try {
        const res = await fetch(API_URL + '/auth/otp/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, purpose: authFlow.mode })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to send OTP');

        showToast(data.message || 'OTP sent successfully!', 'success');
        if ($('otp-code-input')) $('otp-code-input').value = '';
        if ($('otp-verify-hint')) $('otp-verify-hint').innerText = `A 6-digit OTP has been sent to ${email}. Valid for 10 minutes.`;
        showAuthStep('otp-verify');
        $('otp-code-input')?.focus();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.classList.remove('loading');
    }
}

async function resendOtp() {
    if (!authFlow.email) {
        showAuthStep('otp-request');
        return;
    }
    try {
        const res = await fetch(API_URL + '/auth/otp/request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: authFlow.name, email: authFlow.email, purpose: authFlow.mode })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Failed to resend OTP');
        showToast('New OTP sent to ' + authFlow.email, 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function handleOtpVerify(e) {
    e.preventDefault();
    const btn = $('otp-verify-btn');
    const otp = ($('otp-code-input')?.value || '').trim();

    if (!otp || otp.length !== 6) {
        showToast('Please enter a valid 6-digit OTP code', 'warning');
        return;
    }

    btn.classList.add('loading');
    try {
        const res = await fetch(API_URL + '/auth/otp/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: authFlow.email, otp, purpose: authFlow.mode })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'OTP verification failed');

        authFlow.otpToken = data.otp_token;
        showToast(data.message || 'OTP verified successfully!', 'success');

        if ($('set-password-new')) $('set-password-new').value = '';
        if ($('set-password-confirm')) $('set-password-confirm').value = '';
        updatePasswordCriteria('');
        showAuthStep('set-password');
        $('set-password-new')?.focus();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.classList.remove('loading');
    }
}

async function handleSetPassword(e) {
    e.preventDefault();
    const btn = $('set-password-btn');
    const password = $('set-password-new')?.value || '';
    const confirmPassword = $('set-password-confirm')?.value || '';

    if (!password || !confirmPassword) {
        showToast('Please fill in both password fields', 'warning');
        return;
    }
    if (password !== confirmPassword) {
        showToast('Passwords do not match', 'warning');
        return;
    }

    // Password criteria check
    if (password.length < 8) {
        showToast('Password must be at least 8 characters long', 'warning');
        return;
    }
    if (!/[a-z]/.test(password)) {
        showToast('Password must contain at least one lowercase letter', 'warning');
        return;
    }
    if (!/[A-Z]/.test(password)) {
        showToast('Password must contain at least one uppercase letter', 'warning');
        return;
    }
    if (!/\d/.test(password)) {
        showToast('Password must contain at least one digit', 'warning');
        return;
    }
    if (!/[!@#$%^&*]/.test(password)) {
        showToast('Password must contain a special character (!@#$%^&*)', 'warning');
        return;
    }

    btn.classList.add('loading');
    try {
        if (authFlow.mode === 'register') {
            const res = await fetch(API_URL + '/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: authFlow.name,
                    email: authFlow.email,
                    otp_token: authFlow.otpToken,
                    password,
                    confirm_password: confirmPassword
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Registration failed');
            const assignedUsername = data.username || authFlow.email.split('@')[0];
            showToast(`Registration complete! Your username is "${assignedUsername}". Please sign in.`, 'success');
            if ($('auth-username')) $('auth-username').value = assignedUsername;
        } else {
            const res = await fetch(API_URL + '/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: authFlow.email,
                    otp_token: authFlow.otpToken,
                    new_password: password,
                    confirm_password: confirmPassword
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.detail || 'Password reset failed');
            showToast('Password reset successfully! Please sign in with your new password.', 'success');
        }

        // Reset flow back to login
        showAuthStep('login');
        if ($('auth-username')) $('auth-username').value = authFlow.email;
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.classList.remove('loading');
    }
}

function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('username');
    authToken = null;
    userRole = null;
    currentUsername = null;
    showToast('Signed out successfully', 'info');
    navigateToHome();
}

function evaluateSessionState() {
    const publicNav = $('public-navbar');
    const homeSection = $('home-section');
    const authSection = $('auth-section');
    const reportCardSection = $('report-card-section');
    const dashboardSection = $('dashboard-section');

    if (authToken && userRole) {
        publicNav?.classList.add('hidden');
        homeSection?.classList.add('hidden');
        authSection?.classList.add('hidden');
        reportCardSection?.classList.add('hidden');
        dashboardSection?.classList.remove('hidden');

        if ($('user-display-name')) $('user-display-name').innerText = currentUsername || 'User';
        if ($('user-role-badge')) $('user-role-badge').innerText = (userRole || 'STAFF').toUpperCase();
        if ($('user-avatar')) $('user-avatar').innerText = (currentUsername || 'U').charAt(0).toUpperCase();

        const roleNormalized = (userRole || '').toLowerCase();
        const isAdmin = roleNormalized === 'admin';
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');

        // Synchronize actual role and profile from server to prevent stale localStorage
        authFetch('/auth/me').then(me => {
            if (me && me.role) {
                userRole = me.role;
                localStorage.setItem('role', me.role);
                if (me.username) {
                    currentUsername = me.username;
                    localStorage.setItem('username', me.username);
                }
                if ($('user-display-name')) $('user-display-name').innerText = currentUsername || 'User';
                if ($('user-role-badge')) $('user-role-badge').innerText = (userRole || 'STAFF').toUpperCase();
                const isRealAdmin = (userRole || '').toLowerCase() === 'admin';
                document.querySelectorAll('.admin-only').forEach(el => el.style.display = isRealAdmin ? '' : 'none');
            }
        }).catch(() => {});

        loadDashboardStats();
        switchView(currentView || 'dashboard');
    } else {
        dashboardSection?.classList.add('hidden');
        if (_activePublicView === 'auth') {
            authSection?.classList.remove('hidden');
            homeSection?.classList.add('hidden');
            reportCardSection?.classList.add('hidden');
        } else if (_activePublicView === 'report-card') {
            reportCardSection?.classList.remove('hidden');
            homeSection?.classList.add('hidden');
            authSection?.classList.add('hidden');
        } else {
            navigateToHome();
        }
    }
}

// ─── 10. Dashboard & View Switching ───────────────────────────
function switchView(view) {
    currentView = view;
    document.querySelectorAll('[id^="view-"]').forEach(el => el.classList.add('hidden'));
    const target = $(`view-${view}`);
    if (target) target.classList.remove('hidden');

    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-item[onclick*="${view}"]`)?.classList.add('active');

    const titleMap = {
        dashboard: 'System Overview',
        upload: 'Upload Data',
        results: 'Student Results',
        students: 'Student Management',
        subjects: 'Subject Master',
        grades: 'SGPA / CGPA Summary',
        resources: 'Resources Management'
    };
    if ($('module-title')) {
        $('module-title').innerText = titleMap[view] || (view.charAt(0).toUpperCase() + view.slice(1));
    }

    if (view === 'dashboard') {
        loadDashboardStats();
        populateBatchDropdown();
    }
    if (view === 'resources') loadResources();
    if (view === 'results') loadResults();
    if (view === 'students') loadStudents();
    if (view === 'subjects') {
        if (allSubjectsCache.length) {
            buildDeptTabs(allSubjectsCache);
            loadSubjects(currentDeptFilter);
        } else {
            loadSubjects('All');
        }
    }
    if (view === 'grades') {
        loadGrades();
        populateGradeBatchDropdown();
    }
    if (view === 'upload') {
        initUploadDropzones();
        populateBatchDropdown();
    }
}

function toggleSidebarView() {
    const sidebar = $('main-sidebar');
    const layout = $('dashboard-section');
    if (sidebar) sidebar.classList.toggle('collapsed');
    if (layout) layout.classList.toggle('sidebar-collapsed');
}

async function loadDashboardStats() {
    try {
        const [studentsRes, subjectsRes, resultsRes] = await Promise.allSettled([
            authFetch('/students'),
            authFetch('/subjects'),
            authFetch('/results')
        ]);

        if (studentsRes.status === 'fulfilled') {
            const students = studentsRes.value || [];
            animateCounter($('stat-students'), students.length);
            const depts = new Set(students.map(s => s.department).filter(Boolean));
            if ($('stat-depts')) animateCounter($('stat-depts'), depts.size);
        }
        if (subjectsRes.status === 'fulfilled') {
            animateCounter($('stat-subjects'), (subjectsRes.value || []).length);
        }
        if (resultsRes.status === 'fulfilled') {
            animateCounter($('stat-results'), (resultsRes.value || []).length);
        }
    } catch (e) {
        console.error('Error loading dashboard stats:', e);
    }
}

// ─── 11. Uploads & Interactive File Dropzones ─────────────────
function initUploadDropzones() {
    document.querySelectorAll('.file-dropzone').forEach(zone => {
        const input = zone.querySelector('input[type="file"]');
        const nameLabel = zone.querySelector('.file-dropzone-filename');
        if (!input) return;

        input.onchange = () => {
            if (input.files && input.files[0]) {
                zone.classList.add('has-file');
                if (nameLabel) nameLabel.textContent = `📄 ${input.files[0].name}`;
            } else {
                zone.classList.remove('has-file');
                if (nameLabel) nameLabel.textContent = '';
            }
        };

        zone.ondragover = (e) => {
            e.preventDefault();
            zone.classList.add('drag-over');
        };
        zone.ondragleave = () => {
            zone.classList.remove('drag-over');
        };
        zone.ondrop = (e) => {
            e.preventDefault();
            zone.classList.remove('drag-over');
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                input.files = e.dataTransfer.files;
                zone.classList.add('has-file');
                if (nameLabel) nameLabel.textContent = `📄 ${e.dataTransfer.files[0].name}`;
            }
        };
    });
}

function resetUploadForm(form) {
    if (!form) return;
    form.reset();
    form.querySelector('.upload-submit-btn')?.classList.remove('loading');
    const zone = form.querySelector('.file-dropzone');
    if (zone) {
        zone.classList.remove('has-file', 'drag-over');
        const nameEl = zone.querySelector('.file-dropzone-filename');
        if (nameEl) nameEl.textContent = '';
    }
}

async function populateBatchDropdown() {
    const uploadBatch = $('upload-batch');
    const reevalBatch = $('reeval-batch');
    const purgeBatch = $('dashboard-purge-batch-select');
    try {
        const batches = await authFetch('/students/batches');
        const list = batches || [];
        const optionsHtml = '<option value="">Select batch</option>' + list.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
        if (uploadBatch) uploadBatch.innerHTML = optionsHtml;
        if (reevalBatch) reevalBatch.innerHTML = optionsHtml;
        if (purgeBatch) {
            purgeBatch.innerHTML = '<option value="">Select graduated batch to delete…</option>' + list.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
        }
    } catch (e) {
        console.warn('Could not populate upload batch dropdown:', e);
    }
}

async function handlePurgeBatchSubmit(e) {
    e.preventDefault();
    const select = $('dashboard-purge-batch-select');
    const batchName = select?.value?.trim();
    if (!batchName) {
        showToast('Please select a batch to delete', 'warning');
        return;
    }

    const btn = $('dashboard-purge-batch-btn');
    const msgEl = $('dashboard-purge-batch-msg');
    if (msgEl) {
        msgEl.style.display = 'none';
        msgEl.innerText = '';
    }

    try {
        // Fetch batch details first
        const info = await authFetch(`/batches/${encodeURIComponent(batchName)}/info`);
        const confirmMsg = `⚠️ PERMANENT DELETION WARNING ⚠️\n\nAre you sure you want to completely remove Batch "${batchName}"?\n\nThis will permanently delete:\n• ${info.students || 0} Student records\n• ${info.results || 0} Exam results\n\nThis action CANNOT be undone!`;
        if (!confirm(confirmMsg)) return;

        btn?.classList.add('loading');
        if (btn) btn.disabled = true;

        const res = await authFetch(`/batches/${encodeURIComponent(batchName)}`, {
            method: 'DELETE'
        });

        showToast(res.message || `Batch ${batchName} deleted successfully`, 'success');
        if (select) select.value = '';

        // Refresh system state
        await loadDashboardStats();
        await populateBatchDropdown();
        if (typeof loadStudents === 'function') loadStudents();
        if (typeof loadResults === 'function') loadResults();
    } catch (err) {
        showToast(err.message, 'error');
        if (msgEl) {
            msgEl.style.display = 'block';
            msgEl.className = 'testing-rc-msg error';
            msgEl.innerText = err.message;
        }
    } finally {
        btn?.classList.remove('loading');
        if (btn) btn.disabled = false;
    }
}

async function handleUploadStudents(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.upload-submit-btn');
    const formData = new FormData(form);

    btn?.classList.add('loading');
    try {
        const res = await fetch(API_URL + '/upload/students', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Student upload failed');
        showToast(data.message || 'Students uploaded successfully', 'success');
        resetUploadForm(form);
        loadDashboardStats();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn?.classList.remove('loading');
    }
}

async function handleUploadSubjects(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.upload-submit-btn');
    const formData = new FormData(form);

    btn?.classList.add('loading');
    try {
        const res = await fetch(API_URL + '/upload/subjects', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Subject upload failed');
        showToast(data.message || 'Subjects uploaded successfully', 'success');
        resetUploadForm(form);
        loadDashboardStats();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn?.classList.remove('loading');
    }
}

async function handleUploadResults(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.upload-submit-btn');
    const formData = new FormData(form);
    const sem = $('upload-semester')?.value;
    const batch = $('upload-batch')?.value;
    if (sem) formData.append('semester', sem);
    if (batch) formData.append('batch', batch);

    const statusDiv = $('upload-status');
    if (statusDiv) statusDiv.innerHTML = '<span class="text-muted">Processing results PDF...</span>';

    btn?.classList.add('loading');
    try {
        const res = await fetch(API_URL + '/upload/results', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Results upload failed');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="padding:14px; background:var(--teal-glass); border-radius:var(--r-md); border:1px solid var(--teal); font-size:0.85rem;">
                    <strong>✅ Upload Successful!</strong><br>
                    Students added/updated: ${data.students_added} | Results processed: ${data.results_added}
                    ${data.errors && data.errors.length ? `<br><span style="color:var(--danger)">Errors: ${data.errors.join('; ')}</span>` : ''}
                </div>
            `;
        }
        showToast('Results published successfully', 'success');
        resetUploadForm(form);
        loadDashboardStats();
    } catch (err) {
        if (statusDiv) statusDiv.innerHTML = `<div style="padding:14px; background:var(--danger-light); color:var(--danger); border-radius:var(--r-md);">❌ ${escapeHtml(err.message)}</div>`;
        showToast(err.message, 'error');
    } finally {
        btn?.classList.remove('loading');
    }
}

async function handleUploadReevaluation(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('.upload-submit-btn');
    const formData = new FormData(form);
    const sem = $('reeval-semester')?.value;
    const batch = $('reeval-batch')?.value;
    if (sem) formData.append('semester', sem);
    if (batch) formData.append('batch', batch);

    const statusDiv = $('upload-status');
    if (statusDiv) statusDiv.innerHTML = '<span class="text-muted">Processing re-evaluation PDF...</span>';

    btn?.classList.add('loading');
    try {
        const res = await fetch(API_URL + '/upload/reevaluation', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Re-evaluation upload failed');
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div style="padding:14px; background:var(--teal-glass); border-radius:var(--r-md); border:1px solid var(--teal); font-size:0.85rem;">
                    <strong>✅ Re-evaluation processed!</strong><br>
                    Results updated: ${data.results_added}
                    ${data.errors && data.errors.length ? `<br><span style="color:var(--danger)">Notice: ${data.errors.join('; ')}</span>` : ''}
                </div>
            `;
        }
        showToast('Re-evaluation processed successfully', 'success');
        resetUploadForm(form);
        loadDashboardStats();
    } catch (err) {
        if (statusDiv) statusDiv.innerHTML = `<div style="padding:14px; background:var(--danger-light); color:var(--danger); border-radius:var(--r-md);">❌ ${escapeHtml(err.message)}</div>`;
        showToast(err.message, 'error');
    } finally {
        btn?.classList.remove('loading');
    }
}

// ─── 12. View Results ─────────────────────────────────────────
async function buildResultsBatchTabs() {
    const container = $('results-batch-tabs-container');
    if (!container) return;

    try {
        const batches = await authFetch('/students/batches');
        resultsAvailableBatches = batches || [];
    } catch (e) {
        console.warn('Could not load batches for results tabs:', e);
    }

    let html = `<button class="dept-tab ${currentResultsBatchFilter === 'All' ? 'active' : ''}" onclick="selectResultsBatchTab('All')">
        All Batches
    </button>`;

    resultsAvailableBatches.forEach(b => {
        html += `<button class="dept-tab ${currentResultsBatchFilter === b ? 'active' : ''}" onclick="selectResultsBatchTab('${b}')">
            ${escapeHtml(b)}
        </button>`;
    });

    container.innerHTML = html;
}

function selectResultsBatchTab(batch) {
    currentResultsBatchFilter = batch;
    resultsCurrentPage = 1;
    buildResultsBatchTabs();
    loadResults();
}

async function loadResults() {
    const tbody = $('results-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">Loading results…</td></tr>';

    try {
        const dept = $('filter-department')?.value || '';
        const sem  = $('filter-semester')?.value || '';
        const subCode = $('filter-subject-code')?.value?.trim() || '';

        let url = '/results?';
        if (currentResultsBatchFilter && currentResultsBatchFilter !== 'All') {
            url += `batch=${encodeURIComponent(currentResultsBatchFilter)}&`;
        }
        if (dept) url += `department=${encodeURIComponent(dept)}&`;
        if (sem)  url += `semester=${encodeURIComponent(sem)}&`;
        if (subCode) url += `subject_code=${encodeURIComponent(subCode)}&`;

        const data = await authFetch(url);
        allResultsCache = data || [];

        // Build/update batch tabs
        buildResultsBatchTabs();
        renderResultsTable();
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" class="loading-cell" style="color:var(--danger)">Error: ${escapeHtml(err.message)}</td></tr>`;
        const countEl = $('results-showing-count');
        const fCountEl = $('results-f-showing-count');
        if (countEl) countEl.innerText = '0';
        if (fCountEl) fCountEl.innerText = '0';
    }
}

function renderResultsTable() {
    const tbody = $('results-tbody');
    if (!tbody) return;

    const total = allResultsCache.length;
    const pageSize = resultsPageSize === 'all' ? total : parseInt(resultsPageSize, 10);
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

    if (resultsCurrentPage > totalPages) {
        resultsCurrentPage = totalPages;
    }
    if (resultsCurrentPage < 1) {
        resultsCurrentPage = 1;
    }

    const startIdx = resultsPageSize === 'all' ? 0 : (resultsCurrentPage - 1) * pageSize;
    const endIdx = resultsPageSize === 'all' ? total : Math.min(startIdx + pageSize, total);
    const visibleData = allResultsCache.slice(startIdx, endIdx);

    // Update Counter indicator pill
    const countEl = $('results-showing-count');
    const totalWrap = $('results-total-count-wrap');
    const pill = $('results-count-display');
    if (countEl) countEl.innerText = total;
    if (totalWrap) totalWrap.innerText = '';
    if (pill) {
        pill.title = `Total loaded results: ${total}`;
    }

    // Update F-Grade indicator pill
    const fCount = allResultsCache.filter(r => (r.grade || '').trim().toUpperCase() === 'F').length;
    const fCountEl = $('results-f-showing-count');
    const fPill = $('results-f-count-display');
    if (fCountEl) fCountEl.innerText = fCount;
    if (fPill) {
        fPill.title = `Total F grades in results: ${fCount}`;
    }

    // Update Pagination info
    const pageInfo = $('results-page-info');
    if (pageInfo) {
        if (total === 0) {
            pageInfo.innerText = 'Showing 0 results';
        } else {
            pageInfo.innerText = `Showing ${startIdx + 1}–${endIdx} of ${total}`;
        }
    }

    const pageIndicator = $('results-current-page');
    if (pageIndicator) {
        pageIndicator.innerText = `${resultsCurrentPage} / ${totalPages}`;
    }

    const prevBtn = $('results-prev-btn');
    const nextBtn = $('results-next-btn');
    if (prevBtn) prevBtn.disabled = resultsCurrentPage <= 1;
    if (nextBtn) nextBtn.disabled = resultsCurrentPage >= totalPages;

    if (!total) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">No results found matching filters.</td></tr>';
        return;
    }

    let html = '';
    visibleData.forEach((r, idx) => {
        const gradeClass = 'grade-' + (r.grade || '').replace('+', 'p');
        html += `
            <tr>
                <td><strong>${escapeHtml(r.reg_no)}</strong></td>
                <td>${escapeHtml(r.student_name)}</td>
                <td>${escapeHtml(r.department || '—')}</td>
                <td>${escapeHtml(r.semester)}</td>
                <td><code>${escapeHtml(r.subject_code)}</code></td>
                <td>${escapeHtml(r.subject_name)}</td>
                <td>${r.credits}</td>
                <td><span class="grade-chip ${gradeClass}">${escapeHtml(r.grade)}</span></td>
                <td>${r.grade_point}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn edit" onclick="editResult(${r.id}, '${escapeHtml(r.batch || '')}')" title="Modify Grade">✏️</button>
                        <button class="action-btn delete admin-only" onclick="deleteResult(${r.id}, '${escapeHtml(r.batch || '')}')" title="Delete Result">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    const isAdmin = (userRole || '').toLowerCase() === 'admin';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
}

function prevResultsPage() {
    if (resultsCurrentPage > 1) {
        resultsCurrentPage -= 1;
        renderResultsTable();
        $('results-table-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function nextResultsPage() {
    const pageSize = resultsPageSize === 'all' ? allResultsCache.length : parseInt(resultsPageSize, 10);
    const totalPages = pageSize > 0 ? Math.ceil(allResultsCache.length / pageSize) : 1;
    if (resultsCurrentPage < totalPages) {
        resultsCurrentPage += 1;
        renderResultsTable();
        $('results-table-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function changeResultsPageSize(val) {
    resultsPageSize = val;
    resultsCurrentPage = 1;
    renderResultsTable();
}

let filterDebounceTimer = null;
function applyFilters() {
    if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
    filterDebounceTimer = setTimeout(() => {
        resultsCurrentPage = 1;
        loadResults();
    }, 250);
}

function editResult(id, batch) {
    const row = allResultsCache.find(r => r.id === id && (!batch || (r.batch || '') === batch));
    if (!row) return;

    editResultId = row.id;
    editResultBatch = row.batch || batch || '';
    $('result-edit-id').value = row.id;
    $('result-edit-regno').value = row.reg_no;
    $('result-edit-name').value = row.student_name;
    $('result-edit-subject').value = `${row.subject_code} - ${row.subject_name}`;
    $('result-edit-semester').value = `Semester ${row.semester}`;
    $('result-grade').value = row.grade;

    $('result-form-container').style.display = 'block';
    $('result-form-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideEditResultForm() {
    $('result-form-container').style.display = 'none';
}

async function handleResultSubmit(e) {
    e.preventDefault();
    const id = $('result-edit-id').value;
    const grade = $('result-grade').value;

    try {
        let url = `/results/${id}`;
        if (editResultBatch) url += `?batch=${encodeURIComponent(editResultBatch)}`;
        await authFetch(url, {
            method: 'PUT',
            body: JSON.stringify({ grade })
        });
        showToast('Grade updated successfully', 'success');
        hideEditResultForm();
        loadResults();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteResult(id, batch) {
    if (!confirm('Are you sure you want to delete this result?')) return;
    try {
        let url = `/results/${id}`;
        if (batch) url += `?batch=${encodeURIComponent(batch)}`;
        await authFetch(url, { method: 'DELETE' });
        showToast('Result deleted', 'info');
        loadResults();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function exportResultsToExcel() {
    if (!allResultsCache.length) {
        showToast('No results to export', 'warning');
        return;
    }
    const exportData = allResultsCache.map((r, i) => ({
        'S.No': i + 1,
        'Reg No': r.reg_no,
        'Student Name': r.student_name,
        'Department': r.department,
        'Semester': r.semester,
        'Subject Code': r.subject_code,
        'Subject Name': r.subject_name,
        'Credits': r.credits,
        'Grade': r.grade,
        'Grade Point': r.grade_point
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    XLSX.writeFile(wb, `PTU_Results_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast('Results exported to Excel', 'success');
}

// ─── 13. Student Management ───────────────────────────────────
function deptToCode(department) {
    const d = (department || '').toLowerCase();
    if (d.includes('chem') || d === 'chi') return 'CHE';
    if (d.includes('civil')) return 'CE';
    if (d.includes('computer science') || d === 'cse') return 'CSE';
    if (d.includes('data sci') || d === 'dat sci' || d === 'ds') return 'DS';
    if (d.includes('electronics') && d.includes('communication')) return 'ECE';
    if (d.includes('electrical')) return 'EEE';
    if (d.includes('instrumentation')) return 'EIE';
    if (d.includes('environmental') || d === 'env eng' || d === 'env') return 'ENV';
    if (d.includes('cyber sec') || d.includes('information sec') || d === 'info sec' || d === 'cys') return 'CYS';
    if (d.includes('internet of things') || d === 'int of thi' || d === 'iot') return 'IOT';
    if (d.includes('information tech') || d === 'it') return 'IT';
    if (d.includes('mechatronic')) return 'MT';
    if (d.includes('mechanical')) return 'ME';
    return (department || 'Other').trim();
}

function studentSectionTab(s) {
    const code = deptToCode(s.department);
    return s.section ? `${code}-${s.section}` : code;
}

function buildBatchTabs(students) {
    const container = $('batch-tabs-container');
    if (!container) return;
    const batches = new Set();
    students.forEach(s => { if (s.batch) batches.add(s.batch); });
    const sortedBatches = Array.from(batches).sort();
    let html = `<button class="dept-tab ${currentBatchFilter === 'All' ? 'active' : ''}" data-batch="All" onclick="selectBatchTab('All')">
        All Batches <span class="badge-count">${students.length}</span>
    </button>`;
    sortedBatches.forEach(b => {
        const count = students.filter(s => s.batch === b).length;
        html += `<button class="dept-tab ${currentBatchFilter === b ? 'active' : ''}" data-batch="${b}" onclick="selectBatchTab('${b}')">
            ${b} <span class="badge-count">${count}</span>
        </button>`;
    });
    container.innerHTML = html;
}

function buildSectionTabs(students) {
    const container = $('section-tabs-container');
    if (!container) return;
    const tabCounts = {};
    students.forEach(s => {
        const tab = studentSectionTab(s);
        tabCounts[tab] = (tabCounts[tab] || 0) + 1;
    });
    const sortedTabs = Object.keys(tabCounts).sort();
    let html = `<button class="dept-tab ${currentSectionFilter === 'All' ? 'active' : ''}" data-dept="All" onclick="selectSectionTab('All')">
        All <span class="badge-count">${students.length}</span>
    </button>`;
    sortedTabs.forEach(tab => {
        html += `<button class="dept-tab ${currentSectionFilter === tab ? 'active' : ''}" data-dept="${tab}" onclick="selectSectionTab('${tab}')">
            ${tab} <span class="badge-count">${tabCounts[tab]}</span>
        </button>`;
    });
    container.innerHTML = html;
}

function selectBatchTab(batch) {
    currentBatchFilter = batch;
    currentSectionFilter = 'All';
    let filteredByBatch = allStudentsCache;
    if (currentBatchFilter !== 'All') {
        filteredByBatch = allStudentsCache.filter(s => s.batch === currentBatchFilter);
    }
    buildBatchTabs(allStudentsCache);
    buildSectionTabs(filteredByBatch);
    renderStudents();
}

function selectSectionTab(sec) {
    currentSectionFilter = sec;
    let filteredByBatch = allStudentsCache;
    if (currentBatchFilter !== 'All') {
        filteredByBatch = allStudentsCache.filter(s => s.batch === currentBatchFilter);
    }
    buildSectionTabs(filteredByBatch);
    renderStudents();
}

function filterStudentsSearch(query) {
    currentStudentSearch = (query || '').trim().toLowerCase();
    renderStudents();
}

function renderStudents() {
    const tbody = $('students-tbody');
    if (!tbody) return;

    let filtered = allStudentsCache;
    if (currentBatchFilter !== 'All') {
        filtered = filtered.filter(s => s.batch === currentBatchFilter);
    }
    if (currentSectionFilter !== 'All') {
        filtered = filtered.filter(s => studentSectionTab(s) === currentSectionFilter);
    }
    if (currentStudentSearch) {
        const q = currentStudentSearch.toLowerCase();
        filtered = filtered.filter(s =>
            (s.name || '').toLowerCase().includes(q) ||
            (s.reg_no || '').toLowerCase().includes(q) ||
            (s.department || '').toLowerCase().includes(q) ||
            (s.section || '').toLowerCase().includes(q) ||
            (s.batch || '').toLowerCase().includes(q)
        );
    }

    const countEl = $('students-showing-count');
    const totalWrap = $('students-total-count-wrap');
    const pill = $('students-count-display');
    const total = allStudentsCache.length;
    const showing = filtered.length;

    if (countEl) {
        if (countEl.innerText !== String(showing)) {
            countEl.classList.remove('bump');
            void countEl.offsetWidth;
            countEl.classList.add('bump');
        }
        countEl.innerText = showing;
    }
    if (totalWrap) {
        totalWrap.innerText = showing < total ? `of ${total}` : '';
    }
    if (pill) {
        if (showing < total) {
            pill.classList.add('is-filtered');
            pill.title = `Showing ${showing} filtered students out of ${total} total registered`;
        } else {
            pill.classList.remove('is-filtered');
            pill.title = `Total registered students: ${total}`;
        }
    }

    if (!filtered.length) {
        const reason = currentStudentSearch ? `matching “${currentStudentSearch}”` :
                       (currentSectionFilter !== 'All' ? 'for ' + currentSectionFilter : '') +
                       (currentBatchFilter !== 'All' ? ' in batch ' + currentBatchFilter : '');
        tbody.innerHTML = `<tr><td colspan="9" class="loading-cell">No students found ${reason}</td></tr>`;
        return;
    }

    const html = filtered.map((s, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td><strong>${escapeHtml(s.reg_no)}</strong></td>
            <td>${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.department)}</td>
            <td>${escapeHtml(s.programme || '—')}</td>
            <td>${escapeHtml(s.batch || '—')}</td>
            <td>${escapeHtml(s.section || '—')}</td>
            <td><code>${escapeHtml(s.email || (s.reg_no + '@ptuniv.edu.in'))}</code></td>
            <td>
                <div class="table-actions">
                    <button class="action-btn edit" onclick="editStudent('${escapeHtml(s.reg_no)}')" title="Edit Student">✏️</button>
                    <button class="action-btn delete admin-only" onclick="deleteStudent('${escapeHtml(s.reg_no)}')" title="Delete Student">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
    tbody.innerHTML = html;

    const isAdmin = (userRole || '').toLowerCase() === 'admin';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
}

async function loadStudents() {
    const tbody = $('students-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">Loading students…</td></tr>';
    try {
        const data = await authFetch('/students');
        allStudentsCache = data || [];
        buildBatchTabs(allStudentsCache);
        let filteredByBatch = allStudentsCache;
        if (currentBatchFilter !== 'All') {
            filteredByBatch = allStudentsCache.filter(s => s.batch === currentBatchFilter);
        }
        buildSectionTabs(filteredByBatch);
        renderStudents();
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="9" class="loading-cell" style="color:var(--danger)">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function showAddStudentForm() {
    editStudentId = null;
    editStudentRegNo = null;
    $('student-form')?.reset();
    $('student-edit-id').value = '';
    $('student-form-container').style.display = 'block';
    $('student-form-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAddStudentForm() {
    $('student-form-container').style.display = 'none';
    editStudentId = null;
    editStudentRegNo = null;
}

function editStudent(regNo) {
    const s = allStudentsCache.find(item => item.reg_no === regNo);
    if (!s) return;
    editStudentId = s.id;
    editStudentRegNo = s.reg_no;
    $('student-edit-id').value = s.id;
    $('student-regno').value = s.reg_no;
    $('student-name').value = s.name;
    $('student-dept').value = s.department;
    $('student-programme').value = s.programme || '';
    $('student-batch').value = s.batch || '';
    $('student-section').value = s.section || '';
    $('student-email').value = s.email || (s.reg_no + '@ptuniv.edu.in');
    $('student-repeater').checked = !!s.is_repeater;

    $('student-form-container').style.display = 'block';
    $('student-form-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function handleStudentSubmit(e) {
    e.preventDefault();
    const id = $('student-edit-id').value;
    const regNo = $('student-regno').value.trim();
    const payload = {
        reg_no: regNo,
        name: $('student-name').value.trim(),
        department: $('student-dept').value.trim(),
        programme: $('student-programme').value.trim() || 'Bachelor of Tech.',
        batch: $('student-batch').value.trim() || '2024-2028',
        section: $('student-section').value.trim() || 'A',
        is_repeater: $('student-repeater').checked
    };

    try {
        if (id || editStudentRegNo) {
            const targetReg = editStudentRegNo || regNo;
            await authFetch(`/students/by-reg/${encodeURIComponent(targetReg)}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showToast('Student updated successfully', 'success');
        } else {
            await authFetch('/students', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showToast('Student created successfully', 'success');
        }
        hideAddStudentForm();
        loadStudents();
        loadDashboardStats();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteStudent(regNo) {
    if (!confirm(`Are you sure you want to delete student (${regNo}) and all associated results?`)) return;
    try {
        await authFetch(`/students/by-reg/${encodeURIComponent(regNo)}`, { method: 'DELETE' });
        showToast('Student deleted', 'info');
        loadStudents();
        loadDashboardStats();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ─── 14. Subject Master ───────────────────────────────────────
function buildDeptTabs(subjects) {
    const container = $('dept-tabs-container');
    if (!container) return;
    const deptSet = new Set();
    subjects.forEach(s => {
        if (s.department && s.department.trim()) {
            deptSet.add(s.department.trim());
        }
    });
    const sortedDepts = Array.from(deptSet).sort();
    let html = `<button class="dept-tab ${currentDeptFilter === 'All' ? 'active' : ''}" data-dept="All" onclick="selectDeptTab('All')">
        All <span class="badge-count">${subjects.length}</span>
    </button>`;
    sortedDepts.forEach(dept => {
        const count = subjects.filter(s => s.department === dept).length;
        html += `<button class="dept-tab ${currentDeptFilter === dept ? 'active' : ''}" data-dept="${dept}" onclick="selectDeptTab('${dept}')">
            ${dept} <span class="badge-count">${count}</span>
        </button>`;
    });
    container.innerHTML = html;
}

function selectDeptTab(dept) {
    currentDeptFilter = dept;
    buildDeptTabs(allSubjectsCache);
    renderSubjects();
}

function filterSubjectsSearch(query) {
    currentSubjectSearch = (query || '').trim().toLowerCase();
    renderSubjects();
}

function renderSubjects() {
    const tbody = $('subjects-tbody');
    if (!tbody) return;

    let filtered = allSubjectsCache;
    if (currentDeptFilter !== 'All') {
        filtered = filtered.filter(s => s.department === currentDeptFilter);
    }
    if (currentSubjectSearch) {
        const q = currentSubjectSearch.toLowerCase();
        filtered = filtered.filter(s =>
            (s.code || '').toLowerCase().includes(q) ||
            (s.name || '').toLowerCase().includes(q) ||
            (s.department || '').toLowerCase().includes(q) ||
            (s.semester || '').toLowerCase().includes(q)
        );
    }

    const countEl = $('subjects-showing-count');
    const totalWrap = $('subjects-total-count-wrap');
    const pill = $('subjects-count-display');
    const total = allSubjectsCache.length;
    const showing = filtered.length;

    if (countEl) {
        if (countEl.innerText !== String(showing)) {
            countEl.classList.remove('bump');
            void countEl.offsetWidth;
            countEl.classList.add('bump');
        }
        countEl.innerText = showing;
    }
    if (totalWrap) {
        totalWrap.innerText = showing < total ? `of ${total}` : '';
    }
    if (pill) {
        if (showing < total) {
            pill.classList.add('is-filtered');
            pill.title = `Showing ${showing} filtered subjects out of ${total} total`;
        } else {
            pill.classList.remove('is-filtered');
            pill.title = `Total subjects in master curriculum: ${total}`;
        }
    }

    if (!filtered.length) {
        const reason = currentSubjectSearch ? `matching “${currentSubjectSearch}”` : (currentDeptFilter !== 'All' ? 'for ' + currentDeptFilter : '');
        tbody.innerHTML = `<tr><td colspan="7" class="loading-cell">No subjects found ${reason}</td></tr>`;
        return;
    }

    const html = filtered.map((s, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td><code><strong>${escapeHtml(s.code)}</strong></code></td>
            <td>${escapeHtml(s.name)}</td>
            <td>${s.credits}</td>
            <td>Semester ${escapeHtml(s.semester)}</td>
            <td>${escapeHtml(s.department || '—')}</td>
            <td>
                <div class="table-actions">
                    <button class="action-btn edit" onclick="editSubject(${s.id})" title="Edit Subject">✏️</button>
                    <button class="action-btn delete admin-only" onclick="deleteSubject(${s.id})" title="Delete Subject">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
    tbody.innerHTML = html;

    const isAdmin = (userRole || '').toLowerCase() === 'admin';
    document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
}

async function loadSubjects(dept = 'All') {
    currentDeptFilter = dept;
    const tbody = $('subjects-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading subjects…</td></tr>';
    try {
        const data = await authFetch('/subjects');
        allSubjectsCache = data;
        buildDeptTabs(data);
        renderSubjects();
    } catch (err) {
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" class="loading-cell" style="color:var(--danger)">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function showAddSubjectForm() {
    editSubjectId = null;
    $('subject-form')?.reset();
    $('subject-edit-id').value = '';
    $('subject-form-container').style.display = 'block';
    $('subject-form-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAddSubjectForm() {
    $('subject-form-container').style.display = 'none';
}

function editSubject(id) {
    const s = allSubjectsCache.find(item => item.id === id);
    if (!s) return;
    editSubjectId = s.id;
    $('subject-edit-id').value = s.id;
    $('subject-code').value = s.code;
    $('subject-name').value = s.name;
    $('subject-credits').value = s.credits;
    $('subject-semester').value = s.semester;
    $('subject-dept').value = s.department || '';

    $('subject-form-container').style.display = 'block';
    $('subject-form-container').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function handleSubjectSubmit(e) {
    e.preventDefault();
    const id = $('subject-edit-id').value;
    const payload = {
        code: $('subject-code').value.trim(),
        name: $('subject-name').value.trim(),
        credits: parseFloat($('subject-credits').value),
        semester: $('subject-semester').value.trim(),
        department: $('subject-dept').value.trim() || null
    };

    try {
        if (id) {
            await authFetch(`/subjects/${id}`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
            showToast('Subject updated successfully', 'success');
        } else {
            await authFetch('/subjects', {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            showToast('Subject added successfully', 'success');
        }
        hideAddSubjectForm();
        loadSubjects();
        loadDashboardStats();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteSubject(id) {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
        await authFetch(`/subjects/${id}`, { method: 'DELETE' });
        showToast('Subject deleted', 'info');
        loadSubjects();
        loadDashboardStats();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ─── 15. SGPA / CGPA Summary & Arrear Filter ──────────────────
async function populateGradeBatchDropdown() {
    const select = $('grade-filter-batch');
    if (!select) return;
    try {
        const batches = await authFetch('/students/batches');
        select.innerHTML = '<option value="">All</option>' + batches.map(b => `<option value="${b}">${b}</option>`).join('');
    } catch (e) {
        console.warn('Could not load batches for grade filter:', e);
    }
}

function toggleArrearDropdown(event) {
    if (event) event.stopPropagation();
    const menu = $('grade-filter-arrears-menu');
    if (menu) menu.classList.toggle('hidden');
}

function onArrearAllToggle(el) {
    const checkboxes = document.querySelectorAll('.arrear-opt');
    checkboxes.forEach(cb => cb.checked = false);
    currentArrearFilter = ['all'];
    updateArrearButtonLabel();
    loadGrades();
}

function onArrearOptionToggle(el) {
    const allCb = $('arrear-opt-all');
    const checkedOpts = Array.from(document.querySelectorAll('.arrear-opt:checked')).map(cb => cb.value);

    if (checkedOpts.length === 0) {
        if (allCb) allCb.checked = true;
        currentArrearFilter = ['all'];
    } else {
        if (allCb) allCb.checked = false;
        currentArrearFilter = checkedOpts;
    }
    updateArrearButtonLabel();
    loadGrades();
}

function updateArrearButtonLabel() {
    const label = $('grade-filter-arrears-label');
    if (!label) return;
    if (currentArrearFilter.includes('all') || currentArrearFilter.length === 0) {
        label.innerText = 'ALL';
    } else {
        label.innerText = currentArrearFilter.join(', ') + ' Arr';
    }
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    const wrap = $('grade-filter-arrears-wrap');
    const menu = $('grade-filter-arrears-menu');
    if (wrap && menu && !wrap.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

async function loadGrades() {
    const tbody = $('grades-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">Computing SGPA & CGPA…</td></tr>';

    try {
        const dept = $('grade-filter-dept')?.value || '';
        const sem  = $('grade-filter-sem')?.value || '';
        const batch = $('grade-filter-batch')?.value || '';
        const cgpaSort = $('grade-filter-sort')?.value || 'desc';
        const creditsSort = $('grade-filter-credits-sort')?.value || 'none';

        let url = '/grades/summary?';
        if (dept) url += `department=${encodeURIComponent(dept)}&`;
        if (sem)  url += `semester=${encodeURIComponent(sem)}&`;
        if (batch) url += `batch=${encodeURIComponent(batch)}&`;

        currentArrearFilter.forEach(a => {
            url += `arrears=${encodeURIComponent(a)}&`;
        });

        const data = await authFetch(url);

        // Sorting
        data.sort((a, b) => {
            // Sort by Total Credits if active
            if (creditsSort === 'asc') {
                const diff = (Number(a.total_credits) || 0) - (Number(b.total_credits) || 0);
                if (diff !== 0) return diff;
            } else if (creditsSort === 'desc') {
                const diff = (Number(b.total_credits) || 0) - (Number(a.total_credits) || 0);
                if (diff !== 0) return diff;
            }

            // Sort by CGPA/SGPA
            const valA = sem ? (a.sgpa ?? -1) : (a.cgpa ?? -1);
            const valB = sem ? (b.sgpa ?? -1) : (b.cgpa ?? -1);
            if (cgpaSort === 'asc') return valA - valB;
            if (cgpaSort === 'desc') return valB - valA;

            return 0;
        });

        allGradesCache = data;

        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">No students match current grade criteria.</td></tr>';
            return;
        }

        const html = data.map((g, idx) => {
            const arrCount = g.arrear_count || 0;
            const arrClass = arrCount === 0 ? 'arrear-0' : (arrCount === 1 ? 'arrear-1' : (arrCount === 2 ? 'arrear-2' : 'arrear-3'));
            const arrText = arrCount === 0 ? '0 Arrears' : `${arrCount} Arrear${arrCount > 1 ? 's' : ''}`;

            return `
                <tr>
                    <td>${idx + 1}</td>
                    <td><strong>${escapeHtml(g.reg_no)}</strong></td>
                    <td>${escapeHtml(g.name)}</td>
                    <td>${escapeHtml(g.department)}</td>
                    <td>${escapeHtml(g.semester || 'All')}</td>
                    <td><strong>${g.sgpa != null ? Number(g.sgpa).toFixed(2) : '—'}</strong></td>
                    <td><strong>${g.cgpa != null ? Number(g.cgpa).toFixed(2) : '—'}</strong></td>
                    <td>${g.total_credits}</td>
                    <td>${g.earned_credits}</td>
                    <td>
                        <span class="arrear-badge ${arrClass}">
                            <span class="arrear-dot"></span> ${arrText}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
        tbody.innerHTML = html;
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="10" class="loading-cell" style="color:var(--danger)">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function exportGradesToExcel() {
    if (!allGradesCache.length) {
        showToast('No grades to export', 'warning');
        return;
    }
    const exportData = allGradesCache.map((g, i) => ({
        'Rank': i + 1,
        'Reg No': g.reg_no,
        'Name': g.name,
        'Department': g.department,
        'Semester': g.semester,
        'SGPA': g.sgpa ?? '',
        'CGPA': g.cgpa ?? '',
        'Total Credits': g.total_credits,
        'Earned Credits': g.earned_credits,
        'Arrears': g.arrear_count || 0
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SGPA_CGPA_Summary');
    XLSX.writeFile(wb, `PTU_Grades_Summary_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast('Grades summary exported to Excel', 'success');
}

// ─── 16. Student Self-Service Report Card (OTP Flow) ──────────
function resetOtpState() {
    rcRegNo = '';
    rcEmail = '';
    rcAccessToken = '';
    stopResendCountdown();
    if ($('rc-otp-input')) $('rc-otp-input').value = '';
    if ($('rc-otp-msg')) $('rc-otp-msg').textContent = '';
}

function showRcLookupStep() {
    $('rc-step-otp')?.classList.add('hidden');
    $('rc-step-lookup')?.classList.remove('hidden');
}

function showRcOtpStep() {
    $('rc-step-lookup')?.classList.add('hidden');
    $('rc-step-otp')?.classList.remove('hidden');
    if ($('rc-otp-target-email')) {
        $('rc-otp-target-email').innerText = maskEmail(rcEmail);
    }
    const input = $('rc-otp-input');
    if (input) {
        input.value = '';
        input.focus();
    }
}

function maskEmail(email) {
    const [user, domain] = (email || '').split('@');
    if (!user || !domain) return email || '';
    const visible = user.slice(0, Math.min(2, user.length));
    return `${visible}${'*'.repeat(Math.max(user.length - visible.length, 1))}@${domain}`;
}

async function handleReportCardLookup(event) {
    if (event && event.preventDefault) event.preventDefault();
    const btn = $('rc-lookup-btn');
    const regNo = $('rc-reg-no')?.value?.trim();
    const email = $('rc-email')?.value?.trim();

    if (!regNo || !email) {
        showToast('Please enter both Register Number and Email', 'warning');
        return;
    }

    btn?.classList.add('loading');
    try {
        const res = await fetch(API_URL + '/report-card/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reg_no: regNo, email: email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Could not send OTP');

        rcRegNo = regNo;
        rcEmail = email;
        rcAccessToken = '';

        showToast(data.message || 'OTP sent to your registered email', 'success');
        showRcOtpStep();
        startResendCountdown(data.resend_after_seconds || 45);
    } catch (err) {
        showToast(err.message || 'Cannot connect to server', 'error');
    } finally {
        btn?.classList.remove('loading');
    }
}

async function handleOtpVerify(event) {
    if (event && event.preventDefault) event.preventDefault();
    const btn = $('rc-otp-verify-btn');
    const msg = $('rc-otp-msg');
    const otp = $('rc-otp-input')?.value?.trim();

    if (msg) {
        msg.textContent = '';
        msg.style.color = '';
    }

    if (!otp || !/^\d{6}$/.test(otp)) {
        if (msg) {
            msg.textContent = 'Please enter the valid 6-digit OTP sent to your email.';
            msg.style.color = 'var(--danger)';
        }
        return;
    }

    btn?.classList.add('loading');
    try {
        const verifyRes = await fetch(API_URL + '/report-card/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reg_no: rcRegNo, email: rcEmail, otp })
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.detail || 'Incorrect OTP code');

        rcAccessToken = verifyData.access_token;

        const rcRes = await fetch(API_URL + '/report-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reg_no: rcRegNo, email: rcEmail, access_token: rcAccessToken })
        });
        const rcData = await rcRes.json();
        if (!rcRes.ok) throw new Error(rcData.detail || 'Could not fetch report card');

        renderReportCard(rcData);
        stopResendCountdown();

        $('rc-step-otp')?.classList.add('hidden');
        $('rc-step-lookup')?.classList.add('hidden');
        $('report-card-output')?.classList.remove('hidden');

        showToast('OTP verified successfully!', 'success');
    } catch (err) {
        if (msg) {
            msg.textContent = err.message || 'Verification failed';
            msg.style.color = 'var(--danger)';
        }
        showToast(err.message || 'Verification failed', 'error');
    } finally {
        btn?.classList.remove('loading');
    }
}

async function handleResendOtp() {
    const resendLink = $('rc-otp-resend');
    if (!rcRegNo || !rcEmail || resendLink?.classList.contains('disabled')) return;

    try {
        const res = await fetch(API_URL + '/report-card/request-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reg_no: rcRegNo, email: rcEmail })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Could not resend OTP');
        showToast('A fresh OTP has been sent to your email', 'success');
        startResendCountdown(data.resend_after_seconds || 45);
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function startResendCountdown(seconds) {
    const resendLink = $('rc-otp-resend');
    if (!resendLink) return;
    stopResendCountdown();
    let remaining = seconds;
    resendLink.classList.add('disabled');
    resendLink.innerText = `Resend OTP in ${remaining}s`;
    rcResendTimerId = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
            stopResendCountdown();
            return;
        }
        resendLink.innerText = `Resend OTP in ${remaining}s`;
    }, 1000);
}

function stopResendCountdown() {
    const resendLink = $('rc-otp-resend');
    if (rcResendTimerId) {
        clearInterval(rcResendTimerId);
        rcResendTimerId = null;
    }
    if (resendLink) {
        resendLink.classList.remove('disabled');
        resendLink.innerText = 'Resend OTP';
    }
}

function renderReportCard(data, targetId = 'report-card-paper') {
    const paper = $(targetId) || $('report-card-paper');
    if (!paper) return;

    // Cache active report card data globally for export
    window.activeReportCardData = data;

    const cgpa = data.cgpa != null ? Number(data.cgpa) : null;
    const cgpaStr = cgpa != null ? cgpa.toFixed(2) : '—';
    const cgpaPercent = cgpa != null ? (cgpa * 10).toFixed(2) + '%' : '—';
    const totalCr = Number(data.total_credits || 0);
    const earnedCr = Number(data.earned_credits || 0);
    const pendingCr = totalCr - earnedCr;

    // Formatted issue date for official academic record
    const issueDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

    // Semesters Breakdown
    const semestersHtml = (data.semesters || []).map(sem => {
        const rows = (sem.subjects || []).map((s, i) => {
            const cleanGrade = (s.grade || '').trim();
            const gradeClass = 'grade-' + cleanGrade.replace('+', 'p');
            const isFail = cleanGrade.toUpperCase() === 'F' || cleanGrade.toUpperCase() === 'AB';

            return `
                <tr class="${isFail ? 'rc-row-fail' : ''}">
                    <td class="rc-cell-idx">${i + 1}</td>
                    <td class="rc-cell-code"><code>${escapeHtml(s.code)}</code></td>
                    <td class="rc-cell-name">${escapeHtml(s.name)}</td>
                    <td class="rc-cell-credits">${s.credits}</td>
                    <td class="rc-cell-grade"><span class="grade-chip ${gradeClass}">${escapeHtml(cleanGrade || '—')}</span></td>
                </tr>
            `;
        }).join('');

        const sgpaStr = sem.sgpa != null ? Number(sem.sgpa).toFixed(2) : '—';
        const semTotalCr = sem.total_credits != null ? sem.total_credits : 0;
        const semEarnedCr = sem.earned_credits != null ? sem.earned_credits : 0;

        return `
            <div class="rc-semester-section">
                <div class="rc-semester-topbar">
                    <div class="rc-semester-title">SEMESTER ${escapeHtml(sem.semester)}</div>
                </div>
                <div class="rc-table-card">
                    <table class="rc-pdf-table">
                        <thead>
                            <tr>
                                <th class="rc-th-idx">#</th>
                                <th class="rc-th-code">COURSE CODE</th>
                                <th class="rc-th-title">COURSE TITLE</th>
                                <th class="rc-th-cr">CREDITS</th>
                                <th class="rc-th-gr">GRADE</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                </div>
                <div class="rc-semester-footbar">
                    <span class="rc-foot-item">Total Credits: <strong>${semTotalCr}</strong></span>
                    <span class="rc-foot-item">Earned Credits: <strong>${semEarnedCr}</strong></span>
                    <span class="rc-sgpa-pill">SGPA: <strong>${sgpaStr}</strong></span>
                </div>
            </div>
        `;
    }).join('');

    paper.innerHTML = `
        <!-- Document Title Header -->
        <div class="rc-pdf-header">
            <div class="rc-pdf-header-top">
                <div class="rc-pdf-emblem" aria-hidden="true">
                    <svg width="46" height="46" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect width="48" height="48" rx="12" fill="url(#rcEmblemBg)" />
                        <path d="M24 10L38 18L24 26L10 18L24 10Z" fill="#ffffff" />
                        <path d="M15 21.5V29C15 33.5 19 37 24 37C29 37 33 33.5 33 29V21.5L24 26.5L15 21.5Z" fill="#ffffff" fill-opacity="0.92" />
                        <path d="M38 18V28" stroke="#ffffff" stroke-width="2" stroke-linecap="round" />
                        <circle cx="38" cy="29" r="1.5" fill="#ffffff" />
                        <defs>
                            <linearGradient id="rcEmblemBg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                                <stop stop-color="#DC2626" />
                                <stop offset="0.5" stop-color="#7C3AED" />
                                <stop offset="1" stop-color="#2563EB" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <div class="rc-pdf-uni-block">
                    <h1 class="rc-pdf-uni-title">Puducherry Technological University</h1>
                    <div class="rc-pdf-doc-sub">OFFICIAL GRADE TRANSCRIPT &amp; CUMULATIVE PERFORMANCE</div>
                </div>
            </div>
        </div>

        <!-- Student Info Card -->
        <div class="rc-pdf-student-card">
            <div class="rc-student-grid">
                <div class="rc-info-line">
                    <span class="rc-info-lbl">REGISTER NO</span>
                    <span class="rc-info-val rc-val-mono rc-val-highlight">${escapeHtml(data.reg_no)}</span>
                </div>
                <div class="rc-info-line">
                    <span class="rc-info-lbl">PROGRAMME</span>
                    <span class="rc-info-val">${escapeHtml(data.programme || 'Bachelor of Technology (B.Tech)')}</span>
                </div>
                <div class="rc-info-line">
                    <span class="rc-info-lbl">STUDENT NAME</span>
                    <span class="rc-info-val rc-val-bold">${escapeHtml(data.name)}</span>
                </div>
                <div class="rc-info-line">
                    <span class="rc-info-lbl">ACADEMIC BATCH</span>
                    <span class="rc-info-val">${escapeHtml(data.batch || '—')}</span>
                </div>
                <div class="rc-info-line">
                    <span class="rc-info-lbl">DEPARTMENT</span>
                    <span class="rc-info-val">${escapeHtml(data.department || '—')}</span>
                </div>
                <div class="rc-info-line">
                    <span class="rc-info-lbl">SECTION</span>
                    <span class="rc-info-val">${escapeHtml(data.section || '—')}</span>
                </div>
            </div>
        </div>

        <!-- Semesters List -->
        <div class="rc-pdf-semesters-list">
            ${semestersHtml}
        </div>

        <!-- Cumulative CGPA Summary Card -->
        <div class="rc-pdf-cgpa-card">
            <div class="rc-cgpa-card-left">
                <div class="rc-cgpa-card-title">CUMULATIVE CGPA</div>
                <div class="rc-cgpa-card-score">${cgpaStr}</div>
            </div>
            <div class="rc-cgpa-card-right">
                <div class="rc-cgpa-stat-row">
                    <span class="rc-cgpa-stat-lbl">CGPA Percentage:</span>
                    <strong class="rc-cgpa-stat-val rc-val-percent">${cgpaPercent}</strong>
                </div>
                <div class="rc-cgpa-stat-row">
                    <span class="rc-cgpa-stat-lbl">Total Registered Credits:</span>
                    <strong class="rc-cgpa-stat-val">${totalCr}</strong>
                </div>
                <div class="rc-cgpa-stat-row">
                    <span class="rc-cgpa-stat-lbl">Total Earned Credits:</span>
                    <strong class="rc-cgpa-stat-val rc-val-earned">${earnedCr}</strong>
                    ${pendingCr <= 0 ? '<span class="rc-status-chip cleared">✓ All Cleared</span>' : `<span class="rc-status-chip pending">⚠️ ${pendingCr.toFixed(1)} Pending</span>`}
                </div>
            </div>
        </div>
    `;
}

function exportReportCardPDF() {
    const html = document.documentElement;
    const originalTheme = html.getAttribute('data-theme') || 'light';
    const originalTitle = document.title;

    // Set student-specific filename for browser "Save as PDF" dialog
    const rcData = window.activeReportCardData;
    if (rcData && rcData.reg_no) {
        const cleanName = (rcData.name || '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').trim();
        document.title = `PTU_ReportCard_${rcData.reg_no}${cleanName ? '_' + cleanName : ''}`;
    } else {
        document.title = 'PTU_Official_Grade_Transcript';
    }

    // Always guarantee Light Mode for export
    html.setAttribute('data-theme', 'light');
    document.body.classList.add('is-printing-report-card');

    let restored = false;
    const restoreTheme = () => {
        if (restored) return;
        restored = true;
        document.body.classList.remove('is-printing-report-card');
        html.setAttribute('data-theme', originalTheme);
        document.title = originalTitle;
        window.removeEventListener('afterprint', restoreTheme);
        window.removeEventListener('focus', onFocusRestore);
    };

    const onFocusRestore = () => {
        // Small delay to allow print spooler / save dialog to complete cleanly
        setTimeout(restoreTheme, 800);
    };

    window.addEventListener('afterprint', restoreTheme);
    window.addEventListener('focus', onFocusRestore);

    // Safety fallback timer (60s) so user has plenty of time in print preview without theme jumping
    setTimeout(restoreTheme, 60000);

    window.print();
}

// ============================================================
// [TESTING ONLY] DIRECT REPORT CARD GENERATOR (START)
// To remove: delete this entire block.
// ============================================================
async function handleAdminDirectReportCard(event) {
    if (event && event.preventDefault) event.preventDefault();
    const btn = $('admin-rc-btn');
    const msgEl = $('admin-rc-msg');
    const regNoInput = $('admin-rc-regno');
    const regNo = regNoInput?.value?.trim();

    if (msgEl) {
        msgEl.style.display = 'none';
        msgEl.textContent = '';
        msgEl.className = 'testing-rc-msg';
    }

    if (!regNo) {
        showToast('Please enter a Student Register Number', 'warning');
        if (regNoInput) regNoInput.focus();
        return;
    }

    btn?.classList.add('loading');
    try {
        const rcData = await authFetch(`/admin/report-card/${encodeURIComponent(regNo)}`);
        
        // Render into the admin report card container
        renderReportCard(rcData, 'admin-report-card-paper');
        
        // Open the admin report card modal
        const modal = $('admin-rc-modal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
        showToast(`Report card loaded for ${rcData.name} (${rcData.reg_no})`, 'success');
    } catch (err) {
        const message = err.message || 'Failed to generate report card';
        if (msgEl) {
            msgEl.textContent = '❌ ' + message;
            msgEl.style.display = 'block';
            msgEl.className = 'testing-rc-msg error';
        }
        showToast(message, 'error');
    } finally {
        btn?.classList.remove('loading');
    }
}

function closeAdminRcModal() {
    const modal = $('admin-rc-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function exportAdminReportCardPDF() {
    exportReportCardPDF();
}
// ============================================================
// [TESTING ONLY] DIRECT REPORT CARD GENERATOR (END)
// ============================================================

// ============================================================
// RESOURCES MANAGEMENT (Admin Personnel Directory)
// ============================================================
let allResourcesCache = [];

async function loadResources() {
    const tbody = $('resources-tbody');
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="loading-cell">Loading resources…</td></tr>';
    try {
        const data = await authFetch('/resources/');
        allResourcesCache = data || [];
        renderResourcesTable(allResourcesCache);
    } catch (err) {
        showToast('Failed to load resources: ' + err.message, 'error');
        if (tbody) tbody.innerHTML = `<tr><td colspan="6" class="empty-cell" style="color:var(--red);">Error loading resources: ${escapeHtml(err.message)}</td></tr>`;
    }
}

function renderResourcesTable(resources) {
    const tbody = $('resources-tbody');
    if (!tbody) return;

    if (!resources || resources.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">No resources found matching the criteria.</td></tr>';
        updateResourcesCount(0, allResourcesCache.length);
        return;
    }

    const isAdmin = (userRole || '').toLowerCase() === 'admin';

    tbody.innerHTML = resources.map((r, idx) => {
        const accType = r.account_type || 'Faculty';
        const typeClass = 'badge-' + accType.toLowerCase().replace(/\s+/g, '-');
        const statusBadge = r.has_account
            ? '<span class="badge badge-active" title="Registered User Account Active">✓ Registered</span>'
            : '<span class="badge badge-pending" title="Pre-registered. Waiting for user signup.">⏳ Pending Signup</span>';

        const actions = isAdmin ? `
            <div class="table-actions" style="justify-content:center;">
              <button class="action-btn edit" onclick="editResource(${r.id})" title="Edit Resource">✏️</button>
              <button class="action-btn delete" onclick="deleteResource(${r.id}, '${escapeHtml(r.name)}')" title="Delete Resource">🗑️</button>
            </div>
        ` : '—';

        return `
            <tr>
              <td>${idx + 1}</td>
              <td style="font-weight:600; color:var(--text-primary);">${escapeHtml(r.name)}</td>
              <td><code>${escapeHtml(r.email)}</code></td>
              <td><span class="badge ${typeClass}">${escapeHtml(accType)}</span></td>
              <td>${statusBadge}</td>
              <td class="admin-only" style="text-align:center;">${actions}</td>
            </tr>
        `;
    }).join('');

    updateResourcesCount(resources.length, allResourcesCache.length);

    // Sync admin-only visibility
    document.querySelectorAll('#resources-table .admin-only').forEach(el => el.style.display = isAdmin ? '' : 'none');
}

function updateResourcesCount(showing, total) {
    if ($('resources-showing-count')) $('resources-showing-count').innerText = showing;
    const wrap = $('resources-total-count-wrap');
    if (wrap) {
        wrap.innerText = showing !== total ? ` of ${total}` : '';
    }
}

function filterResourcesSearch() {
    const q = ($('resources-search-input')?.value || '').trim().toLowerCase();
    const type = $('resources-type-filter')?.value || '';

    const filtered = allResourcesCache.filter(r => {
        const matchesQuery = !q || (r.name && r.name.toLowerCase().includes(q)) || (r.email && r.email.toLowerCase().includes(q));
        const matchesType = !type || (r.account_type && r.account_type.toLowerCase() === type.toLowerCase());
        return matchesQuery && matchesType;
    });

    renderResourcesTable(filtered);
}

async function populateAccountTypeOptions(isEdit = false, editingResource = null) {
    const select = $('resource-account-type');
    if (!select) return;

    let currentRole = (userRole || '').trim();
    let allowed = [];

    // Query backend to get current user's allowed creation types directly from DB
    try {
        const res = await authFetch('/auth/allowed-types');
        if (res && res.allowed && res.allowed.length) {
            allowed = res.allowed;
        }
    } catch (_) {}

    if (!allowed.length) {
        if (currentRole.toLowerCase() === 'admin') {
            allowed = ['Admin', 'TNP', 'Faculty', 'Exam Wing'];
        } else if (currentRole) {
            allowed = [currentRole];
        } else {
            allowed = ['Admin', 'TNP', 'Faculty', 'Exam Wing'];
        }
    }

    const isAdmin = (userRole || '').toLowerCase() === 'admin' || allowed.includes('Admin');

    select.innerHTML = '';
    if (isEdit && editingResource) {
        // "1) An admin can only create new accounts and cannot change his/her account type to anything else,
        //     so remove admin choice in the change account type."
        const isEditingSelf = (editingResource.name && editingResource.name.toLowerCase() === (currentUsername || '').toLowerCase()) ||
                              (editingResource.email && editingResource.email.toLowerCase() === (currentUsername || '').toLowerCase()) ||
                              (editingResource.account_type === 'Admin');

        if (isEditingSelf && isAdmin) {
            // Admin cannot change own account type
            select.innerHTML = `<option value="Admin" selected>Admin (Locked)</option>`;
            select.disabled = true;
        } else {
            // "remove admin choice in the change account type"
            select.disabled = false;
            const changeTypes = ['TNP', 'Faculty', 'Exam Wing'];
            select.innerHTML = changeTypes.map(t =>
                `<option value="${t}" ${t.toLowerCase() === (editingResource.account_type || '').toLowerCase() ? 'selected' : ''}>${t}</option>`
            ).join('');
        }
    } else {
        // Create mode
        select.disabled = false;
        if (isAdmin) {
            // Admin can create accounts of all types
            select.innerHTML = `
                <option value="" disabled selected>— Select Account Type —</option>
                <option value="Admin">Admin</option>
                <option value="TNP">TNP</option>
                <option value="Faculty">Faculty</option>
                <option value="Exam Wing">Exam Wing</option>
            `;
        } else {
            // "2) Other users can only create new account of their type only that is A faculty can only create faculty account."
            const types = allowed.length ? allowed : [currentRole || 'Faculty'];
            select.innerHTML = types.map(t =>
                `<option value="${escapeHtml(t)}" selected>${escapeHtml(t)}</option>`
            ).join('');
        }
    }
}

function showAddResourceForm() {
    const container = $('resource-form-container');
    if (!container) return;
    $('resource-edit-id').value = '';
    $('resource-name').value = '';
    $('resource-email').value = '';
    populateAccountTypeOptions(false);
    $('resource-submit-btn').innerText = 'Save Resource';
    container.style.display = 'block';
    $('resource-name').focus();
    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideAddResourceForm() {
    const container = $('resource-form-container');
    if (container) container.style.display = 'none';
    $('resource-edit-id').value = '';
    if ($('resource-account-type')) $('resource-account-type').disabled = false;
}

async function handleResourceSubmit(e) {
    e.preventDefault();
    const id = $('resource-edit-id').value;
    const name = $('resource-name').value.trim();
    const email = $('resource-email').value.trim();
    const account_type = $('resource-account-type').value || (id ? 'Admin' : '');

    if (!name || !email || !account_type) {
        showToast('Please fill in Name, Email address, and Account type', 'warning');
        return;
    }

    const btn = $('resource-submit-btn');
    btn.disabled = true;
    try {
        if (id) {
            // Update
            await authFetch(`/resources/${id}`, {
                method: 'PUT',
                body: JSON.stringify({ name, email, account_type })
            });
            showToast(`Resource '${name}' updated successfully!`, 'success');
        } else {
            // Create
            await authFetch('/resources/', {
                method: 'POST',
                body: JSON.stringify({ name, email, account_type })
            });
            showToast(`Resource '${name}' added to directory!`, 'success');
        }
        hideAddResourceForm();
        loadResources();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
}

function editResource(id) {
    const res = allResourcesCache.find(r => r.id === id);
    if (!res) return;

    $('resource-edit-id').value = res.id;
    $('resource-name').value = res.name;
    $('resource-email').value = res.email;
    populateAccountTypeOptions(true, res);
    $('resource-submit-btn').innerText = 'Update Resource';

    const container = $('resource-form-container');
    if (container) {
        container.style.display = 'block';
        container.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

async function deleteResource(id, name) {
    if (!confirm(`Are you sure you want to remove resource '${name}'? Any associated portal access will also be revoked.`)) {
        return;
    }

    try {
        await authFetch(`/resources/${id}`, { method: 'DELETE' });
        showToast(`Resource '${name}' deleted successfully.`, 'info');
        loadResources();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// ─── 17. Lifecycle & Event Binding ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initParticleCanvas();
    loadPublicStats();
    evaluateSessionState();

    // Bind OTP step listeners
    $('rc-lookup-btn')?.addEventListener('click', handleReportCardLookup);
    $('rc-lookup-form')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleReportCardLookup(e);
        }
    });

    $('rc-otp-verify-btn')?.addEventListener('click', handleOtpVerify);
    $('rc-otp-form')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleOtpVerify(e);
        }
    });

    // Auto-fill and allow editing of email in Student Portal
    const rcRegInput = $('rc-reg-no');
    const rcEmailInput = $('rc-email');
    let lastAutoFilledReg = '';
    let rcEmailManuallyEdited = false;

    rcEmailInput?.addEventListener('input', () => {
        rcEmailManuallyEdited = true;
    });

    rcRegInput?.addEventListener('input', async function() {
        const reg = this.value.trim();
        if (reg.length === 10) {
            // Auto-fill default format immediately
            if (!rcEmailManuallyEdited || lastAutoFilledReg !== reg) {
                if (rcEmailInput) {
                    rcEmailInput.value = `${reg}@ptuniv.edu.in`;
                }
                lastAutoFilledReg = reg;
                rcEmailManuallyEdited = false;
            }
            // Check server for existing registered custom email
            try {
                const res = await fetch(`${API_URL}/report-card/lookup-email/${encodeURIComponent(reg)}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data && data.email && rcRegInput.value.trim() === reg && !rcEmailManuallyEdited) {
                        if (rcEmailInput) {
                            rcEmailInput.value = data.email;
                        }
                    }
                }
            } catch (_) {
                // Keep default auto-fill
            }
        } else if (reg.length === 0) {
            if (rcEmailInput && !rcEmailManuallyEdited) {
                rcEmailInput.value = '';
            }
            lastAutoFilledReg = '';
        }
    });

    // Auto-generate email in Student Add Form
    $('student-regno')?.addEventListener('input', function() {
        const reg = this.value.trim();
        const emailField = $('student-email');
        if (emailField) emailField.value = reg ? reg + '@ptuniv.edu.in' : '';
    });

    // Keyboard shortcut for theme toggle: Alt + T
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 't') {
            e.preventDefault();
            toggleTheme();
        }
        // [TESTING ONLY] Escape closes admin report card modal
        if (e.key === 'Escape') {
            closeAdminRcModal();
        }
    });
});