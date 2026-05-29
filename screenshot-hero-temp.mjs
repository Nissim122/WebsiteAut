import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, 'temporary screenshots');

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  timeout: 60000,
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await page.goto('http://localhost:3000/scanner.html', { waitUntil: 'networkidle2', timeout: 30000 });

// Pain screen: click leads
await page.click('[data-pain="leads"]');
await new Promise(r => setTimeout(r, 900));

// Tools screen: select tools
await page.click('[data-tid="whatsapp"]');
await page.click('[data-tid="gmail"]');
await new Promise(r => setTimeout(r, 300));
await page.screenshot({ path: path.join(dir, 'screenshot-5-tools.png') });
console.log('Tools screen saved');

// Continue to processing
await page.click('#tools-btn');
await new Promise(r => setTimeout(r, 4500)); // processing + revelation + results

await page.screenshot({ path: path.join(dir, 'screenshot-6-results.png'), fullPage: true });
console.log('Results screen saved');

// Open modal
await page.evaluate(() => {
  document.querySelector('#screen-4 .btn-p').click();
});
await new Promise(r => setTimeout(r, 500));
await page.screenshot({ path: path.join(dir, 'screenshot-7-modal.png') });
console.log('Modal screenshot saved');

await browser.close();
