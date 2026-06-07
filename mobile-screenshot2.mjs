import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  timeout: 60000,
});

async function shot(page, name) {
  const outPath = path.join(screenshotDir, `${name}.png`);
  await page.screenshot({ path: outPath, fullPage: true });
  const info = await page.evaluate(() => ({
    bodyScrollWidth: document.body.scrollWidth,
    htmlScrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
    // Find widest element
    widestEl: (() => {
      let max = 0, el = null;
      document.querySelectorAll('*').forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.right > max) { max = r.right; el = e.tagName + '.' + [...e.classList].join('.') + '#' + (e.id||''); }
      });
      return { max, el };
    })(),
  }));
  console.log(name, 'scroll:', info.bodyScrollWidth, 'x', info.viewportWidth, '| widest:', JSON.stringify(info.widestEl));
  return outPath;
}

const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
await page.goto('http://localhost:3000/scanner.html', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 600));

// Show tools screen (screen-2) directly
await page.evaluate(() => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-2').classList.add('active');
  // render tools
  if (typeof renderTools === 'function') renderTools();
  // trigger tools build
  const ev = new Event('DOMContentLoaded');
});
await new Promise(r => setTimeout(r, 800));
await shot(page, 'mobile-tools-screen');

// Show results screen (screen-4) with some mock data
await page.evaluate(() => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-4').classList.add('active');
  if (typeof showResults === 'function') {
    window.S = window.S || {};
    window.S.pain = 'leads';
    window.S.tools = ['hubspot', 'whatsapp', 'gmail', 'make'];
    showResults();
  }
});
await new Promise(r => setTimeout(r, 800));
await shot(page, 'mobile-results-screen');

await browser.close();
console.log('Done');
