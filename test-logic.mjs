// ─────────────────────────────────────────────────────────────
//  scanner.html — pre-commit logic test suite
//  Run:  node test-logic.mjs
//  Must show 0 failures before every git push
// ─────────────────────────────────────────────────────────────
import puppeteer from 'puppeteer';

const br = await puppeteer.launch({
  headless: true,
  executablePath: 'C:/Users/nisim/.cache/puppeteer/chrome/win64-146.0.7680.153/chrome-win64/chrome.exe',
  args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu'],
});
const pg = await br.newPage();
pg.on('pageerror', err => console.error('PAGE ERROR:', err.message));
await pg.goto('http://localhost:3000/scanner.html', { waitUntil: 'networkidle2', timeout: 30000 });
await new Promise(r => setTimeout(r, 1000));

// ── helpers ───────────────────────────────────────────────────
async function topFlow(intent, tools, pain) {
  return pg.evaluate((intent, tools, pain) => {
    if (typeof buildContext !== 'function') return { error: 'buildContext missing' };
    const ctx = buildContext(intent, tools, pain);
    const top    = ctx.flows[0]?.id ?? 'none';
    const second = ctx.flows[1]?.id ?? 'none';
    const readiness = ctx.score;
    // Full score breakdown — mirrors scoring in buildContext exactly
    const allScores = FLOWS.map(f => {
      let s = flowRelevance(f.id, tools);
      if (pain === 'followup'   && f.id === 'followup')  s += 20;
      if (pain === 'service'    && f.id === 'triage')    s += 20;
      if (pain === 'scheduling' && f.id === 'schedule')  s += 20;
      if (pain === 'reports'    && f.id === 'report')    s += 20;
      if (pain === 'tasks'      && f.id === 'crm')       s += 20;
      if (pain === 'tasks'      && f.id === 'triage')    s += 15;
      if (pain === 'invoices'   && f.id === 'crm')       s += 20;
      if (pain === 'invoices'   && f.id === 'report')    s += 15;
      if (pain === 'marketing'  && ['ig-lead','wa-lead'].includes(f.id)) s += 18;
      if (pain === 'leads'      && ['wa-lead','ig-lead','form-lead'].includes(f.id)) s += 18;
      if (pain === 'sales'      && ['wa-lead','ig-lead','followup','crm'].includes(f.id)) s += 12;
      if (['leads','sales'].includes(intent) && ['wa-lead','form-lead','ig-lead','followup'].includes(f.id)) s += 5;
      if (intent === 'service'  && f.id === 'triage')    s += 5;
      if (intent === 'time'     && f.id === 'schedule')  s += 5;
      return [f.id, s];
    }).sort((a, b) => b[1] - a[1]);
    return { top, second, readiness, allScores };
  }, intent, tools, pain);
}

async function toolLabel(fn, tools) {
  return pg.evaluate((fn, tools) => {
    const f = { bestCRM, bestMessaging, bestEmail, bestTask, bestData, bestNotif, bestLeadSource, bestScheduling }[fn];
    if (!f) return { error: `${fn} not found` };
    return { label: f(tools) };
  }, fn, tools);
}

// ── runner ────────────────────────────────────────────────────
const PASS = '✅', FAIL = '❌';
let passed = 0, failed = 0;
const failures = [];

async function check(label, got, expected) {
  const ok = got === expected;
  if (ok) {
    passed++;
    console.log(`${PASS} ${label}`);
  } else {
    failed++;
    console.log(`${FAIL} ${label}`);
    console.log(`      GOT="${got}"  EXPECTED="${expected}"`);
    failures.push({ label, got, expected });
  }
}

