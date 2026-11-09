// Simulateurs : plan IaC, répartiteur de charge, métriques, logs, traces, service mesh.

/* ---------- Plan d'infrastructure ---------- */
SIMS.tfplan = {
  title: 'Plan, apply, dérive',
  intro: 'Modifie le code à gauche. Le plan compare ton code à l\'état connu et annonce ce qui sera créé, modifié ou détruit. Rien ne change avant l\'apply.',
  goals: () => ['Créer au moins 3 ressources', 'Modifier une ressource sans la recréer', 'Déclencher un remplacement (-/+)', 'Détecter puis corriger une dérive'],
  run(k) {
    const T = k.cfg.tool || 'terraform';
    const catalog = { vpc: 'aws_vpc.main', subnet: 'aws_subnet.public', vm: 'aws_instance.web', bucket: 'aws_s3_bucket.assets', db: 'aws_db_instance.app' };
    const code = { vpc: true, subnet: true, vm: true, bucket: false, db: false, size: 't3.micro', az: 'eu-west-3a' };
    let state = {}, real = {}, planned = null;
    k.stage.innerHTML = `<div class="sim-ctl"><button class="btn sm pri" id="t-p">${esc(T)} plan</button><button class="btn sm" id="t-a" disabled>${esc(T)} apply</button><button class="btn sm" id="t-d">Modifier à la main dans la console</button></div>
    <div class="cols"><div class="pane"><h4>Ton code</h4>${Object.keys(catalog).map(r => `<label class="kv" style="justify-content:flex-start;gap:8px"><input type="checkbox" data-r="${r}" ${code[r] ? 'checked' : ''}><code class="inl" style="font-size:12.5px">${catalog[r]}</code></label>`).join('')}
    <div class="sim-ctl" style="margin:8px 0 0"><label>Taille <select id="t-s"><option>t3.micro</option><option>t3.large</option></select></label><label>Zone <select id="t-z"><option>eu-west-3a</option><option>eu-west-3b</option></select></label></div></div>
    <div class="pane"><h4>Résultat du plan</h4><div class="diff" id="t-o">Lance un plan pour comparer le code et l'état.</div></div>
    <div class="pane"><h4>Fichier d'état</h4><div id="t-st" style="font:400 13px/1.6 var(--mono)">vide</div></div></div>`;
    const sync = () => { $$('[data-r]', k.stage).forEach(c => { code[c.dataset.r] = c.checked; }); code.size = $('#t-s').value; code.az = $('#t-z').value; planned = null; $('#t-a').disabled = true; };
    $$('input,select', k.stage).forEach(i => i.onchange = sync);
    const attrs = r => r === 'vm' ? { size: code.size, az: code.az } : {};
    function plan() {
      const out = [];
      Object.keys(catalog).forEach(r => {
        const want = code[r], has = state[r], n = catalog[r];
        if (want && !has) out.push(['+', r, n, 'sera créé']);
        else if (!want && has) out.push(['-', r, n, 'sera détruit']);
        else if (want && r === 'vm') {
          const live = real.vm || has;
          if (live.az !== code.az) out.push(['-/+', r, n, `zone ${live.az} → ${code.az}, recréation obligatoire`]);
          else if (live.size !== code.size) out.push(['~', r, n, `instance_type ${live.size} → ${code.size}`]);
        }
      });
      return out;
    }
    $('#t-p').onclick = () => {
      sync(); planned = plan();
      const c = s => planned.filter(p => p[0] === s).length;
      $('#t-o').innerHTML = (planned.map(p => `<span class="${{ '+': 't-ok', '-': 't-bad', '~': 't-warn', '-/+': 't-bad' }[p[0]]}">${esc(p[0].padEnd(3))} ${esc(p[2])}\n    ${esc(p[3])}</span>`).join('\n') || 'Aucun changement. L\'infrastructure correspond au code.') + `\n\nPlan : ${c('+') + c('-/+')} à créer, ${c('~')} à modifier, ${c('-') + c('-/+')} à détruire.`;
      $('#t-a').disabled = !planned.length;
      k.log(`$ ${T} plan`);
      if (driftSeen && planned.some(p => p[0] === '~')) k.log('La dérive apparaît dans le plan : le réel ne correspond plus au code.', 't-warn');
    };
    let driftSeen = false, driftFixed = false;
    $('#t-a').onclick = () => {
      planned.forEach(p => {
        if (p[0] === '-') { delete state[p[1]]; delete real[p[1]]; } else { state[p[1]] = attrs(p[1]); real[p[1]] = attrs(p[1]); }
        if (p[0] === '~' && !driftSeen) k.goal(1);
        if (p[0] === '-/+') k.goal(2);
      });
      if (Object.keys(state).length >= 3) k.goal(0);
      if (driftSeen && !driftFixed && planned.length) { driftFixed = true; k.goal(3); }
      k.log(`$ ${T} apply → ${planned.length} changement(s) appliqué(s).`, 't-ok');
      $('#t-st').innerHTML = Object.keys(state).map(r => esc(catalog[r])).join('<br>') || 'vide';
      planned = null; $('#t-a').disabled = true; $('#t-o').textContent = 'Apply terminé.';
    };
    $('#t-d').onclick = () => {
      if (!state.vm) return k.log('Crée d\'abord aws_instance.web.', 't-mute');
      real.vm = { ...real.vm, size: code.size === 't3.micro' ? 't3.large' : 't3.micro' }; driftSeen = true; driftFixed = false;
      k.log('Un collègue a changé la taille dans la console : dérive. Relance un plan.', 't-bad');
    };
  },
};

