import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  timeout: 60000,
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto('http://localhost:3000/scanner.html', { waitUntil: 'networkidle2', timeout: 30000 });
await page.evaluate(() => goTo(2));
await new Promise(r => setTimeout(r, 1000));

const outPath = path.join(__dirname, 'temporary screenshots', 'screen2-tools.png');
await page.screenshot({ path: outPath, fullPage: true });
await browser.close();
console.log('Saved:', outPath);
