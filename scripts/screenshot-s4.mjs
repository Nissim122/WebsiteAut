import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, '..', 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

let n = 1;
while (fs.existsSync(path.join(screenshotDir, `screenshot-${n}-s4map.png`))) n++;
const outPath = path.join(screenshotDir, `screenshot-${n}-s4map.png`);

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  timeout: 60000,
});

const page = await browser.newPage();
await page.setViewport({ width: 430, height: 932, deviceScaleFactor: 2 });
await page.goto('http://localhost:3000/scanner.html', { waitUntil: 'networkidle2', timeout: 30000 });

await page.evaluate(() => {
  S.tools = ['whatsapp', 'hubspot', 'gmail'];
  S.pain  = 'leads';
  S.intent = 'leads';
  S.ctx = buildContext(S.intent, S.tools, S.pain);
  renderResults();
  goTo(4);
  document.getElementById('screen-4').style.maxHeight = 'none';
  document.getElementById('screen-4').style.overflow = 'visible';
});

await new Promise(r => setTimeout(r, 2200));
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log(`Screenshot saved: ${outPath}`);