/* ---------- Répartiteur de charge ---------- */
SIMS.lb = {
  title: 'Répartition de charge',
  intro: 'Les requêtes partent du client vers trois serveurs. Change l\'algorithme, ralentis un serveur, tue-en un, et compare avec et sans health check.',
  goals: () => ['Essayer `least_conn` avec un serveur lent', 'Tuer un serveur sans health check : des erreurs 502 apparaissent', 'Activer le health check : plus aucune erreur'],
  run(k) {
    const B = [{ n: 'app-1', up: true, slow: false, c: 0, q: 0 }, { n: 'app-2', up: true, slow: false, c: 0, q: 0 }, { n: 'app-3', up: true, slow: false, c: 0, q: 0 }];
    let algo = 'round_robin', hc = false, rr = 0, err = 0, tot = 0, errAfterHc = 0, hcSince = 0;
    k.stage.innerHTML = `<div class="sim-ctl"><label>Algorithme <select id="b-a"><option value="round_robin">round_robin</option><option value="least_conn">least_conn</option><option value="ip_hash">ip_hash</option></select></label><label><input type="checkbox" id="b-h"> Health check</label><span>Requêtes <b id="b-t">0</b></span><span>Erreurs 502 <b id="b-e">0</b></span></div>
    <div class="lane" id="b-l"><div class="tag-box" style="left:0;top:58px">Clients</div><div class="tag-box" style="left:140px;top:58px">${esc(k.cfg.lb || 'Répartiteur')}</div>
    ${B.map((b, i) => `<div class="tag-box" id="b-b${i}" style="right:0;top:${i * 58}px;width:190px"><span>${b.n}</span> <small id="b-c${i}">0 req · 0 en cours</small><button class="btn sm" data-k="${i}" style="padding:0 5px;font-size:12px">Tuer</button> <button class="btn sm" data-s="${i}" style="padding:0 5px;font-size:12px">Ralentir</button></div>`).join('')}</div>`;
    const paint = () => {
      B.forEach((b, i) => { $(`#b-c${i}`).textContent = `${b.c} req · ${b.q} en cours${b.slow ? ' · lent' : ''}`; $(`#b-b${i}`).classList.toggle('dead', !b.up); });
      $('#b-t').textContent = tot; $('#b-e').textContent = err;
    };
    const pick = () => {
      let pool = hc ? B.filter(b => b.up) : B;
      if (!pool.length) pool = B;
      if (algo === 'least_conn') return [...pool].sort((a, b) => a.q - b.q)[0];
      if (algo === 'ip_hash') return pool[(tot % 7 < 5 ? 1 : 0) % pool.length];
      return pool[rr++ % pool.length];
    };
    const dot = (b, bad) => {
      const l = $('#b-l'); if (!l) return;
      const i = B.indexOf(b), d = document.createElement('i'); d.className = 'dot' + (bad ? ' err' : '');
      d.style.top = '80px'; d.style.left = '110px'; l.append(d);
      requestAnimationFrame(() => requestAnimationFrame(() => { d.style.left = (l.clientWidth - 200) + 'px'; d.style.top = (i * 58 + 22) + 'px'; }));
      setTimeout(() => d.remove(), 620);
    };
    $$('[data-k]', k.stage).forEach(x => x.onclick = () => { const b = B[+x.dataset.k]; b.up = !b.up; x.textContent = b.up ? 'Tuer' : 'Relancer'; k.log(`${b.n} ${b.up ? 'relancé' : 'arrêté'}.`, b.up ? 't-ok' : 't-bad'); });
    $$('[data-s]', k.stage).forEach(x => x.onclick = () => { const b = B[+x.dataset.s]; b.slow = !b.slow; x.textContent = b.slow ? 'Accélérer' : 'Ralentir'; });
    $('#b-a').onchange = e => { algo = e.target.value; k.log(`Algorithme : ${algo}`); };
    $('#b-h').onchange = e => { hc = e.target.checked; hcSince = tot; errAfterHc = 0; k.log(hc ? 'Health check actif : les serveurs morts sortent du pool.' : 'Health check coupé : le répartiteur envoie à l\'aveugle.', hc ? 't-ok' : 't-warn'); };
    k.every(() => {
      tot++;
      const b = pick();
      if (!b.up) { err++; dot(b, true); if (hc) errAfterHc++; if (!hc) { k.goal(1); if (err % 5 === 1) k.log(`502 Bad Gateway : requête envoyée à ${b.n}, qui est arrêté.`, 't-bad'); } }
      else { b.c++; b.q++; dot(b); setTimeout(() => { b.q--; }, b.slow ? 2400 : 450); }
      if (algo === 'least_conn' && B.some(x => x.slow && x.up)) k.goal(0);
      if (hc && B.some(x => !x.up) && tot - hcSince > 12 && errAfterHc === 0) k.goal(2);
      paint();
    }, 380);
    paint();
  },
};

