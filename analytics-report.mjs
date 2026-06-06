import { google } from 'googleapis';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROPERTY_ID = '532994689';
const EXCLUDE_CITY = 'Hadera';

const clientFile = resolve(__dirname, 'oauth-client.json');
const tokenFile  = resolve(__dirname, 'ga-token.json');

const { client_id, client_secret } = JSON.parse(readFileSync(clientFile)).installed;
const tokens = JSON.parse(readFileSync(tokenFile));

const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
oauth2Client.setCredentials(tokens);

const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });

// ── טווח תאריכים (--month YYYY-MM לדוח חודש ספציפי, ברירת מחדל = מתחילת השנה) ──
const args = process.argv.slice(2);
let startDate, endDate, reportLabel;

if (args[0] === '--week') {
  const now = new Date();
  const d7  = new Date(now); d7.setDate(now.getDate() - 6);
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  startDate   = fmt(d7);
  endDate     = 'today';
  reportLabel = `שבוע ${fmt(d7)} → ${fmt(now)}`;
} else if (args[0] === '--days' && args[1]) {
  const n   = parseInt(args[1]);
  const now = new Date();
  const dN  = new Date(now); dN.setDate(now.getDate() - (n - 1));
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  startDate   = fmt(dN);
  endDate     = 'today';
  reportLabel = `${n}-ימים-${fmt(dN)}-${fmt(now)}`;
} else if (args[0] === '--month' && args[1]) {
  const [year, month] = args[1].split('-');
  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  startDate   = `${year}-${month}-01`;
  endDate     = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
  reportLabel = args[1];
} else {
  startDate   = '2026-01-01';
  endDate     = 'today';
  const now   = new Date();
  reportLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── עזרים ─────────────────────────────────────────────────────────────────────
const fmtTime    = s => s < 60 ? `${s}ש'` : `${Math.floor(s / 60)}ד' ${s % 60}ש'`;
const deviceIcon = d => ({ desktop: '🖥️', mobile: '📱', tablet: '📟' }[d] || d);

const excludeHaderaFilter = {
  notExpression: {
    filter: {
      fieldName: 'city',
      stringFilter: { matchType: 'EXACT', value: EXCLUDE_CITY },
    },
  },
};

// ── שאילתה 1: כלל האתר ───────────────────────────────────────────────────────
async function getSiteWideReport() {
  const [overviewRes, locationRes] = await Promise.all([
    analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dimensions: [{ name: 'deviceCategory' }, { name: 'newVsReturning' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'userEngagementDuration' },
          { name: 'engagementRate' },
          { name: 'newUsers' },
          { name: 'sessions' },
        ],
        dimensionFilter: excludeHaderaFilter,
        dateRanges: [{ startDate, endDate }],
      },
    }),
    analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dimensions: [{ name: 'city' }, { name: 'country' }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: excludeHaderaFilter,
        dateRanges: [{ startDate, endDate }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 20,
      },
    }),
  ]);

  let totalViews = 0, totalUsers = 0, totalNewUsers = 0, totalSessions = 0;
  let totalEngageDuration = 0, engWeightedSum = 0;
  let desktop = 0, mobile = 0, tablet = 0;
  let desktopUsers = 0, mobileUsers = 0, tabletUsers = 0;

  for (const row of overviewRes.data.rows || []) {
    const [device] = row.dimensionValues.map(d => d.value);
    const [views, users, engageDuration, engRate, newUsers, sessions] =
      row.metricValues.map(m => parseFloat(m.value));

    totalViews          += views;
    totalUsers          += users;
    totalNewUsers       += newUsers;
    totalSessions       += sessions;
    totalEngageDuration += engageDuration;
    engWeightedSum      += engRate * sessions;

    if (device === 'desktop')     { desktop += views; desktopUsers += users; }
    else if (device === 'mobile') { mobile  += views; mobileUsers  += users; }
    else if (device === 'tablet') { tablet  += views; tabletUsers  += users; }
  }

  const locations = {};
  for (const row of locationRes.data.rows || []) {
    const [city, country] = row.dimensionValues.map(d => d.value);
    const [views]         = row.metricValues.map(m => parseFloat(m.value));
    const loc = city !== '(not set)' ? `${city}, ${country}` : country;
    locations[loc] = (locations[loc] || 0) + Math.round(views);
  }

  return {
    totalViews:     Math.round(totalViews),
    totalUsers:     Math.round(totalUsers),
    totalNewUsers:  Math.round(totalNewUsers),
    returningUsers: Math.round(totalUsers - totalNewUsers),
    totalSessions:  Math.round(totalSessions),
    avgDuration:    totalUsers > 0 ? Math.round(totalEngageDuration / totalUsers) : 0,
    engagementRate: totalSessions > 0 ? engWeightedSum / totalSessions : 0,
    desktop:        Math.round(desktop),
    mobile:         Math.round(mobile),
    tablet:         Math.round(tablet),
    desktopUsers:   Math.round(desktopUsers),
    mobileUsers:    Math.round(mobileUsers),
    tabletUsers:    Math.round(tabletUsers),
    locations,
  };
}

