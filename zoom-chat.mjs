import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, executablePath: (await import('puppeteer')).executablePath?.() });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1000));

const launcher = await page.$('#chat-launcher');
if (launcher) {
  await launcher.screenshot({ path: 'temporary screenshots/chat-btn-zoom.png' });
  console.log('Saved chat-btn-zoom.png');
}

await page.click('#chat-btn');
await new Promise(r => setTimeout(r, 700));

const panel = await page.$('#chat-panel');
if (panel) {
  await panel.screenshot({ path: 'temporary screenshots/chat-panel-zoom.png' });
  console.log('Saved chat-panel-zoom.png');
}

await browser.close();
