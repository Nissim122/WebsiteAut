// scanner-sanity-auto.mjs — Automated sanity tests for scanner.html
// Usage: node scanner-sanity-auto.mjs [section...]
// Sections: screen1 screen2 screen3 screen4 modal screen6 toolhint
// No args = happy path only
import puppeteer from 'puppeteer';
import http from 'http';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 3000;
const SCANNER_URL = `http://localhost:${PORT}/scanner.html`;
const CHROME = 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe';

// ── Server ──────────────────────────────────────────────────────────────────

async function serverUp() {
  return new Promise(resolve => {
    const req = http.get(SCANNER_URL, { timeout: 2000 }, res => resolve(res.statusCode < 500));
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

// ── Helpers ──────────────────────────────────────────────────────────────────

const sleep = ms => new Promise(r => setTimeout(r, ms));
const fail = (list, msg) => { list.push(msg); console.error(`  FAIL: ${msg}`); };
const pass = msg => console.log(`  pass: ${msg}`);

async function openPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('clix_cookie_consent', 'yes');
  });
  await page.setRequestInterception(true);
  page.on('request', req => {
    if (req.url().includes('make.com') || req.url().includes('google-analytics') || req.url().includes('googletagmanager')) {
      req.respond({ status: 200, contentType: 'text/plain', body: 'ok' });
    } else {
      req.continue().catch(() => {});
    }
  });
  await page.goto(SCANNER_URL, { waitUntil: 'networkidle2', timeout: 20000 });
  return page;
}

async function goToScreen2(page) {
  await page.waitForSelector('#screen-1.active', { timeout: 3000 });
  await page.click('.pain-card[data-pain="leads"]');
  await page.waitForSelector('#screen-2.active', { timeout: 2000 });
}

async function goToScreen3(page) {
  await goToScreen2(page);
  const tools = await page.$$('.tool-card');
  await tools[0].click(); await sleep(80);
  await page.click('#tools-btn');
  await page.waitForSelector('#screen-3.active', { timeout: 2000 });
}

async function goToScreen4(page) {
  await goToScreen3(page);
  await page.waitForSelector('#screen-4.active', { timeout: 4500 });
}

async function openModal(page) {
  // screen-4 is scrollable — scroll button into view before clicking
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('#screen-4 button[onclick*="openLeadModal"]') ||
                document.querySelector('button[onclick*="openLeadModal"]');
    if (!btn) return false;
    btn.scrollIntoView({ block: 'center' });
    btn.click();
    return true;
  });
  if (!clicked) throw new Error('CTA button not found');
  await sleep(400);
}

// ── Test suites ──────────────────────────────────────────────────────────────

async function testScreen1(page, F) {
  console.log('[sanity] Screen 1 (Pain selection)');

  // 1.4: 9 pain cards
  const count = await page.$$eval('.pain-card', c => c.length);
  count === 9 ? pass(`1.4: ${count} pain cards`) : fail(F, `1.4: Expected 9 pain cards, found ${count}`);

  // 1.1: Click → aria-pressed="true"
  await page.click('.pain-card:first-child');
  await sleep(60);
  const pressed = await page.$eval('.pain-card:first-child', el => el.getAttribute('aria-pressed'));
  pressed === 'true' ? pass('1.1: aria-pressed="true"') : fail(F, `1.1: Expected aria-pressed="true", got "${pressed}"`);

  // 1.3: Auto-transition to screen 2 within 1s
  try {
    await page.waitForSelector('#screen-2.active', { timeout: 1000 });
    pass('1.3: Auto-transitioned to screen-2');
  } catch {
    fail(F, '1.3: Did not auto-transition to screen-2 within 1s');
    return;
  }

  // 1.2: Go back, click second card — only one selected
  await page.click('button[onclick="goTo(1)"]');
  await page.waitForSelector('#screen-1.active', { timeout: 2000 });
  await page.click('.pain-card:nth-child(2)');
  await sleep(60);
  const firstStill = await page.$eval('.pain-card:first-child', el => el.getAttribute('aria-pressed'));
  firstStill !== 'true' ? pass('1.2: Single-select works') : fail(F, '1.2: First card still selected after picking second');
}