// ── שאילתה 2: מקורות תנועה ───────────────────────────────────────────────────
async function getTrafficSources() {
  const res = await analyticsData.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: {
      dimensions: [{ name: 'sessionDefaultChannelGrouping' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'engagementRate' },
      ],
      dimensionFilter: excludeHaderaFilter,
      dateRanges: [{ startDate, endDate }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    },
  });

  const channelNames = {
    'Organic Search': 'חיפוש אורגני (גוגל)',
    'Direct':         'ישיר (Direct)',
    'Organic Social': 'רשתות חברתיות',
    'Referral':       'הפניה מאתר',
    'Email':          'אימייל',
    'Paid Search':    'פרסום ממומן',
    'Unassigned':     'לא מסווג',
  };

  return (res.data.rows || []).map(row => {
    const [channel]                             = row.dimensionValues.map(d => d.value);
    const [sessions, users, views, engRate] = row.metricValues.map(m => parseFloat(m.value));
    return {
      channel:       channelNames[channel] || channel,
      sessions:      Math.round(sessions),
      users:         Math.round(users),
      views:         Math.round(views),
      engagementRate: engRate,
    };
  });
}

// ── שאילתה 3: מאמרים ─────────────────────────────────────────────────────────
async function getArticlesReport() {
  const res = await analyticsData.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: {
      dimensions: [
        { name: 'pagePath' },
        { name: 'date' },
        { name: 'hour' },
        { name: 'country' },
        { name: 'city' },
        { name: 'deviceCategory' },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'userEngagementDuration' },
        { name: 'engagementRate' },
        { name: 'newUsers' },
      ],
      dimensionFilter: {
        andGroup: {
          expressions: [
            {
              filter: {
                fieldName: 'pagePath',
                stringFilter: { matchType: 'CONTAINS', value: '/posts/' },
              },
            },
            excludeHaderaFilter,
          ],
        },
      },
      dateRanges: [{ startDate, endDate }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    },
  });

  const articles = {};
  for (const row of res.data.rows || []) {
    const [path, date, hour, country, city, device] = row.dimensionValues.map(d => d.value);
    const [views, users, engageDuration, engRate, newUsers] =
      row.metricValues.map(m => parseFloat(m.value));

    const slug = path.replace('/posts/', '').replace('.html', '');
    if (!articles[slug]) {
      articles[slug] = {
        totalViews: 0, totalUsers: 0, totalNewUsers: 0,
        desktop: 0, mobile: 0, tablet: 0,
        totalEngageDuration: 0, engWeightedSum: 0, engWeightedCount: 0,
        sessions: [], locations: {},
      };
    }

    const a = articles[slug];
    a.totalViews          += views;
    a.totalUsers          += users;
    a.totalNewUsers       += newUsers;
    a.totalEngageDuration += engageDuration;
    a.engWeightedSum      += engRate * users;
    a.engWeightedCount    += users;

    if (device === 'desktop')     a.desktop += Math.round(views);
    else if (device === 'mobile') a.mobile  += Math.round(views);
    else if (device === 'tablet') a.tablet  += Math.round(views);

    const loc = city !== '(not set)' ? `${city}, ${country}` : country;
    a.locations[loc] = (a.locations[loc] || 0) + Math.round(views);

    if (users > 0) {
      a.sessions.push({
        date, hour: hour.padStart(2, '0'), loc, device,
        duration: Math.round(engageDuration / users),
        views:    Math.round(views),
      });
    }
  }

  for (const a of Object.values(articles)) {
    a.totalViews     = Math.round(a.totalViews);
    a.totalUsers     = Math.round(a.totalUsers);
    a.totalNewUsers  = Math.round(a.totalNewUsers);
    a.avgDuration    = a.totalUsers > 0 ? Math.round(a.totalEngageDuration / a.totalUsers) : 0;
    a.engagementRate = a.engWeightedCount > 0 ? a.engWeightedSum / a.engWeightedCount : 0;
  }

  return articles;
}

