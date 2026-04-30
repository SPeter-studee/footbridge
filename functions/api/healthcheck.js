/**
 * Footbridge — /api/healthcheck Pages Function
 */
export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rateLimitKey = `healthcheck:${ip}`;
  try {
    const val = await env.RATE_LIMIT.get(rateLimitKey);
    const current = val ? parseInt(val) : 0;
    if (current >= 3) return jsonResponse({ error: 'Túl sok küldést észleltünk. Várj egy percet.' }, 429);
    await env.RATE_LIMIT.put(rateLimitKey, (current + 1).toString(), { expirationTtl: 60 });
  } catch {}

  let data;
  try { data = await request.json(); } catch { return jsonResponse({ error: 'Érvénytelen kérés.' }, 400); }
  if (!data.email || !data.email.includes('@')) return jsonResponse({ error: 'Az e-mail-cím nem teljes.', field: 'email' }, 400);

  const timestamp = new Date().toISOString();
  const ts = Math.floor(Date.now() / 1000);
  const uuid = crypto.randomUUID();
  const isUrgent = data.urgency === '1 hónapon belül';

  const lead = {
    type: 'healthcheck', timestamp, uuid,
    email: data.email, answers: data.answers || {},
    score: data.score || 0, urgency: data.urgency || '',
    source_url: data.source_url || 'unknown',
    ip_country: request.headers.get('cf-ipcountry') || '',
    status: 'new',
    sla_deadline: isUrgent
      ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  try { await env.LEADS.put(`healthcheck:${ts}:${uuid}`, JSON.stringify(lead)); } catch {}

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || 'noreply@footbridge.hu',
        to: env.RESEND_TO_EMAIL || 'hello@footbridge.hu',
        subject: `${isUrgent ? '🔴 SÜRGŐS · ' : ''}Healthcheck: score ${data.score}/100 · ${data.urgency}`,
        text: `E-mail: ${data.email}
Score: ${data.score}/100
Sürgősség: ${data.urgency}
SLA: ${lead.sla_deadline}

Válaszok:
${JSON.stringify(data.answers, null, 2)}`
      })
    });
  } catch {}

  return jsonResponse({ success: true }, 200);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
