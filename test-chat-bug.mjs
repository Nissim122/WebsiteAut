/**
 * Comprehensive sanity tests for the chat widget viewport-switching bug.
 */
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL   = 'http://localhost:3000';
const DESKTOP_W  = 1280, DESKTOP_H = 800;
const MOBILE_W   = 390,  MOBILE_H  = 844;
const SS_DIR     = path.join(__dirname, 'temporary screenshots');

let passCount = 0, failCount = 0;
const log  = msg  => console.log(msg);
const pass = msg  => { passCount++; console.log(`  ✅ PASS: ${msg}`); };
const fail = msg  => { failCount++; console.error(`  ❌ FAIL: ${msg}`); };

async function shot(page, label) {
  if (!fs.existsSync(SS_DIR)) fs.mkdirSync(SS_DIR, { recursive: true });
  const files = fs.readdirSync(SS_DIR).filter(f => f.match(/^screenshot-\d+/)).length;
  const name  = `screenshot-${files + 1}-${label}.png`;
  const out   = path.join(SS_DIR, name);
  await page.screenshot({ path: out });
  return out;
}

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function panelState(page) {
  return page.evaluate(() => {
    const p = document.getElementById('chat-panel');
    if (!p) return null;
    const rect = p.getBoundingClientRect();
    const cs   = window.getComputedStyle(p);
    return {
      inlineBottom:  p.style.bottom,
      inlineTop:     p.style.top,
      opacity:       parseFloat(cs.opacity),
      pointerEvents: cs.pointerEvents,
      rectTop:       Math.round(rect.top),
      rectBottom:    Math.round(rect.bottom),
      rectLeft:      Math.round(rect.left),
      vh:            window.innerHeight,
      vw:            window.innerWidth,
      isOnScreen:    rect.bottom > 0 && rect.top < window.innerHeight &&
                     rect.right  > 0 && rect.left < window.innerWidth,
    };
  });
}

const openChat  = async p => { await p.evaluate(() => window.toggleChat()); await wait(450); };
const closeChat = async p => { await p.evaluate(() => window.toggleChat()); await wait(450); };
const toDesktop = async p => { await p.setViewport({ width: DESKTOP_W, height: DESKTOP_H }); await wait(350); };
const toMobile  = async p => { await p.setViewport({ width: MOBILE_W,  height: MOBILE_H  }); await wait(350); };

// ─── Test suite ──────────────────────────────────────────────────────────────

async function test1(page) {
  log('\n[Test 1] Desktop open→close → mobile → desktop → open → panel on-screen');
  await toDesktop(page);
  await openChat(page);
  await closeChat(page);
  await toMobile(page);
  await toDesktop(page);
  await openChat(page);

  const s = await panelState(page);
  if (s && s.opacity > 0.9 && s.isOnScreen)
    pass(`panel visible on-screen (opacity=${s.opacity.toFixed(2)}, rectTop=${s.rectTop})`);
  else
    fail(`panel off-screen or invisible (opacity=${s?.opacity}, rectTop=${s?.rectTop}, vh=${s?.vh})`);

  await shot(page, 'test1-desktop-after-mobile');
  await closeChat(page);
}

async function test2(page) {
  log('\n[Test 2] Desktop (chat closed) → mobile → desktop → open → panel on-screen');
  await toDesktop(page);
  await toMobile(page);
  await toDesktop(page);
  await openChat(page);

  const s = await panelState(page);
  if (s && s.opacity > 0.9 && s.isOnScreen)
    pass(`panel visible on-screen (rectTop=${s.rectTop}, rectBottom=${s.rectBottom})`);
  else
    fail(`panel off-screen or invisible (opacity=${s?.opacity}, rectTop=${s?.rectTop}, vh=${s?.vh})`);

  await shot(page, 'test2-idle-mobile-then-desktop');
  await closeChat(page);
}

