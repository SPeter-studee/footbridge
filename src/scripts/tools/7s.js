/* Footbridge — McKinsey 7S önértékelő
   Interaktív pókháló + AI elemzés Anthropic API-n keresztül */

(function () {
  const DIMS = [
    { key: 'strategy',     hu: 'Stratégia',      en: 'Strategy',      sub: 'Víziód és versenyelőnyöd tisztasága' },
    { key: 'structure',    hu: 'Struktúra',       en: 'Structure',     sub: 'Szervezeti felépítés, felelősségi körök' },
    { key: 'systems',      hu: 'Rendszerek',      en: 'Systems',       sub: 'Folyamatok, szoftverek, automatizáció' },
    { key: 'shared_values',hu: 'Közös értékek',   en: 'Shared Values', sub: 'Kultúra, misszió, amit mindenki vall' },
    { key: 'skills',       hu: 'Kompetenciák',    en: 'Skills',        sub: 'Csapat tudása, fejlesztési igények' },
    { key: 'style',        hu: 'Vezetési stílus', en: 'Style',         sub: 'Hogyan vezetnek, hogyan döntenek' },
    { key: 'staff',        hu: 'Emberek',         en: 'Staff',         sub: 'Tehetség, motiváció, fluktuáció' }
  ];

  let scores = {};
  DIMS.forEach(d => scores[d.key] = 3);

  // ── Pókháló rajzoló ──────────────────────────────────────
  function drawRadar(canvasId, vals, size) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const n = DIMS.length;
    const cx = size / 2, cy = size / 2;
    const maxR = size * 0.36;
    const labelR = size * 0.46;

    ctx.clearRect(0, 0, size, size);

    // Háttér rácsvonalak
    for (let level = 1; level <= 5; level++) {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const r = (maxR * level) / 5;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = level === 5 ? '#E8E3D4' : '#F0EDE6';
      ctx.lineWidth = level === 5 ? 1 : 0.5;
      ctx.stroke();
      if (level === 5) {
        ctx.fillStyle = 'rgba(250,248,243,0.0)';
        ctx.fill();
      }
    }

    // Sugarak
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(angle), cy + maxR * Math.sin(angle));
      ctx.strokeStyle = '#E8E3D4';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    // Adat-terület
    ctx.beginPath();
    DIMS.forEach((d, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = (maxR * (vals[d.key] || 1)) / 5;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = 'rgba(31,77,58,0.12)';
    ctx.fill();
    ctx.strokeStyle = '#1F4D3A';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Pontok
    DIMS.forEach((d, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const r = (maxR * (vals[d.key] || 1)) / 5;
      ctx.beginPath();
      ctx.arc(cx + r * Math.cos(angle), cy + r * Math.sin(angle), 4, 0, Math.PI * 2);
      ctx.fillStyle = '#1F4D3A';
      ctx.fill();
    });

    // Feliratok
    ctx.font = `500 ${size < 300 ? 10 : 11}px Inter, sans-serif`;
    ctx.fillStyle = '#888781';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    DIMS.forEach((d, i) => {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const x = cx + labelR * Math.cos(angle);
      const y = cy + labelR * Math.sin(angle);
      ctx.fillText(d.en.toUpperCase(), x, y);
    });
  }

  // ── Csúszkák renderelése ──────────────────────────────────
  function renderSliders() {
    const container = document.getElementById('sliders');
    if (!container) return;
    container.innerHTML = DIMS.map(d => `
      <div class="slider-row">
        <label class="slider-label" for="s-${d.key}">
          ${d.hu}
          <span class="slider-sub">${d.sub}</span>
        </label>
        <input type="range" id="s-${d.key}" min="1" max="5" step="1" value="${scores[d.key]}"
          oninput="window._7s_update('${d.key}', this.value)">
        <span class="score-val" id="v-${d.key}">${scores[d.key]}</span>
      </div>
    `).join('');
  }

  window._7s_update = function (key, val) {
    scores[key] = parseInt(val);
    document.getElementById('v-' + key).textContent = val;
    const avg = (Object.values(scores).reduce((a, b) => a + b, 0) / DIMS.length).toFixed(1);
    document.getElementById('avg-score').textContent = avg + '/5';
    // Frissítjük a /5 szövegét
    document.getElementById('avg-score').innerHTML = avg + '<span style="font-size:16px;color:var(--color-muted)">/5</span>';
    drawRadar('radar-canvas', scores, 320);
  };

  // ── Fázisváltás ───────────────────────────────────────────
  function showPhase(n) {
    document.querySelectorAll('.phase').forEach(p => p.classList.remove('active'));
    document.getElementById('phase-' + n).classList.add('active');
  }

  document.getElementById('to-phase-2')?.addEventListener('click', () => {
    showPhase(2);
    window.fbAnalytics?.track('tool_started', { tool_name: '7s' });
  });

  document.getElementById('back-to-1')?.addEventListener('click', () => showPhase(1));

  document.getElementById('restart-7s')?.addEventListener('click', () => {
    DIMS.forEach(d => scores[d.key] = 3);
    renderSliders();
    drawRadar('radar-canvas', scores, 320);
    document.getElementById('avg-score').innerHTML = '3.0<span style="font-size:16px;color:var(--color-muted)">/5</span>';
    showPhase(1);
  });

  // ── AI elemzés kérése ─────────────────────────────────────
  document.getElementById('submit-analysis')?.addEventListener('click', async () => {
    const email = document.getElementById('user-email').value.trim();
    const company = document.getElementById('company-name').value.trim();
    const errEl = document.getElementById('email-error');

    if (!email || !email.includes('@')) {
      errEl.textContent = 'Kérlek, adj meg érvényes e-mail-címet.';
      errEl.style.display = 'block';
      return;
    }
    errEl.style.display = 'none';

    showPhase(3);

    try {
      const res = await fetch('/api/analyze-7s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores, email, company })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Hiba');

      // Eredmény megjelenítése
      renderResult(data.analysis, data.scores);
      showPhase(4);
      drawRadar('result-radar', scores, 280);
      window.fbAnalytics?.track('tool_completed', { tool_name: '7s' });

    } catch (err) {
      showPhase(2);
      document.getElementById('email-error').textContent = 'Valami nem ment jól: ' + err.message + '. Próbáld újra.';
      document.getElementById('email-error').style.display = 'block';
    }
  });

  function renderResult(analysis, scoresData) {
    // Score összefoglaló
    const sortedDims = [...DIMS].sort((a, b) => scores[b.key] - scores[a.key]);
    const summaryEl = document.getElementById('score-summary');
    summaryEl.innerHTML = sortedDims.map(d => `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;margin-bottom:3px;">
            <span style="font-size:13px;font-weight:500;">${d.hu}</span>
            <span style="font-size:13px;color:${scores[d.key]<=2?'var(--color-coral)':scores[d.key]>=4?'var(--color-green)':'var(--color-muted)'};">${scores[d.key]}/5</span>
          </div>
          <div style="height:3px;background:var(--color-border);border-radius:2px;">
            <div style="height:3px;background:${scores[d.key]<=2?'var(--color-coral)':scores[d.key]>=4?'var(--color-green)':'var(--color-muted)'};border-radius:2px;width:${scores[d.key]*20}%;transition:width 500ms;"></div>
          </div>
        </div>
      </div>
    `).join('');

    // AI elemzés
    const aiEl = document.getElementById('ai-result');
    aiEl.innerHTML = `
      <div style="border:0.5px solid var(--color-border);padding:28px;">
        <p class="eyebrow" style="margin-bottom:12px;">AI elemzés</p>
        <div style="font-size:15px;line-height:1.7;color:var(--color-text);white-space:pre-wrap;">${analysis}</div>
        <p style="font-size:11px;color:var(--color-muted);margin-top:16px;padding-top:12px;border-top:0.5px solid var(--color-border);">
          AI-asszisztált elemzés — Footbridge módszertanon alapulva. Az elemzést emberi szem is átnézi, mielőtt felvesszük veled a kapcsolatot.
        </p>
      </div>
    `;
  }

  // ── Init ──────────────────────────────────────────────────
  renderSliders();
  drawRadar('radar-canvas', scores, 320);

})();
