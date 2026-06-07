export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const webhook = process.env.MAKE_CHAT_WEBHOOK;
  if (!webhook) return res.status(500).json({ error: 'Not configured' });

  try {
    const upstream = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const text = await upstream.text();
    res.status(upstream.ok ? 200 : 502).send(text);
  } catch {
    res.status(502).end();
  }
}
