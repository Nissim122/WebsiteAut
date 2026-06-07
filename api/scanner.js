import { checkOrigin, checkRateLimit, checkHoneypot } from './_lib/guard.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!checkOrigin(req)) return res.status(403).end();
  if (!checkRateLimit(req)) return res.status(429).end();
  if (!checkHoneypot(req.body)) return res.status(200).end(); // silent drop

  const webhook = process.env.MAKE_SCANNER_WEBHOOK;
  if (!webhook) return res.status(500).json({ error: 'Not configured' });

  const { website: _hp, ...cleanBody } = req.body;

  try {
    const upstream = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanBody),
    });
    res.status(upstream.ok ? 200 : 502).end();
  } catch {
    res.status(502).end();
  }
}
