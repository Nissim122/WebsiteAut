import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  timeout: 60000,
});

const page = await browser.newPage();
await page.setViewport({ width: 375, height: 812, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await page.goto('http://localhost:3000/scanner.html', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 600));

// Show tools screen
await page.evaluate(() => {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-2').classList.add('active');
});
await new Promise(r => setTimeout(r, 800));

const overflowers = await page.evaluate(() => {
  const vw = window.innerWidth;
  const results = [];
  document.querySelectorAll('*').forEach(el => {
    const r = el.getBoundingClientRect();
    // Check if element extends beyond left edge (negative x in RTL)
    if (r.left < -1 || r.right > vw + 1) {
      const style = window.getComputedStyle(el);
      results.push({
        tag: el.tagName,
        id: el.id,
        classes: [...el.classList].join(' '),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        vw,
        overflow: style.overflow,
        overflowX: style.overflowX,
        display: style.display,
        position: style.position,
      });
    }
  });
  return results;
});

console.log('Elements overflowing viewport:');
overflowers.forEach(e => console.log(
  `  ${e.tag}${e.id ? '#'+e.id : ''}${e.classes ? '.'+e.classes.replace(/ /g,'.') : ''}`,
  `left=${e.left} right=${e.right} width=${e.width}`,
  `overflow-x=${e.overflowX} display=${e.display} pos=${e.position}`
));

await browser.close();
