/* Footbridge — Projekt healthcheck */
(function() {
  const container = document.getElementById('tool-container');
  if (!container) return;

  const questions = [
    { id: 'q1', text: 'Van-e egy konkrétan definiált projekt-scope (mit, meddig, mennyiért)?', type: 'bool' },
    { id: 'q2', text: 'Tudja-e minden stakeholder, ki a végső döntéshozó?', type: 'bool' },
    { id: 'q3', text: 'Van-e heti rendszeres státusz-kommunikáció a csapat és az ügyvezető között?', type: 'bool' },
    { id: 'q4', text: 'Volt-e valamilyen csúszás az eredetileg tervezett ütemtervhez képest?', type: 'bool_inv' },
    { id: 'q5', text: 'Mikor kell élesednie a projektnek?', type: 'urgency', options: ['1 hónapon belül','1-3 hónap','3+ hónap','Nincs konkrét határidő'] },
    { id: 'q6', text: 'Hogyan érzed, mennyire valószínű, hogy a projekt a jelenlegi formájában sikeres lesz?', type: 'scale' },
    { id: 'q7', text: 'E-mail-cím (4 órán belül visszahívunk)', type: 'email' }
  ];

  let answers = {};
  let currentQ = 0;

  function render() {
    if (currentQ >= questions.length) { renderSubmit(); return; }
    const q = questions[currentQ];

    let inputHtml = '';
    if (q.type === 'bool' || q.type === 'bool_inv') {
      inputHtml = `<div style="display:flex;gap:12px;margin-top:16px;">
        <button class="btn btn-secondary" style="flex:1;" onclick="window._hc_answer('${q.id}','igen')">Igen</button>
        <button class="btn btn-secondary" style="flex:1;" onclick="window._hc_answer('${q.id}','nem')">Nem</button>
      </div>`;
    } else if (q.type === 'urgency') {
      inputHtml = `<div style="display:flex;flex-direction:column;gap:8px;margin-top:16px;">
        ${q.options.map(o => `<button class="btn btn-secondary" onclick="window._hc_answer('${q.id}','${o}')" style="text-align:left;">${o}</button>`).join('')}
      </div>`;
    } else if (q.type === 'scale') {
      inputHtml = `<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">
        ${[1,2,3,4,5].map(n => `<button onclick="window._hc_answer('${q.id}','${n}')" style="width:52px;height:52px;border:0.5px solid var(--color-border);background:var(--color-bg);font-family:var(--font-body);font-size:18px;cursor:pointer;transition:all 150ms;" onmouseover="this.style.borderColor='var(--color-text)'" onmouseout="this.style.borderColor='var(--color-border)'">${n}</button>`).join('')}
        <p style="font-size:12px;color:var(--color-muted);align-self:center;">1=egyáltalán nem · 5=biztos siker</p>
      </div>`;
    } else if (q.type === 'email') {
      inputHtml = `<div style="margin-top:16px;"><input class="form-input" type="email" id="hc-email" placeholder="te@cegnev.hu" style="margin-bottom:12px;"><button class="btn btn-primary" onclick="window._hc_email_next()">Küldés és eredmény →</button></div>`;
    }

    container.innerHTML = `
      <div>
        <div style="height:3px;background:var(--color-border);border-radius:2px;margin-bottom:24px;">
          <div style="height:3px;background:var(--color-green);border-radius:2px;width:${(currentQ/questions.length)*100}%;transition:width 300ms;"></div>
        </div>
        <p style="font-size:12px;color:var(--color-muted);margin-bottom:8px;">${currentQ+1} / ${questions.length}</p>
        <h2 style="margin-bottom:4px;">${q.text}</h2>
        ${inputHtml}
      </div>
    `;
  }

  window._hc_answer = function(id, val) {
    answers[id] = val;
    currentQ++;
    render();
  };

  window._hc_email_next = function() {
    const email = document.getElementById('hc-email')?.value?.trim();
    if (!email || !email.includes('@')) { alert('Kérlek, add meg az e-mail-címedet.'); return; }
    answers.q7 = email;
    currentQ++;
    renderSubmit();
  };

  function calcScore() {
    let score = 0;
    if (answers.q1 === 'igen') score += 20;
    if (answers.q2 === 'igen') score += 20;
    if (answers.q3 === 'igen') score += 15;
    if (answers.q4 === 'nem') score += 15; // inversed
    const urgency = ['1 hónapon belül','1-3 hónap','3+ hónap','Nincs konkrét határidő'];
    score += (urgency.indexOf(answers.q5) + 1) * 3;
    score += (parseInt(answers.q6) || 1) * 5;
    return Math.min(score, 100);
  }

  function renderSubmit() {
    const score = calcScore();
    const email = answers.q7;
    const isUrgent = answers.q5 === '1 hónapon belül';

    // Küldés API-ra
    fetch('/api/healthcheck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, answers, score, urgency: answers.q5, source_url: '/eszkozok/healthcheck' })
    }).catch(() => {});

    window.fbAnalytics?.track('healthcheck_form_submitted', { urgency: answers.q5, score });

    container.innerHTML = `
      <div class="form-success">
        <h3 style="margin-bottom:12px;">Megkaptuk a healthcheck-et.</h3>
        <p style="font-size:14px;color:var(--color-muted);margin-bottom:16px;">${isUrgent ? '<strong>4 órán belül</strong>' : 'Egy munkanapon belül'} jelentkezünk a <strong>${email}</strong> e-mail-címen — konkrét javaslattal, vagy nyíltan elmondjuk, miért nem fér bele a kapacitásunkba.</p>
        <div style="padding:16px;background:var(--color-bg);border-radius:4px;margin-bottom:16px;">
          <p style="font-size:12px;color:var(--color-muted);margin-bottom:4px;">Projekt-egészség mutató</p>
          <div style="height:6px;background:var(--color-border);border-radius:3px;margin-bottom:6px;">
            <div style="height:6px;background:${score>60?'var(--color-green)':score>40?'var(--color-muted)':'var(--color-coral)'};border-radius:3px;width:${score}%;"></div>
          </div>
          <p style="font-size:20px;font-weight:500;">${score}/100</p>
        </div>
        <a href="/szolgaltatasok/projektmenedzsment" class="btn btn-ghost">PM-szolgáltatás aloldal →</a>
      </div>
    `;
  }

  window.fbAnalytics?.track('tool_started', { tool_name: 'healthcheck' });
  render();
})();
