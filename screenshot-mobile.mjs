import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
  timeout: 60000
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

await page.evaluate(() => {
  document.querySelectorAll('.zz-node').forEach(el => el.classList.add('shown'));
  document.querySelectorAll('.zz-dot').forEach(el => el.classList.add('popped'));
  document.getElementById('process').scrollIntoView();
});
await new Promise(r => setTimeout(r, 600));

const section = await page.$('#process');
await section.screenshot({ path: 'temporary screenshots/mobile-process.png' });
await browser.close();
console.log('saved: temporary screenshots/mobile-process.png');
