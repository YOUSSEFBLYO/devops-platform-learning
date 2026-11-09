M({
  id: 'git', name: 'Git', stage: 'code', icon: 'git', h: 14, sim: 'gitgraph', pre: ['linux'],
  pitch: 'La mémoire de tout ton travail, et le point de départ de toute automatisation.',
  l: [[
    ['Les trois zones', `Git suit tes fichiers à travers trois zones : le **répertoire de travail**, la **zone d'index** (staging) et l'**historique**. \`git add\` prépare, \`git commit\` enregistre un instantané.`, `git init
git status                # que s'est-il passé ?
git add app.py            # préparer
git commit -m "feat: page d'accueil"
git log --oneline --graph # relire l'histoire
git diff                  # ce qui n'est pas encore préparé`, 'bash', 'Ne committe jamais de secret. Même supprimé ensuite, il reste dans l\'historique. Ajoute `.env` à `.gitignore` dès le début.'],
    ['Branches et distants', `Une **branche** n'est qu'une étiquette mobile sur un commit, d'où sa légèreté. On développe sur une branche, puis on la pousse vers le dépôt distant pour la faire relire.`, `git switch -c feature/panier  # créer et basculer
git add . && git commit -m "feat: panier"
git push -u origin feature/panier
git switch main
git pull                      # récupérer les nouveautés
git merge feature/panier      # intégrer`, 'bash'],
  ], [
    ['Rebase, conflits et historique propre', `\`merge\` conserve l'histoire réelle avec un commit à deux parents. \`rebase\` rejoue tes commits sur la nouvelle base pour obtenir une ligne droite. Un **conflit** n'est pas une erreur : Git te demande de choisir entre deux changements.`, `git switch feature/panier
git rebase main           # rejouer mes commits sur main
# conflit : éditer le fichier, puis
git add panier.py
git rebase --continue

git rebase -i HEAD~3      # regrouper trois commits
git stash                 # mettre de côté
git cherry-pick a1b2c3    # appliquer un seul commit`, 'bash', 'Ne rebase jamais une branche partagée : tu réécris l\'historique des autres.'],
    ['Stratégies de branches et conventions', `**Trunk-based** : petites branches très courtes, intégration quotidienne dans \`main\`, fonctionnalités cachées derrière des feature flags. C'est le modèle des équipes qui livrent souvent. **Git Flow** convient plutôt aux logiciels versionnés avec des releases espacées.

Les **Conventional Commits** (\`feat:\`, \`fix:\`, \`chore:\`) permettent de générer changelog et version automatiquement.`, `git commit -m "fix(api): corrige le timeout du paiement"
git commit -m "feat(ui)!: nouvelle navigation"   # ! = rupture

git tag -a v1.4.0 -m "Release 1.4.0"
git push origin v1.4.0`, 'bash'],
  ], [
    ['Retrouver et réparer', `Presque rien n'est perdu dans Git. \`reflog\` garde la trace de tous les déplacements de HEAD. \`bisect\` retrouve par dichotomie le commit qui a introduit un bug. \`revert\` annule proprement un commit déjà partagé.`, `git reflog                    # historique des mouvements
git reset --hard HEAD@{2}     # revenir à un état passé

git bisect start
git bisect bad HEAD
git bisect good v1.3.0
git bisect run pytest tests/test_panier.py   # automatique !

git revert a1b2c3             # annule en créant un commit`, 'bash'],
    ['Sous le capot et grands dépôts', `Git est une base de données adressée par contenu : **blobs** pour les fichiers, **trees** pour les dossiers, **commits** pour les instantanés, reliés par leur hash.

Pour les gros dépôts : clones partiels, \`sparse-checkout\`, \`git maintenance\`. Pour supprimer un secret de l'historique, utilise \`git filter-repo\`, puis **révoque** le secret, car il a déjà pu être copié.`, `git cat-file -p HEAD              # lire l'objet commit
git cat-file -p HEAD^{tree}       # son arbre de fichiers

git clone --filter=blob:none --depth=1 URL   # clone partiel
git sparse-checkout set services/api
git filter-repo --path secrets.env --invert-paths`, 'bash'],
  ]],
  lab: {
    ctx: 'Un bug vient d\'arriver en production. Crée un correctif, publie-le, puis marque la version.',
    real: ['Learn Git Branching, exercices visuels', 'https://learngitbranching.js.org/?locale=fr_FR'],
    prompt: 'dev@laptop:~/boutique$',
    steps: [
      ['Regarde l\'état du dépôt.', '^git status', 'git status', `On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean`],
      ['Crée et bascule sur la branche `fix/paiement`.', '^git (switch -c|checkout -b) fix/paiement', 'git switch -c fix/paiement', "Switched to a new branch 'fix/paiement'"],
      ['Prépare `paiement.py`.', '^git add (paiement\\.py|\\.|-A)', 'git add paiement.py', ''],
      ['Committe avec le message `fix: corrige le timeout`.', '^git commit -m ["\']fix: corrige le timeout["\']', 'git commit -m "fix: corrige le timeout"', `[fix/paiement 8fa21c3] fix: corrige le timeout
 1 file changed, 3 insertions(+), 1 deletion(-)`],
      ['Pousse la branche et configure son suivi.', '^git push (-u|--set-upstream) origin fix/paiement', 'git push -u origin fix/paiement', `To github.com:acme/boutique.git
 * [new branch]      fix/paiement -> fix/paiement`],
      ['Après la fusion sur `main`, crée le tag annoté `v1.4.1`.', '^git tag -a v1\\.4\\.1', 'git tag -a v1.4.1 -m "Correctif paiement"', ''],
    ],
  },
  quiz: [
    ['Quelle commande annule un commit déjà poussé sans réécrire l\'historique ?', ['`git revert`', '`git reset --hard`', '`git rebase`', '`git clean`'], 0, '`revert` crée un nouveau commit inverse.'],
    ['Comment retrouver un commit perdu après un `reset` ?', ['`git reflog`', '`git status`', '`git fetch`', '`git ignore`'], 0, 'Le reflog garde les positions passées de HEAD.'],
    ['Quel outil automatise la recherche du commit fautif ?', ['`git bisect`', '`git blame`', '`git stash`', '`git tag`'], 0, 'Il fait une recherche dichotomique entre un bon et un mauvais commit.'],
    ['Quel modèle favorise les branches très courtes ?', ['Trunk-based development', 'Git Flow', 'Forking workflow', 'Branches par environnement'], 0, 'Il réduit les conflits et accélère l\'intégration.'],
    ['Tu as committé un mot de passe. Quelle action compte le plus ?', ['Révoquer le mot de passe', 'Supprimer le fichier', 'Renommer la branche', 'Faire un nouveau commit'], 0, 'Considère-le comme compromis, même après nettoyage de l\'historique.'],
  ],
  project: {
    t: 'Dépôt d\'équipe exemplaire',
    b: 'Mets en place un dépôt qu\'une équipe aurait plaisir à utiliser.',
    s: ['Écrire `.gitignore`, `README` et `CONTRIBUTING`', 'Installer un hook `pre-commit` qui bloque les secrets avec gitleaks', 'Imposer les Conventional Commits avec commitlint', 'Simuler un conflit et le résoudre par rebase', 'Trouver un bug injecté avec `git bisect run`', 'Générer le changelog et un tag sémantique'],
    d: 'un commit contenant une fausse clé AWS est refusé et le changelog se génère depuis l\'historique.',
    x: 'Automatise les releases avec semantic-release dans la CI.',
  },
  links: [
    ['Pro Git, en français', 'https://git-scm.com/book/fr/v2', 'book'],
    ['Learn Git Branching', 'https://learngitbranching.js.org/?locale=fr_FR', 'lab'],
    ['Oh My Git!, le jeu', 'https://ohmygit.org/', 'lab'],
    ['Oh Shit, Git!?!', 'https://ohshitgit.com/fr', 'blog'],
    ['Conventional Commits', 'https://www.conventionalcommits.org/fr/v1.0.0/', 'doc'],
    ['Trunk Based Development', 'https://trunkbaseddevelopment.com/', 'doc'],
  ],
});