async function runFlow(label, intent, tools, pain, expectTop) {
  const r = await topFlow(intent, tools, pain);
  if (r.error) { failed++; console.log(`${FAIL} ${label} — ${r.error}`); return; }
  const ok = r.top === expectTop;
  const topPts = (r.allScores.find(([id]) => id === r.top) ?? [,0])[1];
  const secPts = (r.allScores.find(([id]) => id === r.second) ?? [,0])[1];
  if (ok) {
    passed++;
    console.log(`${PASS} [${pain}] ${label}`);
    console.log(`      top=${r.top}(${topPts}p) 2nd=${r.second}(${secPts}p) readiness=${r.readiness}%`);
  } else {
    failed++;
    const expPts = (r.allScores.find(([id]) => id === expectTop) ?? [,0])[1];
    console.log(`${FAIL} [${pain}] ${label}`);
    console.log(`      GOT=${r.top}(${topPts}p)  WANT=${expectTop}(${expPts}p)  delta=${topPts-expPts}`);
    console.log(`      ${r.allScores.map(([id,s]) => `${id}:${s}`).join(' | ')}`);
    failures.push({ label, pain, tools, intent, got: r.top, expected: expectTop });
  }
}

// ═════════════════════════════════════════════════════════════
console.log('\n════════════════════════════════════════════════════════════════');
console.log(' scanner.html — pre-commit logic test suite');
console.log('════════════════════════════════════════════════════════════════\n');

// ── 1. REGRESSION — critical past-bug guards ──────────────────
console.log('── 1. REGRESSION ─────────────────────────────────────────────');
// crm was outscoring wa-lead when user had CRM+task tools but no messaging
await runFlow('HubSpot+Monday+Gmail → wa-lead (not crm)', 'leads', ['hubspot','monday','gmail'], 'leads', 'wa-lead');
// LinkedIn was triggering ig-lead (DM-only) — now LinkedIn alone only gets weak social bonus
await runFlow('LinkedIn+HubSpot+Gmail → form-lead (not ig-lead)', 'leads', ['linkedin','hubspot','gmail'], 'leads', 'form-lead');
// tasks+messaging was sending to crm instead of triage
await runFlow('WA+TG+Gmail+tasks → triage (not crm)', 'service', ['whatsapp','telegram','gmail'], 'tasks', 'triage');
// ig-lead was missing from sales bonus — IG users in sales context were getting followup
await runFlow('IG+HubSpot+sales → ig-lead (not followup)', 'sales', ['instagram','hubspot'], 'sales', 'ig-lead');

// ── 2. LEADS ──────────────────────────────────────────────────
console.log('\n── 2. LEADS ───────────────────────────────────────────────────');
await runFlow('WA+HubSpot → wa-lead',                      'leads', ['whatsapp','hubspot'], 'leads', 'wa-lead');
await runFlow('WA+TG+HubSpot → wa-lead',                   'leads', ['whatsapp','telegram','hubspot'], 'leads', 'wa-lead');
await runFlow('WA+Gmail, no CRM → wa-lead',                'leads', ['whatsapp','gmail'], 'leads', 'wa-lead');
await runFlow('IG+HubSpot → ig-lead',                      'leads', ['instagram','hubspot'], 'leads', 'ig-lead');
await runFlow('IG+FB+HubSpot → ig-lead',                   'leads', ['instagram','facebook','hubspot'], 'leads', 'ig-lead');
await runFlow('FB+HubSpot → ig-lead (FB has DM)',          'leads', ['facebook','hubspot'], 'leads', 'ig-lead');
await runFlow('WA+IG+HubSpot → ig-lead (IG beats WA)',     'leads', ['whatsapp','instagram','hubspot'], 'leads', 'ig-lead');
await runFlow('Fillout+Gmail → form-lead',                 'leads', ['fillout','gmail'], 'leads', 'form-lead');
await runFlow('Fillout+HubSpot+Gmail → form-lead',         'leads', ['fillout','hubspot','gmail'], 'leads', 'form-lead');
await runFlow('LinkedIn+HubSpot+Gmail → form-lead',        'leads', ['linkedin','hubspot','gmail'], 'leads', 'form-lead');

