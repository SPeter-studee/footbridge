/**
 * Footbridge — /api/analyze-7s Pages Function
 * Anthropic API → 7S elemzés → Resend e-mail (felhasználónak + Footbridge-nek)
 */

const DIMS = [
  { key: 'strategy',      hu: 'Stratégia',       en: 'Strategy'      },
  { key: 'structure',     hu: 'Struktúra',        en: 'Structure'     },
  { key: 'systems',       hu: 'Rendszerek',       en: 'Systems'       },
  { key: 'shared_values', hu: 'Közös értékek',    en: 'Shared Values' },
  { key: 'skills',        hu: 'Kompetenciák',     en: 'Skills'        },
  { key: 'style',         hu: 'Vezetési stílus',  en: 'Style'         },
  { key: 'staff',         hu: 'Emberek',          en: 'Staff'         }
];

export async function onRequestPost({ request, env }) {
  // Rate limit
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rlKey = `7s-analyze:${ip}`;
  try {
    const val = await env.RATE_LIMIT.get(rlKey);
    const current = val ? parseInt(val) : 0;
    if (current >= 5) return jsonResponse({ error: 'Túl sok kérés. Várj egy percet.' }, 429);
    await env.RATE_LIMIT.put(rlKey, (current + 1).toString(), { expirationTtl: 60 });
  } catch {}

  let data;
  try { data = await request.json(); } catch { return jsonResponse({ error: 'Érvénytelen kérés.' }, 400); }

  const { scores, email, company } = data;
  if (!scores || !email || !email.includes('@')) return jsonResponse({ error: 'Hiányzó adatok.' }, 400);

  // Átlag és sorrendek
  const avg = (Object.values(scores).reduce((a, b) => a + b, 0) / 7).toFixed(1);
  const sorted = [...DIMS].sort((a, b) => scores[b.key] - scores[a.key]);
  const weakest = sorted.slice(-2).map(d => `${d.hu} (${scores[d.key]}/5)`).join(', ');
  const strongest = sorted.slice(0, 2).map(d => `${d.hu} (${scores[d.key]}/5)`).join(', ');

  const scoreList = DIMS.map(d => `- ${d.hu}: ${scores[d.key]}/5`).join('\n');
  const companyStr = company ? `Cég: ${company}` : 'Cég neve nem adott meg';

  // ── Anthropic API hívás ────────────────────────────────────
  let analysis = '';
  try {
    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        system: `Te a Footbridge digitalizációs tanácsadó cég elemzője vagy.
A Footbridge módszertana: 3 szűrő (megszüntethető → áttervezhető → automatizálható), kicsi járható hidak, 3 hetes projektek, fix árral.
Elemzési stílusod: tömör, őszinte, nem szépítő. Magyar nyelven írsz.
Kerülj: üres bíztatást, sablonos tanácsokat. Adj: konkrét, cselekvésre ösztönző megfigyeléseket.`,
        messages: [{
          role: 'user',
          content: `McKinsey 7S önértékelés eredménye:

${scoreList}

${companyStr}
Átlag: ${avg}/5
Legerősebb: ${strongest}
Leggyengébb: ${weakest}

Kérlek, adj egy tömör (max 250 szó) elemzést:
1. Mi a legfontosabb egyensúlyhiány ebben a szervezetben?
2. Melyik dimenzióval érdemes kezdeni, és miért?
3. Egy konkrét következő lépés javaslata.

Ne adj általános 7S-magyarázatot — csak amit ezekből a számokból látni lehet.`
        }]
      })
    });

    const aiData = await aiRes.json();
    analysis = aiData.content?.[0]?.text || 'Az elemzés nem sikerült. Kérjük, vedd fel velünk a kapcsolatot: hello@footbridge.hu';
  } catch (err) {
    analysis = 'Az AI-elemzés átmenetileg nem elérhető. A Footbridge-csapat manuálisan értékeli az eredményedet és 1 munkanapon belül jelentkezik.';
  }

  // KV-ba mentés
  try {
    const ts = Math.floor(Date.now() / 1000);
    const uuid = crypto.randomUUID();
    await env.LEADS.put(`7s-analysis:${ts}:${uuid}`, JSON.stringify({
      type: '7s-analysis',
      timestamp: new Date().toISOString(),
      email, company: company || '',
      scores, avg, analysis,
      status: 'new'
    }));
  } catch {}

  // ── E-mail küldés (Resend) ─────────────────────────────────
  const emailBody = `McKinsey 7S elemzésed — Footbridge

${scoreList}

Átlag: ${avg}/5
Legerősebb terület: ${strongest}
Fejlesztési lehetőség: ${weakest}

──────────────────────────────
AI ELEMZÉS

${analysis}

──────────────────────────────

Ez az elemzés a Footbridge 7S önértékelő eszközével készült.
Ha mélyebbre akarsz menni: hello@footbridge.hu | footbridge.hu`;

  // Felhasználónak
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'elemzes@footbridge.hu',
        to: email,
        subject: `7S elemzésed kész — átlag ${avg}/5`,
        text: emailBody
      })
    });
  } catch {}

  // Footbridge-nek (belső értesítő)
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'noreply@footbridge.hu',
        to: env.RESEND_TO_EMAIL || 'hello@footbridge.hu',
        subject: `Új 7S elemzés: ${company || email} · átlag ${avg}/5`,
        text: `Kitöltő: ${email}\n${companyStr}\n\n${scoreList}\n\nAtlag: ${avg}/5\nLeggyengébb: ${weakest}\n\nAI elemzés:\n${analysis}`
      })
    });
  } catch {}

  return jsonResponse({ success: true, analysis, scores });
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
