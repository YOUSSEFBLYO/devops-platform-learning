// Génère js/icons.js depuis le paquet simple-icons (logos en tracé unique, CC0).
// Usage : node tools/gen-icons.mjs <dossier>/package/icons
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2];
if (!dir) throw new Error('Indique le dossier icons de simple-icons');

const slugs = `linux gnubash python go git github gitlab bitbucket docker kubernetes helm googlecloud
terraform pulumi ansible chef puppet githubactions jenkins circleci argo flux vault prometheus grafana
datadog elastic graylog splunk opentelemetry jaeger istio linkerd consul envoyproxy nginx caddy apache
haproxy jfrog sonatype harbor cloudflare vercel netlify`.split(/\s+/);

const out = {};
for (const slug of slugs) {
  const file = join(dir, `${slug}.svg`);
  if (!existsSync(file)) { console.warn('absent :', slug); continue; }
  out[slug] = readFileSync(file, 'utf8').match(/ d="([^"]+)"/)[1];
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
writeFileSync(join(root, 'js', 'icons.js'), `window.ICONS=${JSON.stringify(out)};\n`);
console.log(Object.keys(out).length, 'icônes écrites');
