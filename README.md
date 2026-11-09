# Cinq Neufs

Plateforme d'apprentissage DevOps : 56 technologies et 9 approches, du niveau débutant au niveau avancé, avec labos, simulateurs, quiz, projets et 5 projets ultimes.

## Lancer

Double-clique sur `index.html`, ou lance un serveur local :

```bash
python -m http.server 5291
```

Aucune installation n'est nécessaire. Sans connexion, seules les polices changent.

## Organisation

- `js/data/` : le contenu, un fichier par étape du parcours
- `js/sims-*.js` : les 18 simulateurs visuels
- `js/lab.js` : le terminal d'entraînement
- `js/app.js` : les vues et la navigation
- `js/core.js` : la progression et les utilitaires
- `tools/` : les scripts de contrôle et d'assemblage

## Ajouter une technologie

Ajoute un bloc `M({ ... })` dans le fichier de `js/data/` qui correspond, puis contrôle le contenu :

```bash
node tools/check.mjs --links
```

Le script vérifie notamment que la solution de chaque étape de labo est bien acceptée.

## Publier en un seul fichier

```bash
node tools/bundle.mjs
```

Le résultat est écrit dans `dist/cinq-neufs.html`.

## Limites

Les labos et les simulateurs reproduisent le comportement des outils : ils n'exécutent aucune commande réelle. Les sorties sont écrites à l'avance et les tarifs du simulateur serverless sont indicatifs. Chaque module indique où pratiquer sur un vrai environnement.

Hors de claude.ai, la progression reste dans le navigateur utilisé.
