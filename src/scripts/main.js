/* ============================================================
   Footbridge — Közös JavaScript
   Nav, reading mode, Plausible analitika
   ============================================================ */

// --- Mobil navigáció ---
const mobileToggle = document.getElementById('mobile-nav-toggle');
const siteNav = document.querySelector('.site-nav');

if (mobileToggle && siteNav) {
  mobileToggle.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('is-open');
    mobileToggle.setAttribute('aria-expanded', isOpen);
    mobileToggle.setAttribute('aria-label', isOpen ? 'Menü bezárása' : 'Menü megnyitása');
  });


  // Nav linkre kattintva bezárjuk
  siteNav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      siteNav.classList.remove('is-open');
      mobileToggle.setAttribute('aria-expanded', 'false');
    });
  });

  // Esc bezárja
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && siteNav.classList.contains('is-open')) {
      siteNav.classList.remove('is-open');
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.focus();
    }
  });
}

// --- Reading mode ---
const readingToggle = document.getElementById('reading-mode-toggle');
const root = document.documentElement;

if (readingToggle) {
  // Mentett preferencia visszaállítása
  if (localStorage.getItem('fb-reading-mode') === 'true') {
    root.classList.add('reading-mode');
    readingToggle.setAttribute('aria-pressed', 'true');
  }

  readingToggle.addEventListener('click', () => {
    const isOn = root.classList.toggle('reading-mode');
    readingToggle.setAttribute('aria-pressed', isOn);
    localStorage.setItem('fb-reading-mode', isOn);
  });
}

// --- Aktív nav-link jelölése ---
const currentPath = window.location.pathname;
document.querySelectorAll('.site-nav a').forEach(link => {
  const href = link.getAttribute('href');
  if (href === currentPath || (href !== '/' && currentPath.startsWith(href))) {
    link.setAttribute('aria-current', 'page');
  }
});

// --- Plausible-szerű analitika ---
window.fbAnalytics = {
  track(eventName, props = {}) {
    // Csak production-ban küldjük
    if (window.location.hostname === 'localhost') return;

    fetch('https://analytics.footbridge.hu/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: eventName,
        url: window.location.pathname,
        referrer: document.referrer || null,
        props
      }),
      keepalive: true
    }).catch(() => {
      // Analitika sosem blokkolja a UX-et
    });
  }
};

// Automatikus pageview
document.addEventListener('DOMContentLoaded', () => {
  window.fbAnalytics.track('pageview');
});
