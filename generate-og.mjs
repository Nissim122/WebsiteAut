import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 1200px; height: 630px; overflow: hidden;
  background: #0e1628;
  font-family: 'Segoe UI', Arial, sans-serif;
  direction: rtl;
}
.bg {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 60% 70% at 15% 50%, rgba(33,150,176,0.22) 0%, transparent 65%),
    radial-gradient(ellipse 55% 60% at 85% 20%, rgba(224,23,107,0.14) 0%, transparent 60%),
    radial-gradient(ellipse 40% 50% at 70% 90%, rgba(33,150,176,0.1) 0%, transparent 55%),
    #0e1628;
}
.grain {
  position: absolute; inset: 0; opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 256px;
}
/* Grid lines decoration */
.grid {
  position: absolute; inset: 0; opacity: 0.04;
  background-image:
    linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px);
  background-size: 60px 60px;
}
/* Dot cluster right side */
.dots {
  position: absolute;
  right: 60px; top: 50%;
  transform: translateY(-50%);
  width: 300px; height: 300px;
  opacity: 0.12;
  background-image: radial-gradient(circle, #2db3cd 1.5px, transparent 1.5px);
  background-size: 24px 24px;
  border-radius: 50%;
  mask-image: radial-gradient(ellipse 100% 100% at center, black 40%, transparent 80%);
}
/* Accent circle */
.circle-accent {
  position: absolute;
  right: 160px; top: 50%;
  transform: translateY(-50%);
  width: 260px; height: 260px;
  border-radius: 50%;
  border: 1.5px solid rgba(33,150,176,0.25);
  box-shadow: 0 0 60px rgba(33,150,176,0.15), inset 0 0 40px rgba(33,150,176,0.06);
}
.circle-accent2 {
  position: absolute;
  right: 200px; top: 50%;
  transform: translateY(-50%);
  width: 180px; height: 180px;
  border-radius: 50%;
  border: 1px solid rgba(224,23,107,0.2);
}
/* Content */
.content {
  position: absolute; inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0 90px 0 80px;
  gap: 0;
}
/* Tag */
.tag {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(33,150,176,0.12);
  border: 1px solid rgba(33,150,176,0.3);
  border-radius: 999px;
  padding: 6px 18px;
  font-size: 15px; font-weight: 700; color: #2db3cd;
  width: fit-content;
  margin-bottom: 28px;
  letter-spacing: 0.04em;
  font-family: 'Segoe UI', Arial, sans-serif;
}
.tag-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #2db3cd;
  box-shadow: 0 0 8px rgba(45,179,205,0.8);
}
/* Logo */
.logo {
  display: flex; align-items: baseline;
  gap: 6px;
  direction: ltr;
  margin-bottom: 22px;
}
.logo-clix {
  font-family: 'Segoe UI', Arial, sans-serif;
  font-weight: 800;
  font-size: 82px;
  letter-spacing: -0.04em;
  color: #ffffff;
  line-height: 1;
}
.logo-auto {
  font-family: 'Segoe UI', Arial, sans-serif;
  font-weight: 300;
  font-size: 58px;
  letter-spacing: -0.025em;
  color: #e0176b;
  line-height: 1;
}
/* Tagline */
.tagline {
  font-size: 28px;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
  line-height: 1.45;
  letter-spacing: -0.01em;
  max-width: 580px;
  font-family: 'Segoe UI', Arial, sans-serif;
  margin-bottom: 36px;
}
/* Sub tagline */
.sub {
  font-size: 18px;
  font-weight: 400;
  color: rgba(255,255,255,0.45);
  font-family: 'Segoe UI', Arial, sans-serif;
}
/* Bottom bar */
.bottom-bar {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 4px;
  background: linear-gradient(90deg, #2196b0 0%, #e0176b 50%, #2db3cd 100%);
  opacity: 0.7;
}
/* Pink glow dot */
.pink-glow {
  position: absolute;
  left: -80px; bottom: -80px;
  width: 300px; height: 300px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(224,23,107,0.18) 0%, transparent 70%);
}
</style>
</head>
<body>
<div class="bg"></div>
<div class="grain"></div>
<div class="grid"></div>
<div class="dots"></div>
<div class="circle-accent"></div>
<div class="circle-accent2"></div>
<div class="pink-glow"></div>

<div class="content">
  <div class="tag">
    <div class="tag-dot"></div>
    אוטומציה עסקית
  </div>
  <div class="logo">
    <span class="logo-clix">Clix</span>
    <span class="logo-auto">Automations</span>
  </div>
  <div class="tagline">חיסכון בזמן. יותר לקוחות.<br>עסק שעובד בשבילך.</div>
  <div class="sub">clix-automations.com</div>
</div>

<div class="bottom-bar"></div>
</body>
</html>`;

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  timeout: 60000,
});

const page = await browser.newPage();
await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
await page.setContent(html);
await new Promise(r => setTimeout(r, 800));

const outPath = join(__dir, 'brand_assets', 'og-main.png');
await page.screenshot({ path: outPath });
await browser.close();

console.log('OG image saved to:', outPath);
