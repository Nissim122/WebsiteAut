/**
 * analytics-setup.mjs — מגדיר Key events ו-Data retention ב-GA4 אוטומטית
 * node analytics-setup.mjs
 */
import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientFile = resolve(__dirname, 'oauth-client.json');
const tokenFile  = resolve(__dirname, 'ga-token.json');

const PROPERTY_ID = '532994689';

const { client_id, client_secret } = JSON.parse(readFileSync(clientFile)).installed;
const tokens = JSON.parse(readFileSync(tokenFile));

const auth = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:4242');
auth.setCredentials(tokens);

const admin = google.analyticsadmin({ version: 'v1alpha', auth });

const KEY_EVENTS = [
  { eventName: 'lead_submitted',         countingMethod: 'ONCE_PER_SESSION' },
  { eventName: 'scanner_lead_submitted', countingMethod: 'ONCE_PER_SESSION' },
  { eventName: 'whatsapp_click',         countingMethod: 'ONCE_PER_SESSION' },
  { eventName: 'phone_click',            countingMethod: 'ONCE_PER_SESSION' },
];

async function run() {
  console.log('\n📊 מגדיר GA4 עבור Property:', PROPERTY_ID);

  // 1. קבל key events קיימים
  const existing = await admin.properties.keyEvents.list({
    parent: `properties/${PROPERTY_ID}`,
  });
  const existingNames = (existing.data.keyEvents || []).map(e => e.eventName);
  console.log('\n✅ Key events קיימים:', existingNames.join(', ') || 'אין');

  // 2. צור key events חסרים
  for (const ke of KEY_EVENTS) {
    if (existingNames.includes(ke.eventName)) {
      console.log(`   ⏭  ${ke.eventName} — כבר קיים`);
      continue;
    }
    try {
      await admin.properties.keyEvents.create({
        parent: `properties/${PROPERTY_ID}`,
        requestBody: {
          eventName: ke.eventName,
          countingMethod: ke.countingMethod,
        },
      });
      console.log(`   ✅ ${ke.eventName} — נוסף`);
    } catch (err) {
      console.log(`   ❌ ${ke.eventName} — שגיאה: ${err.message}`);
    }
  }

  // 3. עדכן Data Retention ל-14 חודשים
  try {
    await admin.properties.updateDataRetentionSettings({
      name: `properties/${PROPERTY_ID}/dataRetentionSettings`,
      updateMask: 'eventDataRetention',
      requestBody: {
        eventDataRetention: 'FOURTEEN_MONTHS',
      },
    });
    console.log('\n✅ Data retention עודכן ל-14 חודשים');
  } catch (err) {
    console.log('\n❌ Data retention שגיאה:', err.message);
  }

  console.log('\n🎉 הגדרה הושלמה!\n');
}

run().catch(err => {
  if (err.message?.includes('invalid_grant') || err.message?.includes('Token')) {
    console.error('\n❌ Token פג תוקף — הרץ: node analytics-auth.mjs');
  } else {
    console.error('\n❌ שגיאה:', err.message);
  }
});
