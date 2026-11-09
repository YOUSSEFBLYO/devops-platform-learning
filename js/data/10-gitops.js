M({
  id: 'argocd', name: 'Argo CD', stage: 'gitops', icon: 'argo', h: 12, sim: 'gitops', simCfg: { agent: 'Argo CD' }, pre: ['k8s', 'helm'],
  pitch: 'Le contrôleur GitOps qui aligne Kubernetes sur Git, avec une interface visuelle claire.',
  l: [[
    ['Application et synchronisation', `Une **Application** relie un chemin de dépôt à un namespace. Argo CD compare les deux et affiche **Synced** ou **OutOfSync**. Plus personne n'a besoin de \`kubectl apply\` en production.`, `apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: boutique
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/acme/deploy
    targetRevision: main
    path: apps/boutique/overlays/prod
  destination:
    server: https://kubernetes.default.svc
    namespace: boutique
  syncPolicy:
    automated: { prune: true, selfHeal: true }
    syncOptions: [CreateNamespace=true]`, 'yaml'],
  ], [
    ['Projets, hooks et ApplicationSet', `Les **AppProjects** limitent ce qu'une équipe peut déployer et où. Les **sync waves** ordonnent le déploiement et les **hooks** lancent une migration. Un **ApplicationSet** génère une Application par cluster ou par dossier.`, `apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata: { name: services, namespace: argocd }
spec:
  generators:
    - git:
        repoURL: https://github.com/acme/deploy
        revision: main
        directories: [{ path: apps/* }]
  template:
    metadata: { name: "{{path.basename}}" }
    spec:
      project: default
      source:
        repoURL: https://github.com/acme/deploy
        targetRevision: main
        path: "{{path}}"
      destination:
        server: https://kubernetes.default.svc
        namespace: "{{path.basename}}"`, 'yaml'],
  ], [
    ['Rollouts et promotion', `**Argo Rollouts** ajoute le canari et le blue-green, avec une analyse automatique des métriques qui annule en cas de dégradation. Pour promouvoir une image entre environnements, un commit met à jour le tag, souvent avec **Image Updater** ou Kargo.`, `apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata: { name: api }
spec:
  replicas: 5
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 5m }
        - analysis: { templates: [{ templateName: taux-succes }] }
        - setWeight: 50
        - pause: { duration: 5m }
  selector: { matchLabels: { app: api } }
  template:
    metadata: { labels: { app: api } }
    spec:
      containers: [{ name: api, image: acme/api:1.5 }]`, 'yaml', 'Sépare le dépôt applicatif du dépôt de déploiement : un commit de configuration ne doit pas relancer tous les tests du code.'],
  ]],
  lab: {
    ctx: 'Déclare une application, synchronise, puis reviens en arrière.',
    real: ['Tutoriels Argo CD sur Killercoda', 'https://killercoda.com/argoproj/course/argo-cd'],
    prompt: 'ops@bastion:~$',
    steps: [
      ['Crée l\'app `boutique` depuis `https://github.com/acme/deploy`, chemin `apps/boutique`.', '^argocd app create boutique .*--repo https://github\\.com/acme/deploy.*', 'argocd app create boutique --repo https://github.com/acme/deploy --path apps/boutique --dest-server https://kubernetes.default.svc --dest-namespace boutique', "application 'boutique' created"],
      ['Regarde les différences avec le cluster.', '^argocd app diff boutique', 'argocd app diff boutique', '+ kind: Deployment\n+ name: api'],
      ['Synchronise.', '^argocd app sync boutique', 'argocd app sync boutique', 'Sync Status: Synced to main (8f1c2d3)\nHealth Status: Healthy'],
      ['Affiche l\'historique.', '^argocd app history boutique', 'argocd app history boutique', 'ID  DATE                 REVISION\n1   2026-11-02 09:14:02  main (8f1c2d3)\n2   2026-11-02 10:02:45  main (c47e9a1)'],
      ['Reviens à la révision 1.', '^argocd app rollback boutique 1', 'argocd app rollback boutique 1', 'Health Status: Healthy'],
    ],
  },
  quiz: [
    ['Que fait `selfHeal: true` ?', ['Il annule les modifications manuelles', 'Il répare les disques', 'Il redémarre Git', 'Il sauvegarde etcd'], 0, 'Git reste la seule source de vérité.'],
    ['Que fait `prune: true` ?', ['Il supprime ce qui a été retiré de Git', 'Il compresse les logs', 'Il supprime des branches', 'Il réduit les images'], 0, 'Sans lui, les objets retirés restent dans le cluster.'],
    ['Quel objet génère plusieurs Applications ?', ['ApplicationSet', 'Rollout', 'Workflow', 'ConfigMap'], 0, 'À partir d\'une liste, d\'un dossier ou de clusters.'],
    ['Quel projet apporte le déploiement canari ?', ['Argo Rollouts', 'Argo Workflows', 'Argo Events', 'Velero'], 0, 'Il remplace le Deployment par un Rollout.'],
  ],
  project: {
    t: 'Plateforme GitOps multi-environnements',
    b: 'Déploie sur un cluster local avec une structure de dépôt propre.',
    s: ['Installer Argo CD avec Helm', 'Créer un dépôt `deploy` avec Kustomize ou Helm', 'Créer `dev`, `staging`, `prod` avec un ApplicationSet', 'Activer prune et self-heal', 'Promouvoir une version par pull request', 'Ajouter un canari avec Argo Rollouts'],
    d: 'la suppression manuelle d\'un Deployment est annulée et un rollback se fait par `git revert`.',
    x: 'Gère Argo CD lui-même avec Argo CD, le motif « app of apps ».',
  },
  links: [
    ['Documentation Argo CD', 'https://argo-cd.readthedocs.io/en/stable/', 'doc'],
    ['Argo Rollouts', 'https://argoproj.github.io/rollouts/', 'doc'],
    ['Killercoda Argo CD', 'https://killercoda.com/argoproj/course/argo-cd', 'lab'],
    ['OpenGitOps', 'https://opengitops.dev/', 'doc'],
    ['Kargo, promotion', 'https://kargo.io/', 'doc'],
  ],
});