// ── שאילתה 4: סורק אוטומציות ─────────────────────────────────────────────────
async function getScannerReport() {
  const [pageRes, eventsRes] = await Promise.all([
    analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dimensions: [{ name: 'deviceCategory' }],
        metrics: [
          { name: 'screenPageViews' },
          { name: 'activeUsers' },
          { name: 'userEngagementDuration' },
          { name: 'engagementRate' },
          { name: 'sessions' },
        ],
        dimensionFilter: {
          andGroup: {
            expressions: [
              { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'CONTAINS', value: 'scanner' } } },
              excludeHaderaFilter,
            ],
          },
        },
        dateRanges: [{ startDate, endDate }],
      },
    }),
    analyticsData.properties.runReport({
      property: `properties/${PROPERTY_ID}`,
      requestBody: {
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: {
          andGroup: {
            expressions: [
              { filter: { fieldName: 'eventName', stringFilter: { matchType: 'BEGINS_WITH', value: 'scanner_' } } },
              excludeHaderaFilter,
            ],
          },
        },
        dateRanges: [{ startDate, endDate }],
      },
    }),
  ]);

  let totalViews = 0, totalUsers = 0, totalSessions = 0, totalEngDuration = 0;
  let engWeighted = 0, desktop = 0, mobile = 0, tablet = 0;
  for (const row of pageRes.data.rows || []) {
    const [device] = row.dimensionValues.map(d => d.value);
    const [views, users, engDur, engRate, sessions] = row.metricValues.map(m => parseFloat(m.value));
    totalViews       += views;
    totalUsers       += users;
    totalSessions    += sessions;
    totalEngDuration += engDur;
    engWeighted      += engRate * sessions;
    if (device === 'desktop')     desktop += Math.round(views);
    else if (device === 'mobile') mobile  += Math.round(views);
    else if (device === 'tablet') tablet  += Math.round(views);
  }

  const events = {};
  for (const row of eventsRes.data.rows || []) {
    const [name]  = row.dimensionValues.map(d => d.value);
    const [count] = row.metricValues.map(m => parseFloat(m.value));
    events[name] = Math.round(count);
  }

  return {
    page: {
      views:       Math.round(totalViews),
      users:       Math.round(totalUsers),
      sessions:    Math.round(totalSessions),
      avgDuration: totalUsers > 0 ? Math.round(totalEngDuration / totalUsers) : 0,
      engRate:     totalSessions > 0 ? engWeighted / totalSessions : 0,
      desktop, mobile, tablet,
    },
    events,
  };
}

