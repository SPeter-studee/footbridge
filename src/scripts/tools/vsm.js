/* Footbridge — VSM értékáram-térkép */
(function() {
  const container = document.getElementById('tool-container');
  if (!container) return;

  let steps = [];
  let phase = 'input';

  function calcPCE() {
    const totalTime = steps.reduce((s, step) => s + (Number(step.time) || 0), 0);
    const valueTime = steps.filter(s => s.type === 'value').reduce((s, step) => s + (Number(step.time) || 0), 0);
    return totalTime > 0 ? (valueTime / totalTime * 100).toFixed(1) : 0;
  }

  function render() {
    const pce = steps.length > 0 ? calcPCE() : null;
    const biggestWaste = steps.filter(s => s.type === 'waste').sort((a,b) => b.time - a.time)[0];

    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:24px;">

        <div>
          <h3 style="margin-bottom:16px;">Folyamati lépések</h3>
          ${steps.map((s, i) => `
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;padding:10px 14px;background:${s.type==='value'?'rgba(31,77,58,0.06)':s.type==='waste'?'rgba(196,98,45,0.06)':'var(--color-surface)'};">
              <span style="font-size:13px;flex:1;">${s.name}</span>
              <span style="font-size:12px;color:var(--color-muted);">${s.time} óra</span>
              <span style="font-size:11px;padding:2px 8px;border-radius:3px;background:${s.type==='value'?'var(--color-green)':s.type==='waste'?'var(--color-coral)':'var(--color-muted)'};color:#FAF8F3;">${s.type==='value'?'Értékes':s.type==='waste'?'Pazarlás':'Szükséges'}</span>
              <button onclick="window._vsm_remove(${i})" style="background:none;border:none;color:var(--color-muted);cursor:pointer;font-size:16px;line-height:1;">×</button>
            </div>
          `).join('')}
        </div>

        <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;align-items:end;">
          <div>
            <label class="form-label" for="step-name">Lépés neve</label>
            <input class="form-input" id="step-name" placeholder="Pl. Értékesítői ajánlat elkészítése">
          </div>
          <div>
            <label class="form-label" for="step-time">Idő (óra)</label>
            <input class="form-input" id="step-time" type="number" min="0.1" step="0.1" placeholder="2.5">
          </div>
          <div>
            <label class="form-label" for="step-type">Típus</label>
            <select class="form-select" id="step-type">
              <option value="value">Értékes</option>
              <option value="necessary">Szükséges</option>
              <option value="waste">Pazarlás</option>
            </select>
          </div>
          <button class="btn btn-secondary" onclick="window._vsm_add()" style="align-self:flex-end;">+ Hozzáad</button>
        </div>

        ${steps.length >= 2 ? `
          <div style="padding:20px;border:0.5px solid var(--color-green);">
            <p class="eyebrow" style="margin-bottom:12px;">PCE — Process Cycle Efficiency</p>
            <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:8px;">
              <p style="font-size:40px;font-weight:500;color:var(--color-green);">${pce}%</p>
              <p style="color:var(--color-muted);">hozzáadott értéket teremtő arány</p>
            </div>
            <div style="height:8px;background:var(--color-border);border-radius:4px;margin-bottom:8px;">
              <div style="height:8px;background:${pce>50?'var(--color-green)':'var(--color-coral)'};border-radius:4px;width:${pce}%;transition:width 300ms;"></div>
            </div>
            <p style="font-size:12px;color:var(--color-muted);">Iparági átlag: 15-40%. Lean-célérték: 80%+</p>
            ${biggestWaste ? `
              <div style="margin-top:12px;padding:10px 14px;background:rgba(196,98,45,0.06);border-left:2px solid var(--color-coral);">
                <p style="font-size:13px;font-weight:500;">Legnagyobb pazarlás: "${biggestWaste.name}" — ${biggestWaste.time} óra</p>
                <p style="font-size:12px;color:var(--color-muted);margin-top:2px;">Innen érdemes elkezdeni a 3 szűrő alkalmazását.</p>
              </div>
            ` : ''}
          </div>
        ` : `<p style="font-size:13px;color:var(--color-muted);">Adj hozzá legalább 2 lépést a PCE-számításhoz.</p>`}

        ${steps.length >= 3 ? `
          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <a href="/kapcsolat" class="btn btn-primary">Beszéljünk az eredményről →</a>
          </div>
        ` : ''}

      </div>
    `;
  }

  window._vsm_add = function() {
    const name = document.getElementById('step-name')?.value?.trim();
    const time = parseFloat(document.getElementById('step-time')?.value);
    const type = document.getElementById('step-type')?.value;
    if (!name || !time || time <= 0) { alert('Töltsd ki a lépés nevét és idejét.'); return; }
    steps.push({ name, time, type });
    if (steps.length === 1) window.fbAnalytics?.track('tool_started', { tool_name: 'vsm' });
    if (steps.length === 3) window.fbAnalytics?.track('tool_completed', { tool_name: 'vsm' });
    render();
  };

  window._vsm_remove = function(i) {
    steps.splice(i, 1);
    render();
  };

  render();
})();
