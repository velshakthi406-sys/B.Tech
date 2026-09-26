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
let currentView = 'resources';

// Active navigation view state
let _activePublicView = 'home'; // 'home' | 'auth' | 'report-card'

// Inline editing IDs
let editStudentId = null;
let editStudentRegNo = null;
let editSubjectId = null;
let editResultId = null;
let editResultBatch = '';

// Caches with expiration timestamps for performance optimization
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let allStudentsCache = [];
let allStudentsCacheTime = 0;
let allSubjectsCache = [];
let allSubjectsCacheTime = 0;
let allResultsCache = [];
let allResultsCacheTime = 0;
let allGradesCache = [];
let allGradesCacheTime = 0;

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
let fGradesFilterActive = false;

// Grades/SGPA-CGPA Filter State
let currentGradeBatchFilter = 'All';
let currentGradeDeptFilter = 'All';

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
    
    // Disable transitions temporarily for instant theme switch
    const style = document.createElement('style');
    style.textContent = '*, *::before, *::after { transition: none !important; }';
    document.head.appendChild(style);
    
    // Force a reflow to apply the no-transition style
    document.documentElement.offsetHeight;
    
    // Apply theme
    document.documentElement.setAttribute('data-theme', valid);
    document.documentElement.style.colorScheme = valid;
    localStorage.setItem('ptu_theme', valid);
    localStorage.setItem('theme', valid);

    // Sync animated theme toggle checkbox
    const checkbox = document.getElementById('theme-toggle-checkbox');
    if (checkbox) {
        checkbox.checked = (valid === 'dark');
    }

    // Sync public navbar segmented switch (if it exists on other pages)
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
    
    // Remove the no-transition style and restore smooth transitions
    requestAnimationFrame(() => {
        document.head.removeChild(style);
    });

    if (notify) {
        showToast(`Theme changed to ${valid === 'dark' ? 'Dark Mode' : 'Light Mode'}`, 'info', 2000);
    }
}

function toggleTheme(event) {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    
    // Create ripple effect from toggle button position
    if (event && event.target) {
        createThemeRipple(event);
    }
    
    // Add transitioning class to body for smooth animations
    document.body.classList.add('theme-transitioning');
    
    // Set the new theme
    setTheme(next, false);
    
    // Remove transitioning class after animation completes
    setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
    }, 600);
}

// Create ripple effect for theme transition
function createThemeRipple(event) {
    // Get click position
    let x, y;
    if (event.clientX && event.clientY) {
        x = event.clientX;
        y = event.clientY;
    } else {
        // If no event coordinates, use button position
        const btn = event.target.closest('.theme-toggle');
        if (btn) {
            const rect = btn.getBoundingClientRect();
            x = rect.left + rect.width / 2;
            y = rect.top + rect.height / 2;
        } else {
            // Fallback to center
            x = window.innerWidth / 2;
            y = window.innerHeight / 2;
        }
    }
    
    // Create ripple element
    const ripple = document.createElement('div');
    ripple.className = 'theme-transition-ripple';
    ripple.style.width = '100px';
    ripple.style.height = '100px';
    ripple.style.left = (x - 50) + 'px';
    ripple.style.top = (y - 50) + 'px';
    
    // Add to body
    document.body.appendChild(ripple);
    
    // Remove after animation
    setTimeout(() => {
        if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
        }
    }, 800);
}

// ─── Animated Theme Toggle Handler ────────────────────────
function toggleThemeAnimated() {
    const checkbox = document.getElementById('theme-toggle-checkbox');
    if (!checkbox) return;
    
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    
    // DON'T disable transitions - let the animated toggle play smoothly
    // Apply theme change directly without setTheme() to preserve animations
    document.documentElement.setAttribute('data-theme', next);
    document.documentElement.style.colorScheme = next;
    localStorage.setItem('ptu_theme', next);
    localStorage.setItem('theme', next);
    
    // Sync other theme toggles if they exist
    const dashToggle = document.getElementById('theme-toggle');
    if (dashToggle) {
        dashToggle.setAttribute('title', `Switch to ${next === 'dark' ? 'Light' : 'Dark'} Mode (Alt + T)`);
    }
}