/* ---------- Métriques et alertes ---------- */
SIMS.metrics = {
  title: 'Alerte en direct',
  intro: 'La courbe reçoit une nouvelle mesure chaque seconde. Règle le seuil, provoque un incident, puis réagis. L\'alerte passe par Pending avant Firing : la durée `for` filtre les pics isolés.',
  goals: () => ['Déclencher une alerte Firing', 'Résoudre l\'incident en ajoutant de la capacité', 'Laisser passer un pic bref sans alerte grâce à `for`'],
  run(k) {
    const q = k.cfg.q || 'histogram_quantile(0.99, sum by (le)(rate(http_request_duration_seconds_bucket[5m])))';
    const data = Array.from({ length: 60 }, () => 180 + Math.random() * 40);
    let th = 400, forS = 5, load = 1, cap = 1, spike = 0, state = 'OK', over = 0, pendingBrief = false, fired = false;
    k.stage.innerHTML = `<div class="sim-ctl"><button class="btn sm pri" id="m-i">Incident durable</button><button class="btn sm" id="m-s">Pic de 2 s</button><button class="btn sm" id="m-c">Ajouter de la capacité</button><label>Seuil <input type="range" id="m-t" min="250" max="800" value="400" aria-label="Seuil d'alerte"></label><label>for <select id="m-f"><option value="0">0 s</option><option value="5" selected>5 s</option><option value="10">10 s</option></select></label><span id="m-st" class="pill ok">OK</span></div>
    <div id="m-g" style="overflow-x:auto"></div><div class="dfile" style="margin-top:8px;color:var(--mute);overflow-wrap:anywhere">${esc(q)} &gt; <span id="m-v"></span></div>`;
    const draw = () => {
      const W = 640, H = 190, max = 1000, x = i => 36 + i * (W - 46) / 59, y = v => H - 22 - (Math.min(v, max) / max) * (H - 32);
      const path = data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
      const ticks = [0, 250, 500, 750, 1000].map(t => `<line class="axis" x1="36" x2="${W - 10}" y1="${y(t)}" y2="${y(t)}"/><text x="30" y="${y(t) + 4}" text-anchor="end">${t}</text>`).join('');
      $('#m-g').innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Latence p99 en millisecondes">${ticks}<polygon points="36,${y(0)} ${path} ${x(59)},${y(0)}" fill="var(--flow)" opacity=".14"/><polyline class="ln" points="${path}"/><line class="th" x1="36" x2="${W - 10}" y1="${y(th)}" y2="${y(th)}"/><circle cx="${x(59)}" cy="${y(data[59])}" r="4.5" fill="var(--flow)"/><text x="36" y="${H - 6}">p99 (ms), 60 dernières secondes</text></svg>`;
      $('#m-v').textContent = th / 1000;
      const s = $('#m-st'); s.textContent = state; s.className = 'pill ' + ({ OK: 'ok', Pending: 'warn', Firing: 'bad' }[state]);
    };
    $('#m-i').onclick = () => { load = 3.4; k.log('Trafic multiplié par 3 : la latence grimpe.', 't-warn'); };
    $('#m-s').onclick = () => { spike = 2; pendingBrief = forS > 2; k.log('Pic bref, sans gravité.'); };
    $('#m-c').onclick = () => { cap = load > 1 ? load : 1; k.log('$ kubectl scale deployment/api --replicas=12', 't-blue'); };
    $('#m-t').oninput = e => { th = +e.target.value; draw(); };
    $('#m-f').onchange = e => { forS = +e.target.value; };
    k.every(() => {
      const base = 190 * (load / cap) + Math.random() * 40 + (spike > 0 ? 450 : 0);
      if (spike > 0) spike--;
      data.push(base); data.shift();
      if (base > th) {
        over++;
        if (over > forS) { if (state !== 'Firing') { state = 'Firing'; fired = true; k.log(`ALERTE Firing : p99 au-dessus de ${th} ms depuis ${forS} s. Notification envoyée.`, 't-bad'); k.goal(0); } } else state = 'Pending';
      } else {
        if (state === 'Firing') { k.log('Alerte résolue.', 't-ok'); if (fired && cap > 1) k.goal(1); }
        if (state === 'Pending' && pendingBrief) { k.log('Le pic est retombé avant la fin de `for` : aucune alerte envoyée.', 't-ok'); k.goal(2); pendingBrief = false; }
        over = 0; state = 'OK';
      }
      draw();
    }, 1000);
    draw();
  },
};

