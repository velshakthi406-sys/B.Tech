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
const MANAGEMENT_VIEWS = new Set([
    'dashboard', 'upload', 'results', 'students', 'subjects',
    'grades', 'classreport', 'visualization', 'resources'
]);
const savedManagementView = localStorage.getItem('gradePortalCurrentView');
let currentView = MANAGEMENT_VIEWS.has(savedManagementView) ? savedManagementView : 'resources';

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
    const iconSvgMap = {
        success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
        error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon" aria-hidden="true">${iconSvgMap[type] || iconSvgMap.success}</span>
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
    $('public-navbar')?.classList.add('public-nav--homepage');
    $('home-section')?.classList.remove('hidden');
    $('auth-section')?.classList.add('hidden');
    $('report-card-section')?.classList.add('hidden');
    $('dashboard-section')?.classList.add('hidden');

    $('nav-btn-home')?.classList.add('active');
    $('nav-btn-student')?.classList.remove('active');
    $('nav-btn-staff')?.classList.remove('active');

    loadPublicStats();
}

async function initSupportPortal() {
    const widget = $('support-widget');
    const toggleButton = $('support-toggle');
    const closeButton = $('support-close');
    const panel = $('support-panel');
    const payLink = $('support-pay-link');
    const gpayLink = $('support-gpay-link');
    const payLabel = $('support-pay-label');
    const copyButton = $('support-copy-upi');
    const upiDisplay = $('support-upi-display');
    const qrImage = $('support-qr-image');
    const qrHint = $('support-qr-hint');
    const status = $('support-status');
    const amountInput = $('support-custom-amount');
    const amountButtons = Array.from(document.querySelectorAll('[data-support-amount]'));
    if (!widget || !toggleButton || !panel || !closeButton || !payLink || !gpayLink || !payLabel || !copyButton || !upiDisplay || !qrImage || !qrHint || !status || !amountInput) return;
    const userAgent = navigator.userAgent || '';
    const isAndroid = /Android/i.test(userAgent);
    const canLaunchUpiApp = navigator.userAgentData?.mobile === true
        || /Android|iPhone|iPad|iPod|IEMobile|Windows Phone/i.test(userAgent)
        || (/Macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);

    const closePanel = (returnFocus = false) => {
        panel.hidden = true;
        toggleButton.setAttribute('aria-expanded', 'false');
        if (returnFocus) toggleButton.focus();
    };

    toggleButton.addEventListener('click', () => {
        const opening = panel.hidden;
        panel.hidden = !opening;
        toggleButton.setAttribute('aria-expanded', String(opening));
        if (opening) {
            (panel.querySelector('[data-support-amount]:not(:disabled)') || closeButton).focus();
        }
    });

    closeButton.addEventListener('click', () => closePanel(true));
    document.addEventListener('click', (event) => {
        if (!widget.contains(event.target)) closePanel(panel.contains(document.activeElement));
    });
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !panel.hidden) closePanel(true);
    });

    let supportConfig;
    let usingFallbackConfig = false;
    try {
        const response = await fetch(`${API_URL}/support/config`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Support payments are unavailable.');
        supportConfig = data;
    } catch (error) {
        const fallbackUpiId = $('support-qr-vpa')?.textContent.trim();
        const fallbackDisplayName = $('support-qr-name')?.textContent.trim();
        if (!fallbackUpiId || !fallbackDisplayName) {
            status.textContent = 'Payment settings could not be loaded. Scan the QR code to contribute.';
            return;
        }
        supportConfig = { enabled: true, upi_id: fallbackUpiId, display_name: fallbackDisplayName };
        usingFallbackConfig = true;
    }

    if (!supportConfig.enabled) {
        status.textContent = 'Scan the QR with any UPI app and enter your contribution amount.';
        payLabel.textContent = 'Use the QR code';
        return;
    }

    const upiId = String(supportConfig.upi_id || '');
    const displayName = String(supportConfig.display_name || '');
    if (!upiId || !displayName) {
        status.textContent = 'Scan the QR to pay; the UPI button setup is incomplete.';
        payLabel.textContent = 'UPI button unavailable';
        return;
    }

    upiDisplay.hidden = false;
    upiDisplay.textContent = `UPI ID: ${upiId}`;
    $('support-qr-name').textContent = displayName;
    $('support-qr-vpa').textContent = upiId;
    const qrMatchesPaymentDetails = qrImage.dataset.supportUpiId === upiId;
    qrImage.hidden = !qrMatchesPaymentDetails;
    qrHint.textContent = qrMatchesPaymentDetails
        ? 'Scan with any UPI app and enter your amount.'
        : 'QR unavailable for these UPI details. Use a payment button or copy the UPI ID.';
    copyButton.disabled = false;
    amountButtons.forEach((button) => { button.disabled = false; });
    amountInput.disabled = false;
    payLabel.textContent = 'Continue with UPI';
    gpayLink.hidden = !isAndroid;

    const updatePaymentLink = () => {
        const amount = Number(amountInput.value);
        const validAmount = Number.isInteger(amount) && amount >= 1 && amount <= 50000;
        if (!validAmount) {
            payLink.href = '#';
            payLink.setAttribute('aria-disabled', 'true');
            gpayLink.href = '#';
            gpayLink.setAttribute('aria-disabled', 'true');
            status.textContent = 'Choose an amount from ₹1 to ₹50,000.';
            return;
        }

        if (!canLaunchUpiApp) {
            payLink.href = '#';
            payLink.setAttribute('aria-disabled', 'true');
            gpayLink.href = '#';
            gpayLink.setAttribute('aria-disabled', 'true');
            payLabel.textContent = 'Open a UPI app';
            status.textContent = 'This browser cannot open UPI apps. Scan the QR with your phone or copy the UPI ID.';
            return;
        }

        const params = new URLSearchParams({
            pa: upiId,
            pn: displayName,
            am: amount.toFixed(2),
            cu: 'INR',
            tn: 'Support PTU Grade Portal'
        });
        payLink.href = `upi://pay?${params.toString()}`;
        payLink.setAttribute('aria-disabled', 'false');
        if (isAndroid) {
            gpayLink.href = `intent://pay?${params.toString()}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
            gpayLink.setAttribute('aria-disabled', 'false');
        }
        payLabel.textContent = 'Continue with UPI';
        status.textContent = usingFallbackConfig
            ? 'Payment settings are offline; using the UPI details shown here. Your contribution is optional.'
            : 'Your contribution is optional. Portal access remains free.';
    };

    amountButtons.forEach((button) => {
        button.addEventListener('click', () => {
            amountInput.value = button.dataset.supportAmount || '';
            amountButtons.forEach((item) => {
                const selected = item === button;
                item.classList.toggle('is-selected', selected);
                item.setAttribute('aria-pressed', String(selected));
            });
            updatePaymentLink();
        });
    });

    amountInput.addEventListener('input', () => {
        amountButtons.forEach((button) => {
            const selected = button.dataset.supportAmount === amountInput.value;
            button.classList.toggle('is-selected', selected);
            button.setAttribute('aria-pressed', String(selected));
        });
        updatePaymentLink();
    });

    payLink.addEventListener('click', (event) => {
        if (payLink.getAttribute('aria-disabled') === 'true') event.preventDefault();
    });

    gpayLink.addEventListener('click', (event) => {
        if (gpayLink.getAttribute('aria-disabled') === 'true') event.preventDefault();
    });

    copyButton.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(upiId);
            status.textContent = 'UPI ID copied. Open your UPI app to make a voluntary contribution.';
        } catch (error) {
            status.textContent = `Copy unavailable. Use this UPI ID in your UPI app: ${upiId}`;
        }
    });

    updatePaymentLink();
}

function openReportCardFromHome() {
    _activePublicView = 'report-card';
    $('public-navbar')?.classList.remove('hidden');
    $('public-navbar')?.classList.remove('public-nav--homepage');
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
    $('public-navbar')?.classList.remove('public-nav--homepage');
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
        publicNav?.classList.remove('public-nav--homepage');
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
    const isAdmin        = r === 'developer' || r === 'admin';
    const isExamWing     = r === 'exam wing';
    const isFaculty      = r === 'faculty';
    const isTNP          = r === 'tnp';

    // Views that should be hidden per role
    const hiddenViews = new Set();
    if (isFaculty)  { hiddenViews.add('upload'); hiddenViews.add('grades'); }
    if (isTNP)      { hiddenViews.add('upload'); hiddenViews.add('classreport'); hiddenViews.add('visualization'); }
    if (isExamWing) { hiddenViews.add('grades'); hiddenViews.add('classreport'); hiddenViews.add('visualization'); }
    if (!isFaculty && !isAdmin) { hiddenViews.add('visualization'); }

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

    // Track Students: Developer only
    const trackStudentsSection = $('developer-track-students-section');
    if (trackStudentsSection) {
        trackStudentsSection.style.display = isDeveloper ? '' : 'none';
    }

    const dashboardTools = $('dashboard-tools');
    if (dashboardTools) {
        dashboardTools.hidden = ![
            purgeSection,
            rcSection,
            uploadResourcesSection,
            trackStudentsSection
        ].some(section => section && section.style.display !== 'none');
    }

    // If currently on a hidden view, redirect to resources
    if (hiddenViews.has(currentView)) {
        switchView('resources');
    }
}

// ─── 11. Dashboard & View Switching ───────────────────────────
function switchView(view) {
    if (!MANAGEMENT_VIEWS.has(view)) view = 'resources';
    currentView = view;
    localStorage.setItem('gradePortalCurrentView', view);
    document.body.classList.toggle('resources-active', view === 'resources');
    document.body.classList.toggle('dashboard-active', view === 'dashboard');
    document.body.classList.toggle('results-active', view === 'results');
    document.body.classList.toggle('grades-active', view === 'grades');
    document.body.classList.toggle('students-active', view === 'students');
    document.body.classList.toggle('subjects-active', view === 'subjects');
    document.body.classList.toggle('upload-active', view === 'upload');
    document.body.classList.toggle('classreport-active', view === 'classreport');
    document.documentElement.classList.toggle('upload-active', view === 'upload');
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
        subjects: 'Subjects',
        grades: 'SGPA / CGPA Summary',
        classreport: 'Class Report',
        visualization: 'Data Visualization',
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
    if (view === 'visualization') {
        initVisualizationView();
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

    // Fetch all students to get counts per batch
    let students = [];
    try {
        students = await authFetch('/students');
    } catch (e) {
        console.warn('Could not load students for batch counts:', e);
    }

    const totalCount = students.length;
    let html = `<button type="button" class="dept-tab ${currentResultsBatchFilter === 'All' ? 'active' : ''}"
        aria-pressed="${currentResultsBatchFilter === 'All'}" onclick="selectResultsBatchTab('All')">
        All Batches <span class="badge-count">${totalCount}</span>
    </button>`;

    resultsAvailableBatches.forEach(b => {
        const count = students.filter(s => (s.batch || '').trim() === b).length;
        html += `<button type="button" class="dept-tab ${currentResultsBatchFilter === b ? 'active' : ''}"
            aria-pressed="${currentResultsBatchFilter === b}" onclick="selectResultsBatchTab('${escapeHtml(b)}')">
            ${escapeHtml(b)} <span class="badge-count">${count}</span>
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
        const passRateEl = $('results-pass-rate-number');
        const passDetailWrap = $('results-pass-detail-wrap');
        if (countEl) countEl.innerText = '0';
        if (fCountEl) fCountEl.innerText = '0';
        if (passRateEl) passRateEl.innerText = '0.0%';
        if (passDetailWrap) passDetailWrap.innerText = '(0/0)';
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

    // Update Pass Percentage indicator pill
    const passRateEl = $('results-pass-rate-number');
    const passDetailWrap = $('results-pass-detail-wrap');
    const passPill = $('results-pass-rate-pill');

    const FAIL_GRADES_SET = new Set(['F', 'AB', 'ABSENT', 'NC', 'E', 'Z', '']);
    const isPassGrade = r => {
        const g = (r.grade || '').trim().toUpperCase();
        if (!g || FAIL_GRADES_SET.has(g)) return false;
        if (r.grade_point !== undefined && r.grade_point !== null && Number(r.grade_point) === 0) return false;
        return true;
    };

    const passCount = allResultsCache.filter(isPassGrade).length;
    const passPct = total > 0 ? ((passCount / total) * 100).toFixed(1) : '0.0';

    const studentSet = new Set(allResultsCache.map(r => r.reg_no || r.student_id).filter(Boolean));
    const failedStudentSet = new Set(allResultsCache.filter(r => !isPassGrade(r)).map(r => r.reg_no || r.student_id).filter(Boolean));
    const passedStudentsCount = studentSet.size - failedStudentSet.size;
    const studentPassPct = studentSet.size > 0 ? ((passedStudentsCount / studentSet.size) * 100).toFixed(1) : '0.0';

    if (passRateEl) passRateEl.innerText = `${passPct}%`;
    if (passDetailWrap) passDetailWrap.innerText = `(${passCount}/${total})`;
    if (passPill) {
        passPill.title = `Results Pass Rate: ${passPct}% (${passCount} passed of ${total} results)` +
            (studentSet.size > 0 ? ` · Clear: ${passedStudentsCount}/${studentSet.size} students (${studentPassPct}%)` : '');
    }

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

function clearGradesFilters() {
    // Add animation to the reset button
    const btn = document.querySelector('#view-grades .btn-reset-enhanced');
    if (btn) {
        btn.classList.add('is-resetting');
        setTimeout(() => btn.classList.remove('is-resetting'), 550);
    }

    // Reset batch filter to 'All'
    currentGradeBatchFilter = 'All';
    const batchContainer = $('grade-batch-tabs-container');
    if (batchContainer) {
        batchContainer.querySelectorAll('.dept-tab').forEach(tab => {
            if (tab.textContent.trim().toLowerCase().includes('all')) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    // Reset department filter to 'All'
    currentGradeDeptFilter = 'All';
    const deptContainer = $('grade-dept-tabs-container');
    if (deptContainer) {
        deptContainer.querySelectorAll('.dept-tab').forEach(tab => {
            if (tab.textContent.trim().toLowerCase().includes('all')) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    // Reset semester filter
    if ($('grade-filter-sem')) $('grade-filter-sem').value = '';

    // Reset CGPA sort
    if ($('grade-filter-sort')) $('grade-filter-sort').value = 'none';

    // Reset credits sort
    if ($('grade-filter-credits-sort')) $('grade-filter-credits-sort').value = 'none';

    // Reset arrear filter to 'all'
    currentArrearFilter = ['all'];
    const allCheckbox = $('arrear-opt-all');
    if (allCheckbox) allCheckbox.checked = true;
    document.querySelectorAll('.arrear-opt').forEach(cb => cb.checked = false);
    const arrearLabel = $('grade-filter-arrears-label');
    if (arrearLabel) arrearLabel.innerText = 'ALL';

    // Reload grades with reset filters
    loadGrades();
}

function clearClassReportFilters() {
    // Add animation to the reset button
    const btn = document.querySelector('#view-classreport .btn-reset-enhanced');
    if (btn) {
        btn.classList.add('is-resetting');
        setTimeout(() => btn.classList.remove('is-resetting'), 550);
    }

    // Reset batch filter to 'All'
    currentCrBatchFilter = 'All';
    const batchContainer = $('cr-batch-tabs-container');
    if (batchContainer) {
        batchContainer.querySelectorAll('.dept-tab').forEach(tab => {
            if (tab.textContent.trim().toLowerCase().includes('all')) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    // Reset department filter to 'All'
    currentCrDeptFilter = 'All';
    const deptContainer = $('cr-dept-tabs-container');
    if (deptContainer) {
        deptContainer.querySelectorAll('.dept-tab').forEach(tab => {
            if (tab.textContent.trim().toLowerCase().includes('all')) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
    }

    // Reset semester filter
    if ($('cr-filter-sem')) $('cr-filter-sem').value = '';

    // Reset CGPA sort
    if ($('cr-filter-sort')) $('cr-filter-sort').value = 'none';

    // Reset credits sort
    if ($('cr-filter-credits-sort')) $('cr-filter-credits-sort').value = 'none';

    // Reset arrear filter to 'all'
    currentCrArrearFilter = ['all'];
    const allCheckbox = $('cr-arrear-opt-all');
    if (allCheckbox) allCheckbox.checked = true;
    document.querySelectorAll('.cr-arrear-opt').forEach(cb => cb.checked = false);
    const arrearLabel = $('cr-filter-arrears-label');
    if (arrearLabel) arrearLabel.innerText = 'ALL';

    // Reload class report with reset filters
    loadClassReport();
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

function enablePillTabDragging(container) {
    if (container.dataset.dragScrollReady) return;
    container.dataset.dragScrollReady = 'true';

    let pointerDown = false;
    let dragStarted = false;
    let startX = 0;
    let startScrollLeft = 0;
    let suppressClickUntil = 0;
    let activePointerId = null;
    let lastX = 0;
    let lastMoveTime = 0;
    let velocity = 0;
    let momentumFrame = 0;

    const stopMomentum = () => {
        if (momentumFrame) cancelAnimationFrame(momentumFrame);
        momentumFrame = 0;
        container.classList.remove('is-inertial');
    };

    const startMomentum = () => {
        if (Math.abs(velocity) < 0.08 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        container.classList.add('is-inertial');
        let previousTime = performance.now();
        const step = (time) => {
            const elapsed = Math.min(time - previousTime, 32);
            previousTime = time;
            container.scrollLeft += velocity * elapsed;
            velocity *= Math.pow(0.92, elapsed / 16);

            const maxScroll = container.scrollWidth - container.clientWidth;
            const atBoundary = (container.scrollLeft <= 0 && velocity < 0)
                || (container.scrollLeft >= maxScroll && velocity > 0);
            if (Math.abs(velocity) < 0.02 || atBoundary) {
                stopMomentum();
                return;
            }
            momentumFrame = requestAnimationFrame(step);
        };
        momentumFrame = requestAnimationFrame(step);
    };

    container.addEventListener('pointerdown', (event) => {
        if (event.pointerType !== 'mouse' || event.button !== 0) return;
        stopMomentum();
        pointerDown = true;
        dragStarted = false;
        activePointerId = event.pointerId;
        startX = event.clientX;
        startScrollLeft = container.scrollLeft;
        lastX = event.clientX;
        lastMoveTime = performance.now();
        velocity = 0;
    });

    document.addEventListener('pointermove', (event) => {
        if (!pointerDown || event.pointerId !== activePointerId) return;
        const distance = event.clientX - startX;
        if (!dragStarted && Math.abs(distance) < 5) return;
        dragStarted = true;
        container.classList.add('is-dragging');
        container.scrollLeft = startScrollLeft - distance;
        const now = performance.now();
        const elapsed = Math.max(now - lastMoveTime, 1);
        const instantVelocity = -(event.clientX - lastX) / elapsed;
        velocity = Math.max(-1.5, Math.min(1.5, velocity * 0.65 + instantVelocity * 0.35));
        lastX = event.clientX;
        lastMoveTime = now;
        event.preventDefault();
    });

    const finishDrag = (event) => {
        if (!pointerDown || event.pointerId !== activePointerId) return;
        pointerDown = false;
        activePointerId = null;
        if (dragStarted) suppressClickUntil = Date.now() + 250;
        container.classList.remove('is-dragging');
        if (dragStarted) startMomentum();
    };
    document.addEventListener('pointerup', finishDrag);
    document.addEventListener('pointercancel', finishDrag);

    container.addEventListener('click', (event) => {
        if (Date.now() > suppressClickUntil) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        suppressClickUntil = 0;
    }, true);
}

function buildSectionTabs(students) {
    const container = $('section-tabs-container');
    if (!container) return;
    enablePillTabDragging(container);
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

function clearStudentSearch() {
    const input = $('students-search-input');
    if (!input) return;
    input.value = '';
    filterStudentsSearch('');
    input.focus();
}

function resetStudentFilters() {
    currentBatchFilter = 'All';
    currentSectionFilter = 'All';
    currentStudentSearch = '';
    const input = $('students-search-input');
    if (input) input.value = '';
    buildBatchTabs(allStudentsCache);
    buildSectionTabs(allStudentsCache);
    renderStudents();
    input?.focus();
}

function renderStudents() {
    const tbody = $('students-tbody');
    if (!tbody) return;
    const table = $('students-table');

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
    const clearSearchButton = $('students-search-clear');
    if (clearSearchButton) clearSearchButton.hidden = !currentStudentSearch;

    if (!filtered.length) {
        table?.classList.add('is-empty');
        const hasActiveFilters = currentStudentSearch ||
                                 currentSectionFilter !== 'All' ||
                                 currentBatchFilter !== 'All';
        const title = total === 0 ? 'No student records yet' :
                      currentStudentSearch ? 'No matching students' :
                      'No students in this view';
        const description = total === 0 ? 'Student records will appear here once they are added.' :
                            currentStudentSearch ? `No records match “${escapeHtml(currentStudentSearch)}”.` :
                            'Try a different batch or section, or reset the selected filters.';
        const action = hasActiveFilters
            ? `<button type="button" class="students-empty-action" onclick="resetStudentFilters()">Reset filters</button>`
            : '';
        tbody.innerHTML = `<tr><td colspan="9" class="students-empty-cell">
            <div class="students-empty-state" role="status">
                <span class="students-empty-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                        <circle cx="11" cy="8" r="4" />
                        <path d="M3 21v-2a8 8 0 0 1 16 0v2M19 8v6M22 11h-6" />
                    </svg>
                </span>
                <strong>${title}</strong>
                <p>${description}</p>
                ${action}
            </div>
        </td></tr>`;
        return;
    }

    table?.classList.remove('is-empty');
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
    enablePillTabDragging(container);
    const deptSet = new Set();
    subjects.forEach(s => {
        if (s.department && s.department.trim()) {
            deptSet.add(s.department.trim());
        }
    });
    const sortedDepts = Array.from(deptSet).sort();
    let html = `<button type="button" class="dept-tab ${currentDeptFilter === 'All' ? 'active' : ''}" data-dept="All" aria-pressed="${currentDeptFilter === 'All'}" onclick="selectDeptTab('All')">
        All <span class="badge-count">${subjects.length}</span>
    </button>`;
    sortedDepts.forEach(dept => {
        const count = subjects.filter(s => s.department === dept).length;
        html += `<button type="button" class="dept-tab ${currentDeptFilter === dept ? 'active' : ''}" data-dept="${dept}" aria-pressed="${currentDeptFilter === dept}" onclick="selectDeptTab('${dept}')">
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
    const clearButton = $('subjects-search-clear');
    if (clearButton) clearButton.hidden = !currentSubjectSearch;
    renderSubjects();
}

function clearSubjectsSearch() {
    const input = $('subjects-search-input');
    if (!input) return;
    input.value = '';
    filterSubjectsSearch('');
    input.focus();
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
    const departmentCount = new Set(allSubjectsCache.map(s => (s.department || '').trim()).filter(Boolean)).size;
    const semesterCount = new Set(allSubjectsCache.map(s => (s.semester || '').trim()).filter(Boolean)).size;

    const summaryValues = [
        ['subjects-total-value', total],
        ['subjects-department-value', departmentCount],
        ['subjects-semester-value', semesterCount]
    ];
    summaryValues.forEach(([id, value]) => {
        const element = $(id);
        if (element) element.textContent = value;
    });

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
    const totalCredits = clearedHistory.reduce((sum, r) => sum + (Number(r.credits) || 0), 0);
    const rows = clearedHistory.map((r, idx) => {
        const attemptCount = r._allAttempts.length;
        const gradeDisplay = escapeHtml((r.grade || '').toUpperCase());
        return `
            <tr class="cleared-row" style="animation-delay: ${idx * 0.04}s">
                <td><code class="subject-code-cleared">${escapeHtml(r.subject_code || '')}</code></td>
                <td class="subject-name-cleared">${escapeHtml(r.subject_name || '')}</td>
                <td class="text-center"><span class="credit-badge credit-cleared">${Number(r.credits) || 0}</span></td>
                <td class="text-center">
                    <span class="grade-badge grade-cleared" title="Successfully cleared after ${attemptCount} attempt${attemptCount > 1 ? 's' : ''}">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" style="width:13px;height:13px;vertical-align:middle;margin-right:3px">
                            <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        ${gradeDisplay}
                    </span>
                </td>
                <td class="text-center">
                    <span class="attempt-badge attempt-cleared" title="${attemptCount} total attempt${attemptCount > 1 ? 's' : ''} to clear">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:11px;height:11px;margin-right:3px">
                            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                            <path d="M3 3v5h5"/>
                        </svg>
                        ${attemptCount}×
                    </span>
                </td>
            </tr>
        `;
    }).join('');

    return `
        <div class="arrear-cleared-section">
            <div class="arrear-cleared-header-wrap">
                <div class="arrear-cleared-header">
                    <div class="cleared-icon-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    </div>
                    <div class="cleared-header-content">
                        <h4 class="cleared-title">Previously Cleared Arrears</h4>
                        <p class="cleared-subtitle">Successfully recovered from ${count} subject${count > 1 ? 's' : ''} • ${totalCredits} credit${totalCredits !== 1 ? 's' : ''} earned back</p>
                    </div>
                </div>
                <div class="cleared-stats-pills">
                    <div class="cleared-stat-pill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                        </svg>
                        <span>${count} Subject${count !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="cleared-stat-pill">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"/>
                            <polyline points="12 6 12 12 16 14"/>
                        </svg>
                        <span>${totalCredits} Credit${totalCredits !== 1 ? 's' : ''}</span>
                    </div>
                </div>
            </div>
            <div class="arrear-table-wrapper">
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
    let html = `<button type="button" class="dept-tab ${currentGradeBatchFilter === 'All' ? 'active' : ''}"
        data-batch="All" aria-pressed="${currentGradeBatchFilter === 'All'}" onclick="selectGradeBatchTab('All')">
        All Batches <span class="badge-count">${students.length}</span>
    </button>`;
    sortedBatches.forEach(b => {
        const count = students.filter(s => (s.batch || '').trim() === b).length;
        html += `<button type="button" class="dept-tab ${currentGradeBatchFilter === b ? 'active' : ''}"
            data-batch="${escapeHtml(b)}" aria-pressed="${currentGradeBatchFilter === b}" onclick="selectGradeBatchTab('${escapeHtml(b)}')">
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
    enablePillTabDragging(container);
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
    let html = `<button type="button" class="dept-tab ${currentGradeDeptFilter === 'All' ? 'active' : ''}"
        data-dept="All" aria-pressed="${currentGradeDeptFilter === 'All'}" onclick="selectGradeDeptTab('All')">
        All <span class="badge-count">${students.length}</span>
    </button>`;
    sortedTabs.forEach(tab => {
        html += `<button type="button" class="dept-tab ${currentGradeDeptFilter === tab ? 'active' : ''}"
            data-dept="${escapeHtml(tab)}" aria-pressed="${currentGradeDeptFilter === tab}" onclick="selectGradeDeptTab('${escapeHtml(tab)}')">
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

function updateGradesOverview(grades, semester) {
    const records = Array.isArray(grades) ? grades : [];
    const studentCount = records.length;
    const scoreKey = semester ? 'sgpa' : 'cgpa';
    const scores = records
        .map(grade => grade[scoreKey])
        .filter(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)))
        .map(Number);
    const average = scores.length
        ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2)
        : '—';
    const arrears = records.reduce((sum, grade) => {
        const count = Number(grade.arrear_count);
        return sum + (Number.isFinite(count) ? Math.max(0, count) : 0);
    }, 0);

    if ($('grades-summary-students')) $('grades-summary-students').innerText = studentCount;
    if ($('grades-summary-average')) $('grades-summary-average').innerText = average;
    if ($('grades-summary-average-label')) {
        $('grades-summary-average-label').innerText = semester ? 'Average SGPA' : 'Average CGPA';
    }
    if ($('grades-summary-average-note')) {
        $('grades-summary-average-note').innerText = semester
            ? `Semester ${semester} performance`
            : 'Overall academic standing';
    }
    if ($('grades-summary-arrears')) $('grades-summary-arrears').innerText = arrears;
    if ($('grades-summary-arrears-note')) {
        $('grades-summary-arrears-note').innerText = `Across ${studentCount} students in view`;
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
        updateGradesOverview(data, sem);

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
        updateGradesOverview([], $('grade-filter-sem')?.value || '');
        const crCountEl = $('cr-showing-count');
        const crPassRateEl = $('cr-pass-rate-number');
        const crPassDetailWrap = $('cr-pass-detail-wrap');
        if (crCountEl) crCountEl.innerText = '0';
        if (crPassRateEl) crPassRateEl.innerText = '0.0%';
        if (crPassDetailWrap) crPassDetailWrap.innerText = '(0/0)';
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
    enablePillTabDragging(container);
    const students = await ensureStudentsCache();
    const batches = new Set();
    students.forEach(s => {
        if (s.batch && s.batch.trim()) batches.add(s.batch.trim());
    });
    const sortedBatches = Array.from(batches).sort();
    let html = `<button type="button" class="dept-tab ${currentCrBatchFilter === 'All' ? 'active' : ''}"
        data-batch="All" aria-pressed="${currentCrBatchFilter === 'All'}" onclick="selectCrBatchTab('All')">
        All Batches <span class="badge-count">${students.length}</span>
    </button>`;
    sortedBatches.forEach(b => {
        const count = students.filter(s => (s.batch || '').trim() === b).length;
        html += `<button type="button" class="dept-tab ${currentCrBatchFilter === b ? 'active' : ''}"
            data-batch="${escapeHtml(b)}" aria-pressed="${currentCrBatchFilter === b}" onclick="selectCrBatchTab('${escapeHtml(b)}')">
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
    enablePillTabDragging(container);
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
    let html = `<button type="button" class="dept-tab ${currentCrDeptFilter === 'All' ? 'active' : ''}"
        data-dept="All" aria-pressed="${currentCrDeptFilter === 'All'}" onclick="selectCrDeptTab('All')">
        All <span class="badge-count">${students.length}</span>
    </button>`;
    sortedTabs.forEach(tab => {
        html += `<button type="button" class="dept-tab ${currentCrDeptFilter === tab ? 'active' : ''}"
            data-dept="${escapeHtml(tab)}" aria-pressed="${currentCrDeptFilter === tab}" onclick="selectCrDeptTab('${escapeHtml(tab)}')">
            ${escapeHtml(tab)} <span class="badge-count">${tabCounts[tab]}</span>
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
    tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">Computing Class Report (SGPA & CGPA)…</td></tr>';

    try {
        const deptVal = currentCrDeptFilter !== 'All' ? currentCrDeptFilter : '';
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
        const sem = $('cr-filter-sem')?.value || '';
        const batch = currentCrBatchFilter !== 'All' ? currentCrBatchFilter : '';
        const cgpaSort = $('cr-filter-sort')?.value || 'desc';
        const creditsSort = $('cr-filter-credits-sort')?.value || 'none';

        let url = '/grades/summary?';
        if (dept) url += `department=${encodeURIComponent(dept)}&`;
        if (section) url += `section=${encodeURIComponent(section)}&`;
        if (sem)  url += `semester=${encodeURIComponent(sem)}&`;
        if (batch) url += `batch=${encodeURIComponent(batch)}&`;

        currentCrArrearFilter.forEach(a => {
            url += `arrears=${encodeURIComponent(a)}&`;
        });

        const data = await authFetch(url);

        // Sorting (Exact replica of SGPA/CGPA sorting)
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

        allClassReportCache = data;

        // Compute Pass Percentage of selected filters
        const totalStudents = data.length;
        const clearCount = data.filter(g => (Number(g.arrear_count) || 0) === 0).length;
        const passPct = totalStudents > 0 ? ((clearCount / totalStudents) * 100).toFixed(1) : '0.0';

        const crCountEl = $('cr-showing-count');
        const crPassRateEl = $('cr-pass-rate-number');
        const crPassDetailWrap = $('cr-pass-detail-wrap');
        const crPassPill = $('cr-pass-rate-pill');
        const averageLabelEl = $('cr-summary-average-label');
        const averageEl = $('cr-summary-average');
        const averageNoteEl = $('cr-summary-average-note');

        if (crCountEl) crCountEl.innerText = totalStudents;
        if (crPassRateEl) crPassRateEl.innerText = `${passPct}%`;
        if (crPassDetailWrap) crPassDetailWrap.innerText = `(${clearCount}/${totalStudents})`;
        const scoreKey = sem ? 'sgpa' : 'cgpa';
        const scores = data
            .map(grade => grade[scoreKey])
            .filter(value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value)))
            .map(Number);
        const average = scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2) : '—';
        if (averageLabelEl) averageLabelEl.innerText = sem ? 'Average SGPA' : 'Average CGPA';
        if (averageEl) averageEl.innerText = average;
        if (averageNoteEl) averageNoteEl.innerText = sem
            ? `Across ${scores.length} students in the selected semester`
            : 'Overall academic standing';
        if (crPassPill) {
            crPassPill.title = `Pass Percentage: ${passPct}% (${clearCount} of ${totalStudents} students passed with 0 arrears)`;
        }

        if (!data.length) {
            tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">No students match current criteria.</td></tr>';
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
        const crCountEl = $('cr-showing-count');
        const crPassRateEl = $('cr-pass-rate-number');
        const crPassDetailWrap = $('cr-pass-detail-wrap');
        const averageEl = $('cr-summary-average');
        const averageNoteEl = $('cr-summary-average-note');
        if (crCountEl) crCountEl.innerText = '0';
        if (crPassRateEl) crPassRateEl.innerText = '0.0%';
        if (crPassDetailWrap) crPassDetailWrap.innerText = '(0/0)';
        if (averageEl) averageEl.innerText = '—';
        if (averageNoteEl) averageNoteEl.innerText = 'No class data available';
    }
}

function exportClassReportToExcel() {
    if (!allClassReportCache || !allClassReportCache.length) {
        showToast('No class report data to export', 'warning');
        return;
    }

    try {
        // ── 1. Extract Active Filter States ──
        const deptVal = currentCrDeptFilter || 'All';
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

        const semVal = $('cr-filter-sem')?.value || '';
        const semDisplay = semVal ? `Semester ${semVal} (SGPA)` : 'Overall Cumulative (CGPA)';

        const batchVal = currentCrBatchFilter || 'All';
        const batchDisplay = (batchVal && batchVal.toLowerCase() !== 'all') ? batchVal : 'All Batches';

        let arrearDisplay = 'All Students (No Filter)';
        if (typeof currentCrArrearFilter !== 'undefined' && currentCrArrearFilter && !currentCrArrearFilter.includes('all') && currentCrArrearFilter.length > 0) {
            const arrearLabels = {
                '0': 'No Arrears (Clear Only)',
                '1': '1 Arrear Only',
                '2': '2 Arrears Only',
                '3+': '3+ Arrears Only'
            };
            arrearDisplay = currentCrArrearFilter.map(a => arrearLabels[a] || `${a} Arrears`).join(', ');
        }

        const cgpaSort = $('cr-filter-sort')?.value || 'desc';
        const sortDisplay = cgpaSort === 'desc'
            ? (semVal ? 'SGPA (Highest to Lowest)' : 'CGPA (Highest to Lowest)')
            : cgpaSort === 'asc'
                ? (semVal ? 'SGPA (Lowest to Highest)' : 'CGPA (Lowest to Highest)')
                : 'None / Natural Order';

        const creditsSort = $('cr-filter-credits-sort')?.value || 'none';
        const creditsSortDisplay = creditsSort === 'asc' ? 'Total Credits (Ascending)' : creditsSort === 'desc' ? 'Total Credits (Descending)' : 'None';

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
        const exportTimestamp = `${dateStr}, ${timeStr}`;

        // ── 2. Summary Statistics ──
        const totalStudents = allClassReportCache.length;
        const clearCount = allClassReportCache.filter(g => (Number(g.arrear_count) || 0) === 0).length;
        const arrearStudentsCount = totalStudents - clearCount;
        const clearRate = totalStudents > 0 ? ((clearCount / totalStudents) * 100).toFixed(1) + '%' : '0%';

        const validSgpas = allClassReportCache.map(g => Number(g.sgpa)).filter(v => !isNaN(v) && v >= 0);
        const avgSgpa = validSgpas.length ? (validSgpas.reduce((a, b) => a + b, 0) / validSgpas.length).toFixed(2) : null;

        const validCgpas = allClassReportCache.map(g => Number(g.cgpa)).filter(v => !isNaN(v) && v >= 0);
        const avgCgpa = validCgpas.length ? (validCgpas.reduce((a, b) => a + b, 0) / validCgpas.length).toFixed(2) : null;

        const validTotCredits = allClassReportCache.map(g => Number(g.total_credits)).filter(v => !isNaN(v) && v > 0);
        const avgTotCredits = validTotCredits.length ? Math.round(validTotCredits.reduce((a, b) => a + b, 0) / validTotCredits.length) : null;

        const validEarnCredits = allClassReportCache.map(g => Number(g.earned_credits)).filter(v => !isNaN(v) && v >= 0);
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
            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'CCFBF1' } },
            fill: { fgColor: { rgb: '0F766E' } },
            alignment: { horizontal: 'center', vertical: 'center' }
        };
        for (let c = 0; c <= 9; c++) {
            setCell(1, c, c === 0 ? 'OFFICIAL CLASS REPORT — SGPA / CGPA PERFORMANCE & ARREAR ANALYSIS' : '', subtitleStyle);
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
            font: { name: 'Calibri', sz: 9.5, bold: true, color: { rgb: '0F766E' } }
        }));

        // Row 5: Blank Spacer Row
        for (let c = 0; c <= 9; c++) {
            setCell(5, c, '', { fill: { fgColor: { rgb: 'FFFFFF' } } });
        }

        // Row 6: Main Table Column Headers
        const tableHeaders = ['Rank', 'Register No', 'Student Name', 'Department', 'Semester', 'SGPA', 'CGPA', 'Total Credits', 'Earned Credits', 'Arrear Status'];
        const thBaseStyle = {
            font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: '0F766E' } },
            alignment: { horizontal: 'center', vertical: 'center' },
            border: {
                top: { style: 'medium', color: { rgb: '115E59' } },
                bottom: { style: 'medium', color: { rgb: '115E59' } },
                left: { style: 'thin', color: { rgb: '99F6E4' } },
                right: { style: 'thin', color: { rgb: '99F6E4' } }
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

        allClassReportCache.forEach((g, idx) => {
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

            // Col 6: CGPA (Highlighted Teal)
            const hasCgpa = g.cgpa != null && g.cgpa !== '' && !isNaN(Number(g.cgpa));
            setCell(r, 6, hasCgpa ? Number(g.cgpa) : '—', {
                font: { name: 'Calibri', sz: 10.5, bold: true, color: { rgb: '0F766E' } },
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
            font: Object.assign({}, footerValStyle.font, { color: { rgb: '0F766E' } }),
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

        // Merges
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 9 } },
            { s: { r: 3, c: 1 }, e: { r: 3, c: 2 } },
            { s: { r: 3, c: 4 }, e: { r: 3, c: 5 } },
            { s: { r: 4, c: 1 }, e: { r: 4, c: 2 } },
            { s: { r: 4, c: 4 }, e: { r: 4, c: 5 } },
            { s: { r: summaryRowIndex, c: 0 }, e: { r: summaryRowIndex, c: 4 } }
        ];

        // Row Heights
        const rowHeights = [
            { hpt: 32 }, // Row 0
            { hpt: 20 }, // Row 1
            { hpt: 18 }, // Row 2
            { hpt: 19 }, // Row 3
            { hpt: 19 }, // Row 4
            { hpt: 10 }, // Row 5
            { hpt: 24 }  // Row 6
        ];
        for (let i = 0; i < totalStudents; i++) {
            rowHeights.push({ hpt: 19 });
        }
        rowHeights.push({ hpt: 22 });
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
        XLSX.utils.book_append_sheet(wb, ws, 'Class_Report');

        const fileDept = (deptVal || 'All').replace(/[^a-zA-Z0-9_-]/g, '');
        const fileSem = semVal ? `Sem${semVal}` : 'Overall';
        const fileDate = now.toISOString().slice(0, 10);
        const fileName = `PTU_Class_Report_${fileDept}_${fileSem}_${fileDate}.xlsx`;

        XLSX.writeFile(wb, fileName);
        showToast('Class Report exported to Excel', 'success');
    } catch (err) {
        console.error('Error in styled Class Report Excel export:', err);
        showToast('Export failed: ' + err.message, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// DATA VISUALIZATION (Faculty & Admin Feature)
// ═══════════════════════════════════════════════════════════════
const VIS_DEPT_NAMES = {
    'CE': 'Civil Engineering',
    'CHE': 'Chemical Engineering',
    'CSE': 'Computer Science & Engineering',
    'ECE': 'Electronics & Communication Engineering',
    'EEE': 'Electrical & Electronics Engineering',
    'EIE': 'Electronics & Instrumentation Engineering',
    'IT': 'Information Technology',
    'ME': 'Mechanical Engineering',
    'MT': 'Mechatronics Engineering'
};

let currentVisBatchFilter = 'All';
let currentVisData = null;
let currentVisSections = [];
let visChartInstance = null;
let currentVisGpaData = null;
// ═══════════════════════════════════════════════════════════════
// VISUALIZATION SUB-TAB STATE
// ═══════════════════════════════════════════════════════════════
let currentVisTab = 'pass';  // 'pass' | 'gpa'
let visGpaChartInstance = null;
let currentGpaRegNo = '';

// ── Master Visualization View Initializer ──
async function initVisualizationView() {
    // 1. Activate active sub-tab (defaults to 'pass')
    switchVisTab(currentVisTab || 'pass');

    // 2. Populate Batch filter dropdown
    await populateVisBatchDropdown();

    // 3. Populate autocomplete datalist for GPA Trend
    populateGpaDatalist();

    // 4. Load Pass Percentage data
    await loadVisualizationData();
}

// ── Batch Filter Handler ──
function onVisBatchChange(val) {
    currentVisBatchFilter = val || 'All';
    const semSelect = $('vis-filter-sem');
    if (semSelect) semSelect.innerHTML = '<option value="All">All Semesters</option>';
    const deptSelect = $('vis-filter-dept');
    if (deptSelect) deptSelect.innerHTML = '<option value="All">All Departments</option>';
    loadVisualizationData();
}

// ── Populate Visualization Batch Dropdown ──
async function populateVisBatchDropdown() {
    const batchSelect = $('vis-filter-batch');
    if (!batchSelect) return;
    try {
        let batches = [];
        try {
            batches = await authFetch('/students/batches');
        } catch (e) {
            console.warn('Fallback to student cache for vis batches:', e);
        }
        if (!batches || !batches.length) {
            const students = await ensureStudentsCache();
            const set = new Set();
            students.forEach(s => {
                if (s.batch && s.batch.trim()) set.add(s.batch.trim());
            });
            batches = Array.from(set).sort();
        }
        let html = '<option value="All">All Batches</option>';
        (batches || []).forEach(b => {
            html += `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`;
        });
        batchSelect.innerHTML = html;
        batchSelect.value = currentVisBatchFilter || 'All';
    } catch (err) {
        console.warn('Could not populate visualization batch dropdown:', err);
    }
}

// ── Tab switcher ──
function switchVisTab(tab) {
    currentVisTab = tab;

    // Update tab buttons
    document.querySelectorAll('.vis-tab').forEach(btn => {
        const isActive = btn.id === `vis-tab-${tab}`;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    // Show/hide panes
    ['pass', 'gpa', 'subject', 'placement'].forEach(t => {
        const pane = $(`vis-pane-${t}`);
        if (pane) pane.classList.toggle('hidden', t !== tab);
    });

    if (tab === 'subject') {
        if (!currentVisSubjectData) {
            populateSubjectBatchDropdown().then(() => loadSubjectAnalytics());
        }
    } else if (tab === 'placement') {
        if (!currentVisPlacementData) {
            populatePlacementBatchDropdown().then(() => loadPlacementEligibility());
        }
    }
}

// ── Populate autocomplete datalist for GPA search ──
function populateGpaDatalist() {
    const datalist = $('vis-gpa-reg-datalist');
    if (!datalist || datalist.children.length > 0) return;

    if (allStudentsCache && allStudentsCache.length) {
        let options = '';
        allStudentsCache.slice(0, 100).forEach(s => {
            if (s.reg_no) {
                options += `<option value="${escapeHtml(s.reg_no)}">${escapeHtml(s.name)} (${escapeHtml(s.department || '')})</option>`;
            }
        });
        datalist.innerHTML = options;
    }
}

// ── GPA input controls ──
function onGpaRegnoInput(val) {
    const clearBtn = $('vis-gpa-clear-btn');
    if (clearBtn) {
        clearBtn.style.display = (val && val.trim().length > 0) ? 'flex' : 'none';
    }
    // If input changed from current loaded student, reveal empty state
    if (val.trim() !== currentGpaRegNo && currentGpaRegNo) {
        $('vis-gpa-content')?.classList.add('hidden');
        $('vis-gpa-error')?.classList.add('hidden');
        $('vis-gpa-empty')?.classList.remove('hidden');
    }
}

function clearGpaInput() {
    const input = $('vis-gpa-regno-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    const clearBtn = $('vis-gpa-clear-btn');
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    $('vis-gpa-content')?.classList.add('hidden');
    $('vis-gpa-error')?.classList.add('hidden');
    $('vis-gpa-empty')?.classList.remove('hidden');
    currentGpaRegNo = '';
}

// ── Load GPA chart for a student (Executive UI/UX standard) ──
async function loadGPAChart() {
    const input = $('vis-gpa-regno-input');
    const regNo = (input ? input.value : '').trim();
    if (!regNo) {
        showToast('Please enter a Register Number', 'warning');
        return;
    }

    currentGpaRegNo = regNo;

    const btn = $('vis-gpa-search-btn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Searching…`;
    }

    // State transitions
    $('vis-gpa-content')?.classList.add('hidden');
    $('vis-gpa-empty')?.classList.add('hidden');
    $('vis-gpa-error')?.classList.add('hidden');
    $('vis-gpa-loading')?.classList.remove('hidden');

    try {
        const data = await authFetch(`/visualization/student-gpa/${encodeURIComponent(regNo)}`);

        if (!data || !data.semesters || data.semesters.length === 0) {
            $('vis-gpa-loading')?.classList.add('hidden');
            const errCard = $('vis-gpa-error');
            if (errCard) {
                errCard.classList.remove('hidden');
                const titleEl = $('vis-gpa-error-title');
                const msgEl = $('vis-gpa-error-msg');
                if (titleEl) titleEl.innerText = `No Academic Records for "${regNo}"`;
                if (msgEl) msgEl.innerText = 'No published semester results were found for this registration number.';
            }
            showToast('No GPA data found for this student', 'warning');
            return;
        }

        currentVisGpaData = data;

        // ── 1. Update Student Profile Header ──
        const nameEl    = $('vis-gpa-student-name');
        const deptBadge = $('vis-gpa-dept-badge');
        const metaEl    = $('vis-gpa-student-meta');
        const avatarEl  = $('vis-gpa-avatar');

        if (nameEl) nameEl.innerText = escapeHtml(data.name || '—');
        if (deptBadge) {
            deptBadge.innerText = [data.department, data.section ? `Sec ${data.section}` : '', data.batch].filter(Boolean).join(' · ');
        }
        if (metaEl) {
            metaEl.innerText = `Reg No: ${data.reg_no} · Programme: ${data.programme || 'Bachelor of Technology'} · Status: Active`;
        }
        if (avatarEl) {
            avatarEl.innerText = (data.name || '?')[0].toUpperCase();
        }

        // ── 2. Sort Semesters Chronologically ──
        const SEM_ORDER = ['I','II','III','IV','V','VI','VII','VIII'];
        const semesters = [...data.semesters].sort((a, b) => {
            const ai = SEM_ORDER.indexOf(a.semester);
            const bi = SEM_ORDER.indexOf(b.semester);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

        // ── 3. Populate 4 Executive KPI Cards ──
        const cgpaVal = data.cgpa != null ? Number(data.cgpa).toFixed(2) : '0.00';
        const cgpaNum = Number(cgpaVal);

        const kpiCgpaEl = $('vis-gpa-kpi-cgpa');
        const kpiClassEl = $('vis-gpa-kpi-class');
        if (kpiCgpaEl) kpiCgpaEl.innerText = cgpaVal;
        if (kpiClassEl) {
            let standingText = 'Pass Standing';
            if (cgpaNum >= 8.5) standingText = 'First Class with Distinction (Tier 1)';
            else if (cgpaNum >= 6.5) standingText = 'First Class (Tier 2)';
            else if (cgpaNum >= 5.5) standingText = 'Second Class (Tier 3)';
            kpiClassEl.innerText = `Standing: ${standingText}`;
        }

        // Credits KPI
        const totalCredits = Number(data.total_credits != null && Number(data.total_credits) > 0
            ? data.total_credits
            : semesters.reduce((sum, s) => sum + (Number(s.total_credits) || 0), 0));
        const earnedCredits = Number(data.earned_credits != null && Number(data.earned_credits) > 0
            ? data.earned_credits
            : semesters.reduce((sum, s) => sum + (Number(s.earned_credits) || 0), 0));
        const creditPct = totalCredits > 0 ? Math.min(100, Math.round((earnedCredits / totalCredits) * 100)) : 100;

        const kpiCreditsEl = $('vis-gpa-kpi-credits');
        const kpiCreditPctEl = $('vis-gpa-kpi-credit-pct');
        if (kpiCreditsEl) kpiCreditsEl.innerText = `${earnedCredits.toFixed(1)} / ${totalCredits.toFixed(1)} Cr`;
        if (kpiCreditPctEl) kpiCreditPctEl.innerText = `${creditPct}% Completion Rate (${semesters.length} Semesters)`;

        // Arrear Standing KPI
        const activeArrears = data.active_arrears != null ? data.active_arrears : (data.has_arrears ? 1 : 0);
        const kpiArrearsEl = $('vis-gpa-kpi-arrears');
        const kpiArrearSubEl = $('vis-gpa-kpi-arrear-sub');
        const arrearCard = $('vis-gpa-arrear-card');
        const arrearIcon = $('vis-gpa-arrear-icon');

        if (kpiArrearsEl) kpiArrearsEl.innerText = activeArrears === 0 ? '0 Active' : `${activeArrears} Pending`;
        if (kpiArrearSubEl) {
            kpiArrearSubEl.innerText = activeArrears === 0
                ? 'All registered subjects cleared'
                : `${activeArrears} active uncleared arrear subject${activeArrears > 1 ? 's' : ''}`;
        }
        if (arrearCard) {
            arrearCard.className = activeArrears === 0 ? 'stat-card green' : 'stat-card red';
        }
        if (arrearIcon) {
            arrearIcon.style.background = activeArrears === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)';
            arrearIcon.style.color = activeArrears === 0 ? 'var(--emerald,#10b981)' : 'var(--red,#ef4444)';
        }

        // Latest Velocity KPI
        const lastSem = semesters[semesters.length - 1];
        const prevSem = semesters.length > 1 ? semesters[semesters.length - 2] : null;

        const kpiLatestEl = $('vis-gpa-kpi-latest');
        const kpiDeltaEl = $('vis-gpa-kpi-delta');

        if (kpiLatestEl && lastSem) {
            const lastSgpa = lastSem.sgpa != null ? Number(lastSem.sgpa).toFixed(2) : '—';
            kpiLatestEl.innerText = `${lastSgpa} (Sem ${lastSem.semester})`;
        }
        if (kpiDeltaEl && lastSem) {
            if (prevSem && lastSem.sgpa != null && prevSem.sgpa != null) {
                const diff = (Number(lastSem.sgpa) - Number(prevSem.sgpa)).toFixed(2);
                const isPositive = Number(diff) >= 0;
                kpiDeltaEl.innerHTML = `<span style="color:${isPositive ? 'var(--emerald,#10b981)' : 'var(--amber,#f59e0b)'}; font-weight:700;">
                    ${isPositive ? '+' : ''}${diff} ${isPositive ? '↑' : '↓'}
                </span> vs Sem ${prevSem.semester}`;
            } else {
                kpiDeltaEl.innerText = `Baseline semester performance`;
            }
        }

        // Update chart subtitle and table counter
        const chartSub = $('vis-gpa-chart-subtitle');
        const tableCount = $('vis-gpa-table-count');
        const cgpaPill = $('vis-gpa-cgpa-pill');

        if (chartSub) chartSub.innerText = `${data.name} (${data.reg_no}) · Overall CGPA: ${cgpaVal}`;
        if (tableCount) tableCount.innerText = `${semesters.length} Semester${semesters.length !== 1 ? 's' : ''} Evaluated`;
        if (cgpaPill) {
            cgpaPill.innerHTML = `<span class="dash"></span> CGPA Ref (${cgpaVal})`;
        }

        // ── 4. Build Detailed Breakdown Table ──
        const tbody = $('vis-gpa-tbody');
        if (tbody) {
            tbody.innerHTML = semesters.map((s, idx) => {
                const sgpaNum = s.sgpa != null ? Number(s.sgpa) : null;
                const sgpaStr = sgpaNum != null ? sgpaNum.toFixed(2) : '—';

                // Classification tier badge
                let tierClass = 'benchmark-red';
                let tierLabel = 'Needs Focus (<6.0)';
                if (sgpaNum != null) {
                    if (sgpaNum >= 8.5) {
                        tierClass = 'benchmark-green';
                        tierLabel = 'Distinction (≥8.5)';
                    } else if (sgpaNum >= 7.0) {
                        tierClass = 'benchmark-blue';
                        tierLabel = 'Good (7.0–8.4)';
                    } else if (sgpaNum >= 6.0) {
                        tierClass = 'benchmark-amber';
                        tierLabel = 'Average (6.0–6.9)';
                    }
                }

                const semArrears = s.arrears || 0;
                const arrearTag = semArrears === 0
                    ? `<span style="color:var(--emerald,#10b981);font-weight:600;">0 Clear</span>`
                    : `<span style="color:var(--danger,#ef4444);font-weight:700;">${semArrears} Arrear${semArrears > 1 ? 's' : ''}</span>`;

                return `<tr>
                    <td style="text-align:center;">${idx + 1}</td>
                    <td><strong>Semester ${escapeHtml(s.semester)}</strong></td>
                    <td style="text-align:center;">
                        ${sgpaNum != null
                            ? `<span class="counter-number" style="font-weight:800; font-size:0.95rem;">${sgpaStr}</span>`
                            : '<span style="color:var(--text-light)">—</span>'}
                    </td>
                    <td style="text-align:center;">${s.total_credits != null ? Number(s.total_credits).toFixed(1) : '—'}</td>
                    <td style="text-align:center;">${s.earned_credits != null ? Number(s.earned_credits).toFixed(1) : '—'}</td>
                    <td style="text-align:center;">${s.subjects ? s.subjects.length : (s.subjects_count || '—')}</td>
                    <td style="text-align:center;">${arrearTag}</td>
                    <td>
                        <span class="benchmark-pill ${tierClass}" style="font-size:0.72rem; padding:3px 10px;">
                            <span class="dot"></span> ${tierLabel}
                        </span>
                    </td>
                </tr>`;
            }).join('');
        }

        // ── 5. Render Line Chart (Chart.js) ──
        const canvas = $('vis-gpa-chart');
        if (canvas) {
            if (visGpaChartInstance) {
                visGpaChartInstance.destroy();
                visGpaChartInstance = null;
            }

            const labels = semesters.map(s => `Sem ${s.semester}`);
            const sgpaData = semesters.map(s => s.sgpa != null ? Number(s.sgpa) : null);
            const cgpaLineData = labels.map(() => data.cgpa != null ? Number(data.cgpa) : null);

            const ctx = canvas.getContext('2d');
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark-theme');
            const gridColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
            const textColor = isDark ? '#94a3b8' : '#64748b';

            // Area Gradient Fill
            const gradient = ctx.createLinearGradient(0, 0, 0, 360);
            gradient.addColorStop(0, isDark ? 'rgba(99,102,241,0.30)' : 'rgba(99,102,241,0.22)');
            gradient.addColorStop(1, 'rgba(99,102,241,0.00)');

            // Point colors based on performance
            const pointColors = sgpaData.map(v => {
                if (v == null) return '#94a3b8';
                if (v >= 8.5) return '#10b981';
                if (v >= 7.0) return '#3b82f6';
                if (v >= 6.0) return '#f59e0b';
                return '#ef4444';
            });

            visGpaChartInstance = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Semester SGPA',
                            data: sgpaData,
                            borderColor: '#6366f1',
                            backgroundColor: gradient,
                            borderWidth: 2.8,
                            pointBackgroundColor: pointColors,
                            pointBorderColor: '#ffffff',
                            pointBorderWidth: 2.5,
                            pointRadius: 6.5,
                            pointHoverRadius: 9.5,
                            pointHoverBackgroundColor: pointColors,
                            pointHoverBorderColor: '#ffffff',
                            pointHoverBorderWidth: 3,
                            tension: 0.36,
                            fill: true,
                            spanGaps: true,
                            order: 1
                        },
                        {
                            label: `Cumulative CGPA (${cgpaVal})`,
                            data: cgpaLineData,
                            borderColor: '#10b981',
                            borderWidth: 2,
                            borderDash: [6, 4],
                            pointRadius: 0,
                            pointHoverRadius: 5,
                            pointBackgroundColor: '#10b981',
                            pointBorderColor: '#ffffff',
                            fill: false,
                            order: 2
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 750,
                        easing: 'easeOutQuart'
                    },
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            align: 'end',
                            labels: {
                                color: textColor,
                                font: { size: 12, weight: '600', family: 'Inter, sans-serif' },
                                boxWidth: 14,
                                boxHeight: 3,
                                usePointStyle: false,
                                padding: 16
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(15,23,42,0.90)',
                            titleColor: '#ffffff',
                            bodyColor: '#e2e8f0',
                            borderColor: isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.20)',
                            borderWidth: 1,
                            padding: 14,
                            boxPadding: 6,
                            usePointStyle: true,
                            titleFont: { size: 13, weight: 'bold', family: 'Inter, sans-serif' },
                            bodyFont: { size: 12, family: 'Inter, sans-serif' },
                            callbacks: {
                                title: (items) => items[0]?.label ? `Semester ${items[0].label.replace('Sem ', '')}` : '',
                                label: (item) => {
                                    if (item.datasetIndex === 0) {
                                        const val = item.raw;
                                        if (val == null) return ' SGPA: —';
                                        let rating = 'Needs Focus';
                                        if (val >= 8.5) rating = 'Excellent';
                                        else if (val >= 7.0) rating = 'Good';
                                        else if (val >= 6.0) rating = 'Average';
                                        return ` SGPA: ${Number(val).toFixed(2)} (${rating})`;
                                    } else {
                                        return ` Overall CGPA Reference: ${Number(item.raw).toFixed(2)}`;
                                    }
                                },
                                afterBody: (items) => {
                                    const idx = items[0]?.dataIndex;
                                    if (idx != null && semesters[idx]) {
                                        const s = semesters[idx];
                                        return [
                                            ` Registered Credits: ${s.total_credits || 0}`,
                                            ` Earned Credits: ${s.earned_credits || 0}`
                                        ];
                                    }
                                    return [];
                                }
                            }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: {
                                color: textColor,
                                font: { size: 12, weight: '700', family: 'Inter, sans-serif' }
                            },
                            title: {
                                display: true,
                                text: 'Academic Semester',
                                color: textColor,
                                font: { size: 12, weight: '600' }
                            }
                        },
                        y: {
                            min: 0,
                            max: 10,
                            grid: { color: gridColor },
                            ticks: {
                                color: textColor,
                                font: { size: 11, family: 'monospace' },
                                stepSize: 1,
                                callback: v => v.toFixed(1)
                            },
                            title: {
                                display: true,
                                text: 'SGPA (0.00 – 10.00)',
                                color: textColor,
                                font: { size: 12, weight: '600' }
                            }
                        }
                    }
                }
            });
        }

        // Reveal content
        $('vis-gpa-loading')?.classList.add('hidden');
        $('vis-gpa-content')?.classList.remove('hidden');

    } catch (err) {
        $('vis-gpa-loading')?.classList.add('hidden');
        const errCard = $('vis-gpa-error');
        if (errCard) {
            errCard.classList.remove('hidden');
            const titleEl = $('vis-gpa-error-title');
            const msgEl = $('vis-gpa-error-msg');
            if (titleEl) titleEl.innerText = 'Search Error';
            if (msgEl) msgEl.innerText = err.message || 'Could not fetch student trajectory.';
        }
        showToast('Error loading GPA: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg> <span>Show Trajectory</span>`;
        }
    }
}

// ── Download GPA Chart as PNG ──
function downloadGpaChart() {
    if (!visGpaChartInstance) {
        showToast('GPA Chart is not ready to download', 'warning');
        return;
    }
    try {
        const link = document.createElement('a');
        const reg = currentGpaRegNo || 'Student';
        const today = new Date().toISOString().slice(0, 10);
        link.download = `PTU_SGPA_Trajectory_${reg}_${today}.png`;
        link.href = visGpaChartInstance.toBase64Image('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('GPA Trajectory chart downloaded as PNG!', 'success');
    } catch (e) {
        console.error('Download GPA chart error:', e);
        showToast('Could not download chart: ' + e.message, 'error');
    }
}

// ── Export Student GPA Trajectory to Excel ──
function exportGpaExcel() {
    if (!currentVisGpaData || !currentVisGpaData.semesters || !currentVisGpaData.semesters.length) {
        showToast('No GPA data to export', 'warning');
        return;
    }

    try {
        const data = currentVisGpaData;
        const SEM_ORDER = ['I','II','III','IV','V','VI','VII','VIII'];
        const semesters = [...data.semesters].sort((a, b) => {
            const ai = SEM_ORDER.indexOf(a.semester);
            const bi = SEM_ORDER.indexOf(b.semester);
            return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        });

        const rows = [
            ['PONDICHERRY TECHNOLOGICAL UNIVERSITY - GPA TRAJECTORY REPORT'],
            ['Generated on:', new Date().toLocaleString('en-IN')],
            [],
            ['STUDENT INFORMATION'],
            ['Register Number:', data.reg_no],
            ['Student Name:', data.name],
            ['Department:', data.department],
            ['Programme:', data.programme || 'Bachelor of Technology'],
            ['Batch:', data.batch || '—'],
            ['Section:', data.section || '—'],
            ['Cumulative GPA (CGPA):', data.cgpa != null ? Number(data.cgpa).toFixed(2) : '—'],
            ['Total Credits Completed:', `${earnedCredits.toFixed(1)} / ${totalCredits.toFixed(1)} Cr`],
            ['Active Arrears:', data.active_arrears != null ? data.active_arrears : 0],
            [],
            ['SEMESTER-WISE SGPA PROGRESSION'],
            ['Semester', 'SGPA', 'Total Credits', 'Earned Credits', 'Subjects Count', 'Arrears in Sem', 'Standing']
        ];

        semesters.forEach(s => {
            const sgpa = s.sgpa != null ? Number(s.sgpa).toFixed(2) : '—';
            let standing = 'Needs Focus';
            if (s.sgpa != null) {
                if (s.sgpa >= 8.5) standing = 'Distinction';
                else if (s.sgpa >= 7.0) standing = 'Good';
                else if (s.sgpa >= 6.0) standing = 'Average';
            }
            rows.push([
                `Semester ${s.semester}`,
                sgpa,
                s.total_credits != null ? s.total_credits : '—',
                s.earned_credits != null ? s.earned_credits : '—',
                s.subjects ? s.subjects.length : (s.subjects_count || '—'),
                s.arrears || 0,
                standing
            ]);
        });

        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [
            { wch: 22 },
            { wch: 12 },
            { wch: 16 },
            { wch: 16 },
            { wch: 16 },
            { wch: 16 },
            { wch: 22 }
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'GPA Trajectory');
        const fileName = `PTU_GPA_Trajectory_${data.reg_no}_${new Date().toISOString().slice(0, 10)}.xlsx`;
        XLSX.writeFile(wb, fileName);
        showToast('GPA Trajectory exported to Excel successfully!', 'success');
    } catch (e) {
        console.error('Export GPA excel error:', e);
        showToast('Could not export to Excel: ' + e.message, 'error');
    }
}

async function loadVisualizationData() {
    const tbody = $('vis-tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">Calculating section pass percentages…</td></tr>';
    }

    try {
        const batch = currentVisBatchFilter !== 'All' ? currentVisBatchFilter : '';
        const sem = $('vis-filter-sem')?.value || 'All';
        const dept = $('vis-filter-dept')?.value || 'All';

        let url = '/visualization/pass-percentage?';
        if (batch) url += `batch=${encodeURIComponent(batch)}&`;
        if (sem && sem !== 'All') url += `semester=${encodeURIComponent(sem)}&`;
        if (dept && dept !== 'All') url += `department=${encodeURIComponent(dept)}&`;

        const data = await authFetch(url);
        currentVisData = data;

        // Populate batch filter options if returned and dropdown is empty
        const batchSelect = $('vis-filter-batch');
        if (batchSelect && data.available_batches && batchSelect.options.length <= 1) {
            let bHtml = '<option value="All">All Batches</option>';
            data.available_batches.forEach(b => {
                bHtml += `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`;
            });
            batchSelect.innerHTML = bHtml;
            batchSelect.value = currentVisBatchFilter || 'All';
        }

        // Populate semester filter options if first time or changed
        const semSelect = $('vis-filter-sem');
        if (semSelect && data.available_semesters && semSelect.options.length <= 1) {
            let sHtml = '<option value="All">All Semesters</option>';
            data.available_semesters.forEach(s => {
                sHtml += `<option value="${escapeHtml(s)}">Semester ${escapeHtml(s)}</option>`;
            });
            semSelect.innerHTML = sHtml;
            semSelect.value = sem;
        }

        // Populate department filter options if first time
        const deptSelect = $('vis-filter-dept');
        if (deptSelect && data.available_departments && deptSelect.options.length <= 1) {
            let dHtml = '<option value="All">All Departments</option>';
            data.available_departments.forEach(d => {
                const label = VIS_DEPT_NAMES[d] ? `${d} - ${VIS_DEPT_NAMES[d]}` : d;
                dHtml += `<option value="${escapeHtml(d)}">${escapeHtml(label)}</option>`;
            });
            deptSelect.innerHTML = dHtml;
            deptSelect.value = dept;
        }

        // Update KPI metrics
        updateVisualizationKPIs(data);

        // Sort sections according to sort dropdown
        applyVisualizationSort();

    } catch (err) {
        console.error('Visualization load error:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="8" class="loading-cell" style="color:var(--red,#ef4444);">Failed to load visualization: ${escapeHtml(err.message || 'Unknown error')}</td></tr>`;
        }
        showToast('Error loading visualization data: ' + (err.message || 'Check connection'), 'error');
    }
}

function updateVisualizationKPIs(data) {
    if (!data) return;

    // 1. Average Pass Rate
    const avgEl = $('vis-kpi-avg');
    const avgSub = $('vis-kpi-avg-sub');
    if (avgEl) avgEl.textContent = `${data.overall_pass_percentage.toFixed(1)}%`;
    if (avgSub) {
        const batchTxt = data.batch_filter === 'All' ? 'All Batches' : `Batch ${data.batch_filter}`;
        avgSub.textContent = `${batchTxt} · ${data.sections.length} Sections`;
    }

    // 2. Top and Lowest Section
    const topEl = $('vis-kpi-top');
    const topSub = $('vis-kpi-top-sub');
    const lowEl = $('vis-kpi-low');
    const lowSub = $('vis-kpi-low-sub');

    if (data.sections && data.sections.length > 0) {
        const sortedByPct = [...data.sections].sort((a, b) => b.pass_percentage - a.pass_percentage);
        const topSec = sortedByPct[0];
        const lowSec = sortedByPct[sortedByPct.length - 1];

        if (topEl) topEl.textContent = `${topSec.section_code}`;
        if (topSub) topSub.textContent = `${topSec.pass_percentage.toFixed(1)}% (${topSec.passed_students}/${topSec.appeared_students} passed)`;

        if (lowEl) lowEl.textContent = `${lowSec.section_code}`;
        if (lowSub) lowSub.textContent = `${lowSec.pass_percentage.toFixed(1)}% (${lowSec.passed_students}/${lowSec.appeared_students} passed)`;
    } else {
        if (topEl) topEl.textContent = '—';
        if (topSub) topSub.textContent = 'No section data';
        if (lowEl) lowEl.textContent = '—';
        if (lowSub) lowSub.textContent = 'No section data';
    }

    // 3. Total Students
    const totEl = $('vis-kpi-total');
    const totSub = $('vis-kpi-total-sub');
    if (totEl) totEl.textContent = data.overall_appeared_students.toLocaleString();
    if (totSub) {
        totSub.textContent = `${data.overall_passed_students.toLocaleString()} Passed · ${data.overall_failed_students.toLocaleString()} Uncleared`;
    }

    // Subtitle on chart
    const chartSub = $('vis-chart-subtitle');
    if (chartSub) {
        const batchLabel = data.batch_filter === 'All' ? 'All Batches' : `Batch ${data.batch_filter}`;
        const semLabel = data.semester_filter === 'All' ? 'Overall Cumulative' : `Semester ${data.semester_filter}`;
        const deptLabel = data.department_filter === 'All' ? 'All Departments' : data.department_filter;
        chartSub.textContent = `${batchLabel} · ${semLabel} · ${deptLabel} (${data.sections.length} sections analyzed)`;
    }
}

function applyVisualizationSort() {
    if (!currentVisData || !currentVisData.sections) return;

    const sortVal = $('vis-filter-sort')?.value || 'pct_desc';
    const sections = [...currentVisData.sections];

    if (sortVal === 'pct_desc') {
        sections.sort((a, b) => b.pass_percentage - a.pass_percentage || a.section_code.localeCompare(b.section_code));
    } else if (sortVal === 'pct_asc') {
        sections.sort((a, b) => a.pass_percentage - b.pass_percentage || a.section_code.localeCompare(b.section_code));
    } else if (sortVal === 'name_asc') {
        sections.sort((a, b) => a.section_code.localeCompare(b.section_code));
    }

    currentVisSections = sections;
    renderVisualizationChart(sections);
    renderVisualizationTable(sections);
}

function renderVisualizationChart(sections) {
    const canvas = $('vis-pass-chart');
    const fallback = $('vis-chart-fallback');
    if (!canvas) return;

    if (!sections || sections.length === 0) {
        if (visChartInstance) {
            visChartInstance.destroy();
            visChartInstance = null;
        }
        canvas.style.display = 'none';
        if (fallback) {
            fallback.classList.remove('hidden');
            fallback.innerHTML = '<div style="text-align:center;width:100%;color:var(--text-muted,#64748b);padding:40px 0;">No section data available for selected filters.</div>';
        }
        return;
    }

    canvas.style.display = 'block';
    if (fallback) fallback.classList.add('hidden');

    const labels = sections.map(s => s.section_code);
    const passPercentages = sections.map(s => s.pass_percentage);

    const backgroundColors = passPercentages.map(pct => {
        if (pct >= 75) return 'rgba(16, 185, 129, 0.85)';
        if (pct >= 50) return 'rgba(59, 130, 246, 0.85)';
        return 'rgba(239, 68, 68, 0.85)';
    });

    const borderColors = passPercentages.map(pct => {
        if (pct >= 75) return '#059669';
        if (pct >= 50) return '#2563eb';
        return '#dc2626';
    });

    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded, using fallback');
        renderFallbackBarChart(sections);
        return;
    }

    if (visChartInstance) {
        visChartInstance.destroy();
    }

    const isDarkMode = document.documentElement.getAttribute('data-theme') === 'dark' || document.body.classList.contains('dark-theme');
    const textColor = isDarkMode ? '#cbd5e1' : '#1e293b';
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

    const ctx = canvas.getContext('2d');
    visChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pass Percentage (%)',
                data: passPercentages,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1.5,
                borderRadius: 6,
                borderSkipped: false,
                barPercentage: 0.65,
                categoryPercentage: 0.85
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 650,
                easing: 'easeOutQuart'
            },
            layout: {
                padding: { top: 20, right: 15, bottom: 5, left: 10 }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.90)',
                    titleColor: '#ffffff',
                    bodyColor: '#e2e8f0',
                    borderColor: 'rgba(255, 255, 255, 0.15)',
                    borderWidth: 1,
                    padding: 12,
                    boxPadding: 6,
                    usePointStyle: true,
                    titleFont: { size: 13, weight: 'bold', family: 'Inter, sans-serif' },
                    bodyFont: { size: 12, family: 'Inter, sans-serif' },
                    callbacks: {
                        title: function(items) {
                            const idx = items[0].dataIndex;
                            const sec = sections[idx];
                            return `${sec.section_label} (${sec.batch})`;
                        },
                        label: function(ctx) {
                            const sec = sections[ctx.dataIndex];
                            return ` Pass Rate: ${sec.pass_percentage.toFixed(1)}%`;
                        },
                        afterLabel: function(ctx) {
                            const sec = sections[ctx.dataIndex];
                            const deptName = VIS_DEPT_NAMES[sec.department] || sec.department;
                            return [
                                ` Department: ${deptName}`,
                                ` Passed: ${sec.passed_students} / ${sec.appeared_students} appeared`,
                                ` Uncleared: ${sec.failed_students}`,
                                ` Total Enrolled: ${sec.total_students}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: {
                        color: gridColor,
                        drawBorder: false
                    },
                    ticks: {
                        color: textColor,
                        font: { size: 11, family: 'Inter, sans-serif' },
                        callback: function(val) { return val + '%'; },
                        stepSize: 20
                    },
                    title: {
                        display: true,
                        text: 'Pass Percentage (%)',
                        color: textColor,
                        font: { size: 12, weight: '600', family: 'Inter, sans-serif' }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: textColor,
                        font: { size: 11, weight: '600', family: 'Inter, sans-serif' },
                        maxRotation: 45,
                        minRotation: 0
                    }
                }
            }
        }
    });
}

function renderFallbackBarChart(sections) {
    const canvas = $('vis-pass-chart');
    const fallback = $('vis-chart-fallback');
    if (!fallback) return;
    if (canvas) canvas.style.display = 'none';
    fallback.classList.remove('hidden');

    let html = '';
    sections.forEach(s => {
        const pct = s.pass_percentage;
        const color = pct >= 75 ? '#10b981' : (pct >= 50 ? '#3b82f6' : '#ef4444');
        html += `
            <div class="vis-fallback-col" title="${escapeHtml(s.section_label)}: ${pct}%">
                <div style="font-size:0.70rem;font-weight:700;margin-bottom:4px;color:${color}">${pct.toFixed(0)}%</div>
                <div class="vis-fallback-bar" style="height:${pct}%; background:${color};"></div>
                <div class="vis-fallback-label">${escapeHtml(s.section_code)}</div>
            </div>
        `;
    });
    fallback.innerHTML = html;
}

function renderVisualizationTable(sections) {
    const tbody = $('vis-tbody');
    const countEl = $('vis-table-count');
    if (!tbody) return;

    if (!sections || sections.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="loading-cell">No sections match current criteria.</td></tr>';
        if (countEl) countEl.textContent = 'Showing 0 sections';
        return;
    }

    if (countEl) {
        countEl.textContent = `Showing ${sections.length} section${sections.length !== 1 ? 's' : ''}`;
    }

    tbody.innerHTML = sections.map((s, idx) => {
        const pct = s.pass_percentage;
        const fillClass = pct >= 75 ? 'fill-green' : (pct >= 50 ? 'fill-blue' : 'fill-red');
        const color = pct >= 75 ? '#059669' : (pct >= 50 ? '#2563eb' : '#dc2626');
        const deptName = VIS_DEPT_NAMES[s.department] || s.department;

        const passBadge = `<span class="arrear-badge arrear-0" style="padding:3px 8px;font-size:0.75rem;">${s.passed_students}</span>`;
        const failBadge = s.failed_students > 0
            ? `<span class="arrear-badge arrear-3" style="padding:3px 8px;font-size:0.75rem;">${s.failed_students}</span>`
            : `<span style="color:var(--text-muted,#64748b);font-size:0.80rem;">0</span>`;

        return `
            <tr>
                <td style="text-align:center; font-weight:700; color:var(--text-muted,#64748b);">${idx + 1}</td>
                <td><span class="vis-section-badge">${escapeHtml(s.section_code)}</span></td>
                <td>${escapeHtml(deptName)}</td>
                <td style="text-align:center; font-variant-numeric:tabular-nums;">${s.total_students}</td>
                <td style="text-align:center; font-variant-numeric:tabular-nums; font-weight:600;">${s.appeared_students}</td>
                <td style="text-align:center;">${passBadge}</td>
                <td style="text-align:center;">${failBadge}</td>
                <td>
                    <div class="vis-progress-bar-wrap">
                        <div class="vis-progress-track">
                            <div class="vis-progress-fill ${fillClass}" style="width: ${Math.min(100, Math.max(0, pct))}%;"></div>
                        </div>
                        <span class="vis-progress-label" style="color:${color};">${pct.toFixed(2)}%</span>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function clearVisualizationFilters() {
    const btn = document.querySelector('#view-visualization .btn-reset-enhanced');
    if (btn) {
        btn.classList.add('is-resetting');
        setTimeout(() => btn.classList.remove('is-resetting'), 600);
    }

    currentVisBatchFilter = 'All';
    const batchSelect = $('vis-filter-batch');
    if (batchSelect) batchSelect.value = 'All';

    const semSelect = $('vis-filter-sem');
    if (semSelect) semSelect.value = 'All';

    const deptSelect = $('vis-filter-dept');
    if (deptSelect) deptSelect.value = 'All';

    const sortSelect = $('vis-filter-sort');
    if (sortSelect) sortSelect.value = 'pct_desc';

    loadVisualizationData();
}

function downloadVisualizationChart() {
    if (currentVisTab === 'gpa') {
        downloadGpaChart();
        return;
    }
    if (currentVisTab === 'subject') {
        downloadSubjectChart();
        return;
    }
    if (currentVisTab === 'placement') {
        downloadPlacementChart();
        return;
    }
    if (!visChartInstance) {
        showToast('Chart is not ready to download', 'warning');
        return;
    }

    try {
        const link = document.createElement('a');
        const batchName = currentVisBatchFilter || 'All';
        const today = new Date().toISOString().slice(0, 10);
        link.download = `PTU_Section_Pass_Percentage_${batchName}_${today}.png`;
        link.href = visChartInstance.toBase64Image('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Chart downloaded as PNG image!', 'success');
    } catch (e) {
        console.error('Download chart error:', e);
        showToast('Could not download chart: ' + e.message, 'error');
    }
}

function exportVisualizationExcel() {
    if (currentVisTab === 'gpa') {
        exportGpaExcel();
        return;
    }
    if (currentVisTab === 'subject') {
        exportSubjectAnalyticsExcel();
        return;
    }
    if (currentVisTab === 'placement') {
        exportPlacementEligibilityExcel();
        return;
    }
    if (!currentVisSections || currentVisSections.length === 0) {
        showToast('No visualization data to export', 'warning');
        return;
    }

    try {
        if (typeof XLSX === 'undefined') {
            showToast('Excel exporter not ready', 'error');
            return;
        }

        const wb = XLSX.utils.book_new();
        const batchVal = currentVisBatchFilter || 'All Batches';
        const semVal = $('vis-filter-sem')?.value || 'All Semesters';
        const deptVal = $('vis-filter-dept')?.value || 'All Departments';
        const now = new Date();
        const timestamp = now.toLocaleDateString('en-IN') + ', ' + now.toLocaleTimeString('en-IN');

        const wsData = [
            ['PUDUCHERRY TECHNOLOGICAL UNIVERSITY (PTU)'],
            ['SECTION-WISE PASS PERCENTAGE ANALYTICAL REPORT'],
            [],
            ['Batch Filter:', batchVal, 'Semester Filter:', semVal, 'Department Filter:', deptVal],
            ['Generated On:', timestamp, 'Total Sections:', currentVisSections.length, 'Overall Pass %:', (currentVisData?.overall_pass_percentage || 0).toFixed(2) + '%'],
            [],
            ['Rank', 'Section Code', 'Section Label', 'Department', 'Enrolled Students', 'Appeared Students', 'Passed Students', 'Uncleared Students', 'Pass Percentage (%)']
        ];

        currentVisSections.forEach((s, idx) => {
            const deptName = VIS_DEPT_NAMES[s.department] || s.department;
            wsData.push([
                idx + 1,
                s.section_code,
                s.section_label,
                deptName,
                s.total_students,
                s.appeared_students,
                s.passed_students,
                s.failed_students,
                Number(s.pass_percentage.toFixed(2))
            ]);
        });

        wsData.push([]);
        if (currentVisData) {
            wsData.push([
                'Total / Overall Summary',
                '',
                '',
                '',
                currentVisData.overall_total_students,
                currentVisData.overall_appeared_students,
                currentVisData.overall_passed_students,
                currentVisData.overall_failed_students,
                Number(currentVisData.overall_pass_percentage.toFixed(2))
            ]);
        }

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        ws['!cols'] = [
            { wch: 6 },
            { wch: 14 },
            { wch: 22 },
            { wch: 38 },
            { wch: 16 },
            { wch: 16 },
            { wch: 16 },
            { wch: 18 },
            { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Section_Pass_Analysis');
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const filename = `PTU_Section_Pass_Percentage_${batchVal}_${today}.xlsx`;
        XLSX.writeFile(wb, filename);
        showToast('Visualization data exported to Excel!', 'success');
    } catch (err) {
        console.error('Export visualization error:', err);
        showToast('Export failed: ' + err.message, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// SUBJECT ANALYTICS TAB FUNCTIONS
// ═══════════════════════════════════════════════════════════════
let currentVisSubjectData = null;
let currentVisSubjectList = [];
let visSubjectBarChart = null;
let visSubjectGradeChart = null;
let currentSubBatchFilter = 'All';

async function populateSubjectBatchDropdown() {
    const sel = $('vis-sub-filter-batch');
    if (!sel) return;
    try {
        let batches = [];
        try {
            batches = await authFetch('/students/batches');
        } catch (e) {
            console.warn('Fallback batch fetch:', e);
        }
        if (!batches || !batches.length) {
            const students = await ensureStudentsCache();
            const set = new Set();
            students.forEach(s => { if (s.batch && s.batch.trim()) set.add(s.batch.trim()); });
            batches = Array.from(set).sort();
        }
        let html = '<option value="All">All Batches</option>';
        (batches || []).forEach(b => {
            html += `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`;
        });
        sel.innerHTML = html;
        sel.value = currentSubBatchFilter || 'All';
    } catch (e) {
        console.warn('Could not populate subject batch dropdown:', e);
    }
}

function onSubjectBatchChange(val) {
    currentSubBatchFilter = val || 'All';
    const semSelect = $('vis-sub-filter-sem');
    if (semSelect) semSelect.innerHTML = '<option value="All">All Semesters</option>';
    const deptSelect = $('vis-sub-filter-dept');
    if (deptSelect) deptSelect.innerHTML = '<option value="All">All Departments</option>';
    loadSubjectAnalytics();
}

async function loadSubjectAnalytics() {
    const tbody = $('vis-sub-tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">Analyzing course performance across batches…</td></tr>';
    }

    try {
        const batch = currentSubBatchFilter !== 'All' ? currentSubBatchFilter : '';
        const sem = $('vis-sub-filter-sem')?.value || 'All';
        const dept = $('vis-sub-filter-dept')?.value || 'All';

        let url = '/visualization/subject-analytics?';
        if (batch) url += `batch=${encodeURIComponent(batch)}&`;
        if (sem && sem !== 'All') url += `semester=${encodeURIComponent(sem)}&`;
        if (dept && dept !== 'All') url += `department=${encodeURIComponent(dept)}&`;

        const data = await authFetch(url);
        currentVisSubjectData = data;

        // Populate Semester dropdown if needed
        const semSelect = $('vis-sub-filter-sem');
        if (semSelect && data.available_semesters && semSelect.options.length <= 1) {
            let sHtml = '<option value="All">All Semesters</option>';
            data.available_semesters.forEach(s => {
                sHtml += `<option value="${escapeHtml(s)}">Semester ${escapeHtml(s)}</option>`;
            });
            semSelect.innerHTML = sHtml;
            semSelect.value = sem;
        }

        // Populate Department dropdown if needed
        const deptSelect = $('vis-sub-filter-dept');
        if (deptSelect && data.available_departments && deptSelect.options.length <= 1) {
            let dHtml = '<option value="All">All Departments</option>';
            data.available_departments.forEach(d => {
                const label = VIS_DEPT_NAMES[d] ? `${d} - ${VIS_DEPT_NAMES[d]}` : d;
                dHtml += `<option value="${escapeHtml(d)}">${escapeHtml(label)}</option>`;
            });
            deptSelect.innerHTML = dHtml;
            deptSelect.value = dept;
        }

        // Update KPIs
        const totalEl = $('vis-sub-kpi-total');
        const avgEl = $('vis-sub-kpi-avg');
        const toughEl = $('vis-sub-kpi-toughest');
        const toughSubEl = $('vis-sub-kpi-toughest-sub');
        const bestEl = $('vis-sub-kpi-best');
        const bestSubEl = $('vis-sub-kpi-best-sub');

        if (totalEl) totalEl.innerText = data.total_subjects;
        if (avgEl) avgEl.innerText = `${data.average_pass_rate}%`;

        if (toughEl) {
            toughEl.innerText = data.toughest_subject || 'None';
            toughEl.title = data.toughest_subject || '';
        }
        if (toughSubEl && data.toughest_pass_rate != null) {
            toughSubEl.innerText = `Lowest Pass: ${data.toughest_pass_rate}% · High Backlogs`;
        }

        if (bestEl) {
            bestEl.innerText = data.best_subject || 'None';
            bestEl.title = data.best_subject || '';
        }
        if (bestSubEl && data.best_pass_rate != null) {
            bestSubEl.innerText = `Highest Pass: ${data.best_pass_rate}% · Exemplary`;
        }

        applySubjectSort();
    } catch (err) {
        console.error('Subject analytics error:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="10" class="loading-cell" style="color:var(--red,#ef4444);">Failed to load subject analytics: ${escapeHtml(err.message || 'Error')}</td></tr>`;
        }
        showToast('Error loading subject analytics: ' + err.message, 'error');
    }
}

function applySubjectSort() {
    if (!currentVisSubjectData || !currentVisSubjectData.subjects) return;
    const sortVal = $('vis-sub-filter-sort')?.value || 'pass_asc';
    const subjects = [...currentVisSubjectData.subjects];

    if (sortVal === 'pass_asc') {
        subjects.sort((a, b) => a.pass_percentage - b.pass_percentage);
    } else if (sortVal === 'pass_desc') {
        subjects.sort((a, b) => b.pass_percentage - a.pass_percentage);
    } else if (sortVal === 'code_asc') {
        subjects.sort((a, b) => a.code.localeCompare(b.code));
    } else if (sortVal === 'enrolled_desc') {
        subjects.sort((a, b) => b.appeared_students - a.appeared_students);
    }

    currentVisSubjectList = subjects;
    renderSubjectBarChart(subjects);
    renderSubjectGradeChart(subjects);
    renderSubjectTable(subjects);
}

function renderSubjectBarChart(subjects) {
    const canvas = $('vis-subject-bar-chart');
    if (!canvas) return;

    if (visSubjectBarChart) {
        visSubjectBarChart.destroy();
        visSubjectBarChart = null;
    }

    const displaySubs = subjects.slice(0, 15);
    const labels = displaySubs.map(s => s.code);
    const dataVals = displaySubs.map(s => s.pass_percentage);
    const bgColors = dataVals.map(v => {
        if (v >= 85) return 'rgba(16, 185, 129, 0.85)';
        if (v >= 70) return 'rgba(59, 130, 246, 0.85)';
        if (v >= 50) return 'rgba(245, 158, 11, 0.85)';
        return 'rgba(239, 68, 68, 0.85)';
    });

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    visSubjectBarChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pass Percentage (%)',
                data: dataVals,
                backgroundColor: bgColors,
                borderRadius: 6,
                borderSkipped: false,
                barThickness: 18
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const idx = items[0].dataIndex;
                            const s = displaySubs[idx];
                            return `${s.code} - ${s.name}`;
                        },
                        label: (ctx) => {
                            const s = displaySubs[ctx.dataIndex];
                            return [
                                ` Pass Rate: ${s.pass_percentage}%`,
                                ` Appeared: ${s.appeared_students} | Passed: ${s.passed_students}`,
                                ` Arrears: ${s.failed_students} | Credits: ${s.credits}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: v => `${v}%`,
                        color: isDark ? '#94a3b8' : '#64748b'
                    },
                    grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }
                },
                y: {
                    ticks: {
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        font: { weight: 600 }
                    },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderSubjectGradeChart(subjects) {
    const canvas = $('vis-subject-grade-chart');
    if (!canvas) return;

    if (visSubjectGradeChart) {
        visSubjectGradeChart.destroy();
        visSubjectGradeChart = null;
    }

    const displaySubs = subjects.slice(0, 12);
    const labels = displaySubs.map(s => s.code);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    const getGradeCount = (sub, gradeKey) => {
        const g = sub.grade_distribution || {};
        if (gradeKey === 'O/S') return (g['O'] || 0) + (g['S'] || 0);
        if (gradeKey === 'A+/A') return (g['A+'] || 0) + (g['A'] || 0);
        if (gradeKey === 'B+/B') return (g['B+'] || 0) + (g['B'] || 0);
        if (gradeKey === 'C') return (g['C'] || 0);
        if (gradeKey === 'Arrears (F/AB)') return (g['F'] || 0) + (g['AB'] || 0) + (g['ABSENT'] || 0) + (g['E'] || 0) + (g['NC'] || 0);
        return 0;
    };

    visSubjectGradeChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'O / S (Distinction)',
                    data: displaySubs.map(s => getGradeCount(s, 'O/S')),
                    backgroundColor: '#10b981',
                    stack: 'grades'
                },
                {
                    label: 'A+ / A (Very Good)',
                    data: displaySubs.map(s => getGradeCount(s, 'A+/A')),
                    backgroundColor: '#3b82f6',
                    stack: 'grades'
                },
                {
                    label: 'B+ / B (Good)',
                    data: displaySubs.map(s => getGradeCount(s, 'B+/B')),
                    backgroundColor: '#0ea5e9',
                    stack: 'grades'
                },
                {
                    label: 'C (Satisfactory)',
                    data: displaySubs.map(s => getGradeCount(s, 'C')),
                    backgroundColor: '#f59e0b',
                    stack: 'grades'
                },
                {
                    label: 'Arrear (F / AB)',
                    data: displaySubs.map(s => getGradeCount(s, 'Arrears (F/AB)')),
                    backgroundColor: '#ef4444',
                    stack: 'grades'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        boxWidth: 12,
                        color: isDark ? '#cbd5e1' : '#475569',
                        font: { size: 11 }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            },
            scales: {
                x: {
                    stacked: true,
                    ticks: { color: isDark ? '#e2e8f0' : '#1e293b', font: { weight: 600 } },
                    grid: { display: false }
                },
                y: {
                    stacked: true,
                    ticks: { color: isDark ? '#94a3b8' : '#64748b' },
                    grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }
                }
            }
        }
    });
}

function renderSubjectTable(subjects) {
    const tbody = $('vis-sub-tbody');
    if (!tbody) return;

    if (!subjects || !subjects.length) {
        tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">No course records found for the selected filters.</td></tr>';
        return;
    }

    let html = '';
    subjects.forEach((s, idx) => {
        let barClass = 'fill-green';
        if (s.pass_percentage < 50) barClass = 'fill-red';
        else if (s.pass_percentage < 70) barClass = 'fill-blue';

        const g = s.grade_distribution || {};
        let pillsHtml = '<div class="grade-pill-group">';
        if (g['O'] || g['S']) pillsHtml += `<span class="grade-pill grade-pill-o">O/S: ${(g['O']||0)+(g['S']||0)}</span>`;
        if (g['A+'] || g['A']) pillsHtml += `<span class="grade-pill grade-pill-a">A+/A: ${(g['A+']||0)+(g['A']||0)}</span>`;
        if (g['B+'] || g['B']) pillsHtml += `<span class="grade-pill grade-pill-b">B+/B: ${(g['B+']||0)+(g['B']||0)}</span>`;
        if (g['C']) pillsHtml += `<span class="grade-pill grade-pill-c">C: ${g['C']}</span>`;
        if (s.failed_students > 0) pillsHtml += `<span class="grade-pill grade-pill-f">Arrears: ${s.failed_students}</span>`;
        pillsHtml += '</div>';

        html += `<tr>
            <td style="color:var(--text-muted);font-weight:600;">${idx + 1}</td>
            <td><strong style="color:var(--primary,#2563eb);">${escapeHtml(s.code)}</strong></td>
            <td>
                <div style="font-weight:600; color:var(--text-primary);">${escapeHtml(s.name)}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">Avg GP: ${s.average_grade_point.toFixed(2)}</div>
            </td>
            <td>${escapeHtml(s.department || '—')} / Sem ${escapeHtml(s.semester || '—')}</td>
            <td style="font-weight:600;">${Number(s.credits).toFixed(1)}</td>
            <td style="text-align:right; font-weight:600;">${s.appeared_students}</td>
            <td style="text-align:right; color:var(--emerald,#10b981); font-weight:700;">${s.passed_students}</td>
            <td style="text-align:right; font-weight:700; color:${s.failed_students > 0 ? 'var(--red,#ef4444)' : 'var(--text-muted)'};">${s.failed_students}</td>
            <td>
                <div class="vis-progress-bar-wrap">
                    <div class="vis-progress-track">
                        <div class="vis-progress-fill ${barClass}" style="width:${s.pass_percentage}%;"></div>
                    </div>
                    <span class="vis-progress-label">${s.pass_percentage.toFixed(1)}%</span>
                </div>
            </td>
            <td>${pillsHtml}</td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

function clearSubjectFilters() {
    currentSubBatchFilter = 'All';
    const batchSelect = $('vis-sub-filter-batch');
    if (batchSelect) batchSelect.value = 'All';

    const semSelect = $('vis-sub-filter-sem');
    if (semSelect) semSelect.value = 'All';

    const deptSelect = $('vis-sub-filter-dept');
    if (deptSelect) deptSelect.value = 'All';

    const sortSelect = $('vis-sub-filter-sort');
    if (sortSelect) sortSelect.value = 'pass_asc';

    loadSubjectAnalytics();
}

function downloadSubjectChart() {
    if (!visSubjectBarChart) {
        showToast('Course chart is not ready to download', 'warning');
        return;
    }
    try {
        const link = document.createElement('a');
        link.download = `PTU_Course_Pass_Rates_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = visSubjectBarChart.toBase64Image('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Course chart downloaded as PNG!', 'success');
    } catch (e) {
        showToast('Download error: ' + e.message, 'error');
    }
}

function exportSubjectAnalyticsExcel() {
    if (!currentVisSubjectList || !currentVisSubjectList.length) {
        showToast('No course analytics to export', 'warning');
        return;
    }
    try {
        if (typeof XLSX === 'undefined') {
            showToast('Excel exporter not ready', 'error');
            return;
        }

        const rows = [
            ['PONDICHERRY TECHNOLOGICAL UNIVERSITY - COURSE PERFORMANCE REPORT'],
            ['Generated on:', new Date().toLocaleString('en-IN')],
            ['Batch Filter:', currentSubBatchFilter],
            ['Semester Filter:', $('vis-sub-filter-sem')?.value || 'All'],
            ['Department Filter:', $('vis-sub-filter-dept')?.value || 'All'],
            [],
            ['#', 'Course Code', 'Course Title', 'Department', 'Semester', 'Credits', 'Appeared', 'Passed', 'Failed / Arrears', 'Pass %', 'Average GP', 'Grade Distribution']
        ];

        currentVisSubjectList.forEach((s, idx) => {
            const gradeStr = Object.entries(s.grade_distribution || {}).map(([g, c]) => `${g}:${c}`).join(', ');
            rows.push([
                idx + 1,
                s.code,
                s.name,
                s.department || '—',
                s.semester || '—',
                s.credits,
                s.appeared_students,
                s.passed_students,
                s.failed_students,
                s.pass_percentage,
                s.average_grade_point,
                gradeStr
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Course Analytics');
        XLSX.writeFile(wb, `PTU_Course_Analytics_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('Course analytics exported to Excel!', 'success');
    } catch (e) {
        showToast('Export failed: ' + e.message, 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// PLACEMENT ELIGIBILITY TAB FUNCTIONS
// ═══════════════════════════════════════════════════════════════
let currentVisPlacementData = null;
let currentVisPlacementStudents = [];
let visPlacementTierChart = null;
let visPlacementDeptChart = null;
let currentPlaceBatchFilter = 'All';

async function populatePlacementBatchDropdown() {
    const sel = $('vis-place-filter-batch');
    if (!sel) return;
    try {
        let batches = [];
        try {
            batches = await authFetch('/students/batches');
        } catch (e) {
            console.warn('Fallback batch fetch:', e);
        }
        if (!batches || !batches.length) {
            const students = await ensureStudentsCache();
            const set = new Set();
            students.forEach(s => { if (s.batch && s.batch.trim()) set.add(s.batch.trim()); });
            batches = Array.from(set).sort();
        }
        let html = '<option value="All">All Batches</option>';
        (batches || []).forEach(b => {
            html += `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`;
        });
        sel.innerHTML = html;
        sel.value = currentPlaceBatchFilter || 'All';
    } catch (e) {
        console.warn('Could not populate placement batch dropdown:', e);
    }
}

function onPlacementBatchChange(val) {
    currentPlaceBatchFilter = val || 'All';
    const deptSelect = $('vis-place-filter-dept');
    if (deptSelect) deptSelect.innerHTML = '<option value="All">All Departments</option>';
    loadPlacementEligibility();
}

async function loadPlacementEligibility() {
    const tbody = $('vis-place-tbody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">Evaluating campus placement eligibility criteria…</td></tr>';
    }

    try {
        const batch = currentPlaceBatchFilter !== 'All' ? currentPlaceBatchFilter : '';
        const dept = $('vis-place-filter-dept')?.value || 'All';

        let url = '/visualization/placement-eligibility?';
        if (batch) url += `batch=${encodeURIComponent(batch)}&`;
        if (dept && dept !== 'All') url += `department=${encodeURIComponent(dept)}&`;

        const data = await authFetch(url);
        currentVisPlacementData = data;
        currentVisPlacementStudents = data.students || [];

        // Populate Department filter if needed
        const deptSelect = $('vis-place-filter-dept');
        if (deptSelect && data.available_departments && deptSelect.options.length <= 1) {
            let dHtml = '<option value="All">All Departments</option>';
            data.available_departments.forEach(d => {
                const label = VIS_DEPT_NAMES[d] ? `${d} - ${VIS_DEPT_NAMES[d]}` : d;
                dHtml += `<option value="${escapeHtml(d)}">${escapeHtml(label)}</option>`;
            });
            deptSelect.innerHTML = dHtml;
            deptSelect.value = dept;
        }

        // 4 KPI Cards
        const t1El = $('vis-place-kpi-tier1');
        const t1Sub = $('vis-place-kpi-tier1-pct');
        const t2El = $('vis-place-kpi-tier2');
        const t2Sub = $('vis-place-kpi-tier2-pct');
        const condEl = $('vis-place-kpi-cond');
        const condSub = $('vis-place-kpi-cond-pct');
        const inelEl = $('vis-place-kpi-ineligible');
        const inelSub = $('vis-place-kpi-ineligible-pct');

        if (t1El) t1El.innerText = `${data.tier1_count} (${data.tier1_pct}%)`;
        if (t1Sub) t1Sub.innerText = `${data.tier1_count} candidates · CGPA ≥ 8.0 & 0 Arrears`;

        if (t2El) t2El.innerText = `${data.tier2_count} (${data.tier2_pct}%)`;
        if (t2Sub) t2Sub.innerText = `${data.tier2_count} candidates · CGPA ≥ 6.5 & 0 Arrears`;

        if (condEl) condEl.innerText = `${data.conditional_count} (${data.conditional_pct}%)`;
        if (condSub) condSub.innerText = `${data.conditional_count} candidates · 1–2 Active Backlogs`;

        if (inelEl) inelEl.innerText = `${data.ineligible_count} (${data.ineligible_pct}%)`;
        if (inelSub) inelSub.innerText = `${data.ineligible_count} candidates · High Backlogs or Low CGPA`;

        renderPlacementTierChart(data);
        renderPlacementDeptChart(data);
        filterPlacementTable();
    } catch (err) {
        console.error('Placement eligibility error:', err);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="9" class="loading-cell" style="color:var(--red,#ef4444);">Failed to load placement eligibility: ${escapeHtml(err.message || 'Error')}</td></tr>`;
        }
        showToast('Error loading placement eligibility: ' + err.message, 'error');
    }
}

function renderPlacementTierChart(data) {
    const canvas = $('vis-placement-tier-chart');
    if (!canvas) return;

    if (visPlacementTierChart) {
        visPlacementTierChart.destroy();
        visPlacementTierChart = null;
    }

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    visPlacementTierChart = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['Tier 1 Dream (≥8.0)', 'Tier 2 Core (≥6.5)', 'Tier 3 Pass (≥5.5)', 'Conditional (1-2 Backlogs)', 'Ineligible (>2 Backlogs)'],
            datasets: [{
                data: [
                    data.tier1_count,
                    data.tier2_count,
                    data.tier3_count,
                    data.conditional_count,
                    data.ineligible_count
                ],
                backgroundColor: [
                    '#10b981',
                    '#3b82f6',
                    '#64748b',
                    '#f59e0b',
                    '#ef4444'
                ],
                borderWidth: 2,
                borderColor: isDark ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        color: isDark ? '#cbd5e1' : '#475569',
                        font: { size: 11, weight: 600 }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const val = ctx.raw;
                            const total = data.total_students || 1;
                            const pct = ((val / total) * 100).toFixed(1);
                            return ` ${ctx.label}: ${val} students (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '68%'
        }
    });
}

function renderPlacementDeptChart(data) {
    const canvas = $('vis-placement-dept-chart');
    if (!canvas) return;

    if (visPlacementDeptChart) {
        visPlacementDeptChart.destroy();
        visPlacementDeptChart = null;
    }

    const deptStats = data.department_stats || [];
    const labels = deptStats.map(d => d.department);
    const eligiblePcts = deptStats.map(d => d.eligible_percentage);
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    visPlacementDeptChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'All-Clear Placement Eligible (%)',
                data: eligiblePcts,
                backgroundColor: '#3b82f6',
                borderRadius: 6,
                barThickness: 22
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        title: (items) => {
                            const d = deptStats[items[0].dataIndex];
                            return `${d.department} - ${d.department_name}`;
                        },
                        label: (ctx) => {
                            const d = deptStats[ctx.dataIndex];
                            return [
                                ` Placement Eligible: ${d.eligible_percentage}%`,
                                ` Total Students: ${d.total}`,
                                ` Tier 1: ${d.tier1} | Tier 2: ${d.tier2}`,
                                ` Conditional: ${d.conditional} | Backlogs: ${d.ineligible}`
                            ];
                        }
                    }
                }
            },
            scales: {
                y: {
                    min: 0,
                    max: 100,
                    ticks: {
                        callback: v => `${v}%`,
                        color: isDark ? '#94a3b8' : '#64748b'
                    },
                    grid: { color: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }
                },
                x: {
                    ticks: { color: isDark ? '#e2e8f0' : '#1e293b', font: { weight: 600 } },
                    grid: { display: false }
                }
            }
        }
    });
}

function filterPlacementTable() {
    if (!currentVisPlacementData || !currentVisPlacementData.students) return;

    const tierFilter = $('vis-place-filter-tier')?.value || 'All';
    const searchVal = ($('vis-place-search-input')?.value || '').trim().toLowerCase();

    let list = currentVisPlacementData.students;

    if (tierFilter !== 'All') {
        list = list.filter(s => s.tier === tierFilter);
    }

    if (searchVal) {
        list = list.filter(s =>
            (s.reg_no || '').toLowerCase().includes(searchVal) ||
            (s.name || '').toLowerCase().includes(searchVal) ||
            (s.department || '').toLowerCase().includes(searchVal)
        );
    }

    renderPlacementTable(list);
}

function renderPlacementTable(students) {
    const tbody = $('vis-place-tbody');
    const countEl = $('vis-place-table-count');
    if (countEl) countEl.innerText = `Showing ${students.length} candidates sorted by CGPA`;
    if (!tbody) return;

    if (!students || !students.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="loading-cell">No candidates match the specified criteria.</td></tr>';
        return;
    }

    let html = '';
    students.slice(0, 100).forEach((s, idx) => {
        let badgeHtml = '';
        if (s.tier === 'Tier 1') badgeHtml = `<span class="badge-tier badge-tier-1">⭐ Tier 1 Dream</span>`;
        else if (s.tier === 'Tier 2') badgeHtml = `<span class="badge-tier badge-tier-2">✓ Tier 2 Core</span>`;
        else if (s.tier === 'Tier 3') badgeHtml = `<span class="badge-tier badge-tier-3">Tier 3 Pass</span>`;
        else if (s.tier === 'Conditional') badgeHtml = `<span class="badge-tier badge-conditional">⚡ 1–2 Arrears</span>`;
        else badgeHtml = `<span class="badge-tier badge-ineligible">✗ Ineligible</span>`;

        let standingHtml = s.active_arrears === 0
            ? '<span class="arrear-badge arrear-0">All Clear</span>'
            : `<span class="arrear-badge arrear-3">${s.active_arrears} Pending</span>`;

        html += `<tr>
            <td style="color:var(--text-muted);font-weight:600;">${idx + 1}</td>
            <td><strong style="color:var(--primary,#2563eb);">${escapeHtml(s.reg_no)}</strong></td>
            <td style="font-weight:600; color:var(--text-primary);">${escapeHtml(s.name)}</td>
            <td>${escapeHtml(s.department)}</td>
            <td>${escapeHtml(s.section || '—')}</td>
            <td style="text-align:right; font-weight:800; font-size:0.95rem; color:${s.cgpa >= 8.0 ? 'var(--emerald,#10b981)' : s.cgpa >= 6.5 ? 'var(--primary,#2563eb)' : 'var(--text-primary)'};">${s.cgpa.toFixed(2)}</td>
            <td style="text-align:center;">${standingHtml}</td>
            <td style="text-align:center;">${badgeHtml}</td>
            <td style="text-align:center; font-size:0.80rem; font-weight:600; color:${s.active_arrears === 0 ? 'var(--emerald,#10b981)' : 'var(--amber,#f59e0b)'};">
                ${s.active_arrears === 0 ? 'Eligible' : 'Conditional'}
            </td>
        </tr>`;
    });

    tbody.innerHTML = html;
}

function clearPlacementFilters() {
    currentPlaceBatchFilter = 'All';
    const batchSelect = $('vis-place-filter-batch');
    if (batchSelect) batchSelect.value = 'All';

    const deptSelect = $('vis-place-filter-dept');
    if (deptSelect) deptSelect.value = 'All';

    const tierSelect = $('vis-place-filter-tier');
    if (tierSelect) tierSelect.value = 'All';

    const searchInput = $('vis-place-search-input');
    if (searchInput) searchInput.value = '';

    loadPlacementEligibility();
}

function downloadPlacementChart() {
    if (!visPlacementTierChart) {
        showToast('Placement chart is not ready to download', 'warning');
        return;
    }
    try {
        const link = document.createElement('a');
        link.download = `PTU_Placement_Tiers_${new Date().toISOString().slice(0, 10)}.png`;
        link.href = visPlacementTierChart.toBase64Image('image/png', 1.0);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Placement tier chart downloaded as PNG!', 'success');
    } catch (e) {
        showToast('Download error: ' + e.message, 'error');
    }
}

function exportPlacementEligibilityExcel() {
    if (!currentVisPlacementStudents || !currentVisPlacementStudents.length) {
        showToast('No placement data to export', 'warning');
        return;
    }
    try {
        if (typeof XLSX === 'undefined') {
            showToast('Excel exporter not ready', 'error');
            return;
        }

        const rows = [
            ['PONDICHERRY TECHNOLOGICAL UNIVERSITY - CAMPUS PLACEMENT ELIGIBILITY REPORT'],
            ['Generated on:', new Date().toLocaleString('en-IN')],
            ['Batch Filter:', currentPlaceBatchFilter],
            ['Department Filter:', $('vis-place-filter-dept')?.value || 'All'],
            ['Tier Filter:', $('vis-place-filter-tier')?.value || 'All'],
            [],
            ['#', 'Register Number', 'Student Name', 'Department', 'Section', 'Batch', 'CGPA', 'Active Arrears', 'Placement Tier', 'Eligible Status']
        ];

        currentVisPlacementStudents.forEach((s, idx) => {
            rows.push([
                idx + 1,
                s.reg_no,
                s.name,
                s.department,
                s.section || '—',
                s.batch,
                s.cgpa,
                s.active_arrears,
                s.tier,
                s.active_arrears === 0 ? 'Eligible' : (s.active_arrears <= 2 ? 'Conditional' : 'Ineligible')
            ]);
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.aoa_to_sheet(rows);
        XLSX.utils.book_append_sheet(wb, ws, 'Placement Roster');
        XLSX.writeFile(wb, `PTU_Placement_Eligibility_${new Date().toISOString().slice(0, 10)}.xlsx`);
        showToast('Placement roster exported to Excel!', 'success');
    } catch (e) {
        showToast('Export failed: ' + e.message, 'error');
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
    if (!rcRegNo || !rcEmail || resendLink?.disabled || resendLink?.classList.contains('disabled')) return;

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
    resendLink.disabled = true;
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
        resendLink.disabled = false;
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
// TRACK STUDENTS - Export report-card viewing status as an Excel workbook
// ============================================================
async function handleTrackStudentsExport() {
    const btn = $('developer-track-students-btn');
    const msgEl = $('developer-track-students-msg');

    if (msgEl) {
        msgEl.style.display = 'none';
        msgEl.textContent = '';
        msgEl.className = 'testing-rc-msg';
    }

    btn?.classList.add('loading');
    try {
        if (!authToken) {
            throw new Error('Authentication required');
        }

        const response = await fetch(`${API_URL}/developer/track-students-csv`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleLogout();
                throw new Error('Session expired');
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Export failed: ${response.statusText}`);
        }

        // Get the Excel workbook
        const workbookBlob = await response.blob();
        
        // Extract filename from Content-Disposition header or use default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'tracked_students.xlsx';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }

        // Create download link and trigger download
        const url = window.URL.createObjectURL(workbookBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        showToast('Excel workbook exported successfully', 'success');
        if (msgEl) {
            msgEl.textContent = '✓ Excel workbook downloaded successfully';
            msgEl.style.display = 'block';
            msgEl.className = 'testing-rc-msg success';
        }
    } catch (err) {
        const message = err.message || 'Failed to export student tracking data';
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

async function handleTrackStudentsReset() {
    const btn = $('developer-track-students-reset-btn');
    const msgEl = $('developer-track-students-msg');
    if (!authToken) {
        const message = 'Authentication required';
        showToast(message, 'error');
        if (msgEl) {
            msgEl.textContent = '❌ ' + message;
            msgEl.style.display = 'block';
            msgEl.className = 'testing-rc-msg error';
        }
        return;
    }

    if (!window.confirm('Reset all tracked report-card views? This permanently removes every current checkmark. Future report-card views will be tracked again.')) {
        return;
    }

    if (msgEl) {
        msgEl.style.display = 'none';
        msgEl.textContent = '';
        msgEl.className = 'testing-rc-msg';
    }

    if (btn) btn.disabled = true;
    try {
        const response = await fetch(`${API_URL}/developer/track-students`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            if (response.status === 401) {
                handleLogout();
                throw new Error('Session expired');
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Reset failed: ${response.statusText}`);
        }

        const data = await response.json();
        const message = `Reset complete. Removed ${data.deleted_count} tracked report-card view${data.deleted_count === 1 ? '' : 's'}.`;
        showToast(message, 'success');
        if (msgEl) {
            msgEl.textContent = '✓ ' + message;
            msgEl.style.display = 'block';
            msgEl.className = 'testing-rc-msg success';
        }
    } catch (err) {
        const message = err.message || 'Failed to reset student tracking data';
        if (msgEl) {
            msgEl.textContent = '❌ ' + message;
            msgEl.style.display = 'block';
            msgEl.className = 'testing-rc-msg error';
        }
        showToast(message, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}
// ============================================================
// END TRACK STUDENTS
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
              <td class="resources-row-number">${String(idx + 1).padStart(2, '0')}</td>
              <td class="resources-person-cell">
                <span class="resources-person-name">${escapeHtml(r.name || 'Unnamed resource')}</span>
              </td>
              <td class="resources-email-cell"><a href="mailto:${escapeHtml(r.email || '')}">${escapeHtml(r.email || '')}</a></td>
              <td><span class="badge ${typeClass}">${escapeHtml(accType)}</span></td>
              <td>${statusBadge}</td>
              <td class="developer-only resources-actions-cell">${actions}</td>
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
    if ($('resources-metric-total')) $('resources-metric-total').innerText = total;
    const registered = allResourcesCache.filter(resource => resource.has_account).length;
    if ($('resources-metric-registered')) $('resources-metric-registered').innerText = registered;
    if ($('resources-metric-pending')) $('resources-metric-pending').innerText = total - registered;
    $('resources-count-display')?.classList.toggle('is-filtered', showing !== total);
}

function filterResourcesSearch() {
    const search = $('resources-search-input');
    const q = (search?.value || '').trim().toLowerCase();
    const clearButton = $('resources-search-clear');
    if (clearButton) clearButton.hidden = !q;
    const type = $('resources-type-filter')?.value || '';

    const filtered = allResourcesCache.filter(r => {
        const matchesQuery = !q || (r.name && r.name.toLowerCase().includes(q)) || (r.email && r.email.toLowerCase().includes(q));
        const matchesType = !type || (r.account_type && r.account_type.toLowerCase() === type.toLowerCase());
        return matchesQuery && matchesType;
    });

    renderResourcesTable(filtered);
}

function clearResourcesSearch() {
    const search = $('resources-search-input');
    if (!search) return;
    search.value = '';
    filterResourcesSearch();
    search.focus();
}

function clearResourcesFilters() {
    const search = $('resources-search-input');
    const type = $('resources-type-filter');
    if (search) search.value = '';
    if (type) type.value = '';
    filterResourcesSearch();
    search?.focus();
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

// Smooth wheel scrolling for nested application panels
function initScrollAnywhere() {
    const scrollResponseMs = 32;
    const lineDeltaPixels = 16;
    const scrollSettleThreshold = 1;
    const activeScrolls = new WeakMap();
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    document.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey || reducedMotion.matches) return;
        if (document.body.classList.contains('upload-active')) return;

        const target = e.target instanceof Element ? e.target : e.target?.parentElement;
        if (!target || target.closest('input, textarea, select, [contenteditable], .filter-select')) return;

        const rawDeltaX = e.deltaX || (e.shiftKey ? e.deltaY : 0);
        const rawDeltaY = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
        if (!rawDeltaX && !rawDeltaY) return;

        const canScroll = (container, axis, delta) => {
            if (!delta) return false;
            const style = getComputedStyle(container);
            const overflow = axis === 'x' ? style.overflowX : style.overflowY;
            if (overflow !== 'auto' && overflow !== 'scroll' && overflow !== 'overlay') return false;

            const state = activeScrolls.get(container);
            const max = axis === 'x'
                ? container.scrollWidth - container.clientWidth
                : container.scrollHeight - container.clientHeight;
            const position = state
                ? (axis === 'x' ? state.targetX : state.targetY)
                : (axis === 'x' ? container.scrollLeft : container.scrollTop);
            return max > 1 && (delta < 0 ? position > 0 : position < max - 1);
        };

        const scrollingElement = document.scrollingElement || document.documentElement;
        let targetContainer = null;
        let selectedDeltaX = 0;
        let selectedDeltaY = 0;
        let candidate = target;
        while (candidate && candidate !== document.body && candidate !== document.documentElement) {
            const scaleX = e.deltaMode === 1 ? lineDeltaPixels
                : e.deltaMode === 2 ? candidate.clientWidth : 1;
            const scaleY = e.deltaMode === 1 ? lineDeltaPixels
                : e.deltaMode === 2 ? candidate.clientHeight : 1;
            const deltaX = rawDeltaX * scaleX;
            const deltaY = rawDeltaY * scaleY;
            const canScrollX = canScroll(candidate, 'x', deltaX);
            const canScrollY = canScroll(candidate, 'y', deltaY);

            if (canScrollX || canScrollY) {
                targetContainer = candidate;
                selectedDeltaX = canScrollX ? deltaX : 0;
                selectedDeltaY = canScrollY ? deltaY : 0;
                break;
            }
            candidate = candidate.parentElement;
        }

        if (!targetContainer) {
            const scaleX = e.deltaMode === 1 ? lineDeltaPixels
                : e.deltaMode === 2 ? scrollingElement.clientWidth : 1;
            const scaleY = e.deltaMode === 1 ? lineDeltaPixels
                : e.deltaMode === 2 ? scrollingElement.clientHeight : 1;
            const deltaX = rawDeltaX * scaleX;
            const deltaY = rawDeltaY * scaleY;
            const canScrollX = canScroll(scrollingElement, 'x', deltaX);
            const canScrollY = canScroll(scrollingElement, 'y', deltaY);
            if (canScrollX || canScrollY) {
                targetContainer = scrollingElement;
                selectedDeltaX = canScrollX ? deltaX : 0;
                selectedDeltaY = canScrollY ? deltaY : 0;
            }
        }

        if (!targetContainer) return;
        e.preventDefault();

        let scroll = activeScrolls.get(targetContainer);
        if (!scroll) {
            scroll = {
                targetX: targetContainer.scrollLeft,
                targetY: targetContainer.scrollTop,
                frame: 0,
                lastTime: 0
            };
            activeScrolls.set(targetContainer, scroll);
        }

        const maxX = targetContainer.scrollWidth - targetContainer.clientWidth;
        const maxY = targetContainer.scrollHeight - targetContainer.clientHeight;
        scroll.targetX = Math.max(0, Math.min(maxX, scroll.targetX + selectedDeltaX));
        scroll.targetY = Math.max(0, Math.min(maxY, scroll.targetY + selectedDeltaY));
        targetContainer.classList.add('is-wheel-scrolling');

        if (!scroll.frame) {
            const animate = (time) => {
                const current = activeScrolls.get(targetContainer);
                if (!current) return;
                const elapsed = current.lastTime ? Math.min(time - current.lastTime, 32) : 16;
                current.lastTime = time;
                const progress = 1 - Math.exp(-elapsed / scrollResponseMs);
                const remainingX = current.targetX - targetContainer.scrollLeft;
                const remainingY = current.targetY - targetContainer.scrollTop;

                if (Math.abs(remainingX) > scrollSettleThreshold) targetContainer.scrollLeft += remainingX * progress;
                else targetContainer.scrollLeft = current.targetX;
                if (Math.abs(remainingY) > scrollSettleThreshold) targetContainer.scrollTop += remainingY * progress;
                else targetContainer.scrollTop = current.targetY;

                const stillMoving = Math.abs(current.targetX - targetContainer.scrollLeft) > scrollSettleThreshold
                    || Math.abs(current.targetY - targetContainer.scrollTop) > scrollSettleThreshold;
                if (stillMoving) {
                    current.frame = requestAnimationFrame(animate);
                } else {
                    current.frame = 0;
                    current.lastTime = 0;
                    targetContainer.classList.remove('is-wheel-scrolling');
                    activeScrolls.delete(targetContainer);
                }
            };
            scroll.frame = requestAnimationFrame(animate);
        }
    }, { passive: false });
}

function initCreditsPortal() {
    const openButton = $('credits-toggle');
    const dialog = $('credits-dialog');
    const closeButton = $('credits-close');
    if (!openButton || !dialog || !closeButton) return;

    openButton.addEventListener('click', () => {
        if (dialog.open) return;
        dialog.showModal();
        openButton.setAttribute('aria-expanded', 'true');
    });

    closeButton.addEventListener('click', () => {
        if (dialog.open) dialog.close();
    });

    dialog.addEventListener('close', () => {
        openButton.setAttribute('aria-expanded', 'false');
    });

    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) dialog.close();
    });
}

// ─── 17. Lifecycle & Event Binding ────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    syncThemeCheckbox(); // Sync the animated toggle with current theme
    initParticleCanvas();
    loadPublicStats();
    initSupportPortal();
    initCreditsPortal();
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

/* ============================================================
   INTEGRATED FROM Result-filters.js
   ============================================================ */

/**
 * ============================================================
 * RESULT-FILTERS.JS — Department & Section Pills Enhancement
 * EXACT COPY from Students/SGPA/CGPA/Class Report structure
 * Department pills show sections directly (CSE-A, CSE-B, etc.)
 * ============================================================
 */

// Filter state for View Results
let currentResultsDeptFilter = 'All';
let resultsAllStudentsCache = [];

/**
 * Helper function to generate section tab identifier (EXACT match to Students logic)
 */
function resultSectionTab(student) {
    const code = deptToCode(student.department);
    return student.section ? `${code}-${student.section}` : code;
}

/**
 * Ensure students cache is loaded
 */
async function ensureResultsStudentsCache() {
    if (resultsAllStudentsCache.length === 0) {
        try {
            resultsAllStudentsCache = await authFetch('/students');
        } catch (e) {
            console.warn('Could not load students for results filters:', e);
            resultsAllStudentsCache = [];
        }
    }
    return resultsAllStudentsCache;
}

/**
 * Build department+section pills EXACTLY like Students section
 * Shows "All", then individual sections like "CSE-A", "CSE-B", "ECE-A"
 */
async function buildResultsDepartmentTabs(filteredStudents) {
    const container = document.getElementById('results-dept-tabs-container');
    if (!container) return;
    enablePillTabDragging(container);

    const students = filteredStudents || await ensureResultsStudentsCache();
    
    // Build section counts using the EXACT same logic as Students
    const tabCounts = {};
    students.forEach(s => {
        const tab = resultSectionTab(s);
        tabCounts[tab] = (tabCounts[tab] || 0) + 1;
    });
    
    const sortedTabs = Object.keys(tabCounts).sort();
    
    // Build tabs with "All" button + individual section buttons - EXACT Students pattern
    let html = `<button class="dept-tab ${currentResultsDeptFilter === 'All' ? 'active' : ''}" 
                        data-dept="All" 
                        onclick="selectResultsDeptTab('All')"
                        aria-pressed="${currentResultsDeptFilter === 'All'}"
                        type="button">
        All <span class="badge-count">${students.length}</span>
    </button>`;
    
    sortedTabs.forEach(tab => {
        html += `<button class="dept-tab ${currentResultsDeptFilter === tab ? 'active' : ''}" 
                        data-dept="${escapeHtml(tab)}" 
                        onclick="selectResultsDeptTab('${escapeHtml(tab)}')"
                        aria-pressed="${currentResultsDeptFilter === tab}"
                        type="button">
            ${escapeHtml(tab)} <span class="badge-count">${tabCounts[tab]}</span>
        </button>`;
    });
    
    container.innerHTML = html;
}

/**
 * Handle department+section tab selection (EXACT Students logic)
 */
function selectResultsDeptTab(deptSection) {
    currentResultsDeptFilter = deptSection;
    resultsCurrentPage = 1;
    
    // Update active state on tabs
    const container = document.getElementById('results-dept-tabs-container');
    if (container) {
        container.querySelectorAll('.dept-tab').forEach(tab => {
            const tabDept = tab.getAttribute('data-dept');
            const isActive = tabDept === deptSection;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-pressed', String(isActive));
        });
    }
    
    // Update reset button state
    updateResultsResetButton();
    
    // Reload results with new filter
    loadResultsWithDeptSection();
}

/**
 * Load results with department+section filter applied
 */
async function loadResultsWithDeptSection() {
    const tbody = $('results-tbody');
    if (!tbody) return;

    if (resultsAbortController) {
        try { resultsAbortController.abort(); } catch (_) {}
    }
    resultsAbortController = new AbortController();
    const thisRequestId = ++currentResultsRequestId;

    tbody.innerHTML = '<tr><td colspan="10" class="loading-cell">Loading results…</td></tr>';

    try {
        // Build query parameters
        const sem = $('filter-semester')?.value || '';
        const subCode = $('filter-subject-code')?.value?.trim() || '';
        const regNo = $('filter-reg-no')?.value?.trim() || '';

        let url = '/results?';
        
        // Batch filter
        if (currentResultsBatchFilter && currentResultsBatchFilter !== 'All') {
            url += `batch=${encodeURIComponent(currentResultsBatchFilter)}&`;
        }
        
        // Department+Section filter - parse the tab format (e.g., "CSE-A" -> dept="CSE", section="A")
        if (currentResultsDeptFilter && currentResultsDeptFilter !== 'All') {
            const parts = currentResultsDeptFilter.split('-');
            
            if (parts.length > 1) {
                // Has section: "CSE-A" -> dept code, need to map back to full department name
                const deptCode = parts[0];
                const sectionValue = parts[parts.length - 1];
                
                // Find the full department name from the code
                const students = await ensureResultsStudentsCache();
                const student = students.find(s => deptToCode(s.department) === deptCode);
                if (student && student.department) {
                    url += `department=${encodeURIComponent(student.department)}&`;
                    url += `section=${encodeURIComponent(sectionValue)}&`;
                }
            } else {
                // No section: just department code, find full name
                const deptCode = parts[0];
                const students = await ensureResultsStudentsCache();
                const student = students.find(s => deptToCode(s.department) === deptCode);
                if (student && student.department) {
                    url += `department=${encodeURIComponent(student.department)}&`;
                }
            }
        }
        
        if (sem) url += `semester=${encodeURIComponent(sem)}&`;
        if (subCode) url += `subject_code=${encodeURIComponent(subCode)}&`;
        if (regNo) url += `reg_no=${encodeURIComponent(regNo)}&`;

        const data = await authFetch(url, { signal: resultsAbortController.signal });
        if (thisRequestId !== currentResultsRequestId) return;

        allResultsCache = data || [];

        renderResultsTable();
    } catch (err) {
        if (err.name === 'AbortError' || err.message?.toLowerCase().includes('abort')) {
            return;
        }
        if (thisRequestId !== currentResultsRequestId) return;
        tbody.innerHTML = `<tr><td colspan="10" class="loading-cell" style="color:var(--danger)">Error: ${escapeHtml(err.message)}</td></tr>`;
        const countEl = $('results-showing-count');
        const fCountEl = $('results-f-showing-count');
        const passRateEl = $('results-pass-rate-number');
        const passDetailWrap = $('results-pass-detail-wrap');
        if (countEl) countEl.innerText = '0';
        if (fCountEl) fCountEl.innerText = '0';
        if (passRateEl) passRateEl.innerText = '0.0%';
        if (passDetailWrap) passDetailWrap.innerText = '(0/0)';
    }
}

/**
 * Update round reset button state and badge
 */
function updateResultsResetButton() {
    const resetBtn = document.querySelector('.btn-reset-round');
    const badge = document.getElementById('results-filter-badge');
    
    if (!resetBtn) return;
    
    // Count active filters
    let filterCount = 0;
    
    // Check department+section filter
    if (currentResultsDeptFilter && currentResultsDeptFilter !== 'All') filterCount++;
    
    // Check batch filter
    if (window.currentResultsBatchFilter && window.currentResultsBatchFilter !== 'All') filterCount++;
    
    // Check semester filter
    const semFilter = document.getElementById('filter-semester');
    if (semFilter && semFilter.value) filterCount++;
    
    // Check subject code filter
    const subjectFilter = document.getElementById('filter-subject-code');
    if (subjectFilter && subjectFilter.value.trim()) filterCount++;
    
    // Check reg no filter
    const regNoFilter = document.getElementById('filter-reg-no');
    if (regNoFilter && regNoFilter.value.trim()) filterCount++;
    
    // Check F grades filter
    if (window.fGradesFilterActive) filterCount++;
    
    // Update button state
    if (filterCount > 0) {
        resetBtn.classList.add('has-filters');
        if (badge) {
            badge.textContent = filterCount;
        }
    } else {
        resetBtn.classList.remove('has-filters');
        if (badge) {
            badge.textContent = '';
        }
    }
}

/**
 * Enhanced clear results filters to include department+section
 */
const originalClearResultsFilters = window.clearResultsFilters;
window.clearResultsFilters = function() {
    // Reset department+section filter
    currentResultsDeptFilter = 'All';
    
    // Update department tabs
    const container = document.getElementById('results-dept-tabs-container');
    if (container) {
        container.querySelectorAll('.dept-tab').forEach(tab => {
            const tabDept = tab.getAttribute('data-dept');
            tab.classList.toggle('active', tabDept === 'All');
        });
    }
    
    // Rebuild department tabs for all students
    if (resultsAllStudentsCache.length > 0) {
        buildResultsDepartmentTabs(resultsAllStudentsCache);
    }
    
    // Call original function
    if (originalClearResultsFilters) {
        originalClearResultsFilters();
    } else {
        // Fallback: reset other filters manually
        currentResultsBatchFilter = 'All';
        const batchContainer = $('results-batch-tabs-container');
        if (batchContainer) {
            batchContainer.querySelectorAll('.dept-tab').forEach(tab => {
                if (tab.textContent.trim().toLowerCase().includes('all')) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        }
        buildResultsBatchTabs();
        const semFilter = $('filter-semester');
        const subFilter = $('filter-subject-code');
        const regFilter = $('filter-reg-no');
        if (semFilter) semFilter.value = '';
        if (subFilter) subFilter.value = '';
        if (regFilter) regFilter.value = '';
        resultsCurrentPage = 1;
        loadResults();
    }
    
    // Update reset button state
    setTimeout(() => updateResultsResetButton(), 100);
};

/**
 * Hook into loadResults to build department tabs and update reset button
 */
const originalLoadResults = window.loadResults;
window.loadResults = async function() {
    // Build department tabs if not yet built
    const container = document.getElementById('results-dept-tabs-container');
    
    if (container && !container.hasChildNodes()) {
        const students = await ensureResultsStudentsCache();
        await buildResultsDepartmentTabs(students);
    }
    
    if (originalLoadResults) {
        await originalLoadResults();
    }
    
    updateResultsResetButton();
};

/**
 * Hook into applyFilters to update reset button state
 */
const originalApplyFilters = window.applyFilters;
window.applyFilters = function(immediate = false) {
    if (originalApplyFilters) {
        originalApplyFilters(immediate);
    }
    updateResultsResetButton();
};

/**
 * Hook into toggleFGradesFilter to update reset button
 */
const originalToggleFGradesFilter = window.toggleFGradesFilter;
window.toggleFGradesFilter = function() {
    if (originalToggleFGradesFilter) {
        originalToggleFGradesFilter();
    }
    setTimeout(() => updateResultsResetButton(), 50);
};

/**
 * Hook into selectResultsBatchTab to rebuild department tabs based on batch
 */
const originalSelectResultsBatchTab = window.selectResultsBatchTab;
window.selectResultsBatchTab = async function(batch) {
    if (originalSelectResultsBatchTab) {
        originalSelectResultsBatchTab(batch);
    }
    
    // Reset department filter when batch changes
    currentResultsDeptFilter = 'All';
    
    // Rebuild department tabs based on selected batch
    const students = await ensureResultsStudentsCache();
    let filteredByBatch = students;
    if (batch !== 'All') {
        filteredByBatch = students.filter(s => s.batch === batch);
    }
    
    await buildResultsDepartmentTabs(filteredByBatch);
    setTimeout(() => updateResultsResetButton(), 50);
};

/**
 * Initialize department tabs when switching to results view
 */
const originalSwitchView = window.switchView;
window.switchView = function(viewName) {
    if (originalSwitchView) {
        originalSwitchView(viewName);
    }
    
    // Build tabs when switching to results view
    if (viewName === 'results') {
        setTimeout(async () => {
            const students = await ensureResultsStudentsCache();
            await buildResultsDepartmentTabs(students);
            updateResultsResetButton();
        }, 100);
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Build tabs if we're on results view
    const resultsView = document.getElementById('view-results');
    if (resultsView && !resultsView.classList.contains('hidden')) {
        const students = await ensureResultsStudentsCache();
        await buildResultsDepartmentTabs(students);
        updateResultsResetButton();
    }
});


/* ============================================================
   INTEGRATED FROM Result-motion.js
   ============================================================ */

/* ============================================================
   RESULT-MOTION.JS — Professional Academic Motion Layer
   PTU Grade Portal · Puducherry Technological University
   100% anime.js — Loaded AFTER Result.js

   Provides:
   · Orchestrated hero entrance sequence
   · Public portal view crossfade transitions
   · Multi-step auth & OTP wizard transitions
   · Error-shake feedback on failed submissions & toasts
   · Academic report card reveal animation
   · Developer modal entrance / exit
   · Self-healing universal sliding tab indicators
   · Staff dashboard view switch panel & card stagger
   · High-performance data table row micro-stagger
   · Precision theme-aware ripple feedback
   · Robust numeric counter animations
   · Toast slide-in entrance

   Motion Principles (Academic Enterprise):
   · Easing: easeOutExpo for entries, easeInExpo for exits.
   · Durations: 180–380ms. Nothing slower than 400ms.
   · Staggers: 12–35ms/row, max 16 rows animated.
   · Reduced-motion: Zero animation. Interface remains instant.
   · No bounces, no wobbles, no playful spring overshoots.
   ============================================================ */

(function () {
  'use strict';

  /* ───────────────────────────────────────────────────────────────
     FOUNDATION: Capabilities & Reduced-Motion
  ─────────────────────────────────────────────────────────────── */
  const anime = typeof window !== 'undefined' ? window.anime : undefined;
  const hasAnime = typeof anime !== 'undefined';

  // Live query — responds to OS setting changes without page reload
  const motionMQ = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduceMotion = motionMQ ? motionMQ.matches : false;
  if (motionMQ) {
    motionMQ.addEventListener('change', (e) => { reduceMotion = e.matches; });
  }

  function canAnimate() { return hasAnime && !reduceMotion; }

  /* ───────────────────────────────────────────────────────────────
     EASING CONSTANTS  (Professional Academic Standard)
  ─────────────────────────────────────────────────────────────── */
  const EASE_OUT  = 'easeOutExpo';
  const EASE_IN   = 'easeInExpo';
  const EASE_CIRC = 'easeOutCirc';

  /* ───────────────────────────────────────────────────────────────
     HELPERS
  ─────────────────────────────────────────────────────────────── */
  function clearInlineTransform(el) {
    el.style.transform = '';
    el.style.opacity   = '';
  }

  function isDataRow(tr) {
    // Ignore placeholder / loading / empty rows
    const td = tr.querySelector('td');
    if (!td) return false;
    if (td.classList.contains('loading-cell')) return false;
    if (td.classList.contains('empty-cell'))   return false;
    return tr.cells.length > 1 || !td.colSpan || td.colSpan < 3;
  }

  /* ─────────────────────────────────────────────────────────────
     ENTRY ANIMATION — section becomes visible
  ───────────────────────────────────────────────────────────── */
  function revealSection(el, { dy = 12, dur = 300, delay = 0 } = {}) {
    if (!el || !canAnimate()) return;
    anime.remove(el);
    anime({
      targets: el,
      opacity:    [0, 1],
      translateY: [dy, 0],
      duration:   dur,
      delay:      delay,
      easing:     EASE_OUT,
      complete:   () => clearInlineTransform(el),
    });
  }

  /* ─────────────────────────────────────────────────────────────
     SHAKE — Subtle horizontal shake for form errors
  ───────────────────────────────────────────────────────────── */
  function shakeElement(el) {
    if (!el || !canAnimate()) return;
    anime.remove(el);
    anime({
      targets:    el,
      translateX: [0, -6, 6, -4, 4, -2, 0],
      duration:   320,
      easing:     EASE_CIRC,
      complete:   () => { el.style.transform = ''; },
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     1. ORCHESTRATED HOMEPAGE HERO ENTRANCE
     Targets: home-section, hero elements, portal cards, stats
  ═══════════════════════════════════════════════════════════════ */
  function initHeroEntrance() {
    const hero = document.getElementById('home-section');
    if (!hero || !canAnimate()) return;
    _runHeroEntrance(hero);
  }

  function _runHeroEntrance(hero) {
    if (!canAnimate()) return;

    // 1. Nameplate  — slides in from slight top offset
    const nameplate = hero.querySelector('.ptu-nameplate');
    if (nameplate) {
      anime.remove(nameplate);
      anime({
        targets:    nameplate,
        opacity:    [0, 1],
        translateY: [-8, 0],
        duration:   420,
        delay:      60,
        easing:     EASE_OUT,
        complete:   () => clearInlineTransform(nameplate),
      });
    }

    // 2. Hero title + description — cascade reveal
    const heroTitle = hero.querySelector('.home-title, .hero-title');
    const heroDesc  = hero.querySelector('.home-desc, .hero-desc');
    [heroTitle, heroDesc].forEach((el, i) => {
      if (!el) return;
      anime.remove(el);
      anime({
        targets:    el,
        opacity:    [0, 1],
        translateY: [14, 0],
        duration:   340,
        delay:      120 + i * 80,
        easing:     EASE_OUT,
        complete:   () => clearInlineTransform(el),
      });
    });

    // 3. Notice marquee
    const marquee = hero.querySelector('.notice-marquee, .marquee');
    if (marquee) {
      anime.remove(marquee);
      anime({
        targets:    marquee,
        opacity:    [0, 1],
        translateY: [8, 0],
        duration:   280,
        delay:      260,
        easing:     EASE_OUT,
        complete:   () => clearInlineTransform(marquee),
      });
    }

    // 4. Portal cards — staggered entry from below
    const portalCards = hero.querySelectorAll('.portal-card');
    if (portalCards.length) {
      anime.remove(portalCards);
      anime({
        targets:    portalCards,
        opacity:    [0, 1],
        translateY: [16, 0],
        delay:      anime.stagger(70, { start: 300 }),
        duration:   360,
        easing:     EASE_OUT,
        complete:   () => portalCards.forEach(clearInlineTransform),
      });
    }

    // 5. Home stats — fast stagger
    const stats = hero.querySelectorAll('.home-stat');
    if (stats.length) {
      anime.remove(stats);
      anime({
        targets:    stats,
        opacity:    [0, 1],
        translateY: [10, 0],
        delay:      anime.stagger(40, { start: 420 }),
        duration:   260,
        easing:     EASE_OUT,
        complete:   () => stats.forEach(clearInlineTransform),
      });
    }

    // 6. Footer
    const footer = hero.querySelector('.home-footer, .hero-footer');
    if (footer) {
      anime.remove(footer);
      anime({
        targets:    footer,
        opacity:    [0, 1],
        duration:   240,
        delay:      500,
        easing:     EASE_OUT,
        complete:   () => clearInlineTransform(footer),
      });
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     2. PUBLIC NAVIGATION — Crossfade transitions between views
     Patches navigateToHome, openReportCardFromHome,
     openStaffPortalFromHome
  ═══════════════════════════════════════════════════════════════ */
  function patchPublicNavigation() {
    // Wrap navigateToHome
    if (typeof window.navigateToHome === 'function') {
      const _navHome = window.navigateToHome;
      window.navigateToHome = function () {
        _navHome.call(this);
        const home = document.getElementById('home-section');
        if (home && !home.classList.contains('hidden')) {
          _runHeroEntrance(home);
        }
      };
    }

    // Wrap openReportCardFromHome
    if (typeof window.openReportCardFromHome === 'function') {
      const _navRC = window.openReportCardFromHome;
      window.openReportCardFromHome = function () {
        _navRC.call(this);
        const section = document.getElementById('report-card-section');
        if (section && !section.classList.contains('hidden')) {
          revealSection(section, { dy: 12, dur: 300 });
          // Reveal the visible auth-card-like form inside it
          const card = section.querySelector('.auth-card:not(.hidden), .report-card-lookup-card:not(.hidden)');
          if (card) revealSection(card, { dy: 10, dur: 280, delay: 60 });
        }
      };
    }

    // Wrap openStaffPortalFromHome
    if (typeof window.openStaffPortalFromHome === 'function') {
      const _navStaff = window.openStaffPortalFromHome;
      window.openStaffPortalFromHome = function () {
        _navStaff.call(this);
        const section = document.getElementById('auth-section');
        if (section && !section.classList.contains('hidden')) {
          revealSection(section, { dy: 12, dur: 300 });
          const hero = section.querySelector('.mgmt-staff-hero');
          if (hero) revealSection(hero, { dy: 12, dur: 300 });
          // Full orchestrated entrance: card → header → fields → pills → footer
          requestAnimationFrame(() => initAuthEntrance());
        }
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     3. AUTH WIZARD — Staff Sign-In Multi-Step Transitions
     Uses CSS class-driven 3D flip-slide between steps with
     direction awareness, matching the YouTube reference style.
  ═══════════════════════════════════════════════════════════════ */

  // Step order for direction detection
  const AUTH_STEP_ORDER = ['login', 'otp-request', 'otp-verify', 'set-password'];
  let _lastAuthStep = 'login';

  function _removeAuthStepClasses(el) {
    el.classList.remove(
      'auth-step-in-right', 'auth-step-in-left',
      'auth-step-out-left', 'auth-step-out-right'
    );
  }

  function patchShowAuthStep() {
    if (typeof window.showAuthStep !== 'function') return;
    const _showAuthStep = window.showAuthStep;

    window.showAuthStep = function (stepName) {
      if (!canAnimate()) {
        _showAuthStep.call(this, stepName);
        _lastAuthStep = stepName;
        return;
      }

      const fromIdx = AUTH_STEP_ORDER.indexOf(_lastAuthStep);
      const toIdx   = AUTH_STEP_ORDER.indexOf(stepName);
      const goForward = toIdx >= fromIdx; // forward = register flow, backward = back to login

      // ── 1. Exit the currently-visible step ──
      const fromEl = document.getElementById(`auth-step-${_lastAuthStep}`);
      if (fromEl && fromEl.style.display !== 'none') {
        _removeAuthStepClasses(fromEl);
        fromEl.classList.add(goForward ? 'auth-step-out-left' : 'auth-step-out-right');
      }

      // ── 2. After short exit, call original logic then animate entrance ──
      const exitDur = 200; // ms — matches CSS authStepOutLeft duration
      setTimeout(() => {
        _showAuthStep.call(this, stepName);

        const toEl = document.getElementById(`auth-step-${stepName}`);
        if (!toEl || toEl.style.display === 'none') {
          _lastAuthStep = stepName;
          return;
        }

        // Force reflow so the class triggers the animation
        _removeAuthStepClasses(toEl);
        void toEl.offsetWidth; // reflow
        toEl.classList.add(goForward ? 'auth-step-in-right' : 'auth-step-in-left');

        // ── 3. Staggered cascade on inner form fields ──
        const fields = toEl.querySelectorAll('.form-group, .step-indicator, .auth-footer');
        if (fields.length && hasAnime) {
          anime.remove(fields);
          anime({
            targets:    fields,
            opacity:    [0, 1],
            translateY: [10, 0],
            delay:      anime.stagger(28, { start: 120 }),
            duration:   240,
            easing:     EASE_OUT,
            complete:   () => fields.forEach(clearInlineTransform),
          });
        }

        // ── 4. Auth card title morph: brief scale-pulse on header ──
        const header = toEl.closest('.auth-card')?.querySelector('.auth-card-header');
        if (header && hasAnime) {
          anime.remove(header);
          anime({
            targets:  header,
            opacity:  [0.5, 1],
            scale:    [0.97, 1],
            duration: 280,
            easing:   EASE_OUT,
            complete: () => clearInlineTransform(header),
          });
        }

        _lastAuthStep = stepName;
      }, exitDur);

      _lastAuthStep = stepName; // optimistic update for rapid re-clicks
    };
  }


  function _shakeAuthCard() {
    const card = document.querySelector('.auth-card');
    if (card) shakeElement(card);
  }

  /* ═══════════════════════════════════════════════════════════════
     4. STUDENT OTP PORTAL — Step Transitions
     Patches showRcLookupStep and showRcOtpStep
  ═══════════════════════════════════════════════════════════════ */
  function patchStudentOtpSteps() {
    if (typeof window.showRcLookupStep === 'function') {
      const _orig = window.showRcLookupStep;
      window.showRcLookupStep = function () {
        _orig.call(this);
        if (!canAnimate()) return;
        const el = document.getElementById('rc-step-lookup');
        if (el && !el.classList.contains('hidden')) {
          anime.remove(el);
          anime({
            targets:    el,
            opacity:    [0, 1],
            translateX: [-8, 0],
            duration:   260,
            easing:     EASE_OUT,
            complete:   () => clearInlineTransform(el),
          });
        }
      };
    }

    if (typeof window.showRcOtpStep === 'function') {
      const _orig = window.showRcOtpStep;
      window.showRcOtpStep = function () {
        _orig.call(this);
        if (!canAnimate()) return;
        const el = document.getElementById('rc-step-otp');
        if (el && !el.classList.contains('hidden')) {
          anime.remove(el);
          anime({
            targets:    el,
            opacity:    [0, 1],
            translateX: [8, 0],
            duration:   260,
            easing:     EASE_OUT,
            complete:   () => clearInlineTransform(el),
          });
        }
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     5. REPORT CARD REVEAL
     Patches renderReportCard for academic transcript presentation
  ═══════════════════════════════════════════════════════════════ */
  function patchRenderReportCard() {
    if (typeof window.renderReportCard !== 'function') return;
    const _orig = window.renderReportCard;
    window.renderReportCard = function (data, targetId) {
      _orig.call(this, data, targetId);

      if (!canAnimate()) return;

      const paperId = targetId || 'report-card-paper';
      const paper   = document.getElementById(paperId);
      if (!paper) return;

      // 1. The paper document itself — formal academic reveal
      anime.remove(paper);
      anime({
        targets:    paper,
        opacity:    [0, 1],
        translateY: [16, 0],
        scale:      [0.985, 1],
        duration:   380,
        easing:     EASE_OUT,
        complete:   () => clearInlineTransform(paper),
      });

      // 2. Stagger inner sections (semester blocks, summary panels)
      const sections = paper.querySelectorAll(
        '.rc-semester-block, .rc-summary, .rc-table-wrap, ' +
        '.rc-header, .rc-student-meta, .rc-cgpa-panel'
      );
      if (sections.length) {
        anime.remove(sections);
        anime({
          targets:    sections,
          opacity:    [0, 1],
          translateY: [8, 0],
          delay:      anime.stagger(30, { start: 160 }),
          duration:   260,
          easing:     EASE_OUT,
          complete:   () => sections.forEach(clearInlineTransform),
        });
      }
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     6. AUTH CARD ENTRANCE (on initial page load / when portal opens)
     Coordinates: card → header → form fields → role pills → footer
  ═══════════════════════════════════════════════════════════════ */
  function initAuthEntrance() {
    const card = document.querySelector('#auth-section .auth-card');
    if (!card || !canAnimate()) return;

    // Card itself — already handled by CSS cardIn keyframe,
    // but we reinforce with anime for the JS-controlled open path
    anime({
      targets:    card,
      opacity:    [0, 1],
      translateY: [28, 0],
      scale:      [0.94, 1],
      rotateX:    [8, 0],
      duration:   520,
      delay:      80,
      easing:     EASE_OUT,
      complete:   () => clearInlineTransform(card),
    });

    // Header
    const header = card.querySelector('.auth-card-header');
    if (header) {
      anime.remove(header);
      anime({
        targets:    header,
        opacity:    [0, 1],
        translateY: [10, 0],
        duration:   300,
        delay:      240,
        easing:     EASE_OUT,
        complete:   () => clearInlineTransform(header),
      });
    }

    // Form fields
    const fields = card.querySelectorAll('.form-group, .step-indicator');
    if (fields.length) {
      anime.remove(fields);
      anime({
        targets:    fields,
        opacity:    [0, 1],
        translateY: [12, 0],
        delay:      anime.stagger(40, { start: 320 }),
        duration:   280,
        easing:     EASE_OUT,
        complete:   () => fields.forEach(clearInlineTransform),
      });
    }

    // Role pill buttons — staggered pop-in
    const pills = card.querySelectorAll('.role-pill-btn');
    if (pills.length) {
      anime.remove(pills);
      anime({
        targets:    pills,
        opacity:    [0, 1],
        scale:      [0.85, 1],
        translateY: [8, 0],
        delay:      anime.stagger(45, { start: 400 }),
        duration:   260,
        easing:     'easeOutBack',
        complete:   () => pills.forEach(clearInlineTransform),
      });
    }

    // Submit button
    const submitBtn = card.querySelector('.btn-primary');
    if (submitBtn) {
      anime.remove(submitBtn);
      anime({
        targets:    submitBtn,
        opacity:    [0, 1],
        translateY: [8, 0],
        scale:      [0.96, 1],
        duration:   260,
        delay:      560,
        easing:     EASE_OUT,
        complete:   () => clearInlineTransform(submitBtn),
      });
    }

    // Auth footer links
    const footers = card.querySelectorAll('.auth-footer');
    if (footers.length) {
      anime.remove(footers);
      anime({
        targets:    footers,
        opacity:    [0, 1],
        translateY: [6, 0],
        delay:      anime.stagger(30, { start: 600 }),
        duration:   220,
        easing:     EASE_OUT,
        complete:   () => footers.forEach(clearInlineTransform),
      });
    }
  }


  /* ═══════════════════════════════════════════════════════════════
     7. DEVELOPER REPORT CARD MODAL — Open / Close
  ═══════════════════════════════════════════════════════════════ */
  function patchDeveloperModal() {
    const modal   = document.getElementById('developer-rc-modal');
    const content = modal?.querySelector('.developer-modal-content');
    if (!modal || !content) return;

    // Use a MutationObserver on the modal's class list so we can
    // animate open even if it's triggered deep in Result.js
    const modalObserver = new MutationObserver(() => {
      if (!modal.classList.contains('hidden') && canAnimate()) {
        // Backdrop
        anime.remove(modal);
        anime({
          targets:  modal,
          opacity:  [0, 1],
          duration: 200,
          easing:   EASE_OUT,
        });
        // Content window
        anime.remove(content);
        anime({
          targets:    content,
          opacity:    [0, 1],
          translateY: [20, 0],
          scale:      [0.975, 1],
          duration:   300,
          delay:      40,
          easing:     EASE_OUT,
          complete:   () => clearInlineTransform(content),
        });
      }
    });
    modalObserver.observe(modal, { attributes: true, attributeFilter: ['class'] });

    // Patch closeDeveloperRcModal for smooth exit
    if (typeof window.closeDeveloperRcModal === 'function') {
      const _origClose = window.closeDeveloperRcModal;
      window.closeDeveloperRcModal = function () {
        if (!canAnimate()) { _origClose.call(this); return; }

        anime.remove(modal);
        anime({
          targets:  modal,
          opacity:  [1, 0],
          duration: 180,
          easing:   EASE_IN,
          complete: () => { _origClose.call(this); modal.style.opacity = ''; },
        });
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     8. UNIVERSAL SLIDING TAB INDICATORS
     Covers: dept-tabs-container, section-tabs-container,
             batch-tabs-container, results-batch-tabs-container
  ═══════════════════════════════════════════════════════════════ */
  function initTabIndicators() {
    const containerIds = [
      'dept-tabs-container',
      'section-tabs-container',
      'batch-tabs-container',
      'results-batch-tabs-container',
    ];

    containerIds.forEach((id) => {
      const container = document.getElementById(id);
      if (!container) return;
      _attachTabIndicator(container);
    });
  }

  function _attachTabIndicator(container) {
    const wrapper = (container.closest && container.closest('[class*="dept-tabs"]')) || container.parentElement || container;
    if (!wrapper) return;

    if (getComputedStyle(wrapper).position === 'static') {
      wrapper.style.position = 'relative';
    }

    if (wrapper.querySelector(':scope > .dept-tab-indicator')) return;

    const indicator = document.createElement('div');
    indicator.className = 'dept-tab-indicator';
    wrapper.appendChild(indicator);

    let currentX  = null;
    let currentW  = null;
    let raf       = null;

    function getActiveTab() {
      return container.querySelector('.dept-tab.active');
    }

    function place(tab, animate) {
      if (!tab) {
        indicator.style.opacity = '0';
        currentX = null;
        currentW = null;
        return;
      }

      const wRect = wrapper.getBoundingClientRect();
      const tRect = tab.getBoundingClientRect();
      if (tRect.width === 0) {
        indicator.style.opacity = '0';
        return;
      }

      const left  = tRect.left - wRect.left;
      const width = tRect.width;

      indicator.style.width   = width + 'px';
      indicator.style.opacity = '1';

      if (canAnimate() && animate && currentX !== null) {
        anime.remove(indicator);
        const proxy = { x: currentX, w: currentW ?? width };
        anime({
          targets:  proxy,
          x:        left,
          w:        width,
          duration: 260,
          easing:   EASE_OUT,
          update:   () => {
            indicator.style.transform = `translateX(${proxy.x}px)`;
            indicator.style.width     = `${proxy.w}px`;
          },
          complete: () => {
            currentX = left;
            currentW = width;
          },
        });
      } else {
        indicator.style.transform = `translateX(${left}px)`;
        currentX = left;
        currentW = width;
      }
    }

    function schedulePlace(animate) {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        place(getActiveTab(), animate);
        raf = null;
      });
    }

    // Click on tabs
    container.addEventListener('click', (e) => {
      const tab = e.target.closest('.dept-tab');
      if (tab) schedulePlace(true);
    });

    // Scroll (indicator needs to reposition on horizontal scroll)
    container.addEventListener('scroll', () => schedulePlace(false), { passive: true });

    // Re-position on window resize
    window.addEventListener('resize', () => schedulePlace(false), { passive: true });

    // MutationObserver: re-place when tab list is rebuilt by Result.js API calls
    const ro = new MutationObserver(() => schedulePlace(false));
    ro.observe(container, { childList: true, subtree: false });

    // Also watch for active class changes on existing tabs
    const classObserver = new MutationObserver(() => schedulePlace(true));
    classObserver.observe(container, { attributes: true, attributeFilter: ['class'], subtree: true });

    // Initial placement
    requestAnimationFrame(() => place(getActiveTab(), false));
  }

  /* ═══════════════════════════════════════════════════════════════
     9. DASHBOARD VIEW SWITCHING
     Patches switchView for panel transitions and card stagger
  /* ═══════════════════════════════════════════════════════════════
     9. DASHBOARD VIEW SWITCHING & WINDOW ORCHESTRATION
     Orchestrates window entrances for: Students, Subjects,
     View Results, SGPA/CGPA, Class Report, Resources, Upload, Dashboard.
  ═══════════════════════════════════════════════════════════════ */
  function patchSwitchView() {
    if (typeof window.switchView !== 'function') return;
    const _origSwitch = window.switchView;

    window.switchView = function (view) {
      _origSwitch.call(this, view);

      const panel = document.getElementById(`view-${view}`);
      if (!panel || panel.classList.contains('hidden')) return;

      if (canAnimate()) {
        // Panel entrance
        anime.remove(panel);
        anime({
          targets:    panel,
          opacity:    [0, 1],
          translateY: [10, 0],
          duration:   280,
          easing:     EASE_OUT,
          complete:   () => clearInlineTransform(panel),
        });

        // Orchestrate structural window elements (Header, Tabs, Actions, Filters, Tables, Cards)
        const windowElements = panel.querySelectorAll(
          '.panel-header, .upload-hero, .resources-hero, .students-hero, .resources-overview > .resources-metric-card, ' +
          '#resource-form-container, #resources-table-container, .upload-section-heading, .upload-block > .upload-card, ' +
          '.dept-tabs, .subjects-actions-row, .filter-row, .grades-summary-grid, .stat-card, .table-scroll-region, ' +
          '.dashboard-tools-heading, .dashboard-tools-grid > .panel-section'
        );
        if (windowElements.length) {
          anime.remove(windowElements);
          anime({
            targets:    windowElements,
            opacity:    [0, 1],
            translateY: [8, 0],
            delay:      anime.stagger(30, { start: 40 }),
            duration:   260,
            easing:     EASE_OUT,
            complete:   () => windowElements.forEach(clearInlineTransform),
          });
        }
      }
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     10. DATA TABLE ROW MICRO-STAGGER & RENDER HOOKS
     Ensures Students, Subjects, View Results, SGPA/CGPA,
     Class Report, and Resources tables all have the same
     staggered loading animation on view switch and filter.
  ═══════════════════════════════════════════════════════════════ */
  const TABLE_BODIES = [
    'students-tbody',
    'subjects-tbody',
    'results-tbody',
    'grades-tbody',
    'classreport-tbody',
    'resources-tbody',
    'vis-tbody',
  ];

  function animateTableRows(tbodyIdOrEl) {
    if (!canAnimate()) return;
    const tbody = typeof tbodyIdOrEl === 'string' ? document.getElementById(tbodyIdOrEl) : tbodyIdOrEl;
    if (!tbody) return;

    const rows = Array.from(tbody.querySelectorAll('tr')).filter(isDataRow);
    if (!rows.length) return;

    // Animate the first 24 rows for visual impact (covers full viewport)
    const visible = rows.slice(0, 24);
    anime.remove(visible);
    anime({
      targets:    visible,
      opacity:    [0, 1],
      translateY: [8, 0],
      delay:      anime.stagger(16, { start: 10 }),
      duration:   240,
      easing:     EASE_OUT,
      complete:   () => visible.forEach(clearInlineTransform),
    });
  }

  function initTableRowStagger() {
    TABLE_BODIES.forEach((id) => {
      const tbody = document.getElementById(id);
      if (!tbody) return;
      _attachTableObserver(tbody);
    });
  }

  function _attachTableObserver(tbody) {
    const observer = new MutationObserver(() => {
      animateTableRows(tbody);
    });

    observer.observe(tbody, { childList: true });
  }

  function patchTableRenders() {
    // 1. Students window
    if (typeof window.renderStudents === 'function') {
      const _orig = window.renderStudents;
      window.renderStudents = function (...args) {
        _orig.apply(this, args);
        requestAnimationFrame(() => animateTableRows('students-tbody'));
      };
    }

    // 2. Subjects window
    if (typeof window.renderSubjects === 'function') {
      const _orig = window.renderSubjects;
      window.renderSubjects = function (...args) {
        _orig.apply(this, args);
        requestAnimationFrame(() => animateTableRows('subjects-tbody'));
      };
    }

    // 3. View Results window
    if (typeof window.renderResultsTable === 'function') {
      const _orig = window.renderResultsTable;
      window.renderResultsTable = function (...args) {
        _orig.apply(this, args);
        requestAnimationFrame(() => animateTableRows('results-tbody'));
      };
    }

    // 4. SGPA / CGPA window (loadGrades)
    if (typeof window.loadGrades === 'function') {
      const _orig = window.loadGrades;
      window.loadGrades = async function (...args) {
        const res = await _orig.apply(this, args);
        requestAnimationFrame(() => animateTableRows('grades-tbody'));
        return res;
      };
    }

    // 5. Class Report window (loadClassReport)
    if (typeof window.loadClassReport === 'function') {
      const _orig = window.loadClassReport;
      window.loadClassReport = async function (...args) {
        const res = await _orig.apply(this, args);
        requestAnimationFrame(() => animateTableRows('classreport-tbody'));
        return res;
      };
    }

    // 6. Resources window
    if (typeof window.renderResourcesTable === 'function') {
      const _orig = window.renderResourcesTable;
      window.renderResourcesTable = function (...args) {
        _orig.apply(this, args);
        requestAnimationFrame(() => animateTableRows('resources-tbody'));
      };
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     11. RIPPLE FEEDBACK
     Precision, overflow-clipped, theme-aware ripple on
     interactive controls.
  ═══════════════════════════════════════════════════════════════ */
  const RIPPLE_TARGETS =
    '.btn-primary, .btn-secondary, .btn-small, .btn-export, ' +
    '.nav-item, .dept-tab, .theme-toggle, .sidebar-toggle-btn, ' +
    '.btn-logout, .brand-logo-toggle-btn, .portal-card, ' +
    '.theme-switch-option, .role-pill-btn, .public-nav-btn';

  function initRipples() {
    document.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const el = e.target.closest(RIPPLE_TARGETS);
      if (!el || el.disabled) return;
      _spawnRipple(el, e);
    });
  }

  function _spawnRipple(el, e) {
    const cs = getComputedStyle(el);
    if (cs.overflow === 'visible') el.style.overflow = 'hidden';
    if (cs.position === 'static')  el.style.position = 'relative';

    const existing = el.querySelector(':scope > .ui-ripple');
    if (existing) existing.remove();

    const rect   = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ui-ripple';

    const size = Math.max(rect.width, rect.height) * 2.0;
    const cx   = (e.clientX ?? rect.left + rect.width  / 2) - rect.left;
    const cy   = (e.clientY ?? rect.top  + rect.height / 2) - rect.top;

    ripple.style.cssText = `
      width:${size}px;height:${size}px;
      left:${cx - size / 2}px;top:${cy - size / 2}px;
    `;

    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  /* ═══════════════════════════════════════════════════════════════
     12. ROBUST NUMERIC COUNTER ANIMATION
     Handles integers, formatted strings. Prevents race conditions.
  ═══════════════════════════════════════════════════════════════ */
  const COUNTER_IDS = [
    'stat-students', 'stat-subjects', 'stat-results',
    'home-stat-students', 'home-stat-subjects',
    'home-stat-results', 'home-stat-depts',
  ];

  function initStatCounters() {
    const statEls = COUNTER_IDS
      .map((id) => document.getElementById(id))
      .filter(Boolean);

    if (!statEls.length) return;

    const observer = new MutationObserver(() => {
      statEls.forEach((el) => _animateCounter(el));
    });

    statEls.forEach((el) => {
      observer.observe(el, { childList: true, characterData: true, subtree: true });
    });
  }

  function _animateCounter(el) {
    if (el._isAnimating) return;
    const raw = parseInt(String(el.textContent).replace(/[^\d]/g, ''), 10) || 0;
    if (raw === el._lastVal) return;
    el._lastVal = raw;

    if (!canAnimate()) { el.textContent = raw; return; }

    el._isAnimating = true;
    const tween = { v: 0 };

    anime({
      targets:  tween,
      v:        raw,
      round:    1,
      duration: 640,
      easing:   EASE_OUT,
      update:   () => { el.textContent = tween.v; },
      complete: () => {
        el.textContent   = raw;
        setTimeout(() => { el._isAnimating = false; }, 60);
      },
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     13. TOAST NOTIFICATION ENTRANCE & ERROR FEEDBACK SHAKE
  ═══════════════════════════════════════════════════════════════ */
  function patchShowToast() {
    if (typeof window.showToast !== 'function') return;
    const _origToast = window.showToast;

    window.showToast = function (message, type = 'success', durationMs = 3200) {
      _origToast.call(this, message, type, durationMs);

      // On error toast, provide tactile feedback to active auth or lookup card
      if (type === 'error' || type === 'warning') {
        const authSection = document.getElementById('auth-section');
        const rcSection   = document.getElementById('report-card-section');

        if (authSection && !authSection.classList.contains('hidden')) {
          _shakeAuthCard();
        } else if (rcSection && !rcSection.classList.contains('hidden')) {
          const visibleCard = rcSection.querySelector('.auth-card:not(.hidden), .report-card-lookup-card:not(.hidden)');
          if (visibleCard) shakeElement(visibleCard);
        }
      }

      // Smooth slide-in for the newly added toast
      if (canAnimate()) {
        const container = document.getElementById('toast-container');
        const lastToast = container?.lastElementChild;
        if (lastToast && !lastToast._animating) {
          lastToast._animating = true;
          anime.remove(lastToast);
          anime({
            targets:    lastToast,
            opacity:    [0, 1],
            translateX: [20, 0],
            duration:   240,
            easing:     EASE_OUT,
            complete:   () => clearInlineTransform(lastToast),
          });
        }
      }
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     14. THEME TOGGLE — Icon spin transition
  ═══════════════════════════════════════════════════════════════ */
  function patchToggleTheme() {
    if (typeof window.toggleTheme !== 'function') return;
    const btn  = document.getElementById('theme-toggle');
    const _orig = window.toggleTheme;

    window.toggleTheme = function () {
      if (!btn || !canAnimate()) { _orig.call(this); return; }

      anime.remove(btn);
      anime({
        targets:  btn,
        rotate:   [0, 120],
        scale:    [1, 0.78],
        duration: 160,
        easing:   EASE_IN,
        complete: () => {
          _orig.call(this);
          anime({
            targets:  btn,
            rotate:   [240, 360],
            scale:    [0.78, 1],
            duration: 300,
            easing:   EASE_OUT,
            complete: () => { btn.style.transform = ''; },
          });
        },
      });
    };
  }

  /* ═══════════════════════════════════════════════════════════════
     15. ROLE PILL SELECTION — Pop + scale micro-animation
     Triggers on each role pill click for kinetic feedback
  ═══════════════════════════════════════════════════════════════ */
  function initAuthRolePills() {
    const container = document.getElementById('auth-role-pills');
    if (!container) return;

    container.addEventListener('click', (e) => {
      const pill = e.target.closest('.role-pill-btn');
      if (!pill || !canAnimate()) return;

      // De-select pop: subtle squeeze on all non-active pills
      const allPills = container.querySelectorAll('.role-pill-btn');
      allPills.forEach((p) => {
        if (p !== pill) {
          anime.remove(p);
          anime({
            targets:  p,
            scale:    [1, 0.95, 1],
            duration: 200,
            easing:   'easeOutQuad',
            complete: () => { p.style.transform = ''; },
          });
        }
      });

      // Selected pill: scale-pop with overshoot
      anime.remove(pill);
      anime({
        targets:  pill,
        scale:    [1, 0.92, 1.10, 1],
        duration: 360,
        easing:   'easeOutElastic(1, 0.6)',
        complete: () => { pill.style.transform = ''; },
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     INIT — Wire everything up after DOM ready
  ═══════════════════════════════════════════════════════════════ */
  document.addEventListener('DOMContentLoaded', () => {
    initRipples();
    initAuthEntrance();
    initAuthRolePills();
    initHeroEntrance();
    initTabIndicators();
    initTableRowStagger();
    initStatCounters();

    patchPublicNavigation();
    patchShowAuthStep();
    patchStudentOtpSteps();
    patchRenderReportCard();
    patchDeveloperModal();
    patchSwitchView();
    patchTableRenders();
    patchShowToast();
    patchToggleTheme();
  });

})();