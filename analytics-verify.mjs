/**
 * analytics-verify.mjs — בדיקת תקינות הגדרות GA4
 * node analytics-verify.mjs
 */
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientFile = resolve(__dirname, 'oauth-client.json');
const tokenFile  = resolve(__dirname, 'ga-token.json');

const PROPERTY_ID = '532994689';
const EXPECTED_MEASUREMENT_ID = 'G-SJT8YRED9B';

const EXPECTED_KEY_EVENTS = [
  'lead_submitted',
  'scanner_lead_submitted',
  'whatsapp_click',
  'phone_click',
  'scroll_depth',
  'section_view',
];

const { client_id, client_secret } = JSON.parse(readFileSync(clientFile)).installed;
const tokens = JSON.parse(readFileSync(tokenFile));

const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:4242');
auth.setCredentials(tokens);

const admin = google.analyticsadmin({ version: 'v1alpha', auth });

function ok(msg)   { console.log('  ✅', msg); }
function fail(msg) { console.log('  ❌', msg); }
function warn(msg) { console.log('  ⚠️ ', msg); }
function section(title) { console.log(`\n── ${title} ──`); }

async function run() {
  console.log(`\n📊 בדיקת GA4 — Property ${PROPERTY_ID}\n`);

  // 1. Key Events
  section('Key Events');
  const { data: keData } = await admin.properties.keyEvents.list({
    parent: `properties/${PROPERTY_ID}`,
  });
  const keyEvents = keData.keyEvents || [];
  const keyEventNames = keyEvents.map(e => e.eventName);

  for (const name of EXPECTED_KEY_EVENTS) {
    if (keyEventNames.includes(name)) ok(name);
    else fail(`${name} — חסר!`);
  }

  const extra = keyEventNames.filter(n => !EXPECTED_KEY_EVENTS.includes(n));
  if (extra.length) warn(`אירועים נוספים שלא ברשימה: ${extra.join(', ')}`);

  // 2. Data Retention
  section('Data Retention');
  const { data: retention } = await admin.properties.getDataRetentionSettings({
    name: `properties/${PROPERTY_ID}/dataRetentionSettings`,
  });
  const ret = retention.eventDataRetention;
  if (ret === 'FOURTEEN_MONTHS') ok(`Data retention: 14 חודשים`);
  else fail(`Data retention: ${ret} (צריך FOURTEEN_MONTHS)`);

  // 3. Data Streams
  section('Data Streams');
  const { data: streamsData } = await admin.properties.dataStreams.list({
    parent: `properties/${PROPERTY_ID}`,
  });
  const streams = streamsData.dataStreams || [];
  if (!streams.length) {
    fail('לא נמצאו Data Streams!');
  } else {
    for (const s of streams) {
      const mid = s.webStreamData?.measurementId;
      if (mid === EXPECTED_MEASUREMENT_ID) ok(`Stream: "${s.displayName}" — Measurement ID: ${mid} ✓`);
      else warn(`Stream: "${s.displayName}" — Measurement ID: ${mid || 'לא ידוע'}`);
    }
  }

  // 4. Property Details
  section('Property');
  const { data: prop } = await admin.properties.get({
    name: `properties/${PROPERTY_ID}`,
  });
  ok(`שם: ${prop.displayName}`);
  ok(`TimeZone: ${prop.timeZone}`);
  ok(`Currency: ${prop.currencyCode}`);

  console.log('\n── סיכום ──');
  console.log('בדיקה הושלמה.\n');
}

run().catch(err => {
  if (err.message?.includes('invalid_grant')) {
    console.error('\n❌ Token פג תוקף — הרץ: node analytics-auth.mjs');
  } else {
    console.error('\n❌ שגיאה:', err.message);
  }
});
