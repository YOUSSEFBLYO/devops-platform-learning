// Simulateurs : kit commun, puis Linux, Git, Docker, Kubernetes, CI/CD, GitOps.
window.SIMS = {};

function runSim(sim, root, m, onDone) {
  const goals = sim.goals(m);
  const timers = [];
  const hit = new Set();
  root.innerHTML = `<div class="sim"><div class="sim-goals">${goals.map((g, i) => `<div class="goal" data-g="${i}"><i>○</i><span>${inline(g)}</span></div>`).join('')}</div>
    <div class="sim-stage" id="stage"></div><div class="sim-log" id="simlog" aria-live="polite" tabindex="0"></div></div>`;
  const logEl = $('#simlog', root);
  const kit = {
    stage: $('#stage', root), m, cfg: m.simCfg || {},
    log(t, c = '') { logEl.insertAdjacentHTML('beforeend', `<div class="${c}">${esc(t)}</div>`); logEl.scrollTop = logEl.scrollHeight; },
    every(fn, ms) { const id = setInterval(fn, ms); timers.push(id); return id; },
    later(fn, ms) { const id = setTimeout(fn, ms); timers.push(id); return id; },
    goal(i) {
      if (hit.has(i)) return;
      hit.add(i);
      const g = $(`.goal[data-g="${i}"]`, root); if (g) { g.classList.add('ok'); $('i', g).textContent = '✓'; }
      if (hit.size === goals.length) { kit.log('✓ Tous les objectifs sont atteints.', 't-ok'); onDone(); }
    },
  };
  const stop = sim.run(kit);
  return () => { timers.forEach(t => { clearInterval(t); clearTimeout(t); }); if (stop) stop(); };
}

