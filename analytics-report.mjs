/**
 * analytics-report.mjs
 * דוח ביקורים לכל מאמר מ-Google Analytics 4
 * הרצה: node analytics-report.mjs
 * נדרש: GOOGLE_APPLICATION_CREDENTIALS=./ga-credentials.json
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';

const PROPERTY_ID = process.env.GA_PROPERTY_ID || '532994689';

const client = new BetaAnalyticsDataClient();

async function getReport() {
  const [response] = await client.runReport({
    property: `properties/${PROPERTY_ID}`,
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
        stringFilter: {
          matchType: 'CONTAINS',
          value: '/posts/',
        },
      },
    },
    dateRanges: [{ startDate: '2026-01-01', endDate: 'today' }],
    orderBys: [
      { metric: { metricName: 'screenPageViews' }, desc: true },
    ],
  });

  // קיבוץ לפי מאמר
  const articles = {};
  for (const row of response.rows || []) {
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

  // הדפסת דוח
  console.log('\n📊 דוח ביקורים לפי מאמר\n' + '='.repeat(50));
  for (const [slug, data] of Object.entries(articles)) {
    console.log(`\n📄 ${slug}`);
    console.log(`   צפיות כוללות: ${data.totalViews} | משתמשים ייחודיים: ${data.totalUsers}`);

    const topDates = Object.entries(data.byDate)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    console.log(`   תאריכים פעילים:`);
    topDates.forEach(([d, v]) => console.log(`     ${d}: ${v} צפיות`));

    const topLocations = Object.entries(data.locations)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    console.log(`   מיקומים:`);
    topLocations.forEach(([loc, v]) => console.log(`     ${loc}: ${v} צפיות`));
  }

  return articles;
}

getReport().catch(console.error);
