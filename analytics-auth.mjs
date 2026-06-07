/**
 * analytics-auth.mjs — הרצה חד-פעמית לקבלת גישה ל-GA4
 * node analytics-auth.mjs
 */
import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { createServer } from 'http';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientFile = resolve(__dirname, 'oauth-client.json');
const tokenFile = resolve(__dirname, 'ga-token.json');

const { client_id, client_secret, redirect_uris } = JSON.parse(readFileSync(clientFile)).installed;

const oauth2Client = new google.auth.OAuth2(client_id, client_secret, 'http://localhost:4242');

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/analytics.edit',
  ],
  prompt: 'consent',
});

console.log('\n🔗 פתח את הקישור הבא בדפדפן:\n');
console.log(authUrl);
console.log('\nממתין לאימות...\n');

const server = createServer(async (req, res) => {
  const code = new URL(req.url, 'http://localhost:4242').searchParams.get('code');
  if (!code) return;

  res.end('<h2 style="font-family:sans-serif;text-align:center;margin-top:80px">✅ אימות הצליח! אפשר לסגור את החלון.</h2>');
  server.close();

  const { tokens } = await oauth2Client.getToken(code);
  writeFileSync(tokenFile, JSON.stringify(tokens, null, 2));
  console.log('✅ Token נשמר ב-ga-token.json');
  console.log('   עכשיו הרץ: node analytics-report.mjs');
}).listen(4242);
