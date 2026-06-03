import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
});

const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

await page.evaluate(() => {
  const section = document.querySelector('.cta-banner-inner') || document.querySelector('[id*="banner"]');
  if (section) section.scrollIntoView();
});
await new Promise(r => setTimeout(r, 400));

const btn = await page.$('#banner-submit');
await btn.screenshot({ path: 'temporary screenshots/banner-btn.png' });
await browser.close();
console.log('saved');