/* ---------- Mini-shell Linux ---------- */
SIMS.shell = {
  title: 'Bac à sable shell',
  intro: 'Un petit système de fichiers vit dans ta page : `ls`, `cd`, `pwd`, `cat`, `mkdir`, `touch`, `rm`, `echo`, `grep`, `wc -l`, les pipes `|` et la redirection `>`. Explore-le librement.',
  goals: () => ['Aller dans `/var/log` puis lire `app.log`', 'Compter les lignes ERROR avec un pipe : `grep ERROR app.log | wc -l`', 'Enregistrer les erreurs dans `/tmp/erreurs.txt` avec `>`', 'Créer un dossier `/home/apprenti/backup`'],
  run(k) {
    const fs = {
      '/': ['bin', 'etc', 'home', 'tmp', 'var'], '/bin': [], '/etc': ['hostname', 'passwd'], '/home': ['apprenti'], '/home/apprenti': ['notes.txt'], '/tmp': [], '/var': ['log'], '/var/log': ['app.log', 'auth.log'],
    };
    const files = {
      '/etc/hostname': 'lab-01', '/etc/passwd': 'root:x:0:0:root:/root:/bin/bash\napprenti:x:1000:1000::/home/apprenti:/bin/bash',
      '/home/apprenti/notes.txt': 'penser a verifier les logs',
      '/var/log/app.log': '10:01 INFO demarrage\n10:02 ERROR connexion base refusee\n10:03 INFO retry\n10:04 ERROR timeout\n10:05 INFO reprise\n10:06 ERROR disque plein',
      '/var/log/auth.log': '09:58 Accepted publickey for apprenti\n10:00 Failed password for root',
    };
    let cwd = '/home/apprenti';
    k.stage.innerHTML = `<div class="term"><div class="term-out" id="sh-out" tabindex="0" style="height:300px"></div><form class="term-in" id="sh-f" autocomplete="off"><span id="sh-p"></span><input id="sh-i" spellcheck="false" autocapitalize="off" aria-label="Commande shell"></form></div>`;
    const out = $('#sh-out', k.stage), inp = $('#sh-i', k.stage), pr = $('#sh-p', k.stage);
    const hist = []; let hi = 0;
    const path = p => {
      if (!p) return cwd;
      const parts = (p.startsWith('/') ? p : cwd + '/' + p).split('/');
      const st = []; for (const x of parts) { if (!x || x === '.') continue; if (x === '..') st.pop(); else st.push(x); }
      return '/' + st.join('/');
    };
    const parent = p => p.slice(0, p.lastIndexOf('/')) || '/';
    const base = p => p.slice(p.lastIndexOf('/') + 1);
    function exec(cmd, input) {
      const a = cmd.trim().split(/\s+/), c = a[0], args = a.slice(1);
      const f = args.find(x => !x.startsWith('-'));
      switch (c) {
        case 'pwd': return cwd;
        case 'ls': { const p = path(f); if (!fs[p]) throw `ls: ${f}: dossier introuvable`; return fs[p].join('  '); }
        case 'cd': { const p = path(f || '/home/apprenti'); if (!fs[p]) throw `cd: ${f}: dossier introuvable`; cwd = p; return ''; }
        case 'cat': { if (!f) return input || ''; const p = path(f); if (files[p] === undefined) throw `cat: ${f}: fichier introuvable`; if (p === '/var/log/app.log') k.goal(0); return files[p]; }
        case 'echo': return args.join(' ').replace(/["']/g, '');
        case 'mkdir': { const p = path(args.filter(x => x !== '-p')[0]); fs[p] = []; fs[parent(p)]?.push(base(p)); if (p === '/home/apprenti/backup') k.goal(3); return ''; }
        case 'touch': { const p = path(f); if (files[p] === undefined) { files[p] = ''; fs[parent(p)]?.push(base(p)); } return ''; }
        case 'rm': { const p = path(f); if (files[p] === undefined) throw `rm: ${f}: fichier introuvable`; delete files[p]; fs[parent(p)] = fs[parent(p)].filter(x => x !== base(p)); return ''; }
        case 'grep': {
          const pat = args[0].replace(/["']/g, ''), src = args[1] ? files[path(args[1])] : input;
          if (src === undefined) throw `grep: ${args[1]}: fichier introuvable`;
          return src.split('\n').filter(l => l.includes(pat)).join('\n');
        }
        case 'wc': { const v = input ?? (f ? files[path(f)] : ''); return String(v ? v.split('\n').length : 0); }
        case 'whoami': return 'apprenti';
        case 'hostname': return 'lab-01';
        case 'clear': out.innerHTML = ''; return '';
        default: throw `${c}: commande absente de ce bac à sable`;
      }
    }
    function run(line) {
      out.insertAdjacentHTML('beforeend', `<span class="t-ok">${esc(cwd)} $</span> <span class="t-cmd">${esc(line)}</span>\n`);
      try {
        const redir = line.match(/^(.*?)>\s*(\S+)\s*$/);
        const body = redir ? redir[1] : line;
        let res;
        for (const seg of body.split('|')) res = exec(seg, res);
        if (redir) {
          const p = path(redir[2]);
          if (files[p] === undefined) fs[parent(p)]?.push(base(p));
          files[p] = res;
          if (p === '/tmp/erreurs.txt' && res.includes('ERROR')) k.goal(2);
          res = '';
        }
        if (/grep\s+["']?ERROR["']?.*\|\s*wc -l/.test(line) && res === '3') k.goal(1);
        if (res) out.insertAdjacentHTML('beforeend', esc(res) + '\n');
      } catch (e) { out.insertAdjacentHTML('beforeend', `<span class="t-bad">${esc(e)}</span>\n`); }
      out.scrollTop = out.scrollHeight;
      pr.textContent = `${cwd} $`;
    }
    pr.textContent = `${cwd} $`;
    out.innerHTML = '<span class="t-mute">Essaie : ls, puis cd /var/log</span>\n';
    k.log('Chaque objectif se valide tout seul quand tu tapes la bonne commande.', 't-mute');
    $('#sh-f', k.stage).onsubmit = e => { e.preventDefault(); const v = inp.value; if (v.trim()) { hist.push(v); hi = hist.length; run(v); } inp.value = ''; };
    inp.onkeydown = e => { if (e.key === 'ArrowUp' && hi > 0) { inp.value = hist[--hi]; e.preventDefault(); } };
  },
};

/* ---------- Graphe Git ---------- */
SIMS.gitgraph = {
  title: 'Graphe de commits',
  intro: 'Chaque bouton lance une vraie opération Git sur un graphe dessiné en direct. La commande équivalente apparaît dans le journal.',
  goals: () => ['Faire 2 commits sur `main`', 'Créer `feature` et y faire un commit', 'Avancer `main` pendant ce temps : les branches divergent', 'Fusionner `feature` dans `main`'],
  run(k) {
    const lanes = { main: 0, feature: 1 };
    let commits = [{ id: 'a1', b: 'main', p: [] }], cur = 'main', heads = { main: 'a1' }, n = 1;
    const hash = () => (n++ * 7919 + 4096).toString(16).slice(-5);
    const draw = () => {
      const W = 72, L = 58, pos = id => { const i = commits.findIndex(c => c.id === id), c = commits[i]; return [30 + i * W, 34 + lanes[c.b] * L]; };
      const w = Math.max(520, 60 + commits.length * W);
      let g = '';
      commits.forEach(c => c.p.forEach(pid => { const [x1, y1] = pos(pid), [x2, y2] = pos(c.id); g += `<path class="g-l" d="M${x1} ${y1} C${x1 + 36} ${y1}, ${x2 - 36} ${y2}, ${x2} ${y2}"/>`; }));
      commits.forEach(c => { const [x, y] = pos(c.id); g += `<circle class="g-c${c.b === 'feature' ? ' f' : ''}${c.p.length > 1 ? ' m' : ''}" cx="${x}" cy="${y}" r="13"/><text x="${x}" y="${y + 29}" text-anchor="middle">${c.id}</text>`; });
      Object.entries(heads).forEach(([b, id]) => { const [x, y] = pos(id); g += `<text class="g-t" x="${x}" y="${y - 19}" text-anchor="middle">${b}${b === cur ? ' (HEAD)' : ''}</text>`; });
      $('#gg', k.stage).innerHTML = `<svg class="chart" viewBox="0 0 ${w} 140" style="min-width:${w}px" role="img" aria-label="Graphe de commits">${g}</svg>`;
      $('#gg-co').textContent = cur === 'main' ? 'git switch feature' : 'git switch main';
      $('#gg-co').disabled = !heads.feature;
      $('#gg-br').disabled = !!heads.feature;
      $('#gg-mg').disabled = !(cur === 'main' && heads.feature);
      const onMain = commits.filter(c => c.b === 'main').length;
      if (onMain >= 3) k.goal(0);
    };
    k.stage.innerHTML = `<div class="sim-ctl"><button class="btn sm pri" id="gg-c">git commit</button><button class="btn sm" id="gg-br">git switch -c feature</button><button class="btn sm" id="gg-co"></button><button class="btn sm" id="gg-mg">git merge feature</button><button class="btn sm" id="gg-rs">Recommencer</button></div><div id="gg" style="overflow-x:auto"></div>`;
    let div = false;
    $('#gg-c').onclick = () => {
      const id = hash(); commits.push({ id, b: cur, p: [heads[cur]] }); heads[cur] = id;
      k.log(`$ git commit -m "..."  → [${cur} ${id}]`);
      if (cur === 'feature') k.goal(1);
      if (cur === 'main' && heads.feature && !div) { div = true; k.goal(2); k.log('Les branches ont divergé : la fusion créera un commit de merge.', 't-warn'); }
      draw();
    };
    $('#gg-br').onclick = () => { heads.feature = heads.main; cur = 'feature'; k.log('$ git switch -c feature  → nouvelle étiquette sur le même commit'); draw(); };
    $('#gg-co').onclick = () => { cur = cur === 'main' ? 'feature' : 'main'; k.log(`$ git switch ${cur}`); draw(); };
    $('#gg-mg').onclick = () => {
      const id = hash(); commits.push({ id, b: 'main', p: [heads.main, heads.feature] }); heads.main = id; delete heads.feature;
      k.log(`$ git merge feature  → commit de fusion ${id} à deux parents`, 't-ok');
      if (div) k.goal(3); else k.log('Astuce : avance main avant de fusionner pour voir un vrai commit de merge.', 't-mute');
      div = false; draw();
    };
    $('#gg-rs').onclick = () => { commits = [{ id: 'a1', b: 'main', p: [] }]; heads = { main: 'a1' }; cur = 'main'; n = 1; div = false; draw(); };
    draw();
  },
};

/* ---------- Couches Docker ---------- */
SIMS.layers = {
  title: 'Cache et couches d\'image',
  intro: 'Docker réutilise une couche tant que rien n\'a changé avant elle. Réordonne le Dockerfile avec les flèches, modifie le code, relance le build et regarde ce qui est reconstruit.',
  goals: () => ['Lancer un premier build complet', 'Après une modification du code, garder `npm ci` en cache', 'Faire passer l\'image sous 200 Mo', 'Ne pas tourner en root'],
  run(k) {
    const L = {
      from: { c: 'FROM node:22', t: 8, s: 1100 }, wd: { c: 'WORKDIR /app', t: 0, s: 0 }, pkg: { c: 'COPY package*.json ./', t: 1, s: 1 },
      ci: { c: 'RUN npm ci', t: 42, s: 140 }, src: { c: 'COPY . .', t: 2, s: 12 }, build: { c: 'RUN npm run build', t: 26, s: 9 }, user: { c: 'USER node', t: 0, s: 0 }, cmd: { c: 'CMD ["node","dist/server.js"]', t: 0, s: 0 },
    };
    let order = ['from', 'wd', 'src', 'ci', 'build', 'cmd'], cachedUpTo = -1, dirty = true, prev = null, multi = false, status = {};
    const ctl = `<div class="sim-ctl"><button class="btn sm pri" id="l-b">docker build</button><button class="btn sm" id="l-e">Modifier le code source</button>
      <label><input type="checkbox" id="l-a"> Image de base slim</label><label><input type="checkbox" id="l-m"> Build multi-stage</label><label><input type="checkbox" id="l-u"> Ajouter USER node</label></div>`;
    k.stage.innerHTML = ctl + '<div class="cols"><div class="pane"><h4>Dockerfile</h4><div class="dfile" id="l-f"></div></div><div class="pane"><h4>Dernier build</h4><div id="l-s"><p style="font-size:14.5px">Lance un premier build.</p></div></div></div>';
    const size = () => {
      const b = $('#l-a').checked ? 200 : 1100;
      if (multi) return Math.round(($('#l-a').checked ? 45 : 200) + 9 + 60);
      return b + order.reduce((n, id) => n + (id === 'from' ? 0 : L[id].s), 0);
    };
    const paint = () => {
      $('#l-f').innerHTML = order.map((id, i) => `<div class="dline ${status[id] || ''}"><span class="cc">${status[id] === 'cached' ? 'CACHED' : status[id] === 'built' ? 'REBUILD' : ''}</span><code>${esc(id === 'from' ? `FROM node:22${$('#l-a').checked ? '-slim' : ''}` : L[id].c)}</code>${i > 0 ? `<button data-up="${i}" aria-label="Monter la ligne">↑</button>` : ''}</div>`).join('');
      $$('[data-up]', k.stage).forEach(b => b.onclick = () => { const i = +b.dataset.up; if (i === 1) return; [order[i - 1], order[i]] = [order[i], order[i - 1]]; prev = null; status = {}; k.log('Ordre modifié : les couches à partir de cette ligne ne sont plus en cache.', 't-mute'); paint(); });
    };
    let srcChanged = false;
    $('#l-e').onclick = () => { srcChanged = true; k.log('Un fichier source a changé. package.json reste identique.', 't-warn'); };
    $('#l-a').onchange = () => { prev = null; status = {}; paint(); };
    $('#l-m').onchange = e => { multi = e.target.checked; k.log(multi ? 'Multi-stage : seuls dist/ et les dépendances de prod passent dans l\'image finale.' : 'Retour au stage unique.'); };
    $('#l-u').onchange = e => { order = order.filter(x => x !== 'user'); if (e.target.checked) order.splice(order.length - 1, 0, 'user'); prev = null; status = {}; paint(); };
    $('#l-b').onclick = () => {
      let bust = !prev || prev.join() !== order.join(), time = 0;
      const srcDep = id => id === 'src';
      order.forEach(id => {
        if (srcChanged && srcDep(id)) bust = true;
        status[id] = bust ? 'built' : 'cached';
        if (bust) time += L[id].t;
      });
      const wasRebuildCi = status.ci === 'built', hadPrev = !!prev;
      prev = [...order];
      paint();
      const mb = size();
      $('#l-s').innerHTML = `<div class="kv"><span>Durée</span><b>${time} s</b></div><div class="kv"><span>Taille de l'image</span><b>${mb} Mo</b></div><div class="kv"><span>Couches reconstruites</span><b>${order.filter(i => status[i] === 'built').length} / ${order.length}</b></div><div class="kv"><span>Utilisateur</span><b>${order.includes('user') ? 'node' : 'root'}</b></div>`;
      k.log(`docker build → ${time} s, ${mb} Mo`, time < 40 ? 't-ok' : 't-warn');
      k.goal(0);
      if (hadPrev && srcChanged && !wasRebuildCi) k.goal(1);
      if (mb < 200) k.goal(2);
      if (order.includes('user') && order.indexOf('user') > order.indexOf('src')) k.goal(3);
      srcChanged = false;
    };
    paint();
    k.log('Astuce : place COPY package*.json puis RUN npm ci avant COPY . .', 't-mute');
    // La ligne package n'existe pas au départ : l'apprenant doit la voir apparaître pour réordonner.
    order.splice(2, 0, 'pkg'); paint();
  },
};

/* ---------- Cluster Kubernetes ---------- */
SIMS.pods = {
  title: 'Boucle de réconciliation',
  intro: 'Tu déclares un nombre de réplicas, le contrôleur fait le reste. Clique sur un pod pour le tuer, coupe un nœud, lance une mise à jour progressive, et observe le cluster revenir à l\'état voulu.',
  goals: m => [`Tuer un ${(m.simCfg || {}).pod || 'pod'} : il doit revenir seul`, 'Monter à 6 réplicas', 'Couper un nœud sans perdre le service', 'Terminer une mise à jour vers v2'],
  run(k) {
    const P_ = k.cfg.pod || 'pod', D = k.cfg.deploy || 'Deployment';
    let seq = 0;
    const nodes = [{ n: 'node-1', up: true, p: [] }, { n: 'node-2', up: true, p: [] }, { n: 'node-3', up: true, p: [] }];
    let want = 3, ver = 'v1', rolling = false;
    const all = () => nodes.flatMap(x => x.p);
    const mk = v => ({ id: ++seq, v, st: 'pending' });
    const place = p => { const ok = nodes.filter(x => x.up).sort((a, b) => a.p.length - b.p.length)[0]; if (ok) ok.p.push(p); };
    for (let i = 0; i < 3; i++) { const p = mk('v1'); p.st = 'run'; place(p); }
    k.stage.innerHTML = `<div class="sim-ctl"><button class="btn sm" id="p-m">− réplica</button><b id="p-w" style="font-family:var(--mono)"></b><button class="btn sm pri" id="p-p">+ réplica</button><button class="btn sm" id="p-r">Mise à jour vers v2</button><span id="p-s" class="pill ok"></span></div><div class="cols" id="p-n"></div>`;
    const draw = () => {
      $('#p-w').textContent = `${want} réplicas`;
      const run = all().filter(p => p.st === 'run').length;
      const s = $('#p-s'); s.textContent = `${run}/${want} prêts`; s.className = 'pill ' + (run >= want ? 'ok' : 'warn');
      $('#p-n').innerHTML = nodes.map((x, i) => `<div class="pane${x.up ? '' : ' off'}"><h4>${x.n}<button class="btn sm" data-n="${i}">${x.up ? 'Couper' : 'Rallumer'}</button></h4><div class="pods">${x.p.map(p => `<button class="pod ${p.v === 'v2' ? 'v2 ' : ''}${p.st === 'pending' ? 'pending' : ''}" data-p="${p.id}" aria-label="Tuer ${P_} ${p.id}">${p.v}</button>`).join('')}</div></div>`).join('');
      $$('[data-p]', k.stage).forEach(b => b.onclick = () => {
        const id = +b.dataset.p; nodes.forEach(x => { x.p = x.p.filter(p => p.id !== id); });
        k.log(`${P_} ${id} supprimé. Écart détecté : ${D} recrée le manquant.`, 't-warn'); killed = true; draw();
      });
      $$('[data-n]', k.stage).forEach(b => b.onclick = () => {
        const x = nodes[+b.dataset.n]; x.up = !x.up;
        if (!x.up) {
          const n = x.p.length; x.p = []; k.log(`${x.n} hors ligne : ${n} ${P_}(s) à replacer.`, 't-bad'); down = n > 0 || down;
        } else k.log(`${x.n} de retour, disponible pour les prochains placements.`);
        draw();
      });
    };
    let killed = false, down = false;
    $('#p-p').onclick = () => { want = Math.min(9, want + 1); k.log(`$ kubectl scale --replicas=${want}`); draw(); };
    $('#p-m').onclick = () => { want = Math.max(1, want - 1); k.log(`$ kubectl scale --replicas=${want}`); draw(); };
    $('#p-r').onclick = () => { if (ver === 'v2') return; ver = 'v2'; rolling = true; k.log('$ kubectl set image … app:v2  → rolling update, un pod à la fois', 't-blue'); };
    k.every(() => {
      all().forEach(p => { if (p.st === 'pending') p.st = 'run'; });
      const cur = all();
      if (cur.length < want) { const p = mk(ver); place(p); k.log(`Réconciliation : création d'un ${P_} ${ver}.`, 't-ok'); }
      else if (cur.length > want) { const n = nodes.find(x => x.p.length); n.p.pop(); }
      else if (rolling) {
        const old = nodes.find(x => x.p.some(p => p.v === 'v1'));
        if (old && cur.every(p => p.st === 'run')) { old.p.splice(old.p.findIndex(p => p.v === 'v1'), 1); old.p.push(mk('v2')); k.log(`Rolling update : un ${P_} v1 remplacé par v2.`); }
        if (!old) { rolling = false; k.log('Mise à jour terminée, aucune interruption.', 't-ok'); k.goal(3); }
      } else if (cur.every(p => p.st === 'run')) {
        if (killed) { killed = false; k.goal(0); }
        if (want >= 6) k.goal(1);
        if (down && nodes.some(x => !x.up)) { down = false; k.goal(2); }
      }
      draw();
    }, 900);
    draw();
  },
};

/* ---------- Pipeline CI/CD ---------- */
SIMS.pipeline = {
  title: 'Pipeline en direct',
  intro: 'Lance le pipeline, casse un test, active le cache et la parallélisation. Une étape en échec bloque tout ce qui suit : c\'est le rôle d\'un pipeline.',
  goals: () => ['Obtenir un pipeline vert', 'Voir un test cassé bloquer le déploiement', 'Passer de 6 min à moins de 4 min avec le cache et la parallélisation', 'Ajouter un contrôle manuel avant la production'],
  run(k) {
    const name = k.cfg.ci || 'CI';
    const base = [['lint', 30, 'lint'], ['tests unitaires', 80, 'test'], ['tests intégration', 70, 'test'], ['build image', 90, 'build'], ['scan sécurité', 40, 'sec'], ['déploiement staging', 30, 'stag'], ['déploiement prod', 30, 'prod']];
    let busy = false;
    k.stage.innerHTML = `<div class="sim-ctl"><button class="btn sm pri" id="c-r">Lancer ${esc(name)}</button><label><input type="checkbox" id="c-b"> Casser un test</label><label><input type="checkbox" id="c-c"> Cache des dépendances</label><label><input type="checkbox" id="c-p"> Tests en parallèle</label><label><input type="checkbox" id="c-g"> Validation manuelle avant prod</label></div><div class="flow" id="c-f"></div><div class="kv" style="margin-top:10px"><span>Durée simulée</span><b id="c-t">0 min 00</b></div>`;
    const dur = j => { let d = j[1]; if ($('#c-c').checked && (j[2] === 'build' || j[2] === 'test')) d = Math.round(d * .6); return d; };
    const paint = st => { $('#c-f').innerHTML = base.map((j, i) => `<div class="job ${st[i] || ''}">${j[0]}<small>${dur(j)} s</small></div>`).join(''); };
    const fmt = s => `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
    paint([]);
    $('#c-r').onclick = () => {
      if (busy) return; busy = true;
      const st = [], par = $('#c-p').checked, brk = $('#c-b').checked, gate = $('#c-g').checked;
      let i = 0, total = 0, failed = false;
      k.log(`▶ ${name} : nouveau commit détecté`, 't-blue');
      const tick = () => {
        if (i >= base.length) { busy = false;
          if (!failed) { k.log(`✓ Pipeline vert en ${fmt(total)}.`, 't-ok'); k.goal(0); if (total < 240) k.goal(2); if (gate) k.goal(3); } return; }
        const j = base[i];
        if (j[2] === 'prod' && gate) k.log('⏸ Validation manuelle demandée… approuvée par le relecteur.', 't-warn');
        st[i] = 'run'; paint(st);
        if (par && i === 1) st[2] = 'run', paint(st);
        k.later(() => {
          const span = (par && i === 1) ? 2 : 1;
          const d = span === 2 ? Math.max(dur(base[1]), dur(base[2])) : dur(j);
          total += d;
          if (j[2] === 'test' && brk) {
            st[i] = 'bad'; if (span === 2) st[2] = 'ok'; for (let x = i + 1; x < base.length; x++) if (st[x] !== 'ok') st[x] = 'skip';
            failed = true; busy = false; paint(st); $('#c-t').textContent = fmt(total);
            k.log(`✗ ${j[0]} : 1 test en échec. Le déploiement n'a pas lieu.`, 't-bad'); k.goal(1); return;
          }
          st[i] = 'ok'; if (span === 2) st[2] = 'ok'; i += span; $('#c-t').textContent = fmt(total); paint(st); tick();
        }, 520);
      };
      tick();
    };
  },
};

/* ---------- GitOps ---------- */
SIMS.gitops = {
  title: 'Git contre cluster',
  intro: 'À gauche, ce que Git demande. À droite, ce qui tourne. L\'agent compare les deux en boucle. Modifie les manifestes, puis trafique le cluster à la main pour voir ce qui se passe.',
  goals: () => ['Déployer un changement par un simple commit', 'Provoquer une dérive et la voir corrigée', 'Revenir en arrière avec `git revert`'],
  run(k) {
    const A = k.cfg.agent || 'Argo CD';
    const git = { replicas: 2, tag: 'v1.0' }, live = { replicas: 2, tag: 'v1.0' }, hist = [];
    let auto = true, heal = true, t = 0, drifted = false, changed = false, reverted = false;
    k.stage.innerHTML = `<div class="sim-ctl"><button class="btn sm pri" id="g-c">git commit : version suivante</button><button class="btn sm" id="g-s">git commit : +1 réplica</button><button class="btn sm" id="g-r">git revert</button><button class="btn sm" id="g-d">kubectl edit (à la main)</button><label><input type="checkbox" id="g-a" checked> Sync auto</label><label><input type="checkbox" id="g-h" checked> Self-heal</label></div>
    <div class="cols"><div class="pane"><h4>Git, état voulu</h4><div id="g-g"></div></div><div class="pane"><h4>Cluster, état réel <span id="g-st" class="pill ok"></span></h4><div id="g-l"></div></div></div>
    <div class="kv" style="margin-top:10px"><span>Prochaine comparaison de ${esc(A)}</span><b id="g-t"></b></div>`;
    const kv = o => `<div class="kv"><span>réplicas</span><b>${o.replicas}</b></div><div class="kv"><span>image</span><b>app:${o.tag}</b></div>`;
    const same = () => git.replicas === live.replicas && git.tag === live.tag;
    const draw = () => {
      $('#g-g').innerHTML = kv(git); $('#g-l').innerHTML = kv(live);
      const s = $('#g-st'); s.textContent = same() ? 'Synced' : 'OutOfSync'; s.className = 'pill ' + (same() ? 'ok' : 'bad');
      $('#g-t').textContent = `${3 - t} s`;
    };
    const save = () => hist.push({ ...git });
    $('#g-c').onclick = () => { save(); git.tag = `v1.${hist.length}`; changed = true; k.log(`$ git commit -m "release ${git.tag}" && git push`); draw(); };
    $('#g-s').onclick = () => { save(); git.replicas++; changed = true; k.log(`$ git commit -m "replicas: ${git.replicas}" && git push`); draw(); };
    $('#g-r').onclick = () => { if (!hist.length) return k.log('Rien à annuler.', 't-mute'); Object.assign(git, hist.pop()); reverted = true; k.log('$ git revert HEAD && git push', 't-blue'); draw(); };
    $('#g-d').onclick = () => { live.replicas += 3; drifted = true; k.log('Quelqu\'un a modifié le cluster à la main : dérive.', 't-bad'); draw(); };
    $('#g-a').onchange = e => { auto = e.target.checked; }; $('#g-h').onchange = e => { heal = e.target.checked; };
    k.every(() => {
      t = (t + 1) % 3;
      if (t === 0 && !same()) {
        const isDrift = drifted && git.replicas !== live.replicas && !changed;
        if (auto && (!isDrift || heal)) {
          Object.assign(live, git); k.log(`${A} : écart détecté, synchronisation appliquée.`, 't-ok');
          if (isDrift) { drifted = false; k.goal(1); } else if (reverted) { k.goal(2); reverted = false; } else { k.goal(0); changed = false; }
          changed = false;
        } else k.log(`${A} : OutOfSync${isDrift ? ', self-heal désactivé' : ', sync auto désactivée'}.`, 't-warn');
      }
      draw();
    }, 1000);
    draw();
  },
};
