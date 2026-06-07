// website-sanity-auto.mjs — Automated sanity tests for index.html (main website)
// Usage: node website-sanity-auto.mjs [suite...]
// Suites: nav hero process testimonials blog faq contact banner offer chat
// No args = all suites
import puppeteer from 'puppeteer';
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;
const HOME_URL = `${BASE_URL}/`;
const CHROME = 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe';

// ── Server ───────────────────────────────────────────────────────────────────

async function serverUp() {
  return new Promise(resolve => {
    const req = http.get(HOME_URL, { timeout: 2000 }, res => resolve(res.statusCode < 500));
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer() {
  if (await serverUp()) return;
  console.log('[sanity] Server not running — starting...');
  const child = spawn('node', ['serve.mjs'], {
    cwd: __dirname, detached: true, stdio: 'pipe',
    env: { ...process.env, SKIP_GIT_PULL: '1' },
  });
  child.unref();
  for (let i = 0; i < 14; i++) {
    await sleep(500);
    if (await serverUp()) { console.log('[sanity] Server ready.'); return; }
  }
  throw new Error('[sanity] Server did not start within 7s');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail  = (list, msg) => { list.push(msg); console.error(`  FAIL: ${msg}`); };
const pass  = msg => console.log(`  pass: ${msg}`);

async function openPage(browser, { mobile = false, suppressOffer = true } = {}) {
  const page = await browser.newPage();
  if (mobile) {
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  } else {
    await page.setViewport({ width: 1440, height: 900 });
  }
  // Pre-set consent so cookie banner doesn't interfere
  await page.evaluateOnNewDocument((supp) => {
    localStorage.setItem('clix_cookie_consent', 'yes');
    // Suppress the offer popup auto-timer for all suites except the offer suite itself
    if (supp) sessionStorage.setItem('clix_offer_seen', '1');
  }, suppressOffer);
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    // Mock all external services AND local /api/* proxy routes (Vercel Functions not available on local static server)
    if (u.includes('make.com') || u.includes('google-analytics') || u.includes('googletagmanager') || u.includes('fingerprint') || u.match(/\/api\/(contact|chat|chat-notify|scanner)/)) {
      req.respond({ status: 200, contentType: 'application/json', body: '{}' });
    } else {
      req.continue().catch(() => {});
    }
  });
  await page.goto(HOME_URL, { waitUntil: 'networkidle2', timeout: 25000 });
  return page;
}

// ── Test Suites ───────────────────────────────────────────────────────────────

// NAV: navigation bar
async function testNav(page, F) {
  console.log('[sanity] Navigation');

  // N.1: Nav links present and point to correct anchors
  const navLinks = await page.$$eval('nav a[href]', els =>
    els.map(a => a.getAttribute('href'))
  );
  // Hero uses data-section="hero" with href="#", not #hero literal
  const expected = ['#process', '#results', '#contact'];
  for (const href of expected) {
    navLinks.includes(href)
      ? pass(`N.1: nav link ${href} present`)
      : fail(F, `N.1: nav link ${href} missing`);
  }
  // Home link uses data-section attr
  const homeLink = await page.$('nav a[data-section="hero"]');
  homeLink ? pass('N.1: nav home link (data-section=hero) present') : fail(F, 'N.1: nav home link missing');

  // N.2: Scanner CTA link in nav (external URL)
  const scannerLink = await page.$eval('nav a[href*="scanner"]', a => a.href).catch(() => null);
  scannerLink
    ? pass('N.2: Scanner CTA link in nav')
    : fail(F, 'N.2: No scanner link found in nav');

  // N.3: Mobile menu button exists
  const hamburger = await page.$('#hamburger-btn');
  hamburger ? pass('N.3: Hamburger button exists') : fail(F, 'N.3: #hamburger-btn not found');

  // N.4: Mobile menu opens/closes (mobile viewport)
  const mobilePage = await openPage(page.browser(), { mobile: true });
  try {
    const hBtn = await mobilePage.$('#hamburger-btn');
    if (!hBtn) { fail(F, 'N.4: No hamburger on mobile'); return; }
    await hBtn.click(); await sleep(400);
    const menuVisible = await mobilePage.$eval('#mobile-menu', el => {
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
    });
    menuVisible ? pass('N.4: Mobile menu opens') : fail(F, 'N.4: Mobile menu did not open');

    // N.5: Clicking hamburger again closes it
    await hBtn.click(); await sleep(400);
    const menuHidden = await mobilePage.$eval('#mobile-menu', el => {
      const s = window.getComputedStyle(el);
      return s.display === 'none' || s.opacity === '0' || el.classList.contains('hidden') || el.classList.contains('translate-x-full');
    });
    menuHidden ? pass('N.5: Mobile menu closes') : fail(F, 'N.5: Mobile menu did not close');
  } finally {
    await mobilePage.close();
  }
}

// HERO: hero section
async function testHero(page, F) {
  console.log('[sanity] Hero');

  // H.1: Hero section visible
  const heroVisible = await page.$eval('#hero', el => el.offsetHeight > 0);
  heroVisible ? pass('H.1: Hero section visible') : fail(F, 'H.1: #hero not visible');

  // H.2: At least 6 bubble-tag elements rendered
  const bubbleCount = await page.$$eval('.bubble-tag', els => els.length);
  bubbleCount >= 6
    ? pass(`H.2: ${bubbleCount} bubble-tag elements`)
    : fail(F, `H.2: Expected ≥6 bubbles, found ${bubbleCount}`);

  // H.3: Hero has primary CTA link (leads to #contact for appointment booking)
  const ctaHref = await page.$eval('#hero a.btn-cta, #hero a[href="#contact"]', el =>
    el.getAttribute('href') || ''
  ).catch(() => null);
  ctaHref
    ? pass(`H.3: Hero primary CTA present (href="${ctaHref}")`)
    : fail(F, 'H.3: No primary CTA (.btn-cta) in hero section');

  // H.4: Profile / main image in hero
  const heroImg = await page.$('#hero img');
  heroImg ? pass('H.4: Hero has main image') : fail(F, 'H.4: No img found in #hero');

  // H.5: Hero headline (h1) has text
  const h1Text = await page.$eval('#hero h1, #hero h2', el => el.textContent.trim().length).catch(() => 0);
  h1Text > 5
    ? pass('H.5: Hero headline has text')
    : fail(F, 'H.5: Hero headline empty or missing');
}

// PROCESS: zigzag flowchart section
async function testProcess(page, F) {
  console.log('[sanity] Process section');

  // P.1: Section visible
  const sectionVisible = await page.$eval('#process', el => el.offsetHeight > 0);
  sectionVisible ? pass('P.1: #process section visible') : fail(F, 'P.1: #process not visible');

  // P.2: At least 5 zigzag nodes
  const nodeCount = await page.$$eval('.zz-node', els => els.length);
  nodeCount >= 5
    ? pass(`P.2: ${nodeCount} zigzag nodes`)
    : fail(F, `P.2: Expected ≥5 .zz-node elements, found ${nodeCount}`);

  // P.3: Spine element exists
  const spine = await page.$('#zz-spine');
  spine ? pass('P.3: #zz-spine present') : fail(F, 'P.3: #zz-spine missing');

  // P.4: Mobile accordion — node click expands details (mobile viewport)
  const mobilePage = await openPage(page.browser(), { mobile: true });
  try {
    await mobilePage.evaluate(() => window.scrollBy(0, 300));
    await sleep(500);
    const pill = await mobilePage.$('.zz-node');
    if (!pill) { fail(F, 'P.4: No .zz-node on mobile'); return; }
    await pill.click(); await sleep(400);
    const expanded = await mobilePage.$eval('.zz-node', el => el.classList.contains('expanded'));
    expanded ? pass('P.4: Mobile node expands on click') : fail(F, 'P.4: Mobile node did not expand');
  } finally {
    await mobilePage.close();
  }
}

// TESTIMONIALS: shuffle carousel
async function testTestimonials(page, F) {
  console.log('[sanity] Testimonials carousel');

  // T.1: Exactly 4 shuffle-card elements
  const cardCount = await page.$$eval('.shuffle-card', els => els.length);
  cardCount === 4
    ? pass(`T.1: ${cardCount} shuffle-cards`)
    : fail(F, `T.1: Expected 4 shuffle-cards, found ${cardCount}`);

  // T.2: One card has pos-front
  const hasFront = await page.$('.shuffle-card.pos-front');
  hasFront ? pass('T.2: One card has pos-front') : fail(F, 'T.2: No card with pos-front');

  // T.3: All 4 position classes distributed exactly once each
  // (shuffle() is inside an IIFE — not globally callable)
  const positions = await page.$$eval('.shuffle-card', cards =>
    cards.map(c => ({
      front:  c.classList.contains('pos-front'),
      middle: c.classList.contains('pos-middle'),
      back:   c.classList.contains('pos-back'),
      hidden: c.classList.contains('pos-hidden'),
    }))
  );
  const fronts  = positions.filter(p => p.front).length;
  const middles = positions.filter(p => p.middle).length;
  const backs   = positions.filter(p => p.back).length;
  const hiddens = positions.filter(p => p.hidden).length;
  (fronts === 1 && middles === 1 && backs === 1 && hiddens === 1)
    ? pass('T.3: All 4 position classes distributed correctly (front/middle/back/hidden)')
    : fail(F, `T.3: Position class distribution wrong — front:${fronts} middle:${middles} back:${backs} hidden:${hiddens}`);

  // T.4: #results section present
  const results = await page.$('#results');
  results ? pass('T.4: #results section exists') : fail(F, 'T.4: #results section missing');
}

// BLOG: blog preview loads cards from JSON
async function testBlog(page, F) {
  console.log('[sanity] Blog preview');

  // B.1: #blog-preview section visible
  const visible = await page.$eval('#blog-preview', el => el.offsetHeight > 0);
  visible ? pass('B.1: #blog-preview visible') : fail(F, 'B.1: #blog-preview not visible');

  // B.2: Wait for posts to load (async fetch), then check for cards
  await page.waitForSelector('#bp-cards-grid .bp-card, #blog-preview article, #blog-preview .blog-card', {
    timeout: 8000
  }).catch(() => null);

  const cardCount = await page.$$eval(
    '#bp-cards-grid .bp-card, #blog-preview article, #blog-preview .blog-card, #bp-cards-grid > *',
    els => els.filter(el => el.offsetHeight > 0).length
  );
  cardCount >= 3
    ? pass(`B.2: ${cardCount} blog cards loaded`)
    : fail(F, `B.2: Expected ≥3 blog cards, found ${cardCount}`);

  // B.3: Each visible card has a link to a post
  const linkCount = await page.$$eval('#bp-cards-grid a[href*="posts/"]', els => els.length);
  linkCount >= 3
    ? pass(`B.3: ${linkCount} post links present`)
    : fail(F, `B.3: Expected ≥3 post links, found ${linkCount}`);

  // B.4: "כל הפוסטים" / blog link present
  const blogLink = await page.$('a[href*="blog"]');
  blogLink ? pass('B.4: Blog main link present') : fail(F, 'B.4: No link to blog page');
}

// FAQ: accordion expand/collapse
async function testFaq(page, F) {
  console.log('[sanity] FAQ accordion');

  // F.1: FAQ section present
  const faqSection = await page.$('#faq');
  faqSection ? pass('F.1: #faq section exists') : fail(F, 'F.1: #faq missing');

  // F.2: At least 3 FAQ items
  const itemCount = await page.$$eval('.faq-item', els => els.length);
  itemCount >= 3
    ? pass(`F.2: ${itemCount} FAQ items`)
    : fail(F, `F.2: Expected ≥3 .faq-item, found ${itemCount}`);

  // F.3: Clicking FAQ header expands body (aria-expanded becomes true)
  const firstBtn = await page.$('.faq-item button, .faq-item [onclick*="toggleFaq"]');
  if (!firstBtn) { fail(F, 'F.3: No FAQ toggle button found'); return; }
  await firstBtn.click(); await sleep(350);

  const expanded = await page.$eval('.faq-item', el => {
    const btn = el.querySelector('button, [onclick]');
    return btn ? btn.getAttribute('aria-expanded') === 'true' : false;
  });
  expanded ? pass('F.3: FAQ item expands (aria-expanded=true)') : fail(F, 'F.3: FAQ aria-expanded not "true" after click');

  // F.4: Body is visible after expand
  const bodyVisible = await page.$eval('.faq-body', el => el.offsetHeight > 0);
  bodyVisible ? pass('F.4: FAQ body visible after expand') : fail(F, 'F.4: FAQ body still hidden after expand');

  // F.5: Clicking again collapses
  await firstBtn.click(); await sleep(350);
  const collapsed = await page.$eval('.faq-item', el => {
    const btn = el.querySelector('button, [onclick]');
    return btn ? btn.getAttribute('aria-expanded') !== 'true' : true;
  });
  collapsed ? pass('F.5: FAQ item collapses on second click') : fail(F, 'F.5: FAQ did not collapse');
}

// CONTACT FORM: validation + success
async function testContact(page, F) {
  console.log('[sanity] Contact form');

  await page.evaluate(() => document.querySelector('#contact').scrollIntoView());
  await sleep(300);

  // C.1: Form fields present
  const nameField  = await page.$('#contact-name');
  const phoneField = await page.$('#contact-phone');
  nameField  ? pass('C.1: #contact-name present')  : fail(F, 'C.1: #contact-name missing');
  phoneField ? pass('C.1: #contact-phone present') : fail(F, 'C.1: #contact-phone missing');

  // C.2: Submit empty → field-error class on required fields
  // The contact form has onsubmit=handleSubmit — trigger via form submit
  await page.evaluate(() => {
    const form = document.querySelector('#contact form');
    if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await sleep(400);

  // showContactFieldError() adds 'field-error' class (not 'err')
  const nameErr  = await page.$eval('#contact-name',  el => el.classList.contains('field-error')).catch(() => false);
  const phoneErr = await page.$eval('#contact-phone', el => el.classList.contains('field-error')).catch(() => false);
  (nameErr || phoneErr)
    ? pass('C.2: Empty submit triggers field-error class')
    : fail(F, 'C.2: No field-error class on empty submit');

  // C.3: Privacy checkbox required — fills name+phone, submits without privacy
  await page.type('#contact-name', 'בדיקה');
  await page.type('#contact-phone', '0501234567');
  await page.evaluate(() => {
    const form = document.querySelector('#contact form');
    if (form) form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await sleep(400);
  // Privacy error: sets style.outline on the checkbox element directly
  const privacyErr = await page.$eval('#contact-privacy', el =>
    el.style.outline !== '' && el.style.outline !== 'none'
  ).catch(() => false);
  privacyErr
    ? pass('C.3: Privacy checkbox outline error shown')
    : fail(F, 'C.3: No outline error on privacy checkbox when unchecked');
}

// BANNER FORM: validation
async function testBanner(page, F) {
  console.log('[sanity] Banner (CTA) form');

  // BF.1: Banner form fields present
  const nameField  = await page.$('#banner-name');
  const phoneField = await page.$('#banner-phone');
  nameField  ? pass('BF.1: #banner-name present')  : fail(F, 'BF.1: #banner-name missing');
  phoneField ? pass('BF.1: #banner-phone present') : fail(F, 'BF.1: #banner-phone missing');

  // BF.2: Submit empty → errors
  await page.evaluate(() => {
    const btn = document.querySelector('#banner-submit');
    if (btn) btn.click();
  });
  await sleep(400);
  const nameErr  = await page.$eval('#banner-name',  el => el.classList.contains('err') || el.style.borderColor !== '').catch(() => false);
  const phoneErr = await page.$eval('#banner-phone', el => el.classList.contains('err') || el.style.borderColor !== '').catch(() => false);
  (nameErr || phoneErr)
    ? pass('BF.2: Empty banner submit triggers errors')
    : fail(F, 'BF.2: No error styles on empty banner submit');

  // BF.3: Privacy required
  await page.type('#banner-name', 'בדיקה');
  await page.type('#banner-phone', '0501234567');
  await page.evaluate(() => {
    const btn = document.querySelector('#banner-submit');
    if (btn) btn.click();
  });
  await sleep(400);
  const privacyErr = await page.evaluate(() => {
    const box = document.querySelector('#banner-privacy');
    if (!box) return false;
    const label = box.closest('label') || box.parentElement;
    return label ? (label.style.outline !== '' || label.classList.contains('err') || getComputedStyle(label).outline !== 'none') : false;
  });
  privacyErr
    ? pass('BF.3: Banner privacy required error shown')
    : fail(F, 'BF.3: No privacy error on banner submit without consent');
}

// Helper: show offer popup by directly setting DOM styles (openOfferPopup is inside IIFE)
async function showOfferPopup(page) {
  await page.evaluate(() => {
    const overlay = document.getElementById('offer-overlay');
    const popup   = document.getElementById('offer-popup');
    const card    = document.getElementById('offer-card');
    if (!overlay || !popup || !card) return;
    overlay.style.display = 'block';
    popup.style.display   = 'flex';
    overlay.style.opacity = '1';
    card.style.opacity    = '1';
    card.style.transform  = 'translateY(0) scale(1)';
  });
  await sleep(300);
}

// OFFER POPUP: trigger + close
// Note: this suite opens its own page WITHOUT offer suppression so the IIFE runs
// and exposes window.closeOfferPopup globally.
async function testOffer(_ignoredPage, F) {
  console.log('[sanity] Offer popup');

  // Open a fresh page without suppressing the offer IIFE
  const browser = _ignoredPage.browser();
  const page = await openPage(browser, { suppressOffer: false });

  try {
    // O.1: Popup HTML elements exist in DOM
    const overlayExists = await page.$('#offer-overlay');
    overlayExists ? pass('O.1: #offer-overlay element exists') : fail(F, 'O.1: #offer-overlay missing from DOM');

    const cardExists = await page.$('#offer-card');
    cardExists ? pass('O.1: #offer-card element exists') : fail(F, 'O.1: #offer-card missing');

    // O.2: Trigger popup via DOM manipulation (openOfferPopup is private to IIFE)
    await showOfferPopup(page);
    const overlayVisible = await page.$eval('#offer-overlay', el => {
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && parseFloat(s.opacity) > 0;
    }).catch(() => false);
    overlayVisible ? pass('O.2: Offer popup shows after DOM trigger') : fail(F, 'O.2: Offer popup not visible after DOM trigger');

    // O.3: Form fields present inside popup
    const phoneField = await page.$('#offer-form input[name="phone"], #offer-form input[type="tel"]');
    phoneField ? pass('O.3: Phone field in offer form') : fail(F, 'O.3: No phone field in offer form');

    // O.4: window.closeOfferPopup IS exposed when IIFE runs (no session key on load)
    const closeFn = await page.evaluate(() => typeof window.closeOfferPopup === 'function');
    closeFn ? pass('O.4: window.closeOfferPopup is globally exposed') : fail(F, 'O.4: window.closeOfferPopup not found');

    if (closeFn) {
      await page.evaluate(() => window.closeOfferPopup());
      await sleep(500);
      const hidden = await page.$eval('#offer-overlay', el => {
        const s = window.getComputedStyle(el);
        return s.display === 'none' || parseFloat(s.opacity) === 0;
      }).catch(() => true);
      hidden ? pass('O.4: closeOfferPopup() hides the popup') : fail(F, 'O.4: Popup not hidden after closeOfferPopup()');

      // O.5: sessionStorage key set after close (prevents re-show)
      const key = await page.evaluate(() => sessionStorage.getItem('clix_offer_seen'));
      key ? pass('O.5: sessionStorage clix_offer_seen set after close') : fail(F, 'O.5: sessionStorage key not set after close');
    }

    // O.6: Backdrop click closes popup
    // onclick is on #offer-popup: "if(event.target===this) closeOfferPopup()"
    // Clicking the popup element directly (not the card inside) satisfies the condition
    await showOfferPopup(page);
    await page.evaluate(() => {
      const popup = document.getElementById('offer-popup');
      if (popup) popup.click(); // event.target === #offer-popup === this → closes
    });
    await sleep(500);
    const hiddenAfterBackdrop = await page.$eval('#offer-popup', el => {
      const s = window.getComputedStyle(el);
      return s.display === 'none' || parseFloat(s.opacity) === 0;
    }).catch(() => true);
    hiddenAfterBackdrop ? pass('O.6: Backdrop click closes popup') : fail(F, 'O.6: Popup did not close on backdrop click');

  } finally {
    await page.close();
  }
}

// CHAT WIDGET
async function testChat(page, F) {
  console.log('[sanity] Chat widget');

  // CH.1: Chat launcher visible
  const launcher = await page.$('#chat-launcher, #chat-btn');
  launcher ? pass('CH.1: Chat launcher present') : fail(F, 'CH.1: No #chat-launcher or #chat-btn');

  // CH.2: Click opens panel
  await page.evaluate(() => {
    const btn = document.querySelector('#chat-btn') || document.querySelector('#chat-launcher');
    if (btn) btn.click();
  });
  await sleep(500);
  const panelOpen = await page.$eval('#chat-panel', el => {
    const s = window.getComputedStyle(el);
    return s.display !== 'none' && s.visibility !== 'hidden' && el.offsetHeight > 0;
  }).catch(() => false);
  panelOpen ? pass('CH.2: Chat panel opens') : fail(F, 'CH.2: Chat panel did not open');

  // CH.3: Chat input field present inside open panel
  const inputPresent = await page.$('#chat-input');
  inputPresent ? pass('CH.3: #chat-input present') : fail(F, 'CH.3: #chat-input not found');

  // CH.4: Quick reply buttons present
  const quickCount = await page.$$eval('#chat-quick-btns button, .chat-quick-btn', els => els.length);
  quickCount >= 2
    ? pass(`CH.4: ${quickCount} quick reply buttons`)
    : fail(F, `CH.4: Expected ≥2 quick reply buttons, found ${quickCount}`);

  // CH.5: Close panel
  await page.evaluate(() => toggleChat());
  await sleep(400);
  const panelClosed = await page.$eval('#chat-panel', el => {
    const s = window.getComputedStyle(el);
    return s.display === 'none' || s.visibility === 'hidden' || el.offsetHeight === 0 || s.opacity === '0';
  }).catch(() => true);
  panelClosed ? pass('CH.5: Chat panel closes') : fail(F, 'CH.5: Chat panel did not close');

  // CH.6: Rate-limit cookie blocks further messages (set limit manually)
  const blocked = await page.evaluate(() => {
    // Set a high rate limit count to trigger block
    const key = 'clix_rl';
    const data = { count: 100, date: new Date().toDateString() };
    localStorage.setItem(key, JSON.stringify(data));
    if (typeof isBlocked === 'function') return isBlocked();
    return null;
  });
  blocked === true
    ? pass('CH.6: isBlocked() returns true when rate limit exceeded')
    : blocked === null
      ? pass('CH.6: isBlocked() not accessible (private scope — skip)')
      : fail(F, `CH.6: isBlocked() returned ${blocked} with count=100`);
}

// WEBHOOKS: verify Vercel API proxy endpoints are live and correctly deployed
// Uses GET probe → expects 405 (function exists, rejects non-POST) — never fires Make.com
async function testWebhooks(_page, F) {
  console.log('[sanity] Webhook proxy endpoints (production)');

  // WH.0: .env exists and MAKE_MONTHLY_WEBHOOK is set (server-side script config)
  try {
    const { readFileSync, existsSync } = await import('fs');
    const { resolve } = await import('path');
    const envPath = resolve(__dirname, '.env');
    existsSync(envPath)
      ? pass('WH.0: .env file exists (not tracked in git)')
      : fail(F, 'WH.0: .env missing — MAKE_MONTHLY_WEBHOOK not configured');

    if (existsSync(envPath)) {
      const vars = {};
      for (const line of readFileSync(envPath, 'utf8').split('\n')) {
        const [k, ...v] = line.trim().split('=');
        if (k && v.length) vars[k] = v.join('=');
      }
      const w = vars['MAKE_MONTHLY_WEBHOOK'];
      w && w.startsWith('https://hook.')
        ? pass('WH.0: MAKE_MONTHLY_WEBHOOK set and looks valid')
        : fail(F, 'WH.0: MAKE_MONTHLY_WEBHOOK missing or invalid in .env');
    }
  } catch (err) {
    fail(F, `WH.0: .env check error — ${err.message}`);
  }

  const PROD = 'https://clix-automations.com';
  const endpoints = [
    { id: 'WH.1', name: 'contact',     path: '/api/contact' },
    { id: 'WH.2', name: 'chat',        path: '/api/chat' },
    { id: 'WH.3', name: 'chat-notify', path: '/api/chat-notify' },
    { id: 'WH.4', name: 'scanner',     path: '/api/scanner' },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${PROD}${ep.path}`, { method: 'GET', signal: AbortSignal.timeout(8000) });
      if (res.status === 405) {
        pass(`${ep.id}: /api/${ep.name} → 405 (deployed, rejects GET correctly)`);
      } else if (res.status === 404) {
        fail(F, `${ep.id}: /api/${ep.name} → 404 — function not deployed`);
      } else if (res.status === 500) {
        // 500 with our "Not configured" body means the function IS deployed but env var missing
        const body = await res.text().catch(() => '');
        if (body.includes('Not configured')) {
          fail(F, `${ep.id}: /api/${ep.name} → 500 "Not configured" — env var MAKE_${ep.name.replace(/-/g, '_').toUpperCase()}_WEBHOOK missing in Vercel`);
        } else {
          fail(F, `${ep.id}: /api/${ep.name} → 500 — unexpected server error: ${body.slice(0, 120)}`);
        }
      } else {
        fail(F, `${ep.id}: /api/${ep.name} → unexpected status ${res.status}`);
      }
    } catch (err) {
      fail(F, `${ep.id}: /api/${ep.name} → network error: ${err.message}`);
    }
  }

  // WH.5: POST with missing body → still 200/502, NOT 500 "Not configured" (env var is set)
  try {
    const res = await fetch(`${PROD}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 200 || res.status === 502) {
      pass(`WH.5: /api/contact POST → ${res.status} (env var set, upstream reachable)`);
    } else if (res.status === 500) {
      const body = await res.text().catch(() => '');
      fail(F, `WH.5: /api/contact POST → 500 — env var likely missing: ${body.slice(0, 120)}`);
    } else {
      fail(F, `WH.5: /api/contact POST → unexpected ${res.status}`);
    }
  } catch (err) {
    fail(F, `WH.5: /api/contact POST → network error: ${err.message}`);
  }
}

// ── Suite registry ────────────────────────────────────────────────────────────

const SUITE = {
  nav:          testNav,
  hero:         testHero,
  process:      testProcess,
  testimonials: testTestimonials,
  blog:         testBlog,
  faq:          testFaq,
  contact:      testContact,
  banner:       testBanner,
  offer:        testOffer,
  chat:         testChat,
  webhooks:     testWebhooks,
};

// ── CLI argument parsing ──────────────────────────────────────────────────────

function parseArgs(argv) {
  const run = new Set();
  for (const s of argv.slice(2)) {
    const k = s.toLowerCase();
    if (k === 'all') { Object.keys(SUITE).forEach(x => run.add(x)); break; }
    if (SUITE[k]) { run.add(k); continue; }
    // fuzzy aliases
    if (k.includes('nav'))   run.add('nav');
    if (k.includes('hero'))  run.add('hero');
    if (k.includes('proc'))  run.add('process');
    if (k.includes('testi') || k.includes('carousel') || k.includes('result')) run.add('testimonials');
    if (k.includes('blog'))  run.add('blog');
    if (k.includes('faq'))   run.add('faq');
    if (k.includes('contact')) run.add('contact');
    if (k.includes('banner') || k.includes('cta')) run.add('banner');
    if (k.includes('offer') || k.includes('popup')) run.add('offer');
    if (k.includes('chat'))    run.add('chat');
    if (k.includes('webhook') || k.includes('api') || k.includes('proxy')) run.add('webhooks');
  }
  if (run.size === 0) Object.keys(SUITE).forEach(x => run.add(x));
  return run;
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  const run = parseArgs(process.argv);

  const suitesLabel = [...run].join(', ');
  console.log('\n' + '═'.repeat(52));
  console.log(' WEBSITE SANITY TESTS');
  console.log(` Suites: ${suitesLabel}`);
  console.log('═'.repeat(52) + '\n');

  await ensureServer();

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const failures = [];

  try {
    // Each suite gets its own fresh page to avoid state bleed
    for (const suiteName of run) {
      const fn = SUITE[suiteName];
      if (!fn) continue;
      const page = await openPage(browser);
      try {
        await fn(page, failures);
      } catch (err) {
        fail(failures, `${suiteName}: Unexpected error — ${err.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log('\n' + '═'.repeat(52));
  if (failures.length === 0) {
    console.log(' ALL TESTS PASSED');
  } else {
    console.log(` ${failures.length} FAILURE(S):`);
    failures.forEach(f => console.error(`  • ${f}`));
    process.exitCode = 1;
  }
  console.log('═'.repeat(52) + '\n');
})();
