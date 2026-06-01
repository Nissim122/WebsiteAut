import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

let n = 1;
while (fs.existsSync(path.join(screenshotDir, `hero-zoom-${n}.png`))) n++;
const outPath = path.join(screenshotDir, `hero-zoom-${n}.png`);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  timeout: 60000,
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  // Force WhatsApp into bb-monday bubble
  const el = document.getElementById('bb-monday');
  if (el) {
    el.style.opacity = '1';
    const img = el.querySelector('img');
    if (img) {
      img.src = 'brand_assets/icons/whatsapp_logo.png';
      img.style.width = '160px';
      img.style.height = '160px';
      img.style.objectFit = 'contain';
    }
  }
});

await new Promise(r => setTimeout(r, 800));

// Crop to hero / image column area (right side)
await page.screenshot({ path: outPath, clip: { x: 0, y: 50, width: 800, height: 600 } });
await browser.close();
console.log(`Saved: ${outPath}`);