async function testScreen2(page, F) {
  console.log('[sanity] Screen 2 (Tools selection)');
  await goToScreen2(page);

  // 2.1: Continue disabled on entry
  const dis = await page.$eval('#tools-btn', b => b.disabled);
  dis ? pass('2.1: Continue disabled') : fail(F, '2.1: Continue should be disabled on entry');

  const tools = await page.$$('.tool-card');
  if (!tools.length) { fail(F, 'screen2: No tool cards found'); return; }

  // 2.2: Select 1 → enabled + count
  await tools[0].click(); await sleep(150);
  const t1 = await page.$eval('#tools-btn', b => ({ disabled: b.disabled, text: b.textContent.trim() }));
  !t1.disabled ? pass('2.2: Continue enabled') : fail(F, '2.2: Continue should enable after 1 tool');
  t1.text.includes('1') ? pass(`2.2: shows count (${t1.text})`) : fail(F, `2.2: Button text "${t1.text}" should include 1`);

  // 2.3: Select 2nd
  await tools[1].click(); await sleep(150);
  const t2 = await page.$eval('#tools-btn', b => b.textContent.trim());
  t2.includes('2') ? pass(`2.3: shows 2 (${t2})`) : fail(F, `2.3: Should show 2, got "${t2}"`);

  // 2.4: Deselect 1st
  await tools[0].click(); await sleep(150);
  const t3 = await page.$eval('#tools-btn', b => b.textContent.trim());
  t3.includes('1') ? pass('2.4: Deselect updates count') : fail(F, `2.4: After deselect should show 1, got "${t3}"`);

  // 2.5: Deselect all → disabled
  await tools[1].click(); await sleep(150);
  const disAgain = await page.$eval('#tools-btn', b => b.disabled);
  disAgain ? pass('2.5: Disabled when 0 selected') : fail(F, '2.5: Should disable when all deselected');

  // 2.6: Select one, click continue → screen 3
  await tools[0].click(); await sleep(100);
  await page.click('#tools-btn');
  try {
    await page.waitForSelector('#screen-3.active', { timeout: 2000 });
    pass('2.6: Navigated to screen-3');
  } catch {
    fail(F, '2.6: Did not navigate to screen-3 after continue');
  }
}

async function testToolHint(page, F) {
  console.log('[sanity] Tool Hint (updateUnlockHint)');

  // helper: click tool by data-tid, scroll into view first
  const clickTool = async (tid) => {
    await page.evaluate(id => {
      const el = document.querySelector(`[data-tid="${id}"]`);
      if (el) { el.scrollIntoView({ block: 'center' }); el.click(); }
    }, tid);
    await sleep(150);
  };

  // Navigate to screen 2 with 'leads' pain selected
  await goToScreen2(page);

  // HT/1: No hint on entry — 0 tools, pain = leads
  const displayOnEntry = await page.$eval('#tools-hint', el => el.style.display);
  displayOnEntry === 'none'
    ? pass('HT/1: No hint on entry (0 tools)')
    : fail(F, `HT/1: Hint shown before any tools selected (display="${displayOnEntry}")`);

  // HT/2: Non-relevant tool → hint appears (leads pain, 'make' not in any leads group)
  await clickTool('make');
  const displayAfterMake = await page.$eval('#tools-hint', el => el.style.display);
  displayAfterMake === 'block'
    ? pass('HT/2: Hint appears after selecting non-relevant tool')
    : fail(F, `HT/2: Hint not shown after selecting make (display="${displayAfterMake}")`);

  // HT/3: Both missing groups listed (messaging + CRM both absent)
  const textAfterMake = await page.$eval('#tools-hint', el => el.textContent);
  textAfterMake.includes('WhatsApp') && textAfterMake.includes('CRM')
    ? pass('HT/3: Both missing groups shown (WhatsApp, CRM)')
    : fail(F, `HT/3: Expected WhatsApp+CRM in hint, got: "${textAfterMake.slice(0, 120)}"`);

  // HT/4: Disclaimer "אך ורק" always present when hint shows
  textAfterMake.includes('אך ורק')
    ? pass('HT/4: Disclaimer "אך ורק" present')
    : fail(F, 'HT/4: Disclaimer "אך ורק" missing from hint');

  // HT/5: Add messaging tool → only CRM group remains missing
  await clickTool('whatsapp');
  const textAfterMsg = await page.$eval('#tools-hint', el => el.textContent);
  textAfterMsg.includes('CRM') && !textAfterMsg.includes('WhatsApp / Instagram')
    ? pass('HT/5: After WhatsApp added — only CRM missing')
    : fail(F, `HT/5: Expected only CRM missing, got: "${textAfterMsg.slice(0, 120)}"`);

  // HT/6: Add CRM tool → hint disappears (all groups covered)
  await clickTool('monday');
  const stateAfterCRM = await page.$eval('#tools-hint', el => ({ display: el.style.display, html: el.innerHTML.trim() }));
  (stateAfterCRM.display === 'none' || !stateAfterCRM.html)
    ? pass('HT/6: Hint hidden when all groups covered')
    : fail(F, `HT/6: Hint still visible after covering all groups (display="${stateAfterCRM.display}")`);

  // HT/7: Deselect CRM → hint reappears with CRM missing
  await clickTool('monday');
  const displayAfterDesel = await page.$eval('#tools-hint', el => el.style.display);
  displayAfterDesel === 'block'
    ? pass('HT/7: Hint reappears after deselecting CRM tool')
    : fail(F, `HT/7: Hint did not reappear after deselecting monday (display="${displayAfterDesel}")`);

  // HT/8: Switch pain to 'scheduling' → hint updates to Calendly (whatsapp covers group 2)
  await page.click('button[onclick="goTo(1)"]');
  await page.waitForSelector('#screen-1.active', { timeout: 2000 });
  await page.click('.pain-card[data-pain="scheduling"]');
  await page.waitForSelector('#screen-2.active', { timeout: 2000 });
  await sleep(120);
  const textSched = await page.$eval('#tools-hint', el => el.textContent);
  textSched.includes('Calendly')
    ? pass('HT/8: Scheduling pain — Calendly hint shown')
    : fail(F, `HT/8: Expected Calendly hint for scheduling, got: "${textSched.slice(0, 120)}"`);

  // HT/9: Add Calendly → scheduling hint disappears
  await clickTool('calendly');
  const stateAfterCal = await page.$eval('#tools-hint', el => ({ display: el.style.display, html: el.innerHTML.trim() }));
  (stateAfterCal.display === 'none' || !stateAfterCal.html)
    ? pass('HT/9: Hint hidden after adding Calendly for scheduling pain')
    : fail(F, `HT/9: Hint still visible after Calendly added (display="${stateAfterCal.display}")`);
}

