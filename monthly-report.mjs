/**
 * monthly-report.mjs — דוח חודשי אוטומטי ל-GA4
 * node monthly-report.mjs            ← חודש קודם
 * node monthly-report.mjs 2026-05    ← חודש ספציפי
 */
import { google } from 'googleapis';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname  = dirname(fileURLToPath(import.meta.url));
const PROPERTY_ID = '532994689';

// Load .env if present (dev environment — production uses actual env vars)
const envFile = resolve(__dirname, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length && !process.env[k]) process.env[k] = v.join('=');
  }
}

const WEBHOOK = process.env.MAKE_MONTHLY_WEBHOOK;
if (!WEBHOOK) { console.error('❌ MAKE_MONTHLY_WEBHOOK לא מוגדר ב-.env'); process.exit(1); }
const SENT_FILE   = resolve(__dirname, '.last-report-sent');

const { client_id, client_secret } = JSON.parse(readFileSync(resolve(__dirname, 'oauth-client.json'))).installed;
const tokens = JSON.parse(readFileSync(resolve(__dirname, 'ga-token.json')));
const auth = new google.auth.OAuth2(client_id, client_secret);
auth.setCredentials(tokens);
const ga = google.analyticsdata({ version: 'v1beta', auth });

// ── תאריכים ──
function getMonthRange(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  const start = `${y}-${String(m).padStart(2,'0')}-01`;
  const last  = new Date(y, m, 0).getDate();
  const end   = `${y}-${String(m).padStart(2,'0')}-${last}`;
  return { start, end };
}

const arg = process.argv[2];
const now  = new Date();
const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const targetStr = arg || `${prevMonth.getFullYear()}-${String(prevMonth.getMonth()+1).padStart(2,'0')}`;
const prevStr   = (() => {
  const [y,m] = targetStr.split('-').map(Number);
  const p = new Date(y, m - 2, 1);
  return `${p.getFullYear()}-${String(p.getMonth()+1).padStart(2,'0')}`;
})();

const curr = getMonthRange(targetStr);
const prev = getMonthRange(prevStr);

const MONTHS_HE = ['','ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const [cy, cm] = targetStr.split('-').map(Number);
const monthLabel = `${MONTHS_HE[cm]} ${cy}`;

// ── Guard: מניעת כפל שליחה ──
// כשמריצים ידנית עם ארגומנט (חודש ספציפי) — תמיד שולח
const forceMode = !!arg;
if (!forceMode) {
  if (existsSync(SENT_FILE)) {
    const lastSent = readFileSync(SENT_FILE, 'utf8').trim();
    if (lastSent === targetStr) {
      console.log(`\n⏭  דוח ${targetStr} כבר נשלח (${SENT_FILE}). מדלג.`);
      process.exit(0);
    }
  }
}

console.log(`\n📊 דוח חודשי: ${monthLabel} (${curr.start} → ${curr.end})`);

// ── helpers ──
async function runReport(dateRange, dimensions, metrics, dimensionFilter) {
  const req = {
    property: `properties/${PROPERTY_ID}`,
    dateRanges: [dateRange],
    dimensions,
    metrics,
    limit: 20,
  };
  if (dimensionFilter) req.dimensionFilter = dimensionFilter;
  const { data } = await ga.properties.runReport({ property: `properties/${PROPERTY_ID}`, requestBody: req });
  return data.rows || [];
}

function eventFilter(name) {
  return { filter: { fieldName: 'eventName', stringFilter: { value: name, matchType: 'EXACT' } } };
}

function andFilter(...filters) {
  return { andGroup: { expressions: filters } };
}

function getVal(rows, eventName) {
  const row = rows.find(r => r.dimensionValues[0].value === eventName);
  return row ? parseInt(row.metricValues[0].value) : 0;
}

function pct(curr, prev) {
  if (!prev) return curr > 0 ? '+100%' : '—';
  const diff = Math.round(((curr - prev) / prev) * 100);
  return (diff >= 0 ? '+' : '') + diff + '%';
}

function topN(rows, n = 5) {
  return rows
    .sort((a,b) => parseInt(b.metricValues[0].value) - parseInt(a.metricValues[0].value))
    .slice(0, n)
    .map(r => ({ name: r.dimensionValues[0].value, value: parseInt(r.metricValues[0].value) }));
}

// ── שלב 1: מדדים בסיסיים ──
async function fetchBasicMetrics(dateRange) {
  const { data } = await ga.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: {
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [dateRange],
      metrics: [
        { name: 'sessions' },
        { name: 'totalUsers' },
        { name: 'newUsers' },
      ],
    }
  });
  const row = data.rows?.[0];
  return {
    sessions:  parseInt(row?.metricValues[0].value || 0),
    users:     parseInt(row?.metricValues[1].value || 0),
    newUsers:  parseInt(row?.metricValues[2].value || 0),
  };
}

// ── שלב 2: אירועי המרה ──
async function fetchEvents(dateRange) {
  const { data } = await ga.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: {
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [dateRange],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      limit: 50,
    }
  });
  return data.rows || [];
}

// ── שלב 3: עמודי בלוג פופולריים ──
async function fetchBlogPages(dateRange) {
  const { data } = await ga.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: {
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [dateRange],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [{ name: 'screenPageViews' }],
      dimensionFilter: {
        filter: { fieldName: 'pagePath', stringFilter: { value: '/posts/', matchType: 'BEGINS_WITH' } },
      },
      limit: 10,
    }
  });
  return topN(data.rows || [], 5).map(r => r.name);
}

