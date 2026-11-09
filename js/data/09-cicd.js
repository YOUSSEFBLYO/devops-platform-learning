M({
  id: 'gha', name: 'GitHub Actions', stage: 'cicd', icon: 'githubactions', h: 12, sim: 'pipeline', simCfg: { ci: 'le workflow' }, pre: ['github'],
  pitch: 'La CI/CD intégrée à GitHub : des workflows YAML déclenchés par les événements du dépôt.',
  l: [[
    ['Workflow, jobs, steps', `Un **workflow** vit dans \`.github/workflows/\`. Il réagit à un **événement** et lance des **jobs**, composés de **steps**. Une **action** est une étape réutilisable.`, `name: CI
on:
  push: { branches: [main] }
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm test`, 'yaml'],
  ], [
    ['Matrice, cache et environnements', `Une **matrice** multiplie un job sur plusieurs versions. \`needs\` crée des dépendances. Les **environments** ajoutent une validation humaine et leurs propres secrets. Les **artefacts** transmettent des fichiers entre jobs.`, `jobs:
  test:
    strategy:
      matrix: { node: [20, 22] }
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "\${{ matrix.node }}", cache: npm }
      - run: npm ci && npm test
  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: echo "Déploiement de \${{ github.sha }}"`, 'yaml'],
  ], [
    ['Déployer sans clé et réutiliser', `Avec **OIDC**, le job obtient un jeton temporaire reconnu par le cloud : plus aucune clé stockée. Les **workflows réutilisables** centralisent les pipelines, et les permissions minimales réduisent le risque.`, `permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/github-deploy
          aws-region: eu-west-3
      - run: aws sts get-caller-identity

# Workflow réutilisable appelé par un autre dépôt :
# uses: acme/pipelines/.github/workflows/deploy.yml@v3`, 'yaml', 'Épingle les actions tierces par SHA de commit, pas seulement par tag : un tag peut être déplacé par un attaquant.'],
  ]],
  lab: {
    ctx: 'Déclenche et surveille un workflow avec la CLI `gh`.',
    real: ['GitHub Skills : Hello GitHub Actions', 'https://skills.github.com/'],
    prompt: 'dev@laptop:~/boutique$',
    steps: [
      ['Liste les workflows du dépôt.', '^gh workflow list', 'gh workflow list', 'CI      active  1204\nDeploy  active  1205'],
      ['Lance le workflow `Deploy` sur `main`.', '^gh workflow run (Deploy|deploy\\.yml) .*(--ref|-r)[ =]main', 'gh workflow run Deploy --ref main', '✓ Created workflow_dispatch event for deploy.yml at main'],
      ['Liste les dernières exécutions.', '^gh run list', 'gh run list --limit 3', 'completed  failure  fix: panier  CI  main  push  9981  1m12s'],
      ['Lis les logs en échec du run `9981`.', '^gh run view 9981 .*--log-failed', 'gh run view 9981 --log-failed', 'test  npm test  FAIL tests/panier.test.js\ntest  npm test  Expected 2, received 3'],
      ['Après correctif, relance uniquement les jobs en échec.', '^gh run rerun 9981 .*--failed', 'gh run rerun 9981 --failed', '✓ Requested rerun of failed jobs in run 9981'],
    ],
  },
  quiz: [
    ['Quel est le gain d\'OIDC pour déployer ?', ['Aucune clé de longue durée stockée', 'Un build plus rapide', 'Plus de minutes gratuites', 'Une nouvelle syntaxe'], 0, 'Le jeton expire en quelques minutes.'],
    ['Comment exiger une approbation avant la production ?', ['Avec un environnement protégé', 'Avec un commentaire', 'Avec `continue-on-error`', 'Avec un tag'], 0, 'Les relecteurs requis se configurent sur l\'environnement.'],
    ['Pourquoi épingler une action par SHA ?', ['Un tag peut être déplacé', 'C\'est plus lisible', 'C\'est obligatoire', 'Cela accélère le cache'], 0, 'Cela protège contre une attaque de la chaîne logicielle.'],
    ['Que fait `needs` ?', ['Il crée une dépendance entre jobs', 'Il installe un paquet', 'Il définit une variable', 'Il annule le job'], 0, 'Le job attend et ne se lance qu\'en cas de succès.'],
  ],
  project: {
    t: 'Pipeline complet de bout en bout',
    b: 'Du commit au déploiement pour une application conteneurisée.',
    s: ['Lint et tests avec une matrice', 'Construire et pousser l\'image sur GHCR avec cache', 'Scanner avec Trivy et publier les résultats dans l\'onglet Security', 'Déployer sur staging automatiquement', 'Déployer en production après validation, via OIDC', 'Extraire le déploiement dans un workflow réutilisable'],
    d: 'une PR rouge ne fusionne pas et un merge sur `main` arrive en production sans aucune clé stockée.',
    x: 'Génère une attestation de build avec `actions/attest-build-provenance`.',
  },
  links: [
    ['Documentation Actions', 'https://docs.github.com/fr/actions', 'doc'],
    ['Marketplace', 'https://github.com/marketplace?type=actions', 'doc'],
    ['Renforcement de la sécurité', 'https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions', 'doc'],
    ['act, lancer les workflows en local', 'https://github.com/nektos/act', 'repo'],
  ],
});

