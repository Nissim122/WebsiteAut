(function () {
  'use strict';

  var GA_ID = 'G-SJT8YRED9B';
  var CONSENT_KEY = 'clix_cookie_consent';
  var ACCEPTED = 'yes';

  // ─── GA + Tracking ────────────────────────────────────────────────────────────
  function loadGA() {
    if (window.__clixGA) return;
    window.__clixGA = true;

    var s = document.createElement('script');
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    s.async = true;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { send_page_view: true });

    initScrollTracking();
    initSectionTracking();
    initConversionTracking();
  }

  // Fires a scroll_depth event at 25 / 50 / 75 / 90 %
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
          window.gtag('event', 'scroll_depth', {
            percent_scrolled: m,
            page_location: window.location.href
          });
        }
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  // Fires a section_view event when a section[id] enters the viewport
  function initSectionTracking() {
    if (!window.IntersectionObserver) return;
    var seen = {};

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var id = e.target.id;
        if (id && !seen[id]) {
          seen[id] = true;
          window.gtag('event', 'section_view', {
            section_id: id,
            page_location: window.location.href
          });
        }
      });
    }, { threshold: 0.3 });

    document.querySelectorAll('section[id]').forEach(function (el) {
      obs.observe(el);
    });
  }

  // ─── Conversion Tracking ─────────────────────────────────────────────────────
  function initConversionTracking() {
    // CTA button clicks (nav, hero, blog preview, results)
    document.querySelectorAll('a.btn-cta, button.btn-cta').forEach(function (el) {
      el.addEventListener('click', function () {
        var label = el.textContent.trim().slice(0, 50);
        var href  = el.getAttribute('href') || '';
        window.gtag('event', 'cta_click', { label: label, destination: href });
      });
    });

    // Scanner link clicks
    document.querySelectorAll('a[href*="scanner.clix-automations.com"]').forEach(function (el) {
      el.addEventListener('click', function () {
        var section = el.closest('[id]');
        window.gtag('event', 'scanner_click', { location: section ? section.id : 'unknown' });
      });
    });

    // WhatsApp clicks
    document.querySelectorAll('a[href*="wa.me"]').forEach(function (el) {
      el.addEventListener('click', function () {
        var section = el.closest('[id]');
        window.gtag('event', 'whatsapp_click', { location: section ? section.id : 'unknown' });
      });
    });

    // Phone clicks
    document.querySelectorAll('a[href^="tel:"]').forEach(function (el) {
      el.addEventListener('click', function () {
        var section = el.closest('[id]');
        window.gtag('event', 'phone_click', { location: section ? section.id : 'unknown' });
      });
    });

    // Chat widget — first open only
    var origToggleChat = window.toggleChat;
    var chatTracked = false;
    if (typeof origToggleChat === 'function') {
      window.toggleChat = function () {
        origToggleChat.apply(this, arguments);
        if (!chatTracked) {
          chatTracked = true;
          window.gtag('event', 'chat_open');
        }
      };
    }

    // Popup open — watch style changes via MutationObserver
    var popup = document.getElementById('offer-popup');
    if (popup) {
      var popupTracked = false;
      new MutationObserver(function () {
        if (!popupTracked && popup.style.display !== 'none' && popup.style.opacity !== '0') {
          popupTracked = true;
          window.gtag('event', 'popup_open');
        }
      }).observe(popup, { attributes: true, attributeFilter: ['style'] });
    }
  }

  // ─── Consent Banner ───────────────────────────────────────────────────────────
  function accept() {
    localStorage.setItem(CONSENT_KEY, ACCEPTED);
    hideBanner();
    loadGA();
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'no');
    hideBanner();
  }

  function hideBanner() {
    var wrap = document.getElementById('clix-cookie-wrap');
    if (!wrap) return;
    var card = wrap.firstElementChild;
    if (card) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(12px)';
    }
    setTimeout(function () { if (wrap.parentNode) wrap.remove(); }, 380);
  }

  function showBanner() {
    if (document.getElementById('clix-cookie-wrap')) return;

    var wrap = document.createElement('div');
    wrap.id = 'clix-cookie-wrap';
    wrap.style.cssText = [
      'position:fixed',
      'bottom:0',
      'left:0',
      'right:0',
      'z-index:2147483647',
      'display:flex',
      'justify-content:center',
      'padding:1.25rem',
      'pointer-events:none'
    ].join(';');

    var card = document.createElement('div');
    card.setAttribute('dir', 'rtl');
    card.style.cssText = [
      'pointer-events:all',
      'width:100%',
      'max-width:540px',
      'background:linear-gradient(135deg,rgba(14,22,48,0.98) 0%,rgba(18,28,60,0.98) 100%)',
      'backdrop-filter:blur(24px)',
      '-webkit-backdrop-filter:blur(24px)',
      'border:1.5px solid rgba(224,23,107,0.28)',
      'border-radius:16px',
      'padding:1.25rem 1.5rem',
      'box-shadow:0 -4px 40px rgba(0,0,0,0.55),0 8px 32px rgba(224,23,107,0.07),inset 0 1px 0 rgba(255,255,255,0.05)',
      'display:flex',
      'flex-direction:column',
      'gap:0.9rem',
      'font-family:Heebo,sans-serif',
      'color:#fff',
      'opacity:0',
      'transform:translateY(12px)',
      'transition:opacity 0.35s ease,transform 0.4s cubic-bezier(0.34,1.56,0.64,1)'
    ].join(';');

    card.innerHTML = [
      '<div style="display:flex;align-items:flex-start;gap:0.85rem;">',
        '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;margin-top:2px;" aria-hidden="true">',
          '<circle cx="12" cy="12" r="10" fill="rgba(224,23,107,0.15)" stroke="#e0176b" stroke-width="1.5"/>',
          '<circle cx="8.5" cy="9.5" r="1.3" fill="#e0176b"/>',
          '<circle cx="14.5" cy="8" r="1" fill="#2196b0"/>',
          '<circle cx="15.5" cy="13.5" r="1.3" fill="#e0176b"/>',
          '<circle cx="9" cy="15" r="1" fill="#2196b0"/>',
          '<circle cx="12.5" cy="11.5" r="0.75" fill="rgba(255,255,255,0.45)"/>',
        '</svg>',
        '<div>',
          '<p style="font-size:0.95rem;font-weight:700;margin-bottom:0.25rem;line-height:1.3;">אנו משתמשים בעוגיות אנליטיקה</p>',
          '<p style="font-size:0.82rem;line-height:1.65;color:rgba(255,255,255,0.6);">',
            'אנו משתמשים ב-Google Analytics כדי להבין אילו עמודים שימושיים ולשפר את האתר. הנתונים אנונימיים ומעובדים על ידי Google Analytics.',
            ' <a href="/privacy.html" style="color:#2196b0;text-decoration:underline;font-weight:600;">מדיניות פרטיות</a>',
          '</p>',
        '</div>',
      '</div>',
      '<div style="display:flex;gap:0.65rem;flex-wrap:wrap;">',
        '<button id="clix-cookie-accept" style="',
          'flex:1;min-width:120px;',
          'padding:0.65rem 1rem;',
          'background:#e0176b;',
          'color:#fff;',
          'border:none;',
          'border-radius:10px;',
          'font-family:Heebo,sans-serif;',
          'font-size:0.9rem;',
          'font-weight:700;',
          'cursor:pointer;',
          'line-height:1;',
        '">אני מסכים/ה</button>',
        '<button id="clix-cookie-decline" style="',
          'padding:0.65rem 1.1rem;',
          'background:transparent;',
          'color:rgba(255,255,255,0.4);',
          'border:1.5px solid rgba(255,255,255,0.15);',
          'border-radius:10px;',
          'font-family:Heebo,sans-serif;',
          'font-size:0.85rem;',
          'font-weight:500;',
          'cursor:pointer;',
          'line-height:1;',
        '">דחייה</button>',
      '</div>'
    ].join('');

    wrap.appendChild(card);
    document.body.appendChild(wrap);

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });
    });

    document.getElementById('clix-cookie-accept').addEventListener('click', accept);
    document.getElementById('clix-cookie-decline').addEventListener('click', decline);
  }

  // ─── Boot ────────────────────────────────────────────────────────────────────
  var consent = localStorage.getItem(CONSENT_KEY);

  if (consent === ACCEPTED) {
    // Previously accepted — load GA on window load (same timing as before)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () {
        window.addEventListener('load', loadGA);
      });
    } else {
      window.addEventListener('load', loadGA);
    }
  } else if (consent !== 'no') {
    // First visit or unknown state — show banner after DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', showBanner);
    } else {
      showBanner();
    }
  }
  // consent === 'no' → do nothing (user declined)

})();