/* ---------- Exploration de logs ---------- */
SIMS.logs = {
  title: 'Enquête dans les logs',
  intro: 'Un incident touche la boutique : des clients signalent des échecs au paiement. Filtre les logs avec des paires `champ:valeur` et du texte libre pour trouver la cause.',
  goals: () => ['Isoler les erreurs avec `level:error`', 'Trouver le service fautif avec le graphique', 'Combiner deux filtres pour lire la cause', 'Nommer la cause de l\'incident'],
  run(k) {
    const svc = ['web', 'api', 'payment', 'cart', 'auth'];
    const ok = ['GET /produits 200', 'POST /panier 201', 'GET /health 200', 'session ouverte', 'cache hit produit=42'];
    const logs = [];
    const add = () => {
      const fault = Math.random() < .28, s = fault ? 'payment' : svc[Math.floor(Math.random() * 5)];
      const lv = fault ? 'error' : (Math.random() < .1 ? 'warn' : 'info');
      const msg = fault ? 'charge failed: tls handshake timeout to psp.example.net' : lv === 'warn' ? 'latence élevée 640ms' : ok[Math.floor(Math.random() * 5)];
      const d = new Date(), t = d.toTimeString().slice(0, 8);
      logs.unshift({ t, level: lv, service: s, msg }); if (logs.length > 300) logs.pop();
    };
    for (let i = 0; i < 60; i++) add();
    const ex = k.cfg.ex || 'level:error service:payment';
    k.stage.innerHTML = `<div class="sim-ctl" style="flex-wrap:wrap"><input type="text" id="l-q" style="flex:1 1 240px" placeholder="${esc(ex)}" aria-label="Requête de logs"><span class="chip">${esc(k.cfg.lang || 'Syntaxe simplifiée')}</span></div>
    <div class="cols"><div class="pane" style="flex:2;grid-column:span 2;min-width:0;overflow-x:auto"><h4>Résultats <span id="l-n"></span></h4><table class="logt"><tbody id="l-b"></tbody></table></div><div class="pane"><h4>Par service</h4><div id="l-c"></div></div></div>
    <div class="sim-ctl" style="margin-top:10px"><label>Cause de l'incident <select id="l-a"><option value="">Choisir…</option><option>Base de données saturée</option><option>TLS vers le prestataire de paiement</option><option>Mémoire du panier</option></select></label></div>`;
    const match = (l, q) => q.trim().split(/\s+/).filter(Boolean).every(t => {
      const m = t.match(/^(level|service)[:=]"?([^"]+)"?$/);
      return m ? l[m[1]] === m[2] : l.msg.toLowerCase().includes(t.toLowerCase());
    });
    const paint = () => {
      const q = $('#l-q').value, rows = logs.filter(l => match(l, q));
      $('#l-n').textContent = `${rows.length} lignes`;
      $('#l-b').innerHTML = rows.slice(0, 11).map(l => `<tr><td>${l.t}</td><td><span class="pill ${{ error: 'bad', warn: 'warn', info: 'ok' }[l.level]}">${l.level}</span></td><td>${l.service}</td><td>${esc(l.msg)}</td></tr>`).join('');
      const c = {}; rows.forEach(l => { c[l.service] = (c[l.service] || 0) + 1; });
      const max = Math.max(1, ...Object.values(c));
      $('#l-c').innerHTML = svc.map(s => `<div style="font:400 12.5px var(--mono);margin-bottom:5px">${s} <b style="float:right">${c[s] || 0}</b><div class="bar"><i style="width:${100 * (c[s] || 0) / max}%"></i></div></div>`).join('');
      if (/level[:=]"?error/.test(q) && !/service/.test(q)) { k.goal(0); if (rows.length && rows.every(r => r.service === 'payment')) k.goal(1); }
      if (/level[:=]"?error/.test(q) && /service[:=]"?payment/.test(q)) k.goal(2);
    };
    $('#l-q').oninput = paint;
    $('#l-a').onchange = e => {
      if (e.target.value.startsWith('TLS')) { k.log('Exact : le service de paiement n\'arrive plus à joindre le prestataire.', 't-ok'); k.goal(3); }
      else if (e.target.value) k.log('Les logs ne montrent rien de tel. Relis le message d\'erreur.', 't-bad');
    };
    k.every(() => { add(); paint(); }, 1400);
    paint();
    k.log(`Exemple de requête : ${ex}`, 't-mute');
  },
};