M({
  id: 'gitlabci', name: 'GitLab CI', stage: 'cicd', icon: 'gitlab', mono: 'CI', h: 10, sim: 'pipeline', simCfg: { ci: 'le pipeline GitLab' }, pre: ['gitlab'],
  pitch: 'Des pipelines puissants décrits dans `.gitlab-ci.yml`, avec environnements et registre intégrés.',
  l: [[
    ['Stages et jobs', `Les **stages** s'exécutent dans l'ordre et les jobs d'un même stage en parallèle. Un **runner** exécute chaque job, souvent dans un conteneur.`, `stages: [test, build, deploy]

test:
  stage: test
  image: node:22
  cache:
    paths: [node_modules/]
  script:
    - npm ci
    - npm test

build:
  stage: build
  image: docker:27
  services: [docker:27-dind]
  script:
    - docker build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA .
    - docker push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHORT_SHA`, 'yaml'],
  ], [
    ['Règles, DAG et environnements', `\`rules\` choisit quand un job s'exécute, \`needs\` crée un graphe plus rapide que les stages, \`environment\` trace les déploiements. Les **review apps** créent un environnement par merge request.`, `deploy_review:
  stage: deploy
  script: ./deploy.sh review-$CI_COMMIT_REF_SLUG
  environment:
    name: review/$CI_COMMIT_REF_SLUG
    url: https://$CI_COMMIT_REF_SLUG.preview.acme.fr
    on_stop: stop_review
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"

deploy_prod:
  stage: deploy
  needs: [test, build]
  script: ./deploy.sh prod
  environment: production
  rules:
    - if: $CI_COMMIT_BRANCH == "main"
      when: manual`, 'yaml'],
  ], [
    ['Composants et pipelines enfants', `Les **CI/CD Components** partagent des briques versionnées. Les **pipelines enfants** découpent un monorepo : seuls les services modifiés sont construits. Avec \`id_tokens\`, le job obtient un jeton OIDC vers le cloud.`, `include:
  - component: gitlab.com/acme/ci/docker-build@1.4
    inputs: { registry: $CI_REGISTRY_IMAGE }

api:
  trigger:
    include: services/api/.gitlab-ci.yml
    strategy: depend
  rules:
    - changes: [services/api/**/*]

deploy:
  id_tokens:
    AWS_TOKEN: { aud: https://gitlab.com }
  script:
    - aws sts assume-role-with-web-identity --role-arn $ROLE --role-session-name ci --web-identity-token $AWS_TOKEN`, 'yaml'],
  ]],
  lab: {
    ctx: 'Valide ta configuration puis pilote le pipeline avec `glab`.',
    prompt: 'dev@laptop:~/boutique$',
    steps: [
      ['Valide `.gitlab-ci.yml`.', '^glab ci lint', 'glab ci lint', '✓ CI/CD YAML is valid!'],
      ['Lance un pipeline sur `main`.', '^glab ci run( .*-b[ =]?main| .*--branch[ =]main)?', 'glab ci run -b main', 'Created pipeline (id: 4410), status: created'],
      ['Regarde son état.', '^glab ci status', 'glab ci status', 'test ✓  build ✓  deploy_prod ⏸ manual'],
      ['Déclenche le job manuel `deploy_prod`.', '^glab ci trigger deploy_prod', 'glab ci trigger deploy_prod', 'Triggered job (id: 77120), status: running'],
    ],
  },
  quiz: [
    ['Que fait `needs` ?', ['Il crée un graphe de dépendances', 'Il installe des paquets', 'Il protège une branche', 'Il définit un secret'], 0, 'Un job démarre dès que ses dépendances sont prêtes.'],
    ['Qu\'est-ce qu\'une review app ?', ['Un environnement éphémère par merge request', 'Un outil de revue de code', 'Une application mobile', 'Un rapport'], 0, 'On teste le changement avant de fusionner.'],
    ['Quel mot-clé ne lance un job que si certains fichiers changent ?', ['`rules: changes`', '`cache`', '`image`', '`tags`'], 0, 'Très utile dans un monorepo.'],
  ],
  project: {
    t: 'Monorepo à pipelines enfants',
    b: 'Crée un dépôt avec deux services et un pipeline intelligent.',
    s: ['Séparer `services/api` et `services/web`', 'Ne construire que le service modifié', 'Publier les images dans le registre GitLab', 'Créer une review app par merge request', 'Déployer en production avec validation manuelle'],
    d: 'un changement dans `web` ne reconstruit jamais `api`.',
  },
  links: [
    ['Documentation GitLab CI/CD', 'https://docs.gitlab.com/ci/', 'doc'],
    ['Catalogue CI/CD', 'https://gitlab.com/explore/catalog', 'doc'],
    ['Référence YAML', 'https://docs.gitlab.com/ci/yaml/', 'doc'],
  ],
});

