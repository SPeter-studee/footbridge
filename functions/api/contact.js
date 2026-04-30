/**
 * Footbridge — /api/contact Pages Function
 * POST: kontakt-form fogadása, KV-tárolás, Resend értesítés
 */

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';

  // --- Rate limiting: 3 beküldés/perc/IP ---
  const rateLimitKey = `contact:${ip}`;
  let current = 0;
  try {
    const val = await env.RATE_LIMIT.get(rateLimitKey);
    current = val ? parseInt(val) : 0;
  } catch { /* első alkalom */ }

  if (current >= 3) {
    return jsonResponse({ error: 'Túl sok küldést észleltünk. Várj egy percet, és próbáld újra.' }, 429);
  }
  await env.RATE_LIMIT.put(rateLimitKey, (current + 1).toString(), { expirationTtl: 60 });

  // --- Adatok kiolvasása ---
  let data;
  try {
    data = await request.json();
  } catch {
    return jsonResponse({ error: 'Érvénytelen kérés.' }, 400);
  }

  // --- Validáció ---
  if (!data.email || !data.email.includes('@')) {
    return jsonResponse({ error: 'Az e-mail-cím nem teljes.', field: 'email' }, 400);
  }
  if (!data.challenge || data.challenge.length < 10) {
    return jsonResponse({ error: 'A "kihívás" mező túl rövid.', field: 'challenge' }, 400);
  }

  // --- Lead tárolása KV-ban ---
  const timestamp = new Date().toISOString();
  const ts = Math.floor(Date.now() / 1000);
  const uuid = crypto.randomUUID();

  const lead = {
    type: 'contact',
    timestamp,
    uuid,
    email: data.email,
    challenge: data.challenge,
    company_size: data.company_size || '',
    timeline: data.timeline || '',
    is_urgent: data.is_urgent || false,
    source_url: data.source_url || 'unknown',
    ip_country: request.headers.get('cf-ipcountry') || '',
    status: 'new',
    notes: '',
    sla_deadline: data.is_urgent
      ? new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()   // 4 óra
      : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()  // 1 munkanap
  };

  try {
    await env.LEADS.put(`contact:${ts}:${uuid}`, JSON.stringify(lead));
  } catch (err) {
    console.error('KV tárolás hiba:', err);
    // Folytatjuk — az e-mail akkor is elmenjen
  }

  // --- Belső értesítő e-mail (Resend) ---
  const urgentLabel = data.is_urgent ? '🔴 SÜRGŐS · ' : '';
  const subject = `${urgentLabel}Új lead: ${data.company_size || '?'} fő · ${data.timeline || '?'}`;
  const body = [
    `Kihívás: ${data.challenge}`,
    '',
    `E-mail: ${data.email}`,
    `Cégméret: ${data.company_size}`,
    `Időhorizont: ${data.timeline}`,
    `Sürgős: ${data.is_urgent ? 'igen' : 'nem'}`,
    `Forrás: ${data.source_url}`,
    `SLA határidő: ${lead.sla_deadline}`,
    '',
    `Admin: https://footbridge.hu/admin/leads#${uuid}`
  ].join('\n');

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.RESEND_FROM_EMAIL || 'noreply@footbridge.hu',
        to: env.RESEND_TO_EMAIL || 'hello@footbridge.hu',
        subject,
        text: body
      })
    });
  } catch (err) {
    console.error('Resend hiba:', err);
    // Nem blokkolja a sikeres választ
  }

  return jsonResponse({ success: true, message: 'Megkaptuk. Egy munkanapon belül jelentkezünk.' }, 200);
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