/* ---------- Traces ---------- */
SIMS.trace = {
  title: 'Trouve le span coupable',
  intro: 'Trois requêtes lentes, trois causes différentes. Lis la cascade de spans et clique sur celui qui explique la lenteur.',
  goals: () => ['Cas 1 : base de données lente', 'Cas 2 : requêtes N+1', 'Cas 3 : tentatives répétées'],
  run(k) {
    const C = [
      { n: 'GET /commande/42', tot: 1420, sp: [['gateway', 0, 1420], ['api', 12, 1400], ['auth', 18, 22], ['order-svc', 45, 1350], ['SELECT orders', 60, 1280, 1], ['cache', 1345, 4]], why: 'Un SELECT occupe 90 % de la requête. Il manque sans doute un index.' },
      { n: 'GET /panier', tot: 900, sp: [['gateway', 0, 900], ['api', 8, 880], ['SELECT cart', 15, 20], ...Array.from({ length: 7 }, (_, i) => ['SELECT item', 40 + i * 115, 110, 1]), ['render', 850, 28]], why: 'Une requête par article : c\'est le motif N+1. Une jointure ou un chargement groupé règle le problème.' },
      { n: 'POST /paiement', tot: 3200, sp: [['gateway', 0, 3200], ['api', 10, 3180], ['psp attempt 1', 30, 1000, 1], ['psp attempt 2', 1040, 1000, 1], ['psp attempt 3', 2050, 1000, 1], ['commit', 3060, 90]], why: 'Trois tentatives d\'une seconde : chaque timeout relance l\'appel. Il faut un backoff et un disjoncteur.' },
    ];
    let c = 0;
    const draw = () => {
      const t = C[c];
      k.stage.innerHTML = `<div class="sim-ctl"><b>${esc(t.n)}</b><span class="pill bad">${t.tot} ms</span><span class="chip">trace ${(0xa3f0 + c * 977).toString(16)}…</span></div>` +
        t.sp.map(([n, s, d, bad], i) => `<button class="span" data-i="${i}" data-b="${bad ? 1 : 0}"><span>${esc(n)}</span><span class="tr"><i style="left:${(s / t.tot * 92).toFixed(1)}%;width:${Math.max(.8, d / t.tot * 92).toFixed(1)}%">${d} ms</i></span></button>`).join('');
      $$('.span', k.stage).forEach(b => b.onclick = () => {
        if (b.dataset.b === '1') {
          k.log(`✓ ${t.why}`, 't-ok'); k.goal(c);
          if (c < C.length - 1) { c++; k.later(draw, 800); }
        } else k.log('Ce span n\'explique pas la lenteur. Cherche où le temps est vraiment passé.', 't-warn');
      });
    };
    draw();
  },
};

