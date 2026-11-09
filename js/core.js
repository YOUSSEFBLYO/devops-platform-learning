// Socle partagé : catalogue, progression, rendu de texte, utilitaires DOM.
const CN = { stages: [], modules: [], byId: {}, ultimates: [] };

function S(id, name, color, desc) { CN.stages.push({ id, name, color, desc }); }
function M(def) {
  def.stageObj = CN.stages.find(s => s.id === def.stage);
  if (!def.stageObj) throw new Error('Étape inconnue : ' + def.stage);
  CN.modules.push(def);
  CN.byId[def.id] = def;
}
function U(def) { CN.ultimates.push(def); }

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function inline(t) {
  return esc(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function md(text) {
  return text.trim().split(/\n\s*\n/).map(block => {
    const lines = block.trim().split('\n').map(l => l.trim());
    if (lines.every(l => l.startsWith('- '))) return '<ul>' + lines.map(l => `<li>${inline(l.slice(2))}</li>`).join('') + '</ul>';
    if (lines.every(l => /^\d+\. /.test(l))) return '<ol>' + lines.map(l => `<li>${inline(l.replace(/^\d+\. /, ''))}</li>`).join('') + '</ol>';
    return `<p>${inline(lines.join(' '))}</p>`;
  }).join('');
}

const KW = /\b(apiVersion|kind|metadata|spec|name|image|FROM|RUN|COPY|CMD|WORKDIR|ENV|EXPOSE|USER|AS|if|then|else|fi|for|do|done|while|func|package|import|return|def|class|with|from|try|except|resource|provider|variable|output|module|data|server|location|upstream|listen|hosts|tasks|jobs|steps|stages|on|runs-on|uses|script|frontend|backend|bind|const|let|new|export|async|await|function|sum|rate|by|histogram_quantile)\b/g;
function hl(code) {
  // Découpe commentaires et chaînes d'abord pour ne pas colorer ce qu'ils contiennent.
  const re = /(^|\s)(#(?!!).*|\/\/.*)$|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/gm;
  let out = '', last = 0, m;
  const plain = s => esc(s).replace(KW, '<span class="c-k">$1</span>').replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="c-n">$1</span>');
  while ((m = re.exec(code))) {
    const start = m.index + (m[1] ? m[1].length : 0);
    out += plain(code.slice(last, start));
    const tok = m[2] || m[3];
    out += `<span class="${m[2] ? 'c-c' : 'c-s'}">${esc(tok)}</span>`;
    last = start + tok.length;
    re.lastIndex = last;
  }
  return out + plain(code.slice(last));
}
function codeBlock(code, lang = 'bash') {
  const clean = code.replace(/^\n+|\s+$/g, '');
  return `<div class="code"><header><span>${esc(lang)}</span><button data-copy>Copier</button></header><pre tabindex="0"><code>${hl(clean)}</code></pre></div>`;
}
function tile(m, lg) {
  const s = m.icon && window.ICONS[m.icon];
  const inner = s ? `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${s}"/></svg>` : esc(m.mono || m.name.slice(0, 2));
  return `<span class="tile${lg ? ' lg' : ''}" style="--c:${m.stageObj.color}">${inner}</span>`;
}

/* ---------- Progression ---------- */
const KEY = 'cinq-neufs-v1';
const XP = { lesson: 10, lab: 40, sim: 40, quiz: 30, project: 60, links: 5, ultimate: 250 };
const RANKS = [[0, 'Stagiaire d\'astreinte'], [400, 'Admin junior'], [1200, 'Ops confirmé'], [2800, 'Ingénieur DevOps'], [5500, 'SRE'], [9000, 'Platform Engineer'], [13000, 'Architecte cinq neufs']];
const NINES = ['0', '90', '99', '99,9', '99,99', '99,999'];

const P = {
  s: { xp: 0, done: {}, checks: {}, days: [], last: null },
  cloudRef: null,
  load() {
    try { Object.assign(this.s, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* stockage indisponible */ }
    this.touchDay();
  },
  save() {
    try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* stockage indisponible */ }
    if (this.cloudRef) { clearTimeout(this.t); this.t = setTimeout(() => this.cloudRef.set(this.s).catch(() => {}), 1500); }
  },
  touchDay() {
    const d = new Date().toISOString().slice(0, 10);
    if (!this.s.days.includes(d)) { this.s.days.push(d); this.save(); }
  },
  merge(o) {
    if (!o) return;
    Object.assign(this.s.done, o.done);
    Object.assign(this.s.checks, o.checks);
    this.s.days = [...new Set([...this.s.days, ...(o.days || [])])].sort();
    this.s.xp = Math.max(this.s.xp, o.xp || 0);
    this.s.last = this.s.last || o.last;
  },
  // Sur claude.ai, la progression suit aussi le compte. Ailleurs, le navigateur suffit.
  async connect(refresh) {
    if (!window.claude || !window.claude.use) return;
    try {
      const [db, user] = await Promise.all([window.claude.use('db'), window.claude.use('user')]);
      if (!db || !user) return;
      const id = await user.id();
      if (!id) return;
      const ref = db.collection('data/users/' + id).doc('progress');
      const snap = await ref.get();
      if (snap.exists) this.merge(snap.data());
      this.cloudRef = ref;
      this.save();
      refresh();
    } catch { /* on reste sur le stockage local */ }
  },
  isDone(k) { return !!this.s.done[k]; },
  complete(k, xp, label) {
    if (this.s.done[k]) return false;
    const before = rank().name;
    this.s.done[k] = 1; this.s.xp += xp; this.save();
    toast(`+${xp} XP${label ? ' · ' + label : ''}`);
    if (rank().name !== before) toast(`Nouveau grade : ${rank().name}`);
    return true;
  },
  check(k, v) { if (v) this.s.checks[k] = 1; else delete this.s.checks[k]; this.save(); },
};

function rank() {
  let cur = RANKS[0], next = null;
  for (let i = 0; i < RANKS.length; i++) if (P.s.xp >= RANKS[i][0]) { cur = RANKS[i]; next = RANKS[i + 1] || null; }
  return { name: cur[1], floor: cur[0], next };
}
function ninesWon() { return CN.ultimates.filter((u, i) => P.isDone(`u:${i}`)).length; }
function uptime() {
  // Jours consécutifs d'activité jusqu'à aujourd'hui, comme un compteur d'uptime.
  const days = new Set(P.s.days); let n = 0; const d = new Date();
  while (days.has(d.toISOString().slice(0, 10))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}
function stepsOf(m) {
  const out = [];
  m.l.forEach((lvl, i) => lvl.forEach((ls, j) => out.push({ k: `l${i}.${j}`, type: 'lesson', lvl: i, ls, title: ls[0], xp: XP.lesson })));
  if (m.lab) out.push({ k: 'lab', type: 'lab', title: m.lab.title || 'Labo terminal', xp: XP.lab });
  if (m.sim) out.push({ k: 'sim', type: 'sim', title: 'Simulateur visuel', xp: XP.sim });
  out.push({ k: 'quiz', type: 'quiz', title: 'Quiz de validation', xp: XP.quiz });
  out.push({ k: 'project', type: 'project', title: 'Projet : ' + m.project.t, xp: XP.project });
  out.push({ k: 'links', type: 'links', title: 'Ressources et liens', xp: XP.links });
  return out;
}
function modPct(m) {
  const st = stepsOf(m);
  return Math.round(100 * st.filter(s => P.isDone(`${m.id}:${s.k}`)).length / st.length);
}
function modDone(m) { return modPct(m) === 100; }

function toast(msg) {
  const box = $('#toasts'); if (!box) return;
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; box.append(t);
  setTimeout(() => t.remove(), 2600);
}
