/* Footbridge — 5 Whys gyökérok-elemző
   Szabályalapú tünet-detektálás + opcionális AI visszajelzés */

(function () {
  const container = document.getElementById('tool-container');
  if (!container) return;

  let step = 0;
  let problem = '';
  let whys = [];

  const SYMPTOM_WORDS = ['mert', 'azért', 'nem tudom', 'nem', 'nincs', 'lassú',
    'késik', 'hiba', 'hibás', 'rossz', 'kevés', 'sok', 'mindig', 'soha'];

  function isSymptomatic(answer) {
    if (answer.length < 15) return true;
    const lower = answer.toLowerCase();
    const startsSymptom = SYMPTOM_WORDS.some(w => lower.startsWith(w));
    const noSubject = !/(az|a|ez|ők|mi|én|ő|csapat|vezető|rendszer|folyamat|ember|cég)/i.test(lower);
    return startsSymptom && noSubject;
  }

  function render() {
    if (step === 0) renderProblem();
    else if (step <= 5) renderWhy();
    else renderResult();
  }

  function renderProblem() {
    container.innerHTML = `
      <div>
        <h2 style="margin-bottom:10px;">Mi a konkrét probléma?</h2>
        <p style="color:var(--color-muted);font-size:14px;margin-bottom:20px;">
          Legyen minél konkrétabb — nem "lassú a folyamat", hanem
          "a számlafeldolgozás 15 munkanapot vesz igénybe és sok a hibás adat".
        </p>
        <textarea id="problem-input" class="form-textarea" rows="4"
          placeholder="Pl. A számlafeldolgozás 15 munkanapot vesz igénybe..."></textarea>
        <button class="btn btn-primary" style="margin-top:12px;width:100%;justify-content:center;" onclick="window._5w_start()">
          Kezdjük →
        </button>
      </div>`;
  }

  function renderWhy() {
    const prev = step === 1 ? problem : whys[whys.length - 1];
    container.innerHTML = `
      <div>
        <div style="height:3px;background:var(--color-border);border-radius:2px;margin-bottom:20px;">
          <div style="height:3px;background:var(--color-green);border-radius:2px;width:${step * 20}%;transition:width 300ms;"></div>
        </div>
        <p style="font-size:11px;color:var(--color-muted);text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">${step}. Miért</p>
        <h2 style="margin-bottom:10px;">Miért van ez?</h2>
        <div style="padding:12px 16px;background:var(--color-surface);margin-bottom:16px;font-size:14px;color:var(--color-muted);border-left:2px solid var(--color-border);">"${prev}"</div>
        <textarea id="why-input" class="form-textarea" rows="3" placeholder="Mert..."></textarea>
        <p id="why-hint" style="display:none;font-size:13px;color:var(--color-coral);margin-top:8px;padding:10px 14px;background:rgba(196,98,45,0.06);border-radius:4px;"></p>
        <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap;">
          <button class="btn btn-primary" style="flex:1;justify-content:center;" onclick="window._5w_next()">Tovább →</button>
          ${step >= 3 ? '<button class="btn btn-secondary" onclick="window._5w_finish()">Ez a gyökérok</button>' : ''}
        </div>
      </div>`;
  }

  window._5w_start = function () {
    problem = document.getElementById('problem-input')?.value?.trim();
    if (!problem || problem.length < 10) { alert('Kérlek, írj egy konkrétabb problémát.'); return; }
    step = 1;
    window.fbAnalytics?.track('tool_started', { tool_name: '5whys' });
    render();
  };

  window._5w_next = function () {
    const answer = document.getElementById('why-input')?.value?.trim();
    if (!answer || answer.length < 5) { alert('Kérlek, válaszolj a kérdésre.'); return; }

    if (isSymptomatic(answer)) {
      const hint = document.getElementById('why-hint');
      if (hint) {
        hint.textContent = '⚠ Ez inkább tünetnek hangzik, mint oknak. Próbálj mélyebbre menni — mi áll ennek a mögötte? Pl. "Mert az X-et a Y döntötte el úgy, hogy..."';
        hint.style.display = 'block';
        return;
      }
    }

    whys.push(answer);
    if (step >= 5) { renderResult(); return; }
    step++;
    render();
  };

  window._5w_finish = function () {
    const answer = document.getElementById('why-input')?.value?.trim();
    if (answer) whys.push(answer);
    renderResult();
  };

  function renderResult() {
    const rootCause = whys[whys.length - 1];
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:20px;">
        <div style="padding:20px 24px;border:0.5px solid var(--color-green);">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-green);margin-bottom:6px;">Valószínű gyökérok</p>
          <p style="font-size:17px;font-weight:500;">"${rootCause}"</p>
        </div>

        <div>
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-muted);margin-bottom:10px;">Az okozati lánc</p>
          <div style="border-left:2px solid var(--color-border);padding-left:16px;display:flex;flex-direction:column;gap:6px;">
            <div style="font-size:13px;color:var(--color-muted);">Probléma: "${problem}"</div>
            ${whys.map((w, i) => `<div style="font-size:13px;${i===whys.length-1?'color:var(--color-green);font-weight:500;':'color:var(--color-muted);'}">Miért ${i+1}: "${w}"</div>`).join('')}
          </div>
        </div>

        <!-- AI elemzés blokk -->
        <div id="ai-block" style="border:0.5px solid var(--color-border);padding:20px;">
          <p style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:var(--color-muted);margin-bottom:10px;">AI visszajelzés a gyökérokra</p>
          <div id="ai-feedback-content">
            <p style="font-size:14px;color:var(--color-muted);margin-bottom:12px;">Kérsz egy rövid AI-elemzést arról, hogy ez a gyökérok hogyan illeszkedik a Footbridge 3 szűrőjébe?</p>
            <button class="btn btn-secondary" onclick="window._5w_ai_analyze()" id="ai-btn">
              AI elemzés kérése
            </button>
          </div>
        </div>

        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <a href="/kapcsolat" class="btn btn-primary">Beszéljünk a megoldásról →</a>
          <button class="btn btn-secondary" onclick="window._5w_restart()">Újrakezdés</button>
        </div>
      </div>`;

    window.fbAnalytics?.track('tool_completed', { tool_name: '5whys' });
  }

  window._5w_ai_analyze = async function () {
    const btn = document.getElementById('ai-btn');
    const content = document.getElementById('ai-feedback-content');
    if (btn) btn.disabled = true;

    content.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;color:var(--color-muted);font-size:14px;">
        <div style="display:flex;gap:4px;">
          <span style="width:6px;height:6px;border-radius:50%;background:var(--color-green);animation:pulse 1.2s ease-in-out infinite;display:inline-block;"></span>
          <span style="width:6px;height:6px;border-radius:50%;background:var(--color-green);animation:pulse 1.2s ease-in-out infinite 0.2s;display:inline-block;"></span>
          <span style="width:6px;height:6px;border-radius:50%;background:var(--color-green);animation:pulse 1.2s ease-in-out infinite 0.4s;display:inline-block;"></span>
        </div>
        Elemzés folyamatban...
      </div>`;

    // CSS animáció inline (ha nem töltött be a main.css)
    if (!document.getElementById('pulse-style')) {
      const style = document.createElement('style');
      style.id = 'pulse-style';
      style.textContent = '@keyframes pulse{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}';
      document.head.appendChild(style);
    }

    try {
      const res = await fetch('/api/analyze-why', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem, whys, root_cause: whys[whys.length - 1] })
      });
      const data = await res.json();

      if (res.ok && data.feedback) {
        content.innerHTML = `
          <div style="font-size:14px;line-height:1.7;color:var(--color-text);white-space:pre-wrap;">${data.feedback}</div>
          <p style="font-size:11px;color:var(--color-muted);margin-top:12px;">AI-asszisztált elemzés — Footbridge 3 szűrős módszertan alapján.</p>`;
      } else {
        content.innerHTML = `<p style="font-size:14px;color:var(--color-muted);">Az AI-elemzés most nem elérhető. Írj nekünk: <a href="mailto:hello@footbridge.hu" style="color:var(--color-green);">hello@footbridge.hu</a></p>`;
      }
    } catch {
      content.innerHTML = `<p style="font-size:14px;color:var(--color-muted);">Hálózati hiba. Próbáld újra, vagy írj: <a href="mailto:hello@footbridge.hu" style="color:var(--color-green);">hello@footbridge.hu</a></p>`;
    }
  };

  window._5w_restart = function () {
    step = 0; problem = ''; whys = [];
    render();
  };

  render();
})();
