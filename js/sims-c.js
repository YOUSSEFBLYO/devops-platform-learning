// Simulateurs : secrets, serverless, haute disponibilité, convergence, registre d'artefacts.

/* ---------- Coffre à secrets ---------- */
SIMS.vault = {
  title: 'Coffre et secrets dynamiques',
  intro: 'Un Vault démarre scellé. Il faut 3 parts de clé sur 5 pour l\'ouvrir. Ensuite, chaque application reçoit un identifiant temporaire qui expire tout seul.',
  goals: () => ['Desceller le coffre avec 3 parts', 'Obtenir un identifiant dynamique', 'Le renouveler avant expiration', 'Le révoquer après une fuite'],
  run(k) {
    let shares = 0, sealed = true, lease = null, n = 0;
    k.stage.innerHTML = `<div class="cols"><div class="pane"><h4>Descellement <span id="v-s" class="pill bad">sealed</span></h4><div class="sim-ctl" id="v-k"></div></div>
    <div class="pane"><h4>Base de données</h4><div class="sim-ctl"><button class="btn sm pri" id="v-r">vault read database/creds/app</button><button class="btn sm" id="v-n">Renouveler</button><button class="btn sm" id="v-x">Révoquer</button></div><div id="v-l" style="font-size:14.5px"></div></div></div>`;
    $('#v-k').innerHTML = [1, 2, 3, 4, 5].map(i => `<button class="btn sm" data-sh="${i}">Part ${i}</button>`).join('');
    const paint = () => {
      const s = $('#v-s'); s.textContent = sealed ? `sealed ${shares}/3` : 'unsealed'; s.className = 'pill ' + (sealed ? 'bad' : 'ok');
      $('#v-l').innerHTML = lease ? `<div class="kv"><span>Utilisateur</span><b>${lease.u}</b></div><div class="kv"><span>Mot de passe</span><b>${lease.p}</b></div><div class="kv"><span>Expire dans</span><b>${lease.ttl} s</b></div><div class="bar"><i style="width:${lease.ttl / 30 * 100}%"></i></div>` : '<p>Aucun identifiant actif.</p>';
    };
    $$('[data-sh]', k.stage).forEach(b => b.onclick = () => {
      if (!sealed) return;
      b.disabled = true; shares++; k.log(`$ vault operator unseal  (part ${b.dataset.sh}) → ${shares}/3`);
      if (shares >= 3) { sealed = false; k.log('Coffre descellé : la clé maîtresse a été reconstruite en mémoire.', 't-ok'); k.goal(0); }
      paint();
    });
    $('#v-r').onclick = () => {
      if (sealed) return k.log('Erreur 503 : le coffre est scellé.', 't-bad');
      n++; lease = { u: `v-app-${(n * 48271 % 65536).toString(16)}`, p: Math.random().toString(36).slice(2, 12), ttl: 30 };
      k.log(`Nouvel identifiant ${lease.u}, créé en base pour 30 s.`, 't-ok'); k.goal(1); paint();
    };
    $('#v-n').onclick = () => { if (!lease) return; lease.ttl = 30; k.log('$ vault lease renew → TTL remis à 30 s', 't-ok'); k.goal(2); paint(); };
    $('#v-x').onclick = () => { if (!lease) return; k.log(`$ vault lease revoke → ${lease.u} supprimé de la base. Le secret volé ne sert plus à rien.`, 't-ok'); lease = null; k.goal(3); paint(); };
    k.every(() => { if (lease && --lease.ttl <= 0) { k.log(`Bail expiré : ${lease.u} supprimé automatiquement.`, 't-warn'); lease = null; } paint(); }, 1000);
    paint();
  },
};

