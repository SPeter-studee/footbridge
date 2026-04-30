/* Footbridge — 3-kérdéses diagnoszt */
(function() {
  const container = document.getElementById('tool-container');
  if (!container) return;

  const questions = [
    {
      id: 'q1',
      text: 'Hány fős a céged?',
      options: [
        { value: 'micro', label: '1–50 fő' },
        { value: 'small', label: '50–100 fő' },
        { value: 'medium', label: '100–300 fő' },
        { value: 'large', label: '300–500 fő' },
        { value: 'xlarge', label: '500+ fő' }
      ]
    },
    {
      id: 'q2',
      text: 'Mi okozza a legnagyobb gondot most?',
      options: [
        { value: 'manual', label: 'Sok manuális, ismétlődő munka' },
        { value: 'data', label: 'Széttagolt adatok, sok rendszer' },
        { value: 'legacy', label: 'Régi rendszer, amit nehéz karbantartani' },
        { value: 'custom', label: 'Nincs megfelelő szoftver a folyamatunkra' },
        { value: 'pm', label: 'Egy projekt elakadt, PM-re van szükségünk' }
      ]
    },
    {
      id: 'q3',
      text: 'Mikor szeretnél elindulni?',
      options: [
        { value: 'now', label: '1 hónapon belül' },
        { value: 'soon', label: '1–3 hónap múlva' },
        { value: 'later', label: '3+ hónap múlva' },
        { value: 'thinking', label: 'Még csak gondolkodom' }
      ]
    }
  ];

  const recommendations = {
    manual: { url: '/megoldasok/manualis-folyamatok', text: 'Manuális folyamatok →' },
    data:   { url: '/megoldasok/adatok-szettagoltsaga', text: 'Adatok széttagoltsága →' },
    legacy: { url: '/megoldasok/regi-rendszerek', text: 'Régi rendszerek →' },
    custom: { url: '/megoldasok/egyedi-szoftver', text: 'Egyedi szoftver →' },
    pm:     { url: '/szolgaltatasok/projektmenedzsment', text: 'E2E projektmenedzsment →' }
  };

  let answers = {};
  let currentQ = 0;

  function render() {
    if (currentQ < questions.length) {
      renderQuestion(questions[currentQ]);
    } else {
      renderResult();
    }
  }

  function renderQuestion(q) {
    container.innerHTML = `
      <div style="margin-bottom:24px;">
        <p style="font-size:12px;color:var(--color-muted);margin-bottom:8px;">${currentQ + 1} / ${questions.length}</p>
        <div style="height:3px;background:var(--color-border);border-radius:2px;margin-bottom:24px;">
          <div style="height:3px;background:var(--color-green);border-radius:2px;width:${((currentQ + 1) / questions.length) * 100}%;transition:width 300ms;"></div>
        </div>
        <h2 style="margin-bottom:20px;">${q.text}</h2>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${q.options.map(opt => `
          <button
            onclick="window._fb_selectAnswer('${q.id}', '${opt.value}')"
            style="text-align:left;padding:14px 18px;border:0.5px solid var(--color-border);background:var(--color-bg);font-family:var(--font-body);font-size:15px;cursor:pointer;transition:all 150ms;"
            onmouseover="this.style.borderColor='var(--color-text)'"
            onmouseout="this.style.borderColor='var(--color-border)'"
          >${opt.label}</button>
        `).join('')}
      </div>
    `;
  }

  function renderResult() {
    const rec = recommendations[answers.q2] || { url: '/kapcsolat', text: 'Kapcsolat →' };
    container.innerHTML = `
      <div style="padding:32px;border:0.5px solid var(--color-green);text-align:center;">
        <p style="font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:var(--color-green);margin-bottom:12px;">Ajánlásunk</p>
        <h2 style="margin-bottom:12px;">Nézd meg ezt az aloldalt</h2>
        <p style="color:var(--color-muted);margin-bottom:24px;">A válaszaid alapján ez a leginkább releváns a Footbridge-nél.</p>
        <a href="${rec.url}" class="btn btn-primary" style="margin-bottom:16px;">${rec.text}</a>
        <br>
        <a href="/kapcsolat" style="font-size:13px;color:var(--color-muted);text-decoration:none;">Vagy beszéljünk közvetlenül →</a>
      </div>
      <button onclick="window._fb_restart()" style="margin-top:16px;background:none;border:none;font-size:13px;color:var(--color-muted);cursor:pointer;text-decoration:underline;">Újrakezdés</button>
    `;
    window.fbAnalytics?.track('tool_completed', { tool_name: 'diagnoszt' });
  }

  window._fb_selectAnswer = function(qId, value) {
    answers[qId] = value;
    currentQ++;
    render();
  };

  window._fb_restart = function() {
    answers = {};
    currentQ = 0;
    render();
  };

  window.fbAnalytics?.track('tool_started', { tool_name: 'diagnoszt' });
  render();
})();