async function testScreen3(page, F) {
  console.log('[sanity] Screen 3 (Processing)');
  await goToScreen3(page);

  // 3.5: No buttons
  const btns = await page.$$('#screen-3 button');
  btns.length === 0 ? pass('3.5: No interactive buttons') : fail(F, `3.5: Found ${btns.length} button(s) in processing screen`);

  // 3.4: Auto-transitions to screen 4
  try {
    await page.waitForSelector('#screen-4.active', { timeout: 4500 });
    pass('3.4: Auto-transitioned to screen-4');
  } catch {
    fail(F, '3.4: Screen 4 did not appear within 4.5s');
  }
}

async function testScreen4(page, F) {
  console.log('[sanity] Screen 4 (Results)');
  await goToScreen4(page);

  // 4.6: CTA button present
  const cta = await page.$('#screen-4 button[onclick*="openLeadModal"]');
  cta ? pass('4.6: CTA button present') : fail(F, '4.6: CTA button not found');

  // 4.7: CTA opens modal
  if (cta) {
    await openModal(page);
    const open = await page.$eval('#lead-modal', m => m.style.display !== 'none');
    open ? pass('4.7: Modal opens') : fail(F, '4.7: Modal did not open on CTA click');
  }
}

async function testModal(page, F) {
  console.log('[sanity] Modal (Lead capture)');
  await goToScreen4(page);
  await openModal(page);

  const vis = await page.$eval('#lead-modal', m => m.style.display !== 'none');
  if (!vis) { fail(F, 'M.1: Modal did not open'); return; }
  pass('M.1: Modal visible');

  // M.5: Focus on name field
  await sleep(150);
  const focused = await page.$eval('#mf-name', el => document.activeElement === el);
  focused ? pass('M.5: Focus on name field') : console.log('  note M.5: name field not focused (browser behaviour)');

  // M.6: Empty submit → .err classes
  await page.click('#msub-btn'); await sleep(200);
  const nameErr  = await page.$eval('#mf-name',  el => el.classList.contains('err'));
  const phoneErr = await page.$eval('#mf-phone', el => el.classList.contains('err'));
  const emailErr = await page.$eval('#mf-email', el => el.classList.contains('err'));
  nameErr  ? pass('M.6: name error')  : fail(F, 'M.6: #mf-name missing .err');
  phoneErr ? pass('M.6: phone error') : fail(F, 'M.6: #mf-phone missing .err');
  emailErr ? pass('M.6: email error') : fail(F, 'M.6: #mf-email missing .err');

  // M.7: Privacy error (not checked)
  const boxBorder = await page.$eval('#mf-privacy-box', el => el.style.borderColor);
  boxBorder.includes('224') || boxBorder.includes('107') || boxBorder.includes('e0176b')
    ? pass('M.7: Privacy box error style')
    : fail(F, `M.7: Privacy box border not showing error, got "${boxBorder}"`);

  // M.9/M.10: Toggle privacy
  await page.click('#mf-privacy-box'); await sleep(100);
  const chk1 = await page.$eval('#mf-privacy', el => el.checked);
  chk1 ? pass('M.9: Privacy toggles on') : fail(F, 'M.9: Clicking privacy box did not check it');

  await page.click('#mf-privacy-box'); await sleep(100);
  const chk2 = await page.$eval('#mf-privacy', el => el.checked);
  !chk2 ? pass('M.10: Privacy toggles off') : fail(F, 'M.10: Second click should uncheck privacy');

  // M.4: Escape closes
  await page.keyboard.press('Escape'); await sleep(200);
  const closedEsc = await page.$eval('#lead-modal', m => m.style.display === 'none');
  closedEsc ? pass('M.4: Escape closes modal') : fail(F, 'M.4: Escape did not close modal');

  // M.2: Close button
  await openModal(page);
  await page.click('button[aria-label="סגור חלון"]'); await sleep(200);
  const closedBtn = await page.$eval('#lead-modal', m => m.style.display === 'none');
  closedBtn ? pass('M.2: × button closes modal') : fail(F, 'M.2: × button did not close modal');

  // M.3: Backdrop click
  await openModal(page);
  await page.evaluate(() => document.getElementById('lead-modal').dispatchEvent(
    new MouseEvent('click', { bubbles: true, target: document.getElementById('lead-modal') })
  ));
  await sleep(200);
  const closedBkg = await page.$eval('#lead-modal', m => m.style.display === 'none');
  closedBkg ? pass('M.3: Backdrop click closes') : fail(F, 'M.3: Backdrop click did not close');
}