SIMS.sealed = {
  title: 'Du secret en clair au commit',
  intro: 'Un `Secret` Kubernetes n\'est qu\'encodé en base64. Regarde ce que Git contiendrait dans chaque cas, puis chiffre avec la clé publique du contrôleur.',
  goals: () => ['Voir qu\'un Secret en base64 est lisible', 'Chiffrer avec `kubeseal`', 'Laisser le contrôleur recréer le Secret dans le cluster'],
  run(k) {
    const pw = 'S3cr3t-pr0d!', b64 = btoa(pw);
    let st = 0;
    k.stage.innerHTML = `<div class="sim-ctl"><button class="btn sm" id="s-d">Décoder le base64</button><button class="btn sm pri" id="s-k">kubeseal</button><button class="btn sm" id="s-a">git push et sync</button></div><div class="cols"><div class="pane"><h4>Fichier dans Git</h4><div class="diff" id="s-g"></div></div><div class="pane"><h4>Cluster</h4><div id="s-c" style="font-size:14.5px"></div></div></div>`;
    const paint = () => {
      $('#s-g').textContent = st === 0 ? `kind: Secret\ndata:\n  password: ${b64}` : `kind: SealedSecret\nspec:\n  encryptedData:\n    password: AgB7x9Kd3mQ…v2Lw==`;
      $('#s-c').innerHTML = st === 2 ? `<span class="pill ok">Secret créé</span><p>Le contrôleur a déchiffré avec sa clé privée.</p>` : '<p>Aucun secret pour cette application.</p>';
    };
    $('#s-d').onclick = () => {
      if (st > 0) return k.log('$ echo AgB7x9… | base64 -d  → octets chiffrés, illisibles sans la clé privée.', 't-ok');
      k.log(`$ echo ${b64} | base64 -d  → ${pw}`, 't-bad'); k.log('N\'importe qui ayant accès au dépôt lit le mot de passe.', 't-bad'); k.goal(0);
    };
    $('#s-k').onclick = () => { if (st) return; st = 1; k.log('$ kubeseal --format yaml < secret.yaml > sealed.yaml', 't-blue'); k.goal(1); paint(); };
    $('#s-a').onclick = () => { if (st !== 1) return k.log('Commence par chiffrer le secret.', 't-mute'); st = 2; k.log('Le contrôleur voit le SealedSecret et crée le Secret.', 't-ok'); k.goal(2); paint(); };
    paint();
  },
};

/* ---------- Serverless ---------- */
SIMS.serverless = {
  title: 'Démarrages à froid et facture',
  intro: 'Fais varier le trafic, la mémoire et les instances préchauffées. Le simulateur applique un modèle de coût proche d\'une fonction facturée à la requête et à la durée, et le compare à un serveur allumé en continu.',
  goals: () => ['Absorber 500 requêtes/s sans serveur à gérer', 'Passer sous 1 % de démarrages à froid', 'Trouver le point où le serveur fixe devient moins cher'],
  run(k) {
    const P_ = k.cfg.platform || 'Fonction';
    k.stage.innerHTML = `<div class="sim-ctl"><label>Trafic moyen <input type="range" id="f-r" min="1" max="1000" value="10" aria-label="Requêtes par seconde"><b id="f-rv"></b></label><label>Mémoire <select id="f-m"><option>256</option><option selected>512</option><option>1024</option><option>2048</option></select> Mo</label><label>Préchauffées <select id="f-p"><option>0</option><option>2</option><option>10</option><option>50</option></select></label></div>
    <div class="cols"><div class="pane"><h4>${esc(P_)}</h4><div class="kv"><span>Instances simultanées</span><b id="f-c"></b></div><div class="kv"><span>Démarrages à froid</span><b id="f-f"></b></div><div class="kv"><span>Coût mensuel</span><b id="f-e"></b></div></div>
    <div class="pane"><h4>Serveur fixe équivalent</h4><div class="kv"><span>Machines</span><b id="f-vm"></b></div><div class="kv"><span>Coût mensuel</span><b id="f-ve"></b></div></div>
    <div class="pane"><h4>Verdict</h4><p id="f-v" style="font-size:15px"></p></div></div>`;
    const calc = () => {
      const r = +$('#f-r').value, mem = +$('#f-m').value, pre = +$('#f-p').value, dur = 0.12 * (512 / mem) ** .5;
      const conc = Math.ceil(r * dur), cold = Math.max(0.05, 6 * Math.exp(-r / 40) * (conc > pre ? 1 : .03));
      const reqs = r * 2592000, gb = reqs * dur * mem / 1024;
      const cost = reqs / 1e6 * .2 + gb * .0000166667 + pre * (mem / 1024) * 2592000 * .0000041667;
      const vms = Math.max(2, Math.ceil(r / 150)), vm = vms * 34;
      $('#f-rv').textContent = `${r} req/s`; $('#f-c').textContent = conc; $('#f-f').textContent = cold.toFixed(2) + ' %';
      $('#f-e').textContent = Math.round(cost) + ' $'; $('#f-vm').textContent = vms; $('#f-ve').textContent = vm + ' $';
      $('#f-v').textContent = cost < vm ? `Le serverless coûte ${Math.round(vm / Math.max(cost, 1))} fois moins cher à ce volume.` : 'À ce trafic constant, le serveur fixe coûte moins cher.';
      if (r >= 500) k.goal(0);
      if (cold < 1) k.goal(1);
      if (cost >= vm) k.goal(2);
    };
    $$('input,select', k.stage).forEach(i => i.oninput = calc);
    calc();
    k.log('Le modèle utilise des tarifs indicatifs : consulte la page de prix du fournisseur pour un vrai budget.', 't-mute');
  },
};

