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

// Remove site nav (not part of standalone scanner)
html = html.replace(/[ \t]*<!-- Main site nav -->[\s\S]*?<\/nav>\n?/, '');

// Remove 130px top margin from progress bar (was there to clear the fixed site nav)
html = html.replace(
  /gap: 0; margin-top: 130px; margin-bottom: 32px;/,
  'gap: 0; margin-top: 32px; margin-bottom: 32px;'
);

// Update URLs for standalone domain
html = html.replaceAll('https://clix-automations.com/scanner.html', 'https://scanner.clix-automations.com/');
html = html.replace('src="/cookie-consent.js"', 'src="cookie-consent.js"');
html = html.replace('href="/privacy.html"', 'href="https://clix-automations.com/privacy.html"');
html = html.replace('href="/" aria-label="Clix Automations', 'href="https://clix-automations.com/" aria-label="Clix Automations');

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
