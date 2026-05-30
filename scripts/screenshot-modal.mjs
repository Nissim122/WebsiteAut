import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, '..', 'temporary screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

let n = 1;
while (fs.existsSync(path.join(screenshotDir, `screenshot-${n}-modal.png`))) n++;
const outPath = path.join(screenshotDir, `screenshot-${n}-modal.png`);

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
});

await new Promise(r => setTimeout(r, 800));
await page.evaluate(() => { openLeadModal(); });
await new Promise(r => setTimeout(r, 600));
await page.screenshot({ path: outPath });
await browser.close();
console.log(`Screenshot saved: ${outPath}`);