M({
  id: 'github', name: 'GitHub', stage: 'code', icon: 'github', h: 8, pre: ['git'],
  pitch: 'La plateforme où le code se relit, se discute et déclenche l\'automatisation.',
  l: [[
    ['Pull requests et revue', `Une **pull request** propose de fusionner une branche. C'est le lieu de la revue : discussion ligne par ligne, tests automatiques, approbation. La CLI \`gh\` permet tout cela sans quitter le terminal.`, `gh auth login
gh repo clone acme/boutique
gh pr create --fill --reviewer alice
gh pr status
gh pr checks --watch
gh pr merge --squash --delete-branch`, 'bash', 'Une PR de 2 000 lignes n\'est jamais vraiment relue. Vise moins de 300 lignes.'],
  ], [
    ['Protéger main et automatiser', `Un **ruleset** impose ses règles à la branche : revue obligatoire, tests au vert, commits signés. Le fichier **CODEOWNERS** désigne les relecteurs par dossier et **Dependabot** propose les mises à jour de dépendances.`, `# .github/CODEOWNERS
/infra/    @acme/plateforme
/api/      @acme/backend

# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
  - package-ecosystem: docker
    directory: /
    schedule: { interval: weekly }`, 'yaml'],
  ], [
    ['Sécurité et plateforme à l\'échelle', `À grande échelle, GitHub devient une plateforme : **Code Scanning** avec CodeQL, **Secret Scanning** avec blocage au push, identités **OIDC** pour déployer sans clé longue durée, API GraphQL pour automatiser l'organisation, GitHub Apps à la place des tokens personnels.`, `# Interroger l'API : PR ouvertes depuis plus de 7 jours
gh pr list --json number,title,createdAt \\
  --jq '.[] | select(.createdAt < (now - 604800 | todate)) | .title'

# Activer la protection contre le push de secrets
gh api -X PATCH repos/acme/boutique \\
  -f 'security_and_analysis[secret_scanning_push_protection][status]=enabled'`, 'bash'],
  ]],
  lab: {
    ctx: 'Utilise la CLI `gh` pour faire passer un correctif de la branche à la fusion.',
    real: ['GitHub Skills, cours interactifs', 'https://skills.github.com/'],
    prompt: 'dev@laptop:~/boutique$',
    steps: [
      ['Crée une PR à partir des informations de tes commits.', '^gh pr create', 'gh pr create --fill', 'https://github.com/acme/boutique/pull/142'],
      ['Demande une revue à `alice` sur la PR 142.', '^gh pr edit 142 --add-reviewer alice', 'gh pr edit 142 --add-reviewer alice', 'https://github.com/acme/boutique/pull/142'],
      ['Regarde l\'état des contrôles de la PR.', '^gh pr checks', 'gh pr checks 142', `✓ lint    12s
✓ tests   1m04s
✓ build   48s`],
      ['Fusionne en squash et supprime la branche.', '^gh pr merge.*--squash.*(-d|--delete-branch)|^gh pr merge.*(-d|--delete-branch).*--squash', 'gh pr merge 142 --squash --delete-branch', '✓ Squashed and merged pull request #142'],
    ],
  },
  quiz: [
    ['À quoi sert le fichier CODEOWNERS ?', ['Assigner automatiquement les relecteurs', 'Lister les licences', 'Stocker les secrets', 'Configurer la CI'], 0, 'Combiné à un ruleset, il rend leur revue obligatoire.'],
    ['Quel est l\'intérêt d\'OIDC pour déployer ?', ['Remplacer les clés longue durée par des jetons temporaires', 'Accélérer les builds', 'Compresser les logs', 'Chiffrer le dépôt'], 0, 'Le cloud fait confiance à l\'identité du workflow.'],
    ['Quelle fonction refuse un push contenant un secret ?', ['Push protection', 'Dependabot', 'GitHub Pages', 'Projects'], 0, 'Elle bloque avant que le secret n\'entre dans l\'historique.'],
  ],
  project: {
    t: 'Organisation prête pour la production',
    b: 'Configure un dépôt GitHub comme le ferait une équipe plateforme.',
    s: ['Créer un ruleset sur `main` : revue et tests requis', 'Ajouter CODEOWNERS et des modèles d\'issue et de PR', 'Activer Dependabot pour le code et les images', 'Activer CodeQL et la protection contre les secrets', 'Écrire un script `gh` listant les PR en retard'],
    d: 'il est impossible de pousser directement sur `main` et une PR sans test au vert ne peut pas être fusionnée.',
  },
  links: [
    ['Documentation GitHub', 'https://docs.github.com/fr', 'doc'],
    ['GitHub Skills', 'https://skills.github.com/', 'lab'],
    ['Manuel de la CLI gh', 'https://cli.github.com/manual/', 'doc'],
    ['Rulesets', 'https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/about-rulesets', 'doc'],
  ],
});