// ── שלב 4: מקורות תנועה ──
async function fetchSources(dateRange) {
  const { data } = await ga.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: {
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [dateRange],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }],
      limit: 10,
    }
  });
  return topN(data.rows || [], 5);
}

// ── ריצה ראשית ──
async function main() {
  const [basicCurr, basicPrev, eventsCurr, eventsPrev, blogPages, sources] = await Promise.all([
    fetchBasicMetrics({ startDate: curr.start, endDate: curr.end }),
    fetchBasicMetrics({ startDate: prev.start, endDate: prev.end }),
    fetchEvents({ startDate: curr.start, endDate: curr.end }),
    fetchEvents({ startDate: prev.start, endDate: prev.end }),
    fetchBlogPages({ startDate: curr.start, endDate: curr.end }),
    fetchSources({ startDate: curr.start, endDate: curr.end }),
  ]);

  // המרות
  const conv = {
    leads:         getVal(eventsCurr, 'lead_submitted'),
    leadsPrev:     getVal(eventsPrev, 'lead_submitted'),
    scannerLeads:  getVal(eventsCurr, 'scanner_lead_submitted'),
    scannerLeadsPrev: getVal(eventsPrev, 'scanner_lead_submitted'),
    whatsapp:      getVal(eventsCurr, 'whatsapp_click'),
    whatsappPrev:  getVal(eventsPrev, 'whatsapp_click'),
    phone:         getVal(eventsCurr, 'phone_click'),
    phonePrev:     getVal(eventsPrev, 'phone_click'),
    scannerStart:  getVal(eventsCurr, 'scanner_start'),
    scannerResults:getVal(eventsCurr, 'scanner_results'),
    scrollDeep:    getVal(eventsCurr, 'scroll_depth'),
    blogCta:       getVal(eventsCurr, 'blog_cta_click'),
    blogScanner:   getVal(eventsCurr, 'blog_scanner_click'),
  };

  const totalContacts = conv.leads + conv.scannerLeads + conv.whatsapp + conv.phone;
  const totalContactsPrev = conv.leadsPrev + conv.scannerLeadsPrev + conv.whatsappPrev + conv.phonePrev;
  const scannerConv = conv.scannerStart > 0 ? Math.round((conv.scannerLeads / conv.scannerStart) * 100) : 0;

  // בנה הודעת וואטסאפ טקסטואלית
  const topPostsText = blogPages.length
    ? blogPages.slice(0,3).map((p,i) => `  ${i+1}. ${p}`).join('\n')
    : '  אין נתונים';

  const sourcesText = sources.length
    ? sources.slice(0,3).map(s => `  ${s.name}: ${s.value}`).join('\n')
    : '  אין נתונים';

  const message = [
    `📊 *דוח חודשי Clix — ${monthLabel}*`,
    `📅 ${curr.start} – ${curr.end}`,
    '',
    `*👥 תנועה*`,
    `משתמשים: ${basicCurr.users} (${pct(basicCurr.users, basicPrev.users)})`,
    `סשנים: ${basicCurr.sessions} (${pct(basicCurr.sessions, basicPrev.sessions)})`,
    `חדשים: ${basicCurr.newUsers} (${pct(basicCurr.newUsers, basicPrev.newUsers)})`,
    '',
    `*🎯 המרות*`,
    `סה"כ פניות: ${totalContacts} (${pct(totalContacts, totalContactsPrev)})`,
    `לידים אתר: ${conv.leads} (${pct(conv.leads, conv.leadsPrev)})`,
    `לידים סורק: ${conv.scannerLeads} (${pct(conv.scannerLeads, conv.scannerLeadsPrev)})`,
    `וואטסאפ: ${conv.whatsapp} (${pct(conv.whatsapp, conv.whatsappPrev)})`,
    `טלפון: ${conv.phone} (${pct(conv.phone, conv.phonePrev)})`,
    '',
    `*🤖 סורק אוטומציות*`,
    `התחלות: ${conv.scannerStart} | השלמות: ${conv.scannerResults}`,
    `המרה לליד: ${scannerConv}%`,
    '',
    `*📝 בלוג*`,
    `קריאות מעמיקות: ${conv.scrollDeep}`,
    `קליקי CTA: ${conv.blogCta} | קליקי סורק: ${conv.blogScanner}`,
    `פוסטים מובילים:`,
    topPostsText,
    '',
    `*📣 מקורות תנועה*`,
    sourcesText,
  ].join('\n');

  const payload = { message };

  console.log('\n── תוצאות ──');
  console.log(`משתמשים:    ${basicCurr.users} (${pct(basicCurr.users, basicPrev.users)})`);
  console.log(`סה"כ פניות: ${totalContacts} (${pct(totalContacts, totalContactsPrev)})`);
  console.log(`לידים אתר:  ${conv.leads}`);
  console.log(`לידים סורק: ${conv.scannerLeads} | המרה: ${scannerConv}%`);
  console.log(`וואטסאפ:    ${conv.whatsapp} | טלפון: ${conv.phone}`);

  console.log('\n🚀 שולח ל-Make.com...');
  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (res.ok) {
    console.log('✅ נשלח בהצלחה!\n');
    writeFileSync(SENT_FILE, targetStr, 'utf8');
  } else {
    console.error('❌ שגיאה בשליחה:', res.status, await res.text());
  }
}

main().catch(err => {
  if (err.message?.includes('invalid_grant')) {
    console.error('\n❌ Token פג — הרץ: node analytics-auth.mjs');
  } else {
    console.error('\n❌', err.message);
  }
});
