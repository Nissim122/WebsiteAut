import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const screenshotDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

// Clean old frames
fs.readdirSync(screenshotDir)
  .filter(f => f.startsWith('anim-frame-'))
  .forEach(f => fs.unlinkSync(path.join(screenshotDir, f)));

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: [
    '--no-sandbox', '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    // NO --disable-gpu so CSS animations can run
  ],
  timeout: 60000,
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

await page.goto('http://localhost:3000/scanner.html', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 800));

// Accept cookies
await page.evaluate(() => {
  document.querySelector('#clix-cookie-accept')?.click();
});
await new Promise(r => setTimeout(r, 400));

// Screen 1 → Screen 2
await page.evaluate(() => {
  document.querySelector('.pain-card')?.click();
});
await new Promise(r => setTimeout(r, 500));

// Select tools
await page.evaluate(() => {
  [...document.querySelectorAll('.tool-card')].slice(0, 3).forEach(c => c.click());
});
await new Promise(r => setTimeout(r, 300));

// Override startProc to block it, then go to screen 3 manually
await page.evaluate(() => {
  window._startProcBlocked = true;
  const origStartProc = window.startProc;
  window.startProc = function() {};  // block auto-run
  const origGoTo = window.goTo;
  window.goTo = function(n) {
    if (n === 4) return;  // block auto-advance to screen 4
    origGoTo(n);
  };
  window._origGoTo = origGoTo;
});

// Click המשך → goes to screen 3 but without startProc
await page.evaluate(() => {
  document.getElementById('tools-btn')?.click();
});
await new Promise(r => setTimeout(r, 400));

// ── Define animation frames manually ──
// Each frame: { text, nodes: [{id, color}], dotsActive }
// nodes color: 'blue' | 'pink' | null (just visible, not lit)
const frames = [
  // Frame 1 – just the ring, no nodes, first text
  { text: 'מנתח את הכלים שלך...', nodes: [] },
  // Frame 2 – pn0 appears (top, blue)
  { text: 'מנתח את הכלים שלך...', nodes: [{ id: 'pn0', color: 'blue' }] },
  // Frame 3 – pn1 appears (top-right, pink)
  { text: 'מנתח את הכלים שלך...', nodes: [{ id: 'pn0', color: 'blue' }, { id: 'pn1', color: 'pink' }] },
  // Frame 4 – pn2 (bottom-right, blue), text changes
  { text: 'ממפה הזדמנויות אוטומציה...', nodes: [{ id: 'pn0', color: 'blue' }, { id: 'pn1', color: 'pink' }, { id: 'pn2', color: 'blue' }] },
  // Frame 5 – pn3 (bottom, pink)
  { text: 'ממפה הזדמנויות אוטומציה...', nodes: [{ id: 'pn0', color: 'blue' }, { id: 'pn1', color: 'pink' }, { id: 'pn2', color: 'blue' }, { id: 'pn3', color: 'pink' }] },
  // Frame 6 – pn4 (bottom-left, blue), text changes
  { text: 'בונה את המערכת שלך...', nodes: [{ id: 'pn0', color: 'blue' }, { id: 'pn1', color: 'pink' }, { id: 'pn2', color: 'blue' }, { id: 'pn3', color: 'pink' }, { id: 'pn4', color: 'blue' }] },
  // Frame 7 – pn5 (top-left, pink) — all nodes lit
  { text: 'בונה את המערכת שלך...', nodes: [{ id: 'pn0', color: 'blue' }, { id: 'pn1', color: 'pink' }, { id: 'pn2', color: 'blue' }, { id: 'pn3', color: 'pink' }, { id: 'pn4', color: 'blue' }, { id: 'pn5', color: 'pink' }] },
  // Frame 8 – all nodes, final state
  { text: 'בונה את המערכת שלך...', nodes: [{ id: 'pn0', color: 'blue' }, { id: 'pn1', color: 'pink' }, { id: 'pn2', color: 'blue' }, { id: 'pn3', color: 'pink' }, { id: 'pn4', color: 'blue' }, { id: 'pn5', color: 'pink' }] },
];

const savedPaths = [];

for (let i = 0; i < frames.length; i++) {
  const frame = frames[i];

  // Set state for this frame
  await page.evaluate((f) => {
    // Reset all nodes
    document.querySelectorAll('.pnode').forEach(n => {
      n.className = 'pnode';
    });

    // Apply nodes for this frame
    f.nodes.forEach(({ id, color }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.add('vis');
      el.classList.add(color === 'blue' ? 'lit' : 'lit-pink');
    });

    // Set text
    const txtEl = document.getElementById('proc-text');
    if (txtEl) {
      txtEl.style.opacity = '1';
      txtEl.textContent = f.text;
    }
  }, frame);

  // Wait for CSS transitions to settle
  await new Promise(r => setTimeout(r, 350));

  const outPath = path.join(screenshotDir, `anim-frame-${String(i + 1).padStart(2, '0')}.png`);
  await page.screenshot({ path: outPath, fullPage: false });
  savedPaths.push(outPath);
  console.log(`Frame ${i + 1}: "${frame.text}" | nodes: ${frame.nodes.length} → ${path.basename(outPath)}`);
}

await browser.close();
console.log(`\n${savedPaths.length} frames saved in: temporary screenshots/`);
