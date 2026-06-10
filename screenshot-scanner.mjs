import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const url = 'http://localhost:3000/scanner.html';
const label = process.argv[2] ? `-${process.argv[2]}` : '-scanner';

const screenshotDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

let n = 1;
while (fs.existsSync(path.join(screenshotDir, `screenshot-${n}${label}.png`))) n++;
const outPath = path.join(screenshotDir, `screenshot-${n}${label}.png`);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
  ],
  timeout: 60000,
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });

// Set cookies to skip cookie banner
await page.setCookie({
  name: 'cookieConsent',
  value: 'true',
  domain: 'localhost',
  path: '/',
});

await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

// Wait for page to settle
await new Promise(r => setTimeout(r, 1000));

// Accept cookies via the known button id
const accepted = await page.evaluate(() => {
  const btn = document.querySelector('#clix-cookie-accept');
  if (btn && btn.offsetParent !== null) {
    btn.click();
    return 'clicked: #clix-cookie-accept';
  }
  return 'no cookie banner found';
});
console.log('Cookie handling:', accepted);

// Trigger all scroll-reveal elements
await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  // Also trigger intersection observer targets
  document.querySelectorAll('[data-aos]').forEach(el => el.classList.add('aos-animate'));
});

await new Promise(r => setTimeout(r, 1200));

await page.screenshot({ path: outPath, fullPage: true });
await browser.close();

console.log(`Screenshot saved: ${outPath}`);
