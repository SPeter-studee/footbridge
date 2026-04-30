/**
 * Footbridge — /admin/leads Pages Function
 * Cloudflare Access mögött fut — csak footbridge.hu e-mail-lel érhető el.
 */
export async function onRequestGet({ request, env }) {
  const accessEmail = request.headers.get('cf-access-authenticated-user-email');
  if (!accessEmail) return new Response('Forbidden', { status: 403 });

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'new';
  const type = url.searchParams.get('type') || 'all';

  const prefix = type === 'all' ? '' : `${type}:`;
  let leads = [];

  try {
    const list = await env.LEADS.list({ prefix });
    for (const key of list.keys) {
      if (!key.name.startsWith('newsletter:')) {
        const raw = await env.LEADS.get(key.name);
        if (raw) {
          const lead = JSON.parse(raw);
          if (status === 'all' || lead.status === status) {
            leads.push({ key: key.name, ...lead });
          }
        }
      }
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }

  leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return new Response(JSON.stringify({ leads, count: leads.length }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function onRequestPatch({ request, env }) {
  const accessEmail = request.headers.get('cf-access-authenticated-user-email');
  if (!accessEmail) return new Response('Forbidden', { status: 403 });

  const { key, status, notes } = await request.json();
  if (!key) return new Response(JSON.stringify({ error: 'Key required' }), { status: 400 });

  const raw = await env.LEADS.get(key);
  if (!raw) return new Response(JSON.stringify({ error: 'Lead not found' }), { status: 404 });

  const lead = JSON.parse(raw);
  if (status) lead.status = status;
  if (notes !== undefined) lead.notes = notes;
  lead.updated_at = new Date().toISOString();
  lead.updated_by = accessEmail;

  await env.LEADS.put(key, JSON.stringify(lead));
  return new Response(JSON.stringify({ success: true, lead }), { headers: { 'Content-Type': 'application/json' } });
}
