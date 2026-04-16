/**
 * seo-updater.mjs
 * סורק אתרי מתחרים בתחום האוטומציה בישראל,
 * מחלץ מילות מפתח בתדירות גבוהה, ומעדכן את meta tags של index.html.
 *
 * Usage: node seo-updater.mjs [--dry-run]
 *   --dry-run  הצג מה ישתנה מבלי לשמור
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

import { join } from 'path';

const DRY_RUN = process.argv.includes('--dry-run');
const BASE_DIR = process.cwd();
const INDEX_PATH = join(BASE_DIR, 'index.html');
const CONFIG_PATH = join(BASE_DIR, 'seo-config.json');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stripHtmlTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMeta(html, name) {
  const m = html.match(new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']*?)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*?)["'][^>]+name=["']${name}["']`, 'i'));
  return m ? m[1] : null;
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripHtmlTags(m[1]) : null;
}

function extractHeadings(html) {
  const matches = [];
  const re = /<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    matches.push(stripHtmlTags(m[1]));
  }
  return matches.join(' ');
}

function extractParagraphs(html, maxChars = 2000) {
  const matches = [];
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let m;
  let total = 0;
  while ((m = re.exec(html)) !== null && total < maxChars) {
    const text = stripHtmlTags(m[1]);
    matches.push(text);
    total += text.length;
  }
  return matches.join(' ').slice(0, maxChars);
}

function tokenizeHebrew(text) {
  // שמור רק מילים עבריות, אנגליות, ומספרים
  return text.match(/[\u05D0-\u05EA]{2,}|[a-zA-Z]{3,}/g) || [];
}

function buildFrequencyMap(texts, stopWords, minLen) {
  const stopSet = new Set(stopWords.map(w => w.trim()));
  const freq = {};

  for (const text of texts) {
    const tokens = tokenizeHebrew(text);
    for (const token of tokens) {
      const word = token.trim();
      if (word.length < minLen) continue;
      if (stopSet.has(word)) continue;
      freq[word] = (freq[word] || 0) + 1;
    }
  }

  return freq;
}

function topN(freq, n) {
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([word]) => word);
}

// ─── Fetch competitor ─────────────────────────────────────────────────────────

async function fetchCompetitor(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SEO-Bot/1.0)' }
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return {
      url,
      title: extractTitle(html),
      description: extractMeta(html, 'description'),
      headings: extractHeadings(html),
      paragraphs: extractParagraphs(html),
    };
  } catch (err) {
    console.warn(`  ⚠️  נכשל: ${url} — ${err.message}`);
    return null;
  }
}

// ─── Update index.html ────────────────────────────────────────────────────────

function updateMetaTag(html, name, newContent) {
  // Try name= first, then property=
  const patternName = new RegExp(
    `(<meta\\s+name=["']${name}["']\\s+content=["'])([^"']*)(["'])`,
    'i'
  );
  const patternContent = new RegExp(
    `(<meta\\s+content=["'])([^"']*)(["']\\s+name=["']${name}["'])`,
    'i'
  );

  if (patternName.test(html)) {
    return html.replace(patternName, `$1${newContent}$3`);
  }
  if (patternContent.test(html)) {
    return html.replace(patternContent, `$1${newContent}$3`);
  }
  return null; // tag not found
}

function updateOgTag(html, property, newContent) {
  const pattern = new RegExp(
    `(<meta\\s+property=["']${property}["']\\s+content=["'])([^"']*)(["'])`,
    'i'
  );
  const patternAlt = new RegExp(
    `(<meta\\s+content=["'])([^"']*)(["']\\s+property=["']${property}["'])`,
    'i'
  );
  if (pattern.test(html)) return html.replace(pattern, `$1${newContent}$3`);
  if (patternAlt.test(html)) return html.replace(patternAlt, `$1${newContent}$3`);
  return null;
}

function insertKeywordsTag(html, keywords) {
  // הכנס אחרי meta description
  const insertAfter = /<meta[^>]+name=["']description["'][^>]*>/i;
  const m = html.match(insertAfter);
  if (!m) return html;
  const tag = `\n  <meta name="keywords" content="${keywords}" />`;
  return html.replace(insertAfter, m[0] + tag);
}

function buildDescription(topKeywords, currentDesc) {
  // אם ה-description הנוכחי כבר מכיל לפחות 3 מהמילים המובילות — השאר
  const matches = topKeywords.slice(0, 5).filter(kw =>
    currentDesc && currentDesc.includes(kw)
  );
  if (matches.length >= 3) return currentDesc;

  // בנה description חדש שמשלב את מילות המפתח
  const topHebrew = topKeywords.filter(w => /[\u05D0-\u05EA]/.test(w)).slice(0, 6);
  return `CLIX Automations — ${topHebrew.slice(0, 3).join(', ')} לעסק שלך. `
    + `חיבור כלים: Make, Monday, WhatsApp, CRM ועוד. `
    + `${topHebrew.slice(3, 6).join(', ')}. השאר פרטים ותקבל ייעוץ חינם.`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🔍 CLIX SEO Keyword Updater');
  console.log('═'.repeat(50));

  // 1. Load config
  const config = JSON.parse(await readFile(CONFIG_PATH, 'utf8'));
  const { competitors, stopWords, minWordLength, topKeywordsCount, siteKeywords } = config;

  // 2. Fetch all competitors
  console.log(`\n📡 סורק ${competitors.length} אתרי מתחרים...\n`);
  const results = await Promise.all(competitors.map(fetchCompetitor));
  const valid = results.filter(Boolean);
  console.log(`\n✅ הצליח לסרוק: ${valid.length}/${competitors.length} אתרים`);

  // 3. Build frequency map
  const allTexts = valid.flatMap(r => [
    r.title || '',
    r.description || '',
    r.headings || '',
    r.paragraphs || '',
  ]);

  const allStopWords = [...stopWords, ...siteKeywords.flatMap(k => k.split(' '))];
  const freq = buildFrequencyMap(allTexts, allStopWords, minWordLength);
  const topKeywords = topN(freq, topKeywordsCount);

  console.log('\n📊 מילות מפתח מובילות שנמצאו:');
  topKeywords.forEach((kw, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${kw} (${freq[kw]} הופעות)`);
  });

  // 4. Load index.html
  if (!existsSync(INDEX_PATH)) {
    console.error(`\n❌ לא נמצא: ${INDEX_PATH}`);
    process.exit(1);
  }
  let html = await readFile(INDEX_PATH, 'utf8');
  const originalHtml = html;

  // 5. Apply updates
  const currentDesc = extractMeta(html, 'description') || '';
  const currentKeywords = extractMeta(html, 'keywords');
  const newKeywords = topKeywords.join(', ');
  const newDesc = buildDescription(topKeywords, currentDesc);

  // Meta description
  const updatedDesc = updateMetaTag(html, 'description', newDesc);
  if (updatedDesc) {
    html = updatedDesc;
    console.log('\n✏️  עודכן: meta description');
  }

  // Meta keywords (add if missing, replace if exists)
  if (!currentKeywords) {
    html = insertKeywordsTag(html, newKeywords);
    console.log('✏️  נוסף: meta keywords');
  } else {
    const updatedKw = updateMetaTag(html, 'keywords', newKeywords);
    if (updatedKw) {
      html = updatedKw;
      console.log('✏️  עודכן: meta keywords');
    }
  }

  // OG description
  const updatedOgDesc = updateOgTag(html, 'og:description', newDesc);
  if (updatedOgDesc) {
    html = updatedOgDesc;
    console.log('✏️  עודכן: og:description');
  }

  // Twitter description
  const updatedTwitterDesc = updateMetaTag(html, 'twitter:description', newDesc);
  if (updatedTwitterDesc) {
    html = updatedTwitterDesc;
    console.log('✏️  עודכן: twitter:description');
  }

  // 6. Save or dry-run
  if (html === originalHtml) {
    console.log('\nℹ️  אין שינויים — האתר כבר מעודכן.');
    return;
  }

  if (DRY_RUN) {
    console.log('\n🧪 DRY RUN — לא נשמר. הרץ בלי --dry-run כדי לשמור.');
  } else {
    await writeFile(INDEX_PATH, html, 'utf8');
    console.log('\n💾 נשמר: index.html');
    console.log(`\n📅 עדכון בוצע: ${new Date().toLocaleString('he-IL')}`);
  }

  console.log('\n' + '═'.repeat(50));
  console.log('✅ סיום\n');
}

main().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