/* ---------- Service mesh ---------- */
SIMS.mesh = {
  title: 'Canari et mTLS',
  intro: 'Le mesh répartit le trafic entre deux versions sans toucher au code. Envoie 10 % vers v2, regarde le taux d\'erreur, puis corrige et termine la bascule. Active le mTLS et observe ce qu\'un espion peut lire.',
  goals: () => ['Envoyer 10 % du trafic vers v2', 'Limiter l\'impact du bug de v2 avec le disjoncteur', 'Passer à 100 % sur la v2 corrigée', 'Activer le mTLS strict'],
  run(k) {
    let w = 0, bug = true, cb = false, mtls = false;
    const recent = [];
    k.stage.innerHTML = `<div class="sim-ctl"><label>Trafic vers v2 : <b id="s-w">0 %</b><input type="range" id="s-r" min="0" max="100" step="10" value="0" aria-label="Part du trafic vers v2"></label><label><input type="checkbox" id="s-c"> Disjoncteur</label><button class="btn sm" id="s-f">Corriger v2</button><label><input type="checkbox" id="s-m"> mTLS strict</label></div>
    <div class="cols"><div class="pane"><h4>v1 stable <span id="s-1" class="pill ok">0</span></h4><div class="bar"><i id="s-b1" style="width:100%"></i></div></div><div class="pane"><h4>v2 canari <span id="s-2" class="pill warn">0</span></h4><div class="bar"><i id="s-b2" style="width:0"></i></div></div><div class="pane"><h4>Taux d'erreur</h4><b id="s-e" style="font:800 28px var(--display)">0 %</b></div></div>
    <div class="diff" id="s-sn" style="margin-top:12px;min-height:58px"></div>`;
    const v = [0, 0];
    $('#s-r').oninput = e => { w = +e.target.value; $('#s-w').textContent = w + ' %'; $('#s-b1').style.width = 100 - w + '%'; $('#s-b2').style.width = w + '%'; if (w === 10) k.goal(0); if (w === 100 && !bug) k.goal(2); };
    $('#s-c').onchange = e => { cb = e.target.checked; k.log(cb ? 'Disjoncteur actif : les instances en erreur sont éjectées du pool.' : 'Disjoncteur désactivé.'); };
    $('#s-f').onclick = () => { bug = false; k.log('Nouvelle image v2 déployée, bug corrigé.', 't-ok'); if (w === 100) k.goal(2); };
    $('#s-m').onchange = e => { mtls = e.target.checked; k.log(mtls ? 'PeerAuthentication STRICT : tout le trafic interne est chiffré et authentifié.' : 'Trafic interne en clair.', mtls ? 't-ok' : 't-warn'); if (mtls) k.goal(3); };
    k.every(() => {
      const toV2 = Math.random() * 100 < w; v[toV2 ? 1 : 0]++;
      let e = toV2 && bug && Math.random() < .55;
      if (e && cb) { e = Math.random() < .1; if (w > 0 && w <= 50) k.goal(1); }
      recent.push(e ? 1 : 0); if (recent.length > 40) recent.shift();
      const rate = 100 * recent.reduce((a, b) => a + b, 0) / recent.length;
      $('#s-1').textContent = v[0]; $('#s-2').textContent = v[1];
      const er = $('#s-e'); er.textContent = rate.toFixed(1) + ' %'; er.style.color = rate > 3 ? 'var(--bad)' : 'var(--ok)';
      $('#s-sn').textContent = mtls ? 'Capture réseau entre frontend et checkout :\n17 03 03 01 2a 9f c4 7e 1b 8d … (TLS 1.3, illisible)' : 'Capture réseau entre frontend et checkout :\nPOST /checkout HTTP/1.1  {"carte":"4242…","montant":49.90}';
    }, 220);
  },
};