M({
  id: 'gitlab', name: 'GitLab', stage: 'code', icon: 'gitlab', h: 8, pre: ['git'],
  pitch: 'Une plateforme DevSecOps tout-en-un, disponible en SaaS ou en auto-hébergé.',
  l: [[
    ['Groupes, projets et merge requests', `GitLab organise le travail en **groupes** imbriqués et en **projets**. La **merge request** joue le même rôle que la pull request. Le grand atout de GitLab est de tout réunir : code, CI/CD, registre, sécurité, tickets.`, `git push -o merge_request.create \\
         -o merge_request.target=main \\
         -o merge_request.title="Corrige le panier" \\
         origin feature/panier

glab mr create --fill      # avec la CLI officielle
glab mr list --reviewer=@me`, 'bash'],
  ], [
    ['Protéger et auditer', `Les **branches protégées** définissent qui peut pousser ou fusionner. Les **approval rules** imposent des revues, les **deploy tokens** donnent un accès limité, et les **environnements protégés** contrôlent qui peut déployer en production.`, `# .gitlab/CODEOWNERS
[Plateforme][2]
/infra/ @acme/plateforme

[Backend]
/api/ @acme/backend`, 'text'],
  ], [
    ['Auto-hébergement et runners', `GitLab s'installe sur tes serveurs : c'est souvent le choix des entreprises soumises à des exigences de souveraineté. Les sujets avancés sont la haute disponibilité avec Gitaly Cluster, les sauvegardes, et la mise à l'échelle des runners sur Kubernetes.`, `# Helm : runners éphémères sur Kubernetes
helm repo add gitlab https://charts.gitlab.io
helm install runner gitlab/gitlab-runner \\
  --set gitlabUrl=https://gitlab.acme.fr \\
  --set runners.config='[[runners]]
  [runners.kubernetes]
    namespace = "ci"
    image = "alpine:3.20"'

sudo gitlab-backup create   # sauvegarde complète`, 'bash', 'La sauvegarde de GitLab ne contient pas `gitlab-secrets.json`. Sans ce fichier, la restauration perd les données chiffrées.'],
  ]],
  lab: {
    ctx: 'Tu utilises `glab`, la CLI officielle, pour faire avancer une merge request.',
    real: ['GitLab University', 'https://university.gitlab.com/'],
    prompt: 'dev@laptop:~/boutique$',
    steps: [
      ['Crée la merge request depuis tes commits.', '^glab mr create', 'glab mr create --fill', '!87 Corrige le panier (feature/panier)'],
      ['Affiche l\'état du pipeline courant.', '^glab (ci status|pipeline status)', 'glab ci status', '(success) ✓ test, build, deploy-staging'],
      ['Approuve la merge request 87.', '^glab mr approve 87', 'glab mr approve 87', '✓ Approved merge request !87'],
      ['Fusionne-la.', '^glab mr merge 87', 'glab mr merge 87', '✓ Merged !87'],
    ],
  },
  quiz: [
    ['Quel est le principal argument de GitLab ?', ['Une plateforme unique, de la planification au déploiement', 'Être réservé à Windows', 'Ne pas gérer la CI', 'Remplacer Linux'], 0, 'Il réduit le nombre d\'outils à intégrer.'],
    ['Quel fichier manque souvent à une restauration ratée ?', ['`gitlab-secrets.json`', '`package.json`', '`.bashrc`', '`hosts`'], 0, 'Il doit être sauvegardé à part.'],
    ['Comment contrôler qui déploie en production ?', ['Avec des environnements protégés', 'Avec un fichier `.gitignore`', 'Avec un wiki', 'C\'est impossible'], 0, 'Seuls les rôles autorisés peuvent lancer le job.'],
  ],
  project: {
    t: 'GitLab privé',
    b: 'Monte ton propre GitLab sur une VM de 8 Go de RAM ou utilise le niveau gratuit de gitlab.com.',
    s: ['Installer GitLab CE avec Docker Compose', 'Créer un groupe et deux projets', 'Enregistrer un runner et lancer un pipeline', 'Protéger `main` et imposer une approbation', 'Sauvegarder puis restaurer sur une seconde instance'],
    d: 'la restauration retrouve les projets, les utilisateurs et les variables de CI chiffrées.',
  },
  links: [
    ['Documentation GitLab', 'https://docs.gitlab.com/', 'doc'],
    ['GitLab University', 'https://university.gitlab.com/', 'cours'],
    ['CLI glab', 'https://gitlab.com/gitlab-org/cli', 'repo'],
    ['GitLab Runner', 'https://docs.gitlab.com/runner/', 'doc'],
  ],
});

