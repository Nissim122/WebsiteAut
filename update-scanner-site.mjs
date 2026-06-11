#!/usr/bin/env node
/**
 * Syncs scanner.html → scanner-site/index.html
 * Run before: npm run deploy:scanner
 */
import { readFileSync, writeFileSync, cpSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const root = fileURLToPath(new URL('.', import.meta.url));
const src = root;
const dst = join(root, 'scanner-site');

// Read scanner.html
let html = readFileSync(join(src, 'scanner.html'), 'utf8');

// Hide site nav by default — shown only when ?nav=1 (arrived from main site)
html = html.replace(
  /(<nav class="site-nav")( aria-label="תפריט ראשי">)/,
  '$1 id="site-nav" style="display:none;"$2'
);

// Default top margin: 32px (no nav). When ?nav=1 JS restores it to 130px.
html = html.replace(
  /gap: 0; margin-top: 130px; margin-bottom: 32px;/,
  'gap: 0; margin-top: 32px; margin-bottom: 32px;'
);

// Inject nav-visibility logic before </body>
const navScript = `
  <script>
    // Show site nav when ?nav=1 (arrived from main site), persist in sessionStorage
    (function () {
      var p = new URLSearchParams(window.location.search);
      if (p.get('nav') === '1') sessionStorage.setItem('clix_nav', '1');
      if (sessionStorage.getItem('clix_nav') === '1') {
        var nav = document.getElementById('site-nav');
        if (nav) {
          nav.style.display = '';
          // Restore top margin that clears the fixed nav
          var wrapper = document.querySelector('.prog-bar');
          if (wrapper) wrapper.style.marginTop = '130px';
        }
      }
    })();
  </script>
`;
const lastBodyIdx = html.lastIndexOf('</body>');
html = html.slice(0, lastBodyIdx) + navScript + html.slice(lastBodyIdx);

// Update URLs for standalone domain
html = html.replaceAll('https://clix-automations.com/scanner.html', 'https://scanner.clix-automations.com/');
html = html.replace('src="/cookie-consent.js"', 'src="cookie-consent.js"');
html = html.replace('href="/privacy.html"', 'href="https://clix-automations.com/privacy.html"');
html = html.replace('href="/" aria-label="Clix Automations', 'href="https://clix-automations.com/" aria-label="Clix Automations');

// Fix nav links to absolute URLs (nav may be hidden but links must work when shown)
html = html.replace('href="/">דף הבית', 'href="https://clix-automations.com/">דף הבית');
html = html.replace('href="/#process"', 'href="https://clix-automations.com/#process"');
html = html.replace('href="/#results"', 'href="https://clix-automations.com/#results"');
html = html.replace('href="/blog.html"', 'href="https://clix-automations.com/blog.html"');
html = html.replace('href="/scanner.html" class="nav-active"', 'href="https://scanner.clix-automations.com/?nav=1" class="nav-active"');
html = html.replace('href="/#contact" class="btn-cta nav-cta-desktop"', 'href="https://clix-automations.com/#contact" class="btn-cta nav-cta-desktop"');
// Mobile menu links
html = html.replace('href="/" onclick="closeMobileMenu()"', 'href="https://clix-automations.com/" onclick="closeMobileMenu()"');
html = html.replace('href="/#process" onclick="closeMobileMenu()"', 'href="https://clix-automations.com/#process" onclick="closeMobileMenu()"');
html = html.replace('href="/#results" onclick="closeMobileMenu()"', 'href="https://clix-automations.com/#results" onclick="closeMobileMenu()"');
html = html.replace('href="/blog.html" onclick="closeMobileMenu()"', 'href="https://clix-automations.com/blog.html" onclick="closeMobileMenu()"');
html = html.replace('href="/scanner.html" onclick="closeMobileMenu()"', 'href="https://scanner.clix-automations.com/?nav=1" onclick="closeMobileMenu()"');
html = html.replace('href="/#contact" onclick="closeMobileMenu()"', 'href="https://clix-automations.com/#contact" onclick="closeMobileMenu()"');

writeFileSync(join(dst, 'index.html'), html, 'utf8');
console.log('✓ index.html updated');

// Copy static assets
const staticFiles = ['cookie-consent.js', 'favicon.ico', 'favicon.svg', 'favicon-32.png', 'favicon-192.png'];
for (const f of staticFiles) {
  if (existsSync(join(src, f))) {
    try { cpSync(join(src, f), join(dst, f)); } catch {}
  }
}
console.log('✓ static files copied');

// Copy brand_assets/icons
const iconsDir = join(dst, 'brand_assets', 'icons');
mkdirSync(iconsDir, { recursive: true });
cpSync(join(src, 'brand_assets', 'icons'), iconsDir, { recursive: true });

// Copy og-scanner.png
const ogFile = join(src, 'brand_assets', 'og-scanner.png');
if (existsSync(ogFile)) {
  cpSync(ogFile, join(dst, 'brand_assets', 'og-scanner.png'));
}
console.log('✓ brand_assets copied');
console.log('\nReady. Run: npm run deploy:scanner');
