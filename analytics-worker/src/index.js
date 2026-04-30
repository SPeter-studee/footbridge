/**
 * Footbridge — Plausible self-hosted analytics Worker
 * Fut: analytics.footbridge.hu
 *
 * Deploy:
 *   cd analytics-worker
 *   wrangler deploy
 *
 * KV namespace szükséges: ANALYTICS
 *   npx wrangler kv:namespace create ANALYTICS
 *   → ID-t a wrangler.toml-ba
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = ['https://footbridge.hu', 'https://www.footbridge.hu'];
    const corsOrigin = allowed.includes(origin) ? origin : 'https://footbridge.hu';

    const corsHeaders = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);

    // POST /event — esemény rögzítése
    if (request.method === 'POST' && url.pathname === '/event') {
      return handleEvent(request, env, corsHeaders);
    }

    // GET /stats — aggregált statisztikák (admin-célra)
    if (request.method === 'GET' && url.pathname === '/stats') {
      return handleStats(request, env, corsHeaders);
    }

    return new Response('Not found', { status: 404 });
  }
};

async function handleEvent(request, env, corsHeaders) {
  let event;
  try {
    event = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!event.name) {
    return new Response(JSON.stringify({ error: 'Event name required' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const eventKey = `event:${date}:${event.name}`;

  try {
    // Aggregált számláló frissítése
    let data = { count: 0, paths: {}, props: {} };
    try {
      const existing = await env.ANALYTICS.get(eventKey);
      if (existing) data = JSON.parse(existing);
    } catch {}

    data.count += 1;

    // URL path tracking (anonim)
    if (event.url) {
      const path = event.url.split('?')[0]; // query strip
      data.paths[path] = (data.paths[path] || 0) + 1;
    }

    // Property aggregálás
    if (event.props && typeof event.props === 'object') {
      for (const [k, v] of Object.entries(event.props)) {
        if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
          data.props[k] = data.props[k] || {};
          const val = String(v);
          data.props[k][val] = (data.props[k][val] || 0) + 1;
        }
      }
    }

    // Napi lejárat: 90 nap
    await env.ANALYTICS.put(eventKey, JSON.stringify(data), { expirationTtl: 90 * 24 * 60 * 60 });

    // Napi összes látogató-count (approximate)
    if (event.name === 'pageview') {
      const pvKey = `pageviews:${date}`;
      try {
        const pv = await env.ANALYTICS.get(pvKey);
        await env.ANALYTICS.put(pvKey, String((pv ? parseInt(pv) : 0) + 1), { expirationTtl: 90 * 24 * 60 * 60 });
      } catch {}
    }

  } catch (err) {
    console.error('Analytics write error:', err);
    // Csendes hiba — nem blokkolja a UX-et
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleStats(request, env, corsHeaders) {
  // Csak az analytics.footbridge.hu-ról hívható — nem publikus
  const cfAccessEmail = request.headers.get('cf-access-authenticated-user-email');
  if (!cfAccessEmail) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '30');
  const stats = {};

  try {
    // Utolsó N nap összegyűjtése
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split('T')[0];

      const pvRaw = await env.ANALYTICS.get(`pageviews:${date}`);
      if (pvRaw) stats[date] = { pageviews: parseInt(pvRaw), events: {} };

      // Esemény-típusok
      const eventTypes = ['pageview', 'tool_started', 'tool_completed', 'contact_form_submitted',
        'healthcheck_form_submitted', 'newsletter_subscribed', 'workshop_pdf_downloaded'];

      for (const evName of eventTypes) {
        const raw = await env.ANALYTICS.get(`event:${date}:${evName}`);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (!stats[date]) stats[date] = { pageviews: 0, events: {} };
          stats[date].events[evName] = { count: parsed.count, props: parsed.props };
        }
      }
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ stats, days }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}
