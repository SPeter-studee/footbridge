/* Footbridge — McKinsey 7S önértékelő */
(function() {
  const container = document.getElementById('tool-container');
  if (!container) return;

  const dimensions = [
    { key: 'strategy', label: 'Stratégia', desc: 'Mennyire világos és dokumentált a céged stratégiája?' },
    { key: 'structure', label: 'Struktúra', desc: 'Mennyire átlátható a szervezeti felépítés és a felelősségi körök?' },
    { key: 'systems', label: 'Rendszerek', desc: 'Mennyire támogatják a belső folyamatok és szoftverek a munkát?' },
    { key: 'shared_values', label: 'Megosztott értékek', desc: 'Mennyire osztják a munkatársak a cég értékeit és kultúráját?' },
    { key: 'skills', label: 'Képességek', desc: 'Mennyire rendelkezik a csapat a szükséges kompetenciákkal?' },
    { key: 'style', label: 'Stílus', desc: 'Mennyire hatékony a vezetési és kommunikációs stílus?' },
    { key: 'staff', label: 'Munkatársak', desc: 'Mennyire elégedett a csapat, és mennyire alacsony a fluktuáció?' }
  ];

  let scores = {};
  let phase = 'questions';

  function renderQuestions() {
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:20px;" id="7s-questions">
        ${dimensions.map(d => `
          <div>
            <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
              <label style="font-weight:500;">${d.label}</label>
              <span id="score-${d.key}" style="font-size:13px;color:var(--color-green);font-weight:500;">—</span>
            </div>
            <p style="font-size:13px;color:var(--color-muted);margin-bottom:10px);">${d.desc}</p>
            <div style="display:flex;gap:6px;">
              ${[1,2,3,4,5].map(n => `
                <button
                  onclick="window._7s_score('${d.key}', ${n}, this)"
                  data-key="${d.key}" data-val="${n}"
                  style="width:44px;height:44px;border:0.5px solid var(--color-border);background:var(--color-bg);font-family:var(--font-body);font-size:15px;cursor:pointer;transition:all 150ms;"
                  onmouseover="this.style.background='var(--color-surface)'"
                  onmouseout="if(!this.classList.contains('selected'))this.style.background='var(--color-bg)'"
                >${n}</button>
              `).join('')}
              <span style="font-size:12px;color:var(--color-muted);align-self:center;margin-left:4px;">1=gyenge · 5=kiváló</span>
            </div>
          </div>
        `).join('')}
        <button onclick="window._7s_submit()" id="7s-submit" style="margin-top:8px;" class="btn btn-primary" disabled>Eredmény megtekintése →</button>
      </div>
    `;
  }

  window._7s_score = function(key, val, btn) {
    scores[key] = val;
    // Vizuális visszajelzés
    document.querySelectorAll(`[data-key="${key}"]`).forEach(b => {
      b.classList.remove('selected');
      b.style.background = 'var(--color-bg)';
      b.style.borderColor = 'var(--color-border)';
    });
    btn.classList.add('selected');
    btn.style.background = 'var(--color-green)';
    btn.style.borderColor = 'var(--color-green)';
    btn.style.color = '#FAF8F3';
    document.getElementById(`score-${key}`).textContent = val + '/5';

    // Submit engedélyezése ha mind megvan
    if (Object.keys(scores).length === dimensions.length) {
      document.getElementById('7s-submit').disabled = false;
    }
  };

  window._7s_submit = function() {
    const avg = Object.values(scores).reduce((a,b) => a+b, 0) / dimensions.length;
    const weak = dimensions.filter(d => scores[d.key] <= 2).map(d => d.label);
    const strong = dimensions.filter(d => scores[d.key] >= 4).map(d => d.label);

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:24px;">
        <div style="padding:24px;border:0.5px solid var(--color-green);text-align:center;">
          <p class="eyebrow" style="margin-bottom:8px;">Összesített eredmény</p>
          <p style="font-size:48px;font-weight:500;color:var(--color-green);">${avg.toFixed(1)}<span style="font-size:20px;color:var(--color-muted)">/5</span></p>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
          ${dimensions.map(d => `
            <div style="padding:14px 16px;background:var(--color-surface);">
              <p style="font-size:12px;color:var(--color-muted);margin-bottom:4px;">${d.label}</p>
              <div style="height:4px;background:var(--color-border);border-radius:2px;margin-bottom:4px;">
                <div style="height:4px;background:${scores[d.key]<=2?'var(--color-coral)':scores[d.key]>=4?'var(--color-green)':'var(--color-muted)'};width:${scores[d.key]*20}%;border-radius:2px;"></div>
              </div>
              <p style="font-size:13px;font-weight:500;">${scores[d.key]}/5</p>
            </div>
          `).join('')}
        </div>
        ${weak.length > 0 ? `<div style="padding:16px;border-left:2px solid var(--color-coral);"><p style="font-weight:500;margin-bottom:4px;">Fejlesztési területek</p><p style="font-size:13px;color:var(--color-muted);">${weak.join(', ')}</p></div>` : ''}
        ${strong.length > 0 ? `<div style="padding:16px;border-left:2px solid var(--color-green);"><p style="font-weight:500;margin-bottom:4px;">Erős területek</p><p style="font-size:13px;color:var(--color-muted);">${strong.join(', ')}</p></div>` : ''}
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="/kapcsolat" class="btn btn-primary">Beszéljünk az eredményről →</a>
          <button onclick="window._7s_restart()" class="btn btn-secondary">Újrakezdés</button>
        </div>
      </div>
    `;
    window.fbAnalytics?.track('tool_completed', { tool_name: '7s', result_score: Math.round(avg * 10) });
  };

  window._7s_restart = function() {
    scores = {};
    renderQuestions();
  };

  window.fbAnalytics?.track('tool_started', { tool_name: '7s' });
  renderQuestions();
})();