M({
  id: 'jenkins', name: 'Jenkins', stage: 'cicd', icon: 'jenkins', h: 12, sim: 'pipeline', simCfg: { ci: 'le pipeline Jenkins' }, pre: ['docker'],
  pitch: 'Le serveur d\'automatisation historique, extensible par plugins et auto-hébergé.',
  l: [[
    ['Le Jenkinsfile', `Le pipeline se versionne avec le code dans un **Jenkinsfile**. La syntaxe déclarative décrit des **stages** et un **agent** pour les exécuter.`, `pipeline {
  agent { docker { image 'node:22' } }
  stages {
    stage('Installer') { steps { sh 'npm ci' } }
    stage('Tester') {
      steps { sh 'npm test' }
      post { always { junit 'reports/*.xml' } }
    }
    stage('Construire') {
      when { branch 'main' }
      steps { sh 'docker build -t acme/api:$GIT_COMMIT .' }
    }
  }
  post { failure { echo 'Pipeline en échec' } }
}`, 'groovy'],
  ], [
    ['Agents et identifiants', `Le contrôleur orchestre et les **agents** exécutent. Les **credentials** stockent les secrets, injectés avec \`withCredentials\`. Les **Multibranch Pipelines** créent un job par branche automatiquement.`, `pipeline {
  agent { label 'linux && docker' }
  stages {
    stage('Parallèle') {
      parallel {
        stage('Unit') { steps { sh 'npm run test:unit' } }
        stage('Lint') { steps { sh 'npm run lint' } }
      }
    }
    stage('Publier') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'ghcr', usernameVariable: 'U', passwordVariable: 'P')]) {
          sh 'echo "$P" | docker login ghcr.io -u "$U" --password-stdin'
          sh 'docker push ghcr.io/acme/api:$GIT_COMMIT'
        }
      }
    }
    stage('Prod') {
      steps { input message: 'Déployer en production ?' ; sh './deploy.sh' }
    }
  }
}`, 'groovy'],
  ], [
    ['Configuration as Code et agents éphémères', `Un Jenkins manuel devient vite impossible à maintenir. **JCasC** décrit toute sa configuration en YAML. Les **Shared Libraries** centralisent la logique, et le plugin Kubernetes crée un pod agent par build.`, `# jenkins.yaml (JCasC)
jenkins:
  systemMessage: "Configuré par JCasC"
  numExecutors: 0
  clouds:
    - kubernetes:
        name: k8s
        namespace: ci
        templates:
          - name: node
            label: node
            containers:
              - name: node
                image: node:22
unclassified:
  location: { url: https://ci.acme.fr }`, 'yaml', 'Mets à jour Jenkins et ses plugins très régulièrement : ils concentrent une grande part des failles. Moins il y a de plugins, mieux c\'est.'],
  ]],
  lab: {
    ctx: 'Lance Jenkins dans Docker et récupère son accès initial.',
    prompt: 'ops@laptop:~$',
    steps: [
      ['Crée un volume `jenkins_home`.', '^docker volume create jenkins_home', 'docker volume create jenkins_home', 'jenkins_home'],
      ['Lance `jenkins/jenkins:lts-jdk21` en arrière-plan, nom `jenkins`, port 8080.', '^docker run .*jenkins/jenkins:lts-jdk21', 'docker run -d --name jenkins -p 8080:8080 -v jenkins_home:/var/jenkins_home jenkins/jenkins:lts-jdk21', 'c91e2fa7b8d1'],
      ['Lis le mot de passe initial dans le conteneur.', '^docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword', 'docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword', '3f6b0c2e8a1d4f97b5c6e0d2a7f91c34'],
      ['Regarde les logs pour confirmer le démarrage.', '^docker logs (-f )?jenkins', 'docker logs jenkins', 'Jenkins is fully up and running'],
    ],
  },
  quiz: [
    ['Où versionner le pipeline ?', ['Dans un Jenkinsfile, dans le dépôt', 'Dans l\'interface seulement', 'Dans un mail', 'Dans `/tmp`'], 0, 'Le pipeline évolue avec le code.'],
    ['Pourquoi mettre 0 exécuteur sur le contrôleur ?', ['Pour isoler le contrôleur des builds', 'Pour économiser la licence', 'Par obligation', 'Pour accélérer l\'UI'], 0, 'Un build ne doit pas accéder aux secrets du contrôleur.'],
    ['Que décrit JCasC ?', ['La configuration de Jenkins en YAML', 'Un langage de build', 'Une image', 'Un agent Windows'], 0, 'Un Jenkins se recrée alors à l\'identique.'],
    ['Comment partager du code entre pipelines ?', ['Avec une Shared Library', 'En copiant-collant', 'Avec un plugin SSH', 'Avec Docker Hub'], 0, 'Elle se versionne dans un dépôt dédié.'],
  ],
  project: {
    t: 'Jenkins reproductible',
    b: 'Monte un Jenkins entièrement décrit en code.',
    s: ['Lancer Jenkins avec Docker Compose', 'Décrire sa configuration avec JCasC', 'Créer un Multibranch Pipeline', 'Utiliser des agents éphémères Docker ou Kubernetes', 'Créer une Shared Library', 'Sauvegarder et reconstruire le serveur'],
    d: 'après suppression totale, Jenkins revient identique avec une seule commande.',
  },
  links: [
    ['Documentation Jenkins', 'https://www.jenkins.io/doc/', 'doc'],
    ['Pipeline syntax', 'https://www.jenkins.io/doc/book/pipeline/syntax/', 'doc'],
    ['Configuration as Code', 'https://github.com/jenkinsci/configuration-as-code-plugin', 'repo'],
    ['Avis de sécurité', 'https://www.jenkins.io/security/advisories/', 'doc'],
  ],
});

