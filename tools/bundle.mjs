// Assemble la plateforme en un seul fichier dist/cinq-neufs.html, sans dépendance locale.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'css/app.css'), 'utf8');
const links = [...html.matchAll(/<link [^>]*fonts\.g[^>]*>/g)].map(m => m[0]).join('\n');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)]
  .map(m => readFileSync(join(root, m[1]), 'utf8').replaceAll('</script', '<\\/script'))
  .join('\n');

const page = `<title>Cinq Neufs</title>
<meta name="claude:viewport-fit-sides" content="cover">
${links}
<style>${css}</style>
<div id="app"></div>
<div id="toasts" aria-live="polite"></div>
<script>${scripts}</script>
`;
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/cinq-neufs.html'), page);
console.log('dist/cinq-neufs.html', Math.round(page.length / 1024), 'Ko');
