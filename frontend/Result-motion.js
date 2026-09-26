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
          '.panel-header, .dept-tabs, .subjects-actions-row, .filter-row, ' +
          '.grades-summary-grid, .upload-block, .stat-card, .table-scroll-region'
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