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

// Go to screen 2
await page.evaluate(() => goTo(2));
await new Promise(r => setTimeout(r, 800));

// Click first pain card via JS to reveal tools
await page.evaluate(() => {
  const cards = document.querySelectorAll('.pain-card');
  if (cards[0]) cards[0].click();
});
await new Promise(r => setTimeout(r, 800));

// Click 3 tool cards via JS to show orbit connections
await page.evaluate(() => {
  const cards = document.querySelectorAll('.tool-card');
  if (cards[0]) cards[0].click();
});
await new Promise(r => setTimeout(r, 400));
await page.evaluate(() => {
  const cards = document.querySelectorAll('.tool-card');
  if (cards[1]) cards[1].click();
});
await new Promise(r => setTimeout(r, 400));
await page.evaluate(() => {
  const cards = document.querySelectorAll('.tool-card');
  if (cards[2]) cards[2].click();
});
await new Promise(r => setTimeout(r, 800));

// Scroll to finance section
await page.evaluate(() => { window.scrollBy(0, 400); });
await new Promise(r => setTimeout(r, 300));
await new Promise(r => setTimeout(r, 400));

const outPath = path.join(__dirname, 'temporary screenshots', 'screen2-orbit-test.png');
await page.screenshot({ path: outPath, fullPage: false });
await browser.close();
console.log('Saved:', outPath);
