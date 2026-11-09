// Vues et navigation. Le routeur lit location.hash : #techs, #docker.3, #u.0, etc.
const app = $('#app');
let cleanup = null;
const nav = [['home', 'Parcours'], ['techs', 'Technologies'], ['approches', 'Approches'], ['ultimes', 'Projets ultimes'], ['profil', 'Profil']];
const techs = () => CN.modules.filter(m => m.stage !== 'approches');
const approaches = () => CN.modules.filter(m => m.stage === 'approches');
const LV = [['Débutant', 'dev'], ['Intermédiaire', 'staging'], ['Avancé', 'prod']];
const SIMNAME = id => (window.SIMS[id] || {}).title || '';

function shell(active, body) {
  const theme = document.documentElement.dataset.theme;
  app.innerHTML = `<header class="top"><div class="wrap">
    <a class="logo" href="#home" aria-label="Cinq Neufs, accueil"><b>99,999</b>Cinq Neufs</a>
    <nav class="nav" aria-label="Navigation principale">${nav.map(([h, t]) => `<a href="#${h}"${h === active ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>
    <div class="stat"><a href="#profil" title="Expérience et disponibilité"><span>${P.s.xp} XP</span><span class="nines">${NINES[ninesWon()]} %</span></a>
    <button class="icon-btn" id="theme" aria-label="Changer de thème">${theme === 'dark' ? '☀' : '☾'}</button></div>
  </div></header><main>${body}</main>
  <footer class="ftr"><div class="wrap">Cinq Neufs · Parcours construit d'après la roadmap DevOps de <a href="https://roadmap.sh/devops" target="_blank" rel="noopener">roadmap.sh</a>. Les labos et simulateurs sont des reproductions pédagogiques : ils n'exécutent aucune commande réelle.</div></footer>`;
  $('#theme').onclick = () => {
    const dark = matchMedia('(prefers-color-scheme: dark)').matches;
    const cur = document.documentElement.dataset.theme || (dark ? 'dark' : 'light');
    document.documentElement.dataset.theme = cur === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY + '-theme', document.documentElement.dataset.theme); } catch { /* facultatif */ }
    route();
  };
}

/* ---------- Accueil ---------- */
function resumeTarget() {
  const last = P.s.last && CN.byId[P.s.last.split('.')[0]];
  if (last && !modDone(last)) return { m: last, href: '#' + P.s.last };
  const m = CN.modules.find(x => !modDone(x)) || CN.modules[0];
  return { m, href: '#' + m.id };
}
function viewHome() {
  const r = resumeTarget(), won = ninesWon(), rk = rank();
  const doneMods = CN.modules.filter(modDone).length;
  const map = CN.stages.map((s, i) => {
    const mods = CN.modules.filter(m => m.stage === s.id);
    return `<section class="stage" style="--c:${s.color}">
      <div class="stage-h"><span class="n">${String(i + 1).padStart(2, '0')}</span><h3>${s.name}</h3></div>
      <div class="stage-b">${mods.map(m => {
        const p = modPct(m);
        return `<a class="node${p === 100 ? ' done' : ''}" href="#${m.id}">${tile(m)}<span>${esc(m.name)}</span>${p > 0 && p < 100 ? `<span class="pct">${p}%</span>` : ''}</a>`;
      }).join('')}</div></section>`;
  }).join('');
  shell('home', `<section class="hero"><div class="wrap">
    <div><h1>De <code style="font-size:.8em">whoami</code> à <em>99,999 %</em></h1>
      <p>${techs().length} technologies et ${approaches().length} approches DevOps, du niveau débutant au niveau avancé. Tu lis, tu tapes les commandes dans un terminal d'entraînement, tu casses des clusters dans les simulateurs, puis tu construis de vrais projets.</p>
      <div class="cta"><a class="btn blue" href="${r.href}">${P.s.xp ? 'Reprendre' : 'Commencer'} : ${esc(r.m.name)}</a><a class="btn" href="#techs">Choisir une technologie</a></div></div>
    <div class="term-demo"><div class="term-bar"><i></i><i></i><i></i><span>release du vendredi</span></div><pre id="demo"></pre></div>
  </div></section>
  <div class="wrap">
    <div class="board">
      <div class="box nines-card"><div class="eyebrow">Ta disponibilité</div><div class="nines-big">${NINES[won]} %</div>
        <div class="nines-row">${CN.ultimates.map((u, i) => `<a class="nine${P.isDone(`u:${i}`) ? ' won' : ''}" href="#u.${i}" title="${esc(u.t)}">9<small>Projet ${i + 1}</small></a>`).join('')}</div>
        <p style="margin-top:10px;color:var(--mute)">Chaque projet ultime terminé t'accorde un neuf de plus.</p></div>
      <div class="box resume"><div><div class="eyebrow">Grade</div><h3 style="font-size:23px;margin-top:4px">${rk.name}</h3></div>
        <div class="stats"><div>${P.s.xp}<small>XP</small></div><div>${doneMods}<small>sur ${CN.modules.length} modules</small></div><div>${uptime()}<small>jour${uptime() > 1 ? 's' : ''} d'uptime</small></div></div>
        <div class="bar" role="img" aria-label="Progression vers le grade suivant"><i style="width:${rk.next ? Math.min(100, 100 * (P.s.xp - rk.floor) / (rk.next[0] - rk.floor)) : 100}%"></i></div></div>
    </div>
    <div class="hdr"><div><h2>La carte du parcours</h2><p>L'ordre suit la roadmap DevOps, mais chaque module reste ouvert : commence où tu veux.</p></div></div>
    <div class="map">${map}</div>
  </div>`);
  playDemo();
}
function playDemo() {
  const el = $('#demo'); if (!el) return;
  const script = [['$ git push origin main', 't-cmd'], ['✓ tests        42 passed', 't-ok'], ['✓ docker build  image 87 MB, cache réutilisé', 't-ok'], ['✓ trivy scan    0 critique', 't-ok'], ['$ argocd app sync boutique', 't-cmd'], ['✓ Synced, rollout canari à 10 %', 't-ok'], ['! p99 à 840 ms sur v2', 't-warn'], ['$ istioctl : trafic renvoyé vers v1', 't-cmd'], ['✓ Alerte résolue, aucun client touché', 't-ok'], ['disponibilité ce mois-ci : 99,999 %', 't-blue']];
  const paint = n => { el.innerHTML = script.slice(0, n).map(([t, c]) => `<span class="${c}">${esc(t)}</span>`).join('\n'); };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { paint(script.length); return; }
  paint(4); let n = 4;
  const id = setInterval(() => {
    if (!el.isConnected) return clearInterval(id);
    n = n >= script.length ? 1 : n + 1; paint(n);
  }, 1100);
  cleanup = () => clearInterval(id);
}

/* ---------- Catalogue ---------- */
const filt = { q: '', stage: '' };
function cards(list) {
  if (!list.length) return '<div class="empty">Aucun module ne correspond. Essaie un autre mot-clé.</div>';
  return list.map(m => {
    const p = modPct(m), st = stepsOf(m).length;
    return `<a class="card box" href="#${m.id}" style="--c:${m.stageObj.color}">
      <div class="row">${tile(m)}<h3>${esc(m.name)}</h3></div>
      <p>${esc(m.pitch)}</p>
      <div class="meta"><span class="chip">${st} étapes</span><span class="chip">${m.h} h</span>${m.sim ? `<span class="chip">Simulateur</span>` : ''}</div>
      <div class="bar" aria-label="${p} % terminé"><i style="width:${p}%"></i></div></a>`;
  }).join('');
}
function viewTechs() {
  const stages = CN.stages.filter(s => s.id !== 'approches');
  shell('techs', `<div class="wrap"><div class="hdr"><div><h2>Choisis ta technologie</h2><p>${techs().length} modules complets : leçons sur trois niveaux, labo, simulateur, quiz, projet et liens.</p></div></div>
    <div class="filters"><input class="search" id="q" type="search" placeholder="Rechercher : docker, secrets, logs…" aria-label="Rechercher une technologie" value="${esc(filt.q)}">
    <div class="chips"><button class="fchip" data-s="" aria-pressed="${!filt.stage}">Toutes</button>${stages.map(s => `<button class="fchip" data-s="${s.id}" style="--c:${s.color}" aria-pressed="${filt.stage === s.id}">${s.name}</button>`).join('')}</div></div>
    <div class="grid" id="grid"></div></div>`);
  const paint = () => {
    const q = filt.q.toLowerCase();
    $('#grid').innerHTML = cards(techs().filter(m => (!filt.stage || m.stage === filt.stage) && (!q || (m.name + ' ' + m.pitch + ' ' + m.stageObj.name).toLowerCase().includes(q))));
  };
  $('#q').oninput = e => { filt.q = e.target.value; paint(); };
  $$('.fchip').forEach(b => b.onclick = () => { filt.stage = b.dataset.s; $$('.fchip').forEach(x => x.setAttribute('aria-pressed', x === b)); paint(); });
  paint();
}
function viewApproches() {
  shell('approches', `<div class="wrap"><div class="hdr"><div><h2>Les approches</h2><p>Les outils changent, ces principes restent. Chaque approche relie plusieurs technologies et se termine par un projet.</p></div></div><div class="grid">${cards(approaches())}</div></div>`);
}

/* ---------- Module ---------- */
function viewModule(m, idx) {
  const steps = stepsOf(m), step = steps[Math.min(idx, steps.length - 1)], cur = steps.indexOf(step);
  P.s.last = `${m.id}.${cur}`; P.save();
  const groups = [...LV.map((l, i) => [l[0], steps.filter(s => s.lvl === i)]), ['Pratique', steps.filter(s => s.lvl === undefined)]];
  const out = groups.map(([t, list]) => `<h4>${t}</h4>` + list.map(s => {
    const n = steps.indexOf(s), d = P.isDone(`${m.id}:${s.k}`);
    return `<a href="#${m.id}.${n}"${n === cur ? ' aria-current="step"' : ''}><span class="ck${d ? ' y' : ''}">${d ? '✓' : ''}</span><span>${esc(s.title)}</span></a>`;
  }).join('')).join('');
  const pct = modPct(m);
  const prereq = (m.pre || []).map(id => CN.byId[id]).filter(Boolean);
  shell(m.stage === 'approches' ? 'approches' : 'techs', `<div style="--c:${m.stageObj.color}">
  <section class="mod-head"><div class="wrap">${tile(m, true)}
    <div class="txt"><div class="eyebrow">${m.stageObj.name} · ${m.h} h</div><h1>${esc(m.name)}</h1><p>${esc(m.pitch)}</p>
    <div class="bar" aria-label="${pct} % terminé"><i style="width:${pct}%"></i></div></div></div></section>
  <div class="wrap mod-body">
    <details class="outline box" ${innerWidth > 960 ? 'open' : ''}><summary>Plan du module · ${pct} %</summary>${out}</details>
    <div class="step" id="step"></div>
  </div></div>`);
  const el = $('#step'), key = `${m.id}:${step.k}`;
  const finish = () => {
    if (P.complete(key, step.xp, step.title)) { $$('.outline .ck')[cur].className = 'ck y'; $$('.outline .ck')[cur].textContent = '✓'; }
    if (modDone(m) && P.complete(`mod:${m.id}`, 100, `${m.name} terminé`)) celebrate();
    const b = $('#next'); if (b) b.disabled = false;
  };
  const foot = (gate) => `<div class="foot">
    ${cur > 0 ? `<a class="btn" href="#${m.id}.${cur - 1}">← Précédent</a>` : '<span></span>'}
    ${cur < steps.length - 1 ? `<button class="btn pri" id="next"${gate && !P.isDone(key) ? ' disabled' : ''}>Suivant : ${esc(steps[cur + 1].title.slice(0, 34))} →</button>` : `<a class="btn pri" href="#techs">Choisir un autre module</a>`}</div>`;
  const R = { lesson: rLesson, lab: rLab, sim: rSim, quiz: rQuiz, project: rProject, links: rLinks }[step.type];
  R(el, m, step, finish, foot, prereq);
  const nx = $('#next');
  if (nx) nx.onclick = () => { if (step.type === 'lesson' || step.type === 'links') finish(); location.hash = `${m.id}.${cur + 1}`; };
}
function rLesson(el, m, s, fin, foot, prereq) {
  const [t, prose, code, lang, tip] = s.ls;
  const first = s.k === 'l0.0';
  el.innerHTML = `<span class="lvl l${s.lvl}">${LV[s.lvl][0]} · ${LV[s.lvl][1]}</span><h2>${esc(t)}</h2>
    ${first && prereq.length ? `<div class="meta"><span class="chip">Conseillé avant :</span>${prereq.map(p => `<a class="chip" href="#${p.id}">${esc(p.name)}</a>`).join('')}</div>` : ''}
    <div class="prose">${md(prose)}</div>${code ? codeBlock(code, lang) : ''}${tip ? `<div class="tip"><b>Piège fréquent.</b> ${inline(tip)}</div>` : ''}${foot()}`;
}
function rLab(el, m, s, fin, foot) {
  el.innerHTML = `<span class="lvl">Labo</span><h2>${esc(s.title)}</h2><div id="lab"></div>${foot(true)}
  ${m.lab.real ? `<p style="color:var(--mute)">Pour le refaire sur une vraie machine : <a href="${m.lab.real[1]}" target="_blank" rel="noopener">${esc(m.lab.real[0])}</a>.</p>` : ''}`;
  mountLab($('#lab', el), m, fin);
}
function rSim(el, m, s, fin, foot) {
  const sim = window.SIMS[m.sim];
  el.innerHTML = `<span class="lvl">Simulateur</span><h2>${esc(sim.title)}</h2><div class="prose"><p>${inline(m.simIntro || sim.intro)}</p></div><div id="sim"></div>${foot(true)}`;
  cleanup = runSim(sim, $('#sim', el), m, fin);
}
function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function rQuiz(el, m, s, fin, foot) {
  const qs = m.quiz; let good = 0, answered = 0;
  el.innerHTML = `<span class="lvl">Quiz</span><h2>Quiz de validation</h2><div class="prose"><p>Il faut au moins ${Math.ceil(qs.length * .7)} bonnes réponses sur ${qs.length} pour valider.</p></div>
  ${qs.map((q, i) => `<div class="q box" data-q="${i}"><h3>${i + 1}. ${inline(q[0])}</h3>${shuffled(q[1].map((o, j) => [o, j])).map(([o, j]) => `<button class="opt" data-a="${j}">${inline(o)}</button>`).join('')}<div class="why" hidden></div></div>`).join('')}
  <div id="qres"></div>${foot(true)}`;
  $$('.opt', el).forEach(b => b.onclick = () => {
    const box = b.closest('.q'), q = qs[+box.dataset.q], a = +b.dataset.a;
    $$('.opt', box).forEach(o => { o.disabled = true; if (+o.dataset.a === q[2]) o.classList.add('good'); });
    if (a === q[2]) good++; else b.classList.add('bad');
    const w = $('.why', box); w.hidden = false; w.innerHTML = inline(q[3]);
    if (++answered === qs.length) {
      const ok = good >= Math.ceil(qs.length * .7);
      $('#qres').innerHTML = `<div class="tip" style="background:var(--${ok ? 'ok' : 'bad'}-bg)"><b>${good} / ${qs.length}.</b> ${ok ? 'Quiz validé.' : 'Relis les leçons concernées puis recommence.'} ${ok ? '' : '<button class="btn sm" id="again">Recommencer</button>'}</div>`;
      if (ok) fin(); else $('#again').onclick = route;
    }
  });
}
function rProject(el, m, s, fin, foot) {
  const p = m.project, k = i => `${m.id}:p${i}`;
  el.innerHTML = `<span class="lvl">Projet</span><h2>${esc(p.t)}</h2><div class="prose">${md(p.b)}</div>
  <div class="panel box"><h3>Étapes</h3>${p.s.map((x, i) => `<label class="chk${P.s.checks[k(i)] ? ' y' : ''}"><input type="checkbox" data-i="${i}" ${P.s.checks[k(i)] ? 'checked' : ''}><span>${inline(x)}</span></label>`).join('')}</div>
  <div class="tip" style="background:var(--ok-bg)"><b>Tu as réussi si :</b> ${inline(p.d)}</div>
  ${p.x ? `<div class="tip" style="background:var(--soft)"><b>Pour aller plus loin.</b> ${inline(p.x)}</div>` : ''}${foot(true)}`;
  $$('input', el).forEach(c => c.onchange = () => {
    P.check(k(c.dataset.i), c.checked); c.closest('.chk').classList.toggle('y', c.checked);
    if (p.s.every((_, i) => P.s.checks[k(i)])) fin();
  });
}
const LINKTAG = { doc: 'DOC', lab: 'LABO', video: 'VIDÉO', book: 'LIVRE', repo: 'CODE', cours: 'COURS', blog: 'ARTICLE' };
const linksHtml = list => `<div class="links">${list.map(([t, u, k]) => `<a class="lnk box" href="${u}" target="_blank" rel="noopener"><span class="tag">${LINKTAG[k] || 'LIEN'}</span><span>${esc(t)}</span><span class="arrow">↗</span></a>`).join('')}</div>`;
function rLinks(el, m, s, fin, foot) {
  el.innerHTML = `<span class="lvl">Ressources</span><h2>Pour continuer</h2><div class="prose"><p>Une sélection courte : la documentation officielle d'abord, puis de quoi pratiquer.</p></div>${linksHtml(m.links)}${foot()}`;
  fin();
}
function celebrate() {
  const s = CN.stages.find(st => CN.modules.filter(m => m.stage === st.id).every(modDone));
  if (s) toast(`Étape complète : ${s.name}`);
}

/* ---------- Projets ultimes ---------- */
function viewUltimes() {
  const list = CN.ultimates.map((u, i) => {
    const tot = u.ms.reduce((n, x) => n + x[1].length, 0), d = u.ms.reduce((n, x, a) => n + x[1].filter((_, b) => P.s.checks[`u${i}:${a}.${b}`]).length, 0);
    return `<a class="ult box${P.isDone(`u:${i}`) ? ' won' : ''}" href="#u.${i}"><div class="num">9</div><div><h3>${esc(u.t)}</h3><p>${esc(u.pitch)}</p><div class="meta">${u.tech.slice(0, 8).map(id => `<span class="chip">${esc(CN.byId[id].name)}</span>`).join('')}${u.tech.length > 8 ? `<span class="chip">+${u.tech.length - 8}</span>` : ''}</div></div><div class="eyebrow">${d} / ${tot}</div></a>`;
  }).join('');
  shell('ultimes', `<div class="wrap"><div class="hdr"><div><h2>Cinq projets ultimes, cinq neufs</h2><p>Ils rassemblent tout le parcours. Chacun se réalise sur ta machine ou chez un cloud, en suivant des jalons à cocher, et te fait gagner un neuf de disponibilité.</p></div></div>${list}<div style="height:32px"></div></div>`);
}
function viewUltimate(i) {
  const u = CN.ultimates[i]; if (!u) return viewUltimes();
  const k = (a, b) => `u${i}:${a}.${b}`;
  shell('ultimes', `<div style="--c:var(--sun)"><section class="mod-head"><div class="wrap"><div class="txt"><div class="eyebrow">Projet ultime ${i + 1} sur ${CN.ultimates.length} · ${u.h} h · ${esc(u.level)}</div><h1>${esc(u.t)}</h1><p>${esc(u.pitch)}</p></div></div></section>
  <div class="wrap two" style="padding-block:26px 56px">
    <div class="step">
      <div class="prose">${md(u.brief)}</div>
      <div class="box"><div class="eyebrow" style="padding:12px 14px 0">Architecture cible</div><div class="arch">${u.arch.map(a => `<span>${esc(a)}</span>`).join('<i>→</i>')}</div></div>
      ${u.ms.map((ms, a) => `<div class="panel box"><h3>Jalon ${a + 1} : ${esc(ms[0])}</h3>${ms[1].map((x, b) => `<label class="chk${P.s.checks[k(a, b)] ? ' y' : ''}"><input type="checkbox" data-k="${k(a, b)}" ${P.s.checks[k(a, b)] ? 'checked' : ''}><span>${inline(x)}</span></label>`).join('')}</div>`).join('')}
    </div>
    <div class="step">
      <div class="panel box"><h3>Technologies</h3><div class="meta">${u.tech.map(id => `<a class="chip" href="#${id}">${esc(CN.byId[id].name)}</a>`).join('')}</div></div>
      <div class="panel box"><h3>Critères de réussite</h3><div class="prose" style="font-size:16px"><ul>${u.done.map(d => `<li>${inline(d)}</li>`).join('')}</ul></div></div>
      <div class="panel box"><h3>Coût estimé</h3><p style="font-size:16px">${inline(u.cost)}</p></div>
      <div class="panel box"><h3>Ressources</h3><div class="links" style="grid-template-columns:minmax(0,1fr)">${linksHtml(u.links).replace(/^<div class="links">|<\/div>$/g, '')}</div></div>
    </div>
  </div></div>`);
  $$('input[data-k]').forEach(c => c.onchange = () => {
    P.check(c.dataset.k, c.checked); c.closest('.chk').classList.toggle('y', c.checked);
    if (u.ms.every((ms, a) => ms[1].every((_, b) => P.s.checks[k(a, b)])) && P.complete(`u:${i}`, XP.ultimate, 'Projet ultime')) { toast(`Disponibilité : ${NINES[ninesWon()]} %`); route(); }
  });
}

/* ---------- Profil ---------- */
const BADGES = [
  ['Premier déploiement', 'Terminer une première étape', () => P.s.xp > 0],
  ['Hello, world', 'Terminer un module', () => CN.modules.some(modDone)],
  ['Main dans le terminal', 'Réussir 5 labos', () => CN.modules.filter(m => P.isDone(`${m.id}:lab`)).length >= 5],
  ['Casseur de clusters', 'Réussir 5 simulateurs', () => CN.modules.filter(m => P.isDone(`${m.id}:sim`)).length >= 5],
  ['Sans filet', 'Valider 10 quiz', () => CN.modules.filter(m => P.isDone(`${m.id}:quiz`)).length >= 10],
  ['Bâtisseur', 'Terminer 5 projets', () => CN.modules.filter(m => P.isDone(`${m.id}:project`)).length >= 5],
  ['Une semaine d\'uptime', 'Pratiquer 7 jours de suite', () => uptime() >= 7],
  ['Étape validée', 'Compléter une étape du parcours', () => CN.stages.some(s => CN.modules.filter(m => m.stage === s.id).every(modDone))],
  ['Dix modules', 'Terminer 10 modules', () => CN.modules.filter(modDone).length >= 10],
  ['Polyglotte du cloud', 'Terminer AWS, Azure et Google Cloud', () => ['aws', 'azure', 'gcp'].every(i => modDone(CN.byId[i]))],
  ['Premier neuf', 'Terminer un projet ultime', () => ninesWon() >= 1],
  ['Cinq neufs', 'Terminer les 5 projets ultimes', () => ninesWon() === 5],
];
function viewProfil() {
  const rk = rank(), started = CN.modules.filter(m => modPct(m) > 0).sort((a, b) => modPct(b) - modPct(a));
  shell('profil', `<div class="wrap"><div class="hdr"><div><div class="eyebrow">Grade actuel</div><h2>${rk.name}</h2><p>${P.s.xp} XP${rk.next ? `, encore ${rk.next[0] - P.s.xp} avant « ${rk.next[1]} »` : ''}. Disponibilité : ${NINES[ninesWon()]} %. Uptime : ${uptime()} jour${uptime() > 1 ? 's' : ''}.</p></div></div>
  <h3 style="font-size:23px;margin-bottom:12px">Badges</h3>
  <div class="prof">${BADGES.map(([t, d, f]) => `<div class="badge box${f() ? ' won' : ''}"><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</div>
  <h3 style="font-size:23px;margin-bottom:12px">Modules commencés</h3>
  <div class="grid">${cards(started)}</div>
  <div style="padding-bottom:48px"><button class="btn sm" id="wipe">Effacer ma progression</button> <span id="wipe2"></span></div></div>`);
  $('#wipe').onclick = () => {
    $('#wipe2').innerHTML = 'Tout sera perdu. <button class="btn sm" id="wipe3">Confirmer</button>';
    $('#wipe3').onclick = () => { P.s = { xp: 0, done: {}, checks: {}, days: [], last: null }; P.touchDay(); P.save(); location.hash = 'home'; route(); };
  };
}

/* ---------- Routeur ---------- */
function route() {
  if (cleanup) { cleanup(); cleanup = null; }
  const h = decodeURIComponent(location.hash.slice(1)) || 'home';
  const [a, b] = h.split('.');
  if (h === 'techs') viewTechs();
  else if (h === 'approches') viewApproches();
  else if (h === 'ultimes') viewUltimes();
  else if (h === 'profil') viewProfil();
  else if (a === 'u') viewUltimate(+b);
  else if (CN.byId[a]) viewModule(CN.byId[a], +b || 0);
  else viewHome();
  window.scrollTo({ top: 0, behavior: 'instant' });
}
document.addEventListener('click', e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  const text = b.closest('.code').querySelector('pre').innerText;
  const ok = () => { b.textContent = 'Copié'; setTimeout(() => { b.textContent = 'Copier'; }, 1400); };
  navigator.clipboard.writeText(text).then(ok).catch(() => {
    const r = document.createRange(); r.selectNodeContents(b.closest('.code').querySelector('pre'));
    const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); b.textContent = 'Sélectionné';
  });
});
try { const t = localStorage.getItem(KEY + '-theme'); if (t) document.documentElement.dataset.theme = t; } catch { /* facultatif */ }
addEventListener('hashchange', route);
P.load();
route();
P.connect(() => { if (!location.hash.includes('.')) route(); });