// ── 3. FOLLOWUP ───────────────────────────────────────────────
console.log('\n── 3. FOLLOWUP ────────────────────────────────────────────────');
await runFlow('WA+HubSpot+Gmail → followup',               'leads', ['whatsapp','hubspot','gmail'], 'followup', 'followup');
await runFlow('TG+Pipedrive → followup',                   'leads', ['telegram','pipedrive'], 'followup', 'followup');
await runFlow('Gmail+HubSpot, no msg → followup',          'leads', ['gmail','hubspot'], 'followup', 'followup');
await runFlow('WA+Monday → followup',                      'leads', ['whatsapp','monday'], 'followup', 'followup');
await runFlow('WA+Outlook+Pipedrive → followup',           'leads', ['whatsapp','outlook','pipedrive'], 'followup', 'followup');

// ── 4. SERVICE ────────────────────────────────────────────────
console.log('\n── 4. SERVICE ─────────────────────────────────────────────────');
await runFlow('WA+Gmail+Monday → triage',                  'service', ['whatsapp','gmail','monday'], 'service', 'triage');
await runFlow('TG+HubSpot+Outlook → triage',               'service', ['telegram','hubspot','outlook'], 'service', 'triage');
await runFlow('WA+Gmail → triage',                         'service', ['whatsapp','gmail'], 'service', 'triage');
await runFlow('Gmail+Monday, no msg → triage',             'service', ['gmail','monday'], 'service', 'triage');
await runFlow('WA+Trello+Gmail → triage',                  'service', ['whatsapp','trello','gmail'], 'service', 'triage');

// ── 5. SCHEDULING ─────────────────────────────────────────────
console.log('\n── 5. SCHEDULING ──────────────────────────────────────────────');
await runFlow('Calendly+WA → schedule',                    'time', ['calendly','whatsapp'], 'scheduling', 'schedule');
await runFlow('Tor4you+Gmail → schedule',                  'time', ['tor4you','gmail'], 'scheduling', 'schedule');
await runFlow('Calendly+HubSpot → schedule',               'time', ['calendly','hubspot'], 'scheduling', 'schedule');
await runFlow('Calendly+Tor4you both → schedule',          'time', ['calendly','tor4you','whatsapp'], 'scheduling', 'schedule');
await runFlow('WA+HubSpot, no sched tool → schedule',      'time', ['whatsapp','hubspot'], 'scheduling', 'schedule');

// ── 6. REPORTS ────────────────────────────────────────────────
console.log('\n── 6. REPORTS ─────────────────────────────────────────────────');
await runFlow('Excel+Gmail → report',                      'sales', ['excel','gmail'], 'reports', 'report');
await runFlow('Airtable+Outlook → report',                 'sales', ['airtable','outlook'], 'reports', 'report');
await runFlow('Notion+Gmail+Monday → report',              'sales', ['notion','gmail','monday'], 'reports', 'report');
await runFlow('WA+Gmail, no data tool → report',           'sales', ['whatsapp','gmail'], 'reports', 'report');
await runFlow('Airtable+Monday+Outlook → report',          'sales', ['airtable','monday','outlook'], 'reports', 'report');

// ── 7. SALES ──────────────────────────────────────────────────
// For sales pain, followup outscores wa-lead when CRM is present
// (CRM signal in followup = 10pts vs 6pts in wa-lead — re-engagement drives more revenue)
console.log('\n── 7. SALES ───────────────────────────────────────────────────');
await runFlow('WA+HubSpot → followup (CRM+msg → followup wins)',  'sales', ['whatsapp','hubspot'], 'sales', 'followup');
await runFlow('HubSpot+Gmail → followup',                         'sales', ['hubspot','gmail'], 'sales', 'followup');
await runFlow('WA+HubSpot+Gmail → followup',                      'sales', ['whatsapp','hubspot','gmail'], 'sales', 'followup');
await runFlow('IG+HubSpot → ig-lead',                             'sales', ['instagram','hubspot'], 'sales', 'ig-lead');
await runFlow('WA+IG+HubSpot → ig-lead (IG present → ig wins)',   'sales', ['whatsapp','instagram','hubspot'], 'sales', 'ig-lead');
// followup and crm tie at 27pts — followup wins (earlier in FLOWS array, stable sort)
await runFlow('HubSpot alone → followup (ties crm at 27p)',       'sales', ['hubspot'], 'sales', 'followup');

