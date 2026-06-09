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
await page.setViewport({ width: 800, height: 1200, deviceScaleFactor: 3 });
await page.goto('http://localhost:3000/scanner.html', { waitUntil: 'networkidle2', timeout: 30000 });

await page.evaluate(() => goTo(2));
await new Promise(r => setTimeout(r, 800));

await page.evaluate(() => {
  const cards = document.querySelectorAll('.pain-card');
  for (const card of cards) {
    if (card.textContent.includes('פיננסים')) { card.click(); return; }
  }
  if (cards[0]) cards[0].click();
});
await new Promise(r => setTimeout(r, 1000));

// Capture both rows of finance tools (taller clip)
const bounds = await page.evaluate(() => {
  const labels = document.querySelectorAll('.tools-cat-label');
  for (const label of labels) {
    if (label.textContent.includes('פיננסים')) {
      const r = label.getBoundingClientRect();
      return { x: 0, y: r.top - 10, width: window.innerWidth, height: 360 };
    }
  }
  return null;
});

const outPath = path.join(__dirname, 'temporary screenshots', 'finance-zoom.png');
if (bounds) {
  await page.screenshot({ path: outPath, clip: bounds });
} else {
  await page.screenshot({ path: outPath, fullPage: false });
}
await browser.close();
console.log('Saved:', outPath);
