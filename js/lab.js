// Terminal scénarisé : chaque étape attend une commande (regex) et renvoie une sortie écrite à l'avance.
function colorize(out) {
  return esc(out).split('\n').map(l => {
    if (/\b(error|erreur|failed|fatal|denied|crashloop|critical)\b/i.test(l)) return `<span class="t-bad">${l}</span>`;
    if (/\b(warn|warning|pending|changed)\b/i.test(l)) return `<span class="t-warn">${l}</span>`;
    if (/\b(ok|running|ready|success|succeeded|created|synced|healthy|active|passed|deployed|✓)\b/i.test(l)) return `<span class="t-ok">${l}</span>`;
    return l;
  }).join('\n');
}

function mountLab(el, m, onDone) {
  const lab = m.lab, steps = lab.steps;
  let i = 0, fails = 0;
  const hist = []; let hi = 0;
  const prompt = lab.prompt || `apprenti@${m.id}:~$`;
  el.innerHTML = `<div class="prose"><p>${inline(lab.ctx)}</p></div>
  <div class="lab">
    <div class="tasks box" id="lab-tasks"></div>
    <div>
      <div class="term">
        <div class="term-bar"><i></i><i></i><i></i><span>terminal simulé · ${esc(m.name)}</span></div>
        <div class="term-out" id="lab-out" tabindex="0"></div>
        <form class="term-in" id="lab-form" autocomplete="off"><span>${esc(prompt)}</span><input id="lab-in" spellcheck="false" autocapitalize="off" aria-label="Commande"></form>
      </div>
      <div class="term-keys">
        <button class="btn sm" id="lab-hint">Afficher la solution</button>
        <button class="btn sm" id="lab-reset">Recommencer</button>
      </div>
    </div>
  </div>`;
  const out = $('#lab-out', el), inp = $('#lab-in', el);
  const print = html => { out.insertAdjacentHTML('beforeend', html + '\n'); out.scrollTop = out.scrollHeight; };
  const tasks = () => {
    $('#lab-tasks', el).innerHTML = steps.map((s, n) => `<div class="task ${n < i ? 'ok' : n === i ? 'now' : ''}"><b>${n < i ? '✓' : n + 1}</b><span>${inline(s[0])}</span></div>`).join('');
  };
  const intro = () => {
    out.innerHTML = '';
    print(`<span class="t-mute">Terminal d'entraînement : les commandes sont vérifiées, mais rien n'est réellement exécuté.
Tape « aide » pour la liste des commandes de ce terminal.</span>`);
    print(`<span class="t-blue">→ ${esc(steps[0][0].replace(/`/g, ''))}</span>`);
  };
  function run(raw) {
    const cmd = raw.trim().replace(/\s+/g, ' ');
    print(`<span class="t-ok">${esc(prompt)}</span> <span class="t-cmd">${esc(raw)}</span>`);
    if (!cmd) return;
    if (cmd === 'clear') { out.innerHTML = ''; return; }
    if (cmd === 'aide' || cmd === 'help') { print('<span class="t-mute">aide · solution · clear · flèche haut pour l\'historique</span>'); return; }
    if (i >= steps.length) { print('<span class="t-ok">Labo terminé. Passe à l\'étape suivante.</span>'); return; }
    const st = steps[i];
    if (cmd === 'solution') { print(`<span class="t-warn">Solution : ${esc(st[2])}</span>`); return; }
    if (new RegExp(st[1]).test(cmd)) {
      if (st[3]) print(colorize(st[3]));
      i++; fails = 0; tasks();
      if (i === steps.length) { print('\n<span class="t-ok">✓ Labo réussi.</span>'); onDone(); }
      else print(`<span class="t-blue">→ ${esc(steps[i][0].replace(/`/g, ''))}</span>`);
      return;
    }
    fails++;
    const same = cmd.split(' ')[0] === st[2].split(' ')[0];
    print(`<span class="t-bad">${same ? 'Bon outil, mais les arguments ne correspondent pas à la tâche.' : 'Cette commande ne fait pas avancer la tâche en cours.'}</span>`);
    if (fails >= 2) print(`<span class="t-mute">Indice : ${esc(st[2].split(' ').slice(0, 2).join(' '))} …</span>`);
  }
  $('#lab-form', el).addEventListener('submit', e => {
    e.preventDefault();
    if (inp.value.trim()) hist.push(inp.value);
    hi = hist.length; run(inp.value); inp.value = '';
  });
  inp.addEventListener('keydown', e => {
    if (e.key === 'ArrowUp' && hi > 0) { inp.value = hist[--hi]; e.preventDefault(); }
    if (e.key === 'ArrowDown') { hi = Math.min(hist.length, hi + 1); inp.value = hist[hi] || ''; e.preventDefault(); }
  });
  $('#lab-hint', el).onclick = () => { if (i < steps.length) { inp.value = steps[i][2]; inp.focus(); } };
  $('#lab-reset', el).onclick = () => { i = 0; fails = 0; tasks(); intro(); };
  out.onclick = () => { if (!String(window.getSelection())) inp.focus(); };
  tasks(); intro();
}
