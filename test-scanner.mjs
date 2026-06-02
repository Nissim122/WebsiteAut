import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, 'temporary screenshots');

const br = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
const pg = await br.newPage();
await pg.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await pg.goto('http://localhost:3000/scanner.html', { waitUntil: 'networkidle2', timeout: 30000 });
pg.on('pageerror', err => console.error('PAGE ERROR:', err.message));

// Screen 1 — pick pain point (passed as arg or default to leads)
const pain = process.argv[2] || 'leads';
const toolList = (process.argv[3] || 'hubspot,whatsapp,instagram').split(',');

// Drive the scanner programmatically via exposed JS functions
await pg.evaluate(p => typeof pickPain === 'function' ? pickPain(p) : console.error('pickPain not found'), pain);
await new Promise(r => setTimeout(r, 1400));

for (const t of toolList) {
  await pg.evaluate(tid => {
    const el = document.querySelector(`[data-tid="${tid}"]`);
    if (el && typeof toggleTool === 'function') toggleTool(tid, el);
    else console.error('tool not found:', tid);
  }, t);
  await new Promise(r => setTimeout(r, 200));
}

const btnText = await pg.evaluate(() => document.getElementById('tools-btn')?.textContent);
console.log('tools-btn text:', btnText);

await pg.evaluate(() => typeof nextTools === 'function' ? nextTools() : console.error('nextTools not found'));
await new Promise(r => setTimeout(r, 5000));

const activeScreen = await pg.evaluate(() => document.querySelector('.screen.active')?.id);
console.log('active screen:', activeScreen);

// capture console errors
const errors = await pg.evaluate(() => window._puppeteerErrors || []);
console.log('js errors:', errors);

const s4 = await pg.$('#screen-4');

// Top — pain cards
await s4.evaluate(el => el.scrollTop = 0);
await new Promise(r => setTimeout(r, 500));
await pg.screenshot({ path: path.join(outDir, `scan-${pain}-top.png`) });

// Map
await s4.evaluate(el => el.scrollTop = 500);
await new Promise(r => setTimeout(r, 700));
await pg.screenshot({ path: path.join(outDir, `scan-${pain}-map.png`) });

// Preview — before/after
await s4.evaluate(el => el.scrollTop = 1800);
await new Promise(r => setTimeout(r, 700));
await pg.screenshot({ path: path.join(outDir, `scan-${pain}-preview.png`) });

// Extra scroll for after-column
await s4.evaluate(el => el.scrollTop = 2500);
await new Promise(r => setTimeout(r, 700));
await pg.screenshot({ path: path.join(outDir, `scan-${pain}-ba.png`) });

await br.close();
console.log('done — pain:', pain, 'tools:', toolList.join(','));