M({
  id: 'bitbucket', name: 'Bitbucket', stage: 'code', icon: 'bitbucket', h: 5, pre: ['git'],
  pitch: 'L\'hébergement Git d\'Atlassian, intégré à Jira et Confluence.',
  l: [[
    ['Workspaces, dépôts et pull requests', `Bitbucket Cloud organise les dépôts dans des **workspaces** et des **projets**. Sa force est le lien avec **Jira** : une clé de ticket dans le nom de branche ou le message relie automatiquement le code au ticket.`, `git switch -c feature/SHOP-142-panier
git commit -m "SHOP-142 ajoute le panier"
git push -u origin feature/SHOP-142-panier
# La branche et la PR apparaissent sur le ticket Jira SHOP-142`, 'bash'],
  ], [
    ['Bitbucket Pipelines', `La CI est décrite dans \`bitbucket-pipelines.yml\`. Chaque \`step\` tourne dans un conteneur. Les **pipes** sont des actions toutes faites, par exemple pour déployer vers AWS, et les **deployments** suivent les environnements.`, `image: node:22
pipelines:
  branches:
    main:
      - step:
          name: Tests
          caches: [node]
          script: [npm ci, npm test]
      - step:
          name: Déploiement
          deployment: production
          trigger: manual
          script:
            - pipe: atlassian/aws-s3-deploy:1.6.1
              variables:
                S3_BUCKET: boutique
                LOCAL_PATH: dist`, 'yaml'],
  ], [
    ['Sécurité et gouvernance', `Les **branch restrictions** bloquent les pushes directs et exigent des approbations. Les **merge checks** imposent des tâches résolues et des builds réussis. Avec **OIDC**, Pipelines obtient un rôle AWS temporaire sans stocker de clé.`, `- step:
    oidc: true
    script:
      - export AWS_ROLE_ARN=arn:aws:iam::123456789012:role/bitbucket-deploy
      - export AWS_WEB_IDENTITY_TOKEN_FILE=$(pwd)/web-identity-token
      - echo $BITBUCKET_STEP_OIDC_TOKEN > $AWS_WEB_IDENTITY_TOKEN_FILE
      - aws sts get-caller-identity`, 'yaml'],
  ]],
  lab: {
    ctx: 'Relie ton travail à Jira et déclenche un pipeline.',
    real: ['Tutoriels Git d\'Atlassian', 'https://www.atlassian.com/fr/git/tutorials'],
    prompt: 'dev@laptop:~/boutique$',
    steps: [
      ['Crée une branche liée au ticket `SHOP-142`, nommée `feature/SHOP-142-panier`.', '^git (switch -c|checkout -b) feature/SHOP-142-panier', 'git switch -c feature/SHOP-142-panier', "Switched to a new branch 'feature/SHOP-142-panier'"],
      ['Committe avec un message commençant par la clé du ticket.', '^git commit -m ["\']SHOP-142', 'git commit -m "SHOP-142 ajoute le panier"', '[feature/SHOP-142-panier 2bc91aa] SHOP-142 ajoute le panier'],
      ['Pousse la branche.', '^git push (-u|--set-upstream) origin feature/SHOP-142-panier', 'git push -u origin feature/SHOP-142-panier', 'remote: Create pull request for feature/SHOP-142-panier\nremote: Pipeline #318 started'],
    ],
  },
  quiz: [
    ['Comment Bitbucket relie-t-il un commit à Jira ?', ['Avec la clé du ticket dans le message ou la branche', 'Avec un fichier XML', 'Manuellement dans Jira uniquement', 'Par e-mail'], 0, 'La détection est automatique.'],
    ['Quel fichier décrit la CI ?', ['`bitbucket-pipelines.yml`', '`Jenkinsfile`', '`.gitlab-ci.yml`', '`Makefile`'], 0, 'Il se place à la racine du dépôt.'],
    ['À quoi sert un pipe ?', ['Réutiliser une étape toute faite', 'Stocker des images', 'Fusionner des branches', 'Faire du DNS'], 0, 'C\'est l\'équivalent d\'une action GitHub.'],
  ],
  project: {
    t: 'Chaîne Jira vers déploiement',
    b: 'Avec un compte Bitbucket et Jira gratuits, crée le trajet complet d\'un ticket.',
    s: ['Créer un projet Jira et un workspace Bitbucket', 'Relier les deux produits', 'Ajouter un pipeline de tests et de déploiement', 'Protéger `main` avec des branch restrictions', 'Fermer un ticket depuis un commit'],
    d: 'le ticket Jira affiche la branche, la PR, le build et le déploiement.',
  },
  links: [
    ['Documentation Bitbucket Cloud', 'https://support.atlassian.com/bitbucket-cloud/', 'doc'],
    ['Bitbucket Pipelines', 'https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/', 'doc'],
    ['Tutoriels Git Atlassian', 'https://www.atlassian.com/fr/git/tutorials', 'cours'],
  ],
});