M({
  id: 'circleci', name: 'CircleCI', stage: 'cicd', icon: 'circleci', h: 6, sim: 'pipeline', simCfg: { ci: 'le workflow CircleCI' }, pre: ['git'],
  pitch: 'Une CI cloud rapide, connue pour son cache, son parallélisme et ses orbs.',
  l: [[
    ['Jobs et workflows', `La configuration se trouve dans \`.circleci/config.yml\`. Un **job** tourne dans un **executor**, et un **workflow** enchaîne les jobs.`, `version: 2.1
jobs:
  test:
    docker: [{ image: cimg/node:22.11 }]
    steps:
      - checkout
      - restore_cache: { keys: [npm-{{ checksum "package-lock.json" }}] }
      - run: npm ci
      - save_cache:
          key: npm-{{ checksum "package-lock.json" }}
          paths: [~/.npm]
      - run: npm test
workflows:
  ci:
    jobs: [test]`, 'yaml'],
  ], [
    ['Orbs et validations', `Les **orbs** sont des paquets de configuration réutilisables. Un job \`approval\` met le workflow en pause. Les **contexts** partagent des variables entre projets avec un contrôle d'accès.`, `version: 2.1
orbs:
  aws-ecr: circleci/aws-ecr@9.3
workflows:
  deploy:
    jobs:
      - test
      - aws-ecr/build_and_push_image:
          requires: [test]
          repo: api
          context: aws-prod
      - attendre:
          type: approval
          requires: [aws-ecr/build_and_push_image]
      - deploy-prod:
          requires: [attendre]`, 'yaml'],
  ], [
    ['Répartir les tests', `Le **test splitting** répartit les fichiers de test entre conteneurs selon leur durée passée, ce qui réduit fortement la durée totale. Les **pipelines dynamiques** génèrent la configuration, et l'OIDC remplace les clés de cloud.`, `test:
  parallelism: 4
  docker: [{ image: cimg/node:22.11 }]
  steps:
    - checkout
    - run: npm ci
    - run: |
        FICHIERS=$(circleci tests glob "tests/**/*.test.js" | circleci tests split --split-by=timings)
        npx jest $FICHIERS --reporters=jest-junit
    - store_test_results: { path: reports }`, 'yaml'],
  ]],
  lab: {
    ctx: 'Valide et rejoue un job en local avec la CLI CircleCI.',
    prompt: 'dev@laptop:~/boutique$',
    steps: [
      ['Valide la configuration.', '^circleci config validate', 'circleci config validate', 'Config file at .circleci/config.yml is valid.'],
      ['Affiche la configuration traitée, orbs développés.', '^circleci config process', 'circleci config process .circleci/config.yml', '# Orb \'circleci/aws-ecr@9.3\' resolved'],
      ['Exécute le job `test` en local.', '^circleci local execute test', 'circleci local execute test', 'Success!'],
    ],
  },
  quiz: [
    ['Qu\'est-ce qu\'un orb ?', ['Un paquet de configuration réutilisable', 'Un conteneur', 'Un type de cache', 'Un runner'], 0, 'Il encapsule commandes et jobs.'],
    ['Comment répartir les tests selon leur durée ?', ['`circleci tests split --split-by=timings`', '`npm split`', '`git bisect`', '`docker stats`'], 0, 'Les temps viennent des résultats précédents.'],
    ['Comment mettre un workflow en pause pour validation ?', ['Avec un job `type: approval`', 'Avec `sleep`', 'Avec un cron', 'Avec un tag'], 0, 'Un humain débloque la suite.'],
  ],
  project: {
    t: 'CI ultra-rapide',
    b: 'Fais passer un pipeline lent sous les 5 minutes.',
    s: ['Mesurer la durée de départ', 'Optimiser le cache des dépendances', 'Répartir les tests sur 4 conteneurs', 'Publier une image avec un orb', 'Ajouter une validation avant la production'],
    d: 'la durée totale baisse d\'au moins 50 % et la mesure est documentée.',
  },
  links: [
    ['Documentation CircleCI', 'https://circleci.com/docs/', 'doc'],
    ['Registre d\'orbs', 'https://circleci.com/developer/orbs', 'doc'],
    ['Test splitting', 'https://circleci.com/docs/parallelism-faster-jobs/', 'doc'],
  ],
});
