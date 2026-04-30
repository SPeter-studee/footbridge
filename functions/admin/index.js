/**
 * Footbridge — /admin dashboard (Cloudflare Access mögött)
 */
export async function onRequestGet({ request, env }) {
  const accessEmail = request.headers.get('cf-access-authenticated-user-email');
  if (!accessEmail) return new Response('Forbidden', { status: 403 });

  let contactCount = 0, healthcheckCount = 0, urgentCount = 0;
  try {
    const contacts = await env.LEADS.list({ prefix: 'contact:' });
    const healthchecks = await env.LEADS.list({ prefix: 'healthcheck:' });
    contactCount = contacts.keys.length;
    healthcheckCount = healthchecks.keys.length;

    for (const key of [...contacts.keys, ...healthchecks.keys]) {
      const raw = await env.LEADS.get(key.name);
      if (raw) {
        const lead = JSON.parse(raw);
        if (lead.status === 'new' && lead.is_urgent) urgentCount++;
      }
    }
  } catch {}

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin — Footbridge</title>
  <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
<main style="padding: 40px 24px; max-width: 900px; margin: 0 auto;">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:32px;">
    <div>
      <p style="font-size:11px;color:var(--color-muted);text-transform:uppercase;letter-spacing:0.1em;">Admin</p>
      <h1 style="font-size:28px;">Footbridge CRM</h1>
    </div>
    <p style="font-size:13px;color:var(--color-muted);">${accessEmail}</p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px;">
    <div style="padding:20px;background:var(--color-surface);">
      <p style="font-size:11px;color:var(--color-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Összes kontakt</p>
      <p style="font-size:36px;font-weight:500;">${contactCount}</p>
    </div>
    <div style="padding:20px;background:var(--color-surface);">
      <p style="font-size:11px;color:var(--color-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Healthcheck</p>
      <p style="font-size:36px;font-weight:500;">${healthcheckCount}</p>
    </div>
    <div style="padding:20px;background:${urgentCount>0?'rgba(196,98,45,0.1)':'var(--color-surface)'};">
      <p style="font-size:11px;color:var(--color-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:4px;">Sürgős (új)</p>
      <p style="font-size:36px;font-weight:500;color:${urgentCount>0?'var(--color-coral)':'inherit'}">${urgentCount}</p>
    </div>
  </div>

  <div style="display:flex;gap:12px;margin-bottom:32px;">
    <a href="/admin/leads?status=new&type=contact" class="btn btn-primary">Kontakt lead-ek →</a>
    <a href="/admin/leads?status=new&type=healthcheck" class="btn btn-secondary">Healthcheck lead-ek →</a>
    <a href="/admin/leads?status=all" class="btn btn-secondary">Összes lead →</a>
  </div>

  <div style="padding:16px;border:0.5px solid var(--color-border);font-size:13px;color:var(--color-muted);">
    <p><strong>Lead státuszok:</strong> new → contacted → in-progress → closed-won / closed-lost / closed-no-fit</p>
    <p style="margin-top:8px;"><strong>API:</strong> GET /admin/leads · PATCH /admin/leads (státusz/notes frissítés)</p>
  </div>
</main>
</body>
</html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}
