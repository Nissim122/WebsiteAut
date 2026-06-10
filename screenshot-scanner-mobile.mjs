import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const screenshotDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

let n = 1;
const label = '-screen4-mobile';
while (fs.existsSync(path.join(screenshotDir, `screenshot-${n}${label}.png`))) n++;
const outPath = path.join(screenshotDir, `screenshot-${n}${label}.png`);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
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
await new Promise(r => setTimeout(r, 500));

// Remove focus outline
await page.evaluate(() => {
  const style = document.createElement('style');
  style.textContent = '[tabindex="-1"]:focus { outline: none !important; }';
  document.head.appendChild(style);
});

// Screen 1 → click first pain card
await page.evaluate(() => {
  document.querySelector('.pain-card')?.click();
});
await new Promise(r => setTimeout(r, 600));

// Screen 2 → select 3 tools
await page.evaluate(() => {
  [...document.querySelectorAll('.tool-card')].slice(0, 3).forEach(c => c.click());
});
await new Promise(r => setTimeout(r, 400));

// Click המשך → triggers screen 3 processing (2600ms) → auto-advances to screen 4
await page.evaluate(() => {
  document.getElementById('tools-btn')?.click();
});

// Wait for screen 3 processing to finish and screen 4 to render
await new Promise(r => setTimeout(r, 3500));

// Remove all scroll/overflow restrictions + reveal all scroll-triggered elements
await page.evaluate(() => {
  // Inject override styles — disable all animations and make everything visible
  const style = document.createElement('style');
  style.textContent = `
    html, body { overflow: visible !important; overflow-x: visible !important; overflow-y: visible !important; max-height: none !important; height: auto !important; }
    #screen-4 { max-height: none !important; overflow: visible !important; overflow-y: visible !important; overflow-x: visible !important; height: auto !important; }
    .screen.active { overflow: visible !important; }
    /* Force all map nodes and connectors visible regardless of .in class */
    .tl-node, .tl-conn { opacity: 1 !important; transform: none !important; transition: none !important; }
    /* Force preview/other fade-in elements */
    .s4-preview-wrap, .s4-ba-col, .s4-locked-box, .s4-pain-card, .s4-map-box { opacity: 1 !important; transform: none !important; transition: none !important; }
  `;
  document.head.appendChild(style);

  // Add .in to all map nodes/connectors
  document.querySelectorAll('.tl-node, .tl-conn, .map-step, .map-conn').forEach(el => {
    el.classList.add('in');
  });

  // Reveal all other animated elements
  document.querySelectorAll('.reveal, [data-aos]').forEach(el => {
    el.classList.add('visible');
    el.classList.add('aos-animate');
  });
});

// Wait for reflow
await new Promise(r => setTimeout(r, 600));

// Measure the actual rendered height of screen-4
const contentHeight = await page.evaluate(() => {
  const s4 = document.getElementById('screen-4');
  if (!s4) return document.documentElement.scrollHeight;
  // getBoundingClientRect gives the visible rect; scrollHeight gives full content height
  return Math.max(s4.scrollHeight, s4.offsetHeight, s4.getBoundingClientRect().height);
});

console.log(`Detected screen-4 content height: ${contentHeight}px`);

// Resize viewport to match the full content height so screenshot captures everything
const totalHeight = Math.max(contentHeight + 120, 844); // add some padding for nav
await page.setViewport({ width: 390, height: totalHeight, deviceScaleFactor: 3, isMobile: true, hasTouch: true });

await new Promise(r => setTimeout(r, 400));

await page.screenshot({ path: outPath, fullPage: false });
await browser.close();

console.log(`Screenshot saved: ${outPath}`);
