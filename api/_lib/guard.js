const ALLOWED_ORIGINS = [
  'https://clix-automations.com',
  'https://www.clix-automations.com',
  'https://scanner.clix-automations.com',
];

// In-memory rate limit store (per function instance — good enough for a small site)
const rateLimitMap = new Map();

export function checkOrigin(req) {
  const raw = req.headers['origin'] || req.headers['referer'] || '';
  if (!raw) return false;
  try {
    const { origin } = new URL(raw);
    return ALLOWED_ORIGINS.includes(origin);
  } catch {
    return false;
  }
}

export function checkRateLimit(req, limit = 3, windowMs = 60_000) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  let record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + windowMs };
  }

  record.count++;
  rateLimitMap.set(ip, record);

  return record.count <= limit;
}

// body can be an object or array (newsletter sends an array)
export function checkHoneypot(body) {
  const check = Array.isArray(body) ? body[0] : body;
  return check?.website === '';
}