/* ---------- Haute disponibilité ---------- */
SIMS.ha = {
  title: 'Survivre à la panne d\'une zone',
  intro: 'Compose ton architecture, calcule sa disponibilité, puis coupe une zone. La formule est celle des composants en parallèle : 1 − (1 − a)ⁿ.',
  goals: () => ['Dépasser 99,99 % de disponibilité calculée', 'Survivre à la coupure d\'une zone', 'Obtenir un RPO de 0 avec une réplication synchrone', 'Survivre à la perte d\'une région entière'],
  run(k) {
    const Z = [{ n: 'zone a', r: 'eu-west', up: true }, { n: 'zone b', r: 'eu-west', up: true }, { n: 'zone c', r: 'eu-west', up: true }, { n: 'zone a', r: 'us-east', up: true }];
    let zones = 1, sync = false, region2 = false;
    k.stage.innerHTML = `<div class="sim-ctl"><label>Zones <select id="h-z"><option>1</option><option>2</option><option>3</option></select></label><label>Réplication base <select id="h-s"><option value="0">Asynchrone</option><option value="1">Synchrone</option></select></label><label><input type="checkbox" id="h-r"> Seconde région</label></div>
    <div class="cols" id="h-m"></div><div class="cols" style="margin-top:12px"><div class="pane"><div class="kv"><span>Disponibilité calculée</span><b id="h-a"></b></div><div class="kv"><span>Indisponibilité par an</span><b id="h-d"></b></div></div><div class="pane"><div class="kv"><span>RPO, données perdues au pire</span><b id="h-rpo"></b></div><div class="kv"><span>RTO, durée de reprise</span><b id="h-rto"></b></div></div><div class="pane"><div class="kv"><span>Service</span><b id="h-st"></b></div><div class="kv"><span>Coût relatif</span><b id="h-c"></b></div></div></div>`;
    const active = () => Z.filter((z, i) => (i < zones) || (i === 3 && region2));
    const avail = () => {
      const zoneA = 0.995, n = Math.min(zones, 3);
      let reg = 1 - (1 - zoneA) ** n;
      reg *= 0.99995;
      return region2 ? 1 - (1 - reg) * (1 - 0.998) : reg;
    };
    const paint = () => {
      const a = avail(), act = active(), up = act.filter(z => z.up);
      $('#h-m').innerHTML = act.map(z => { const i = Z.indexOf(z); return `<div class="pane${z.up ? '' : ' off'}"><h4>${z.r} ${z.n}<button class="btn sm" data-z="${i}">${z.up ? 'Couper' : 'Rétablir'}</button></h4><div class="pods"><span class="pod">app</span><span class="pod">app</span><span class="pod ${i === 0 ? 'v2' : 'pending'}" style="width:auto;padding:0 6px">${i === 0 ? 'db primaire' : 'db réplica'}</span></div></div>`; }).join('');
      $('#h-a').textContent = (a * 100).toFixed(4).replace('.', ',') + ' %';
      const min = (1 - a) * 525600; $('#h-d').textContent = min > 120 ? `${(min / 60).toFixed(1)} h` : `${min.toFixed(0)} min`;
      $('#h-rpo').textContent = sync && zones > 1 ? '0 s' : zones > 1 || region2 ? '5 s' : 'dernière sauvegarde';
      $('#h-rto').textContent = up.length ? (zones > 1 ? '60 s' : '2 à 4 h') : 'heures';
      const st = $('#h-st'); st.textContent = up.length ? 'En ligne' : 'Hors service'; st.style.color = up.length ? 'var(--ok)' : 'var(--bad)';
      $('#h-c').textContent = 'x' + (zones * (region2 ? 1.8 : 1) * (sync ? 1.2 : 1)).toFixed(1);
      if (a >= .9999) k.goal(0);
      if (sync && zones > 1) k.goal(2);
      if (act.length > 1 && up.length && up.length < act.length && Z.slice(0, 3).some((z, i) => i < zones && !z.up)) {
        k.goal(1);
        if (region2 && Z.slice(0, zones).every(z => !z.up)) k.goal(3);
      }
      $$('[data-z]', k.stage).forEach(b => b.onclick = () => {
        const z = Z[+b.dataset.z]; z.up = !z.up;
        k.log(z.up ? `${z.r} ${z.n} rétablie.` : `Panne : ${z.r} ${z.n} coupée.`, z.up ? 't-ok' : 't-bad');
        if (!z.up && up.length > 1) k.log('La réplique est promue et le répartiteur écarte la zone en panne.', 't-ok');
        paint();
      });
    };
    $('#h-z').onchange = e => { zones = +e.target.value; paint(); };
    $('#h-s').onchange = e => { sync = e.target.value === '1'; paint(); };
    $('#h-r').onchange = e => { region2 = e.target.checked; paint(); };
    paint();
  },
};

