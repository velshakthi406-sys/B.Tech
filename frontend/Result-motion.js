/* ============================================================
   RESULT-MOTION.JS — Interaction & micro-animation layer
   100% anime.js — Loaded AFTER Result.js
   Enhances user interactions with spring physics, ripples,
   sliding navigation indicators, and panel transitions.
   ============================================================ */
(function () {
  const hasAnime = typeof window.anime !== 'undefined';
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canAnimate = hasAnime && !reduceMotion;

  document.addEventListener('DOMContentLoaded', () => {
    initRipples();
    initAuthEntrance();
    initTabIndicators();
    patchSwitchView();
    patchToggleTheme();
    initStatCounters();
  });

  /* ---------- Ripple feedback on interactive controls ---------- */
  function initRipples() {
    document.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return; // left click / touch only
      const el = e.target.closest(
        '.btn-primary, .btn-secondary, .btn-small, .btn-export, .nav-item, .dept-tab, .theme-toggle, .sidebar-toggle-btn, .btn-logout, .brand-logo-toggle-btn, .portal-card'
      );
      if (!el || el.disabled) return;
      spawnRipple(el, e);
    });
  }

  function spawnRipple(el, e) {
    const existing = el.querySelector(':scope > .ui-ripple');
    if (existing) existing.remove();

    const rect = el.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ui-ripple';
    const size = Math.max(rect.width, rect.height) * 1.8;
    const x = (e.clientX ?? rect.left + rect.width / 2) - rect.left - size / 2;
    const y = (e.clientY ?? rect.top + rect.height / 2) - rect.top - size / 2;
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    el.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  /* ---------- Auth card entrance ---------- */
  function initAuthEntrance() {
    const card = document.querySelector('.auth-card');
    if (!card || !canAnimate) return;
    anime({
      targets: card,
      opacity: [0, 1],
      translateY: [22, 0],
      scale: [0.98, 1],
      duration: 550,
      delay: 80,
      easing: 'easeOutExpo',
      complete: () => {
        card.style.opacity = '';
        card.style.transform = '';
      },
    });
  }

  /* ---------- Sliding underline for department/section tabs ---------- */
  function initTabIndicators() {
    const containerIds = ['dept-tabs-container', 'section-tabs-container', 'batch-tabs-container'];
    containerIds.forEach((id) => {
      const container = document.getElementById(id);
      if (!container) return;
      const wrapper = container.parentElement;
      if (!wrapper) return;
      if (getComputedStyle(wrapper).position === 'static') wrapper.style.position = 'relative';

      const indicator = document.createElement('div');
      indicator.className = 'dept-tab-indicator';
      wrapper.appendChild(indicator);

      let currentX = null;

      function place(tab, animate) {
        if (!tab) { indicator.style.opacity = 0; return; }
        const wRect = wrapper.getBoundingClientRect();
        const tRect = tab.getBoundingClientRect();
        const left = tRect.left - wRect.left + container.scrollLeft;

        indicator.style.width = tRect.width + 'px';

        if (canAnimate && animate && currentX !== null) {
          anime.remove(indicator);
          const proxy = { x: currentX };
          anime({
            targets: proxy,
            x: left,
            duration: 320,
            easing: 'easeOutExpo',
            update: () => {
              indicator.style.transform = `translateX(${proxy.x}px)`;
            },
            complete: () => { currentX = left; },
          });
          indicator.style.opacity = 1;
        } else {
          indicator.style.transform = `translateX(${left}px)`;
          indicator.style.opacity = 1;
          currentX = left;
        }
      }

      container.addEventListener('click', (e) => {
        const tab = e.target.closest('.dept-tab');
        if (tab) requestAnimationFrame(() => place(tab, true));
      });

      const renderObserver = new MutationObserver(() => {
        requestAnimationFrame(() => place(container.querySelector('.dept-tab.active'), false));
      });
      renderObserver.observe(container, { childList: true });

      container.addEventListener('scroll', () => {
        place(container.querySelector('.dept-tab.active'), false);
      });
    });
  }

  /* ---------- Wrap switchView: animate panel + stagger cards ---------- */
  function patchSwitchView() {
    if (typeof window.switchView !== 'function') return;
    const original = window.switchView;
    window.switchView = function (view) {
      original(view);
      const next = document.getElementById(`view-${view}`);
      if (!next || next.classList.contains('hidden')) return;
      if (canAnimate) {
        anime.remove(next);
        anime({
          targets: next,
          opacity: [0, 1],
          translateY: [12, 0],
          duration: 380,
          easing: 'easeOutExpo',
          complete: () => {
            next.style.opacity = '';
            next.style.transform = '';
          },
        });
      }
      const cards = next.querySelectorAll('.stat-card, .upload-card');
      if (cards.length && canAnimate) {
        anime({
          targets: cards,
          opacity: [0, 1],
          translateY: [12, 0],
          delay: anime.stagger(50),
          duration: 420,
          easing: 'easeOutQuad',
        });
      }
    };
  }

  /* ---------- Wrap toggleTheme: icon flip, hands control back to CSS ---------- */
  function patchToggleTheme() {
    if (typeof window.toggleTheme !== 'function') return;
    const btn = document.getElementById('theme-toggle');
    const original = window.toggleTheme;
    window.toggleTheme = function () {
      if (!btn || !canAnimate) return original();
      anime.remove(btn);
      anime({
        targets: btn,
        rotate: 150,
        scale: 0.75,
        duration: 180,
        easing: 'easeInQuad',
        complete: () => {
          original();
          anime({
            targets: btn,
            rotate: 360,
            scale: 1,
            duration: 360,
            easing: 'easeOutBack',
            complete: () => {
              btn.style.transform = '';
            },
          });
        },
      });
    };
  }

  /* ---------- Animated count-up for dashboard stat cards ---------- */
  function initStatCounters() {
    const stats = ['stat-students', 'stat-subjects', 'stat-results', 'home-stat-students', 'home-stat-subjects', 'home-stat-results', 'home-stat-depts']
      .map(id => document.getElementById(id))
      .filter(Boolean);
        
    if (!stats.length || !canAnimate) return;

    const observer = new MutationObserver(() => {
      stats.forEach(el => {
        if (el._isAnimating) return;
        const val = parseInt(String(el.textContent).replace(/[^\d]/g, ''), 10) || 0;
        if (val === el._current) return;
        el._current = val;
        el._isAnimating = true; 

        const tweenObj = { v: 0 };
        anime({
          targets: tweenObj,
          v: val,
          round: 1,
          duration: 600,
          easing: 'easeOutQuad',
          update: () => { 
            el.textContent = tweenObj.v; 
          },
          complete: () => { 
            el.textContent = val;
            setTimeout(() => {
              el._isAnimating = false;
            }, 50); 
          }
        });
      });
    });
    
    stats.forEach(el => observer.observe(el, { childList: true, characterData: true, subtree: true }));
  }
})();