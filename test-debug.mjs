import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

const page = await browser.newPage();

// Capture page errors
page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

await page.setViewport({ width: 1280, height: 800 });
await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 20000 });
await new Promise(r => setTimeout(r, 2000));

const result = await page.evaluate(() => {
  return {
    toggleChatType: typeof window.toggleChat,
    chatPanelExists: !!document.getElementById('chat-panel'),
    chatBtnExists:   !!document.getElementById('chat-btn'),
    readyState:      document.readyState,
    bodyChildren:    document.body.children.length,
  };
});

console.log('Page state:', JSON.stringify(result, null, 2));
await browser.close();