/* ---------- Convergence de configuration ---------- */
SIMS.converge = {
  title: 'Idempotence et convergence',
  intro: 'Quatre serveurs, chacun dans un état différent. Applique la configuration : seul ce qui s\'écarte change. Une deuxième passe ne doit plus rien modifier.',
  goals: m => [`Faire converger les 4 serveurs avec ${(m.simCfg || {}).tool || 'la configuration'}`, 'Relancer : 0 changement', 'Corriger une dérive sur un seul serveur'],
  run(k) {
    const T = k.cfg.tool || 'ansible-playbook site.yml', mode = k.cfg.mode || 'push';
    const hosts = [{ n: 'web-1', p: 0, c: 0, s: 0 }, { n: 'web-2', p: 1, c: 0, s: 0 }, { n: 'web-3', p: 1, c: 1, s: 0 }, { n: 'web-4', p: 0, c: 0, s: 0 }];
    let last = {}, converged = false, drift = false;
    k.stage.innerHTML = `<div class="sim-ctl"><button class="btn sm pri" id="a-r">${esc(mode === 'pull' ? 'Déclencher le run de l\'agent' : T)}</button><button class="btn sm" id="a-d">Dérive sur web-2</button></div>
    <div class="host" style="font-weight:700"><span>Hôte</span><b>nginx</b><b>conf</b><b>service</b></div><div id="a-h"></div><div class="kv" style="margin-top:8px"><span>Récapitulatif</span><b id="a-s">aucun run</b></div>`;
    const paint = () => {
      $('#a-h').innerHTML = hosts.map(h => `<div class="host"><span>${h.n}</span>${['p', 'c', 's'].map(f => {
        const l = last[h.n + f];
        return `<b class="${l === 'changed' ? 'ch' : h[f] ? 'ok' : 'ko'}">${l || (h[f] ? 'ok' : 'absent')}</b>`;
      }).join('')}</div>`).join('');
    };
    $('#a-r').onclick = () => {
      let ch = 0; last = {};
      hosts.forEach(h => ['p', 'c', 's'].forEach(f => { if (!h[f]) { h[f] = 1; last[h.n + f] = 'changed'; ch++; } else last[h.n + f] = 'ok'; }));
      paint();
      $('#a-s').textContent = `ok=${12 - ch} changed=${ch} failed=0`;
      k.log(`${mode === 'pull' ? 'Agents' : '$ ' + T} → ok=${12 - ch} changed=${ch} failed=0`, ch ? 't-warn' : 't-ok');
      if (converged && ch === 0) k.goal(1);
      if (drift && ch > 0 && ch < 4) { k.goal(2); drift = false; }
      if (ch > 0 && hosts.every(h => h.p && h.c && h.s)) { if (!converged) k.goal(0); converged = true; }
    };
    $('#a-d').onclick = () => { hosts[1].c = 0; last = {}; drift = true; paint(); k.log('Quelqu\'un a modifié nginx.conf sur web-2.', 't-bad'); };
    paint();
  },
};

