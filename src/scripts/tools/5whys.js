/* Footbridge — 5 Whys gyökérok-elemző */
(function() {
  const container = document.getElementById('tool-container');
  if (!container) return;

  let step = 0;
  let problem = '';
  let whys = [];

  const symptomatic_keywords = ['mert','azért','nem tudom','nem','nincs','lassú','késik','hiba','hibás'];

  function isSymptomatic(answer) {
    const lower = answer.toLowerCase();
    return answer.length < 20 || symptomatic_keywords.some(k => lower.startsWith(k));
  }

  function render() {
    if (step === 0) {
      container.innerHTML = `
        <div>
          <h2 style="margin-bottom:12px;">Mi a konkrét probléma?</h2>
          <p style="color:var(--color-muted);margin-bottom:20px;font-size:14px;">Legyen minél konkrétabb — nem "lassú a folyamat", hanem "a számlafeldolgozás 15 munkanapot vesz igénybe".</p>
          <textarea id="problem-input" class="form-textarea" placeholder="Pl. A számlafeldolgozás 15 munkanapot vesz igénybe, és sok benne a hibás adat..." style="margin-bottom:16px;"></textarea>
          <button class="btn btn-primary" onclick="window._5w_next()">Tovább →</button>
        </div>
      `;
    } else if (step <= 5) {
      const prev = step === 1 ? problem : whys[whys.length - 1];
      container.innerHTML = `
        <div>
          <div style="height:3px;background:var(--color-border);border-radius:2px;margin-bottom:24px;">
            <div style="height:3px;background:var(--color-green);border-radius:2px;width:${step * 20}%;transition:width 300ms;"></div>
          </div>
          <p style="font-size:12px;color:var(--color-muted);margin-bottom:8px;">${step}. miért</p>
          <h2 style="margin-bottom:8px;">Miért van ez?</h2>
          <div style="padding:12px 16px;background:var(--color-surface);margin-bottom:20px;font-size:14px;color:var(--color-muted);">"${prev}"</div>
          <textarea id="why-input" class="form-textarea" placeholder="Mert..." style="margin-bottom:8px;"></textarea>
          <p id="why-hint" style="font-size:13px;color:var(--color-coral);display:none;margin-bottom:12px;"></p>
          <div style="display:flex;gap:12px;">
            <button class="btn btn-primary" onclick="window._5w_next()">Tovább →</button>
            ${step >= 3 ? `<button class="btn btn-secondary" onclick="window._5w_finish()">Megvan a gyökérok</button>` : ''}
          </div>
        </div>
      `;
    } else {
      renderResult();
    }
  }

  window._5w_next = function() {
    if (step === 0) {
      problem = document.getElementById('problem-input')?.value?.trim();
      if (!problem || problem.length < 10) { alert('Kérlek, írj egy konkrétabb problémát.'); return; }
      step = 1;
    } else {
      const answer = document.getElementById('why-input')?.value?.trim();
      if (!answer || answer.length < 5) { alert('Kérlek, válaszolj a kérdésre.'); return; }

      if (isSymptomatic(answer)) {
        const hint = document.getElementById('why-hint');
        if (hint) {
          hint.textContent = 'Ez inkább egy tünet, mint ok. Próbáld meg mélyebbre menni — mi áll ennek hátterében?';
          hint.style.display = 'block';
        }
        return;
      }

      whys.push(answer);
      if (step >= 5) { renderResult(); return; }
      step++;
    }
    render();
  };

  window._5w_finish = function() {
    const answer = document.getElementById('why-input')?.value?.trim();
    if (answer) whys.push(answer);
    renderResult();
  };

  function renderResult() {
    const rootCause = whys[whys.length - 1];
    container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:24px;">
        <div style="padding:24px;border:0.5px solid var(--color-green);">
          <p class="eyebrow" style="margin-bottom:8px;">Valószínű gyökérok</p>
          <p style="font-size:18px;font-weight:500;">"${rootCause}"</p>
        </div>
        <div>
          <p class="eyebrow" style="margin-bottom:12px;">Az okozati lánc</p>
          <div style="display:flex;flex-direction:column;gap:4px;">
            <div style="padding:10px 14px;background:var(--color-surface);font-size:13px;color:var(--color-muted);">Probléma: "${problem}"</div>
            ${whys.map((w, i) => `<div style="padding:10px 14px;background:var(--color-surface);font-size:13px;border-left:2px solid ${i===whys.length-1?'var(--color-green)':'var(--color-border)'};">Miért ${i+1}: "${w}"</div>`).join('')}
          </div>
        </div>
        <div style="padding:16px;background:var(--color-surface);">
          <p style="font-size:13px;color:var(--color-muted);">Ha a gyökérok nem stimmel, próbáld meg újra — más irányból megközelítve a problémát.</p>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a href="/kapcsolat" class="btn btn-primary">Beszéljünk a megoldásról →</a>
          <button onclick="window._5w_restart()" class="btn btn-secondary">Újrakezdés</button>
        </div>
      </div>
    `;
    window.fbAnalytics?.track('tool_completed', { tool_name: '5whys' });
  }

  window._5w_restart = function() {
    step = 0; problem = ''; whys = [];
    render();
  };

  window.fbAnalytics?.track('tool_started', { tool_name: '5whys' });
  render();
})();