// ── 8. TASKS ──────────────────────────────────────────────────
console.log('\n── 8. TASKS ───────────────────────────────────────────────────');
await runFlow('WA+TG+Gmail → triage',                      'service', ['whatsapp','telegram','gmail'], 'tasks', 'triage');
await runFlow('Monday+HubSpot+WA → crm (has task mgmt)',   'service', ['monday','hubspot','whatsapp'], 'tasks', 'crm');
// Trello+Notion+Gmail: triage wins (email→task without CRM is correct)
await runFlow('Trello+Notion+Gmail → triage',              'service', ['trello','notion','gmail'], 'tasks', 'triage');
await runFlow('WA+Gmail, no task tool → triage',           'service', ['whatsapp','gmail'], 'tasks', 'triage');
await runFlow('Monday+Trello+WA → crm',                    'service', ['monday','trello','whatsapp'], 'tasks', 'crm');

// ── 9. INVOICES ───────────────────────────────────────────────
console.log('\n── 9. INVOICES ────────────────────────────────────────────────');
await runFlow('HubSpot+Gmail → crm',                       'sales', ['hubspot','gmail'], 'invoices', 'crm');
await runFlow('Airtable+Gmail → crm (airtable is CRM)',    'sales', ['airtable','gmail'], 'invoices', 'crm');
await runFlow('Pipedrive+Outlook → crm',                   'sales', ['pipedrive','outlook'], 'invoices', 'crm');
await runFlow('HubSpot+Excel+Gmail → crm (CRM beats report)', 'sales', ['hubspot','excel','gmail'], 'invoices', 'crm');
// No CRM tool: Excel+Gmail → report is the best available match
await runFlow('Excel+Gmail, no CRM → report',              'sales', ['excel','gmail'], 'invoices', 'report');

// ── 10. MARKETING ─────────────────────────────────────────────
console.log('\n── 10. MARKETING ──────────────────────────────────────────────');
await runFlow('IG+FB+WA → ig-lead',                        'leads', ['instagram','facebook','whatsapp'], 'marketing', 'ig-lead');
await runFlow('WA+Gmail+HubSpot → wa-lead',                'leads', ['whatsapp','gmail','hubspot'], 'marketing', 'wa-lead');
await runFlow('LinkedIn+IG → ig-lead (IG has DM)',         'leads', ['linkedin','instagram'], 'marketing', 'ig-lead');
await runFlow('WA+FB+Gmail → ig-lead (FB DM present)',     'leads', ['whatsapp','facebook','gmail'], 'marketing', 'ig-lead');
await runFlow('Mailchimp+Smoove, no DM → wa-lead',         'leads', ['mailchimp','smoove'], 'marketing', 'wa-lead');

// ── 11. EDGE CASES ────────────────────────────────────────────
console.log('\n── 11. EDGE CASES ─────────────────────────────────────────────');
// Single tool cases
await runFlow('WA only, leads pain → wa-lead',             'leads', ['whatsapp'], 'leads', 'wa-lead');
await runFlow('HubSpot only, followup pain → followup',    'leads', ['hubspot'], 'followup', 'followup');
await runFlow('Calendly only, scheduling pain → schedule', 'time', ['calendly'], 'scheduling', 'schedule');
// No relevant tool — pain bonus carries the result
await runFlow('ChatGPT only, reports pain → report',       'sales', ['chatgpt'], 'reports', 'report');
await runFlow('Zoom only, scheduling pain → schedule',     'time', ['zoom'], 'scheduling', 'schedule');
// Empty tools — pain bonus + intent determine winner
await runFlow('No tools, leads pain → wa-lead',            'leads', [], 'leads', 'wa-lead');