/* ---------- Registre et promotion ---------- */
SIMS.registry = {
  title: 'Promotion d\'un artefact',
  intro: 'Une image ne se reconstruit pas entre les environnements : on promeut le même artefact, identifié par son digest. Une règle bloque tout ce qui contient une faille critique.',
  goals: () => ['Voir une image bloquée par le scan', 'Corriger puis promouvoir jusqu\'en prod', 'Signer l\'image promue', 'Nettoyer les anciennes versions'],
  run(k) {
    const R = k.cfg.reg || 'Registre';
    let imgs = [{ t: '1.3.0', crit: 2, env: 'dev', sig: false, dg: 'sha256:7f3a…' }, { t: '1.2.0', crit: 0, env: 'dev', sig: false, dg: 'sha256:c41e…' }, { t: '1.1.0', crit: 0, env: 'dev', sig: false, dg: 'sha256:09bb…' }, { t: '1.0.0', crit: 0, env: 'dev', sig: false, dg: 'sha256:aa12…' }];
    const ENV = ['dev', 'staging', 'prod'];
    k.stage.innerHTML = `<div class="sim-ctl"><button class="btn sm pri" id="r-n">Reconstruire avec une base à jour</button><button class="btn sm" id="r-c">Rétention : garder les 3 dernières</button></div><div class="cols" id="r-e"></div>`;
    const paint = () => {
      $('#r-e').innerHTML = ENV.map(e => `<div class="pane"><h4>${esc(R)} / ${e}</h4>${imgs.filter(i => i.env === e).map(i => `<div style="padding:6px 0;border-bottom:1px solid var(--soft);font-size:14px"><b style="font-family:var(--mono)">app:${i.t}</b> <span class="pill ${i.crit ? 'bad' : 'ok'}">${i.crit ? i.crit + ' critiques' : 'scan ok'}</span>${i.sig ? ' <span class="pill ok">signée</span>' : ''}<div style="font:400 12px var(--mono);color:var(--mute)">${i.dg}</div>
      <div class="sim-ctl" style="margin:4px 0 0">${e !== 'prod' ? `<button class="btn sm" data-p="${i.t}">Promouvoir</button>` : `<button class="btn sm" data-s="${i.t}">Signer</button>`}</div></div>`).join('') || '<p style="font-size:14px;color:var(--mute)">vide</p>'}</div>`).join('');
      $$('[data-p]', k.stage).forEach(b => b.onclick = () => {
        const i = imgs.find(x => x.t === b.dataset.p);
        if (i.crit) { k.log(`Refusé : app:${i.t} contient ${i.crit} failles critiques. La règle de promotion bloque.`, 't-bad'); k.goal(0); return; }
        i.env = ENV[ENV.indexOf(i.env) + 1]; k.log(`app:${i.t} promue vers ${i.env}. Même digest, aucun rebuild.`, 't-ok');
        if (i.env === 'prod' && i.t === '1.3.1') k.goal(1);
        paint();
      });
      $$('[data-s]', k.stage).forEach(b => b.onclick = () => { const i = imgs.find(x => x.t === b.dataset.s); i.sig = true; k.log(`$ cosign sign registry/app@${i.dg}`, 't-ok'); k.goal(2); paint(); });
    };
    $('#r-n').onclick = () => { if (imgs.some(i => i.t === '1.3.1')) return; imgs.unshift({ t: '1.3.1', crit: 0, env: 'dev', sig: false, dg: 'sha256:e92d…' }); k.log('Nouvelle image app:1.3.1, scan sans faille critique.', 't-ok'); paint(); };
    $('#r-c').onclick = () => {
      const devs = imgs.filter(i => i.env === 'dev'), drop = devs.slice(2).filter(i => i.t !== '1.3.1');
      if (!drop.length) return k.log('Rien à supprimer.', 't-mute');
      imgs = imgs.filter(i => !drop.includes(i)); k.log(`Rétention : ${drop.length} version(s) supprimée(s) de dev. La prod n'est jamais touchée.`, 't-ok'); k.goal(3); paint();
    };
    paint();
  },
};