// Sync checkbox state with current theme on page load
function syncThemeCheckbox() {
    const checkbox = document.getElementById('theme-toggle-checkbox');
    if (!checkbox) return;
    
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    // Checkbox checked = dark mode, unchecked = light mode
    checkbox.checked = (currentTheme === 'dark');
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
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha * 0.35})`;
            ctx.fill();
        }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(new Particle());
    }

    function animate() {
        ctx.clearRect(0, 0, W, H);

        for (let i = 0; i < particles.length; i++) {
            particles[i].update();
            particles[i].draw();

            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 130) {
                    const lineAlpha = (1 - dist / 130) * 0.08;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
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

    initLoginRoleSelector();
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

// ── Role Selector Helpers (Management Portal Login) ──
function selectLoginRole(role) {
    const select = $('auth-account-type');
    if (select) {
        select.value = role;
    }
    syncLoginRolePills(role);
    $('auth-username')?.focus();
}

function onLoginRoleDropdownChange(role) {
    syncLoginRolePills(role);
}

function syncLoginRolePills(selectedRole) {
    document.querySelectorAll('.role-pill-btn').forEach(btn => {
        const isMatch = btn.getAttribute('data-role') === selectedRole;
        btn.classList.toggle('active', isMatch);
        btn.setAttribute('aria-pressed', isMatch ? 'true' : 'false');
    });
}

function initLoginRoleSelector() {
    const saved = localStorage.getItem('last_account_type');
    if (saved) {
        const select = $('auth-account-type');
        if (select) {
            select.value = saved;
            syncLoginRolePills(saved);
        }
    }
}

async function handleLoginSubmit(e) {
    e.preventDefault();
    const btn = $('auth-submit-btn');
    const username = $('auth-username').value.trim();
    const password = $('auth-password').value;
    const accountType = $('auth-account-type')?.value || '';

    if (!accountType) {
        showToast('Please select your Account Type', 'warning');
        const pills = $('auth-role-pills');
        if (pills) {
            pills.classList.remove('shake');
            void pills.offsetWidth;
            pills.classList.add('shake');
            setTimeout(() => pills.classList.remove('shake'), 450);
        }
        return;
    }

    if (!username || !password) {
        showToast('Please enter both username and password', 'warning');
        return;
    }

    btn.classList.add('loading');
    const formData = new URLSearchParams({
        username,
        password,
        account_type: accountType
    });
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
        localStorage.setItem('last_account_type', accountType);
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
        if ($('otp-verify-hint')) $('otp-verify-hint').innerText = `A 6-character OTP (numbers & letters) has been sent to ${email}. Valid for 10 minutes.`;
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
    if (e && e.preventDefault) e.preventDefault();
    const btn = $('otp-verify-btn');
    const otp = ($('otp-code-input')?.value || '').replace(/\s+/g, '').trim();

    if (!otp || otp.length !== 6 || !/^[0-9A-Za-z]{6}$/.test(otp)) {
        showToast('Please enter the valid 6-character OTP code', 'warning');
        return;
    }

    btn?.classList.add('loading');
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
        btn?.classList.remove('loading');
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
        let loginIdentifier = authFlow.email;
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
            loginIdentifier = data.username || authFlow.name || authFlow.email;
            showToast(`Registration complete! Your username is "${loginIdentifier}". Please sign in.`, 'success');
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
            if (data.username) loginIdentifier = data.username;
            showToast(`Password reset successfully! Please sign in with your username "${loginIdentifier}".`, 'success');
        }

        // Reset flow back to login
        showAuthStep('login');
        if ($('auth-username')) $('auth-username').value = loginIdentifier;
        if ($('auth-password')) $('auth-password').value = '';
        $('auth-password')?.focus();
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
        const isDeveloper = roleNormalized === 'developer';
        document.querySelectorAll('.developer-only').forEach(el => el.style.display = isDeveloper ? '' : 'none');

        // Apply role-based nav immediately from cached role (smooth UX)
        applyRoleBasedNavigation(userRole);

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
                const isRealDeveloper = (userRole || '').toLowerCase() === 'developer';
                document.querySelectorAll('.developer-only').forEach(el => el.style.display = isRealDeveloper ? '' : 'none');
                // Re-apply nav with authoritative server role
                applyRoleBasedNavigation(userRole);
            }
        }).catch(() => {});

        loadDashboardStats();
        switchView(currentView || 'resources');
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

// ─── 10. Role-Based Navigation ────────────────────────────────
/**
 * Hide/show nav items and privileged sections based on the logged-in role.
 * Call this every time the role is known (initial load + after /auth/me refresh).
 *
 * Rules:
 *  Faculty   → hide Upload Data, SGPA/CGPA
 *  TNP       → hide Upload Data
 *  Exam Wing → hide SGPA/CGPA; can delete batches (along with Developer)
 *  Developer     → sees everything (including direct report card generator)
 */
function applyRoleBasedNavigation(role) {
    const r = (role || '').trim().toLowerCase();
    const isDeveloper    = r === 'developer';
    const isExamWing = r === 'exam wing';
    const isFaculty  = r === 'faculty';
    const isTNP      = r === 'tnp';

    // Views that should be hidden per role
    const hiddenViews = new Set();
    if (isFaculty)  { hiddenViews.add('upload'); hiddenViews.add('grades'); }
    if (isTNP)      { hiddenViews.add('upload'); hiddenViews.add('classreport'); }
    if (isExamWing) { hiddenViews.add('grades'); hiddenViews.add('classreport'); }

    // Show/hide nav buttons
    document.querySelectorAll('.nav-item').forEach(btn => {
        const onclick = btn.getAttribute('onclick') || '';
        const match = onclick.match(/switchView\('([^']+)'\)/);
        if (match) {
            const viewName = match[1];
            btn.style.display = hiddenViews.has(viewName) ? 'none' : '';
        }
    });

    // Purge-batch section: Developer + Exam Wing only
    const purgeSection = $('developer-purge-batch-section');
    if (purgeSection) {
        purgeSection.style.display = (isDeveloper || isExamWing) ? '' : 'none';
    }

    // Direct report card generator: Developer only
    const rcSection = $('developer-direct-rc-section');
    if (rcSection) {
        rcSection.style.display = isDeveloper ? '' : 'none';
    }

    // Upload Resources (Staff Directory): Developer only
    const uploadResourcesSection = $('developer-upload-resources-section');
    if (uploadResourcesSection) {
        uploadResourcesSection.style.display = isDeveloper ? '' : 'none';
    }

    // If currently on a hidden view, redirect to resources
    if (hiddenViews.has(currentView)) {
        switchView('resources');
    }
}

// ─── 11. Dashboard & View Switching ───────────────────────────
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
        classreport: 'Class Report',
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
    if (view === 'results') {
        buildResultsBatchTabs();
        loadResults();
        populateDeptFilters();
    }
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
        buildGradeBatchTabs();
        buildGradeDeptTabs();
        loadGrades();
    }
    if (view === 'classreport') {
        buildCrBatchTabs();
        buildCrDeptTabs();
        loadClassReport();
    }
    if (view === 'upload') {
        initUploadDropzones();
        populateBatchDropdown();
    }
    if (view === 'dashboard') {
        initUploadDropzones();  // re-bind developer resources dropzone that was hidden at init
    }
}

function toggleSidebarView() {
    const sidebar = $('main-sidebar');
    const layout = $('dashboard-section');
    if (sidebar) sidebar.classList.toggle('collapsed');
    if (layout) layout.classList.toggle('sidebar-collapsed');
}

// ─── Mobile Sidebar Drawer ─────────────────────────────────────
function isMobileViewport() {
    return window.innerWidth <= 768;
}

function toggleSidebarOrDrawer() {
    if (isMobileViewport()) {
        const sidebar = $('main-sidebar');
        if (sidebar && sidebar.classList.contains('mobile-open')) {
            closeMobileSidebar();
        } else {
            openMobileSidebar();
        }
    } else {
        toggleSidebarView();
    }
}

function openMobileSidebar() {
    const sidebar = $('main-sidebar');
    const overlay = $('sidebar-overlay');
    if (sidebar) sidebar.classList.add('mobile-open');
    if (overlay) overlay.classList.add('active');
    document.body.classList.add('sidebar-drawer-open');
}

function closeMobileSidebar() {
    const sidebar = $('main-sidebar');
    const overlay = $('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('sidebar-drawer-open');
}

// Auto-close mobile sidebar when a nav item is clicked
document.addEventListener('click', function(e) {
    if (!isMobileViewport()) return;
    const navItem = e.target.closest('.nav-item');
    if (navItem) closeMobileSidebar();
});

// Close sidebar on Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeMobileSidebar();
});

// ─── Public Nav Mobile Hamburger ───────────────────────────────
function toggleMobileNav() {
    const panel = document.getElementById('public-nav-links-panel');
    const toggle = document.getElementById('mobile-nav-toggle');
    if (!panel || !toggle) return;
    const isOpen = panel.classList.toggle('mobile-nav-open');
    toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    toggle.classList.toggle('is-open', isOpen);
}

// Close mobile nav when a link is clicked
document.addEventListener('click', function(e) {
    const panel = document.getElementById('public-nav-links-panel');
    if (!panel) return;
    if (e.target.closest('.public-nav-btn')) {
        panel.classList.remove('mobile-nav-open');
        const toggle = document.getElementById('mobile-nav-toggle');
        if (toggle) { toggle.setAttribute('aria-expanded', 'false'); toggle.classList.remove('is-open'); }
    }
});

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
                if (nameLabel) nameLabel.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> ${input.files[0].name}`;
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
                if (nameLabel) nameLabel.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:4px;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> ${e.dataTransfer.files[0].name}`;
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

async function handleUploadResources(e) {
    e.preventDefault();
    const form = e.target;
    const btn = $('developer-upload-resources-btn') || form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    // Show result inside the Developer Dashboard card, not in the Upload Data view
    const msgDiv = $('developer-upload-resources-msg');
    if (msgDiv) {
        msgDiv.style.display = '';
        msgDiv.innerHTML = '<span class="text-muted">⏳ Processing resources Excel…</span>';
    }

    btn?.classList.add('loading');
    try {
        const res = await fetch(API_URL + '/upload/resources', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` },
            body: formData
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Resources upload failed');
        if (msgDiv) {
            msgDiv.style.display = '';
            msgDiv.innerHTML = `
                <div style="padding:12px 14px; background:var(--teal-glass); border-radius:var(--r-md); border:1px solid var(--teal); font-size:0.85rem; margin-top:10px;">
                    <strong>✅ Resources processed!</strong><br>
                    <span>Added: <strong>${data.students_added ?? 0}</strong> &nbsp;|&nbsp; Updated: <strong>${data.results_added ?? 0}</strong></span>
                    ${data.errors && data.errors.length ? `<br><span style="color:var(--danger); margin-top:4px; display:block;">⚠️ Errors: ${data.errors.map(escapeHtml).join('; ')}</span>` : ''}
                </div>
            `;
        }
        showToast('Resources uploaded successfully', 'success');
        resetUploadForm(form);
        loadDashboardStats();
        loadResources();
    } catch (err) {
        if (msgDiv) {
            msgDiv.style.display = '';
            msgDiv.innerHTML = `<div style="padding:12px 14px; background:var(--danger-light); color:var(--danger); border-radius:var(--r-md); font-size:0.85rem; margin-top:10px;">❌ ${escapeHtml(err.message)}</div>`;
        }
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

let resultsAbortController = null;
let currentResultsRequestId = 0;

function isFGradeResult(result) {
    return (result.grade || '').trim().toUpperCase() === 'F';
}

function getResultsForDisplay() {
    return fGradesFilterActive ? allResultsCache.filter(isFGradeResult) : allResultsCache;
}

function getResultsPageSize() {
    const displayResults = getResultsForDisplay();
    return resultsPageSize === 'all'
        ? displayResults.length
        : parseInt(resultsPageSize, 10);
}

function updateFGradesFilterButton() {
    const btn = $('results-f-filter-btn');
    if (!btn) return;

    btn.classList.toggle('is-active', fGradesFilterActive);
    btn.setAttribute('aria-pressed', String(fGradesFilterActive));
    btn.title = fGradesFilterActive
        ? 'F grades filter active — click to show all results'
        : 'Show only F grades';
    btn.setAttribute(
        'aria-label',
        fGradesFilterActive
            ? 'Show all results'
            : 'Filter results to show F grades only'
    );

    const badge = $('f-filter-badge');
    if (badge) {
        badge.classList.toggle('is-active', fGradesFilterActive);
    }
}

function toggleFGradesFilter() {
    fGradesFilterActive = !fGradesFilterActive;
    resultsCurrentPage = 1;
    updateFGradesFilterButton();
    renderResultsTable();
}

async function loadResults() {
    const tbody = $('results-tbody');
    if (!tbody) return;

    if (resultsAbortController) {
        try { resultsAbortController.abort(); } catch (_) {}
    }
    resultsAbortController = new AbortController();
    const thisRequestId = ++currentResultsRequestId;

    tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">Loading results…</td></tr>';

    try {
        const deptVal = $('filter-department')?.value || '';
        const { dept, section } = parseDeptSection(deptVal);
        const sem  = $('filter-semester')?.value || '';
        const subCode = $('filter-subject-code')?.value?.trim() || '';
        const regNo = $('filter-reg-no')?.value?.trim() || '';

        let url = '/results?';
        if (currentResultsBatchFilter && currentResultsBatchFilter !== 'All') {
            url += `batch=${encodeURIComponent(currentResultsBatchFilter)}&`;
        }
        if (dept) url += `department=${encodeURIComponent(dept)}&`;
        if (section) url += `section=${encodeURIComponent(section)}&`;
        if (sem)  url += `semester=${encodeURIComponent(sem)}&`;
        if (subCode) url += `subject_code=${encodeURIComponent(subCode)}&`;
        if (regNo) url += `reg_no=${encodeURIComponent(regNo)}&`;

        const data = await authFetch(url, { signal: resultsAbortController.signal });
        if (thisRequestId !== currentResultsRequestId) return;

        allResultsCache = data || [];

        // Build batch tabs only if not yet built
        if (!resultsAvailableBatches || !resultsAvailableBatches.length) {
            buildResultsBatchTabs();
        }
        renderResultsTable();
    } catch (err) {
        if (err.name === 'AbortError' || err.message?.toLowerCase().includes('abort')) {
            return;
        }
        if (thisRequestId !== currentResultsRequestId) return;
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
    const displayResults = getResultsForDisplay();
    const displayTotal = displayResults.length;
    const pageSize = resultsPageSize === 'all' ? displayTotal : parseInt(resultsPageSize, 10);
    const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(displayTotal / pageSize)) : 1;

    if (resultsCurrentPage > totalPages) {
        resultsCurrentPage = totalPages;
    }
    if (resultsCurrentPage < 1) {
        resultsCurrentPage = 1;
    }

    const startIdx = resultsPageSize === 'all' ? 0 : (resultsCurrentPage - 1) * pageSize;
    const endIdx = resultsPageSize === 'all' ? displayTotal : Math.min(startIdx + pageSize, displayTotal);
    const visibleData = displayResults.slice(startIdx, endIdx);

    // Update Counter indicator pill
    const countEl = $('results-showing-count');
    const totalWrap = $('results-total-count-wrap');
    const pill = $('results-count-display');
    if (countEl) countEl.innerText = displayTotal;
    if (totalWrap) totalWrap.innerText = fGradesFilterActive ? `of ${total}` : '';
    if (pill) {
        pill.title = fGradesFilterActive
            ? `F grades only: ${displayTotal} of ${total} loaded results`
            : `Total loaded results: ${total}`;
    }

    // Update F-Grade indicator pill
    const fCount = allResultsCache.filter(isFGradeResult).length;
    const fCountEl = $('results-f-showing-count');
    const fPill = $('results-f-filter-btn');
    if (fCountEl) fCountEl.innerText = fCount;
    if (fPill) {
        fPill.title = fGradesFilterActive
            ? `F grades filter active: ${fCount} matching result(s)`
            : `Total F grades in results: ${fCount}. Click to show only F grades.`;
    }
    updateFGradesFilterButton();

    // Update Pagination info
    const pageInfo = $('results-page-info');
    if (pageInfo) {
        if (displayTotal === 0) {
            pageInfo.innerText = 'Showing 0 results';
        } else {
            pageInfo.innerText = `Showing ${startIdx + 1}–${endIdx} of ${displayTotal}`;
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

    if (!displayTotal) {
        tbody.innerHTML = fGradesFilterActive
            ? '<tr><td colspan="10" class="loading-cell">No F-grade results found matching filters.</td></tr>'
            : '<tr><td colspan="10" class="loading-cell">No results found matching filters.</td></tr>';
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
                        <button class="action-btn edit" onclick="editResult(${r.id}, '${escapeHtml(r.batch || '')}')" title="Modify Grade"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                        <button class="action-btn delete developer-only" onclick="deleteResult(${r.id}, '${escapeHtml(r.batch || '')}')" title="Delete Result"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                    </div>
                </td>
            </tr>
        `;
    });
    tbody.innerHTML = html;

    const isDeveloper = (userRole || '').toLowerCase() === 'developer';
    document.querySelectorAll('.developer-only').forEach(el => el.style.display = isDeveloper ? '' : 'none');
}

function prevResultsPage() {
    if (resultsCurrentPage > 1) {
        resultsCurrentPage -= 1;
        renderResultsTable();
        $('results-table-container')?.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function nextResultsPage() {
    const displayResults = getResultsForDisplay();
    const pageSize = getResultsPageSize();
    const totalPages = pageSize > 0 ? Math.ceil(displayResults.length / pageSize) : 1;
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
function applyFilters(immediate = false) {
    if (filterDebounceTimer) clearTimeout(filterDebounceTimer);
    if (immediate) {
        resultsCurrentPage = 1;
        loadResults();
        return;
    }
    filterDebounceTimer = setTimeout(() => {
        resultsCurrentPage = 1;
        loadResults();
    }, 200);
}

function clearResultsFilters() {
    const btn = $('btn-results-reset');
    if (btn) {
        btn.classList.add('is-resetting');
        setTimeout(() => btn.classList.remove('is-resetting'), 550);
    }
    currentResultsBatchFilter = 'All';
    const container = $('results-batch-tabs-container');
    if (container) {
        container.querySelectorAll('.dept-tab').forEach(tab => {
            if (tab.textContent.trim().toLowerCase().includes('all')) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }
    buildResultsBatchTabs();
    if ($('filter-department')) $('filter-department').value = '';
    if ($('filter-semester')) $('filter-semester').value = '';
    if ($('filter-subject-code')) $('filter-subject-code').value = '';
    if ($('filter-reg-no')) $('filter-reg-no').value = '';
    fGradesFilterActive = false;
    updateFGradesFilterButton();
    applyFilters(true);
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

async function ensureStudentsCache() {
    if (!allStudentsCache || !allStudentsCache.length) {
        try {
            const data = await authFetch('/students');
            allStudentsCache = data || [];
        } catch (err) {
            console.warn('Could not load students cache:', err);
            allStudentsCache = [];
        }
    }
    return allStudentsCache;
}

function studentSectionTab(s) {
    const code = deptToCode(s.department);
    return s.section ? `${code}-${s.section}` : code;
}

function buildBatchTabs(students) {
    const container = $('batch-tabs-container');
    if (!container) return;
    const batches = new Set();
    students.forEach(s => {
        if (s.batch && s.batch.trim()) batches.add(s.batch.trim());
    });
    const sortedBatches = Array.from(batches).sort();
    let html = `<button class="dept-tab ${currentBatchFilter === 'All' ? 'active' : ''}" data-batch="All" onclick="selectBatchTab('All')">
        All Batches <span class="badge-count">${students.length}</span>
    </button>`;
    sortedBatches.forEach(b => {
        const count = students.filter(s => (s.batch || '').trim() === b).length;
        html += `<button class="dept-tab ${currentBatchFilter === b ? 'active' : ''}" data-batch="${escapeHtml(b)}" onclick="selectBatchTab('${escapeHtml(b)}')">
            ${escapeHtml(b)} <span class="badge-count">${count}</span>
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
            <td><span class="student-dept-pill">${escapeHtml(s.department || '—')}</span></td>
            <td>${escapeHtml(s.programme || '—')}</td>
            <td><span class="student-batch-pill">${escapeHtml(s.batch || '—')}</span></td>
            <td>${escapeHtml(s.section || '—')}</td>
            <td><code>${escapeHtml(s.email || (s.reg_no + '@ptuniv.edu.in'))}</code></td>
            <td>
                <div class="table-actions">
                    <button class="action-btn edit" onclick="editStudent('${escapeHtml(s.reg_no)}')" title="Edit Student"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="action-btn delete developer-only" onclick="deleteStudent('${escapeHtml(s.reg_no)}')" title="Delete Student"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div>
            </td>
        </tr>
    `).join('');
    tbody.innerHTML = html;

    const isDeveloper = (userRole || '').toLowerCase() === 'developer';
    document.querySelectorAll('.developer-only').forEach(el => el.style.display = isDeveloper ? '' : 'none');
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
                    <button class="action-btn edit" onclick="editSubject(${s.id})" title="Edit Subject"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button class="action-btn delete developer-only" onclick="deleteSubject(${s.id})" title="Delete Subject"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div>
            </td>
        </tr>
    `).join('');
    tbody.innerHTML = html;

    const isDeveloper = (userRole || '').toLowerCase() === 'developer';
    document.querySelectorAll('.developer-only').forEach(el => el.style.display = isDeveloper ? '' : 'none');
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

// ─── 16. Arrear Details Modal ─────────────────────────────────
async function showArrearDetails(regNo, studentName) {
    const modal = $('arrear-details-modal');
    const title = $('arrear-modal-title');
    const subtitle = $('arrear-modal-subtitle');
    const body = $('arrear-modal-body');

    if (!modal) return;

    title.innerText = 'Active Arrear Subjects';
    subtitle.innerText = `${escapeHtml(studentName)} · ${escapeHtml(regNo)}`;
    body.innerHTML = '<div class="arrear-loading"><div class="spinner"></div><span>Fetching arrear information...</span></div>';
    modal.classList.remove('hidden');

    // Grades that count as a failure — mirrors backend logic exactly
    const FAIL_GRADES = new Set(['F', 'AB', 'ABSENT', 'NC', 'E', 'Z', '']);

    function isFail(r) {
        return FAIL_GRADES.has((r.grade || '').trim().toUpperCase()) || Number(r.grade_point) === 0;
    }
    function isPass(r) {
        return !FAIL_GRADES.has((r.grade || '').trim().toUpperCase()) && Number(r.grade_point) > 0;
    }

    try {
        const studentRes = await authFetch(`/students/by-reg/${encodeURIComponent(regNo)}`);
        if (!studentRes) throw new Error('Student not found');

        const resultsRes = await authFetch(`/results?reg_no=${encodeURIComponent(regNo)}`);
        const results = resultsRes || [];

        // ── Group all attempts by subject_code ──────────────────────────
        const subjectMap = {};
        results.forEach(r => {
            const key = (r.subject_code || r.subject_id || '').trim();
            if (!key) return;
            if (!subjectMap[key]) subjectMap[key] = [];
            subjectMap[key].push(r);
        });

        // ── Classify each subject as active arrear or cleared history ───
        const activeArrears = [];   // uncleared: has F, no passing attempt
        const clearedHistory = [];  // cleared:   had F, later passed

        for (const [code, attempts] of Object.entries(subjectMap)) {
            const hasFail = attempts.some(isFail);
            const hasPass = attempts.some(isPass);

            if (!hasFail) continue; // never failed → irrelevant

            if (hasPass) {
                // Cleared: find the best (latest / highest) passing attempt to represent
                const bestPass = attempts
                    .filter(isPass)
                    .sort((a, b) => Number(b.grade_point) - Number(a.grade_point))[0];
                clearedHistory.push({ ...bestPass, _allAttempts: attempts });
            } else {
                // Active arrear: represent with the most-recent failing attempt
                const latestFail = attempts
                    .filter(isFail)
                    .sort((a, b) => {
                        // sort by semester descending (roman numerals)
                        const sd = romanCompare(b.semester || '', a.semester || '');
                        if (sd !== 0) return sd;
                        return Number(b.attempt || 0) - Number(a.attempt || 0);
                    })[0];
                activeArrears.push({ ...latestFail, _allAttempts: attempts });
            }
        }

        // ── Empty state ─────────────────────────────────────────────────
        if (activeArrears.length === 0) {
            let emptyHtml = `
                <div class="arrear-empty">
                    <div class="arrear-empty-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    </div>
                    <h4>All Cleared!</h4>
                    <p>This student has no active arrear subjects.</p>
                </div>`;
            if (clearedHistory.length > 0) {
                emptyHtml += buildClearedSection(clearedHistory, results, regNo);
            }
            body.innerHTML = emptyHtml;
            return;
        }

        // ── Summary stats ───────────────────────────────────────────────
        const totalArrears = activeArrears.length;
        const totalCredits = activeArrears.reduce((sum, r) => sum + (Number(r.credits) || 0), 0);

        // Group active arrears by the semester of their ORIGINAL failure
        const groupedBySemester = {};
        activeArrears.forEach(r => {
            // Use the earliest failing semester as the "origin" semester
            const earliestFail = r._allAttempts
                .filter(isFail)
                .sort((a, b) => romanCompare(a.semester || '', b.semester || ''))[0];
            const sem = (earliestFail || r).semester || 'Unknown';
            if (!groupedBySemester[sem]) groupedBySemester[sem] = [];
            groupedBySemester[sem].push(r);
        });

        const semesters = Object.keys(groupedBySemester).sort((a, b) => romanCompare(a, b));

        let html = `
            <div class="arrear-summary">
                <div class="arrear-stat">
                    <span class="arrear-stat-value">${totalArrears}</span>
                    <span class="arrear-stat-label">Active Arrears</span>
                </div>
                <div class="arrear-stat">
                    <span class="arrear-stat-value">${totalCredits}</span>
                    <span class="arrear-stat-label">Credits Pending</span>
                </div>
                <div class="arrear-stat">
                    <span class="arrear-stat-value">${semesters.length}</span>
                    <span class="arrear-stat-label">Semesters</span>
                </div>
            </div>
            <div class="arrear-subjects-list">
        `;

        semesters.forEach((sem, semIndex) => {
            const subjects = groupedBySemester[sem];
            const semCredits = subjects.reduce((sum, r) => sum + (Number(r.credits) || 0), 0);

            html += `
                <div class="arrear-semester-card" style="animation-delay: ${semIndex * 0.08}s">
                    <div class="arrear-semester-header">
                        <div class="arrear-semester-info">
                            <span class="arrear-semester-badge">Semester ${escapeHtml(String(sem))}</span>
                            <span class="arrear-semester-count">${subjects.length} subject${subjects.length > 1 ? 's' : ''}</span>
                        </div>
                        <span class="arrear-semester-credits">${semCredits} credits</span>
                    </div>
                    <table class="arrear-table">
                        <thead>
                            <tr>
                                <th>Subject Code</th>
                                <th>Subject Name</th>
                                <th class="text-center">Credits</th>
                                <th class="text-center">Grade</th>
                                <th class="text-center">Attempts</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            subjects.forEach((r, idx) => {
                const attemptCount = r._allAttempts.length;
                const isRetake = attemptCount > 1;

                html += `
                    <tr style="animation-delay: ${(semIndex * 0.08) + (idx * 0.04)}s">
                        <td><code class="subject-code">${escapeHtml(r.subject_code || '')}</code></td>
                        <td class="subject-name">${escapeHtml(r.subject_name || '')}</td>
                        <td class="text-center"><span class="credit-badge">${Number(r.credits) || 0}</span></td>
                        <td class="text-center">
                            <span class="grade-badge grade-f ${isRetake ? 'grade-retake' : ''}">
                                ${isRetake ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>' : ''}
                                F
                            </span>
                        </td>
                        <td class="text-center">
                            <span class="attempt-badge ${isRetake ? 'attempt-retake' : ''}">${attemptCount}${isRetake ? '+' : ''}</span>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        html += '</div>';

        // Append cleared history section if any
        if (clearedHistory.length > 0) {
            html += buildClearedSection(clearedHistory, results, regNo);
        }

        body.innerHTML = html;
    } catch (err) {
        body.innerHTML = `
            <div class="arrear-error">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>Unable to load arrear details</p>
                <span class="error-detail">${escapeHtml(err.message)}</span>
            </div>
        `;
    }
}

// ─── Helper: render the "Cleared Arrears" history section ─────
function buildClearedSection(clearedHistory, allResults, regNo) {
    const count = clearedHistory.length;
    const rows = clearedHistory.map((r, idx) => {
        const attemptCount = r._allAttempts.length;
        const gradeDisplay = escapeHtml((r.grade || '').toUpperCase());
        return `
            <tr style="animation-delay: ${idx * 0.04}s">
                <td><code class="subject-code">${escapeHtml(r.subject_code || '')}</code></td>
                <td class="subject-name">${escapeHtml(r.subject_name || '')}</td>
                <td class="text-center"><span class="credit-badge">${Number(r.credits) || 0}</span></td>
                <td class="text-center">
                    <span class="grade-badge grade-cleared" title="Cleared after ${attemptCount} attempt(s)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:12px;height:12px;vertical-align:middle;margin-right:2px">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        ${gradeDisplay}
                    </span>
                </td>
                <td class="text-center">
                    <span class="attempt-badge attempt-cleared">${attemptCount}</span>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="arrear-cleared-section">
            <div class="arrear-cleared-header">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;flex-shrink:0">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                <span>Previously Cleared Arrears <em>(${count} subject${count > 1 ? 's' : ''})</em></span>
            </div>
            <table class="arrear-table arrear-table-cleared">
                <thead>
                    <tr>
                        <th>Subject Code</th>
                        <th>Subject Name</th>
                        <th class="text-center">Credits</th>
                        <th class="text-center">Final Grade</th>
                        <th class="text-center">Attempts</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    `;
}

function closeArrearModal() {
    const modal = $('arrear-details-modal');
    if (modal) modal.classList.add('hidden');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeArrearModal();
    }
});

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

// ─── Grade/SGPA-CGPA Batch Pills ──────────────────────────────────────────────
async function buildGradeBatchTabs() {
    const container = $('grade-batch-tabs-container');
    if (!container) return;
    const students = await ensureStudentsCache();
    const batches = new Set();
    students.forEach(s => {
        if (s.batch && s.batch.trim()) batches.add(s.batch.trim());
    });
    const sortedBatches = Array.from(batches).sort();
    let html = `<button class="dept-tab ${currentGradeBatchFilter === 'All' ? 'active' : ''}" data-batch="All" onclick="selectGradeBatchTab('All')">
        All Batches <span class="badge-count">${students.length}</span>
    </button>`;
    sortedBatches.forEach(b => {
        const count = students.filter(s => (s.batch || '').trim() === b).length;
        html += `<button class="dept-tab ${currentGradeBatchFilter === b ? 'active' : ''}" data-batch="${escapeHtml(b)}" onclick="selectGradeBatchTab('${escapeHtml(b)}')">
            ${escapeHtml(b)} <span class="badge-count">${count}</span>
        </button>`;
    });
    container.innerHTML = html;
}

function selectGradeBatchTab(batch) {
    currentGradeBatchFilter = batch;
    currentGradeDeptFilter = 'All';
    buildGradeBatchTabs();
    buildGradeDeptTabs();
    loadGrades();
}

// ─── Grade/SGPA-CGPA Dept & Section Pills ─────────────────────────────────────
async function buildGradeDeptTabs() {
    const container = $('grade-dept-tabs-container');
    if (!container) return;
    const allStudents = await ensureStudentsCache();
    let students = allStudents;
    if (currentGradeBatchFilter !== 'All') {
        students = allStudents.filter(s => (s.batch || '').trim() === currentGradeBatchFilter);
    }
    const tabCounts = {};
    students.forEach(s => {
        const tab = studentSectionTab(s);
        tabCounts[tab] = (tabCounts[tab] || 0) + 1;
    });
    const sortedTabs = Object.keys(tabCounts).sort();
    let html = `<button class="dept-tab ${currentGradeDeptFilter === 'All' ? 'active' : ''}" data-dept="All" onclick="selectGradeDeptTab('All')">
        All <span class="badge-count">${students.length}</span>
    </button>`;
    sortedTabs.forEach(tab => {
        html += `<button class="dept-tab ${currentGradeDeptFilter === tab ? 'active' : ''}" data-dept="${tab}" onclick="selectGradeDeptTab('${tab}')">
            ${tab} <span class="badge-count">${tabCounts[tab]}</span>
        </button>`;
    });
    container.innerHTML = html;
}

function selectGradeDeptTab(deptTab) {
    currentGradeDeptFilter = deptTab;
    buildGradeDeptTabs();
    loadGrades();
}

// ─── Dept-Section filter helpers ──────────────────────────────────────────────

/**
 * Parse a filter value like "CSE-A" → { dept: "CSE", section: "A" }
 * or "CSE" → { dept: "CSE", section: "" }
 * We encode as "DEPT::SECTION" internally to avoid ambiguity with dept codes
 * that contain a hyphen (e.g., "E-EEE" won't exist, but just in case).
 */
function parseDeptSection(value) {
    if (!value) return { dept: '', section: '' };
    if (value.includes('::')) {
        const [dept, section] = value.split('::', 2);
        return { dept: dept || '', section: section || '' };
    }
    return { dept: value, section: '' };
}

function encodeDeptSection(dept, section) {
    return section ? `${dept}::${section}` : dept;
}

/**
 * Build the HTML for a dept filter <select> from the dept-sections list.
 * - Depts with ONE distinct section (or no section) → flat <option>
 * - Depts with MULTIPLE sections → <optgroup label="CSE"> containing
 *     <option value="CSE">CSE (All Sections)</option>
 *     <option value="CSE::A">CSE-A</option>
 *     ...
 */
function buildDeptFilterOptions(pairs, allLabel = 'All') {
    // Group pairs by dept
    const deptMap = {};
    pairs.forEach(({ dept, section }) => {
        if (!deptMap[dept]) deptMap[dept] = [];
        if (section) deptMap[dept].push(section);
    });

    let html = `<option value="">${escapeHtml(allLabel)}</option>`;

    const sortedDepts = Object.keys(deptMap).sort();
    sortedDepts.forEach(dept => {
        const sections = deptMap[dept].sort();
        if (sections.length <= 1) {
            // Single or no section — flat option, value = dept code only
            html += `<option value="${escapeHtml(dept)}">${escapeHtml(dept)}</option>`;
        } else {
            // Multiple sections — use optgroup
            html += `<optgroup label="${escapeHtml(dept)}">`;
            html += `<option value="${escapeHtml(dept)}">${escapeHtml(dept)} (All Sections)</option>`;
            sections.forEach(sec => {
                const val = encodeDeptSection(dept, sec);
                html += `<option value="${escapeHtml(val)}">${escapeHtml(dept)}-${escapeHtml(sec)}</option>`;
            });
            html += `</optgroup>`;
        }
    });

    return html;
}

// Cached dept-sections data
let deptSectionPairs = null;

async function populateDeptFilters() {
    try {
        const pairs = await authFetch('/students/dept-sections');
        deptSectionPairs = pairs || [];
    } catch (e) {
        console.warn('Could not load dept-sections:', e);
        deptSectionPairs = [];
    }

    // The four dept filter selects across all views
    const filterIds = [
        { id: 'filter-department',  allLabel: 'All Depts' },
        { id: 'grade-filter-dept',  allLabel: 'All' },
        { id: 'cr-filter-dept',     allLabel: 'All' },
    ];

    const html = buildDeptFilterOptions(deptSectionPairs || []);
    filterIds.forEach(({ id, allLabel }) => {
        const el = $(id);
        if (!el) return;
        // Rebuild keeping current selected value if possible
        const prev = el.value;
        el.innerHTML = buildDeptFilterOptions(deptSectionPairs || [], allLabel);
        // Restore selection if the option still exists
        if (prev && el.querySelector(`option[value="${CSS.escape(prev)}"]`)) {
            el.value = prev;
        }
    });
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
        const deptVal = currentGradeDeptFilter !== 'All' ? currentGradeDeptFilter : '';
        let dept = '';
        let section = '';
        if (deptVal) {
            if (deptVal.includes('-')) {
                const parts = deptVal.split('-');
                dept = parts[0];
                section = parts[1];
            } else {
                dept = deptVal;
            }
        }
        const sem  = $('grade-filter-sem')?.value || '';
        const batch = currentGradeBatchFilter !== 'All' ? currentGradeBatchFilter : '';
        const cgpaSort = $('grade-filter-sort')?.value || 'desc';
        const creditsSort = $('grade-filter-credits-sort')?.value || 'none';

        let url = '/grades/summary?';
        if (dept) url += `department=${encodeURIComponent(dept)}&`;
        if (section) url += `section=${encodeURIComponent(section)}&`;
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
            const arrText = arrCount === 0 ? '0 Arrears' : `${arrCount} Active Arr${arrCount > 1 ? 's' : ''}`;
            const arrTooltip = arrCount === 0 ? 'All cleared / No pending arrears' : `${arrCount} active uncleared arrear subject${arrCount > 1 ? 's' : ''}`;
            const isClickable = arrCount > 0 ? ' style="cursor:pointer;" onclick="showArrearDetails(\'' + escapeHtml(g.reg_no) + '\', \'' + escapeHtml(g.name) + '\')"' : '';

            return `
                <tr${isClickable}>
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
                        <span class="arrear-badge ${arrClass}" title="${escapeHtml(arrTooltip)}${arrCount > 0 ? '\n\nClick to view F-grade subjects' : ''}">
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

// ─── 15b. Class Report ─────────────────────────────────────────
let currentCrArrearFilter = ['all'];
let allClassReportCache = [];

// Class Report Filter State
let currentCrBatchFilter = 'All';
let currentCrDeptFilter = 'All';

async function populateClassReportBatchDropdown() {
    const select = $('cr-filter-batch');
    if (!select) return;
    try {
        const batches = await authFetch('/students/batches');
        select.innerHTML = '<option value="">All</option>' + batches.map(b => `<option value="${b}">${b}</option>`).join('');
    } catch (e) {
        console.warn('Could not load batches for class report filter:', e);
    }
}

// ─── Class Report Batch Pills ─────────────────────────────────────────────────
async function buildCrBatchTabs() {
    const container = $('cr-batch-tabs-container');
    if (!container) return;
    const students = await ensureStudentsCache();
    const batches = new Set();
    students.forEach(s => {
        if (s.batch && s.batch.trim()) batches.add(s.batch.trim());
    });
    const sortedBatches = Array.from(batches).sort();
    let html = `<button class="dept-tab ${currentCrBatchFilter === 'All' ? 'active' : ''}" data-batch="All" onclick="selectCrBatchTab('All')">
        All Batches <span class="badge-count">${students.length}</span>
    </button>`;
    sortedBatches.forEach(b => {
        const count = students.filter(s => (s.batch || '').trim() === b).length;
        html += `<button class="dept-tab ${currentCrBatchFilter === b ? 'active' : ''}" data-batch="${escapeHtml(b)}" onclick="selectCrBatchTab('${escapeHtml(b)}')">
            ${escapeHtml(b)} <span class="badge-count">${count}</span>
        </button>`;
    });
    container.innerHTML = html;
}

function selectCrBatchTab(batch) {
    currentCrBatchFilter = batch;
    currentCrDeptFilter = 'All';
    buildCrBatchTabs();
    buildCrDeptTabs();
    loadClassReport();
}

// ─── Class Report Dept & Section Pills ────────────────────────────────────────
async function buildCrDeptTabs() {
    const container = $('cr-dept-tabs-container');
    if (!container) return;
    const allStudents = await ensureStudentsCache();
    let students = allStudents;
    if (currentCrBatchFilter !== 'All') {
        students = allStudents.filter(s => (s.batch || '').trim() === currentCrBatchFilter);
    }
    const tabCounts = {};
    students.forEach(s => {
        const tab = studentSectionTab(s);
        tabCounts[tab] = (tabCounts[tab] || 0) + 1;
    });
    const sortedTabs = Object.keys(tabCounts).sort();
    let html = `<button class="dept-tab ${currentCrDeptFilter === 'All' ? 'active' : ''}" data-dept="All" onclick="selectCrDeptTab('All')">
        All <span class="badge-count">${students.length}</span>
    </button>`;
    sortedTabs.forEach(tab => {
        html += `<button class="dept-tab ${currentCrDeptFilter === tab ? 'active' : ''}" data-dept="${tab}" onclick="selectCrDeptTab('${tab}')">
            ${tab} <span class="badge-count">${tabCounts[tab]}</span>
        </button>`;
    });
    container.innerHTML = html;
}

function selectCrDeptTab(deptTab) {
    currentCrDeptFilter = deptTab;
    buildCrDeptTabs();
    loadClassReport();
}

function toggleCrArrearDropdown(event) {
    if (event) event.stopPropagation();
    const menu = $('cr-filter-arrears-menu');
    if (menu) menu.classList.toggle('hidden');
}

function onCrArrearAllToggle(el) {
    document.querySelectorAll('.cr-arrear-opt').forEach(cb => cb.checked = false);
    currentCrArrearFilter = ['all'];
    updateCrArrearButtonLabel();
    loadClassReport();
}

function onCrArrearOptionToggle(el) {
    const allCb = $('cr-arrear-opt-all');
    const checkedOpts = Array.from(document.querySelectorAll('.cr-arrear-opt:checked')).map(cb => cb.value);
    if (checkedOpts.length === 0) {
        if (allCb) allCb.checked = true;
        currentCrArrearFilter = ['all'];
    } else {
        if (allCb) allCb.checked = false;
        currentCrArrearFilter = checkedOpts;
    }
    updateCrArrearButtonLabel();
    loadClassReport();
}

function updateCrArrearButtonLabel() {
    const label = $('cr-filter-arrears-label');
    if (!label) return;
    if (currentCrArrearFilter.includes('all') || currentCrArrearFilter.length === 0) {
        label.innerText = 'ALL';
    } else {
        label.innerText = currentCrArrearFilter.join(', ') + ' Arr';
    }
}

// Close cr arrear menu when clicking outside
document.addEventListener('click', (e) => {
    const wrap = $('cr-filter-arrears-wrap');
    const menu = $('cr-filter-arrears-menu');
    if (wrap && menu && !wrap.contains(e.target)) {
        menu.classList.add('hidden');
    }
});

async function loadClassReport() {
    const tbody = $('classreport-tbody');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">Loading Class Report\u2026</td></tr>';

    try {
        const deptVal  = currentCrDeptFilter !== 'All' ? currentCrDeptFilter : '';
        let dept = '';
        let section = '';
        if (deptVal) {
            if (deptVal.includes('-')) {
                const parts = deptVal.split('-');
                dept = parts[0];
                section = parts[1];
            } else {
                dept = deptVal;
            }
        }
        const batch = currentCrBatchFilter !== 'All' ? currentCrBatchFilter : '';
        const creditsSort = $('cr-filter-credits-sort')?.value || 'none';

        let url = '/grades/summary?';
        if (dept)    url += `department=${encodeURIComponent(dept)}&`;
        if (section) url += `section=${encodeURIComponent(section)}&`;
        if (batch)   url += `batch=${encodeURIComponent(batch)}&`;
        currentCrArrearFilter.forEach(a => { url += `arrears=${encodeURIComponent(a)}&`; });


        const data = await authFetch(url);

        // Sort by Total Credits
        if (creditsSort === 'asc') {
            data.sort((a, b) => (Number(a.total_credits) || 0) - (Number(b.total_credits) || 0));
        } else if (creditsSort === 'desc') {
            data.sort((a, b) => (Number(b.total_credits) || 0) - (Number(a.total_credits) || 0));
        }

        allClassReportCache = data;

        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No students match current criteria.</td></tr>';
            return;
        }

        tbody.innerHTML = data.map((g, idx) => {
            const arrCount = g.arrear_count || 0;
            const arrClass = arrCount === 0 ? 'arrear-0' : (arrCount === 1 ? 'arrear-1' : (arrCount === 2 ? 'arrear-2' : 'arrear-3'));
            const arrText  = arrCount === 0 ? '0 Arrears' : `${arrCount} Active Arr${arrCount > 1 ? 's' : ''}`;
            const arrTooltip = arrCount === 0 ? 'All cleared / No pending arrears' : `${arrCount} active uncleared arrear subject${arrCount > 1 ? 's' : ''}`;
            const isClickable = arrCount > 0 ? ' style="cursor:pointer;" onclick="showArrearDetails(\'' + escapeHtml(g.reg_no) + '\', \'' + escapeHtml(g.name) + '\')"' : '';
            return `
                <tr${isClickable}>
                    <td>${idx + 1}</td>
                    <td><strong>${escapeHtml(g.reg_no)}</strong></td>
                    <td>${escapeHtml(g.name)}</td>
                    <td>${escapeHtml(g.department)}</td>
                    <td>${g.total_credits}</td>
                    <td>${g.earned_credits}</td>
                    <td>
                        <span class="arrear-badge ${arrClass}" title="${escapeHtml(arrTooltip)}${arrCount > 0 ? '\n\nClick to view F-grade subjects' : ''}">
                            <span class="arrear-dot"></span> ${arrText}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="7" class="loading-cell" style="color:var(--danger)">Error: ${escapeHtml(err.message)}</td></tr>`;
    }
}

// Client-side filter for Class Report by Reg No and Student Name
function filterClassReport() {
    const tbody = $('classreport-tbody');
    if (!tbody || !allClassReportCache || !allClassReportCache.length) return;

    // Get filter values
    const regNoFilter = ($('cr-filter-regno')?.value || '').trim().toLowerCase();
    const nameFilter = ($('cr-filter-name')?.value || '').trim().toLowerCase();

    // Filter the cached data
    let filteredData = allClassReportCache;

    if (regNoFilter) {
        filteredData = filteredData.filter(g => 
            (g.reg_no || '').toLowerCase().includes(regNoFilter)
        );
    }

    if (nameFilter) {
        filteredData = filteredData.filter(g => 
            (g.name || '').toLowerCase().includes(nameFilter)
        );
    }

    // Render filtered results
    if (!filteredData.length) {
        tbody.innerHTML = '<tr><td colspan="7" class="loading-cell">No students match your search criteria.</td></tr>';
        return;
    }

    tbody.innerHTML = filteredData.map((g, idx) => {
        const arrCount = g.arrear_count || 0;
        const arrClass = arrCount === 0 ? 'arrear-0' : (arrCount === 1 ? 'arrear-1' : (arrCount === 2 ? 'arrear-2' : 'arrear-3'));
        const arrText  = arrCount === 0 ? '0 Arrears' : `${arrCount} Active Arr${arrCount > 1 ? 's' : ''}`;
        const arrTooltip = arrCount === 0 ? 'All cleared / No pending arrears' : `${arrCount} active uncleared arrear subject${arrCount > 1 ? 's' : ''}`;
        const isClickable = arrCount > 0 ? ' style="cursor:pointer;" onclick="showArrearDetails(\'' + escapeHtml(g.reg_no) + '\', \'' + escapeHtml(g.name) + '\')"' : '';
        return `
            <tr${isClickable}>
                <td>${idx + 1}</td>
                <td><strong>${escapeHtml(g.reg_no)}</strong></td>
                <td>${escapeHtml(g.name)}</td>
                <td>${escapeHtml(g.department)}</td>
                <td>${g.total_credits}</td>
                <td>${g.earned_credits}</td>
                <td>
                    <span class="arrear-badge ${arrClass}" title="${escapeHtml(arrTooltip)}${arrCount > 0 ? '\n\nClick to view F-grade subjects' : ''}">
                        <span class="arrear-dot"></span> ${arrText}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function exportClassReportToExcel() {
    if (!allClassReportCache || !allClassReportCache.length) {
        showToast('No data to export', 'warning');
        return;
    }

    try {
        const deptVal   = currentCrDeptFilter || 'All';
        const batchVal  = currentCrBatchFilter || 'All';
        const deptNames = {
            'CE':'Civil Engineering (CE)','CHE':'Chemical Engineering (CHE)',
            'CSE':'Computer Science & Engineering (CSE)','ECE':'Electronics & Communication Engineering (ECE)',
            'EEE':'Electrical & Electronics Engineering (EEE)','EIE':'Electronics & Instrumentation Engineering (EIE)',
            'IT':'Information Technology (IT)','ME':'Mechanical Engineering (ME)','MT':'Mechatronics Engineering (MT)'
        };
        let deptDisplay = 'All Departments';
        if (deptVal && deptVal !== 'All') {
            if (deptVal.includes('-')) {
                const [dCode, sCode] = deptVal.split('-');
                deptDisplay = (deptNames[dCode] || dCode) + ` - Section ${sCode}`;
            } else {
                deptDisplay = deptNames[deptVal] || deptVal;
            }
        }
        const batchDisplay = (batchVal && batchVal.toLowerCase() !== 'all') ? batchVal : 'All Batches';
        let arrearDisplay  = 'All Students';
        if (!currentCrArrearFilter.includes('all') && currentCrArrearFilter.length > 0) {
            arrearDisplay = currentCrArrearFilter.map(v => v === '0' ? 'No Arrears' : `${v} Arrear(s)`).join(', ');
        }

        const wb = XLSX.utils.book_new();
        const wsData = [];

        wsData.push(['PUDUCHERRY TECHNOLOGICAL UNIVERSITY']);
        wsData.push(['CLASS REPORT']);
        wsData.push([]);
        wsData.push(['Department:', deptDisplay, '', 'Batch:', batchDisplay, '', 'Arrear Filter:', arrearDisplay]);
        wsData.push([]);
        wsData.push(['#', 'Register No', 'Student Name', 'Department', 'Total Credits', 'Earned Credits', 'Arrear Status']);

        allClassReportCache.forEach((g, idx) => {
            const arrCount = g.arrear_count || 0;
            const arrText  = arrCount === 0 ? 'No Arrears' : `${arrCount} Arrear${arrCount > 1 ? 's' : ''}`;
            wsData.push([idx + 1, g.reg_no, g.name, g.department, g.total_credits, g.earned_credits, arrText]);
        });

        wsData.push([]);
        wsData.push([`Total Students: ${allClassReportCache.length}`]);

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [{wch:5},{wch:16},{wch:30},{wch:14},{wch:14},{wch:15},{wch:16}];
        XLSX.utils.book_append_sheet(wb, ws, 'Class_Report');

        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const fileDept  = deptVal  || 'All';
        const fileBatch = batchVal || 'All';
        XLSX.writeFile(wb, `PTU_Class_Report_${fileDept}_${fileBatch}_${today}.xlsx`);
        showToast('Class Report exported!', 'success');
    } catch (err) {
        showToast('Export failed: ' + err.message, 'error');
    }
}

function exportGradesToExcel() {
    if (!allGradesCache || !allGradesCache.length) {
        showToast('No grades to export', 'warning');
        return;
    }

    try {
        // ── 1. Extract Active Filter States ──
        const deptVal = currentGradeDeptFilter || 'All';
        const deptNames = {
            'CE': 'Civil Engineering (CE)',
            'CHE': 'Chemical Engineering (CHE)',
            'CSE': 'Computer Science & Engineering (CSE)',
            'ECE': 'Electronics & Communication Engineering (ECE)',
            'EEE': 'Electrical & Electronics Engineering (EEE)',
            'EIE': 'Electronics & Instrumentation Engineering (EIE)',
            'IT': 'Information Technology (IT)',
            'ME': 'Mechanical Engineering (ME)',
            'MT': 'Mechatronics Engineering (MT)'
        };
        let deptDisplay = 'All Departments';
        if (deptVal && deptVal !== 'All') {
            if (deptVal.includes('-')) {
                const [dCode, sCode] = deptVal.split('-');
                deptDisplay = (deptNames[dCode] || dCode) + ` - Section ${sCode}`;
            } else {
                deptDisplay = deptNames[deptVal] || deptVal;
            }
        }

        const semVal = $('grade-filter-sem')?.value || '';
        const semDisplay = semVal ? `Semester ${semVal} (SGPA)` : 'Overall Cumulative (CGPA)';

        const batchVal = currentGradeBatchFilter || 'All';
        const batchDisplay = (batchVal && batchVal.toLowerCase() !== 'all') ? batchVal : 'All Batches';

        let arrearDisplay = 'All Students (No Filter)';
        if (typeof currentArrearFilter !== 'undefined' && currentArrearFilter && !currentArrearFilter.includes('all') && currentArrearFilter.length > 0) {
            const arrearLabels = {
                '0': 'No Arrears (Clear Only)',
                '1': '1 Arrear Only',
                '2': '2 Arrears Only',
                '3+': '3+ Arrears Only'
            };
            arrearDisplay = currentArrearFilter.map(a => arrearLabels[a] || `${a} Arrears`).join(', ');
        }

        const cgpaSort = $('grade-filter-sort')?.value || 'desc';
        const sortDisplay = cgpaSort === 'desc'
            ? (semVal ? 'SGPA (Highest to Lowest)' : 'CGPA (Highest to Lowest)')
            : cgpaSort === 'asc'
                ? (semVal ? 'SGPA (Lowest to Highest)' : 'CGPA (Lowest to Highest)')
                : 'None / Natural Order';

        const creditsSort = $('grade-filter-credits-sort')?.value || 'none';
        const creditsSortDisplay = creditsSort === 'asc' ? 'Total Credits (Ascending)' : creditsSort === 'desc' ? 'Total Credits (Descending)' : 'None';

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const exportTimestamp = `${dateStr}, ${timeStr}`;

        // ── 2. Summary Statistics ──
        const totalStudents = allGradesCache.length;
        const clearCount = allGradesCache.filter(g => (Number(g.arrear_count) || 0) === 0).length;
        const arrearStudentsCount = totalStudents - clearCount;
        const clearRate = totalStudents > 0 ? ((clearCount / totalStudents) * 100).toFixed(1) + '%' : '0%';

        const validSgpas = allGradesCache.map(g => Number(g.sgpa)).filter(v => !isNaN(v) && v >= 0);
        const avgSgpa = validSgpas.length ? (validSgpas.reduce((a, b) => a + b, 0) / validSgpas.length).toFixed(2) : null;

        const validCgpas = allGradesCache.map(g => Number(g.cgpa)).filter(v => !isNaN(v) && v >= 0);
        const avgCgpa = validCgpas.length ? (validCgpas.reduce((a, b) => a + b, 0) / validCgpas.length).toFixed(2) : null;

        const validTotCredits = allGradesCache.map(g => Number(g.total_credits)).filter(v => !isNaN(v) && v > 0);
        const avgTotCredits = validTotCredits.length ? Math.round(validTotCredits.reduce((a, b) => a + b, 0) / validTotCredits.length) : null;

        const validEarnCredits = allGradesCache.map(g => Number(g.earned_credits)).filter(v => !isNaN(v) && v >= 0);
        const avgEarnCredits = validEarnCredits.length ? Math.round(validEarnCredits.reduce((a, b) => a + b, 0) / validEarnCredits.length) : null;

        // ── 3. Build Styled Excel Sheet ──
        const ws = {};

        function colToLetter(n) {
            let s = '';
            while (n >= 0) {
                s = String.fromCharCode((n % 26) + 65) + s;
                n = Math.floor(n / 26) - 1;
            }
            return s;
        }

        function setCell(r, c, val, style, type = 's') {
            const ref = colToLetter(c) + (r + 1);
            ws[ref] = { v: val, t: type, s: style };
        }

        // Shared Style Presets
        const thinBorder = {
            top: { style: 'thin', color: { rgb: 'CBD5E1' } },
            bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
            left: { style: 'thin', color: { rgb: 'CBD5E1' } },
            right: { style: 'thin', color: { rgb: 'CBD5E1' } }
        };

        const filterLabelStyle = {
            font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '475569' } },
            fill: { fgColor: { rgb: 'F8FAFC' } },
            alignment: { horizontal: 'right', vertical: 'center' },
            border: thinBorder
        };

        const filterValueStyle = {
            font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '0F172A' } },
            fill: { fgColor: { rgb: 'FFFFFF' } },
            alignment: { horizontal: 'left', vertical: 'center' },
            border: thinBorder
        };

        // Row 0: University Header Banner
        const univTitleStyle = {
            font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '0F2942' } },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
        for (let c = 0; c <= 9; c++) {
            setCell(0, c, c === 0 ? 'PUDUCHERRY TECHNOLOGICAL UNIVERSITY' : '', univTitleStyle);
        }

        // Row 1: Subtitle Banner
        const subtitleStyle = {
            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'DBEAFE' } },
            fill: { fgColor: { rgb: '1E3A8A' } },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
        for (let c = 0; c <= 9; c++) {
            setCell(1, c, c === 0 ? 'OFFICE OF TRAINING & PLACEMENT — SGPA / CGPA PERFORMANCE REPORT' : '', subtitleStyle);
        }

        // Row 2: Applied Filter Section Heading
        const filterSectionStyle = {
            font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '1E293B' } },
            fill: { fgColor: { rgb: 'E2E8F0' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
                top: { style: 'thin', color: { rgb: 'CBD5E1' } },
                bottom: { style: 'thin', color: { rgb: 'CBD5E1' } }
            }
        };
        for (let c = 0; c <= 9; c++) {
            setCell(2, c, c === 0 ? 'APPLIED FILTER CRITERIA & REPORT METADATA' : '', filterSectionStyle);
        }

        // Row 3: Filter Values Row 1
        setCell(3, 0, 'Department:', filterLabelStyle);
        setCell(3, 1, deptDisplay, filterValueStyle);
        setCell(3, 2, '', filterValueStyle);

        setCell(3, 3, 'Semester / Scope:', filterLabelStyle);
        setCell(3, 4, semDisplay, filterValueStyle);
        setCell(3, 5, '', filterValueStyle);

        setCell(3, 6, 'Batch:', filterLabelStyle);
        setCell(3, 7, batchDisplay, filterValueStyle);

        setCell(3, 8, 'Exported On:', filterLabelStyle);
        setCell(3, 9, exportTimestamp, filterValueStyle);

        // Row 4: Filter Values Row 2
        setCell(4, 0, 'Arrear Filter:', filterLabelStyle);
        setCell(4, 1, arrearDisplay, filterValueStyle);
        setCell(4, 2, '', filterValueStyle);

        setCell(4, 3, 'Sort By (CGPA):', filterLabelStyle);
        setCell(4, 4, sortDisplay, filterValueStyle);
        setCell(4, 5, '', filterValueStyle);

        setCell(4, 6, 'Credits Sort:', filterLabelStyle);
        setCell(4, 7, creditsSortDisplay, filterValueStyle);

        setCell(4, 8, 'Total Records:', filterLabelStyle);
        setCell(4, 9, `${totalStudents} Students (${clearCount} Clear, ${arrearStudentsCount} Arrear)`, Object.assign({}, filterValueStyle, {
            font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '1E3A8A' } }
        }));

        // Row 5: Blank Spacer Row
        for (let c = 0; c <= 9; c++) {
            setCell(5, c, '', { fill: { fgColor: { rgb: 'FFFFFF' } } });
        }

        // Row 6: Main Table Column Headers
        const tableHeaders = ['Rank', 'Register No', 'Student Name', 'Department', 'Semester', 'SGPA', 'CGPA', 'Total Credits', 'Earned Credits', 'Arrear Status'];
        const thBaseStyle = {
            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '1E3A8A' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
                top: { style: 'medium', color: { rgb: '0F2942' } },
                bottom: { style: 'medium', color: { rgb: '0F2942' } },
                left: { style: 'thin', color: { rgb: '93C5FD' } },
                right: { style: 'thin', color: { rgb: '93C5FD' } }
            }
        };
        tableHeaders.forEach((h, idx) => {
            const style = Object.assign({}, thBaseStyle);
            if (idx === 2) style.alignment = { horizontal: 'left', vertical: 'center' };
            setCell(6, idx, h, style);
        });

        // Rows 7+: Student Rows
        const dataRowBorder = {
            top: { style: 'thin', color: { rgb: 'E2E8F0' } },
            bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
            left: { style: 'thin', color: { rgb: 'E2E8F0' } },
            right: { style: 'thin', color: { rgb: 'E2E8F0' } }
        };

        allGradesCache.forEach((g, idx) => {
            const r = 7 + idx;
            const isOdd = idx % 2 === 1;
            const rowBg = isOdd ? 'F8FAFC' : 'FFFFFF';

            // Col 0: Rank
            setCell(r, 0, idx + 1, {
                font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '475569' } },
                fill: { fgColor: { rgb: rowBg } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: dataRowBorder
            }, 'n');

            // Col 1: Register Number
            setCell(r, 1, String(g.reg_no || ''), {
                font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
                fill: { fgColor: { rgb: rowBg } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: dataRowBorder
            }, 's');

            // Col 2: Student Name
            setCell(r, 2, String(g.name || ''), {
                font: { name: 'Calibri', sz: 10, color: { rgb: '0F172A' } },
                fill: { fgColor: { rgb: rowBg } },
                alignment: { horizontal: 'left', vertical: 'center' },
                border: dataRowBorder
            }, 's');

            // Col 3: Department
            setCell(r, 3, String(g.department || ''), {
                font: { name: 'Calibri', sz: 10, color: { rgb: '334155' } },
                fill: { fgColor: { rgb: rowBg } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: dataRowBorder
            }, 's');

            // Col 4: Semester
            setCell(r, 4, String(g.semester || 'All'), {
                font: { name: 'Calibri', sz: 10, color: { rgb: '334155' } },
                fill: { fgColor: { rgb: rowBg } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: dataRowBorder
            }, 's');

            // Col 5: SGPA
            const hasSgpa = g.sgpa != null && g.sgpa !== '' && !isNaN(Number(g.sgpa));
            setCell(r, 5, hasSgpa ? Number(g.sgpa) : '—', {
                font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '1E293B' } },
                fill: { fgColor: { rgb: rowBg } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: dataRowBorder,
                numFmt: hasSgpa ? '0.00' : undefined
            }, hasSgpa ? 'n' : 's');

            // Col 6: CGPA (Highlighted Royal Blue)
            const hasCgpa = g.cgpa != null && g.cgpa !== '' && !isNaN(Number(g.cgpa));
            setCell(r, 6, hasCgpa ? Number(g.cgpa) : '—', {
                font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '1D4ED8' } },
                fill: { fgColor: { rgb: rowBg } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: dataRowBorder,
                numFmt: hasCgpa ? '0.00' : undefined
            }, hasCgpa ? 'n' : 's');

            // Col 7: Total Credits
            const totCr = Number(g.total_credits);
            const hasTotCr = !isNaN(totCr);
            setCell(r, 7, hasTotCr ? totCr : (g.total_credits ?? '—'), {
                font: { name: 'Calibri', sz: 10, color: { rgb: '334155' } },
                fill: { fgColor: { rgb: rowBg } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: dataRowBorder
            }, hasTotCr ? 'n' : 's');

            // Col 8: Earned Credits
            const earnCr = Number(g.earned_credits);
            const hasEarnCr = !isNaN(earnCr);
            setCell(r, 8, hasEarnCr ? earnCr : (g.earned_credits ?? '—'), {
                font: { name: 'Calibri', sz: 10, color: { rgb: '334155' } },
                fill: { fgColor: { rgb: rowBg } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: dataRowBorder
            }, hasEarnCr ? 'n' : 's');

            // Col 9: Arrear Status Badge
            const arr = Number(g.arrear_count) || 0;
            let arrBg = 'DCFCE7';
            let arrColor = '15803D';
            let arrLabel = '0 (Clear)';
            if (arr === 1) {
                arrBg = 'FEF3C7';
                arrColor = 'B45309';
                arrLabel = '1 Arrear';
            } else if (arr === 2) {
                arrBg = 'FEF3C7';
                arrColor = 'B45309';
                arrLabel = '2 Arrears';
            } else if (arr > 2) {
                arrBg = 'FEE2E2';
                arrColor = 'B91C1C';
                arrLabel = `${arr} Arrears`;
            }

            setCell(r, 9, arrLabel, {
                font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: arrColor } },
                fill: { fgColor: { rgb: arrBg } },
                alignment: { horizontal: 'center', vertical: 'center' },
                border: dataRowBorder
            }, 's');
        });

        // Summary / Footer Row
        const summaryRowIndex = 7 + totalStudents;
        const footerStyle = {
            font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '0F172A' } },
            fill: { fgColor: { rgb: 'F1F5F9' } },
            alignment: { horizontal: 'right', vertical: 'center' },
            border: {
                top: { style: 'thin', color: { rgb: '94A3B8' } },
                bottom: { style: 'double', color: { rgb: '475569' } },
                left: { style: 'thin', color: { rgb: 'CBD5E1' } },
                right: { style: 'thin', color: { rgb: 'CBD5E1' } }
            }
        };

        setCell(summaryRowIndex, 0, `Class Average & Summary (${totalStudents} Students, Pass Rate: ${clearRate}):`, footerStyle);
        for (let c = 1; c <= 4; c++) {
            setCell(summaryRowIndex, c, '', footerStyle);
        }

        const footerValStyle = Object.assign({}, footerStyle, {
            alignment: { horizontal: 'center', vertical: 'center' }
        });

        // SGPA Average
        setCell(summaryRowIndex, 5, avgSgpa !== null ? Number(avgSgpa) : '—', Object.assign({}, footerValStyle, {
            numFmt: avgSgpa !== null ? '0.00' : undefined
        }), avgSgpa !== null ? 'n' : 's');

        // CGPA Average
        setCell(summaryRowIndex, 6, avgCgpa !== null ? Number(avgCgpa) : '—', Object.assign({}, footerValStyle, {
            font: Object.assign({}, footerValStyle.font, { color: { rgb: '1D4ED8' } }),
            numFmt: avgCgpa !== null ? '0.00' : undefined
        }), avgCgpa !== null ? 'n' : 's');

        // Total Credits Average
        setCell(summaryRowIndex, 7, avgTotCredits !== null ? avgTotCredits : '—', footerValStyle, avgTotCredits !== null ? 'n' : 's');

        // Earned Credits Average
        setCell(summaryRowIndex, 8, avgEarnCredits !== null ? avgEarnCredits : '—', footerValStyle, avgEarnCredits !== null ? 'n' : 's');

        // Arrear Summary Breakdown
        setCell(summaryRowIndex, 9, `${clearCount} Clear / ${arrearStudentsCount} Arrear`, Object.assign({}, footerValStyle, {
            font: Object.assign({}, footerValStyle.font, { sz: 9 })
        }), 's');

        // ── 4. Set Merges, Heights, Widths & Autofilter ──
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Univ Title
            { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }, // Subtitle
            { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } }, // Filter Section Header
            { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } }, // Dept Value
            { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } }, // Semester Value
            { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } }, // Arrear Filter Value
            { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } }, // Sort By Value
            { s: { r: summaryRowIndex, c: 0 }, e: { r: summaryRowIndex, c: 4 } } // Summary Label
        ];

        const rowHeights = [
            { hpt: 32 }, // 0: University Title
            { hpt: 22 }, // 1: Subtitle
            { hpt: 20 }, // 2: Filter Section Header
            { hpt: 22 }, // 3: Filter Details 1
            { hpt: 22 }, // 4: Filter Details 2
            { hpt: 9 },  // 5: Blank Spacer
            { hpt: 26 }  // 6: Table Header
        ];
        for (let i = 0; i < totalStudents; i++) {
            rowHeights.push({ hpt: 21 }); // Data rows
        }
        rowHeights.push({ hpt: 24 }); // Summary row
        ws['!rows'] = rowHeights;

        ws['!cols'] = [
            { wch: 8 },  // Rank
            { wch: 17 }, // Register No
            { wch: 32 }, // Student Name
            { wch: 15 }, // Department
            { wch: 12 }, // Semester
            { wch: 12 }, // SGPA
            { wch: 12 }, // CGPA
            { wch: 14 }, // Total Credits
            { wch: 14 }, // Earned Credits
            { wch: 17 }  // Arrear Status
        ];

        ws['!autofilter'] = { ref: `A7:J${7 + totalStudents}` };
        ws['!ref'] = `A1:J${summaryRowIndex + 1}`;

        // ── 5. Export Workbook ──
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'SGPA_CGPA_Summary');

        const fileDept = (deptVal || 'All').replace(/[^a-zA-Z0-9_-]/g, '');
        const fileSem = semVal ? `Sem${semVal}` : 'Overall';
        const fileDate = now.toISOString().slice(0, 10);
        const fileName = `PTU_SGPA_CGPA_${fileDept}_${fileSem}_${fileDate}.xlsx`;

        XLSX.writeFile(wb, fileName);
        showToast('Grades summary exported to Excel', 'success');
    } catch (err) {
        console.error('Error in styled Excel export, running fallback:', err);
        // Fallback to standard export if any unexpected environment failure occurs
        try {
            const fallbackData = allGradesCache.map((g, i) => ({
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
            const wsFallback = XLSX.utils.json_to_sheet(fallbackData);
            const wbFallback = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wbFallback, wsFallback, 'SGPA_CGPA_Summary');
            XLSX.writeFile(wbFallback, `PTU_Grades_Summary_${new Date().toISOString().slice(0,10)}.xlsx`);
            showToast('Grades exported (basic mode)', 'info');
        } catch (innerErr) {
            showToast('Failed to export grades to Excel: ' + innerErr.message, 'error');
        }
    }
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

async function handleRcOtpVerify(event) {
    if (event && event.preventDefault) event.preventDefault();
    const btn = $('rc-otp-verify-btn');
    const msg = $('rc-otp-msg');
    const otp = $('rc-otp-input')?.value?.trim();

    if (msg) {
        msg.textContent = '';
        msg.style.color = '';
    }

    if (!otp || !/^[0-9A-Za-z]{6}$/.test(otp)) {
        if (msg) {
            msg.textContent = 'Please enter the valid 6-character OTP sent to your email.';
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
                    <img src="ptu_logo.webp" alt="PTU Logo" class="rc-pdf-logo-img" />
                </div>
                <div class="rc-pdf-uni-block">
                    <h1 class="rc-pdf-uni-title">Puducherry Technological University</h1>
                    <div class="rc-pdf-uni-desc">Kalapet, Puducherry – 605 014 | Established under Act No. 9 of 2012</div>
                    <div class="rc-pdf-uni-accred">Approved by AICTE &amp; UGC &nbsp;|&nbsp; NBA Accredited &nbsp;|&nbsp; www.ptuniv.edu.in</div>
                </div>
            </div>
            <div class="rc-pdf-header-divider"></div>
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

        <!-- Official Footer: Issue Info & Authentication -->
        <div class="rc-pdf-footer">
            <div class="rc-pdf-footer-left">
                <div class="rc-foot-note">This is a computer-generated academic record and does not require a physical signature.</div>
                <div class="rc-foot-note rc-foot-note-muted">Date of Issue: <strong>${issueDate}</strong> &nbsp;|&nbsp; Document Ref: <strong>PTU/RC/${escapeHtml(data.reg_no || '—')}</strong></div>
            </div>
            <div class="rc-pdf-footer-right">
                <div class="rc-seal-badge" aria-hidden="true">
                    <img src="ptu_logo.webp" alt="" class="rc-seal-img" />
                    <span class="rc-seal-ring"></span>
                </div>
                <div class="rc-signature-block">
                    <div class="rc-signature-line"></div>
                    <div class="rc-signature-label">Controller of Examinations</div>
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
async function handleDeveloperDirectReportCard(event) {
    if (event && event.preventDefault) event.preventDefault();
    const btn = $('developer-rc-btn');
    const msgEl = $('developer-rc-msg');
    const regNoInput = $('developer-rc-regno');
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
        const rcData = await authFetch(`/developer/report-card/${encodeURIComponent(regNo)}`);
        
        // Render into the developer report card container
        renderReportCard(rcData, 'developer-report-card-paper');
        
        // Open the developer report card modal
        const modal = $('developer-rc-modal');
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

function closeDeveloperRcModal() {
    const modal = $('developer-rc-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = '';
    }
}

function exportDeveloperReportCardPDF() {
    exportReportCardPDF();
}
// ============================================================
// [TESTING ONLY] DIRECT REPORT CARD GENERATOR (END)
// ============================================================

// ============================================================
// RESOURCES MANAGEMENT (Developer Personnel Directory)
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

    const isDeveloper = (userRole || '').toLowerCase() === 'developer';

    const sortedResources = resources.slice().sort((a, b) => {
        const nameA = (a.name || '').toLowerCase();
        const nameB = (b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });

    tbody.innerHTML = sortedResources.map((r, idx) => {
        const accType = r.account_type || 'Faculty';
        const typeClass = 'badge-' + accType.toLowerCase().replace(/\s+/g, '-');
        const statusBadge = r.has_account
            ? '<span class="badge badge-active" title="Registered User Account Active"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="vertical-align:middle;margin-right:3px;"><polyline points="20 6 9 17 4 12"/></svg>Registered</span>'
            : '<span class="badge badge-pending" title="Pre-registered. Waiting for user signup."><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle;margin-right:3px;"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>Pending Signup</span>';

        const actions = isDeveloper ? `
            <div class="table-actions" style="justify-content:center;">
              <button class="action-btn edit" onclick="editResource(${r.id})" title="Edit Resource"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
              <button class="action-btn delete" onclick="deleteResource(${r.id}, '${escapeHtml(r.name)}')" title="Delete Resource"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
            </div>
        ` : '—';

        return `
            <tr>
              <td>${idx + 1}</td>
              <td style="font-weight:600; color:var(--text-primary);">${escapeHtml(r.name)}</td>
              <td><code>${escapeHtml(r.email)}</code></td>
              <td><span class="badge ${typeClass}">${escapeHtml(accType)}</span></td>
              <td>${statusBadge}</td>
              <td class="developer-only" style="text-align:center;">${actions}</td>
            </tr>
        `;
    }).join('');

    updateResourcesCount(resources.length, allResourcesCache.length);

    // Sync developer-only visibility
    document.querySelectorAll('#resources-table .developer-only').forEach(el => el.style.display = isDeveloper ? '' : 'none');
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
        if (currentRole.toLowerCase() === 'developer') {
            allowed = ['Developer', 'TNP', 'Faculty', 'Exam Wing'];
        } else if (currentRole) {
            allowed = [currentRole];
        } else {
            allowed = ['Developer', 'TNP', 'Faculty', 'Exam Wing'];
        }
    }

    const isDeveloper = (userRole || '').toLowerCase() === 'developer' || allowed.includes('Developer');

    select.innerHTML = '';
    if (isEdit && editingResource) {
        // "1) An developer can only create new accounts and cannot change his/her account type to anything else,
        //     so remove developer choice in the change account type."
        const isEditingSelf = (editingResource.name && editingResource.name.toLowerCase() === (currentUsername || '').toLowerCase()) ||
                              (editingResource.email && editingResource.email.toLowerCase() === (currentUsername || '').toLowerCase()) ||
                              (editingResource.account_type === 'Developer');

        if (isEditingSelf && isDeveloper) {
            // Developer cannot change own account type
            select.innerHTML = `<option value="Developer" selected>Developer (Locked)</option>`;
            select.disabled = true;
        } else {
            // "remove developer choice in the change account type"
            select.disabled = false;
            const changeTypes = ['TNP', 'Faculty', 'Exam Wing'];
            select.innerHTML = changeTypes.map(t =>
                `<option value="${t}" ${t.toLowerCase() === (editingResource.account_type || '').toLowerCase() ? 'selected' : ''}>${t}</option>`
            ).join('');
        }
    } else {
        // Create mode
        select.disabled = false;
        if (isDeveloper) {
            // Developer can create accounts of all types
            select.innerHTML = `
                <option value="" disabled selected>— Select Account Type —</option>
                <option value="Developer">Developer</option>
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
    const account_type = $('resource-account-type').value || (id ? 'Developer' : '');

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

// Scroll-anywhere on hover - ultra-smooth momentum scrolling
function initScrollAnywhere() {
    const scrollSelectors = '.content-grid, .nav-menu, .table-scroll-region, .modal-body, .arrear-modal-body, .arrear-modal-table-container';
    const activeScrolls = new Map();

    // Industry standard scroll settings: 10 records per scroll, ultra-smooth deceleration
    const scrollMultiplier = 0.1;
    const friction = 0.95;
    const maxVelocity = 15;
    const minVelocity = 0.15;

    document.addEventListener('wheel', (e) => {
        const containers = document.querySelectorAll(scrollSelectors);
        let targetContainer = null;

        for (const c of containers) {
            if (c.contains(e.target)) {
                targetContainer = c;
                break;
            }
        }

        if (!targetContainer) return;

        const isInput = e.target.closest('input, textarea, select, [contenteditable], .filter-select');
        if (isInput) return;

        const canScrollY = targetContainer.scrollHeight > targetContainer.clientHeight + 2;
        const canScrollX = targetContainer.scrollWidth > targetContainer.clientWidth + 2;

        if (!activeScrolls.has(targetContainer)) {
            activeScrolls.set(targetContainer, { velY: 0, velX: 0, animId: null });
        }
        const scroll = activeScrolls.get(targetContainer);

        const deltaY = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * scrollMultiplier, maxVelocity);
        const deltaX = Math.sign(e.deltaX) * Math.min(Math.abs(e.deltaX || e.deltaY) * scrollMultiplier, maxVelocity);

        if (canScrollY && Math.abs(e.deltaY) > 0) {
            scroll.velY += deltaY;
        }
        if (canScrollX && Math.abs(e.deltaX || e.deltaY) > 0) {
            scroll.velX += deltaX;
        }

        if (scroll.animId) {
            cancelAnimationFrame(scroll.animId);
        }

        const animate = () => {
            const s = activeScrolls.get(targetContainer);
            if (!s) return;

            let stillMoving = false;

            if (canScrollY && Math.abs(s.velY) > minVelocity) {
                targetContainer.scrollTop += s.velY;
                s.velY *= friction;
                stillMoving = true;
            } else if (canScrollY) {
                s.velY = 0;
            }

            if (canScrollX && Math.abs(s.velX) > minVelocity) {
                targetContainer.scrollLeft += s.velX;
                s.velX *= friction;
                stillMoving = true;
            } else if (canScrollX) {
                s.velX = 0;
            }

            if (stillMoving) {
                s.animId = requestAnimationFrame(animate);
            } else {
                s.velY = 0;
                s.velX = 0;
                s.animId = null;
                activeScrolls.delete(targetContainer);
            }
        };

        scroll.animId = requestAnimationFrame(animate);
    }, { passive: false });
}

// ─── 17. Lifecycle & Event Binding ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    syncThemeCheckbox(); // Sync the animated toggle with current theme
    initParticleCanvas();
    loadPublicStats();
    evaluateSessionState();
    initLoginRoleSelector();
    initScrollAnywhere();

    // Results filters enter key immediate trigger
    $('filter-subject-code')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyFilters(true);
        }
    });
    $('filter-reg-no')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyFilters(true);
        }
    });

    // Bind OTP step listeners
    $('rc-lookup-btn')?.addEventListener('click', handleReportCardLookup);
    $('rc-lookup-form')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleReportCardLookup(e);
        }
    });

    $('rc-otp-verify-btn')?.addEventListener('click', handleRcOtpVerify);
    $('rc-otp-form')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleRcOtpVerify(e);
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
        // [TESTING ONLY] Escape closes developer report card modal
        if (e.key === 'Escape') {
            closeDeveloperRcModal();
        }
    });
});