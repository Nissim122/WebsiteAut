(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function track(name, params) {
    if (window.gtag) window.gtag('event', name, params || {});
  }

  // ── Scroll depth ─────────────────────────────────────────────────────────────
  function initScrollTracking() {
    var marks = [25, 50, 75, 90];
    var hit = {};

    function onScroll() {
      var max = document.body.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      var pct = Math.min(100, Math.round(window.scrollY / max * 100));
      marks.forEach(function (m) {
        if (pct >= m && !hit[m]) {
          hit[m] = true;
          track('scroll_depth', { percent_scrolled: m, page_location: window.location.href });
          if (m === 90) {
            track('article_read', { page_location: window.location.href, title: document.title });
          }
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // ── CTA & scanner clicks ──────────────────────────────────────────────────────
  function initClickTracking() {
    document.querySelectorAll('a.btn-cta, button.btn-cta').forEach(function (el) {
      el.addEventListener('click', function () {
        track('blog_cta_click', {
          label: el.textContent.trim().slice(0, 50),
          destination: el.getAttribute('href') || '',
          page_location: window.location.href
        });
      });
    });

    document.querySelectorAll('a[href*="scanner.clix-automations.com"]').forEach(function (el) {
      el.addEventListener('click', function () {
        track('blog_scanner_click', { page_location: window.location.href });
      });
    });

    document.querySelectorAll('a[href*="wa.me"]').forEach(function (el) {
      el.addEventListener('click', function () {
        track('whatsapp_click', { location: 'blog' });
      });
    });
  }

  // ── Time-on-page ─────────────────────────────────────────────────────────────
  // Fires blog_time_spent when user leaves (once, only if they spent ≥10 s)
  var startTime = Date.now();
  window.addEventListener('beforeunload', function () {
    var seconds = Math.round((Date.now() - startTime) / 1000);
    if (seconds >= 10 && window.gtag) {
      window.gtag('event', 'blog_time_spent', {
        seconds: seconds,
        page_location: window.location.href,
        transport_type: 'beacon'
      });
    }
  });

  ready(function () {
    initScrollTracking();
    initClickTracking();
  });
})();
