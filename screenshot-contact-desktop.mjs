import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
  timeout: 60000
});

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('clix_cookie_consent', 'yes');
});
await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

await page.evaluate(() => {
  document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
  ['clix-cookie-wrap','cookie-banner'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
  document.getElementById('contact').scrollIntoView();
});
await new Promise(r => setTimeout(r, 800));
await page.evaluate(() => {
  ['clix-cookie-wrap','cookie-banner'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
});

const section = await page.$('#contact');
await section.screenshot({ path: 'temporary screenshots/desktop-contact.png' });
await browser.close();
console.log('saved: temporary screenshots/desktop-contact.png');
