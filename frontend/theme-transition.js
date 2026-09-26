/**
 * PTU GRADE PORTAL - PREMIUM THEME TRANSITION SYSTEM
 * Cinematic Light ↔ Dark Mode Animation
 * Using Anime.js for smooth, GPU-accelerated transitions
 * Implementation: 2026-09-26
 */

// ============================================================
// THEME TRANSITION CONTROLLER
// ============================================================

const ThemeTransition = {
  isTransitioning: false,
  transitionDuration: 800,
  reducedMotion: false,

  init() {
    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = mediaQuery.matches;
    
    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
    });

    // Create transition overlay container
    this.createOverlay();
  },

  createOverlay() {
    // Remove existing overlay if present
    const existing = document.getElementById('theme-transition-overlay');
    if (existing) existing.remove();

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'theme-transition-overlay';
    overlay.className = 'theme-transition-overlay';
    overlay.innerHTML = `
      <svg class="theme-transition-svg" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        <defs>
          <clipPath id="theme-clip-path">
            <circle id="theme-transition-circle" cx="50" cy="50" r="0" />
          </clipPath>
        </defs>
        <rect class="theme-transition-rect" x="0" y="0" width="100" height="100" clip-path="url(#theme-clip-path)" />
      </svg>
    `;
    document.body.appendChild(overlay);
  },

  /**
   * Execute theme transition animation
   * @param {string} newTheme - 'light' or 'dark'
   * @param {Event} event - Click event for position tracking
   */
  async transition(newTheme, event) {
    // Prevent multiple simultaneous transitions
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // If reduced motion, do instant transition
    if (this.reducedMotion) {
      this.instantTransition(newTheme);
      return;
    }

    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    
    // Get click position for expanding circle origin
    const { x, y } = this.getClickPosition(event);

    // Setup overlay
    const overlay = document.getElementById('theme-transition-overlay');
    const circle = document.getElementById('theme-transition-circle');
    const rect = overlay.querySelector('.theme-transition-rect');

    // Set new theme color on overlay
    if (newTheme === 'dark') {
      rect.style.fill = '#0A0E17'; // Dark background
      overlay.style.opacity = '1';
    } else {
      rect.style.fill = '#F8FAFC'; // Light background
      overlay.style.opacity = '1';
    }

    // Position circle at click location
    circle.setAttribute('cx', x + '%');
    circle.setAttribute('cy', y + '%');

    // Calculate radius needed to cover entire viewport (diagonal distance)
    const maxRadius = Math.sqrt(Math.pow(Math.max(x, 100 - x), 2) + Math.pow(Math.max(y, 100 - y), 2));

    // Stage 1: Expand circle to reveal new theme
    await anime({
      targets: '#theme-transition-circle',
      r: [0, maxRadius * 1.2],
      duration: this.transitionDuration,
      easing: 'cubicBezier(0.65, 0, 0.35, 1)',
    }).finished;

    // Switch theme in DOM
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ptu_theme', newTheme);

    // Update toggle button state
    this.updateToggleButton(newTheme);

    // Animate content elements
    this.animateContentElements(newTheme);

    // Stage 2: Fade out overlay
    await anime({
      targets: '#theme-transition-overlay',
      opacity: [1, 0],
      duration: 400,
      easing: 'easeOutQuad',
      delay: 100,
    }).finished;

    // Reset overlay
    circle.setAttribute('r', '0');
    overlay.style.opacity = '0';

    this.isTransitioning = false;
  },

  /**
   * Instant transition for reduced motion
   */
  instantTransition(newTheme) {
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('ptu_theme', newTheme);
    this.updateToggleButton(newTheme);
    this.isTransitioning = false;
  },

  /**
   * Get click position as percentage of viewport
   */
  getClickPosition(event) {
    if (event && event.clientX && event.clientY) {
      return {
        x: (event.clientX / window.innerWidth) * 100,
        y: (event.clientY / window.innerHeight) * 100
      };
    }

    // Fallback to toggle button position
    const toggleBtn = document.getElementById('theme-toggle');
    if (toggleBtn) {
      const rect = toggleBtn.getBoundingClientRect();
      return {
        x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
        y: ((rect.top + rect.height / 2) / window.innerHeight) * 100
      };
    }

    // Default to center
    return { x: 50, y: 50 };
  },

  /**
   * Update toggle button visual state
   */
  updateToggleButton(theme) {
    const toggleBtn = document.getElementById('theme-toggle');
    if (!toggleBtn) return;

    const sunIcon = toggleBtn.querySelector('.sun-icon');
    const moonIcon = toggleBtn.querySelector('.moon-icon');

    if (theme === 'dark') {
      toggleBtn.setAttribute('aria-label', 'Switch to Light Mode');
      toggleBtn.setAttribute('title', 'Switch to Light Mode (Alt + T)');
    } else {
      toggleBtn.setAttribute('aria-label', 'Switch to Dark Mode');
      toggleBtn.setAttribute('title', 'Switch to Dark Mode (Alt + T)');
    }

    // Animate icon switch
    if (theme === 'dark' && sunIcon) {
      anime({
        targets: sunIcon,
        rotate: [0, 180],
        scale: [0.5, 1],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutBack'
      });
    } else if (moonIcon) {
      anime({
        targets: moonIcon,
        rotate: [0, -180],
        scale: [0.5, 1],
        opacity: [0, 1],
        duration: 400,
        easing: 'easeOutBack'
      });
    }
  },

  /**
   * Animate content elements during transition
   */
  animateContentElements(newTheme) {
    // Animate hero title
    const heroTitle = document.querySelector('.home-title, .hero-title');
    if (heroTitle) {
      anime({
        targets: heroTitle,
        scale: [0.98, 1],
        opacity: [0.7, 1],
        duration: 600,
        easing: 'easeOutQuad',
        delay: 200
      });
    }

    // Animate cards
    const cards = document.querySelectorAll('.auth-card, .stat-card, .portal-card');
    if (cards.length > 0) {
      anime({
        targets: cards,
        translateY: [10, 0],
        opacity: [0.8, 1],
        duration: 500,
        easing: 'easeOutQuad',
        delay: anime.stagger(80, {start: 250})
      });
    }

    // Animate buttons
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary');
    if (buttons.length > 0) {
      anime({
        targets: buttons,
        scale: [0.95, 1],
        duration: 400,
        easing: 'easeOutElastic(1, 0.6)',
        delay: 300
      });
    }

    // Pulse the badge
    const badge = document.querySelector('.home-badge, .hero-badge');
    if (badge) {
      anime({
        targets: badge,
        scale: [1, 1.05, 1],
        duration: 600,
        easing: 'easeInOutQuad',
        delay: 400
      });
    }
  }
};

// ============================================================
// ENHANCED TOGGLE THEME FUNCTION
// ============================================================

/**
 * Enhanced toggleTheme with cinematic animation
 * Replaces the basic toggle function
 */
async function toggleThemeCinematic(event) {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  
  await ThemeTransition.transition(next, event);
  
  // Optional: Show toast notification
  if (typeof showToast === 'function') {
    showToast(`${next === 'dark' ? '🌙 Dark' : '☀️ Light'} Mode activated`, 'info', 2000);
  }
}

// ============================================================
// INITIALIZATION
// ============================================================

// Initialize theme transition system when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    ThemeTransition.init();
  });
} else {
  ThemeTransition.init();
}

// Keyboard shortcut (Alt + T)
document.addEventListener('keydown', (e) => {
  if (e.altKey && e.key === 't') {
    e.preventDefault();
    toggleThemeCinematic(e);
  }
});

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.ThemeTransition = ThemeTransition;
  window.toggleThemeCinematic = toggleThemeCinematic;
}