M({
  id: 'fluxcd', name: 'Flux CD', stage: 'gitops', icon: 'flux', h: 10, sim: 'gitops', simCfg: { agent: 'Flux' }, pre: ['k8s', 'helm'],
  pitch: 'Une boîte à outils GitOps modulaire, pilotée entièrement par des ressources Kubernetes.',
  l: [[
    ['Bootstrap et Kustomization', `\`flux bootstrap\` installe Flux et le fait se gérer lui-même depuis Git. Un **GitRepository** indique la source et une **Kustomization** dit quoi appliquer et à quelle fréquence.`, `apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata: { name: boutique, namespace: flux-system }
spec:
  interval: 1m
  url: https://github.com/acme/deploy
  ref: { branch: main }
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata: { name: boutique, namespace: flux-system }
spec:
  interval: 5m
  sourceRef: { kind: GitRepository, name: boutique }
  path: ./apps/boutique/prod
  prune: true
  wait: true`, 'yaml'],
  ], [
    ['Helm et dépendances', `Un **HelmRelease** gère un chart de façon déclarative, avec rollback automatique. \`dependsOn\` ordonne les déploiements. Avec **SOPS**, les secrets chiffrés restent dans Git et sont déchiffrés par Flux.`, `apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata: { name: redis, namespace: boutique }
spec:
  interval: 10m
  chart:
    spec:
      chart: redis
      version: "20.x"
      sourceRef: { kind: HelmRepository, name: bitnami }
  values: { architecture: standalone }
  upgrade:
    remediation: { retries: 3 }
  dependsOn: [{ name: cert-manager }]`, 'yaml'],
  ], [
    ['Mises à jour d\'images et multi-tenant', `**Image Automation** surveille le registre, puis committe le nouveau tag dans Git : l'historique reste la référence. Flux gère le multi-cluster et les équipes avec **ServiceAccounts** dédiés. **Flagger** ajoute les déploiements canari.`, `apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata: { name: api, namespace: flux-system }
spec:
  imageRepositoryRef: { name: api }
  policy:
    semver: { range: ">=1.0.0 <2.0.0" }
---
# Dans le Deployment, un marqueur indique où écrire :
# image: ghcr.io/acme/api:1.4.0 # {"$imagepolicy": "flux-system:api"}`, 'yaml'],
  ]],
  lab: {
    ctx: 'Installe Flux et observe une réconciliation.',
    real: ['Get Started avec Flux', 'https://fluxcd.io/flux/get-started/'],
    prompt: 'ops@bastion:~$',
    steps: [
      ['Vérifie les prérequis du cluster.', '^flux check --pre', 'flux check --pre', '✔ prerequisites checks passed'],
      ['Bootstrappe sur GitHub : owner `acme`, dépôt `deploy`, chemin `clusters/prod`.', '^flux bootstrap github .*--owner[ =]acme.*', 'flux bootstrap github --owner=acme --repository=deploy --path=clusters/prod', '✔ all components are healthy'],
      ['Liste toutes les ressources Flux.', '^flux get all', 'flux get all', 'gitrepository/flux-system  True  Fetched revision main@sha1:8f1c2d3\nkustomization/flux-system  True  Applied revision main@sha1:8f1c2d3'],
      ['Force la réconciliation de `flux-system`, source comprise.', '^flux reconcile kustomization flux-system .*--with-source', 'flux reconcile kustomization flux-system --with-source', '✔ applied revision main@sha1:c47e9a1'],
      ['Mets `boutique` en pause pendant un incident.', '^flux suspend kustomization boutique', 'flux suspend kustomization boutique', '✔ suspension completed'],
    ],
  },
  quiz: [
    ['Que crée `flux bootstrap` ?', ['Flux, et son propre suivi depuis Git', 'Un cluster', 'Une image Docker', 'Un compte cloud'], 0, 'Flux se met ensuite à jour lui-même.'],
    ['Comment Flux met-il à jour une image ?', ['En committant le tag dans Git', 'Avec `kubectl edit`', 'Par e-mail', 'Il ne le fait pas'], 0, 'Git reste la source de vérité.'],
    ['Quelle différence principale avec Argo CD ?', ['Flux est piloté par CRD, sans interface intégrée', 'Flux ne gère pas Helm', 'Flux est payant', 'Flux n\'utilise pas Git'], 0, 'Argo CD offre une UI riche, Flux une approche modulaire.'],
  ],
  project: {
    t: 'Cluster géré par Git',
    b: 'Fais en sorte qu\'un cluster neuf se reconstruise seul.',
    s: ['Bootstrapper Flux sur un cluster kind', 'Organiser `clusters/`, `infrastructure/`, `apps/`', 'Déployer une application et ses dépendances', 'Chiffrer un secret avec SOPS et age', 'Automatiser les mises à jour d\'images', 'Recréer le cluster de zéro'],
    d: 'un cluster vide redevient identique à partir d\'une seule commande bootstrap.',
  },
  links: [
    ['Documentation Flux', 'https://fluxcd.io/flux/', 'doc'],
    ['Exemple de dépôt', 'https://github.com/fluxcd/flux2-kustomize-helm-example', 'repo'],
    ['Flagger', 'https://docs.flagger.app/', 'doc'],
    ['SOPS', 'https://getsops.io/', 'doc'],
  ],
});
