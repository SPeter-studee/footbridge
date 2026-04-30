/**
 * Footbridge — /api/newsletter Pages Function
 */
export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rateLimitKey = `newsletter:${ip}`;
  try {
    const val = await env.RATE_LIMIT.get(rateLimitKey);
    const current = val ? parseInt(val) : 0;
    if (current >= 5) return jsonResponse({ error: 'Túl sok kérés. Várj egy percet.' }, 429);
    await env.RATE_LIMIT.put(rateLimitKey, (current + 1).toString(), { expirationTtl: 60 });
  } catch {}

  let data;
  try { data = await request.json(); } catch { return jsonResponse({ error: 'Érvénytelen kérés.' }, 400); }
  if (!data.email || !data.email.includes('@')) return jsonResponse({ error: 'Az e-mail-cím nem teljes.' }, 400);

  const emailHash = btoa(data.email).replace(/=/g, '');
  try {
    const existing = await env.LEADS.get(`newsletter:${emailHash}`);
    if (existing) return jsonResponse({ success: true, message: 'Már feliratkozott.' }, 200);
    await env.LEADS.put(`newsletter:${emailHash}`, JSON.stringify({
      type: 'newsletter', email: data.email,
      subscribed_at: new Date().toISOString(),
      source_url: data.source_url || 'unknown'
    }));
  } catch {}

  // Resend lista hozzáadás
  try {
    await fetch('https://api.resend.com/contacts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: data.email, unsubscribed: false })
    });
  } catch {}

  return jsonResponse({ success: true, message: 'Üdv a Footbridge-nél. Hamarosan!' }, 200);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
