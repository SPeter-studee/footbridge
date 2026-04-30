/**
 * Footbridge — /api/analyze-why Pages Function
 * 5 Whys gyökérok elemzése Anthropic API-val
 */

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const rlKey = `analyze-why:${ip}`;
  try {
    const val = await env.RATE_LIMIT.get(rlKey);
    const current = val ? parseInt(val) : 0;
    if (current >= 10) return jsonResponse({ error: 'Túl sok kérés.' }, 429);
    await env.RATE_LIMIT.put(rlKey, (current + 1).toString(), { expirationTtl: 60 });
  } catch {}

  let data;
  try { data = await request.json(); } catch { return jsonResponse({ error: 'Érvénytelen kérés.' }, 400); }

  const { problem, whys, root_cause } = data;
  if (!problem || !root_cause) return jsonResponse({ error: 'Hiányzó adatok.' }, 400);

  const chain = whys.map((w, i) => `Miért ${i+1}: ${w}`).join('\n');

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
        max_tokens: 400,
        system: `Te a Footbridge tanácsadó cég elemzője vagy.
A Footbridge 3 szűrője: 1. Megszüntethető? 2. Áttervezhető? 3. Automatizálható?
Stílusod: tömör, őszinte, konkrét. Max 150 szó. Magyar nyelven.`,
        messages: [{
          role: 'user',
          content: `5 Whys elemzés eredménye:

Probléma: ${problem}
${chain}
Gyökérok: ${root_cause}

Értékeld a gyökérokot a Footbridge 3 szűrőjén keresztül:
1. Megszüntethető-e ez a gyökérok (pl. felesleges folyamat, döntési szint)?
2. Ha nem, áttervezhető-e (egyszerűsítés, párhuzamosítás)?
3. Ha nem, automatizálható-e?

Adj egy konkrét javaslatot arra, melyik szűrőn érdemes kezdeni és miért.`
        }]
      })
    });

    const aiData = await aiRes.json();
    const feedback = aiData.content?.[0]?.text || 'Az elemzés nem sikerült.';
    return jsonResponse({ success: true, feedback });

  } catch (err) {
    return jsonResponse({ error: 'AI elemzés nem elérhető: ' + err.message }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