async function testScreen6(page, F) {
  console.log('[sanity] Screen 6 (Success)');
  await goToScreen4(page);
  await openModal(page);

  await page.type('#mf-name', 'Test User');
  await page.type('#mf-phone', '0501234567');
  await page.type('#mf-email', 'test@test.com');
  await page.click('#mf-privacy-box'); await sleep(100);
  await page.click('#msub-btn');

  try {
    await page.waitForSelector('#screen-6.active', { timeout: 6000 });
    pass('M.12: Success screen reached');
  } catch {
    fail(F, 'M.12: Did not reach screen-6 after valid submission');
    return;
  }

  // 6.2: Schedule button
  const schedBtn = await page.$('#screen-6 a[href*="shortlink.uk"]');
  schedBtn ? pass('6.2: Schedule button present') : fail(F, '6.2: Schedule (shortlink) button not found');

  // 6.3: Back to results
  const back = await page.$('#screen-6 button[onclick*="goTo(4)"]');
  back ? pass('6.3: Back to results button') : fail(F, '6.3: Back to results button not found');

  // 6.4: Reset button
  const reset = await page.$('#screen-6 button[onclick*="reset"], #screen-6 button[onclick*="Reset"]');
  reset ? pass('6.4: Reset button') : fail(F, '6.4: Reset button not found in screen-6');
}


