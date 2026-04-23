/**
 * publish.mjs
 * מפרסם טיוטה מ-drafts/YYYY-MM-DD.json לתוך blog.html
 *
 * Usage: node publish.mjs YYYY-MM-DD
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

const dateArg = process.argv[2];
if (!dateArg || !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
  console.error('❌ שימוש: node publish.mjs YYYY-MM-DD');
  process.exit(1);
}

const BASE_DIR  = process.cwd();
const META_PATH = join(BASE_DIR, 'drafts', `${dateArg}.json`);
const BLOG_PATH = join(BASE_DIR, 'blog.html');
const MARKER    = '<!-- AGENT_INSERT_HERE -->';

const CATEGORIES = {
  make:     { label: 'Make',           css: 'make' },
  zapier:   { label: 'Zapier',         css: 'make' },
  ai:       { label: 'AI כלים',        css: 'ai' },
  monday:   { label: 'Monday.com',     css: 'monday' },
  whatsapp: { label: 'WhatsApp עסקי', css: 'whatsapp' },
  tips:     { label: 'טיפים',          css: 'tips' },
};

async function main() {
  if (!existsSync(META_PATH)) {
    console.error(`❌ לא נמצאה טיוטה: drafts/${dateArg}.json`);
    process.exit(1);
  }
  if (!existsSync(BLOG_PATH)) {
    console.error('❌ לא נמצא blog.html');
    process.exit(1);
  }

  const post = JSON.parse(await readFile(META_PATH, 'utf8'));
  const cat  = CATEGORIES[post.category] || CATEGORIES.tips;

  const heDate = new Date(post.date).toLocaleDateString('he-IL', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  let html = await readFile(BLOG_PATH, 'utf8');

  if (!html.includes(MARKER)) {
    console.error(`❌ לא נמצא marker בבלוג:\n   ${MARKER}`);
    process.exit(1);
  }

  // Check if this date was already published
  if (html.includes(`<!-- AGENT POST ${dateArg} -->`)) {
    console.warn(`⚠️  טיוטה ${dateArg} כבר פורסמה. יוצא.`);
    process.exit(0);
  }

  const cardHtml = `<!-- AGENT POST ${dateArg} -->
      <article class="blog-card reveal" data-cats="${post.category}" style="transition-delay:0.05s;">
        <div class="blog-card-thumb-wrap">
          <img src="https://placehold.co/640x360/0e1628/2196b0?text=${encodeURIComponent(post.title.slice(0, 28))}" alt="${post.title}" loading="lazy" />
        </div>
        <div class="blog-card-body">
          <span class="blog-tag ${cat.css}">${cat.label}</span>
          <a href="posts/${dateArg}.html" class="blog-title">
            ${post.title}
          </a>
          <p class="blog-excerpt">
            ${post.excerpt}
          </p>
          <div class="blog-meta">
            <span>ניסים בנגייב</span>
            <span class="blog-meta-dot"></span>
            <span>${heDate}</span>
            <span class="blog-meta-dot"></span>
            <span>${post.readTime} דק' קריאה</span>
          </div>
        </div>
      </article>
      ${MARKER}`;

  html = html.replace(MARKER, cardHtml);
  await writeFile(BLOG_PATH, html, 'utf8');

  console.log(`✅ פורסם בהצלחה!`);
  console.log(`   כותרת: "${post.title}"`);
  console.log(`   קטגוריה: ${cat.label} | ${heDate}`);
  console.log(`\n👉 עשה commit ו-push כדי לעדכן את האתר.`);
}

main().catch(err => {
  console.error('❌ שגיאה:', err.message);
  process.exit(1);
});
