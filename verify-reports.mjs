import puppeteer from 'C:/Users/nateh/AppData/Local/Temp/puppeteer-test/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';

const browser = await puppeteer.launch({ headless: true, executablePath: 'C:/Users/nateh/.cache/puppeteer/chrome/win64-136.0.7103.92/chrome-win64/chrome.exe' });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 900 });

await page.goto('http://localhost:3000/scanner.html', { waitUntil: 'networkidle0' });

// Close cookie banner if present
try { await page.click('#cookie-accept'); await new Promise(r => setTimeout(r, 500)); } catch {}

// Click "דוחות ומעקב"
await page.evaluate(() => {
  const cards = document.querySelectorAll('.pain-card');
  for (const c of cards) { if (c.innerText.includes('דוחות')) { c.click(); break; } }
});
await new Promise(r => setTimeout(r, 1200));

// Select Airtable only
await page.evaluate(() => {
  const tools = document.querySelectorAll('.tool-card');
  for (const t of tools) { if (t.dataset.tid === 'airtable') { t.click(); break; } }
});
await new Promise(r => setTimeout(r, 500));

// Click continue
await page.evaluate(() => { const btn = document.querySelector('#btn-continue'); if (btn) btn.click(); });
await new Promise(r => setTimeout(r, 4000));

await page.screenshot({ path: 'C:/‏‏שולחן העבודה - עותק/Automasions_WebSite/temporary screenshots/screenshot-verify-reports.png' });

const texts = await page.evaluate(() => {
  const nodes = document.querySelectorAll('.map-node-title, .node-title, .s4-pain-title');
  return [...nodes].map(n => n.innerText.trim()).filter(Boolean);
});
console.log('Titles:', JSON.stringify(texts, null, 2));

await browser.close();
