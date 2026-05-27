import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROPERTY_ID = '532994689';

const clientFile = resolve(__dirname, 'oauth-client.json');
const tokenFile = resolve(__dirname, 'ga-token.json');

const { client_id, client_secret } = JSON.parse(readFileSync(clientFile)).installed;
const tokens = JSON.parse(readFileSync(tokenFile));

const oauth2Client = new google.auth.OAuth2(client_id, client_secret);
oauth2Client.setCredentials(tokens);

const analyticsData = google.analyticsdata({ version: 'v1beta', auth: oauth2Client });

async function getReport() {
  const res = await analyticsData.properties.runReport({
    property: `properties/${PROPERTY_ID}`,
    requestBody: {
      dimensions: [
        { name: 'pagePath' },
        { name: 'date' },
        { name: 'country' },
        { name: 'city' },
      ],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
      ],
      dimensionFilter: {
        filter: {
          fieldName: 'pagePath',
          stringFilter: { matchType: 'CONTAINS', value: '/posts/' },
        },
      },
      dateRanges: [{ startDate: '2026-01-01', endDate: 'today' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    },
  });

  const articles = {};
  for (const row of res.data.rows || []) {
    const [path, date, country, city] = row.dimensionValues.map(d => d.value);
    const [views, users] = row.metricValues.map(m => parseInt(m.value));

    const slug = path.replace('/posts/', '').replace('.html', '');
    if (!articles[slug]) articles[slug] = { totalViews: 0, totalUsers: 0, byDate: {}, locations: {} };

    articles[slug].totalViews += views;
    articles[slug].totalUsers += users;
    articles[slug].byDate[date] = (articles[slug].byDate[date] || 0) + views;

    const loc = city !== '(not set)' ? `${city}, ${country}` : country;
    articles[slug].locations[loc] = (articles[slug].locations[loc] || 0) + views;
  }

  console.log('\n📊 דוח ביקורים לפי מאמר\n' + '='.repeat(50));

  if (Object.keys(articles).length === 0) {
    console.log('\n⚠️  אין נתונים עדיין — GA4 צובר נתונים מהיום שהוגדר.');
    return;
  }

  for (const [slug, data] of Object.entries(articles)) {
    console.log(`\n📄 ${slug}`);
    console.log(`   צפיות: ${data.totalViews} | משתמשים ייחודיים: ${data.totalUsers}`);

    const topDates = Object.entries(data.byDate).sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(`   תאריכים פעילים:`);
    topDates.forEach(([d, v]) => console.log(`     ${d}: ${v} צפיות`));

    const topLocations = Object.entries(data.locations).sort((a, b) => b[1] - a[1]).slice(0, 5);
    console.log(`   מיקומים:`);
    topLocations.forEach(([loc, v]) => console.log(`     ${loc}: ${v} צפיות`));
  }
}

getReport().catch(console.error);