// ── בניית הדוח לטקסט ─────────────────────────────────────────────────────────
function buildReport(site, sources, articles, scanner) {
  const lines = [];
  const today = new Date().toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });

  lines.push(`📊 דוח ביקורים — ${today}  (ללא ביקורים מ-${EXCLUDE_CITY})`);
  lines.push('='.repeat(72));

  // ── כלל האתר ──
  lines.push('\n🌐 כלל האתר');
  lines.push('─'.repeat(72));
  const newPct = site.totalUsers > 0 ? Math.round(site.totalNewUsers  / site.totalUsers * 100) : 0;
  const retPct = site.totalUsers > 0 ? Math.round(site.returningUsers / site.totalUsers * 100) : 0;
  lines.push(`צפיות סה"כ:            ${site.totalViews}`);
  lines.push(`משתמשים ייחודיים:      ${site.totalUsers}`);
  lines.push(`  ↳ חדשים:             ${site.totalNewUsers} (${newPct}%)`);
  lines.push(`  ↳ חוזרים:            ${site.returningUsers} (${retPct}%)`);
  lines.push(`ביקורים (sessions):    ${site.totalSessions}`);
  lines.push(`זמן שהייה ממוצע:       ${fmtTime(site.avgDuration)}`);
  lines.push(`שיעור מעורבות:         ${Math.round(site.engagementRate * 100)}%`);
  lines.push(`מכשירים (צפיות):       🖥️ ${site.desktop}  📱 ${site.mobile}  📟 ${site.tablet}`);
  lines.push(`מכשירים (משתמשים):     🖥️ ${site.desktopUsers}  📱 ${site.mobileUsers}  📟 ${site.tabletUsers}`);

  const topLocs = Object.entries(site.locations)
    .sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([l, v]) => `${l.replace(', Israel', '')} (${v})`).join(' · ');
  lines.push(`מיקומים מובילים:       ${topLocs}`);

  // ── מקורות תנועה ──
  lines.push('\n\n📡 מקורות תנועה');
  lines.push('─'.repeat(72));
  lines.push(
    `${'מקור'.padEnd(30)}${'sessions'.padStart(10)}  ${'משתמשים'.padStart(10)}  ${'מעורבות'.padStart(9)}`
  );
  lines.push('─'.repeat(65));
  for (const s of sources) {
    lines.push(
      `${s.channel.padEnd(30)}${String(s.sessions).padStart(10)}  ${String(s.users).padStart(10)}  ${(Math.round(s.engagementRate * 100) + '%').padStart(9)}`
    );
  }

  // ── טבלת מאמרים ──
  lines.push('\n\n📰 מאמרים');
  lines.push('─'.repeat(72));
  const cW = [34, 7, 9, 6, 6, 10, 8];
  lines.push(
    `${'מאמר'.padEnd(cW[0])}` +
    `${'צפיות'.padStart(cW[1])}  ` +
    `${'משתמשים'.padStart(cW[2])}  ` +
    `${'🖥️'.padStart(cW[3])}  ` +
    `${'📱'.padStart(cW[4])}  ` +
    `${'זמן ממוצע'.padStart(cW[5])}  ` +
    `${'מעורבות'.padStart(cW[6])}`
  );
  lines.push('─'.repeat(100));

  let totViews = 0, totUsers = 0, totDesktop = 0, totMobile = 0;

  for (const [slug, d] of Object.entries(articles)) {
    lines.push(
      `${slug.slice(0, cW[0] - 1).padEnd(cW[0])}` +
      `${String(d.totalViews).padStart(cW[1])}  ` +
      `${String(d.totalUsers).padStart(cW[2])}  ` +
      `${String(d.desktop).padStart(cW[3])}  ` +
      `${String(d.mobile).padStart(cW[4])}  ` +
      `${fmtTime(d.avgDuration).padStart(cW[5])}  ` +
      `${(Math.round(d.engagementRate * 100) + '%').padStart(cW[6])}`
    );
    totViews   += d.totalViews;
    totUsers   += d.totalUsers;
    totDesktop += d.desktop;
    totMobile  += d.mobile;
  }

  lines.push('─'.repeat(100));
  lines.push(
    `${'סה"כ מאמרים'.padEnd(cW[0])}` +
    `${String(totViews).padStart(cW[1])}  ` +
    `${String(totUsers).padStart(cW[2])}  ` +
    `${String(totDesktop).padStart(cW[3])}  ` +
    `${String(totMobile).padStart(cW[4])}`
  );

  // ── פירוט לפי מאמר ──
  lines.push('\n\n' + '='.repeat(72));
  lines.push('פירוט ביקורים לפי מאמר:');

  for (const [slug, d] of Object.entries(articles)) {
    lines.push(`\n📄 ${slug}`);
    lines.push(
      `   צפיות: ${d.totalViews}  |  משתמשים: ${d.totalUsers}  |  חדשים: ${d.totalNewUsers}  |  🖥️ ${d.desktop}  📱 ${d.mobile}`
    );
    lines.push(`   זמן שהייה ממוצע: ${fmtTime(d.avgDuration)}  |  שיעור מעורבות: ${Math.round(d.engagementRate * 100)}%`);

    const topLocations = Object.entries(d.locations).sort((a, b) => b[1] - a[1]);
    lines.push(`   מיקומים: ${topLocations.map(([l, v]) => `${l.replace(', Israel', '')} (${v})`).join(' | ')}`);

    const sessions = d.sessions.sort((a, b) =>
      `${b.date}${b.hour}`.localeCompare(`${a.date}${a.hour}`)
    );

    if (sessions.length > 0) {
      lines.push(`\n   ${'תאריך'.padEnd(12)}${'שעה'.padEnd(7)}${'מכשיר'.padEnd(8)}${'מיקום'.padEnd(28)}זמן שהייה`);
      lines.push(`   ${'─'.repeat(72)}`);
      sessions.slice(0, 15).forEach(s => {
        const dateStr = `${s.date.slice(0,4)}-${s.date.slice(4,6)}-${s.date.slice(6,8)}`;
        lines.push(
          `   ${dateStr.padEnd(12)}${(s.hour + ':00').padEnd(7)}${deviceIcon(s.device).padEnd(8)}${s.loc.replace(', Israel','').padEnd(28)}${fmtTime(s.duration)}`
        );
      });
    }
  }

  // ── סורק אוטומציות ──
  if (scanner) {
    const p = scanner.page;
    const e = scanner.events;
    lines.push('\n\n🔍 סורק אוטומציות (scanner.html)');
    lines.push('─'.repeat(72));
    lines.push(`צפיות:          ${p.views}`);
    lines.push(`משתמשים:        ${p.users}`);
    lines.push(`ביקורים:        ${p.sessions}`);
    lines.push(`זמן ממוצע:      ${fmtTime(p.avgDuration)}`);
    lines.push(`מעורבות:        ${Math.round(p.engRate * 100)}%`);
    lines.push(`מכשירים:        🖥️ ${p.desktop}  📱 ${p.mobile}  📟 ${p.tablet}`);

    lines.push('\n📊 פאנל המרה:');
    const funnel = [
      ['scanner_start',            'כניסה לסורק'],
      ['scanner_tools',            'בחר כלים'],
      ['scanner_pain',             'בחר אתגר'],
      ['scanner_results',          'ראה תוצאות'],
      ['scanner_lead_form_opened', 'פתח טופס'],
      ['scanner_lead_submitted',   'שלח ליד'],
    ];
    const base = e['scanner_start'] || 1;
    for (const [eventName, label] of funnel) {
      const count = e[eventName] || 0;
      const pct   = Math.round(count / base * 100);
      const bar   = '█'.repeat(Math.round(pct / 5)).padEnd(20);
      lines.push(`  ${label.padEnd(22)} ${String(count).padStart(5)}  ${bar} ${pct}%`);
    }

    const toolClicks = e['scanner_tool_toggle'] || 0;
    if (toolClicks > 0) {
      lines.push(`\nסה"כ לחיצות על כלים:  ${toolClicks}`);
    }
  }

  return lines.join('\n');
}

// ── ריצה ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`⏳ שולף נתונים מ-GA4 (${startDate} → ${endDate})...`);

  const [site, sources, articles, scanner] = await Promise.all([
    getSiteWideReport(),
    getTrafficSources(),
    getArticlesReport(),
    getScannerReport(),
  ]);

  if (site.totalViews === 0 && Object.keys(articles).length === 0) {
    console.log('\n⚠️  אין נתונים עדיין.');
    return;
  }

  const report = buildReport(site, sources, articles, scanner);
  console.log('\n' + report);

  // שמירה לקובץ
  const reportsDir = resolve(__dirname, 'reports');
  if (!existsSync(reportsDir)) mkdirSync(reportsDir);
  const outFile = resolve(reportsDir, `${reportLabel}.txt`);
  writeFileSync(outFile, report, 'utf8');
  console.log(`\n💾 הדוח נשמר: reports/${reportLabel}.txt`);
}

main().catch(console.error);
