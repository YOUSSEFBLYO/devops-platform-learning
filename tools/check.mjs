// Valide le contenu et, avec --links, vérifie que chaque URL répond.
// Usage : node tools/check.mjs [--links]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = vm.createContext({ document: {}, console });
vm.runInContext('globalThis.window = globalThis;', ctx);
vm.runInContext(readFileSync(join(root, 'js/icons.js'), 'utf8'), ctx);
vm.runInContext(readFileSync(join(root, 'js/core.js'), 'utf8') + '\nglobalThis.__CN = CN;', ctx);
for (const f of readdirSync(join(root, 'js/data')).sort()) vm.runInContext(readFileSync(join(root, 'js/data', f), 'utf8'), ctx, { filename: f });
for (const f of ['sims-a.js', 'sims-b.js', 'sims-c.js']) vm.runInContext(readFileSync(join(root, 'js', f), 'utf8'), ctx, { filename: f });

const CN = ctx.__CN, SIMS = ctx.window.SIMS, errors = [];
const seen = new Set();
for (const m of CN.modules) {
  const e = t => errors.push(`${m.id}: ${t}`);
  if (seen.has(m.id)) e('id en double'); seen.add(m.id);
  if (m.l.length !== 3 || m.l.some(l => !l.length)) e('il faut 3 niveaux non vides');
  if (m.stage !== 'approches' && !m.lab) e('labo manquant');
  if (m.sim && !SIMS[m.sim]) e('simulateur inconnu ' + m.sim);
  (m.pre || []).forEach(p => { if (!CN.byId[p]) e('prérequis inconnu ' + p); });
  if (!m.quiz?.length) e('quiz manquant');
  m.quiz.forEach(q => { if (q.length !== 4 || !q[1][q[2]]) e('question invalide : ' + q[0]); });
  if (!m.project?.s?.length || !m.project.d) e('projet incomplet');
  if (!m.links?.length) e('liens manquants');
  m.lab?.steps.forEach(s => {
    let re;
    try { re = new RegExp(s[1]); } catch (x) { return e('regex invalide : ' + s[1]); }
    // La solution affichée doit toujours valider sa propre étape.
    if (!re.test(s[2].trim().replace(/\s+/g, ' '))) e(`solution refusée : « ${s[2]} » par /${s[1]}/`);
  });
}
CN.ultimates.forEach((u, i) => u.tech.forEach(t => { if (!CN.byId[t]) errors.push(`ultime ${i}: tech inconnue ${t}`); }));

const tech = CN.modules.filter(m => m.stage !== 'approches');
const n = l => l.reduce((a, b) => a + b, 0);
console.log(`${tech.length} technologies, ${CN.modules.length - tech.length} approches, ${CN.ultimates.length} ultimes`);
console.log(`${n(CN.modules.map(m => m.l.flat().length))} leçons, ${n(CN.modules.map(m => m.lab?.steps.length || 0))} étapes de labo, ${n(CN.modules.map(m => m.quiz.length))} questions, ${Object.keys(SIMS).length} simulateurs`);
console.log(errors.length ? errors.join('\n') : 'Contenu valide');

if (process.argv.includes('--links')) {
  const urls = new Map();
  const add = (u, w) => urls.set(u, [...(urls.get(u) || []), w]);
  CN.modules.forEach(m => { m.links.forEach(l => add(l[1], m.id)); if (m.lab?.real) add(m.lab.real[1], m.id); });
  CN.ultimates.forEach((u, i) => u.links.forEach(l => add(l[1], 'ultime' + i)));
  const list = [...urls.keys()], bad = [];
  const probe = async u => {
    try {
      const r = await fetch(u, { redirect: 'follow', signal: AbortSignal.timeout(20000), headers: { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130 Safari/537.36', accept: 'text/html,*/*' } });
      if (r.status >= 400) bad.push([r.status, u, urls.get(u).join(',')]);
      r.body?.cancel?.();
    } catch (x) { bad.push([x.cause?.code || x.name, u, urls.get(u).join(',')]); }
  };
  for (let i = 0; i < list.length; i += 12) await Promise.all(list.slice(i, i + 12).map(probe));
  console.log(`${list.length} liens testés, ${bad.length} en échec`);
  bad.forEach(b => console.log(b.join('  ')));
  writeFileSync(join(root, 'tools/links-report.json'), JSON.stringify(bad, null, 1));
}
process.exitCode = errors.length ? 1 : 0;