async function test3(page) {
  log('\n[Test 3] Desktop open chat → switch to mobile while open → back to desktop → panel still visible');
  await toDesktop(page);
  await openChat(page);
  await toMobile(page);
  await toDesktop(page);

  const s = await panelState(page);
  if (s && s.opacity > 0.9 && s.isOnScreen)
    pass(`panel still visible after viewport roundtrip (rectTop=${s.rectTop})`);
  else
    fail(`panel disappeared after viewport roundtrip (opacity=${s?.opacity}, rectTop=${s?.rectTop})`);

  await shot(page, 'test3-open-across-resize');
  await closeChat(page);
}

async function test4(page) {
  log('\n[Test 4] Start mobile, open chat → switch to desktop → panel repositions correctly');
  await toMobile(page);
  await openChat(page);
  await toDesktop(page);

  const s = await panelState(page);
  if (s && s.opacity > 0.9 && s.isOnScreen)
    pass(`panel on-screen after mobile→desktop transition (rectLeft=${s.rectLeft}, rectBottom=${s.rectBottom})`);
  else
    fail(`panel off-screen after mobile→desktop (opacity=${s?.opacity}, rectTop=${s?.rectTop})`);

  await shot(page, 'test4-mobile-open-then-desktop');
  await closeChat(page);
}

async function test5(page) {
  log('\n[Test 5] Rapid viewport toggling ×5 → open chat → panel on-screen');
  await toDesktop(page);
  for (let i = 0; i < 5; i++) {
    await toMobile(page);
    await toDesktop(page);
  }
  await openChat(page);

  const s = await panelState(page);
  if (s && s.opacity > 0.9 && s.isOnScreen)
    pass(`panel visible after 5 rapid viewport toggles (rectBottom=${s.rectBottom}, vh=${s.vh})`);
  else
    fail(`panel off-screen after rapid toggling (opacity=${s?.opacity}, rectTop=${s?.rectTop}, vh=${s?.vh})`);

  await shot(page, 'test5-rapid-toggle');
  await closeChat(page);
}

async function test6(page) {
  log('\n[Test 6] Closed panel has pointer-events:none after mobile roundtrip (button not blocked)');
  await toDesktop(page);
  await toMobile(page);
  await toDesktop(page);

  const s = await panelState(page);
  if (s && s.pointerEvents === 'none')
    pass(`closed panel pointer-events=none — button clicks pass through`);
  else
    fail(`closed panel pointer-events=${s?.pointerEvents} — may block button clicks`);
}

async function test7(page) {
  log('\n[Test 7] panel.style.bottom is restored to desktop value after mobile→desktop');
  await toDesktop(page);
  await toMobile(page);
  await toDesktop(page);

  const bottom = await page.evaluate(() => {
    const p = document.getElementById('chat-panel');
    return p ? p.style.bottom : null;
  });
  if (bottom && bottom !== '')
    pass(`panel.style.bottom restored to "${bottom}"`);
  else
    fail(`panel.style.bottom is empty — fix not applied`);
}

async function test8(page) {
  log('\n[Test 8] Multiple open/close cycles across viewport switches work correctly');
  await toDesktop(page);

  for (let cycle = 1; cycle <= 3; cycle++) {
    await openChat(page);
    await toMobile(page);
    await closeChat(page);
    await toDesktop(page);
    await openChat(page);

    const s = await panelState(page);
    if (s && s.opacity > 0.9 && s.isOnScreen)
      pass(`cycle ${cycle}: panel visible on desktop after mobile-close cycle`);
    else
      fail(`cycle ${cycle}: panel off-screen (opacity=${s?.opacity}, rectTop=${s?.rectTop})`);

    await closeChat(page);
  }
  await shot(page, 'test8-multi-cycle');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    timeout: 60000,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: DESKTOP_W, height: DESKTOP_H });
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 20000 });
    // Wait until toggleChat is actually defined (scripts may load late)
    await page.waitForFunction(() => typeof window.toggleChat === 'function', { timeout: 10000 });
    await wait(800);

    await test1(page);
    await test2(page);
    await test3(page);
    await test4(page);
    await test5(page);
    await test6(page);
    await test7(page);
    await test8(page);

  } finally {
    await browser.close();
  }

  log(`\n${'─'.repeat(52)}`);
  log(`Results: ${passCount} passed  |  ${failCount} failed`);
  if (failCount > 0) process.exit(1);
})();