async function testHappyPath(page, F) {
  console.log('[sanity] Happy Path (full flow)');

  // Screen 1 loads with 9 cards
  try { await page.waitForSelector('#screen-1.active', { timeout: 3000 }); }
  catch { fail(F, 'HP1: screen-1 not active on load'); return; }
  const count = await page.$$eval('.pain-card', c => c.length);
  count === 9 ? pass(`HP/1.4: ${count} pain cards`) : fail(F, `HP/1.4: Expected 9, got ${count}`);

  // Click pain → auto-transition
  await page.click('.pain-card[data-pain="leads"]');
  try {
    await page.waitForSelector('#screen-2.active', { timeout: 1000 });
    pass('HP/1.3: Auto-transition to screen-2');
  } catch {
    fail(F, 'HP/1.3: Did not auto-transition within 1s'); return;
  }

  // Continue button disabled, then select 3 tools
  const disOnEntry = await page.$eval('#tools-btn', b => b.disabled);
  disOnEntry ? pass('HP/2.1: Continue disabled') : fail(F, 'HP/2.1: Continue should be disabled');
  const tools = await page.$$('.tool-card');
  if (!tools.length) { fail(F, 'HP/screen2: No tool cards'); return; }
  await tools[0].click(); await tools[1].click(); await tools[2].click(); await sleep(150);
  const txt = await page.$eval('#tools-btn', b => b.textContent.trim());
  txt.includes('3') ? pass(`HP/2.3: "${txt}"`) : fail(F, `HP/2.3: Should show 3, got "${txt}"`);

  // Continue → processing
  await page.click('#tools-btn');
  try {
    await page.waitForSelector('#screen-3.active', { timeout: 2000 });
    pass('HP/2.6: Processing screen');
  } catch {
    fail(F, 'HP/2.6: Did not reach processing'); return;
  }

  // Auto-transition to results
  try {
    await page.waitForSelector('#screen-4.active', { timeout: 4500 });
    pass('HP/3.4: Results screen');
  } catch {
    fail(F, 'HP/3.4: Results did not appear within 4.5s'); return;
  }

  // CTA → modal
  const cta = await page.$('#screen-4 button[onclick*="openLeadModal"]');
  if (!cta) { fail(F, 'HP/4.6: CTA not found'); return; }
  try { await openModal(page); } catch { fail(F, 'HP/4.6: CTA button not found'); return; }
  const open = await page.$eval('#lead-modal', m => m.style.display !== 'none');
  if (!open) { fail(F, 'HP/4.7: Modal did not open'); return; }
  pass('HP/4.7: Modal opened');

  // Fill form → screen 6
  await page.type('#mf-name', 'Test User');
  await page.type('#mf-phone', '0501234567');
  await page.type('#mf-email', 'test@test.com');
  await page.click('#mf-privacy-box'); await sleep(100);
  await page.click('#msub-btn');
  try {
    await page.waitForSelector('#screen-6.active', { timeout: 6000 });
    pass('HP/M.12: Success screen');
  } catch {
    fail(F, 'HP/M.12: Did not reach success screen');
  }
}

// ── Section dispatch ──────────────────────────────────────────────────────────

const SUITE = {
  screen1:  testScreen1,
  screen2:  testScreen2,
  toolhint: testToolHint,
  screen3:  testScreen3,
  screen4:  testScreen4,
  modal:    testModal,
  screen6:  testScreen6,
};

function parseArgs(args) {
  const run = new Set(['happy-path']);
  for (const a of args) {
    const s = a.toLowerCase().replace(/-/g, '');
    if (s === 'screen1' || s.includes('pain')    || s.includes('screen1') || s.includes('screen 1') || s.match(/\b1\./)) run.add('screen1');
    if (s === 'screen2' || s.includes('tool')    || s.includes('screen2') || s.includes('screen 2') || s.match(/\b2\./)) run.add('screen2');
    if (s === 'screen3' || s.includes('process') || s.includes('screen3') || s.includes('screen 3') || s.match(/\b3\./)) run.add('screen3');
    if (s === 'screen4' || s.includes('result')  || s.includes('screen4') || s.includes('screen 4') || s.match(/\b4\./)) run.add('screen4');
    if (s === 'toolhint'|| s.includes('hint')    || s.includes('toolhint'))                                              run.add('toolhint');
    if (s === 'modal'   || s.includes('modal')   || s.includes('lead')    || s.match(/\bm\./i))                          run.add('modal');
    if (s === 'screen6' || s.includes('success') || s.includes('screen6') || s.includes('screen 6') || s.match(/\b6\./)) run.add('screen6');
  }
  return [...run];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const sections = parseArgs(args);
  const bar = '═'.repeat(52);

  console.log(`\n${bar}`);
  console.log(' SCANNER SANITY TESTS');
  console.log(` Suites: ${sections.join(', ')}`);
  console.log(`${bar}\n`);

  await ensureServer();

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    timeout: 60000,
  });

  const failures = [];

  try {
    for (const section of sections) {
      const fn = section === 'happy-path' ? testHappyPath : SUITE[section];
      if (!fn) continue;
      const page = await openPage(browser);
      try {
        await fn(page, failures);
      } catch (e) {
        fail(failures, `${section}: Unexpected error — ${e.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${bar}`);
  if (failures.length === 0) {
    console.log(' ALL TESTS PASSED');
    console.log(bar + '\n');
    process.exit(0);
  } else {
    console.log(` ${failures.length} TEST(S) FAILED:`);
    failures.forEach(f => console.log(`  - ${f}`));
    console.log(bar + '\n');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('[sanity] Fatal:', e.message);
  process.exit(1);
});