// ── 12. TOOL LABEL RESOLUTION ─────────────────────────────────
// Verifies bestXxx() priority order and fallback strings
console.log('\n── 12. TOOL LABEL RESOLUTION ──────────────────────────────────');
// CRM priority: hubspot > pipedrive > fireberry > monday > morning > airtable
const hLabel   = (await toolLabel('bestCRM',       ['hubspot','pipedrive']))?.label;
const pdLabel  = (await toolLabel('bestCRM',       ['pipedrive']))?.label;
const crmFb    = (await toolLabel('bestCRM',       []))?.label;
const waLabel  = (await toolLabel('bestMessaging', ['telegram','whatsapp']))?.label;
const tgLabel  = (await toolLabel('bestMessaging', ['telegram']))?.label;
const msgFb    = (await toolLabel('bestMessaging', []))?.label;
const atLabel  = (await toolLabel('bestData',      ['notion','airtable','excel']))?.label;
const exLabel  = (await toolLabel('bestData',      ['excel']))?.label;
const dataFb   = (await toolLabel('bestData',      []))?.label;
const calLabel = (await toolLabel('bestScheduling',['tor4you','calendly']))?.label;

await check('bestCRM([hubspot,pipedrive]) → HubSpot (higher priority)',  hLabel, 'HubSpot');
await check('bestCRM([pipedrive]) → Pipedrive',                          pdLabel, 'Pipedrive');
await check('bestCRM([]) → "CRM" (fallback)',                            crmFb,   'CRM');
await check('bestMessaging([telegram,whatsapp]) → WhatsApp (priority)',  waLabel, 'WhatsApp');
await check('bestMessaging([telegram]) → Telegram',                      tgLabel, 'Telegram');
await check('bestMessaging([]) → "WhatsApp" (fallback)',                 msgFb,   'WhatsApp');
await check('bestData([notion,airtable,excel]) → Airtable (priority)',   atLabel, 'Airtable');
await check('bestData([excel]) → Excel',                                 exLabel, 'Excel');
await check('bestData([]) → "Google Sheets" (fallback)',                 dataFb,  'Google Sheets');
await check('bestScheduling([tor4you,calendly]) → Calendly (priority)',  calLabel,'Calendly');

// ── 13. READINESS SCORE SANITY ────────────────────────────────
// Readiness must always land in [55, 95] — never <50 (looks broken) or >95 (impossible)
console.log('\n── 13. READINESS SCORE SANITY ─────────────────────────────────');
const PAINS   = ['leads','followup','service','scheduling','reports','sales','tasks','invoices','marketing'];
const INTENTS = ['leads','leads','service','time','sales','sales','service','sales','leads'];
const SAMPLE  = [['whatsapp','hubspot'], ['telegram','pipedrive'], ['whatsapp','gmail','monday'],
                 ['calendly','whatsapp'], ['excel','gmail'], ['whatsapp','hubspot','gmail'],
                 ['monday','hubspot'], ['hubspot','gmail'], ['instagram','facebook','whatsapp']];

for (let i = 0; i < PAINS.length; i++) {
  const r = await topFlow(INTENTS[i], SAMPLE[i], PAINS[i]);
  const ok = r.readiness >= 55 && r.readiness <= 95;
  await check(
    `readiness(${PAINS[i]}) = ${r.readiness}% — must be 55–95`,
    ok ? 'ok' : `${r.readiness}% out of range`,
    'ok'
  );
}

// ─────────────────────────────────────────────────────────────
console.log('\n════════════════════════════════════════════════════════════════');
console.log(` RESULTS: ${passed} passed / ${failed} failed / ${passed + failed} total`);
console.log('════════════════════════════════════════════════════════════════');

if (failures.length) {
  console.log('\n── FAILURES ──');
  failures.forEach(f => {
    const detail = f.tools ? `tools=[${f.tools}] intent=${f.intent}` : '';
    console.log(`  ${FAIL} ${f.label}  ${detail}`);
    console.log(`       got="${f.got}"  expected="${f.expected}"`);
  });
  process.exitCode = 1;
}

await br.close();
